// Reactions on comments and on friends' runs (docs/milestones/M08-comments-and-reactions.md, 8b; D2, D3): one per
// player per target, from a fixed set. Like comments, a player reacts only on today, once their own run is over (D6),
// and sees only their own reactions and their friends', or on a group's comment its members' (M10 10d, G4).
import type { Pool } from "pg";
import { REACTIONS } from "@/config/tunables";
import { GAME_ID } from "@/platform/game";
import { friendsSql, seesAuthorSql, seesCommentReactionSql, seesCommentSql } from "@/friends/circle";
import { readCommentId } from "@/comments/comments";
import { FINISHED } from "@/game/status";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { log } from "@/lib/log";

export type Emoji = (typeof REACTIONS)[number];

// What the viewer sees on one target: how many of each emoji, in the set's order and only those used, and their own.
export type Reactions = { counts: { emoji: Emoji; count: number }[]; mine: Emoji | null };

// A comment by its ID, or a friend's run that day by their username.
export type Target = { type: "comment"; id: string } | { type: "run"; username: string };

export const NO_REACTIONS: Reactions = { counts: [], mine: null };

// null removes the player's reaction; the page sends it when they tap the one they already chose.
export function readEmoji(input: unknown): Emoji | null {
  if (input === null) return null;
  if (!REACTIONS.includes(input as Emoji)) throw new AppError("bad_request", 400, "emoji");
  return input as Emoji;
}

export function readTarget(input: unknown): Target {
  if (typeof input === "object" && input !== null) {
    const t = input as Record<string, unknown>;
    if (t.type === "comment") return { type: "comment", id: readCommentId(t.id) };
    if (t.type === "run" && typeof t.username === "string") return { type: "run", username: t.username };
  }
  throw new AppError("bad_request", 400, "target");
}

// Sets the player's reaction on a target, replacing any other they had there, or removes it (emoji null). The page
// names the day it shows, as when posting a comment. One transaction, because plor_app can't update a reaction: a
// replace deletes the old one and inserts the new one.
export async function setReaction(pool: Pool, userId: string, date: string, target: Target, emoji: Emoji | null): Promise<void> {
  const client = await pool.connect();
  let broken = false;
  try {
    await client.query("begin");
    // The day, the finished run and the target are checked in the statement that deletes, so midnight can't fall
    // between a check and the delete. The target is a comment the player can see (their own or a friend's, or one in a
    // group they're in) or the run of a friend, on that day.
    const { rows } = await client.query<{
      today: string;
      past: boolean;
      finished: boolean;
      comment_id: string | null;
      run_user_id: string | null;
      played: boolean | null;
    }>(
      `with day as (
         select private.today() as today,
                (select status from private.run_status where user_id = $1 and game_id = $2 and puzzle_date = private.today()) as status
       ), target as (
         select c.id as comment_id, null::uuid as run_user_id, true as played
         from private.comment c
         where c.id = $4::bigint and c.game_id = $2 and c.puzzle_date = $3::date and ${seesCommentSql("$1", "c")}
         union all
         select null, p.user_id,
                exists (select from private.run r where r.user_id = p.user_id and r.game_id = $2 and r.puzzle_date = $3::date)
         from private.profile p
         where p.username = $5 and ${friendsSql("$1", "p.user_id")}
       ), removed as (
         delete from private.reaction r using day, target t
         where day.today = $3::date and day.status = any($6::text[]) and t.played
           and r.user_id = $1 and r.game_id = $2 and r.puzzle_date = $3::date
           and (r.comment_id = t.comment_id or r.run_user_id = t.run_user_id)
       )
       select day.today::text as today, $3::date < day.today as past, coalesce(day.status = any($6::text[]), false) as finished,
              t.comment_id::text as comment_id, t.run_user_id, t.played
       from day left join target t on true`,
      [userId, GAME_ID, date, target.type === "comment" ? target.id : null, target.type === "run" ? target.username : null, FINISHED],
    );
    const row = rows[0];
    if (row.past) throw new AppError("day_past", 409);
    if (date !== row.today) throw new AppError("bad_request", 400, "date");
    if (!row.finished) throw new AppError("not_finished", 409);
    // Someone else's comment the player can't see is the same 404 as a missing one, like deleting (8a).
    if (row.played === null) throw target.type === "comment" ? new AppError("comment_not_found", 404) : new AppError("not_friends", 404);
    if (!row.played) throw new AppError("run_not_found", 404);

    if (emoji !== null) {
      // Still today: midnight may have passed since the check above.
      const { rowCount } = await client.query(
        `insert into private.reaction (user_id, game_id, puzzle_date, comment_id, run_user_id, emoji)
         select $1, $2, $3::date, $4::bigint, $5::uuid, $6 where private.today() = $3::date`,
        [userId, GAME_ID, date, row.comment_id, row.run_user_id, emoji],
      );
      if (rowCount === 0) throw new AppError("day_past", 409);
    }
    await client.query("commit");
  } catch (err) {
    // A rollback that fails too leaves the connection in an unknown state: it's logged and the client destroyed rather
    // than returned to the pool (node-postgres, Pool: release(true)), and the original error is the one thrown.
    try {
      await client.query("rollback");
    } catch (rollbackErr) {
      broken = true;
      log.error("rollback failed", { error: String(rollbackErr) });
    }
    throw err;
  } finally {
    client.release(broken);
  }
}

type CountRow = { target: string; emoji: Emoji; count: number; mine: boolean };

// Reactions on each of these comments, by comment ID.
export async function commentReactions(db: Db, viewerId: string, commentIds: string[]): Promise<Map<string, Reactions>> {
  const { rows } = await db.query<CountRow>(
    `select r.comment_id::text as target, r.emoji, count(*)::int as count, bool_or(r.user_id = $1) as mine
     from private.reaction r join private.comment c on c.id = r.comment_id
     where r.comment_id = any($2::bigint[]) and ${seesCommentReactionSql("$1", "c", "r.user_id")}
     group by r.comment_id, r.emoji`,
    [viewerId, commentIds],
  );
  return summarize(rows);
}

// Reactions on each of these players' runs on a day, by user ID: only the viewer's own and their friends' count.
export async function runReactions(db: Db, viewerId: string, date: string, userIds: string[]): Promise<Map<string, Reactions>> {
  const { rows } = await db.query<CountRow>(
    `select r.run_user_id::text as target, r.emoji, count(*)::int as count, bool_or(r.user_id = $1) as mine
     from private.reaction r
     where r.run_user_id = any($4::uuid[]) and r.game_id = $2 and r.puzzle_date = $3::date and ${seesAuthorSql("$1", "r.user_id")}
     group by r.run_user_id, r.emoji`,
    [viewerId, GAME_ID, date, userIds],
  );
  return summarize(rows);
}

function summarize(rows: CountRow[]): Map<string, Reactions> {
  const byTarget = new Map<string, Reactions>();
  const sorted = rows.toSorted((x, y) => REACTIONS.indexOf(x.emoji) - REACTIONS.indexOf(y.emoji));
  for (const r of sorted) {
    const reactions = byTarget.get(r.target) ?? { counts: [], mine: null };
    reactions.counts.push({ emoji: r.emoji, count: r.count });
    if (r.mine) reactions.mine = r.emoji;
    byTarget.set(r.target, reactions);
  }
  return byTarget;
}
