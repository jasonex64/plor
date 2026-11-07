// Approving a day of game 2 against the local stack (`npm run test:db`; docs/milestones/M16-16c-a-day-of-game-2.md):
// who may, and what's checked. The days are written to content/substrings for this file and removed afterwards.
import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SubstringDayView } from "@/admin/substring-sets";
import type { SubstringDay } from "@/content/substrings";
import { getPool } from "@/lib/db";
import { SUBSTRINGS_ID } from "@/platform/game";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { GET } from "../route";
import { POST as approve } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const DRAFTS = join(process.cwd(), "content", SUBSTRINGS_ID);
const ROUNDS = ["ou", "lu", "att", "yin", "odo", "hec", "vet"];
let good = "";
let bad = "";
const written: string[] = [];
const sessions = new Map<string, Map<string, string>>();

type Listed = { substringDays: SubstringDayView[] };
const dayOn = (date: string, rounds = ROUNDS): SubstringDay => ({ format: 1, game_id: SUBSTRINGS_ID, date, rounds, bonus_letter: "f" });
const list = async () => (await (await GET(apiRequest("/api/admin/puzzles", { method: "GET" }))).json()) as Listed;
const approveDay = (body: unknown) => approve(apiRequest("/api/admin/puzzles/substrings", { method: "POST", body }));

function draft(day: SubstringDay) {
  mkdirSync(DRAFTS, { recursive: true });
  const file = join(DRAFTS, `${day.date}.json`);
  if (existsSync(file)) throw new Error(`${file} exists; this test writes its own draft there`);
  writeFileSync(file, JSON.stringify(day));
  written.push(file);
}

async function sessionFor(role: "admin" | "player"): Promise<Map<string, string>> {
  if (!sessions.has(role)) {
    sessions.set(role, (await signIn(`${RUN}-${role}@example.test`)).session);
    if (role === "admin") await getPool().query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-admin@example.test`]);
  }
  return sessions.get(role)!;
}

beforeAll(async () => {
  useLocalStack();
  const dates = (await getPool().query<{ good: string; bad: string }>("select (private.today() + 420)::text as good, (private.today() + 421)::text as bad")).rows[0];
  ({ good, bad } = dates);
});

afterAll(async () => {
  for (const file of written) rmSync(file);
  if (existsSync(DRAFTS) && readdirSync(DRAFTS).length === 0) rmdirSync(DRAFTS);
  const db = getPool();
  await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = any($2::date[])", [SUBSTRINGS_ID, [good, bad]]);
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await db.end();
});

describe("who may approve", () => {
  beforeEach(() => useSession(new Map()));

  it("answers 401 when signed out", async () => {
    expect((await approveDay({ date: "2030-01-01" })).status).toBe(401);
  });

  it("answers 403 admins_only to a player, before reading anything else", async () => {
    useSession(await sessionFor("player"));
    const res = await approveDay({ date: "not a date" });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("admins_only");
  });
});

describe("approving a game 2 day", () => {
  beforeEach(async () => useSession(await sessionFor("admin")));

  it("answers 400 for a date that isn't one, and 404 no_draft for a day with no file", async () => {
    expect((await approveDay({ date: "soon" })).status).toBe(400);
    const res = await approveDay({ date: good });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("no_draft");
  });

  it("lists a drafted day, then stores it on approval and lists it as approved", async () => {
    draft(dayOn(good));
    const before = (await list()).substringDays.find((d) => d.date === good);
    expect(before).toEqual({ date: good, draft: { rounds: ROUNDS, bonusLetter: "f" }, live: null, started: false });
    expect((await (await approveDay({ date: good })).json()).ok).toBe(true);
    const after = (await list()).substringDays.find((d) => d.date === good);
    expect(after?.live).toEqual({ rounds: ROUNDS, bonusLetter: "f" });
    const stored = await getPool().query("select content -> 'rounds' as rounds from private.puzzle where game_id = $1 and puzzle_date = $2::date", [SUBSTRINGS_ID, good]);
    expect(stored.rows[0].rounds).toEqual(ROUNDS);
  });

  it("answers 409 for a day that has started, and one that's over", async () => {
    const db = getPool();
    const { today, past } = (await db.query<{ today: string; past: string }>("select private.today()::text as today, (private.today() - 1)::text as past")).rows[0];
    draft(dayOn(today));
    draft(dayOn(past));
    await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [SUBSTRINGS_ID, today, dayOn(today)]);
    try {
      const started = await approveDay({ date: today });
      expect(started.status).toBe(409);
      expect((await started.json()).error).toBe("puzzle_started");
      const over = await approveDay({ date: past });
      expect(over.status).toBe(409);
      expect((await over.json()).error).toBe("day_past");
    } finally {
      await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [SUBSTRINGS_ID, today]);
      rmSync(written.pop()!);
      rmSync(written.pop()!);
    }
  });

  it("stops the whole listing on a drafted file that's invalid, as CI should have", async () => {
    draft(dayOn(bad, ["ou"]));
    await expect(list()).resolves.toMatchObject({ error: expect.anything() });
    rmSync(written.pop()!);
  });
});
