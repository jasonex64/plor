// private.profile access (M00 data design §3). The username rules live in the table's check constraint
// (supabase/migrations/20261028140000_baseline.sql), so the database is the one place that enforces them.
import { DatabaseError } from "pg";
import type { Db } from "@/lib/db";
import { USERNAME_CHANGE_DAYS } from "@/config/tunables";
import { AppError } from "@/lib/http";

// The player's settings (docs/milestones/M14-14a-3b-settings.md): Skip the game screen (L39) and Numbers on the
// calendar (L46), both off until turned on; and the theme (docs/milestones/M14-14b-1-themes.md; L21), following the
// device until one is picked. The database's check (profile_theme) holds the same list.
export const THEMES = ["device", "paper", "night", "sky", "moonlit", "ink"] as const;
export type Theme = (typeof THEMES)[number];
export type Settings = { skipGameScreen: boolean; calendarNumbers: boolean; theme: Theme };

// usernameChangeableAt: when the username may next change, or null if it may now (M12 A2: once every 30 days, the
// first change at once).
export type Profile = { username: string; displayName: string | null; usernameChangeableAt: string | null; settings: Settings };

const SETTINGS = `json_build_object('skipGameScreen', skip_game_screen, 'calendarNumbers', calendar_numbers, 'theme', theme)`;

export async function getProfile(db: Db, userId: string): Promise<Profile | null> {
  // The trigger (supabase/migrations/20261028140000_baseline.sql) refuses a change before this time.
  const { rows } = await db.query<{ username: string; displayName: string | null; changeable: Date | null; settings: Settings }>(
    `select username, display_name as "displayName",
            case when username_changed_at + make_interval(days => $2) > statement_timestamp()
                 then username_changed_at + make_interval(days => $2) end as changeable,
            ${SETTINGS} as settings
     from private.profile where user_id = $1`,
    [userId, USERNAME_CHANGE_DAYS],
  );
  if (!rows[0]) return null;
  const { changeable, ...rest } = rows[0];
  return { ...rest, usernameChangeableAt: changeable?.toISOString() ?? null };
}

// The settings as sent by the browser: one or more, the switches as booleans and the theme one of THEMES, and nothing
// else, or 400.
export function readSettings(input: Record<string, unknown>): Partial<Settings> {
  const valid: Record<keyof Settings, (v: unknown) => boolean> = {
    skipGameScreen: (v) => typeof v === "boolean",
    calendarNumbers: (v) => typeof v === "boolean",
    theme: (v) => (THEMES as readonly unknown[]).includes(v),
  };
  const keys = Object.keys(input);
  if (keys.length === 0 || keys.some((k) => !(k in valid) || !valid[k as keyof Settings](input[k]))) {
    throw new AppError("settings_invalid", 400);
  }
  return input as Partial<Settings>;
}

// Sets the signed-in player's settings, leaving any not given as they were, and returns both.
export async function setSettings(db: Db, userId: string, settings: Partial<Settings>): Promise<Settings> {
  const { rows } = await db.query<{ settings: Settings }>(
    `update private.profile set skip_game_screen = coalesce($2, skip_game_screen), calendar_numbers = coalesce($3, calendar_numbers),
            theme = coalesce($4, theme)
     where user_id = $1 returning ${SETTINGS} as settings`,
    [userId, settings.skipGameScreen ?? null, settings.calendarNumbers ?? null, settings.theme ?? null],
  );
  if (!rows[0]) throw new AppError("no_profile", 409);
  return rows[0].settings;
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

// Changes the signed-in player's username (docs/milestones/M12-account.md, 12b; A2). The database checks the format,
// that it's free, and that the last change was over 30 days ago.
export async function changeUsername(db: Db, userId: string, username: string): Promise<void> {
  try {
    const { rowCount } = await db.query("update private.profile set username = $2 where user_id = $1", [userId, username]);
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
  if (err.code === "OB011") return new AppError("username_change_too_soon", 409);
  return err;
}
