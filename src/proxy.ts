// Refreshes the Supabase session on every request, because Server Components can't write cookies
// (supabase.com/docs/guides/auth/server-side/creating-a-client, "Hook up proxy"; examples/auth/nextjs/proxy.ts
// and lib/supabase/proxy.ts at supabase/supabase@7425d49). Proxy runs on Node.js in Next.js 16
// (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md, "Runtime").
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readServerEnv } from "@/config/env";
import { log } from "@/lib/log";

export async function proxy(request: NextRequest) {
  const { supabase: env } = readServerEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        // The request copy hands the refreshed token to the route; the response copy hands it to the browser.
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        // Cache-Control, Expires and Pragma, so no CDN stores a response that carries a session (same guide).
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // Nothing may run between createServerClient and getClaims() (same guide). The proxy only refreshes; it doesn't
  // decide access (Next.js proxy docs: not "a full session management or authorization solution"). Every route
  // handler verifies the session again and fails loudly (401, or 500 for an Auth outage), so an error here is
  // logged for the record and the request continues to that check.
  const { error } = await supabase.auth.getClaims();
  if (error) log.warn("session refresh failed in proxy", { code: error.code, status: error.status, error: error.message });

  // The response setAll last built: an earlier one lacks the refreshed cookies (same guide).
  return response;
}

export const config = {
  // The guide's matcher: everything except static assets and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
