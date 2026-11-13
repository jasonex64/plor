// Friend requests and blocks as plor_app really does them: its grants and policies, the pair lock it takes on two
// profiles, and the two triggers that run with its rights (docs/milestones/M17-profiles-and-friend-requests.md, 17a,
// "Grants and policies" and "Races"). Locally the routes connect as postgres, so this file connects with the role
// set to plor_app; the functions under test open their own transactions, so the role is the connection's, not a
// `set local` as in src/groups/groups.plor-app.db.test.ts.
import { randomUUID } from "node:crypto";
import { DatabaseError, Pool } from "pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { AppError } from "@/lib/http";
import { acceptRequest, blockPlayer, listReceived, listSent, sendRequest, unblockPlayer } from "./requests";

const URL = "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres";
const admin = new Pool({ connectionString: URL, max: 1 });
const app = new Pool({ connectionString: URL, options: "-c role=plor_app" });
const [a, b] = [randomUUID(), randomUUID()].toSorted();
const name = (id: string) => `q${id.slice(0, 8)}${id.slice(-6)}`;
// How many times each race is run; the test's size, not a limit of the app.
const ROUNDS = 10;

const countOf = async (table: "friendship" | "friend_request" | "block") => {
  const column = { friendship: ["user_a", "user_b"], friend_request: ["sender", "receiver"], block: ["blocker", "blocked"] }[table];
  const { rows } = await admin.query<{ n: number }>(
    `select count(*)::int as n from private.${table} where $1::uuid in (${column.join(", ")}) and $2::uuid in (${column.join(", ")})`,
    [a, b],
  );
  return rows[0].n;
};
const clear = async () => {
  for (const table of ["friendship", "friend_request", "block"] as const) {
    const column = { friendship: "user_a", friend_request: "sender", block: "blocker" }[table];
    await admin.query(`delete from private.${table} where ${column} in ($1, $2)`, [a, b]);
  }
};

beforeAll(async () => {
  for (const id of [a, b]) {
    await admin.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@example.test`]);
    await admin.query("insert into private.profile (user_id, username) values ($1, $2)", [id, name(id)]);
  }
});

afterAll(async () => {
  await admin.query("delete from auth.users where id in ($1, $2)", [a, b]);
  await admin.end();
  await app.end();
});

it("sends, accepts, blocks and unblocks as plor_app, which can't delete a block itself", async () => {
  expect((await app.query("select current_user as role")).rows[0].role).toBe("plor_app");
  expect(await sendRequest(app, a, name(b))).toBe("sent");
  expect((await listSent(app, a)).map((p) => p.username)).toEqual([name(b)]);
  expect((await listReceived(app, b)).map((p) => p.username)).toEqual([name(a)]);
  await acceptRequest(app, b, name(a));
  expect(await countOf("friendship")).toBe(1);

  // The trigger ends the friendship with plor_app's own delete on it.
  await blockPlayer(app, a, name(b));
  expect([await countOf("friendship"), await countOf("block")]).toEqual([0, 1]);
  const refused = await app
    .query("insert into private.friendship (user_a, user_b) values ($1, $2)", [a, b])
    .then(() => null, (err: unknown) => err);
  expect(refused).toBeInstanceOf(DatabaseError);
  expect((refused as DatabaseError).code).toBe("OB016");
  const denied = await app.query("delete from private.block where blocker = $1", [a]).then(() => null, (err: unknown) => err);
  expect((denied as DatabaseError).code).toBe("42501");
  expect(await countOf("block")).toBe(1);

  await unblockPlayer(app, a, name(b));
  expect(await countOf("block")).toBe(0);
});

it("two players sending to each other at the same moment always end as friends with no request left", async () => {
  for (let round = 0; round < ROUNDS; round++) {
    await clear();
    const states = await Promise.all([sendRequest(app, a, name(b)), sendRequest(app, b, name(a))]);
    expect(states.toSorted()).toEqual(["friends", "sent"]);
    expect([await countOf("friendship"), await countOf("friend_request")]).toEqual([1, 0]);
  }
});

it("a block racing an accept never leaves a friendship beside the block", async () => {
  for (let round = 0; round < ROUNDS; round++) {
    await clear();
    expect(await sendRequest(app, a, name(b))).toBe("sent");
    const [accepted] = await Promise.all([
      acceptRequest(app, b, name(a)).then(() => "accepted", (err: unknown) => err),
      blockPlayer(app, a, name(b)),
    ]);
    // The block first: its trigger took the request back, so the accept finds none. The accept first: fine too.
    if (accepted !== "accepted") expect(accepted).toMatchObject({ code: "request_not_found", status: 404 } satisfies Partial<AppError>);
    expect([await countOf("friendship"), await countOf("friend_request"), await countOf("block")]).toEqual([0, 0, 1]);
  }
  await clear();
});
