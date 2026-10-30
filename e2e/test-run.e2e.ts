// A test run (docs/milestones/M14-14b-11-test-runs.md, criterion 5): an admin opens Play test on a draft with a host
// answer changed on the page, plays to a catch, sees the result with no Share, taps Restart and plays again from the
// start; a player who isn't an admin sees no game. The draft is the fixture draft (src/test/answer-fixture.ts) under a
// day far ahead, written to content/offbeat for this test and removed after.
import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { fixtureDraft, loadFixtureBase } from "../src/test/answer-fixture";
import { dayText } from "../src/app/day-text";
import { capitalized, caughtText, gotPastText } from "../src/game/words";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
const DRAFTS = join(process.cwd(), "content", "offbeat");
let ahead = "";
let draftFile = "";
let createdFolder = false;

test.beforeAll(async () => {
  await loadFixtureBase(DB);
  ahead = (await DB.query<{ d: string }>("select (private.today() + 460)::text as d")).rows[0].d;
  createdFolder = !existsSync(DRAFTS);
  mkdirSync(DRAFTS, { recursive: true });
  draftFile = join(DRAFTS, `${ahead}.json`);
  if (existsSync(draftFile)) throw new Error(`${draftFile} exists; this test writes its own draft there`);
  writeFileSync(draftFile, JSON.stringify(fixtureDraft(ahead)));
});

test.afterAll(async () => {
  if (draftFile) rmSync(draftFile);
  if (createdFolder && readdirSync(DRAFTS).length === 0) {
    rmdirSync(DRAFTS);
    rmdirSync(join(process.cwd(), "content"));
  }
  await DB.query("delete from auth.users where email like $1", [`${RUN}-tr_@example.test`]);
  await DB.end();
});

test("an admin plays a draft as a test run, with a host answer changed on the page, and restarts it", async ({ browser }) => {
  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/");
  await signInAndPick(admin, "tra");
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-tra@example.test`]);
  const runs = async () => (await DB.query<{ n: number }>("select count(*)::int as n from private.run r join auth.users u on u.id = r.user_id where u.email = $1", [`${RUN}-tra@example.test`])).rows[0].n;

  await admin.goto("/admin/puzzles");
  const name = dayText(ahead);
  await admin.getByRole("navigation", { name: "Days" }).getByRole("button", { name: new RegExp(`^${name}`) }).click();
  const day = admin.getByRole("region", { name });
  // Question 1's Wind is drawn as bear; dog is ticked instead, and not approved (answer 9).
  const chip = (choice: string) => day.locator("label").filter({ has: admin.getByRole("checkbox", { name: choice, exact: true }) }).first();
  await chip("bear").click();
  await chip("dog").click();
  await day.getByRole("link", { name: "Play test" }).click();

  await expect(admin.getByText("Test run of the draft: nothing is saved")).toBeVisible();
  await admin.getByRole("button", { name: "Start", exact: true }).click();
  await admin.getByLabel("Your answer").fill("dog");
  await admin.getByRole("button", { name: "Answer" }).click();
  // Caught at stop 1 by the dog the page chose; the result has no Share (answer 6).
  await expect(admin.getByRole("heading", { name: capitalized(caughtText(1)) })).toBeVisible();
  await expect(admin.getByRole("button", { name: "Share" })).toHaveCount(0);

  // Restart starts again from the rules (answer 12); bear, the Wind's no longer, climbs.
  await admin.getByRole("button", { name: "Restart" }).click();
  await admin.getByRole("button", { name: "Start", exact: true }).click();
  await admin.getByLabel("Your answer").fill("bear");
  await admin.getByRole("button", { name: "Answer" }).click();
  await expect(admin.getByRole("heading", { name: gotPastText(1) })).toBeVisible();
  // Nothing of either run was saved (answer 2).
  expect(await runs()).toBe(0);
});

test("a player who isn't an admin sees no game on a test run's page", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "trb");
  await page.goto(`/admin/test/${ahead}`);
  // Next.js keeps an empty alert of its own for route changes, so the refusal is found by its text.
  await expect(page.getByRole("alert").filter({ hasText: "This page is for admins only." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start", exact: true })).toHaveCount(0);
});
