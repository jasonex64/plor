// The browser's one way to call the API: it sends the protocol version and turns error responses into
// thrown ApiErrors (DECISIONS.md: Error handling; docs/milestones/M00-data-design.md §2).
import { PROTOCOL_VERSION } from "@/lib/protocol";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    // Each problem a route listed with the error, e.g. the content rules a puzzle broke (M06).
    readonly problems: string[] = [],
  ) {
    super(code);
  }
}

// keepalive: the request outlives the page, for an action sent as the player leaves it (M14 14b-6b, P1).
export async function api<T>(path: string, init: { method: "GET" | "POST"; body?: unknown; keepalive?: boolean }): Promise<T> {
  const response = await fetch(path, {
    method: init.method,
    keepalive: init.keepalive,
    headers: { "x-protocol": String(PROTOCOL_VERSION), "content-type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const json = await response.json();
  if (response.ok) return json as T;
  if (response.status === 409 && json.error === "client_outdated") {
    // A newer server is live: reload loudly instead of talking to it with an old client (§2).
    window.alert("Plor was updated. The page will reload.");
    window.location.reload();
  }
  throw new ApiError(String(json.error), response.status, Array.isArray(json.problems) ? json.problems.map(String) : []);
}
