// The admin's work on game 2's days (docs/milestones/M16-16c-a-day-of-game-2.md, 16c-2). Drafted days are the files
// `npm run substrings` wrote; approved days are in the database, written only through private.approve_puzzle, as for
// game 1 (DECISIONS.md: Puzzle approval). The word counts aren't here: the review reads them in the PR until 16d puts
// the word list on the server.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkSubstringsFile, parseSubstringDay, type SubstringDay } from "@/content/substrings";
import type { Db } from "@/lib/db";
import { SUBSTRINGS_ID } from "@/platform/game";
import { problemsOf } from "./puzzles";

export type SubstringSets = { rounds: string[]; bonusLetter: string };
export type SubstringDayView = { date: string; draft: SubstringSets | null; live: SubstringSets | null; started: boolean };

// Every drafted day in the deployment, by date. The folder is missing until the first day is drafted, which isn't a
// fault; a file CI should have refused is, so it throws. The path is written out in full so the build can trace it
// (readDrafts, src/admin/puzzles.ts).
export function readSubstringDrafts(): Map<string, SubstringDay> {
  const drafts = new Map<string, SubstringDay>();
  if (!existsSync(join(process.cwd(), "content", "substrings"))) return drafts;
  for (const name of readdirSync(join(process.cwd(), "content", "substrings")).filter((n) => n.endsWith(".json")).sort()) {
    const file = `${SUBSTRINGS_ID}/${name}`;
    const text = readFileSync(join(process.cwd(), "content", "substrings", name), "utf8");
    const errors = checkSubstringsFile(file, text);
    const { day } = parseSubstringDay(file, text);
    if (errors.length || !day) throw new Error(`drafted day ${file} is invalid:\n${errors.join("\n")}`);
    drafts.set(day.date, day);
  }
  return drafts;
}

const sets = (day: SubstringDay): SubstringSets => ({ rounds: day.rounds, bonusLetter: day.bonus_letter });

// Every day from today on that has a draft or an approved day, oldest first.
export async function listSubstringDays(db: Db, drafts: Map<string, SubstringDay>): Promise<SubstringDayView[]> {
  const today = (await db.query<{ today: string }>("select private.today()::text as today")).rows[0].today;
  const live = await db.query<{ date: string; content: SubstringDay }>(
    "select puzzle_date::text as date, content from private.puzzle where game_id = $1 and puzzle_date >= private.today()",
    [SUBSTRINGS_ID],
  );
  const approved = new Map(live.rows.map((r) => [r.date, r.content]));
  const dates = new Set([...approved.keys(), ...[...drafts.keys()].filter((d) => d >= today)]);
  return [...dates].sort().map((date) => {
    const draft = drafts.get(date);
    const day = approved.get(date);
    return { date, draft: draft ? sets(draft) : null, live: day ? sets(day) : null, started: day !== undefined && date <= today };
  });
}

export async function approveSubstringDay(db: Db, userId: string, day: SubstringDay): Promise<string[]> {
  try {
    await db.query("select private.approve_puzzle($1, $2)", [userId, day]);
    return [];
  } catch (err) {
    return problemsOf(err, day.date);
  }
}
