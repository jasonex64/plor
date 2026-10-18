import { connection } from "next/server";
import { log } from "@/lib/log";
import { PROTOCOL_VERSION } from "@/lib/protocol";

// The single place errors become HTTP responses (DECISIONS.md: Error handling).
// Expected failures throw AppError; anything else is a bug, logged at error level and returned as 500.
export class AppError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export function handle(fn: (request: Request) => Promise<Response>): (request: Request) => Promise<Response> {
  return async (request) => {
    // API routes always do request-time work. connection() opts them out of build-time prerendering,
    // and it stays outside the try: during prerender it rejects on purpose, and that framework
    // signal must reach Next.js instead of becoming a logged 500 (unstable_rethrow docs:
    // "encapsulate your API calls that throw and let the caller handle the exception").
    await connection();
    return noStore(await run(fn, request));
  };
}

async function run(fn: (request: Request) => Promise<Response>, request: Request): Promise<Response> {
  try {
    return await fn(request);
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ ok: false, error: err.code }, { status: err.status });
    }
    log.error("unhandled route error", { error: String(err), stack: (err as Error).stack });
    return Response.json({ ok: false, error: "internal" }, { status: 500 });
  }
}

// Every route answers one request and may carry session cookies, and Next.js sends route handler responses
// with no Cache-Control at all (observed on `next start`, 2026-10-18). A CDN that cached one could sign the
// next visitor in as someone else (supabase.com/docs/guides/auth/server-side/creating-a-client, "What does
// the cookies object do?"). These are the values @supabase/ssr 0.12.7 hands to setAll (dist/module/cookies.js).
const NO_STORE = {
  "cache-control": "private, no-cache, no-store, must-revalidate, max-age=0",
  expires: "0",
  pragma: "no-cache",
};

function noStore(response: Response): Response {
  for (const [name, value] of Object.entries(NO_STORE)) response.headers.set(name, value);
  return response;
}

// API requests carry the client's protocol version; a mismatch tells the client to reload
// (docs/milestones/M00-data-design.md §2). Navigations (email links, OAuth redirects) can't send it.
export function checkProtocol(request: Request): void {
  if (request.headers.get("x-protocol") !== String(PROTOCOL_VERSION)) throw new AppError("client_outdated", 409);
}

// The JSON body of an API request, which must be an object. Field checks belong to each route.
export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("bad_request", 400, "body is not JSON");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) throw new AppError("bad_request", 400, "body is not an object");
  return body as Record<string, unknown>;
}
