// The guest's token and its cookie (docs/milestones/M18-guest-play.md, Design, "The token"). The token is random bytes in
// base64url, made as invite codes are (newInviteCode, src/friends/friends.ts); only its hash (hashKey) reaches the
// database. Guest routes read no Supabase session, and the cookie's path keeps the browser from sending it to account routes.
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { GUEST_TOKEN_BYTES } from "@/config/tunables";
import { AppError } from "@/lib/http";

const GUEST_COOKIE = "plor_guest";
// base64url writes 6 bits a character.
const TOKEN_SHAPE = new RegExp(`^[A-Za-z0-9_-]{${Math.ceil((GUEST_TOKEN_BYTES * 8) / 6)}}$`);

export function newGuestToken(): string {
  return randomBytes(GUEST_TOKEN_BYTES).toString("base64url");
}

// The cookie's token, or null when there is none or it is not the shape this app makes (anyone can set a cookie).
export async function readGuestToken(): Promise<string | null> {
  const value = (await cookies()).getAll().find((c) => c.name === GUEST_COOKIE)?.value;
  return value !== undefined && TOKEN_SHAPE.test(value) ? value : null;
}

// For the routes that need a run: with no token there is none.
export async function requireGuestToken(): Promise<string> {
  const token = await readGuestToken();
  if (!token) throw new AppError("no_run", 404);
  return token;
}

// A session cookie (no max-age), as the ticket designs it.
export async function setGuestCookie(token: string): Promise<void> {
  (await cookies()).set(GUEST_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/guest" });
}
