// The admin puzzle page's server work (docs/milestones/M06-puzzle-entry.md). Drafted days are the content files a
// Claude session committed (DECISIONS.md: Puzzle drafting); saved questions and approved days are in the database,
// written only through private.save_questions and private.approve_puzzle, which check the admin themselves.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseError } from "pg";
import { GAME_ID, checkPuzzleFile, parsePuzzle, type Puzzle } from "@/content/puzzle";
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

// What the page shows of a puzzle: each question's prompt, stolen letter, host answers and every answer it accepts.
export type QuestionView = { prompt: string; steals: string | null; hostAnswers: string[]; answers: { id: string; name: string; aliases: string[] }[] };
export type DayView = {
  date: string;
  // The questions an admin saved for the day, if any.
  questions: string[] | null;
  // The drafted day from the content files, if one exists.
  draft: QuestionView[] | null;
  // The approved day players get, if any.
  live: QuestionView[] | null;
  started: boolean;
};

function view(puzzle: Puzzle): QuestionView[] {
  return puzzle.questions.map((q) => ({
    prompt: q.prompt,
    steals: q.steals ?? null,
    hostAnswers: q.host_answers,
    answers: q.entries.map((e) => ({ id: e.id, name: e.name, aliases: e.aliases })),
  }));
}

// Every day from today on that has saved questions, a draft or an approved puzzle, oldest first.
export async function listDays(db: Db, drafts: Map<string, Puzzle>): Promise<{ today: string; days: DayView[] }> {
  const today = (await db.query<{ today: string }>("select private.today()::text as today")).rows[0].today;
  const saved = await db.query<{ date: string; prompts: string[] }>(
    "select puzzle_date::text as date, prompts from private.puzzle_questions where game_id = $1 and puzzle_date >= private.today()",
    [GAME_ID],
  );
  const live = await db.query<{ date: string; content: Puzzle }>(
    "select puzzle_date::text as date, content from private.puzzle where game_id = $1 and puzzle_date >= private.today()",
    [GAME_ID],
  );
  const questions = new Map(saved.rows.map((r) => [r.date, r.prompts]));
  const approved = new Map(live.rows.map((r) => [r.date, r.content]));
  const dates = new Set([...questions.keys(), ...approved.keys(), ...[...drafts.keys()].filter((d) => d >= today)]);
  const days = [...dates].sort().map((date) => {
    const draft = drafts.get(date);
    const puzzle = approved.get(date);
    return {
      date,
      questions: questions.get(date) ?? null,
      draft: draft ? view(draft) : null,
      live: puzzle ? view(puzzle) : null,
      started: puzzle !== undefined && date <= today,
    };
  });
  return { today, days };
}

// The SQLSTATEs the two guarded functions raise (migration 20261021232903_puzzle_entry.sql), as API errors.
function guarded(err: unknown): never {
  if (err instanceof DatabaseError) {
    if (err.code === "OB007") throw new AppError("admins_only", 403);
    if (err.code === "OB008") throw new AppError("day_past", 409);
    if (err.code === "OB004") throw new AppError("puzzle_started", 409);
  }
  throw err;
}

export async function saveQuestions(db: Db, userId: string, date: string, prompts: string[]): Promise<void> {
  await db.query("select private.save_questions($1, $2, $3::date, $4)", [userId, GAME_ID, date, prompts]).catch(guarded);
}

export async function approvePuzzle(db: Db, userId: string, puzzle: Puzzle): Promise<void> {
  await db.query("select private.approve_puzzle($1, $2)", [userId, puzzle]).catch(guarded);
}
