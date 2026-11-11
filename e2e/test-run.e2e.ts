// A test run (docs/milestones/M14-14b-11-test-runs.md, criterion 5): an admin opens Play test on a draft with a host
// answer changed on the page, plays to a catch, taps Restart and plays again from the start, leaves by the × and by See
// results, each back to the admin puzzles page (14c-6 answer 26, kept by
// docs/milestones/M14-14c-8-plain-game-1.md); a player who
// isn't an admin sees no game. The draft is the fixture draft (src/test/answer-fixture.ts) under a
// day far ahead, written to content/offbeat for this test and removed after.
import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { fixtureDraft, loadFixtureBase } from "../src/test/answer-fixture";
import { dayText } from "../src/app/day-text";
import { RUN, signInAndPick } from "./players";
import { answer, caught, safe, seeResults } from "./game";

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
  // The audit rows test runs reported and the acceptance made here (14b-11c), which would refuse taking the fixture
  // base out.
  await DB.query("delete from private.category_extra where category like 'fixture\_%'");
  await DB.query("delete from private.miss_review where category like 'fixture\_%' and outcome = 'reported'");
  await DB.query("delete from auth.users where email like $1", [`${RUN}-tr_@example.test`]);
  await DB.end();
});

test("an admin plays a draft as a test run, with a host answer changed on the page, and restarts it", async ({ browser }) => {
  // Two test runs and a third start since 14c-6b-1 (each way back to the puzzles page): past Playwright's 30 s in CI's
  // first try on PR #169, so Playwright's own tripling.
  test.slow();
  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/");
  await signInAndPick(admin, "tra");
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-tra@example.test`]);
  // The route's first visit, in the browser, so Play test's click isn't the one waiting on `next dev`: it stayed on this
  // page past expect's 5 seconds twice in PR #155's CI, each time as the route first rendered. The time is logged to
  // test that reading (docs/milestones/M16-16a-the-dictionary.md).
  const opened = Date.now();
  await admin.goto(`/admin/test/${ahead}`);
  console.log(`/admin/test's first visit took ${Date.now() - opened} ms`);
  const runs = async () => (await DB.query<{ n: number }>("select count(*)::int as n from private.run r join auth.users u on u.id = r.user_id where u.email = $1", [`${RUN}-tra@example.test`])).rows[0].n;

  await admin.goto("/admin/puzzles");
  const name = dayText(ahead);
  await admin.getByRole("navigation", { name: "Days" }).getByRole("button", { name: new RegExp(`^${name}`) }).click();
  const day = admin.getByRole("region", { name });
  // Question 1's host answer is drawn as bear; dog is ticked instead, and not approved (answer 9).
  const chip = (choice: string) => day.locator("label").filter({ has: admin.getByRole("checkbox", { name: choice, exact: true }) }).first();
  await chip("bear").click();
  await chip("dog").click();
  await day.getByRole("link", { name: "Play test" }).click();

  await expect(admin.getByText("Test run of the draft: nothing is saved")).toBeVisible();
  await admin.getByRole("button", { name: "Start", exact: true }).click();
  // Caught on question 1 by the dog the page chose: the recap, with the test run's label and Restart still above it
  // (answer 12).
  await caught(admin, "dog");
  await expect(admin.getByText("Test run of the draft: nothing is saved")).toBeVisible();

  // Restart starts again from the rules (answer 12); bear, the host's no longer, is safe.
  await admin.getByRole("button", { name: "Restart" }).click();
  await admin.getByRole("button", { name: "Start", exact: true }).click();
  await safe(admin, "bear");
  // The × goes back to the admin puzzles page, as See results does (14c-6 answer 26).
  await admin.getByRole("button", { name: "Back to Puzzles" }).click();
  await expect(admin).toHaveURL(/\/admin\/puzzles$/);
  // Played again, fresh from Q1 with the page's choice kept, dog is the host's: the recap's See results goes back there too.
  await admin.getByRole("navigation", { name: "Days" }).getByRole("button", { name: new RegExp(`^${name}`) }).click();
  await day.getByRole("link", { name: "Play test" }).click();
  await admin.getByRole("button", { name: "Start", exact: true }).click();
  await caught(admin, "dog");
  await seeResults(admin).click();
  await expect(admin).toHaveURL(/\/admin\/puzzles$/);
  // Nothing of any run was saved (answer 2).
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

// 14b-11b: a refused answer redraws the test run, which once started its countdown again from 20 (the human,
// 2026-10-30: "if i type something that isn't in the answer bank, it resets timer"). The clock is faked so five seconds
// pass at once.
test("a refused answer in a test run keeps the countdown going", async ({ browser }) => {
  const admin = await (await browser.newContext()).newPage();
  await admin.clock.install();
  await admin.goto("/");
  await signInAndPick(admin, "trc");
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-trc@example.test`]);
  const hosts = fixtureDraft(ahead).questions.map((q) => q.host_answers);
  await admin.goto(`/admin/test/${ahead}?hosts=${encodeURIComponent(JSON.stringify(hosts))}`);
  await admin.getByRole("button", { name: "Start", exact: true }).click();
  const timer = admin.getByRole("timer").filter({ hasText: /seconds left/ });
  // The seconds, and the words screen readers hear.
  await expect(timer).toHaveText("20 seconds left");
  await admin.clock.fastForward("00:05");
  await expect(timer).toHaveText("15 seconds left");
  await answer(admin, "zzqx not a thing");
  await expect(admin.getByText("isn't in our list. Try another answer.")).toBeVisible();
  expect(parseInt((await timer.textContent())!)).toBeLessThanOrEqual(15);
});

// 14b-11c (docs/milestones/M14-14b-11c-test-misses-to-audit.md, criterion 4): an answer a test run refuses waits on the
// Audit page as the admin's report; accepted there for the category, a new test run of the draft accepts it.
test("a test run's refused answer waits on the Audit page, and accepting it there makes the next test run accept it", async ({ browser }) => {
  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/");
  await signInAndPick(admin, "trd");
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-trd@example.test`]);
  const hosts = fixtureDraft(ahead).questions.map((q) => q.host_answers);
  const testRun = `/admin/test/${ahead}?hosts=${encodeURIComponent(JSON.stringify(hosts))}`;

  // apple is a fruit, so "Name an animal" refuses it.
  await admin.goto(testRun);
  await admin.getByRole("button", { name: "Start", exact: true }).click();
  await answer(admin, "apple");
  await expect(admin.getByText("isn't in our list. Try another answer.")).toBeVisible();

  await admin.goto("/admin/audit");
  const row = admin.getByRole("region", { name: "To review" }).getByRole("row", { name: "apple" });
  await expect(row.getByText("From your test run")).toBeVisible();
  // The fixture's apple, told apart from the real base's apples by what it's a kind of.
  await row.getByRole("button", { name: "Accept apple (fixture_fruit root) as Name an animal" }).click();
  await expect(admin.getByRole("region", { name: "To review" }).getByRole("row", { name: "apple" })).toHaveCount(0);

  await admin.goto(testRun);
  await admin.getByRole("button", { name: "Start", exact: true }).click();
  await safe(admin, "apple");
});
