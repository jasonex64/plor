// The review of the researched lists (docs/milestones/M23-23b-research-and-review.md, 23b-2; the human's answers 25, 29 and
// 30 in M23-offbeat-on-a-clock.md): an admin opens a list, strikes one of its doubtful answers and undoes the strike, adds
// an answer and marks the list seen; a player who isn't an admin sees the refusal. It edits the bed list (loading it
// first where the stack has no base, as CI's fresh stack) and removes every row it made.
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import pg, { Pool } from "pg";
import { RUN, signInAndPick } from "./players";
import { parseList } from "../src/content/list";
import { loadResearch } from "../scripts/base.ts";
import { localStack } from "../scripts/slot.ts";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
const ADDED = `zzz ${RUN}`;
let adminId = "";
let loadedHere = false;

async function clean() {
  await DB.query("update private.fact set removed_at = null where trait = 'kind_of' and removed_at > now() and thing_id in (select thing_id from private.list_edit where category = 'bed' and kind = 'strike')");
  await DB.query("delete from private.thing where id in (select thing_id from private.list_edit where category = 'bed' and kind = 'add')");
  await DB.query("delete from private.list_edit where category = 'bed'");
  await DB.query("delete from private.list_seen where category = 'bed'");
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
  await DB.query("delete from private.base_log where action = 'list' and actor = $1", [`admin:${adminId}`]);
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
  adminId = rows[0].id;

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
