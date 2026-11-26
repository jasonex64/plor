// The review of the researched lists (docs/milestones/M23-23b-research-and-review.md, 23b-2; the human's answers 25, 29 and
// 30 in M23-offbeat-on-a-clock.md): an admin opens a list, strikes one of its doubtful answers and undoes the strike, adds
// an answer and marks the list seen; a player who isn't an admin sees the refusal. It edits the bed list (loading it
// first where the stack has no base, as CI's fresh stack) and removes every row it made. A second test (23e-2) gives an answer
// another tier and takes that back, and dismisses and adds the texts players typed on a clock day that no list has.
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import pg, { Pool } from "pg";
import { RUN, signInAndPick } from "./players";
import { parseList } from "../src/content/list";
import { loadResearch } from "../scripts/base.ts";
import { localStack } from "../scripts/slot.ts";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
const ADDED = `zzz ${RUN}`;
// A day on a clock in the past that asks the bed list, with the texts two players typed on it.
const CLOCK_DAY = "2001-01-03";
const TYPED_MANY = `yy${RUN} bed`;
const TYPED_ONE = `zz${RUN} bed`;
const adminIds: string[] = [];
let loadedHere = false;

async function clean() {
  await DB.query("update private.fact set removed_at = null where trait = 'kind_of' and removed_at > now() and thing_id in (select thing_id from private.list_edit where category = 'bed' and kind = 'strike')");
  await DB.query("delete from private.thing where id in (select thing_id from private.list_edit where category = 'bed' and kind = 'add')");
  await DB.query("delete from private.list_edit where category = 'bed'");
  await DB.query("delete from private.list_seen where category = 'bed'");
  await DB.query("delete from private.list_dismissed where category = 'bed'");
  await DB.query("delete from private.run where puzzle_date = $1", [CLOCK_DAY]);
  await DB.query("delete from private.puzzle where puzzle_date = $1", [CLOCK_DAY]);
}

test.beforeAll(async () => {
  const { rows } = await DB.query("select 1 from private.category where key = 'bed'");
  if (rows.length === 0) {
    loadedHere = true;
    const { list } = parseList("lists/bed.json", readFileSync("content/lists/bed.json", "utf8"), null);
    const client = new pg.Client({ connectionString: localStack().databaseUrl });
    await client.connect();
    try {
      await loadResearch(client, [list!]);
    } finally {
      await client.end();
    }
    await DB.query("select private.define_category('bed', 'bed', 'research', 'bed', null)");
  }
  await clean();
});

test.afterAll(async () => {
  await clean();
  await DB.query("delete from private.base_log where action = 'list' and actor = any($1)", [adminIds.map((id) => `admin:${id}`)]);
  if (loadedHere) {
    await DB.query("delete from private.category where key = 'bed'");
    await DB.query("delete from private.thing where id in (select thing_id from private.thing_source where source = 'research' and split_part(source_id, '/', 1) = 'bed')");
    await DB.query("delete from private.base_log where (action = 'import' and actor = 'source:research' and detail ->> 'snapshot' = 'lists') or (action = 'define_category' and detail ->> 'key' = 'bed')");
  }
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.end();
});

