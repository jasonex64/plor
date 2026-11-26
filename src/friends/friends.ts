// Friends (docs/milestones/M07-friends-and-live-board.md, 7b). The database keeps the rules: one row per pair with
// the smaller user ID first, no friendship with yourself. A friendship is made by an accepted friend request
// (src/friends/requests.ts); friend invite links ended in M17 17c, and the invite codes made and read here are groups'.
import { randomBytes } from "node:crypto";
import { INVITE_CODE_LENGTH } from "@/config/tunables";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { circleSql } from "./circle";
import { INVITE_CODE } from "./invite-code";
import { STATUS } from "@/lib/status";

// A player as the API gives them: the username, and the name shown, which is the display name if set, else the
// username (M07 7a).
export type Friend = { username: string; name: string };
// A player whom the page acts on later: the ID is what the action names, as a username can change hands in between
// (M19 19e).
export type FriendWithId = Friend & { userId: string };
// A friend in the player's own list: favourite is the player's own star on them, which the friend never sees (M24 24a).
export type ListedFriend = FriendWithId & { favourite: boolean };

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// A player's ID from a request body, checked before the database is asked: a malformed one is a 400, not a database error.
export function readUserId(input: unknown): string {
  if (typeof input !== "string" || !UUID.test(input)) throw new AppError("bad_request", STATUS.badRequest, "userId");
  return input;
}

// A fresh code: enough random bytes for INVITE_CODE_LENGTH base64url characters (6 bits each), written in base64url and
// cut to that length, so every character is random. The migration makes codes the same way
// (supabase/migrations/20261028140000_baseline.sql).
export function newInviteCode(): string {
  return randomBytes(Math.ceil((INVITE_CODE_LENGTH * 6) / 8)).toString("base64url").slice(0, INVITE_CODE_LENGTH); // 6 bits a character from 8-bit bytes: https://www.rfc-editor.org/rfc/rfc4648.html 4, 5
}

// A code from a link or a request body. Anything that can't be a code is the same 404 as an unknown one, so the
// database is never asked about it.
export function readInviteCode(input: unknown): string {
  if (typeof input !== "string" || !INVITE_CODE.test(input)) throw new AppError("invite_invalid", STATUS.notFound);
  return input;
}

// Ends a friendship both ways (D4).
export async function removeFriend(db: Db, userId: string, friendId: string): Promise<void> {
  const { rowCount } = await db.query(
    "delete from private.friendship where user_a = least($1::uuid, $2::uuid) and user_b = greatest($1::uuid, $2::uuid)",
    [userId, friendId],
  );
  if (rowCount === 0) throw new AppError("not_friends", STATUS.notFound);
}

// Sets or clears the player's own star on a friend (M24 24a). The pair has one row with the smaller ID first, so the
// player's flag is favourite_of_a or favourite_of_b by which side they are; the friend's flag is left as it is.
export async function setFavourite(db: Db, userId: string, friendId: string, favourite: boolean): Promise<void> {
  const { rowCount } = await db.query(
    `update private.friendship
     set favourite_of_a = case when user_a = $1 then $3 else favourite_of_a end,
         favourite_of_b = case when user_b = $1 then $3 else favourite_of_b end
     where user_a = least($1::uuid, $2::uuid) and user_b = greatest($1::uuid, $2::uuid)`,
    [userId, friendId, favourite],
  );
  if (rowCount === 0) throw new AppError("not_friends", STATUS.notFound);
}

export async function listFriends(db: Db, userId: string): Promise<ListedFriend[]> {
  const { rows } = await db.query<ListedFriend>(
    `select p.user_id::text as "userId", p.username, coalesce(p.display_name, p.username::text) as name,
            case when f.user_a = $1 then f.favourite_of_a else f.favourite_of_b end as favourite
     from (${circleSql("$1")}) c
     join private.profile p on p.user_id = c.user_id
     join private.friendship f on f.user_a = least($1::uuid, c.user_id) and f.user_b = greatest($1::uuid, c.user_id)
     where c.user_id <> $1
     order by lower(coalesce(p.display_name, p.username::text)), p.username`,
    [userId],
  );
  return rows;
}
