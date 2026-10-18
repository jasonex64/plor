import { connection } from "next/server";
import { log } from "@/lib/log";

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

export function handle(fn: () => Promise<Response>): () => Promise<Response> {
  return async () => {
    // API routes always do request-time work. connection() opts them out of build-time prerendering,
    // and it stays outside the try: during prerender it rejects on purpose, and that framework
    // signal must reach Next.js instead of becoming a logged 500 (unstable_rethrow docs:
    // "encapsulate your API calls that throw and let the caller handle the exception").
    await connection();
    try {
      return await fn();
    } catch (err) {
      if (err instanceof AppError) {
        return Response.json({ ok: false, error: err.code }, { status: err.status });
      }
      log.error("unhandled route error", { error: String(err), stack: (err as Error).stack });
      return Response.json({ ok: false, error: "internal" }, { status: 500 });
    }
  };
}
