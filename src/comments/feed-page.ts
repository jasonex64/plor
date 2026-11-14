// The endless feed's data (docs/milestones/M16-16f-the-shared-pieces.md, 16f-4; the human's answers 9 to 15, 21, 22, 30,
// 44 and 45): comments and finished runs of both games in one list, newest first, a page at a time from today back
// through earlier days. Comments are what getFeed lists (the friends thread's and each of the viewer's groups', the
// reports filter, seesCommentSql); results are the viewer's own finished runs and their friends'. Today's results of a
// game the viewer hasn't finished come with the name, the game and the time and nothing of the run, not even a reaction
// (the board withholds both too, src/friends/board.ts); comments come whole (answer 21); earlier days never blur.
// Not called by a screen yet: 16f-5 switches Today to this and removes getFeed with its route, /api/feed.
import { FEED_PAGE_SIZE } from "@/config/tunables";
import { blockedSql, circleSql, seesCommentSql } from "@/friends/circle";
import { ended, type Ended } from "@/friends/board";
import { runTotals } from "@/game/substring-places";
import { thingNames } from "@/game/payload";
import { FINISHED } from "@/game/status";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { GAME_ID, SUBSTRINGS_ID } from "@/platform/game";
import { NO_REACTIONS, commentReactions, runReactions, type Reactions } from "@/reactions/reactions";
import type { BoardGame } from "@/friends/leaderboard";

// The item's own part, whatever its kind. at is when it happened, as the cursor holds it; date is its puzzle day, for
// the date lines. mine: the viewer's own.
type Base = { game: BoardGame; date: string; at: string; username: string; name: string; mine: boolean };

export type FeedCommentItem = Base & {
  kind: "comment";
  id: string;
  body: string;
  // The group whose thread the comment is in, or null for the friends thread.
  group: { id: string; name: string } | null;
  reactions: Reactions;
};

// userId is what a reaction on the run names (M19 19e); results are only the viewer's own and friends'.
type ResultBase = Base & { kind: "result"; userId: string };
export type FeedResultItem =
  | (ResultBase & { game: typeof GAME_ID; blurred: false; ended: Ended; reactions: Reactions })
  | (ResultBase & { game: typeof SUBSTRINGS_ID; blurred: false; score: number; reactions: Reactions })
  | (ResultBase & { blurred: true });

export type FeedItem = FeedCommentItem | FeedResultItem;

// next is the cursor for the page after this one, or null when there is none. The client holds it as it is.
export type FeedPage = { items: FeedItem[]; next: string | null };

// Where a page starts: after the item with this time, kind and tie, in the feed's order. kind and tie are what keep two
// items with one time apart: a comment is 0 and its tie its ID, a result is 1 and its tie its game, player and day.
type Cursor = { at: string; kind: 0 | 1; tie: string };

const AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify([c.at, c.kind, c.tie])).toString("base64url");
}

// The cursor as the client sent it back; anything else is refused before the database.
export function readFeedCursor(input: string | null): Cursor | null {
  if (input === null) return null;
  let parts: unknown;
  try {
    parts = JSON.parse(Buffer.from(input, "base64url").toString("utf8"));
  } catch {
    throw new AppError("bad_request", 400, "cursor");
  }
  if (!Array.isArray(parts) || parts.length !== 3) throw new AppError("bad_request", 400, "cursor");
  const [at, kind, tie] = parts;
  if (typeof at !== "string" || !AT.test(at) || Number.isNaN(Date.parse(at))) throw new AppError("bad_request", 400, "cursor");
  if (kind !== 0 && kind !== 1) throw new AppError("bad_request", 400, "cursor");
  if (typeof tie !== "string" || tie.length === 0 || tie.length > 100 || tie.includes("\0")) throw new AppError("bad_request", 400, "cursor");
  return { at, kind, tie };
}

