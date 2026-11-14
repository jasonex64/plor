// Friend requests and blocks (docs/milestones/M17-profiles-and-friend-requests.md, "17a design"). A request is a
// pending row: accepting, declining or cancelling deletes it. The database keeps one request per pair, none to
// oneself, and no friendship while either player has blocked the other (OB016); who is told what is decided here,
// so that a blocked player can't tell a block from no answer (answers 13 and 28).
import type { Pool, PoolClient } from "pg";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { log } from "@/lib/log";
import { blockedSql, friendsSql } from "./circle";
import type { Friend } from "./friends";

// The username a route's body names. Anything that isn't text gets 400.
export function readUsername(input: unknown): string {
  if (typeof input !== "string" || input.includes("\0")) throw new AppError("bad_request", 400, "username");
  return input;
}

// Runs one change between the signed-in player and the player a username names, in one transaction that first locks
// both profiles, in user ID order so two such transactions can't deadlock on the pair. Every change to a pair waits
// its turn, so a block and an accept, or two crossing sends, can't interleave (the ticket, "Races"; PostgreSQL 17,
// 13.3.2 Row-Level Locks: FOR NO KEY UPDATE blocks another FOR NO KEY UPDATE of the row). `own` is thrown when the
// username is the player's own, `unknown` when nobody has it.
async function withPair<T>(
  pool: Pool,
  userId: string,
  username: string,
  refuse: { own: AppError; unknown: AppError },
  change: (client: PoolClient, them: string) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let broken = false;
  try {
    await client.query("begin");
    const { rows } = await client.query<{ user_id: string; named: boolean }>(
      `select user_id, username = $2 as named from private.profile
       where user_id = $1 or username = $2 order by user_id for no key update`,
      [userId, username],
    );
    const me = rows.find((r) => r.user_id === userId);
    if (!me) throw new AppError("no_profile", 409);
    if (me.named) throw refuse.own;
    const them = rows.find((r) => r.user_id !== userId);
    if (!them) throw refuse.unknown;
    const result = await change(client, them.user_id);
    await client.query("commit");
    return result;
  } catch (err) {
    // As in setReaction (src/reactions/reactions.ts): a rollback that fails too leaves the connection in an unknown
    // state, so it's logged and the client destroyed, and the original error is the one thrown.
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

// A request named by a username nobody has, or by the player's own, is the same 404 as one that isn't there.
const requestNotFound = () => ({ own: new AppError("request_not_found", 404), unknown: new AppError("request_not_found", 404) });

// Both ways at once: one row per pair, the smaller user ID first (M07 7b). Already friends changes nothing.
const BEFRIEND = `insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))
                  on conflict do nothing`;

// Sends a request, or, when the other player's request is already waiting, accepts it (answer 23). A repeat send is
// the same "sent". A player who has blocked the sender gets nothing and the sender is told the same "sent" (13): the
// row is stored and the blocker's reads leave it out.
export async function sendRequest(pool: Pool, userId: string, username: string): Promise<"sent" | "friends"> {
  const refuse = { own: new AppError("request_own", 409), unknown: new AppError("player_not_found", 404) };
  return withPair(pool, userId, username, refuse, async (client, them) => {
    const { rows } = await client.query<{ blocking: boolean; friends: boolean }>(
      `select exists (select from private.block k where k.blocker = $1 and k.blocked = $2) as blocking,
              ${friendsSql("$1", "$2::uuid")} as friends`,
      [userId, them],
    );
    // The blocker knows they blocked, so this tells them nothing new (answer 29).
    if (rows[0].blocking) throw new AppError("unblock_first", 409);
    if (rows[0].friends) throw new AppError("already_friends", 409);
    // Their request can't be one I hid (I have no block on them, above) nor from a player who blocked me (a block
    // deletes the blocker's own request, D3), so the friendship below never meets OB016.
    const { rowCount } = await client.query("delete from private.friend_request where sender = $2 and receiver = $1", [userId, them]);
    if (rowCount) {
      await client.query(BEFRIEND, [userId, them]);
      return "friends";
    }
    await client.query("insert into private.friend_request (sender, receiver) values ($1, $2) on conflict do nothing", [userId, them]);
    return "sent";
  });
}

// Takes a request to me that I can see: one from a player I've blocked is neither accepted nor declined, or it would
// leave the blocked sender's sent list (answer 28).
const TAKE_RECEIVED = `delete from private.friend_request r where r.sender = $2 and r.receiver = $1 and not ${blockedSql("$1", "r.sender")}`;

export async function acceptRequest(pool: Pool, userId: string, username: string): Promise<void> {
  await withPair(pool, userId, username, requestNotFound(), async (client, them) => {
    const { rowCount } = await client.query(TAKE_RECEIVED, [userId, them]);
    if (!rowCount) throw new AppError("request_not_found", 404);
    await client.query(BEFRIEND, [userId, them]);
  });
}

// The sender isn't told: the request just leaves their sent list, and they may send again at once (answers 17, 23).
export async function declineRequest(pool: Pool, userId: string, username: string): Promise<void> {
  await withPair(pool, userId, username, requestNotFound(), async (client, them) => {
    const { rowCount } = await client.query(TAKE_RECEIVED, [userId, them]);
    if (!rowCount) throw new AppError("request_not_found", 404);
  });
}

export async function cancelRequest(pool: Pool, userId: string, username: string): Promise<void> {
  await withPair(pool, userId, username, requestNotFound(), async (client, them) => {
    const { rowCount } = await client.query("delete from private.friend_request where sender = $1 and receiver = $2", [userId, them]);
    if (!rowCount) throw new AppError("request_not_found", 404);
  });
}

// Blocks a player; blocking again changes nothing. The database ends the pair's friendship and deletes my request to
// them (private.block_ends_friendship); their request to me stays, hidden. "Decline and block" is this alone: a
// decline would take the request out of the sender's sent list (answers 5, 20, 28).
export async function blockPlayer(pool: Pool, userId: string, username: string): Promise<void> {
  const refuse = { own: new AppError("block_own", 409), unknown: new AppError("player_not_found", 404) };
  await withPair(pool, userId, username, refuse, async (client, them) => {
    await client.query("insert into private.block (blocker, blocked) values ($1, $2) on conflict do nothing", [userId, them]);
  });
}

// Lifts my block of a player. It restores no friendship and no request (answer 21, D2).
export async function unblockPlayer(pool: Pool, userId: string, username: string): Promise<void> {
  const refuse = { own: new AppError("not_blocked", 404), unknown: new AppError("not_blocked", 404) };
  await withPair(pool, userId, username, refuse, async (client, them) => {
    const { rows } = await client.query<{ lifted: boolean }>("select private.unblock($1, $2) as lifted", [userId, them]);
    if (!rows[0].lifted) throw new AppError("not_blocked", 404);
  });
}

// Players as the friends list gives them, and in its order (src/friends/friends.ts, listFriends). `source` is SQL
// giving one user_id per row for the player $1.
async function listPlayers(db: Db, userId: string, source: string): Promise<Friend[]> {
  const { rows } = await db.query<Friend>(
    `select p.username, coalesce(p.display_name, p.username::text) as name
     from (${source}) s
     join private.profile p on p.user_id = s.user_id
     order by lower(coalesce(p.display_name, p.username::text)), p.username`,
    [userId],
  );
  return rows;
}

// Requests waiting for my answer, without those from players I've blocked (answer 29).
const RECEIVED = `select r.sender as user_id from private.friend_request r where r.receiver = $1 and not ${blockedSql("$1", "r.sender")}`;

export function listReceived(db: Db, userId: string): Promise<Friend[]> {
  return listPlayers(db, userId, RECEIVED);
}

// The Friends tab's count (answer 14): received only, the same rows as listReceived.
export async function countReceived(db: Db, userId: string): Promise<number> {
  const { rows } = await db.query<{ count: number }>(`select count(*)::int as count from (${RECEIVED}) s`, [userId]);
  return rows[0].count;
}

// Every request I sent that hasn't been answered, one to a player who blocked me included, for ever (answer 28).
export function listSent(db: Db, userId: string): Promise<Friend[]> {
  return listPlayers(db, userId, "select r.receiver as user_id from private.friend_request r where r.sender = $1");
}

export function listBlocked(db: Db, userId: string): Promise<Friend[]> {
  return listPlayers(db, userId, "select k.blocked as user_id from private.block k where k.blocker = $1");
}
