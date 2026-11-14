// Another player's profile, which is also the search: looking a username up is opening its profile
// (docs/milestones/M17-profiles-and-friend-requests.md, "17b design", E1). The server picks the view and returns only
// that view's fields (Security change 2): a signed-in stranger sees the name, the totals and the game's card (answers
// 4, 11 and E7); a friend, and the player themself, also when they began, the month, the rarest answers and the last
// days (answers 2, 25 and E3). Nothing here names an answer of an open day: rarest reads closed days only, and the
// month and recent days are counts, which the live board already shows a friend who hasn't played.
import { getPlayerStats, type Me } from "@/game/me";
import type { Stats } from "@/game/offbeat";
import { takeAttempt } from "@/lib/auth-limits";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { friendsSql } from "./circle";
import type { Friend } from "./friends";


// How the viewer stands to the player: "sent", the viewer's request waits; "received", theirs does; "blocked", the
// viewer has blocked them. A player who has blocked the viewer has no profile at all for them (answers 13 and 24).
export type Relation = "self" | "friend" | "sent" | "received" | "blocked" | "none";

// userId goes only with the full profile: a stranger sees names only (DECISIONS, 2026-11-12, E7).
export type PlayerProfile = Friend & { relation: Relation } & Pick<Me, "totals" | "offbeat"> & Partial<Pick<Me, "since" | "month" | "rarest"> & { userId: string; recent: Stats["days"] }>;

// The username rules (profile_username_format, supabase/migrations/20261028140000_baseline.sql): a name outside them
// is nobody's, so the database isn't asked about it.
const USERNAME = /^[a-z0-9_]{3,20}$/;

// The profile a name opens for this viewer: a current username, or one its player gave up less than 30 days ago
// (answer 10). A name nobody has, and a player who has blocked the viewer, are the same 404. Every lookup counts
// against the viewer's 60 an hour, found or not, unless the name is their own or a friend's, which they already know
// exists (answer 15; E2).
export async function getPlayer(db: Db, viewerId: string, name: string): Promise<PlayerProfile> {
  const { rows } = await db.query<Friend & { user_id: string; self: boolean; friend: boolean; hidden: boolean; blocking: boolean; sent: boolean; received: boolean }>(
    `select p.user_id, p.username::text as username, coalesce(p.display_name, p.username::text) as name,
            p.user_id = $1::uuid as self,
            ${friendsSql("$1", "p.user_id")} as friend,
            exists (select from private.block k where k.blocker = p.user_id and k.blocked = $1::uuid) as hidden,
            exists (select from private.block k where k.blocker = $1::uuid and k.blocked = p.user_id) as blocking,
            exists (select from private.friend_request r where r.sender = $1::uuid and r.receiver = p.user_id) as sent,
            exists (select from private.friend_request r where r.sender = p.user_id and r.receiver = $1::uuid) as received
     from private.profile p
     where p.username = $2
        or p.user_id = (select h.user_id from private.held_username h where h.username = $2 and h.held_until > statement_timestamp())`,
    [viewerId, USERNAME.test(name) ? name : null],
  );
  const them = rows[0];
  if (!them?.self && !them?.friend) await takeAttempt(db, "lookup", viewerId);
  if (!them || them.hidden) throw new AppError("player_not_found", 404);
  const relation: Relation = them.self ? "self" : them.friend ? "friend" : them.blocking ? "blocked" : them.sent ? "sent" : them.received ? "received" : "none";
  const { me, recent } = await getPlayerStats(db, them.user_id);
  const short = { username: them.username, name: them.name, relation, totals: me.totals, offbeat: me.offbeat };
  if (relation !== "self" && relation !== "friend") return short;
  return { ...short, userId: them.user_id, since: me.since, month: me.month, rarest: me.rarest, recent };
}
