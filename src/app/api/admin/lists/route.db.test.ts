// The researched lists' review route against the local stack (run with `npm run test:db`; docs/milestones/M23-23b-research-
// and-review.md, 23b-2): an admin reads the lists and one list's answers, strikes, undoes, adds and marks a list seen; an
// edit that doesn't fit is 409, a malformed one 400; a player who isn't an admin gets 403, signed out 401. It edits the
// bed list (loading it first where the stack has no base, as CI's fresh stack) and removes every row it made.
import { readdirSync, readFileSync } from "node:fs";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import type { ListView } from "@/admin/lists";
import { readBank } from "@/admin/lists";
import { readReview } from "@/admin/lists";
import { listAnswers } from "@/content/clock-day";
import { answerId, parseList } from "@/content/list";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest, cookieJar } from "@/test/request-scope";
import { loadResearch } from "../../../../../scripts/base";
import { localStack } from "../../../../../scripts/slot";
import { GET as listsGet, POST as listsPost } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const admin = { username: `la${RUN}`, session: new Map<string, string>() };
const player = { username: `lp${RUN}`, session: new Map<string, string>() };
const ADDED = `zzz ${RUN}`;
// A day on a clock in the past that asks the bed list first, where the test's players' misses are stored.
const CLOCK_DAY = "2001-01-02";
const MISSED = `yy${RUN} bed`;
let adminId = "";
let loadedHere = false;

const get = async (query = "") => {
  const r = await listsGet(apiRequest(`/api/admin/lists${query}`, { method: "GET" }));
  return { status: r.status, body: await r.json() };
};
const post = async (body: unknown) => {
  const r = await listsPost(apiRequest("/api/admin/lists", { method: "POST", body }));
  return { status: r.status, body: await r.json() };
};
const view = async () => (await get("?category=bed")).body as { ok: true } & ListView;
const answer = (v: ListView, name: string) => v.answers.find((a) => a.name === name)!;

async function clean() {
  const db = getPool();
  await db.query("update private.fact set removed_at = null where trait = 'kind_of' and removed_at > now() and thing_id in (select thing_id from private.list_edit where category = 'bed' and kind = 'strike')");
  await db.query("delete from private.thing where id in (select thing_id from private.list_edit where category = 'bed' and kind = 'add')");
  await db.query("delete from private.list_edit where category = 'bed'");
  await db.query("delete from private.list_seen where category = 'bed'");
  await db.query("delete from private.list_dismissed where category = 'bed'");
  await db.query("delete from private.run where puzzle_date = $1", [CLOCK_DAY]);
  await db.query("delete from private.puzzle where puzzle_date = $1", [CLOCK_DAY]);
}

beforeAll(async () => {
  useLocalStack();
  const db = getPool();
  const { rows } = await db.query("select 1 from private.category where key = 'bed'");
  if (rows.length === 0) {
    loadedHere = true;
    const { list } = parseList("lists/bed.json", readFileSync("content/lists/bed.json", "utf8"), null);
    const client = new pg.Client({ connectionString: localStack().databaseUrl });
    await client.connect();
    try {
      await loadResearch(client, [list!]);
    } finally {
      await client.end();
    }
    await db.query("select private.define_category('bed', 'bed', 'research', 'bed', null)");
  }
  await clean();
});

afterAll(async () => {
  const db = getPool();
  await clean();
  await db.query("delete from private.base_log where action = 'list' and actor = $1", [`admin:${adminId}`]);
  if (loadedHere) {
    await db.query("delete from private.category where key = 'bed'");
    await db.query("delete from private.thing where id in (select thing_id from private.thing_source where source = 'research' and split_part(source_id, '/', 1) = 'bed')");
    await db.query("delete from private.base_log where (action = 'import' and actor = 'source:research' and detail ->> 'snapshot' = 'lists') or (action = 'define_category' and detail ->> 'key' = 'bed')");
  }
  await db.query("delete from auth.users where email like $1", [`%${RUN}@example.test`]);
  await db.end();
});