type Row = {
  kind: 0 | 1;
  tie: string;
  game: BoardGame;
  date: string;
  at: string;
  user_id: string;
  username: string;
  name: string;
  mine: boolean;
  comment_id: string | null;
  body: string | null;
  group_id: string | null;
  group_name: string | null;
  status: "died" | "survived" | "timed_out" | null;
  answered: number | null;
  blurred: boolean;
};

// One page, in a single statement so the database decides where it ends. $1 viewer, $2 the finished statuses, $3 to $5
// the cursor (all null for the first page), $6 how many rows to read: one more than a page, to know whether another
// exists. The day bound beside each branch is only to skip what can't come before the cursor: an item happens on or
// after the start of its puzzle day, so its day is no later than the cursor's.
//
// When a result is at: a game 1 run ended by its last answer, so at that answer's time (a catch, or the 7th question);
// by its clock, so at the deadline the status view reads (nothing is written when time runs out, M19 19f: the deadline
// is the question's open time plus its 20 seconds, which doesn't change). A game 2 run is finished when its last round
// is done, so at that round's word, or at that round's deadline when it had none.
const PAGE_SQL = `
  select i.kind, i.tie, i.game_id as game, i.puzzle_date::text as date,
         to_char(i.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as at,
         i.user_id::text as user_id, i.username, i.name, i.user_id = $1::uuid as mine,
         i.comment_id, i.body, i.group_id, i.group_name, i.status, i.answered, i.blurred
  from (
    select 0 as kind, lpad(c.id::text, 19, '0') as tie, c.game_id, c.puzzle_date, c.created_at as at, c.user_id,
           p.username::text as username, coalesce(p.display_name, p.username::text) as name,
           c.id::text as comment_id, c.body, g.id::text as group_id, g.name as group_name,
           null::text as status, null::int as answered, false as blurred
    from private.comment c
    join private.profile p on p.user_id = c.user_id
    left join private.player_group g on g.id = c.group_id
    where ${seesCommentSql("$1", "c")}
      and not exists (select from private.comment_report r where r.comment_id = c.id and r.reporter_id = $1)
      and ($3::timestamptz is null or c.puzzle_date <= private.day_of($3::timestamptz))
    union all
    select 1, s.game_id || ':' || s.user_id::text || ':' || s.puzzle_date::text, s.game_id, s.puzzle_date, t.at, s.user_id,
           p.username::text, coalesce(p.display_name, p.username::text),
           null, null, null, null, s.status, s.answered,
           s.puzzle_date = private.today() and not exists (
             select from private.run_status v
             where v.user_id = $1 and v.game_id = s.game_id and v.puzzle_date = s.puzzle_date and v.status = any($2::text[]))
    from private.run_status s
    join private.profile p on p.user_id = s.user_id
    cross join lateral (
      select case
        when s.game_id = '${SUBSTRINGS_ID}' then coalesce(
          (select w.created_at from private.round_word w
           where w.user_id = s.user_id and w.game_id = s.game_id and w.puzzle_date = s.puzzle_date and w.round_idx = s.questions - 1),
          private.question_deadline(private.question_started_at(s.user_id, s.game_id, s.puzzle_date, s.questions - 1)))
        when s.status = 'timed_out' then s.deadline
        else (select max(e.created_at) from private.run_event e
              where e.user_id = s.user_id and e.game_id = s.game_id and e.puzzle_date = s.puzzle_date)
      end as at
    ) t
    where s.user_id = any(array(select x.user_id from (${circleSql("$1")}) x))
      and s.status = any($2::text[])
      and not ${blockedSql("$1", "s.user_id")}
      and ($3::timestamptz is null or s.puzzle_date <= private.day_of($3::timestamptz))
  ) i
  where $3::timestamptz is null or (i.at, i.kind, i.tie) < ($3::timestamptz, $4::int, $5::text)
  order by i.at desc, i.kind desc, i.tie desc
  limit $6`;

