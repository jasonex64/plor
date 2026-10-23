// Today's puzzle for the e2e tests that play: the published one, or a fixture under today's date, as in
// src/test/puzzles.ts, which removePuzzle deletes again. Shared by live-board.e2e.ts and groups.e2e.ts.
import type { Pool } from "pg";
import { readFileSync } from "node:fs";

type Content = { questions: { host_answers: string[]; match_groups: Record<string, string[]>; entries: { id: string; name: string }[] }[] };
// created: the date of the fixture this added, if it added one.
export type TodayPuzzle = { hostAnswer: string; safeAnswer: string; created: string | null };

export async function todayPuzzle(db: Pool): Promise<TodayPuzzle> {
  const { rows } = await db.query<{ today: string; content: Content | null }>(
    "select private.today()::text as today, (select content from private.puzzle where game_id = 'offbeat' and puzzle_date = private.today()) as content",
  );
  let content = rows[0].content;
  let created: string | null = null;
  if (!content) {
    content = { ...JSON.parse(readFileSync("content/offbeat/2026-10-26.json", "utf8")), date: rows[0].today } as Content;
    await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ('offbeat', $1::date, $2)", [rows[0].today, content]);
    created = rows[0].today;
  }
  // Question 1 steals no letter (schedule A), so the host answer's name can be typed as is.
  const q = content.questions[0];
  const hostAnswer = q.entries.find((e) => e.id === q.host_answers[0])!.name;
  // An answer the host doesn't catch: not a host answer, and not grouped with one.
  const caught = new Set([...q.host_answers, ...q.host_answers.flatMap((h) => q.match_groups[h] ?? [])]);
  const safeAnswer = q.entries.find((e) => !caught.has(e.id))!.name;
  return { hostAnswer, safeAnswer, created };
}

// Run after the players are deleted (a run references its puzzle).
export async function removePuzzle(db: Pool, puzzle: TodayPuzzle): Promise<void> {
  if (puzzle.created) await db.query("delete from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date", [puzzle.created]);
}
