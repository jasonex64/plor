// The routes of a day on a clock against the local stack (`npm run test:db`; docs/milestones/M23-23e-drafting-and-approving.md,
// 23e-1): who may use them, the day built on the server for the approval page's changes (swap, wording, re-roll, redraft), and
// approving it. The days are built from the real lists in content/lists; the ones the stack lacks are loaded for this file and taken
// out again, with the drafted day it writes and the days it approves.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildClockDay } from "@/content/clock-day";
import { parseList } from "@/content/list";
import { GAME_ID } from "@/platform/game";
import { readBank } from "@/admin/bank";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { ensureResearched, removeResearched } from "@/test/research-lists";
import { localStack } from "../../../../../../scripts/slot";
import { GET as listDays } from "../route";
import { POST as approveOld } from "../approve/route";
import { POST as preview } from "./route";
import { POST as approve } from "./approve/route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const LISTS = ["bread", "soup", "tool", "pasta"];
const DRAFTS = join(process.cwd(), "content", "offbeat");
const sessions = new Map<string, Map<string, string>>();
let loaded: string[] = [];
let ahead = "";
let draftDate = "";
let draftFile = "";
let createdDraftsFolder = false;
const approved: string[] = [];

async function sessionFor(role: "admin" | "player"): Promise<Map<string, string>> {
  if (!sessions.has(role)) {
    sessions.set(role, (await signIn(`${RUN}-${role}@example.test`)).session);
    if (role === "admin") await getPool().query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-admin@example.test`]);
  }
  return sessions.get(role)!;
}

const list = () => listDays(apiRequest("/api/admin/puzzles", { method: "GET" }));
const pick = (category: string, extra: object = {}) => ({ category, reroll: 0, ...extra });
const show = (body: unknown) => preview(apiRequest("/api/admin/puzzles/clock", { method: "POST", body }));
const approveDay = (body: unknown) => approve(apiRequest("/api/admin/puzzles/clock/approve", { method: "POST", body }));
type View = { picks: { category: string; wording?: string; reroll: number }[]; questions: { category: string; prompt: string; common: number; uncommon: number; rare: number; examples: string[] }[]; menu: { category: string; prompt: string; when: string }[] };
const view = async (body: unknown) => {
  const response = await show(body);
  expect(response.status).toBe(200);
  return (await response.json()) as View & { ok: true };
};
const list1 = (category: string) => parseList(`lists/${category}.json`, readFileSync(`content/lists/${category}.json`, "utf8"), null).list!;
const stored = async (date: string) => (await getPool().query<{ content: { format: number; questions: { prompt: string; category: string; root: string; member_of: string | null; levels: Record<string, string>; rare: string[]; size: number }[] } }>(
  "select content from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, date])).rows;

beforeAll(async () => {
  useLocalStack();
  const db = getPool();
  loaded = await ensureResearched(localStack().databaseUrl, LISTS);
  ({ ahead } = (await db.query<{ ahead: string }>("select (private.today() + 520)::text as ahead")).rows[0]);
  draftDate = (await db.query<{ d: string }>("select (private.today() + 530)::text as d")).rows[0].d;
  // A drafted day on a clock, as the draft writes it, for the listing and the old approve route.
  const prompts = new Map(readBank().questions.map((q) => [q.category, q.prompt]));
  const { day } = buildClockDay(draftDate, ["bread", "soup", "tool"].map((c) => pick(c)), { lists: ["bread", "soup", "tool"].map(list1), edits: [], prompts });
  createdDraftsFolder = !existsSync(DRAFTS);
  mkdirSync(DRAFTS, { recursive: true });
  draftFile = join(DRAFTS, `${draftDate}.json`);
  if (existsSync(draftFile)) throw new Error(`${draftFile} exists; this test writes its own draft there`);
  writeFileSync(draftFile, JSON.stringify(day));
});

afterAll(async () => {
  if (draftFile) rmSync(draftFile);
  if (createdDraftsFolder && readdirSync(DRAFTS).length === 0) {
    rmdirSync(DRAFTS);
    rmdirSync(join(process.cwd(), "content"));
  }
  const db = getPool();
  for (const date of approved) await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, date]);
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removeResearched(db, loaded);
  await db.end();
});

describe("who may use the routes of a day on a clock", () => {
  it("answers 401 when signed out", async () => {
    useSession(new Map());
    for (const response of [await show({ date: ahead, skip: [] }), await approveDay({ date: ahead, questions: [] })]) expect(response.status).toBe(401);
  });

  it("answers 403 admins_only to a signed-in player who isn't an admin, before reading anything else", async () => {
    useSession(await sessionFor("player"));
    for (const response of [await show({ date: ahead, skip: [] }), await approveDay({ date: ahead, questions: [] })]) {
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ ok: false, error: "admins_only" });
    }
  });
});

describe("the day the page shows for its changes", () => {
  beforeEach(async () => useSession(await sessionFor("admin")));
  const three = [pick("bread"), pick("soup"), pick("tool")];

  it("builds the day on the server: each question's wording, its list's count by tier, six rare examples, and the menu of lists", async () => {
    const day = await view({ date: ahead, questions: three });
    expect(day.picks).toEqual(three);
    const prompts = new Map(readBank().questions.map((q) => [q.category, q.prompt]));
    expect(day.questions.map((q) => [q.category, q.prompt])).toEqual(["bread", "soup", "tool"].map((c) => [c, prompts.get(c)]));
    for (const q of day.questions) {
      const answers = list1(q.category).answers;
      expect([q.common, q.uncommon, q.rare]).toEqual(["common", "uncommon", "rare"].map((t) => answers.filter((a) => a.tier === t).length));
      expect(q.examples).toHaveLength(6);
    }
    expect(day.menu).toHaveLength(readdirSync(join(process.cwd(), "content", "lists")).length);
    for (const item of day.menu) expect(item.when).toMatch(/^(never|\d+ days? ago|in \d+ days?)$/);
  });

  it("gives the same six every time, and another six for a re-roll that leaves the other questions as they were", async () => {
    const first = await view({ date: ahead, questions: three });
    expect((await view({ date: ahead, questions: three })).questions).toEqual(first.questions);
    const again = await view({ date: ahead, questions: [pick("bread", { reroll: 1 }), pick("soup"), pick("tool")] });
    expect(again.questions[0].examples).not.toEqual(first.questions[0].examples);
    expect(again.questions.slice(1)).toEqual(first.questions.slice(1));
  });

  it("keeps a question's six when it moves, as its list and not its place draws them", async () => {
    const first = await view({ date: ahead, questions: three });
    const moved = await view({ date: ahead, questions: [pick("tool"), pick("bread"), pick("soup")] });
    expect(moved.questions.map((q) => q.examples)).toEqual([first.questions[2].examples, first.questions[0].examples, first.questions[1].examples]);
  });

  it("swaps a question for another list, and uses an edited wording for that question", async () => {
    const day = await view({ date: ahead, questions: [pick("pasta", { wording: "  Name any pasta  " }), pick("soup"), pick("tool")] });
    expect(day.questions[0]).toMatchObject({ category: "pasta", prompt: "Name any pasta" });
    expect(day.picks[0]).toEqual({ category: "pasta", wording: "Name any pasta", reroll: 0 });
  });

  const refused = async (body: unknown, problems: string[]) => {
    const response = await show(body);
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ ok: false, error: "puzzle_invalid", problems });
  };

  it("refuses a list asked twice, an empty wording and a list that is not a researched one, with the problem, as 422", async () => {
    await refused({ date: ahead, questions: [pick("bread"), pick("bread"), pick("tool")] }, [`${ahead} q2: "bread" is asked by q1 too`]);
    await refused({ date: ahead, questions: [pick("bread", { wording: "  " }), pick("soup"), pick("tool")] }, [`${ahead} q1: the wording is empty`]);
    await refused({ date: ahead, questions: [pick("bread"), pick("not_a_list"), pick("tool")] }, [`${ahead} q2: "not_a_list" is not a researched list`]);
  });

  it("refuses a malformed request as 400: no date, both or neither of questions and skip, a wrong number of questions, a bad pick", async () => {
    for (const body of [{ questions: three }, { date: ahead }, { date: ahead, questions: three, skip: [] }, { date: ahead, questions: three.slice(1) }, { date: ahead, questions: [pick("bread"), pick("soup"), { category: "tool", reroll: -1 }] }, { date: ahead, skip: [1] }]) {
      expect((await show(body)).status).toBe(400);
    }
  });

  it("redrafts: three lists the draft would pick next, none that the page has already shown", async () => {
    const first = await view({ date: ahead, skip: [] });
    const firstLists = first.picks.map((p) => p.category);
    expect(new Set(firstLists).size).toBe(3);
    const next = await view({ date: ahead, skip: firstLists });
    expect(next.picks).toHaveLength(3);
    for (const p of next.picks) expect(firstLists).not.toContain(p.category);
    expect(next.picks.every((p) => p.reroll === 0)).toBe(true);
    expect(next.questions).toHaveLength(3);
  });

  it("says so, as 409, when fewer than three lists are left to redraft with", async () => {
    const all = readdirSync(join(process.cwd(), "content", "lists")).map((f) => f.replace(".json", ""));
    const response = await show({ date: ahead, skip: all.slice(0, all.length - 2) });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "no_lists_left" });
  });
});

describe("approving a day on a clock", () => {
  beforeEach(async () => useSession(await sessionFor("admin")));

  const refusedBody = async (body: unknown, problems: string[]) => {
    const response = await approveDay(body);
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ ok: false, error: "puzzle_invalid", problems });
    expect(await stored(ahead)).toEqual([]);
  };

  it("refuses a list that is not a researched one, a repeated list and an empty wording as 422, and saves nothing", async () => {
    await refusedBody({ date: ahead, questions: [pick("bread"), pick("not_a_list"), pick("tool")] }, [`${ahead} q2: "not_a_list" is not a researched list`]);
    await refusedBody({ date: ahead, questions: [pick("bread"), pick("soup"), pick("soup", { reroll: 2 })] }, [`${ahead} q3: "soup" is asked by q2 too`]);
    await refusedBody({ date: ahead, questions: [pick("bread"), pick("soup", { wording: "" }), pick("tool")] }, [`${ahead} q2: the wording is empty`]);
  });

  it("refuses a malformed request as 400, and a day that is over as 409", async () => {
    expect((await approveDay({ date: ahead, questions: [pick("bread")] })).status).toBe(400);
    expect((await approveDay({ questions: [pick("bread"), pick("soup"), pick("tool")] })).status).toBe(400);
    const past = (await getPool().query<{ d: string }>("select (private.today() - 5)::text as d")).rows[0].d;
    const response = await approveDay({ date: past, questions: [pick("bread"), pick("soup"), pick("tool")] });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "day_past" });
  });

  it("stores the day the page showed: its picks as the server builds them, with each question's root", async () => {
    const picks = [pick("bread", { reroll: 1 }), pick("soup", { wording: "Name any soup" }), pick("tool")];
    const shown = await view({ date: ahead, questions: picks });
    const response = await approveDay({ date: ahead, questions: picks });
    expect(await response.json()).toEqual({ ok: true });
    approved.push(ahead);
    const [{ content }] = await stored(ahead);
    expect(content.format).toBe(4);
    expect(content.questions.map((q) => [q.category, q.prompt])).toEqual(shown.questions.map((q) => [q.category, q.prompt]));
    // The six it holds, by name, are the six the page showed, in the order shown.
    for (const [i, q] of content.questions.entries()) {
      const names = await getPool().query<{ name: string }>("select lower(t.name) as name from unnest($1::uuid[]) with ordinality as u(id, n) join private.thing t on t.id = u.id order by u.n", [q.rare]);
      expect(names.rows.map((r) => r.name)).toEqual(shown.questions[i].examples);
      expect(q.size).toBe(list1(q.category).answers.length);
      expect(Object.keys(q.levels)).toHaveLength(shown.questions[i].common + shown.questions[i].uncommon);
      expect(q.root).toBeTruthy();
    }
    // It lists as approved, with the numbers the page shows.
    const day = (await (await list()).json()).days.find((d: { date: string }) => d.date === ahead);
    expect(day.draft).toBeNull();
    expect(day.live).toBeNull();
    expect(day.clock.live.map((q: { prompt: string; common: number; examples: string[] }) => [q.prompt, q.common, q.examples])).toEqual(shown.questions.map((q) => [q.prompt, q.common, q.examples]));
  });

  it("lists a drafted day on a clock built again now, and the old approve route refuses it", async () => {
    const day = (await (await list()).json()).days.find((d: { date: string }) => d.date === draftDate);
    expect(day.draft).toBeNull();
    expect(day.clock.live).toBeNull();
    expect(day.clock.draft.picks).toEqual([pick("bread"), pick("soup"), pick("tool")]);
    expect(day.clock.draft.questions).toHaveLength(3);
    const response = await approveOld(apiRequest("/api/admin/puzzles/approve", { method: "POST", body: { date: draftDate, hostAnswers: [[], [], []] } }));
    expect(response.status).toBe(400);
  });
});
