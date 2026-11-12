// The game screens' one prefix each: it picks the route family, so the same screen plays a signed-in run or a guest's
// (docs/milestones/M18-guest-play.md, Design, "Guest routes"). Guest routes sit under /api/guest so the guest cookie, whose
// path is /api/guest, reaches them and no account route.
export type RunFamily = "account" | "guest";

const PREFIX: Record<RunFamily, string> = { account: "/api/run", guest: "/api/guest/run" };

export function runRoutes(family: RunFamily) {
  const prefix = PREFIX[family];
  return { state: prefix, start: `${prefix}/start`, next: `${prefix}/next`, answer: `${prefix}/answer` };
}

// A guest's start carries the bot-check token (field name read by src/app/api/guest/run/start/route.ts); a signed-in start has no body.
export function startBody(family: RunFamily, turnstileToken: string | null) {
  return family === "guest" ? { turnstileToken } : undefined;
}

// Game 2's screen picks its route family the same way (docs/milestones/M18-guest-play.md, 18d).
const SUBSTRINGS_PREFIX: Record<RunFamily, string> = { account: "/api/substrings", guest: "/api/guest/substrings" };

export function substringRoutes(family: RunFamily) {
  const prefix = SUBSTRINGS_PREFIX[family];
  return { state: prefix, start: `${prefix}/start`, try: `${prefix}/try`, next: `${prefix}/next` };
}
