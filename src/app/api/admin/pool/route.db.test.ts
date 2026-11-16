// A category's answer pool against the local stack (run with `npm run test:db -- -t "admin pool"`;
// docs/milestones/M15-15g-the-answer-pool.md): an admin gets the counts, a page of answers by name, a search over every
// alias, and the answers whose shown name holds a taken letter marked; a player who isn't an admin gets 403, signed
// out 401. The things are a fixture in a test source ID range, removed afterwards.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest, cookieJar } from "@/test/request-scope";
import { GET as poolRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const admin = { username: `pa${RUN}`, userId: "", session: new Map<string, string>() };
const player = { username: `pp${RUN}`, userId: "", session: new Map<string, string>() };
const id = (n: string) => `test-${RUN}-${n}`;
// A category key is letters and underscores (supabase/migrations/20261028140000_baseline.sql), so the run's digits become letters.
const KEY = `test_${RUN.replace(/[0-9]/g, (d) => "abcdefghij"[Number(d)])}`;

async function pool(params: Record<string, string>) {
  const r = await poolRoute(apiRequest(`/api/admin/pool?${new URLSearchParams(params)}`, { method: "GET" }));
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

describe("GET /api/admin/pool (admin pool)", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in an admin and a player, with a fixture category of two answers", async () => {
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
        // Its shown name holds a Z; its nickname doesn't.
        { id: id("fig"), name: "Zorro Fig", aliases: [{ alias: "zorro fig", kind: "name" }, { alias: `pf ${RUN}`, kind: "synonym" }], kind_of: [id("root")] },
        { id: id("oak"), name: "Plain Oak", aliases: [{ alias: "plain oak", kind: "name" }], kind_of: [id("root")] },
      ]),
    ]);
    await db.query("select private.define_category($1, 'test category', 'wikidata', $2, null)", [KEY, id("root")]);
  });

  it("gives an admin the counts and the answers by name, marking a shown name that holds a taken letter", async () => {
    useSession(admin.session);
    const r = await pool({ category: KEY, taken: "qz" });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, members: 2, matching: 2, clean: 1 });
    // Shown in lowercase, as every thing is (src/game/payload.ts, shownName).
    expect(r.body.rows.map((row: { name: string; alias: string | null; taken: string | null }) => [row.name, row.alias, row.taken])).toEqual([
      ["plain oak", null, null],
      ["zorro fig", null, "z"],
    ]);
  });

  it("counts no clean names when no letter is taken, and starts a page where asked", async () => {
    useSession(admin.session);
    const r = await pool({ category: KEY, offset: "1" });
    expect(r.body).toMatchObject({ members: 2, matching: 2, clean: null });
    expect(r.body.rows.map((row: { name: string }) => row.name)).toEqual(["zorro fig"]);
  });

  it("finds an answer by part of any alias, typed loosely, past its taken letter, and names the alias that matched", async () => {
    useSession(admin.session);
    const byNickname = await pool({ category: KEY, taken: "z", q: `  PF ${RUN}! ` });
    expect(byNickname.body).toMatchObject({ members: 2, matching: 1, clean: null });
    expect(byNickname.body.rows).toMatchObject([{ name: "zorro fig", alias: `pf ${RUN}`, taken: "z" }]);
    // Found by its own name: no alias to name.
    expect((await pool({ category: KEY, q: "orro" })).body.rows).toMatchObject([{ name: "zorro fig", alias: null, taken: null }]);
    expect((await pool({ category: KEY, q: `nothing holds ${RUN}` })).body).toMatchObject({ members: 2, matching: 0, rows: [] });
  });

  it("refuses what isn't a category, a letter list or a place to start", async () => {
    useSession(admin.session);
    expect((await pool({})).status).toBe(400);
    expect((await pool({ category: KEY, taken: "Z1" })).status).toBe(400);
    expect((await pool({ category: KEY, offset: "-1" })).status).toBe(400);
    expect((await pool({ category: KEY, offset: "two" })).status).toBe(400);
    expect(await pool({ category: `${KEY}_missing` })).toEqual({ status: 404, body: { ok: false, error: "no_category" } });
  });

  it("refuses a player who isn't an admin, and a signed-out request", async () => {
    useSession(player.session);
    expect(await pool({ category: KEY })).toEqual({ status: 403, body: { ok: false, error: "admins_only" } });
    cookieJar.clear();
    expect((await pool({ category: KEY })).status).toBe(401);
  });
});
