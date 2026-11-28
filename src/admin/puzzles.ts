// The admin puzzle page's server work (docs/milestones/M06-puzzle-entry.md). Drafted days are the content files a
// Claude session committed (DECISIONS.md: Puzzle drafting); approved days are in the database, written only through
// private.approve_puzzle, which checks the admin itself.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseError } from "pg";
import { checkDraftFile, parseClockDraft, type ClockDraft } from "@/content/puzzle";
import { GAME_ID } from "@/platform/game";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { STATUS } from "@/lib/status";
import { clockContext, draftSide, liveSide, type ClockSides } from "./clock-days";

// Every drafted day in the deployment, by date. CI validates these files, so one that fails here is a bug: it throws.
// The folder is written out in full ("content", "offbeat") so the build can see which folder is read; a path built from
// a variable made it trace the whole project (observed, `next build`, 2026-10-21). next.config.ts includes the folder in
// the routes that read it.
export function readDrafts(): Map<string, ClockDraft> {
  const drafts = new Map<string, ClockDraft>();
  // No file is committed until a day is drafted, and git holds no empty folder.
  if (!existsSync(join(process.cwd(), "content", "offbeat"))) return drafts;
  for (const name of readdirSync(join(process.cwd(), "content", "offbeat")).filter((n) => n.endsWith(".json")).sort()) {
    const file = `${GAME_ID}/${name}`;
    const text = readFileSync(join(process.cwd(), "content", "offbeat", name), "utf8");
    const errors = checkDraftFile(file, text);
    const { puzzle } = parseClockDraft(file, text);
    if (errors.length || !puzzle) throw new Error(`drafted day ${file} is invalid:\n${errors.join("\n")}`);
    drafts.set(puzzle.date, puzzle);
  }
  return drafts;
}

// What the page shows of a day (docs/milestones/M23-23e-drafting-and-approving.md): the draft as it would be approved now and the
// day approved (src/admin/clock-days.ts). started: players have started the approved day.
export type DayView = { date: string; started: boolean; clock: ClockSides };

// Every day from today on that has a draft or an approved puzzle, oldest first. adminId: whose review of the lists a day
// is built with (src/admin/clock-days.ts).
export async function listDays(db: Db, drafts: Map<string, ClockDraft>, adminId: string): Promise<{ today: string; days: DayView[] }> {
  const today = (await db.query<{ today: string }>("select private.today()::text as today")).rows[0].today;
  const live = await db.query<{ date: string; content: ClockDraft }>(
    "select puzzle_date::text as date, content from private.puzzle where game_id = $1 and puzzle_date >= private.today()",
    [GAME_ID],
  );
  const approved = new Map(live.rows.map((r) => [r.date, r.content]));
  const dates = new Set([...approved.keys(), ...[...drafts.keys()].filter((d) => d >= today)]);
  // What a day is built from is read once, and only when there is one.
  const context = dates.size > 0 ? await clockContext(db, adminId, drafts) : null;
  const days: DayView[] = [];
  for (const date of [...dates].sort()) {
    const draft = drafts.get(date);
    const puzzle = approved.get(date);
    days.push({
      date,
      started: puzzle !== undefined && date <= today,
      clock: { draft: draft ? draftSide(draft, context!) : null, live: puzzle ? await liveSide(db, puzzle) : null },
    });
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
export async function approvePuzzle(db: Db, userId: string, puzzle: ClockDraft): Promise<string[]> {
  try {
    await db.query("select private.approve_puzzle($1, $2)", [userId, puzzle]);
    return [];
  } catch (err) {
    return problemsOf(err, puzzle.date);
  }
}

export function problemsOf(err: unknown, date: string): string[] {
  if (err instanceof DatabaseError && err.code === "OB009") {
    return (JSON.parse(err.detail!) as string[]).map((p) => p.replace(/^question (\d+):/, `${date} q$1:`));
  }
  return guarded(err);
}
