// Comments on the day's game (docs/milestones/M08-comments-and-reactions.md, 8a): seen by the author and their
// friends; a day's thread only once the viewer's own run that day is over, since comments talk about answers; past
// days read-only, and shown even if the viewer never played them (D6). The length rule is the database's check (D1).
// A comment the viewer reported is hidden from them (8c, D5).
import { DatabaseError } from "pg";
import { GAME_ID } from "@/content/puzzle";
import type { RunStatus } from "@/game/runs";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { NO_REACTIONS, commentReactions, type Reactions } from "@/reactions/reactions";

// username identifies the author (the page offers Delete on the viewer's own); name is the display name if set,
// else the username (M07 7a). reactions are the viewer's own and their friends' (8b).
export type Comment = { id: string; username: string; name: string; body: string; createdAt: string; reactions: Reactions };

// comments is null while the thread is hidden from the viewer. canPost: the day is today and the viewer's run
// is over.
export type Thread = { date: string; canPost: boolean; comments: Comment[] | null };

const FINISHED: RunStatus[] = ["died", "survived", "timed_out"];

// The text as sent by the browser, trimmed, the form the database requires. Anything that isn't text gets 400.
export function readCommentBody(input: unknown): string {
  if (typeof input !== "string") throw new AppError("comment_invalid", 400);
  return input.trim();
}

// A comment ID as the API gives it: a bigint, written in decimal. Anything else is refused before the database.
export function readCommentId(input: unknown): string {
  if (typeof input !== "string" || !/^[1-9]\d{0,17}$/.test(input)) throw new AppError("bad_request", 400, "id");
  return input;
}

type Row = { id: string; username: string; name: string; body: string; created_at: Date };

// A day's thread, oldest first. date is a calendar date (the route checks it); none means today.
export async function getThread(db: Db, viewerId: string, date: string | null): Promise<Thread> {
  const { rows: day } = await db.query<{ date: string; today: boolean; future: boolean; status: RunStatus | null }>(
    `select d::text as date, d = private.today() as today, d > private.today() as future,
            (select status from private.run_status where user_id = $1 and game_id = $2 and puzzle_date = d) as status
     from (select coalesce($3::date, private.today()) as d) as day`,
    [viewerId, GAME_ID, date],
  );
  const { today, future, status } = day[0];
  if (future) throw new AppError("bad_request", 400, "date");
  const finished = status !== null && FINISHED.includes(status);
  // Today's thread waits for the viewer's run to end. So does a past day's while the viewer's run that day is still
  // going, since a run started before midnight can be played to its end after it (DECISIONS.md, Game 1, Timer); a
  // past day the viewer never played is shown (D6).
  if (today ? !finished : status !== null && !finished) return { date: day[0].date, canPost: false, comments: null };

  const { rows } = await db.query<Row>(
    `select c.id::text as id, p.username::text as username, coalesce(p.display_name, p.username::text) as name, c.body, c.created_at
     from private.comment c
     join private.profile p on p.user_id = c.user_id
     where c.game_id = $2 and c.puzzle_date = $3::date
       and (c.user_id = $1 or exists (
         select from private.friendship f where f.user_a = least($1::uuid, c.user_id) and f.user_b = greatest($1::uuid, c.user_id)))
       and not exists (select from private.comment_report r where r.comment_id = c.id and r.reporter_id = $1)
     order by c.created_at, c.id`,
    [viewerId, GAME_ID, day[0].date],
  );
  const reactions = await commentReactions(db, viewerId, rows.map((r) => r.id));
  return { date: day[0].date, canPost: today, comments: rows.map((r) => toComment(r, reactions.get(r.id) ?? NO_REACTIONS)) };
}

// Posts to today's thread. The page names the day it shows, so a page left open past midnight can't post to the
// new day by mistake. The day and the finished run are checked in the insert itself, so midnight can't slip between
// a check and the write.
export async function postComment(db: Db, userId: string, date: string, body: string): Promise<Comment> {
  let rows: (Row & { today: string; past: boolean })[];
  try {
    ({ rows } = await db.query<Row & { today: string; past: boolean }>(
      `with day as (
         select private.today() as today,
                (select status from private.run_status where user_id = $1 and game_id = $2 and puzzle_date = private.today()) as status
       ), added as (
         insert into private.comment (user_id, game_id, puzzle_date, body)
         select $1, $2, day.today, $4 from day where day.today = $3::date and day.status = any($5::text[])
         returning id, user_id, body, created_at
       )
       select day.today::text as today, $3::date < day.today as past, a.id::text as id, p.username::text as username,
              coalesce(p.display_name, p.username::text) as name, a.body, a.created_at
       from day
       left join added a on true
       left join private.profile p on p.user_id = a.user_id`,
      [userId, GAME_ID, date, body, FINISHED],
    ));
  } catch (err) {
    if (err instanceof DatabaseError && err.code === "23514" && err.constraint === "comment_body_format") {
      throw new AppError("comment_invalid", 400);
    }
    throw err;
  }
  const row = rows[0];
  if (row.id !== null) return toComment(row, NO_REACTIONS);
  if (row.past) throw new AppError("day_past", 409);
  if (date !== row.today) throw new AppError("bad_request", 400, "date");
  throw new AppError("not_finished", 409);
}

// Deletes the signed-in player's own comment, for everyone and for good (D4). Someone else's is the same 404 as a
// missing one.
export async function deleteComment(db: Db, userId: string, id: string): Promise<void> {
  const { rowCount } = await db.query("delete from private.comment where id = $1 and user_id = $2", [id, userId]);
  if (rowCount === 0) throw new AppError("comment_not_found", 404);
}

// Reports someone else's comment that the player can see now: a friend's, on a day whose thread is open to them (as
// in getThread). It's hidden from them at once, and listed for admins (D5). Reporting it again changes nothing.
// Reporting works on past days too: D6 makes them read-only for talking, and a report isn't talking.
export async function reportComment(db: Db, userId: string, id: string): Promise<void> {
  const { rows } = await db.query<{ own: boolean; visible: boolean }>(
    `with target as (
       select c.id, c.user_id = $1 as own,
              case when c.puzzle_date = private.today() then coalesce(s.status = any($3::text[]), false)
                   else s.status is null or s.status = any($3::text[]) end as visible
       from private.comment c
       left join private.run_status s on s.user_id = $1 and s.game_id = c.game_id and s.puzzle_date = c.puzzle_date
       where c.id = $2
         and (c.user_id = $1 or exists (
           select from private.friendship f where f.user_a = least($1::uuid, c.user_id) and f.user_b = greatest($1::uuid, c.user_id)))
     ), added as (
       insert into private.comment_report (comment_id, reporter_id)
       select id, $1 from target where not own and visible
       on conflict do nothing
     )
     select own, visible from target`,
    [userId, id, FINISHED],
  );
  // A comment the player can't see is the same 404 as a missing one, like deleting.
  if (!rows[0]?.visible) throw new AppError("comment_not_found", 404);
  if (rows[0].own) throw new AppError("report_own", 409);
}

function toComment(r: Row, reactions: Reactions): Comment {
  return { id: r.id, username: r.username, name: r.name, body: r.body, createdAt: r.created_at.toISOString(), reactions };
}
