// Stand-ins for the two Next.js request-scope APIs our route handlers call, so a test can call an exported
// handler directly: next/headers `cookies()` (backed by one in-memory jar, like a browser's) and next/server
// `connection()`. Both throw outside a real request ("called outside a request scope"). Use with:
//   vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
//   vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));
import { vi } from "vitest";
import { PROTOCOL_VERSION } from "@/lib/protocol";

export const cookieJar = new Map<string, string>();

export const nextHeaders = {
  cookies: async () => ({
    getAll: () => [...cookieJar].map(([name, value]) => ({ name, value })),
    // @supabase/ssr deletes a cookie by setting it empty with maxAge 0.
    set: (name: string, value: string, options?: { maxAge?: number }) => {
      if (value === "" || options?.maxAge === 0) cookieJar.delete(name);
      else cookieJar.set(name, value);
    },
  }),
};

export async function nextServer() {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return { ...actual, connection: async () => {} };
}

// ip is the player's address as Vercel would forward it (x-forwarded-for); the sign-in routes need one (M12 12e).
export function apiRequest(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; protocol?: string | null; ip?: string },
): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (init.protocol !== null) headers.set("x-protocol", init.protocol ?? String(PROTOCOL_VERSION));
  if (init.ip !== undefined) headers.set("x-forwarded-for", init.ip);
  return new Request(`http://127.0.0.1:3000${path}`, {
    method: init.method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}
