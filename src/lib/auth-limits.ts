// Sign-in code limits (docs/milestones/M12-12e-sign-in-limits.md, L1 (a)). Our routes call Supabase Auth from the
// server, so Auth's own per-IP limits count Vercel's address and are shared by every player (SOURCES.md, Supabase email
// sending and Auth limits, "IP address forwarding"). These limits count each player instead, per IP and per address,
// in private.auth_attempt (supabase/migrations/20261024000629_auth_attempts.sql), before Auth is called.
import { createHash } from "node:crypto";
import { AUTH_LIMITS } from "@/config/tunables";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { log } from "@/lib/log";

export type AuthLimitKind = keyof typeof AUTH_LIMITS;

// The player's IP: the first entry of x-forwarded-for, which Vercel sets and overwrites so a client can't spoof it
// (SOURCES.md, Vercel request headers), and which `next dev` fills in from the connection when it's absent (Next.js
// 16.4.2, server/base-server.js). ipAddress() from @vercel/functions reads x-real-ip, which `next dev` never sets.
// Without one the limits would have no key, so its absence is a bug, not a shared bucket.
export function clientIp(request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim();
  if (!ip) throw new Error("no client IP: x-forwarded-for is missing");
  return ip;
}

// Keys are stored hashed, never as an IP or an email (the privacy page says so).
export function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// An email address as the limits count it: Auth matches addresses without regard to case (*unverified*), so a guesser
// mustn't get a fresh count by changing it.
export function emailKey(email: string): string {
  return email.trim().toLowerCase();
}

// Counts one attempt, or refuses it with 429 when the player is over the limit. A refusal isn't counted, and it's
// logged with its kind and a short prefix of the hashed key, so a flood shows in the logs (L2).
export async function takeAttempt(db: Db, kind: AuthLimitKind, value: string): Promise<void> {
  const key = hashKey(value);
  const { limit, windowSeconds } = AUTH_LIMITS[kind];
  const { rows } = await db.query<{ taken: boolean }>("select private.take_auth_attempt($1, $2, $3, make_interval(secs => $4)) as taken", [
    kind,
    key,
    limit,
    windowSeconds,
  ]);
  if (rows[0].taken) return;
  log.warn("sign-in attempt refused", { kind, key: key.slice(0, 8) });
  throw new AppError("too_many_attempts", 429);
}

// A new code gets a fresh set of checks (N4).
export async function clearAttempts(db: Db, kind: AuthLimitKind, value: string): Promise<void> {
  await db.query("select private.clear_auth_attempts($1, $2)", [kind, hashKey(value)]);
}
