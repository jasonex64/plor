// A day on a clock drafted and approved on /admin/puzzles (docs/milestones/M23-23e-drafting-and-approving.md, 23e-1; the human's
// answers 51, 55 to 57 in M23-offbeat-on-a-clock.md): an admin redrafts it, swaps a question for another list, gives one a wording
// of its own, moves one, draws another six for one, and approves; the stored day holds what the page showed. A change not approved
// is warned about on leaving. The drafted day is built from the real lists in content/lists, written to content/offbeat for this file
// and removed after with the day it approves; the lists the stack lacks are loaded and taken out again.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { buildClockDay } from "../src/content/clock-day";
import { parseList } from "../src/content/list";
import { parseBank } from "../src/content/bank";
import { ensureResearched, removeResearched } from "../src/test/research-lists";
import { dayText } from "../src/app/day-text";
import { RUN, signInAndPick } from "./players";
import { localStack } from "../scripts/slot.ts";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
const DRAFTS = join(process.cwd(), "content", "offbeat");
const LISTS = ["bread", "soup", "tool", "pasta"];
const bank = parseBank("bank.json", readFileSync(join("content", "bank.json"), "utf8")).bank!;
const wordingOf = (category: string) => bank.questions.find((q) => q.category === category)!.prompt;
let loaded: string[] = [];
let ahead = "";
let draftFile = "";
let createdFolder = false;

test.beforeAll(async () => {
  loaded = await ensureResearched(localStack().databaseUrl, LISTS);
  ahead = (await DB.query<{ d: string }>("select (private.today() + 460)::text as d")).rows[0].d;
  createdFolder = !existsSync(DRAFTS);
  mkdirSync(DRAFTS, { recursive: true });
  draftFile = join(DRAFTS, `${ahead}.json`);
  if (existsSync(draftFile)) throw new Error(`${draftFile} exists; this test writes its own draft there`);
  const lists = ["bread", "soup", "tool"].map((c) => parseList(`lists/${c}.json`, readFileSync(`content/lists/${c}.json`, "utf8"), null).list!);
  const { day } = buildClockDay(ahead, lists.map((l) => ({ category: l.category, reroll: 0 })), { lists, edits: [], prompts: new Map(bank.questions.map((q) => [q.category, q.prompt])) });
  writeFileSync(draftFile, JSON.stringify(day));
});

test.afterAll(async () => {
  if (draftFile) rmSync(draftFile);
  if (createdFolder && readdirSync(DRAFTS).length === 0) {
    rmdirSync(DRAFTS);
    rmdirSync(join(process.cwd(), "content"));
  }
  await DB.query("delete from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date", [ahead]);
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removeResearched(DB, loaded);
  await DB.end();
});

