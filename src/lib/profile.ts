// private.profile access (M00 data design §3). The username rules live in the table's check constraint
// (supabase/migrations/20261018105903_create_profile.sql), so the database is the one place that enforces them.
import { DatabaseError, type Pool, type PoolClient } from "pg";
import { AppError } from "@/lib/http";

type Db = Pool | PoolClient;

export async function getUsername(db: Db, userId: string): Promise<string | null> {
  const { rows } = await db.query<{ username: string }>("select username from private.profile where user_id = $1", [userId]);
  return rows[0]?.username ?? null;
}

export async function createProfile(db: Db, userId: string, username: string): Promise<void> {
  try {
    await db.query("insert into private.profile (user_id, username) values ($1, $2)", [userId, username]);
  } catch (err) {
    throw profileError(err);
  }
}

// Maps the constraint a rejected insert broke to the player-facing error; anything else is rethrown as is.
function profileError(err: unknown): unknown {
  if (!(err instanceof DatabaseError)) return err;
  if (err.code === "23514" && err.constraint === "profile_username_format") return new AppError("username_invalid", 400);
  if (err.code === "23505" && err.constraint === "profile_username_key") return new AppError("username_taken", 409);
  if (err.code === "23505" && err.constraint === "profile_pkey") return new AppError("profile_exists", 409);
  return err;
}
