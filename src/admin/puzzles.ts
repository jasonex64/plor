// The admin puzzle page's server work (docs/milestones/M06-puzzle-entry.md). Drafted days are the content files a
// Claude session committed from the question bank (DECISIONS.md: Puzzle drafting; M13 13d); approved days are in the
// database, written only through private.approve_puzzle, which checks the admin itself.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseError } from "pg";
import { avoids, checkDayFile, checkHostNames, checkPuzzle, isClockDay, parseDay, stolenLetters, type ApprovedPuzzle, type ClockDraft, type DraftedDay, type Puzzle } from "@/content/puzzle";
import { GAME_ID } from "@/platform/game";
import { thingNames, type Names } from "@/game/payload";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { STATUS } from "@/lib/status";
import { clockContext, draftSide, liveSide, type ClockSides } from "./clock-days";

// Every drafted day in the deployment, by date, of either format (seven questions, or a clock's three: the old game's days stay
// until 23f). CI validates these files, so one that fails here is a bug: it throws.
// The folder is written out in full ("content", "offbeat") so the build can see which folder is read; a path built from
// a variable made it trace the whole project (observed, `next build`, 2026-10-21). next.config.ts includes the folder in
// the routes that read it.
export function readDrafts(): Map<string, DraftedDay> {
  const drafts = new Map<string, DraftedDay>();
  for (const name of readdirSync(join(process.cwd(), "content", "offbeat")).filter((n) => n.endsWith(".json")).sort()) {
    const file = `${GAME_ID}/${name}`;
    const text = readFileSync(join(process.cwd(), "content", "offbeat", name), "utf8");
    const errors = checkDayFile(file, text);
    const { puzzle } = parseDay(file, text);
    if (errors.length || !puzzle) throw new Error(`drafted day ${file} is invalid:\n${errors.join("\n")}`);
    drafts.set(puzzle.date, puzzle);
  }
  return drafts;
}

// What the page shows of a puzzle: each question's prompt, category, stolen letter, host answers and host bank by name.
// The category's members aren't listed: there can be tens of thousands (docs/milestones/M13-13a-the-base.md).
// A bank answer's stolen is a letter stolen at or before its question that its name has, so players can't type it
// and it can't be a host answer (checkHostNames, the approve route's rule); null when it can. Its name is null when
// this database doesn't have the thing (a draft built against another one, or plor.app's answer database, empty by
// choice): the page says so instead of showing the ID as a name (CLAUDE.md, Fail loudly; human, 2026-10-28: "Mark each
// one (Recommended)").
export type HostChoice = { id: string; name: string | null; stolen: string | null };
export type QuestionView = { prompt: string; category: string; steals: string | null; hostAnswers: string[]; hostBank: HostChoice[] };
export type DayView = {
  date: string;
  // The drafted day from the content files, if one exists.
  draft: QuestionView[] | null;
  // The approved day players get, if any.
  live: QuestionView[] | null;
  started: boolean;
  // A day on a clock has no host answers: its draft and live are null here, and this holds them (23e-1).
  clock?: ClockSides;
};

// Approving a host answer missing from this database is refused (checkHostNames).
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
        return { id, name: name ?? null, stolen: name === undefined ? null : (stolen.find((letter) => !avoids(name, [letter])) ?? null) };
      }),
    };
  });
}

