// The home page's feed (docs/milestones/M11-home-screen.md, 11b; H2 (a), H3 (a)): today's comments from the friends
// thread and from every group the viewer is in, in one list, oldest first, each labelled with its thread. The rules
// are each thread's own (M08; M10 G4): who sees a comment is seesCommentSql, a comment the viewer reported stays hidden
// from them, and posting goes to the friends thread. Until the viewer's run today is over, the feed shows who commented
// and how many reactions there are, never the text: the comment bodies aren't read at all then, so they can't reach
// the page.
import { GAME_ID } from "@/content/puzzle";
import { friendsSql, seesCommentSql } from "@/friends/circle";
import { FINISHED, type RunStatus } from "@/game/runs";
import type { Db } from "@/lib/db";
import { NO_REACTIONS, commentReactions } from "@/reactions/reactions";
import { toComment, type Comment, type CommentRow } from "./comments";

// group: the group whose thread the comment is in, or null for the friends thread.
export type FeedComment = Comment & { group: { id: string; name: string } | null };

// Before the viewer's run is over: the friends who commented, by name and in the order they first did (the live board
// already shows friends finishing, M07); how many others did, so group members who aren't friends aren't named (G3);
// and how many reactions the viewer could see on those comments.
export type FeedPreview = { friends: string[]; others: number; reactions: number };

// comments is null, and preview set, until the viewer's run today is over. canPost: the viewer may post to the friends
// thread, which is when the run is over.
export type Feed = { date: string; canPost: boolean; comments: FeedComment[] | null; preview: FeedPreview | null };

// Today's comments the viewer may see, from every thread, oldest first, with their authors and groups.
const VISIBLE = `from private.comment c
     join private.profile p on p.user_id = c.user_id
     left join private.player_group g on g.id = c.group_id
     where c.game_id = $2 and c.puzzle_date = $3::date and ${seesCommentSql("$1", "c")}
       and not exists (select from private.comment_report r where r.comment_id = c.id and r.reporter_id = $1)
     order by c.created_at, c.id`;

export async function getFeed(db: Db, viewerId: string): Promise<Feed> {
  const { rows: day } = await db.query<{ date: string; status: RunStatus | null }>(
    `select private.today()::text as date,
            (select status from private.run_status where user_id = $1 and game_id = $2 and puzzle_date = private.today()) as status`,
    [viewerId, GAME_ID],
  );
  const { date, status } = day[0];
  if (status === null || !FINISHED.includes(status)) {
    const { rows } = await db.query<{ id: string; user_id: string; name: string; friend: boolean }>(
      `select c.id::text as id, c.user_id::text as user_id, coalesce(p.display_name, p.username::text) as name,
              ${friendsSql("$1", "c.user_id")} as friend
       ${VISIBLE}`,
      [viewerId, GAME_ID, date],
    );
    const friends = new Map<string, string>();
    const others = new Set<string>();
    for (const r of rows) {
      if (r.friend) friends.set(r.user_id, r.name);
      else others.add(r.user_id);
    }
    const reactions = await commentReactions(
      db,
      viewerId,
      rows.map((r) => r.id),
    );
    let total = 0;
    for (const r of reactions.values()) for (const c of r.counts) total += c.count;
    return { date, canPost: false, comments: null, preview: { friends: [...friends.values()], others: others.size, reactions: total } };
  }

  const { rows } = await db.query<CommentRow & { group_id: string | null; group_name: string | null }>(
    `select c.id::text as id, p.username::text as username, coalesce(p.display_name, p.username::text) as name, c.body, c.created_at,
            g.id::text as group_id, g.name as group_name
     ${VISIBLE}`,
    [viewerId, GAME_ID, date],
  );
  const reactions = await commentReactions(
    db,
    viewerId,
    rows.map((r) => r.id),
  );
  return {
    date,
    canPost: true,
    comments: rows.map((r) => ({
      ...toComment(r, reactions.get(r.id) ?? NO_REACTIONS),
      group: r.group_id === null ? null : { id: r.group_id, name: r.group_name! },
    })),
    preview: null,
  };
}
