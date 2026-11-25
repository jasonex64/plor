// The researched lists' review route against the local stack (run with `npm run test:db`; docs/milestones/M23-23b-research-
// and-review.md, 23b-2): an admin reads the lists and one list's answers, strikes, undoes, adds and marks a list seen; an
// edit that doesn't fit is 409, a malformed one 400; a player who isn't an admin gets 403, signed out 401. It edits the
// bed list (loading it first where the stack has no base, as CI's fresh stack) and removes every row it made.
import { readdirSync, readFileSync } from "node:fs";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import type { ListView } from "@/admin/lists";
import { readBank } from "@/admin/bank";
import { parseList } from "@/content/list";
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
    expect(await get()).toEqual({ status: 403, body: { ok: false, error: "admins_only" } });
    expect((await get("?category=bed")).status).toBe(403);
    expect((await post({ action: "seen", category: "bed" })).status).toBe(403);
    cookieJar.clear();
    expect((await get()).status).toBe(401);
    expect((await post({ action: "seen", category: "bed" })).status).toBe(401);
  });
});
