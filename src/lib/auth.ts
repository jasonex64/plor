// Supabase Auth for route handlers, following the @supabase/ssr Next.js guide
// (supabase.com/docs/guides/auth/server-side/creating-a-client; examples/auth/nextjs/lib/supabase/server.ts).
// Every auth call runs on the server; the browser only ever holds the session cookies.
import { createServerClient } from "@supabase/ssr";
import { isAuthRetryableFetchError, type AuthError, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readServerEnv } from "@/config/env";
import { AppError } from "@/lib/http";
import { log } from "@/lib/log";

// A new client per request: it reads that request's cookies (same guide, "Do I need to create a new client
// for every route?"). Route handlers can write cookies, so unlike the guide's Server Component client there is
// no try/catch around setAll: a failed write is a real error. Server Components never create this client.
export async function createAuthClient(): Promise<SupabaseClient> {
  const { supabase } = readServerEnv();
  const cookieStore = await cookies();
  return createServerClient(supabase.url, supabase.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
      },
    },
  });
}

// The signed-in user's id, or null. getClaims() verifies the token's signature; getSession() would trust
// whatever the cookie says, which anyone can forge (same guide, the "danger" admonition).
export async function currentUserId(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase.auth.getClaims();
  if (error) throw error;
  return data ? data.claims.sub : null;
}

export async function requireUserId(supabase: SupabaseClient): Promise<string> {
  const userId = await currentUserId(supabase);
  if (!userId) throw new AppError("not_signed_in", 401);
  return userId;
}

// Supabase Auth reports a problem with the request itself (a bad email, a used code, a rate limit) as a 4xx with
// a stable code, which the client shows to the player. When Auth itself fails (any 5xx, or no response at all),
// supabase-js throws AuthRetryableFetchError (@supabase/auth-js 2.118.0, src/lib/fetch.ts handleError): the player
// is told it's on our side, and the cause is logged here because the route wrapper doesn't log an AppError
// (docs/milestones/M02-2f-cleanup.md, A2). Anything else stays a 500.
export function authFailure(error: AuthError): Error {
  if (isAuthRetryableFetchError(error)) {
    log.error("supabase auth unavailable", { error: error.message, status: error.status });
    return new AppError("auth_unavailable", 503, error.message);
  }
  if (error.code && error.status !== undefined && error.status >= 400 && error.status < 500) {
    return new AppError(error.code, error.status, error.message);
  }
  return error;
}

// Where the Google callback lands: home, with an error code the page turns into a message.
// Only a plain code survives, since the query string is something anyone can craft.
// The Location is relative on purpose: Next.js builds request.url with "localhost" whatever the Host header says
// (observed on `next start -H 127.0.0.1`, 2026-10-18), so an absolute URL from it sent the browser to another
// host and left the new session cookie behind. A relative Location keeps the browser on the host it used.
export function redirectHome(errorCode?: string): NextResponse {
  const location = errorCode ? `/?${new URLSearchParams({ error: /^[a-z0-9_]+$/.test(errorCode) ? errorCode : "sign_in_failed" })}` : "/";
  // NextResponse, as in the guide's callback route, so the session cookies set through cookies() go with it.
  return new NextResponse(null, { status: 307, headers: { location } });
}
