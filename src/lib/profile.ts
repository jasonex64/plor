// private.profile access (M00 data design §3). The username rules live in the table's check constraint
// (supabase/migrations/20261018105903_create_profile.sql), so the database is the one place that enforces them.
import { DatabaseError } from "pg";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";

export type Profile = { username: string; displayName: string | null };

export async function getProfile(db: Db, userId: string): Promise<Profile | null> {
  const { rows } = await db.query<Profile>(
    "select username, display_name as \"displayName\" from private.profile where user_id = $1",
    [userId],
  );
  return rows[0] ?? null;
}

export async function createProfile(db: Db, userId: string, username: string): Promise<void> {
  try {
    await db.query("insert into private.profile (user_id, username) values ($1, $2)", [userId, username]);
  } catch (err) {
    throw profileError(err);
  }
}

// The display name as sent by the browser: null clears it; text is trimmed and put in NFC, the form the database
// requires (M07 D1), so a name typed with combining accents is still accepted. Anything else gets 400.
export function readDisplayName(input: unknown): string | null {
  if (input === null) return null;
  if (typeof input !== "string") throw new AppError("display_name_invalid", 400);
  return input.normalize("NFC").trim();
}

// Sets or clears (null) the signed-in player's display name (M07 7a). The database checks the rules (D1).
export async function setDisplayName(db: Db, userId: string, displayName: string | null): Promise<void> {
  try {
    const { rowCount } = await db.query("update private.profile set display_name = $2 where user_id = $1", [userId, displayName]);
    if (rowCount === 0) throw new AppError("no_profile", 409);
  } catch (err) {
    throw profileError(err);
  }
}

// Maps the constraint a rejected write broke to the player-facing error; anything else is rethrown as is.
function profileError(err: unknown): unknown {
  if (!(err instanceof DatabaseError)) return err;
  if (err.code === "23514" && err.constraint === "profile_username_format") return new AppError("username_invalid", 400);
  if (err.code === "23514" && err.constraint === "profile_display_name_format") return new AppError("display_name_invalid", 400);
  if (err.code === "23505" && err.constraint === "profile_username_key") return new AppError("username_taken", 409);
  if (err.code === "23505" && err.constraint === "profile_pkey") return new AppError("profile_exists", 409);
  return err;
}
