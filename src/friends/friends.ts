// Invite links and friends (docs/milestones/M07-friends-and-live-board.md, 7b). The database keeps the rules: one
// code per player, one row per pair with the smaller user ID first, no friendship with yourself.
import { randomBytes } from "node:crypto";
import { DatabaseError } from "pg";
import { INVITE_CODE_BYTES } from "@/config/tunables";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { circleSql } from "./circle";
import { INVITE_CODE } from "./invite-code";

// A player as the API gives them: the username, which identifies them (removing a friend names it), and the name
// shown, which is the display name if set, else the username (M07 7a).
export type Friend = { username: string; name: string };

export function newInviteCode(): string {
  return randomBytes(INVITE_CODE_BYTES).toString("base64url");
}

// A code from a link or a request body. Anything that can't be a code is the same 404 as an unknown one, so the
// database is never asked about it.
export function readInviteCode(input: unknown): string {
  if (typeof input !== "string" || !INVITE_CODE.test(input)) throw new AppError("invite_invalid", 404);
  return input;
}

export async function getInviteCode(db: Db, userId: string): Promise<string | null> {
  const { rows } = await db.query<{ code: string }>("select code from private.friend_invite where user_id = $1", [userId]);
  return rows[0]?.code ?? null;
}

// Returns the player's code, making one the first time. Reset replaces it, so the old link stops working.
export async function issueInviteCode(db: Db, userId: string, reset: boolean): Promise<string> {
  const code = newInviteCode();
  const { rows } = await db.query<{ code: string }>(
    reset
      ? `insert into private.friend_invite (user_id, code) values ($1, $2)
         on conflict (user_id) do update set code = excluded.code returning code`
      : `insert into private.friend_invite (user_id, code) values ($1, $2)
         on conflict (user_id) do update set code = private.friend_invite.code returning code`,
    [userId, code],
  );
  return rows[0].code;
}

// Who a code belongs to, as a friend would see them.
export async function findInviter(db: Db, code: string): Promise<Friend & { userId: string }> {
  const { rows } = await db.query<Friend & { userId: string }>(
    `select i.user_id as "userId", p.username, coalesce(p.display_name, p.username::text) as name
     from private.friend_invite i join private.profile p using (user_id) where i.code = $1`,
    [code],
  );
  if (!rows[0]) throw new AppError("invite_invalid", 404);
  return rows[0];
}

// Makes the signed-in player and the code's owner friends, both ways at once (one row per pair).
export async function addFriend(db: Db, userId: string, code: string): Promise<Friend> {
  const { userId: inviterId, username, name } = await findInviter(db, code);
  if (inviterId === userId) throw new AppError("invite_own", 409);
  try {
    await db.query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [
      userId,
      inviterId,
    ]);
  } catch (err) {
    if (err instanceof DatabaseError && err.code === "23505" && err.constraint === "friendship_pkey") {
      throw new AppError("already_friends", 409);
    }
    throw err;
  }
  return { username, name };
}

// Ends a friendship both ways (D4).
export async function removeFriend(db: Db, userId: string, friendUsername: string): Promise<void> {
  const { rowCount } = await db.query(
    `delete from private.friendship f using private.profile p
     where p.username = $2 and f.user_a = least($1::uuid, p.user_id) and f.user_b = greatest($1::uuid, p.user_id)`,
    [userId, friendUsername],
  );
  if (rowCount === 0) throw new AppError("not_friends", 404);
}

export async function listFriends(db: Db, userId: string): Promise<Friend[]> {
  const { rows } = await db.query<Friend>(
    `select p.username, coalesce(p.display_name, p.username::text) as name
     from (${circleSql("$1")}) c
     join private.profile p on p.user_id = c.user_id
     where c.user_id <> $1
     order by lower(coalesce(p.display_name, p.username::text)), p.username`,
    [userId],
  );
  return rows;
}