test("an admin strikes and undoes a doubtful answer, adds one and marks the list seen; a player can't", { tag: "@visual" }, async ({ page, browser }) => {
  await page.goto("/");
  await signInAndPick(page, "lvr");
  const { rows } = await DB.query<{ id: string }>("insert into private.admin (user_id) select id from auth.users where email = $1 returning user_id::text as id", [`${RUN}-lvr@example.test`]);
  adminIds.push(rows[0].id);

  await page.goto("/admin/lists");
  await expect(page.getByRole("heading", { level: 2, name: "Lists" })).toBeVisible();
  const questions = page.getByRole("region", { name: "Researched questions" });
  const bed = questions.getByRole("row", { name: /\bbed\b/i });
  await expect(bed).toContainText("Not seen");
  await expect(bed).toContainText("Checked twice");
  await bed.getByRole("button", { name: /^Open/ }).click();

  // The doubtful answers come first. Strike the first: it reads as struck, with Undo until midnight.
  const doubtful = page.getByRole("region", { name: "Doubtful answers" });
  const name = await doubtful.getByRole("row").nth(1).getAttribute("aria-label");
  const answer = doubtful.getByRole("row", { name: name!, exact: true });
  await answer.getByRole("button", { name: /^Strike/ }).click();
  await expect(answer).toContainText("Struck");
  await expect(answer).toContainText("Until midnight");
  await expect(answer.locator("s")).toHaveText(name!);
  await expect(page.getByRole("region", { name: "Changed by you" }).getByRole("row", { name: name!, exact: true })).toBeVisible();
  await answer.getByRole("button", { name: /^Undo/ }).click();
  await expect(answer).not.toContainText("Struck");
  await expect(answer.getByRole("button", { name: /^Strike/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Changed by you" })).toHaveCount(0);

  // An added answer is in the list at once, rare, and can be found in All answers.
  await page.getByLabel("Add an answer").fill(ADDED);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const added = page.getByRole("region", { name: "Changed by you" }).getByRole("row", { name: ADDED, exact: true });
  await expect(added).toContainText("Added");
  await expect(added).toContainText("rare");
  await page.getByLabel("Part of an answer’s name").fill(ADDED);
  await expect(page.getByRole("region", { name: "All answers" }).getByRole("row", { name: ADDED, exact: true })).toBeVisible();

  // Seen: the list says so, and so does the list of lists.
  await page.getByRole("button", { name: "Mark as seen" }).click();
  await expect(page.getByText(/Seen \d{4}-\d\d-\d\d\./)).toBeVisible();
  await page.getByRole("button", { name: "‹ All lists" }).click();
  await expect(questions.getByRole("row", { name: /\bbed\b/i })).not.toContainText("Not seen");

  // Nothing is left of the strike; the add and the seen mark wait for the fold.
  const left = await DB.query<{ kind: string }>("select kind from private.list_edit where category = 'bed' order by id");
  expect(left.rows.map((r) => r.kind)).toEqual(["add"]);

  const player = await (await browser.newContext()).newPage();
  await player.goto("/");
  await signInAndPick(player, "lvp");
  await player.goto("/admin/lists");
  await expect(player.getByText("This page is for admins only.")).toBeVisible();
});

test("an admin gives an answer another tier and takes it back, and dismisses or adds the texts typed on no list", { tag: "@visual" }, async ({ page }) => {
  await clean(); // the first test leaves its add and its seen mark for the fold
  await page.goto("/");
  await signInAndPick(page, "lvt");
  const { rows } = await DB.query<{ id: string }>("insert into private.admin (user_id) select id from auth.users where email = $1 returning user_id::text as id", [`${RUN}-lvt@example.test`]);
  adminIds.push(rows[0].id);

  // Two players typed one text, the first one alone typed another, on a day on a clock that asks the bed list.
  await DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('offbeat', $1, $2::jsonb)", [
    CLOCK_DAY,
    JSON.stringify({ format: 4, game_id: "offbeat", date: CLOCK_DAY, questions: [{ prompt: "bed", category: "bed", levels: {}, rare: [], size: 1 }] }),
  ]);
  const other = (await DB.query<{ id: string }>("insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id::text as id", [`${RUN}-lvo@example.test`])).rows[0].id;
  for (const user of [adminIds[adminIds.length - 1], other]) await DB.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, 'offbeat', $2)", [user, CLOCK_DAY]);
  const typed = (user: string, text: string) =>
    DB.query("insert into private.missed_answer (user_id, game_id, puzzle_date, question_idx, typed, normalized) values ($1, 'offbeat', $2, 0, $3, $3)", [user, CLOCK_DAY, text]);
  await typed(adminIds[adminIds.length - 1], TYPED_MANY);
  await typed(other, TYPED_MANY);
  await typed(adminIds[adminIds.length - 1], TYPED_ONE);

  await page.goto("/admin/lists");
  await page.getByRole("region", { name: "Researched questions" }).getByRole("row", { name: /\bbed\b/i }).getByRole("button", { name: /^Open/ }).click();

  // A new tier: the answer says so, with Undo, and it is listed among the changes; Undo gives the file's tier back.
  await page.getByLabel("Part of an answer’s name").fill("king bed");
  const all = page.getByRole("region", { name: "All answers" });
  const king = all.getByRole("row", { name: "king bed", exact: true });
  await expect(king.getByLabel("Tier of king bed")).toHaveValue("common");
  await king.getByLabel("Tier of king bed").selectOption("rare");
  await expect(king).toContainText("Was common");
  await expect(king.getByLabel("Tier of king bed")).toHaveValue("rare");
  const changes = page.getByRole("region", { name: "Changed by you" });
  await expect(changes.getByRole("row", { name: "king bed", exact: true })).toBeVisible();
  const waiting = await DB.query<{ kind: string; tier: string }>("select kind, tier from private.list_edit where category = 'bed' order by id");
  expect(waiting.rows).toEqual([{ kind: "tier", tier: "rare" }]);
  await king.getByRole("button", { name: /^Undo/ }).click();
  await expect(king).not.toContainText("Was common");
  await expect(king.getByLabel("Tier of king bed")).toHaveValue("common");
  await expect(changes).toHaveCount(0);

  // The texts typed on no list, most players first: dismiss one, add the other.
  const typedCard = page.getByRole("region", { name: "Typed on no list" });
  await expect(typedCard.getByRole("row", { name: TYPED_MANY, exact: true })).toContainText("2");
  await expect(typedCard.getByRole("row", { name: TYPED_ONE, exact: true })).toContainText("1");
  await typedCard.getByRole("row", { name: TYPED_ONE, exact: true }).getByRole("button", { name: /^Dismiss/ }).click();
  await expect(typedCard.getByRole("row", { name: TYPED_ONE, exact: true })).toHaveCount(0);
  await typedCard.getByRole("row", { name: TYPED_MANY, exact: true }).getByRole("button", { name: /^Add/ }).click();
  await expect(typedCard.getByRole("row", { name: TYPED_MANY, exact: true })).toHaveCount(0);
  await expect(changes.getByRole("row", { name: TYPED_MANY, exact: true })).toContainText("Added");
});
