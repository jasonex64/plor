// The answer audit's page (docs/milestones/M13-13b-learning-from-misses.md): the admin pages show what waits for
// review; an admin sees a text players added and a held one, with their counts, undoes the first, accepts the second
// and undoes that too; a player who isn't an admin sees the refusal. Three typists miss on the fixture day through
// private.record_miss with this run's own texts, which are removed afterwards.
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
// A new word and one holding a listed word (LDNOOBW's "2g1c").
const NEW = `skvader ${RUN}`;
const LISTED = `${RUN} 2g1c`;
let puzzle: TodayPuzzle;

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
  for (let n = 1; n <= 3; n++) {
    const { rows } = await DB.query<{ id: string }>("insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id", [
      `${RUN}-t${n}@example.test`,
    ]);
    await DB.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, 'offbeat', private.today())", [rows[0].id]);
    for (const [text, listed] of [[NEW, false], [LISTED, true]] as const) {
      await DB.query("select private.record_miss($1, 'offbeat', private.today(), 0, $2, $2, false, $3, 3, 1)", [rows[0].id, text, listed]);
    }
  }
});

test.afterAll(async () => {
  const { rows } = await DB.query<{ thing_id: string | null }>("delete from private.miss_review where text = any($1) returning thing_id", [[NEW, LISTED]]);
  await DB.query("delete from private.thing where id = any($1)", [rows.map((r) => r.thing_id).filter(Boolean)]);
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removePuzzle(DB, puzzle);
  await DB.end();
});

test("an admin undoes an added answer, accepts a held one and undoes that; a player can't", async ({ browser }) => {
  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/");
  await signInAndPick(admin, "au");
  await expect(admin.getByRole("link", { name: "Play", exact: true })).toBeVisible();
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-au@example.test`]);
  await admin.goto("/admin");
  // Admin opens on Puzzles, and the sub-tabs carry what waits: Audit with its count
  // (docs/milestones/M14-14b-2b-2-admin-build.md, criteria 1 and 2).
  await expect(admin).toHaveURL(/\/admin\/puzzles$/);
  const tabs = admin.getByRole("navigation", { name: "Admin" });
  await expect(tabs.getByRole("link", { name: /^Audit\s?\d+ waiting$/ })).toBeVisible();

  await tabs.getByRole("link", { name: /^Audit/ }).click();
  await expect(admin).toHaveURL(/\/admin\/audit$/);
  const added = admin.getByRole("region", { name: "Added by players" }).getByRole("row", { name: NEW });
  const held = admin.getByRole("region", { name: "To review" }).getByRole("row", { name: LISTED });
  const decided = (text: string) => admin.getByRole("region", { name: "Decided" }).getByRole("row", { name: text });
  await expect(added).toContainText("3 of ");
  await expect(held).toContainText("offensive-word list");
  await added.getByRole("button", { name: "Undo" }).click();
  await expect(decided(NEW)).toContainText("Name an animal");
  await expect(decided(NEW)).toContainText("undone");
  await held.getByRole("button", { name: "Accept" }).click();
  await expect(decided(LISTED)).toContainText("accepted");
  // Every decision that made an answer can be undone (human, 2026-10-24: "Yes, undo anything (Recommended)").
  await decided(LISTED).getByRole("button", { name: "Undo" }).click();
  await expect(decided(LISTED)).toContainText("undone");

  const player = await (await browser.newContext()).newPage();
  await player.goto("/");
  await signInAndPick(player, "ay");
  await expect(player.getByRole("link", { name: "Play", exact: true })).toBeVisible();
  await player.goto("/admin/audit");
  await expect(player.getByText("This page is for admins only.")).toBeVisible();
});
