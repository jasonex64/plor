// Friends (docs/milestones/M07-friends-and-live-board.md, 7b). The database keeps the rules: one row per pair with
// the smaller user ID first, no friendship with yourself. A friendship is made by an accepted friend request
// (src/friends/requests.ts); friend invite links ended in M17 17c, and the invite codes made and read here are groups'.
import { randomBytes } from "node:crypto";
import { INVITE_CODE_LENGTH } from "@/config/tunables";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { circleSql } from "./circle";
import { INVITE_CODE } from "./invite-code";

// A player as the API gives them: the username, and the name shown, which is the display name if set, else the
// username (M07 7a).
export type Friend = { username: string; name: string };
// A player whom the page acts on later: the ID is what the action names, as a username can change hands in between
// (M19 19e).
export type FriendWithId = Friend & { userId: string };

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// A player's ID from a request body, checked before the database is asked: a malformed one is a 400, not a database error.
export function readUserId(input: unknown): string {
  if (typeof input !== "string" || !UUID.test(input)) throw new AppError("bad_request", 400, "userId");
  return input;
}

// A fresh code: enough random bytes for INVITE_CODE_LENGTH base64url characters (6 bits each), written in base64url and
// cut to that length, so every character is random. The migration makes codes the same way
// (supabase/migrations/20261028140000_baseline.sql).
export function newInviteCode(): string {
  return randomBytes(Math.ceil((INVITE_CODE_LENGTH * 6) / 8)).toString("base64url").slice(0, INVITE_CODE_LENGTH);
}

// A code from a link or a request body. Anything that can't be a code is the same 404 as an unknown one, so the
// database is never asked about it.
export function readInviteCode(input: unknown): string {
  if (typeof input !== "string" || !INVITE_CODE.test(input)) throw new AppError("invite_invalid", 404);
  return input;
}

// Ends a friendship both ways (D4).
export async function removeFriend(db: Db, userId: string, friendId: string): Promise<void> {
  const { rowCount } = await db.query(
    "delete from private.friendship where user_a = least($1::uuid, $2::uuid) and user_b = greatest($1::uuid, $2::uuid)",
    [userId, friendId],
  );
  if (rowCount === 0) throw new AppError("not_friends", 404);
}

export async function listFriends(db: Db, userId: string): Promise<FriendWithId[]> {
  const { rows } = await db.query<FriendWithId>(
    `select p.user_id::text as "userId", p.username, coalesce(p.display_name, p.username::text) as name
     from (${circleSql("$1")}) c
     join private.profile p on p.user_id = c.user_id
     where c.user_id <> $1
     order by lower(coalesce(p.display_name, p.username::text)), p.username`,
    [userId],
  );
  return rows;
}
