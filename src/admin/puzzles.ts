// The admin puzzle page's server work (docs/milestones/M06-puzzle-entry.md). Drafted days are the content files a
// Claude session committed from the question bank (DECISIONS.md: Puzzle drafting; M13 13d); approved days are in the
// database, written only through private.approve_puzzle, which checks the admin itself.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseError } from "pg";
import { GAME_ID, avoids, checkPuzzleFile, parsePuzzle, stolenLetters, type Puzzle } from "@/content/puzzle";
import { thingNames, type Named, type Names } from "@/game/payload";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";

// Every drafted day in the deployment, by date. CI validates these files, so one that fails here is a bug: it throws.
// The folder is written out in full ("content", "offbeat") so the build can see which folder is read; a path built from
// a variable made it trace the whole project (observed, `next build`, 2026-10-21). next.config.ts includes the folder in
// the routes that read it.
export function readDrafts(): Map<string, Puzzle> {
  const drafts = new Map<string, Puzzle>();
  for (const name of readdirSync(join(process.cwd(), "content", "offbeat")).filter((n) => n.endsWith(".json")).sort()) {
    const file = `${GAME_ID}/${name}`;
    const text = readFileSync(join(process.cwd(), "content", "offbeat", name), "utf8");
    const errors = checkPuzzleFile(file, text);
    const { puzzle } = parsePuzzle(file, text);
    if (errors.length || !puzzle) throw new Error(`drafted day ${file} is invalid:\n${errors.join("\n")}`);
    drafts.set(puzzle.date, puzzle);
  }
  return drafts;
}

// What the page shows of a puzzle: each question's prompt, category, stolen letter, host answers and host bank by name.
// The category's members aren't listed: there can be tens of thousands (docs/milestones/M13-13a-the-base.md).
// A bank answer's stolen is a letter stolen at or before its question that its name has, so players can't type it
// and it can't be a host answer (checkHostNames, the approve route's rule); null when it can.
export type HostChoice = Named & { stolen: string | null };
export type QuestionView = { prompt: string; category: string; steals: string | null; hostAnswers: string[]; hostBank: HostChoice[] };
export type DayView = {
  date: string;
  // The drafted day from the content files, if one exists.
  draft: QuestionView[] | null;
  // The approved day players get, if any.
  live: QuestionView[] | null;
  started: boolean;
};

// A host bank entry missing from this database (a draft built against another one) shows its ID, and approving it is
// refused for that (checkHostNames).
function view(puzzle: Puzzle, names: Names): QuestionView[] {
  return puzzle.questions.map((q, i) => {
    const stolen = stolenLetters(puzzle, i);
    return {
      prompt: q.prompt,
      category: q.category,
      steals: q.steals ?? null,
      hostAnswers: q.host_answers,
      hostBank: q.host_bank.map((id) => {
        const name = names.get(id);
        return { id, name: name ?? id, stolen: name === undefined ? null : (stolen.find((letter) => !avoids(name, [letter])) ?? null) };
      }),
    };
  });
}

// Every day from today on that has a draft or an approved puzzle, oldest first.
export async function listDays(db: Db, drafts: Map<string, Puzzle>): Promise<{ today: string; days: DayView[] }> {
  const today = (await db.query<{ today: string }>("select private.today()::text as today")).rows[0].today;
  const live = await db.query<{ date: string; content: Puzzle }>(
    "select puzzle_date::text as date, content from private.puzzle where game_id = $1 and puzzle_date >= private.today()",
    [GAME_ID],
  );
  const approved = new Map(live.rows.map((r) => [r.date, r.content]));
  const dates = new Set([...approved.keys(), ...[...drafts.keys()].filter((d) => d >= today)]);
  const names = await thingNames(db, [...dates].flatMap((d) => [drafts.get(d), approved.get(d)].flatMap((p) => p?.questions.flatMap((q) => q.host_bank) ?? [])));
  const days = [...dates].sort().map((date) => {
    const draft = drafts.get(date);
    const puzzle = approved.get(date);
    return {
      date,
      draft: draft ? view(draft, names) : null,
      live: puzzle ? view(puzzle, names) : null,
      started: puzzle !== undefined && date <= today,
    };
  });
  return { today, days };
}

// The SQLSTATEs the two guarded functions raise (migrations 20261021232903_puzzle_entry.sql, 20261024213853_answer_engine.sql), as API errors.
function guarded(err: unknown): never {
  if (err instanceof DatabaseError) {
    if (err.code === "OB007") throw new AppError("admins_only", 403);
    if (err.code === "OB008") throw new AppError("day_past", 409);
    if (err.code === "OB004") throw new AppError("puzzle_started", 409);
  }
  throw err;
}

// Approves a day, or returns the problems private.approve_puzzle found against the base (OB009), one per question as it
// names them ("question 3: ..."), reworded to the "q3" the page files them under.
export async function approvePuzzle(db: Db, userId: string, puzzle: Puzzle): Promise<string[]> {
  try {
    await db.query("select private.approve_puzzle($1, $2)", [userId, puzzle]);
    return [];
  } catch (err) {
    if (err instanceof DatabaseError && err.code === "OB009") {
      return err.message.replace(/^puzzle_invalid: /, "").split("; ").map((p) => p.replace(/^question (\d+):/, `${puzzle.date} q$1:`));
    }
    return guarded(err);
  }
}