describe("/api/admin/lists", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in an admin and a player", async () => {
    for (const p of [admin, player]) {
      p.session = (await signIn(`${p.username}@example.test`)).session;
      expect((await createProfile(apiRequest("/api/profile", { method: "POST", body: { username: p.username } }))).status).toBe(201);
    }
    const { rows } = await getPool().query<{ id: string }>("insert into private.admin (user_id) select id from auth.users where email = $1 returning user_id::text as id", [`${admin.username}@example.test`]);
    adminId = rows[0].id;
  });

  it("lists the researched lists with their counts and the bank's question", async () => {
    useSession(admin.session);
    const { status, body } = await get();
    expect(status).toBe(200);
    const bed = body.lists.find((l: { category: string }) => l.category === "bed");
    expect(bed).toMatchObject({ prompt: readBank().questions.find((q) => q.category === "bed")!.prompt, passes: 2 });
    expect(bed.answers).toBeGreaterThan(100);
    expect(bed.borderline).toBeGreaterThan(0);
    expect(body.lists).toHaveLength(readdirSync("content/lists").filter((f) => f.endsWith(".json")).length);
  });

  it("shows one list's answers with their marks", async () => {
    useSession(admin.session);
    const v = await view();
    expect(answer(v, "king bed")).toEqual({ name: "king bed", tier: "common", brand: false, borderline: false, added: false, struck: null });
    expect(v.answers.some((a) => a.borderline)).toBe(true);
    expect(v.answers.some((a) => a.brand)).toBe(true);
  });

  it("strikes an answer until midnight, and undoes it", async () => {
    useSession(admin.session);
    const before = (await view()).list.answers;
    expect(await post({ action: "strike", category: "bed", name: "king bed" })).toEqual({ status: 200, body: { ok: true } });
    const struck = await view();
    expect(answer(struck, "king bed").struck?.undoUntil).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(struck.list.answers).toBe(before - 1);
    expect(await post({ action: "unstrike", category: "bed", name: "king bed" })).toEqual({ status: 200, body: { ok: true } });
    const back = await view();
    expect(answer(back, "king bed").struck).toBeNull();
    expect(back.list.answers).toBe(before);
  });

  it("adds an answer, and takes it back by striking it", async () => {
    useSession(admin.session);
    const before = (await view()).list.answers;
    expect(await post({ action: "add", category: "bed", name: `  ${ADDED}  ` })).toEqual({ status: 200, body: { ok: true } });
    const added = await view();
    expect(answer(added, ADDED)).toMatchObject({ added: true, tier: "rare", struck: null });
    expect(added.list.answers).toBe(before + 1);
    expect(await post({ action: "strike", category: "bed", name: ADDED })).toEqual({ status: 200, body: { ok: true } });
    expect((await view()).answers.some((a) => a.name === ADDED)).toBe(false);
  });

  it("gives an answer another tier, shows it, and takes it back", async () => {
    useSession(admin.session);
    expect(answer(await view(), "king bed")).toMatchObject({ tier: "common", added: false });
    const before = (await view()).list.answers;
    expect(await post({ action: "tier", category: "bed", name: "king bed", tier: "rare" })).toEqual({ status: 200, body: { ok: true } });
    const changed = await view();
    expect(answer(changed, "king bed")).toMatchObject({ tier: "rare", tierWas: "common", struck: null });
    expect(changed.list.answers).toBe(before);
    // The next day built from the list follows it: the answer leaves the levels and joins the rare answers.
    const bed = parseList("lists/bed.json", readFileSync("content/lists/bed.json", "utf8"), null).list!;
    const review = await readReview(getPool(), adminId);
    expect(review.edits).toContainEqual(expect.objectContaining({ category: "bed", name: "king bed", kind: "tier", tier: "rare" }));
    const day = listAnswers(bed, review.edits);
    expect(day.levels[answerId("bed", "king bed")]).toBeUndefined();
    expect(day.rare.map((r) => r.id)).toContain(answerId("bed", "king bed"));
    expect(await post({ action: "tier", category: "bed", name: "king bed", tier: "uncommon" })).toEqual({ status: 200, body: { ok: true } });
    expect(answer(await view(), "king bed")).toMatchObject({ tier: "uncommon", tierWas: "common" });
    expect(await post({ action: "untier", category: "bed", name: "king bed" })).toEqual({ status: 200, body: { ok: true } });
    const back = answer(await view(), "king bed");
    expect(back.tier).toBe("common");
    expect(back.tierWas).toBeUndefined();
  });

  it("refuses a tier change that doesn't fit, or is malformed", async () => {
    useSession(admin.session);
    const conflict = { status: 409, body: { ok: false, error: "list_invalid" } };
    expect(await post({ action: "tier", category: "bed", name: "no such bed", tier: "rare" })).toEqual(conflict);
    expect(await post({ action: "untier", category: "bed", name: "king bed" })).toEqual(conflict);
    // An answer added here and not yet in the file has no tier to change; one struck has none either.
    await post({ action: "add", category: "bed", name: ADDED });
    expect(await post({ action: "tier", category: "bed", name: ADDED, tier: "common" })).toEqual(conflict);
    await post({ action: "strike", category: "bed", name: "king bed" });
    expect(await post({ action: "tier", category: "bed", name: "king bed", tier: "rare" })).toEqual(conflict);
    for (const body of [
      { action: "tier", category: "bed", name: "queen bed" },
      { action: "tier", category: "bed", name: "queen bed", tier: "epic" },
      { action: "tier", category: "bed", name: "queen bed", tier: 3 },
      { action: "tier", category: "bed", tier: "rare" },
      { action: "untier", category: "bed", name: "queen bed", tier: "rare" },
      { action: "strike", category: "bed", name: "queen bed", tier: "rare" },
    ]) {
      expect(await post(body), JSON.stringify(body)).toMatchObject({ status: 400 });
    }
    await post({ action: "strike", category: "bed", name: ADDED });
    await post({ action: "unstrike", category: "bed", name: "king bed" });
  });

  it("shows the texts typed on the list's clock days that are on no list, most players first, and Dismiss and Add take one off", async () => {
    const db = getPool();
    const ids = (await db.query<{ id: string }>("select id::text from auth.users where email like $1", [`%${RUN}@example.test`])).rows.map((r) => r.id);
    expect(ids).toHaveLength(2);
    await db.query(
      `insert into private.puzzle (game_id, puzzle_date, content) values ('offbeat', $1, $2::jsonb)`,
      [CLOCK_DAY, JSON.stringify({ format: 4, game_id: "offbeat", date: CLOCK_DAY, questions: [{ prompt: "bed", category: "bed", levels: {}, rare: [], size: 1 }] })],
    );
    for (const id of ids) await db.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, 'offbeat', $2)", [id, CLOCK_DAY]);
    const typed = (user: string, text: string, normalized: string) =>
      db.query("insert into private.missed_answer (user_id, game_id, puzzle_date, question_idx, typed, normalized) values ($1, 'offbeat', $2, 0, $3, $4)", [user, CLOCK_DAY, text, normalized]);
    const FEW = `zz${RUN} one`;
    await typed(ids[0], MISSED, MISSED);
    await typed(ids[1], MISSED, MISSED);
    await typed(ids[0], FEW, FEW);
    await typed(ids[0], "king bed", "king bed"); // a name the list has

    useSession(admin.session);
    const unlisted = async () => ((await get("?category=bed")).body as ListView).unlisted;
    expect((await unlisted()).filter((u) => u.text === MISSED || u.text === FEW)).toEqual([
      { text: MISSED, name: MISSED, players: 2 },
      { text: FEW, name: FEW, players: 1 },
    ]);
    expect((await unlisted()).some((u) => u.text === "king bed")).toBe(false);
    expect(await post({ action: "dismiss", category: "bed", name: FEW })).toEqual({ status: 200, body: { ok: true } });
    expect((await unlisted()).some((u) => u.text === FEW)).toBe(false);
    // Typed again by another player, it stays dismissed.
    await typed(ids[1], FEW, FEW);
    expect((await unlisted()).some((u) => u.text === FEW)).toBe(false);
    // Add makes it an answer, and it stops showing.
    expect(await post({ action: "add", category: "bed", name: MISSED })).toEqual({ status: 200, body: { ok: true } });
    expect((await unlisted()).some((u) => u.text === MISSED)).toBe(false);
    expect(answer(await view(), MISSED)).toMatchObject({ added: true });
    await post({ action: "strike", category: "bed", name: MISSED });
  });

  it("marks a list seen", async () => {
    useSession(admin.session);
    expect((await view()).list.seen).toBeNull();
    expect(await post({ action: "seen", category: "bed" })).toEqual({ status: 200, body: { ok: true } });
    const { rows } = await getPool().query<{ today: string }>("select private.today()::text as today");
    expect((await view()).list.seen).toBe(rows[0].today);
  });

  it("answers 409 to an edit that doesn't fit", async () => {
    useSession(admin.session);
    const conflict = { status: 409, body: { ok: false, error: "list_invalid" } };
    expect(await post({ action: "strike", category: "bed", name: "no such bed" })).toEqual(conflict);
    expect(await post({ action: "unstrike", category: "bed", name: "king bed" })).toEqual(conflict);
    expect(await post({ action: "add", category: "bed", name: "King bed" })).toEqual(conflict);
    // A category that isn't a researched list.
    expect(await post({ action: "seen", category: "animal" })).toEqual(conflict);
  });

  it("refuses a malformed edit", async () => {
    useSession(admin.session);
    for (const body of [
      { action: "erase", category: "bed", name: "x" },
      { category: "bed", name: "x" },
      { action: "strike", category: "Bed", name: "x" },
      { action: "strike", category: 7, name: "x" },
      { action: "strike", category: "bed" },
      { action: "strike", category: "bed", name: 7 },
      { action: "strike", category: "bed", name: " ! " },
      { action: "add", category: "bed", name: "x".repeat(41) },
      { action: "add", category: "bed", name: "a\0b" },
      { action: "seen", category: "bed", name: "x" },
    ]) {
      expect(await post(body), JSON.stringify(body)).toMatchObject({ status: 400 });
    }
    expect((await get("?category=nope")).status).toBe(400);
  });

  it("refuses a player who isn't an admin, and a signed-out request", async () => {
    useSession(player.session);
    expect((await post({ action: "dismiss", category: "bed", name: "king bed" })).status).toBe(403);
    expect((await post({ action: "tier", category: "bed", name: "king bed", tier: "rare" })).status).toBe(403);
    expect(await get()).toEqual({ status: 403, body: { ok: false, error: "admins_only" } });
    expect((await get("?category=bed")).status).toBe(403);
    expect((await post({ action: "seen", category: "bed" })).status).toBe(403);
    cookieJar.clear();
    expect((await get()).status).toBe(401);
    expect((await post({ action: "seen", category: "bed" })).status).toBe(401);
  });
});
