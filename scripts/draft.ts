// Drafting a day (DECISIONS.md, Puzzle drafting; docs/milestones/M23-23e-drafting-and-approving.md, 23e-1; answers 50 and 54):
// `npm run draft -- <date>` writes content/offbeat/<date>.json, a day on a clock for the human to approve on /admin/puzzles. Its
// three lists are the ones asked longest ago (never first, ties at random by the date), the last asking read from the approved
// days in the database and from the drafted files on disk (`drafted`). It builds the day as the approval page does
// (src/content/clock-day.ts) and says for each list how long ago it last appeared, so a repeat while the lists are few is seen.
// The local stack only (13a: "Local only").
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type pg from "pg";
import { approvedDays, buildChecked, pickLists, whenText, type ClockSource, type ListUse, type UseDay } from "../src/content/clock-day.ts";
import { checkDraftFile, isCalendarDate, parseClockDraft, type ClockDraft } from "../src/content/puzzle.ts";
import { parseBank } from "../src/content/bank.ts";
import { GAME_ID } from "../src/platform/game.ts";
import { localClient, readEdits, readLists } from "./base.ts";

export async function draftClock(db: pg.Client, date: string, source: Pick<ClockSource, "lists" | "prompts">, drafted: UseDay[]): Promise<{ day: ClockDraft; lines: string[] }> {
  const used = [...(await approvedDays(db)), ...drafted];
  const picked = pickLists(date, source.lists.map((l) => l.category), used);
  const checked = buildChecked(date, picked.map((p) => ({ category: p.category, reroll: 0 })), { ...source, edits: await readEdits(db) });
  if ("problems" in checked) throw new Error(`the drafted day breaks the rules:\n${checked.problems.join("\n")}`);
  return { day: checked.built.day, lines: clockLines(checked.built.day, picked) };
}

// The summary's line for each question: its wording and list, and when the list last appeared (answer 54).
export function clockLines(day: ClockDraft, picked: ListUse[]): string[] {
  return day.questions.map((q, i) => `  q${i + 1} "${q.prompt}" (${q.category}): last appeared ${whenText(day.date, picked[i].last)}`);
}

// The command's date, or null for usage it doesn't take. The date is user input: a malformed one would make every gap NaN
// and let any category through (13d review).
export function draftArgs(args: string[]): string | null {
  return args.length === 1 && isCalendarDate(args[0]) ? args[0] : null;
}

// Every drafted day on disk, each checked as content:validate checks it.
function readDays(dir: string): ClockDraft[] {
  // No file is committed until a day is drafted, and git holds no empty folder.
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => n.endsWith(".json")).map((n) => {
    const file = `${GAME_ID}/${n}`;
    const text = readFileSync(join(dir, n), "utf8");
    const problems = checkDraftFile(file, text);
    if (problems.length) throw new Error(problems.join("\n"));
    return parseClockDraft(file, text).puzzle!;
  });
}

async function main(): Promise<void> {
  const date = draftArgs(process.argv.slice(2));
  if (!date) {
    console.error("usage: npm run draft -- <date>");
    process.exit(2);
  }
  const { bank, errors } = parseBank("bank.json", readFileSync(join("content", "bank.json"), "utf8"));
  if (!bank) throw new Error(errors.join("\n"));
  const dir = join("content", GAME_ID);
  const days = readDays(dir);
  const db = await localClient();
  try {
    const prompts = new Map(bank.questions.map((q) => [q.category, q.prompt]));
    const { day, lines } = await draftClock(db, date, { lists: readLists(), prompts }, days);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${day.date}.json`), `${JSON.stringify(day, null, 2)}\n`);
    console.log(`DRAFTED ${dir}/${day.date}.json`);
    console.log(lines.join("\n"));
  } finally {
    await db.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
