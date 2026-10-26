// A drafted day approved on /admin/puzzles, and a whole day played (docs/milestones/M13-13a-the-base.md, criterion
// "Approval and play"), on the fixture (src/test/answer-fixture.ts). Approval is of the fixture draft under a day far
// ahead, written to content/offbeat for this test and removed after; play is on the fixture day under today
// (e2e/puzzle.ts), past every stolen letter. The T1 day itself needs the real answer data, so its run is in the
// ticket's Evidence.
import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { FIXTURE, fixtureDraft, fixtureId, loadFixtureBase } from "../src/test/answer-fixture";
import { dayText } from "../src/app/admin/day-text";
import { RUN, play, signInAndPick } from "./players";
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
  // Question 2's suggested host answer is cherry, which players can't type once C is gone (14b-2b-2b): the admin swaps
  // it for apple before approving.
  const draft = fixtureDraft(ahead);
  draft.questions[1].host_bank.push(fixtureId(1, "cherry"));
  draft.questions[1].host_answers = [fixtureId(1, "cherry")];
  writeFileSync(draftFile, JSON.stringify(draft));
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
  await expect(admin.getByRole("link", { name: "Play", exact: true })).toBeVisible();
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-aa@example.test`]);
  await admin.goto("/admin/puzzles");
  // The day as the admin pages write it, "Wed 28 Oct" (src/app/admin/day-text.ts): chosen from the row of days, then
  // approved from its own section (docs/milestones/M14-14b-2b-2-admin-build.md, criterion 4).
  const name = dayText(ahead);
  await admin.getByRole("navigation", { name: "Days" }).getByRole("button", { name: new RegExp(`^${name}`) }).click();
  const day = admin.getByRole("region", { name });
  await expect(day.getByText("Draft, waiting for approval.")).toBeVisible();
  // A ticked host answer players can't type is said in words, and Approve waits until it's swapped
  // (docs/milestones/M14-14b-2b-2-admin-build.md, 14b-2b-2b criterion 2).
  await expect(day.getByText("Fix 1 question first")).toBeVisible();
  await expect(day.getByRole("button", { name: "Approve day" })).toBeDisabled();
  await expect(day.getByText("“cherry” has the C the Wind steals: pick another host answer.")).toBeVisible();
  // A chip is clicked, as an admin would: its checkbox is visually hidden behind it.
  const chip = (name: string) => day.locator("label").filter({ has: admin.getByRole("checkbox", { name, exact: true }) });
  const cherry = day.getByRole("checkbox", { name: "cherry, has C: players can't type it", exact: true });
  const chipsOf = () => day.getByRole("group", { name: /^Host answers for/ }).nth(1).locator("label").allTextContents();
  const before = await chipsOf();
  await chip("cherry, has C: players can't type it").click();
  // Unticked, it stays a checkbox, now unavailable, and keeps the focus (14b-2c-3, item 53); a dashed chip, its letter
  // struck, said in words.
  await expect(cherry).not.toBeChecked();
  await expect(cherry).toHaveAttribute("aria-disabled", "true");
  await expect(cherry).toBeFocused();
  await chip("apple").click();
  await expect(day.getByRole("checkbox", { name: "apple", exact: true })).toBeChecked();
  // Ticking and unticking moved no chip (answer 16).
  expect(await chipsOf()).toEqual(before);
  await day.getByRole("button", { name: "Approve day" }).click();
  await expect(day.getByRole("status")).toHaveText(`${name} is approved. Players get it at midnight Pacific. You can change its host answers until then.`);
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
  await play(page);
  // A familiar answer per question the host doesn't catch, avoiding every letter stolen by then (C at Q2, P at Q4, R at
  // Q5, O at Q7).
  const answers = ["cat", "kiwi", "green", "Kenya", "lead", "boxing", "knee"];
  for (let i = 0; i < answers.length; i++) {
    await page.getByLabel("Your answer").fill(answers[i]);
    await page.getByRole("button", { name: "Answer" }).click();
    if (i < answers.length - 1) {
      await expect(page.getByRole("heading", { name: "Safe!" })).toBeVisible();
      await page.getByRole("button", { name: "Next", exact: true }).click();
    }
  }
  await expect(page.getByRole("heading", { name: "You survived all 7!" })).toBeVisible();
  // Three host answers on question 7 (human, 2026-10-24: "1 1 1 1 2 2 3").
  await expect(page.getByText("Name a body part: you said knee, the host said hand, head, leg")).toBeVisible();
});
