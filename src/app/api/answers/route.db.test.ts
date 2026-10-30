// The answer search route against the local stack (`npm run test:db`; docs/milestones/M14-14b-12-answer-lists.md):
// signed out, mid-run and an unreached question are refused; a finished player finds the answers a question accepted.
// The day is the fixture day under today (src/test/puzzles.ts).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { POST as answerRoute } from "@/app/api/run/answer/route";
import { POST as startRoute } from "@/app/api/run/start/route";
import { type ApprovedPuzzle } from "@/content/puzzle";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, hostName, removeFixtures } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
let today = "";
let puzzle: ApprovedPuzzle;

async function call(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: await r.json() };
}
const search = (index: string, q: string, date = today) => call(GET(apiRequest(`/api/answers?${new URLSearchParams({ date, index, q })}`, { method: "GET" })));

// Signs a new player in (the test then uses their session), with a profile and today's run started.
const signInPlayer = async (name: string) => (await signIn(`${RUN}-as${name}@example.test`)).session;
async function startRun(name: string): Promise<void> {
  expect((await createProfile(apiRequest("/api/profile", { method: "POST", body: { username: `as${name}${RUN}` } }))).status).toBe(201);
  expect((await call(startRoute(apiRequest("/api/run/start", { method: "POST" })))).status).toBe(200);
}

beforeAll(async () => {
  useLocalStack();
  today = (await getPool().query<{ today: string }>("select private.today()::text as today")).rows[0].today;
  puzzle = await ensurePuzzle(today);
});

afterAll(async () => {
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-as%@example.test`]);
  await removeFixtures();
  await getPool().end();
});

describe("searching a question's answers", () => {
  it("answers 401 when signed out", async () => {
    useSession(new Map());
    expect((await search("0", "")).status).toBe(401);
  });

  it("refuses a player whose run is still going, and a bad index", async () => {
    useSession(await signInPlayer("mid"));
    await startRun("mid");
    expect(await search("0", "bear")).toEqual({ status: 403, body: { ok: false, error: "answers_closed" } });
    expect((await search("one", "bear")).status).toBe(400);
  });

  it("finds a finished player's answers by any name, and refuses a question they didn't reach", async () => {
    useSession(await signInPlayer("done"));
    await startRun("done");
    // Caught at question 1 by the Wind's own answer.
    await call(answerRoute(apiRequest("/api/run/answer", { method: "POST", body: { index: 0, text: hostName(puzzle, 0) } })));
    const found = await search("0", "Polar");
    expect(found.status).toBe(200);
    expect(found.body.answers).toContainEqual({ name: "polar bear", matched: null, tier: "rare", players: null });
    // A name that isn't its main one finds it, and says which name matched.
    expect((await search("0", "maritimus")).body.answers).toEqual([{ name: "polar bear", matched: "ursus maritimus", tier: "rare", players: null }]);
    // cat is uncommon in the fixture's levels.
    expect((await search("0", "cat")).body.answers).toContainEqual({ name: "cat", matched: null, tier: "uncommon", players: null });
    expect((await search("1", "")).status).toBe(403);
  });
});
