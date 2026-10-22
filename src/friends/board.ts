// The live board (docs/milestones/M07-friends-and-live-board.md, 7c): each friend's run today, and how it ended
// once the viewer's own run is over. Live updates arrive over Realtime (supabase/migrations/20261022073610_live_board.sql);
// this is the full picture the page loads first and refetches after a reconnect.
import { GAME_ID, type Puzzle } from "@/content/puzzle";
import { named } from "@/game/payload";
import type { RunStatus } from "@/game/runs";
import type { Db } from "@/lib/db";

// How a friend's run ended, given only once the viewer's own run is over (no spoilers: DECISIONS.md, Game 1).
// question is 1-based, as players count.
export type Ended = { result: "caught"; question: number; answer: string } | { result: "survived" } | { result: "timed_out"; question: number };

export type BoardFriend = {
  username: string;
  // The display name if set, else the username (M07 7a).
  name: string;
  state: "not_started" | "playing" | "finished";
  // While playing: the question they're on, 1-based.
  question: number | null;
  ended: Ended | null;
};

// mine: how the viewer's own run ended, once it has (M07 7d places the viewer among their friends).
export type Board = { date: string; finished: boolean; mine: Ended | null; friends: BoardFriend[] };

const FINISHED: RunStatus[] = ["died", "survived", "timed_out"];

type Row = { user_id: string; username: string; name: string; status: RunStatus | null; answered: number | null };

export async function getBoard(db: Db, viewerId: string): Promise<Board> {
  const { rows: today } = await db.query<{ date: string; content: Puzzle | null }>(
    `select private.today()::text as date,
            (select content from private.puzzle where game_id = $1 and puzzle_date = private.today()) as content`,
    [GAME_ID],
  );
  const { date, content } = today[0];
  // The viewer and each friend, with today's run status if they started one.
  const { rows } = await db.query<Row>(
    `with people as (
       select $1::uuid as user_id
       union all
       select case when f.user_a = $1 then f.user_b else f.user_a end from private.friendship f where $1 in (f.user_a, f.user_b)
     )
     select p.user_id, pr.username::text as username, coalesce(pr.display_name, pr.username::text) as name, s.status, s.answered
     from people p
     join private.profile pr on pr.user_id = p.user_id
     left join private.run_status s on s.user_id = p.user_id and s.game_id = $2 and s.puzzle_date = $3::date`,
    [viewerId, GAME_ID, date],
  );
  const viewer = rows.find((r) => r.user_id === viewerId);
  const finished = viewer?.status != null && FINISHED.includes(viewer.status);
  const friends = rows.filter((r) => r.user_id !== viewerId);

  // What each caught player typed, the viewer included, read only once the viewer may see it.
  const caught = new Map<string, { question_idx: number; entry_id: string }>();
  if (finished && content) {
    const { rows: events } = await db.query<{ user_id: string; question_idx: number; entry_id: string }>(
      `select user_id, question_idx, entry_id from private.run_event
       where game_id = $1 and puzzle_date = $2::date and matched and user_id = any($3::uuid[])`,
      [GAME_ID, date, rows.map((r) => r.user_id)],
    );
    for (const e of events) caught.set(e.user_id, e);
  }

  return {
    date,
    finished,
    mine: finished && content ? ended(viewer!, caught.get(viewerId), content) : null,
    friends: friends
      .map((f): BoardFriend => {
        const state = f.status === null ? "not_started" : FINISHED.includes(f.status) ? "finished" : "playing";
        return {
          username: f.username,
          name: f.name,
          state,
          question: state === "playing" ? f.answered! + 1 : null,
          ended: finished && state === "finished" ? ended(f, caught.get(f.user_id), content!) : null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name) || a.username.localeCompare(b.username)),
  };
}

function ended(f: Row, event: { question_idx: number; entry_id: string } | undefined, content: Puzzle): Ended {
  if (f.status === "survived") return { result: "survived" };
  if (f.status === "timed_out") return { result: "timed_out", question: f.answered! + 1 };
  // A died run always has its matched event (run_status: died = bool_or(matched)).
  if (!event) throw new Error(`run of ${f.username} is died with no matched event`);
  return { result: "caught", question: event.question_idx + 1, answer: named(content.questions[event.question_idx], event.entry_id).name };
}
