// Health check for a running deployment: `npm run status -- <base-url>`.
// Exits non-zero on any failure so CI and humans can't mistake "deployed" for "working".
import { pathToFileURL } from "node:url";

export type StatusResult = { ok: true; protocol: number } | { ok: false; reason: string };

export async function checkStatus(baseUrl: string): Promise<StatusResult> {
  const url = new URL("/api/health", baseUrl);
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    return { ok: false, reason: `unreachable: ${url} (${(err as Error).message})` };
  }
  if (res.status !== 200) return { ok: false, reason: `HTTP ${res.status} from ${url}` };

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, reason: `response from ${url} is not JSON` };
  }
  const b = body as { ok?: unknown; protocol?: unknown };
  if (b.ok !== true) return { ok: false, reason: `health reported not ok: ${JSON.stringify(body)}` };
  if (typeof b.protocol !== "number") return { ok: false, reason: `health response has no protocol version: ${JSON.stringify(body)}` };
  return { ok: true, protocol: b.protocol };
}

async function main() {
  const baseUrl = process.argv[2];
  if (!baseUrl) {
    console.error("usage: npm run status -- <base-url>");
    process.exitCode = 2;
    return;
  }
  const result = await checkStatus(baseUrl);
  if (result.ok) {
    console.log(`UP ${baseUrl} (protocol ${result.protocol})`);
  } else {
    console.error(`DOWN ${baseUrl}: ${result.reason}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