// Every day from today on that has a draft or an approved puzzle, oldest first. adminId: whose review of the lists a day on a clock
// is built with (src/admin/clock-days.ts).
export async function listDays(db: Db, drafts: Map<string, DraftedDay>, adminId: string): Promise<{ today: string; days: DayView[] }> {
  const today = (await db.query<{ today: string }>("select private.today()::text as today")).rows[0].today;
  const live = await db.query<{ date: string; content: DraftedDay }>(
    "select puzzle_date::text as date, content from private.puzzle where game_id = $1 and puzzle_date >= private.today()",
    [GAME_ID],
  );
  const approved = new Map(live.rows.map((r) => [r.date, r.content]));
  const dates = new Set([...approved.keys(), ...[...drafts.keys()].filter((d) => d >= today)]);
  const hosted = (p: DraftedDay | undefined): Puzzle | null => (p && !isClockDay(p) ? p : null);
  const clocked = (p: DraftedDay | undefined): ClockDraft | null => (p && isClockDay(p) ? p : null);
  const names = await thingNames(db, [...dates].flatMap((d) => [hosted(drafts.get(d)), hosted(approved.get(d))].flatMap((p) => p?.questions.flatMap((q) => q.host_bank) ?? [])));
  // What a day on a clock is built from is read once, and only when there is one.
  const context = [...dates].some((d) => clocked(drafts.get(d)) || clocked(approved.get(d))) ? await clockContext(db, adminId, drafts) : null;
  const days: DayView[] = [];
  for (const date of [...dates].sort()) {
    const draft = drafts.get(date);
    const puzzle = approved.get(date);
    const day: DayView = {
      date,
      draft: hosted(draft) && view(hosted(draft)!, names),
      live: hosted(puzzle) && view(hosted(puzzle)!, names),
      started: puzzle !== undefined && date <= today,
    };
    const clockDraft = clocked(draft);
    const clockLive = clocked(puzzle);
    if (clockDraft || clockLive) {
      day.clock = { draft: clockDraft && draftSide(clockDraft, context!), live: clockLive && (await liveSide(db, clockLive)) };
    }
    days.push(day);
  }
  return { today, days };
}

// The SQLSTATEs the two guarded functions raise (supabase/migrations/20261028140000_baseline.sql), as API errors.
function guarded(err: unknown): never {
  if (err instanceof DatabaseError) {
    if (err.code === "OB007") throw new AppError("admins_only", STATUS.forbidden);
    if (err.code === "OB008") throw new AppError("day_past", STATUS.conflict);
    if (err.code === "OB004") throw new AppError("puzzle_started", STATUS.conflict);
  }
  throw err;
}

// Approves a day, or returns the problems private.approve_puzzle found against the base (OB009), one per question as it
// names them ("question 3: ..."), reworded to the "q3" the page files them under. They come as a JSON list in the
// error's detail, so a problem whose category name holds "; " stays one (13f-3b-2).
export async function approvePuzzle(db: Db, userId: string, puzzle: DraftedDay): Promise<string[]> {
  try {
    await db.query("select private.approve_puzzle($1, $2)", [userId, puzzle]);
    return [];
  } catch (err) {
    return problemsOf(err, puzzle.date);
  }
}

// A drafted day as approval would store it now, without storing it, for a test run; or approval's own problems with
// it (docs/milestones/M14-14b-11-test-runs.md, answers 10 and 11).
export async function buildPuzzle(db: Db, userId: string, puzzle: Puzzle): Promise<{ built: ApprovedPuzzle } | { problems: string[] }> {
  try {
    return { built: (await db.query<{ built: ApprovedPuzzle }>("select private.build_puzzle($1, $2) as built", [userId, puzzle])).rows[0].built };
  } catch (err) {
    return { problems: problemsOf(err, puzzle.date) };
  }
}

export function problemsOf(err: unknown, date: string): string[] {
  if (err instanceof DatabaseError && err.code === "OB009") {
    return (JSON.parse(err.detail!) as string[]).map((p) => p.replace(/^question (\d+):/, `${date} q$1:`));
  }
  return guarded(err);
}

// A drafted day with the admin's host answers, checked before the database's checks: by the same content rules as a
// file, then the host answers' names against the stolen letters (the approve route's checks, and a test run's).
export async function draftProblems(db: Db, date: string, puzzle: Puzzle): Promise<string[]> {
  const shape = checkPuzzle(date, puzzle);
  return shape.length ? shape : checkHostNames(date, puzzle, await thingNames(db, puzzle.questions.flatMap((q) => q.host_answers)));
}

// One list of entry IDs per question.
export function isHostAnswerLists(v: unknown, questions: number): v is string[][] {
  return Array.isArray(v) && v.length === questions && v.every((l) => Array.isArray(l) && l.every((id) => typeof id === "string"));
}
