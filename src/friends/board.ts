// The live board (docs/milestones/M07-friends-and-live-board.md, 7c): each friend's run today. On Offbeat a friend's question and
// points are shown from the start, which the human accepted knowing a friend still to play sees scores before their own run
// (2026-11-25, answer 47: docs/milestones/M23-23d-the-screens.md, "The live board"); on Fragments, until the viewer has
// finished, only whether each friend has started (M12 12d, docs/milestones/M12-12d-decided-fixes.md). Live updates arrive over Realtime (supabase/migrations/20261028140000_baseline.sql); this is
// the full picture the page loads first and refetches after a reconnect.
import type { ClockPuzzle } from "@/content/puzzle";
import type { SubstringDay } from "@/content/substrings";
import { GAME_ID, SUBSTRINGS_ID } from "@/platform/game";
import { runTotals } from "@/game/substring-places";
import type { BoardGame } from "./leaderboard";
import { FINISHED, type RunStatus } from "@/game/status";
import type { Db } from "@/lib/db";
import { NO_REACTIONS, runReactions, type Reactions } from "@/reactions/reactions";
import { circleSql } from "./circle";

// How a finished Offbeat run reads in the feed: what it scored and how many answers it gave, by the answers given
// before the day's midnight, as the ledger counts them (M23 23f-2, answer 67).
export type Scored = { result: "scored"; points: number; answers: number };

export type BoardFriend = {
  // What a reaction on their run names (M19 19e).
  userId: string;
  username: string;
  // The display name if set, else the username (M07 7a).
  name: string;
  // started: before the viewer has finished, for any friend with a run today (12d). playing and finished come after.
  state: "not_started" | "started" | "playing" | "finished";
  // While playing: the question they're on, 1-based; on Fragments' board, once the viewer has finished, the round.
  question: number | null;
  // Fragments' board: the friend's score, once they and the viewer have both finished (answer 33). Never their words.
  score: number | null;
  // Offbeat's board: the points of their run so far, or all of it once it has ended, from their first answer, whether or not the
  // viewer has finished. Absent on Fragments', and null for a friend with no run.
  points?: number | null;
  // Reactions on their run today (M08 8b), once the viewer's own run is over and the friend has a run.
  reactions: Reactions | null;
};

// Each game has its own board (M16 16f-6, answer 4). rounds: Fragments' rounds today, read from the day, for "round k of
// n"; null on Offbeat's board and on a day with no Fragments. games: the games with an approved day today, Offbeat first,
// for the board's switch (answers 56 and 57). reactionsOnMine: friends' reactions on the viewer's run, once it has ended
// (M08 8b).
export type Board = {
  game: BoardGame;
  date: string;
  finished: boolean;
  rounds: number | null;
  // Offbeat's day's number of questions, for "Question 2 of 3"; null on Fragments' board.
  questions: number | null;
  games: BoardGame[];
  reactionsOnMine: Reactions | null;
  friends: BoardFriend[];
};

type Row = { user_id: string; username: string; name: string; status: RunStatus | null; answered: number | null; favourite: boolean };

export async function getBoard(db: Db, viewerId: string, game: BoardGame): Promise<Board> {
  const { rows: today } = await db.query<{ date: string; content: ClockPuzzle | SubstringDay | null; games: BoardGame[] }>(
    `select private.today()::text as date,
            (select content from private.puzzle where game_id = $1 and puzzle_date = private.today()) as content,
            array(select p.game_id from private.puzzle p where p.puzzle_date = private.today() and p.game_id = any($2::text[])
                  order by array_position($2::text[], p.game_id)) as games`,
    [game, [GAME_ID, SUBSTRINGS_ID]],
  );
  const { date, content, games } = today[0];
  // Offbeat's board with a day to play: every day of Offbeat is on a clock.
  const offbeat = game === GAME_ID && content !== null;
  // The viewer and each friend, with today's run status if they started one, and the viewer's own star on them (M24 24c).
  const { rows } = await db.query<Row>(
    `with people as (${circleSql("$1")})
     select p.user_id, pr.username::text as username, coalesce(pr.display_name, pr.username::text) as name, s.status, s.answered,
            coalesce(case when f.user_a = $1 then f.favourite_of_a else f.favourite_of_b end, false) as favourite
     from people p
     join private.profile pr on pr.user_id = p.user_id
     left join private.friendship f on f.user_a = least($1::uuid, p.user_id) and f.user_b = greatest($1::uuid, p.user_id)
     left join private.run_status s on s.user_id = p.user_id and s.game_id = $2 and s.puzzle_date = $3::date`,
    [viewerId, game, date],
  );
  const viewer = rows.find((r) => r.user_id === viewerId);
  const finished = viewer?.status != null && FINISHED.includes(viewer.status);
  const friends = rows.filter((r) => r.user_id !== viewerId);

  // Offbeat shows each run's points as it goes: the sum of its answers' points, never the answers.
  const points = new Map<string, number>();
  if (offbeat) {
    const { rows: sums } = await db.query<{ user_id: string; points: number }>(
      `select user_id, sum(points)::int as points from private.clock_answer
       where game_id = $1 and puzzle_date = $2::date and user_id = any($3::uuid[]) group by user_id`,
      [GAME_ID, date, rows.map((r) => r.user_id)],
    );
    for (const s of sums) points.set(s.user_id, s.points);
  }
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
    questions: offbeat ? (content as ClockPuzzle).questions.length : null,
    games,
    reactionsOnMine: finished ? (reactions.get(viewerId) ?? NO_REACTIONS) : null,
    // The viewer's favourites first, then the rest, each part by name (M24 24c, answer 19). The star itself isn't sent:
    // the card only orders by it.
    friends: friends
      .toSorted((a, b) => Number(b.favourite) - Number(a.favourite) || a.name.localeCompare(b.name) || a.username.localeCompare(b.username))
      .map((f): BoardFriend => {
        const state =
          f.status === null ? "not_started" : !finished && !offbeat ? "started" : FINISHED.includes(f.status) ? "finished" : "playing";
        return {
          userId: f.user_id,
          username: f.username,
          name: f.name,
          state,
          question: state === "playing" ? f.answered! + 1 : null,
          score: state === "finished" && game === SUBSTRINGS_ID ? scores.get(`${f.user_id}:${date}`)! : null,
          ...(offbeat ? { points: state === "not_started" ? null : (points.get(f.user_id) ?? 0) } : {}),
          reactions: finished && state !== "not_started" ? (reactions.get(f.user_id) ?? NO_REACTIONS) : null,
        };
      }),
  };
}

