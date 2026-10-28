// The answer audit's route against the local stack (run with `npm run test:db`;
// docs/milestones/M13-13b-learning-from-misses.md): an admin lists what was learned and decides, a decision that no
// longer fits is 409, a malformed one 400; a player who isn't an admin gets 403, signed out 401; a near-typo names the
// answer it's near, to link in one click (M14 14b-2b-2b). Three typists miss on the fixture day through
// private.record_miss with this run's own texts, and a near-typo of the fixture's, which are removed afterwards.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import type { Review } from "@/admin/audit";
import { getPool } from "@/lib/db";
import { fixtureId } from "@/test/answer-fixture";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, removeFixtures } from "@/test/puzzles";
import { apiRequest, cookieJar } from "@/test/request-scope";
import { GET as auditGet, POST as auditPost } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const admin = { username: `aa${RUN}`, session: new Map<string, string>() };
const player = { username: `ap${RUN}`, session: new Map<string, string>() };
// A new word and one holding a listed word (LDNOOBW's "2g1c").
const NEW = `wolpertinger ${RUN}`;
const LISTED = `${RUN} 2g1c`;
// One edit from bear (and its plural, the same answer) and from nothing else in the fixture's animals. It's the
// fixture's, not this run's, so its review and the name a link gives bear (which would make it an answer, and can't
// be given twice) are cleared before and after.
const NEAR = "bearz";
const clearNear = async () => {
  await getPool().query("delete from private.miss_review where category = 'fixture_animal' and text = $1", [NEAR]);
  await getPool().query("delete from private.thing_alias where alias = $1 and source_ref like 'miss_review:%'", [NEAR]);
};

const list = async () => {
  const r = await auditGet(apiRequest("/api/admin/audit", { method: "GET" }));
  return { status: r.status, body: await r.json() };
};
const post = async (body: unknown) => {
  const r = await auditPost(apiRequest("/api/admin/audit", { method: "POST", body }));
  return { status: r.status, body: await r.json() };
};
const reviewOf = (reviews: Review[], text: string) => reviews.find((r) => r.text === text)!;

beforeAll(async () => {
  useLocalStack();
  const db = getPool();
  const { rows } = await db.query<{ today: string }>("select private.today()::text as today");
  await ensurePuzzle(rows[0].today);
  await clearNear();
  for (let n = 1; n <= 3; n++) {
    const { rows: user } = await db.query<{ id: string }>("insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id", [
      `${RUN}-t${n}@example.test`,
    ]);
    await db.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, 'offbeat', $2::date)", [user[0].id, rows[0].today]);
    for (const [text, listed] of [[NEW, false], [LISTED, true]] as const) {
      await db.query("select private.record_miss($1, 'offbeat', $2::date, 0, $3, $3, false, $4, 3, 1)", [user[0].id, rows[0].today, text, listed]);
    }
    await db.query("select private.record_miss($1, 'offbeat', $2::date, 0, $3, $3, true, false, 3, 1)", [user[0].id, rows[0].today, NEAR]);
  }
});

afterAll(async () => {
  const db = getPool();
  const { rows } = await db.query<{ thing_id: string | null }>(
    "delete from private.miss_review where text = any($1) returning thing_id",
    [[NEW, LISTED]],
  );
  await db.query("delete from private.thing where id = any($1)", [rows.map((r) => r.thing_id).filter(Boolean)]);
  await clearNear();
  await db.query("delete from auth.users where email like $1", [`%${RUN}@example.test`]);
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removeFixtures();
  await db.end();
});

describe("/api/admin/audit", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in an admin and a player", async () => {
    for (const p of [admin, player]) {
      p.session = (await signIn(`${p.username}@example.test`)).session;
      expect((await createProfile(apiRequest("/api/profile", { method: "POST", body: { username: p.username } }))).status).toBe(201);
    }
    await getPool().query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${admin.username}@example.test`]);
  });

  it("lists an accepted and a held text for an admin, and counts what waits", async () => {
    useSession(admin.session);
    const { status, body } = await list();
    expect(status).toBe(200);
    expect(reviewOf(body.reviews, NEW)).toMatchObject({ outcome: "accepted", players: 3, thing: { name: NEW }, decision: null });
    expect(reviewOf(body.reviews, LISTED)).toMatchObject({ outcome: "held", players: 3, thing: null, decision: null });
    expect(body.open).toBeGreaterThanOrEqual(1);
    const count = await auditGet(apiRequest("/api/admin/audit?count", { method: "GET" }));
    expect(await count.json()).toEqual({ ok: true, open: body.open });
  });

  it("refuses a malformed decision", async () => {
    useSession(admin.session);
    const { reviews } = (await list()).body;
    const id = reviewOf(reviews, NEW).id;
    expect((await post({ id, action: "erase" })).status).toBe(400);
    expect((await post({ id: "1", action: "undo" })).status).toBe(400);
    expect((await post({ id, action: "link" })).status).toBe(400);
    expect((await post({ id, action: "undo", thing: "not-a-uuid" })).status).toBe(400);
  });

  it("undoes an accepted text, and accepts a held one", async () => {
    useSession(admin.session);
    const { reviews } = (await list()).body;
    expect(await post({ id: reviewOf(reviews, NEW).id, action: "undo" })).toEqual({ status: 200, body: { ok: true } });
    expect(await post({ id: reviewOf(reviews, LISTED).id, action: "accept" })).toEqual({ status: 200, body: { ok: true } });
    const after = (await list()).body.reviews;
    expect(reviewOf(after, NEW).decision).toBe("undone");
    expect(reviewOf(after, LISTED)).toMatchObject({ decision: "accepted", thing: { name: LISTED } });
  });

  it("names the answer a waiting near-typo is near, and links it in one click", async () => {
    useSession(admin.session);
    const bear = { id: fixtureId(0, "bear"), name: "bear" };
    expect(reviewOf((await list()).body.reviews, NEAR)).toMatchObject({ outcome: "near_typo", decision: null, near: [bear] });
    expect(await post({ id: reviewOf((await list()).body.reviews, NEAR).id, action: "link", thing: bear.id })).toEqual({ status: 200, body: { ok: true } });
    // Decided, it's near nothing to link to.
    expect(reviewOf((await list()).body.reviews, NEAR)).toMatchObject({ decision: "linked", chosen: bear, near: [] });
  });

  it("answers 409 to a decision that no longer fits", async () => {
    useSession(admin.session);
    const { reviews } = (await list()).body;
    expect(await post({ id: reviewOf(reviews, NEW).id, action: "undo" })).toEqual({ status: 409, body: { ok: false, error: "audit_invalid" } });
  });

  it("refuses a player who isn't an admin, and a signed-out request", async () => {
    useSession(player.session);
    expect(await list()).toEqual({ status: 403, body: { ok: false, error: "admins_only" } });
    expect((await post({ id: 1, action: "dismiss" })).status).toBe(403);
    cookieJar.clear();
    expect((await list()).status).toBe(401);
  });
});
