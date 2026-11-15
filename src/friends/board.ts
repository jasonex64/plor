// The live board (docs/milestones/M07-friends-and-live-board.md, 7c): each friend's run today, and how it ended
// once the viewer's own run is over. Until then, only whether each friend has started (M12 12d,
// docs/milestones/M12-12d-decided-fixes.md): a friend's question, or that they've finished, would tell the viewer
// which one caught them. Live updates arrive over Realtime (supabase/migrations/20261028140000_baseline.sql); this is
// the full picture the page loads first and refetches after a reconnect.
import { type ApprovedPuzzle } from "@/content/puzzle";
import type { SubstringDay } from "@/content/substrings";
import { GAME_ID, SUBSTRINGS_ID } from "@/platform/game";
import { runTotals } from "@/game/substring-places";
import type { BoardGame } from "./leaderboard";
import { named, thingNames, type Names } from "@/game/payload";
import { FINISHED, type RunStatus } from "@/game/status";
import type { Db } from "@/lib/db";
import { NO_REACTIONS, runReactions, type Reactions } from "@/reactions/reactions";
import { circleSql } from "./circle";

// How a friend's run ended, given only once the viewer's own run is over (no spoilers: DECISIONS.md, Game 1).
// question is 1-based, as players count.
export type Ended = { result: "caught"; question: number; answer: string } | { result: "survived" } | { result: "timed_out"; question: number };

export type BoardFriend = {
  // What a reaction on their run names (M19 19e).
  userId: string;
  username: string;
  // The display name if set, else the username (M07 7a).
  name: string;
  // started: before the viewer has finished, for any friend with a run today (12d). playing and finished come after.
  state: "not_started" | "started" | "playing" | "finished";
  // While playing, once the viewer has finished: the question they're on, 1-based; on Fragments' board, the round.
  question: number | null;
  // Offbeat's board: how it ended. Always null on Fragments', whose run has no catch.
  ended: Ended | null;
  // Fragments' board: the friend's score, once they and the viewer have both finished (answer 33). Never their words.
  score: number | null;
  // Reactions on their run today (M08 8b), once the viewer's own run is over and the friend has a run.
  reactions: Reactions | null;
};

// Each game has its own board (M16 16f-6, answer 4). rounds: Fragments' rounds today, read from the day, for "round k of
// n"; null on Offbeat's board and on a day with no Fragments. games: the games with an approved day today, Offbeat first,
// for the board's switch (answers 56 and 57). mine: how the viewer's own run ended, once it has (M07 7d places the viewer
// among their friends; Offbeat's only). reactionsOnMine: friends' reactions on it, from then on too (M08 8b).
export type Board = {
  game: BoardGame;
  date: string;
  finished: boolean;
  rounds: number | null;
  games: BoardGame[];
  mine: Ended | null;
  reactionsOnMine: Reactions | null;
  friends: BoardFriend[];
};

type Row = { user_id: string; username: string; name: string; status: RunStatus | null; answered: number | null };

export async function getBoard(db: Db, viewerId: string, game: BoardGame): Promise<Board> {
  const { rows: today } = await db.query<{ date: string; content: ApprovedPuzzle | SubstringDay | null; games: BoardGame[] }>(
    `select private.today()::text as date,
            (select content from private.puzzle where game_id = $1 and puzzle_date = private.today()) as content,
            array(select p.game_id from private.puzzle p where p.puzzle_date = private.today() and p.game_id = any($2::text[])
                  order by array_position($2::text[], p.game_id)) as games`,
    [game, [GAME_ID, SUBSTRINGS_ID]],
  );
  const { date, content, games } = today[0];
  // The viewer and each friend, with today's run status if they started one.
  const { rows } = await db.query<Row>(
    `with people as (${circleSql("$1")})
     select p.user_id, pr.username::text as username, coalesce(pr.display_name, pr.username::text) as name, s.status, s.answered
     from people p
     join private.profile pr on pr.user_id = p.user_id
     left join private.run_status s on s.user_id = p.user_id and s.game_id = $2 and s.puzzle_date = $3::date`,
    [viewerId, game, date],
  );
  const viewer = rows.find((r) => r.user_id === viewerId);
  const finished = viewer?.status != null && FINISHED.includes(viewer.status);
  const friends = rows.filter((r) => r.user_id !== viewerId);

  // What each caught player typed, the viewer included, read only once the viewer may see it.
  const caught = new Map<string, { question_idx: number; entry_id: string }>();
  if (finished && content && game === GAME_ID) {
    const { rows: events } = await db.query<{ user_id: string; question_idx: number; entry_id: string }>(
      `select user_id, question_idx, entry_id from private.run_event
       where game_id = $1 and puzzle_date = $2::date and matched and user_id = any($3::uuid[])`,
      [GAME_ID, date, rows.map((r) => r.user_id)],
    );
    for (const e of events) caught.set(e.user_id, e);
  }
  const names = await thingNames(db, [...caught.values()].map((e) => e.entry_id));
  // Reactions wait for the viewer's run to end too: a reaction on how a friend's run ended says something about it.
  const reactions = finished ? await runReactions(db, viewerId, game, date, rows.map((r) => r.user_id)) : new Map<string, Reactions>();

  // A friend's score on Fragments, from their words as the ledger and the feed work it out: read only for friends who
  // have finished, and only once the viewer has.
  const scored = finished && game === SUBSTRINGS_ID ? friends.filter((f) => f.status !== null && FINISHED.includes(f.status)) : [];
  const scores = scored.length > 0 ? await runTotals(db, scored.map((f) => f.user_id), scored.map(() => date)) : new Map<string, number>();

  return {
    game,
    date,
    finished,
    rounds: game === SUBSTRINGS_ID && content ? (content as SubstringDay).rounds.length : null,
    games,
    mine: finished && content && game === GAME_ID ? ended(viewer!, caught.get(viewerId), names) : null,
    reactionsOnMine: finished ? (reactions.get(viewerId) ?? NO_REACTIONS) : null,
    friends: friends
      .map((f): BoardFriend => {
        const state = f.status === null ? "not_started" : !finished ? "started" : FINISHED.includes(f.status) ? "finished" : "playing";
        return {
          userId: f.user_id,
          username: f.username,
          name: f.name,
          state,
          question: state === "playing" ? f.answered! + 1 : null,
          ended: state === "finished" && game === GAME_ID ? ended(f, caught.get(f.user_id), names) : null,
          score: state === "finished" && game === SUBSTRINGS_ID ? scores.get(`${f.user_id}:${date}`)! : null,
          reactions: finished && state !== "not_started" ? (reactions.get(f.user_id) ?? NO_REACTIONS) : null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name) || a.username.localeCompare(b.username)),
  };
}

export function ended(f: Pick<Row, "username" | "status" | "answered">, event: { question_idx: number; entry_id: string } | undefined, names: Names): Ended {
  if (f.status === "survived") return { result: "survived" };
  if (f.status === "timed_out") return { result: "timed_out", question: f.answered! + 1 };
  // A died run always has its matched event (run_status: died = bool_or(matched)).
  if (!event) throw new Error(`run of ${f.username} is died with no matched event`);
  return { result: "caught", question: event.question_idx + 1, answer: named(names, event.entry_id).name };
}
