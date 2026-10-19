// The browser's one way to call the API: it sends the protocol version and turns error responses into
// thrown ApiErrors (DECISIONS.md: Error handling; docs/milestones/M00-data-design.md §2).
import { PROTOCOL_VERSION } from "@/lib/protocol";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

export async function api<T>(path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<T> {
  const response = await fetch(path, {
    method: init.method,
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
  throw new ApiError(String(json.error), response.status);
}
