// A drafted day approved on /admin/puzzles, and a whole day played (docs/milestones/M13-13a-the-base.md, criterion
// "Approval and play"), on the fixture (src/test/answer-fixture.ts). Approval is of the fixture draft under a day far
// ahead, written to content/offbeat for this test and removed after; play is on the fixture day under today
// (e2e/puzzle.ts), past every stolen letter. The T1 day itself needs the real answer data, so its run is in the
// ticket's Evidence.
import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { FIXTURE, fixtureDraft, loadFixtureBase } from "../src/test/answer-fixture";
import { RUN, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
const DRAFTS = join(process.cwd(), "content", "offbeat");
let ahead = "";
let draftFile = "";
let createdFolder = false;
let puzzle: TodayPuzzle;

test.beforeAll(async () => {
  await loadFixtureBase(DB);
  ahead = (await DB.query<{ d: string }>("select (private.today() + 450)::text as d")).rows[0].d;
  createdFolder = !existsSync(DRAFTS);
  mkdirSync(DRAFTS, { recursive: true });
  draftFile = join(DRAFTS, `${ahead}.json`);
  if (existsSync(draftFile)) throw new Error(`${draftFile} exists; this test writes its own draft there`);
  writeFileSync(draftFile, JSON.stringify(fixtureDraft(ahead)));
  puzzle = await todayPuzzle(DB);
});

test.afterAll(async () => {
  if (draftFile) rmSync(draftFile);
  if (createdFolder && readdirSync(DRAFTS).length === 0) {
    rmdirSync(DRAFTS);
    rmdirSync(join(process.cwd(), "content"));
  }
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.query("delete from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date", [ahead]);
  await removePuzzle(DB, puzzle);
  await DB.end();
});

test("an admin approves a drafted day on the admin page", async ({ browser }) => {
  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/");
  await signInAndPick(admin, "aa");
  await expect(admin.getByRole("button", { name: "Start today's puzzle" })).toBeVisible();
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-aa@example.test`]);
  await admin.goto("/admin/puzzles");
  const day = admin.getByRole("article").filter({ hasText: ahead });
  await expect(day.getByRole("heading", { name: `${ahead}: drafted, waiting for approval` })).toBeVisible();
  await day.getByRole("button", { name: "Approve" }).click();
  await expect(day.getByText("Approved.")).toBeVisible();
  const { rows } = await DB.query<{ approved: boolean; members: string }>(
    "select content ? 'approved_at' as approved, content->'questions'->0->>'members' as members from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date",
    [ahead],
  );
  expect(rows[0]).toEqual({ approved: true, members: String(Object.keys(FIXTURE[0].members).length) });
});

test("a player survives all seven questions of a day, past the stolen letters", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "ap");
  await page.getByRole("button", { name: "Start today's puzzle" }).click();
  // A safe answer per question that avoids every letter stolen by then (C at Q2, P at Q4, R at Q5, O at Q7).
  const answers = ["cat", "kiwi", "green", "Kenya", "tin", "June", "leg"];
  for (let i = 0; i < answers.length; i++) {
    await page.getByLabel("Your answer").fill(answers[i]);
    await page.getByRole("button", { name: "Answer" }).click();
    if (i < answers.length - 1) {
      await expect(page.getByRole("heading", { name: "Safe!" })).toBeVisible();
      await page.getByRole("button", { name: "Next", exact: true }).click();
    }
  }
  await expect(page.getByRole("heading", { name: "You survived all 7!" })).toBeVisible();
  await expect(page.getByText("Name a body part: you said leg, the host said hand")).toBeVisible();
});
