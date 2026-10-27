// The answer database's admin lookup against the local stack (run with `npm run test:db`): an admin finds a thing by
// any alias, with its categories; a player who isn't an admin gets 403, signed out 401, and nothing typed 400
// (docs/milestones/M13-13a-the-base.md). The things are a fixture in a test source ID range, removed afterwards.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest, cookieJar } from "@/test/request-scope";
import { GET as lookupRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const admin = { username: `ba${RUN}`, userId: "", session: new Map<string, string>() };
const player = { username: `bp${RUN}`, userId: "", session: new Map<string, string>() };
const id = (n: string) => `test-${RUN}-${n}`;
// A category key is letters and underscores (migration 20261024095732_answer_base.sql), so the run's digits become letters.
const KEY = `test_${RUN.replace(/[0-9]/g, (d) => "abcdefghij"[Number(d)])}`;

async function lookup(q: string | null) {
  const r = await lookupRoute(apiRequest(q === null ? "/api/admin/base" : `/api/admin/base?q=${encodeURIComponent(q)}`, { method: "GET" }));
  return { status: r.status, body: await r.json() };
}

beforeAll(() => {
  useLocalStack();
});

afterAll(async () => {
  const db = getPool();
  await db.query("delete from private.category where key = $1", [KEY]);
  await db.query("delete from private.thing where id in (select thing_id from private.thing_source where source_id like $1)", [`test-${RUN}-%`]);
  await db.query("delete from private.base_log where detail->>'snapshot' = $1 or detail->>'key' = $2", [`test-${RUN}`, KEY]);
  await db.query("delete from auth.users where email like $1", [`%${RUN}@example.test`]);
});

describe("GET /api/admin/base", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in an admin and a player, with a fixture category", async () => {
  for (const p of [admin, player]) {
    p.session = (await signIn(`${p.username}@example.test`)).session;
    const { rows } = await getPool().query<{ id: string }>("select id from auth.users where email = $1", [`${p.username}@example.test`]);
    p.userId = rows[0].id;
    expect((await createProfile(apiRequest("/api/profile", { method: "POST", body: { username: p.username } }))).status).toBe(201);
  }
  const db = getPool();
  await db.query("insert into private.admin (user_id) values ($1)", [admin.userId]);
  await db.query("select private.import_source('wikidata', $1, $2::jsonb)", [
    `test-${RUN}`,
    JSON.stringify([
      { id: id("root"), name: "test root", aliases: [{ alias: `test root ${RUN}`, kind: "name" }] },
      { id: id("leaf"), name: "Leaf Thing", aliases: [{ alias: `leaf thing ${RUN}`, kind: "name" }, { alias: `leafy ${RUN}`, kind: "synonym" }], kind_of: [id("root")] },
    ]),
  ]);
  await db.query("select private.define_category($1, 'test category', 'wikidata', $2, null)", [KEY, id("root")]);
  });

  it("finds a thing by any alias, typed loosely, with its categories, for an admin", async () => {
    useSession(admin.session);
    const r = await lookup(`  LEAFY ${RUN}! `);
    expect(r.status).toBe(200);
    expect(r.body.things).toHaveLength(1);
    // Shown in lowercase, as every thing is (human, 2026-10-27; src/game/payload.ts, shownName).
    expect(r.body.things[0]).toMatchObject({ name: "leaf thing", categories: [KEY], facts: [{ trait: "kind_of", value: "test root", origin: "source" }] });
  });

  it("finds nothing for an unknown name, and refuses nothing typed", async () => {
    useSession(admin.session);
    expect((await lookup(`no such thing ${RUN}`)).body).toEqual({ ok: true, things: [] });
    expect((await lookup("  !! ")).status).toBe(400);
    expect((await lookup(null)).status).toBe(400);
  });

  it("refuses a player who isn't an admin, and a signed-out request", async () => {
    useSession(player.session);
    expect(await lookup(`leafy ${RUN}`)).toEqual({ status: 403, body: { ok: false, error: "admins_only" } });
    cookieJar.clear();
    expect((await lookup(`leafy ${RUN}`)).status).toBe(401);
  });
});