export async function getFeedPage(db: Db, viewerId: string, cursor: Cursor | null): Promise<FeedPage> {
  const { rows: read } = await db.query<Row>(PAGE_SQL, [viewerId, FINISHED, cursor?.at ?? null, cursor?.kind ?? null, cursor?.tie ?? null, FEED_PAGE_SIZE + 1]);
  const rows = read.slice(0, FEED_PAGE_SIZE);
  const last = rows.at(-1);
  const next = read.length > FEED_PAGE_SIZE ? encodeCursor({ at: last!.at, kind: last!.kind, tie: last!.tie }) : null;

  // Everything below is read only for what the page shows: a blurred result's run is never looked at.
  const whole = rows.filter((r) => r.kind === 1 && !r.blurred);
  const wholeOf = (game: BoardGame) => whole.filter((r) => r.game === game);

  const commentReacts = await commentReactions(
    db,
    viewerId,
    rows.flatMap((r) => (r.comment_id === null ? [] : [r.comment_id])),
  );

  // A caught player's matched answer, for Offbeat's "caught" result.
  const offbeat = wholeOf(GAME_ID);
  const caught = new Map<string, { question_idx: number; entry_id: string }>();
  if (offbeat.length > 0) {
    const { rows: events } = await db.query<{ key: string; question_idx: number; entry_id: string }>(
      `select e.user_id::text || ':' || e.puzzle_date::text as key, e.question_idx, e.entry_id from private.run_event e
       where e.game_id = $1 and e.matched and (e.user_id, e.puzzle_date) in (select * from unnest($2::uuid[], $3::date[]))`,
      [GAME_ID, offbeat.map((r) => r.user_id), offbeat.map((r) => r.date)],
    );
    for (const e of events) caught.set(e.key, e);
  }
  const names = await thingNames(db, [...caught.values()].map((e) => e.entry_id));

  const fragments = wholeOf(SUBSTRINGS_ID);
  const scores = fragments.length === 0 ? new Map<string, number>() : await runTotals(db, fragments.map((r) => r.user_id), fragments.map((r) => r.date));

  // Reactions on runs come by game and day.
  const runReacts = new Map<string, Reactions>();
  const days = new Map<string, { game: BoardGame; date: string; userIds: string[] }>();
  for (const r of whole) {
    const day = days.get(`${r.game}:${r.date}`) ?? { game: r.game, date: r.date, userIds: [] };
    day.userIds.push(r.user_id);
    days.set(`${r.game}:${r.date}`, day);
  }
  for (const d of days.values()) {
    for (const [userId, reactions] of await runReactions(db, viewerId, d.game, d.date, d.userIds)) runReacts.set(`${d.game}:${d.date}:${userId}`, reactions);
  }
  const reactionsOf = (r: Row): Reactions => runReacts.get(`${r.game}:${r.date}:${r.user_id}`) ?? NO_REACTIONS;

  const items = rows.map((r): FeedItem => {
    const base = { game: r.game, date: r.date, at: r.at, username: r.username, name: r.name, mine: r.mine };
    if (r.kind === 0) {
      return {
        ...base,
        kind: "comment",
        id: r.comment_id!,
        body: r.body!,
        group: r.group_id === null ? null : { id: r.group_id, name: r.group_name! },
        reactions: commentReacts.get(r.comment_id!) ?? NO_REACTIONS,
      };
    }
    const result = { ...base, kind: "result" as const, userId: r.user_id };
    if (r.blurred) return { ...result, blurred: true };
    if (r.game === SUBSTRINGS_ID) return { ...result, game: SUBSTRINGS_ID, blurred: false, score: scores.get(`${r.user_id}:${r.date}`)!, reactions: reactionsOf(r) };
    return { ...result, game: GAME_ID, blurred: false, ended: ended(r, caught.get(`${r.user_id}:${r.date}`), names), reactions: reactionsOf(r) };
  });
  return { items, next };
}