async function openDay(page: Page, name: string) {
  await page.goto("/");
  await signInAndPick(page, name);
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-${name}@example.test`]);
  await page.goto("/admin/puzzles");
  await expect(page.getByRole("heading", { level: 2, name: "Puzzles" })).toBeVisible();
  const label = dayText(ahead);
  await page.getByRole("navigation", { name: "Days" }).getByRole("button", { name: new RegExp(`^${label}`) }).click();
  return page.getByRole("region", { name: label });
}

// What a question row shows: its wording, its counts and its six examples.
const row = (day: ReturnType<Page["getByRole"]>, n: number) => day.getByRole("row", { name: new RegExp(`^Question ${n}:`) });
const shownRow = async (day: ReturnType<Page["getByRole"]>, n: number) => {
  const r = row(day, n);
  return { name: await r.getAttribute("aria-label"), counts: await r.getByText(/ common, .* uncommon, .* rare$/).innerText(), examples: await r.getByRole("listitem").allInnerTexts() };
};

test("an admin redrafts a day on a clock, and the page asks before it is left with changes", { tag: "@visual" }, async ({ page }) => {
  const day = await openDay(page, "cr1");
  await expect(day.getByText("Draft, waiting for approval. Three questions on a clock.")).toBeVisible();
  await expect(day.getByText("Changes are kept only when you press Approve. If you leave this page first, they are lost.")).toBeVisible();
  await expect(row(day, 1)).toHaveAttribute("aria-label", `Question 1: ${wordingOf("bread")}`);
  await expect(row(day, 3)).toHaveAttribute("aria-label", `Question 3: ${wordingOf("tool")}`);
  const before = [await shownRow(day, 1), await shownRow(day, 2), await shownRow(day, 3)];
  expect(before.every((q) => q.examples.length === 6)).toBe(true);
  await expect(day.getByText("Not approved yet")).toHaveCount(0);

  // Redraft replaces all three, with lists the page has not shown.
  await day.getByRole("button", { name: "Redraft" }).click();
  await expect(day.getByText("Not approved yet")).toBeVisible();
  const after = [await shownRow(day, 1), await shownRow(day, 2), await shownRow(day, 3)];
  for (const q of after) expect(before.map((b) => b.name)).not.toContain(q.name);

  // Leaving by a link of the app asks first, and staying keeps the changes.
  const asked: string[] = [];
  page.once("dialog", (dialog) => {
    asked.push(dialog.message());
    void dialog.dismiss();
  });
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Friends" }).click();
  expect(asked).toEqual(["This day has changes that are not approved. If you leave, they are lost."]);
  await expect(page).toHaveURL(/\/admin\/puzzles$/);
  await expect(day.getByText("Not approved yet")).toBeVisible();
  // Leaving the page itself is the browser's own question.
  const unload = page.waitForEvent("dialog");
  void page.goto("/").catch(() => undefined);
  const dialog = await unload;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await expect(page).toHaveURL(/\/admin\/puzzles$/);
});

test("an admin swaps, rewords, moves and re-rolls the questions of a day on a clock, approves it, and the stored day is what the page showed", { tag: "@visual" }, async ({ page }) => {
  const day = await openDay(page, "cr2");
  const first = [await shownRow(day, 1), await shownRow(day, 2), await shownRow(day, 3)];

  // Re-roll question 1: another six, the same counts; the other questions are as they were.
  await day.getByRole("button", { name: "Re-roll the rare examples of question 1" }).click();
  await expect(row(day, 1).getByRole("listitem").first()).not.toHaveText(first[0].examples[0]);
  const rerolled = await shownRow(day, 1);
  expect(rerolled.examples).not.toEqual(first[0].examples);
  expect(rerolled.counts).toBe(first[0].counts);
  expect(await shownRow(day, 2)).toEqual(first[1]);

  // Swap question 2 (soup) for pasta, from the menu, which lists the lists the day does not hold, each with when it last appeared.
  const menu = day.getByRole("combobox", { name: "Swap question 2 for another list" });
  const options = await menu.locator("option").allInnerTexts();
  expect(options.some((t) => t.startsWith(`${wordingOf("soup")}, `))).toBe(false);
  expect(options.filter((t) => t.startsWith(`${wordingOf("pasta")}, `))).toHaveLength(1);
  await menu.selectOption((await menu.locator("option", { hasText: `${wordingOf("pasta")}, ` }).getAttribute("value"))!);
  await expect(row(day, 2)).toHaveAttribute("aria-label", `Question 2: ${wordingOf("pasta")}`);
  const pasta = await shownRow(day, 2);

  // Give question 3 a wording of its own, for this day only.
  await day.getByRole("button", { name: "Edit wording of question 3" }).click();
  await day.getByRole("textbox", { name: "Wording of question 3" }).fill("Name any tool at all");
  await expect(day.getByText("Only for this day. The list's own wording comes back the next time it is drafted.")).toBeVisible();
  await day.getByRole("button", { name: "Save wording" }).click();
  await expect(row(day, 3)).toHaveAttribute("aria-label", "Question 3: Name any tool at all");
  const tool = await shownRow(day, 3);

  // Move question 3 up: it goes above pasta, taking its six with it. The ends cannot move past themselves.
  await expect(day.getByRole("button", { name: "Move question 1 up" })).toBeDisabled();
  await expect(day.getByRole("button", { name: "Move question 3 down" })).toBeDisabled();
  await day.getByRole("button", { name: "Move question 3 up" }).click();
  const moved = [await shownRow(day, 1), await shownRow(day, 2), await shownRow(day, 3)];
  expect(moved[0]).toEqual({ ...rerolled, name: moved[0].name });
  expect(moved[1].examples).toEqual(tool.examples);
  expect(moved[1].name).toContain("Name any tool at all");
  expect(moved[2].examples).toEqual(pasta.examples);

  // Approve: nothing is kept until now, and afterwards nothing is lost by leaving.
  await day.getByRole("button", { name: "Approve day" }).click();
  await expect(day.getByRole("status")).toHaveText(`${dayText(ahead)} is approved. Players get it at midnight Pacific. You can change it until then.`);
  await expect(day.getByText("Not approved yet")).toHaveCount(0);
  const { rows } = await DB.query<{ content: { format: number; questions: { prompt: string; category: string; root: string; size: number; levels: Record<string, string>; rare: string[] }[] } }>(
    "select content from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date", [ahead]);
  const stored = rows[0].content;
  expect(stored.format).toBe(4);
  expect(stored.questions.map((q) => [q.category, q.prompt])).toEqual([
    ["bread", wordingOf("bread")],
    ["tool", "Name any tool at all"],
    ["pasta", wordingOf("pasta")],
  ]);
  for (const [i, q] of stored.questions.entries()) {
    expect(q.root).toBeTruthy();
    const names = await DB.query<{ name: string }>("select lower(t.name) as name from unnest($1::uuid[]) with ordinality as u(id, n) join private.thing t on t.id = u.id order by u.n", [q.rare]);
    expect(names.rows.map((r) => r.name)).toEqual(moved[i].examples);
    expect(moved[i].counts).toBe(`${Object.values(q.levels).filter((t) => t === "common").length} common, ${Object.values(q.levels).filter((t) => t === "uncommon").length} uncommon, ${q.size - Object.keys(q.levels).length} rare`);
  }
  // The page offers to approve again and shows the approved day beside it; leaving now asks nothing.
  await expect(day.getByRole("button", { name: "Approve again" })).toBeVisible();
  await expect(day.getByRole("heading", { name: "The approved day" })).toBeVisible();
  page.on("dialog", () => {
    throw new Error("the page asked before leaving, with nothing to lose");
  });
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Friends" }).click();
  await expect(page).not.toHaveURL(/\/admin\/puzzles$/);
});
