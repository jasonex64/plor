// The load's database steps against the local stack (run with `npm run test:db`).
// One load at a time (docs/milestones/M13-13f-3-import-and-draft-tools.md, 13f-3b-1, item 1): `load all` holds the
// load lock in its session from private.load_begin to private.load_finish, so a second session's load_begin is refused
// instead of emptying the first one's load_seen rows. Two sessions against the local stack (run with `npm run
// test:db`); supabase/tests/load_sync.test.sql covers the rest in one session. Each load_begin runs in a transaction
// rolled back, so the base keeps what it had; the lock, a session's, outlives the rollback.
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadFixtureBase } from "../src/test/answer-fixture.ts";
import { checkWithin } from "./base.ts";

const url = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const first = new pg.Client({ connectionString: url });
const second = new pg.Client({ connectionString: url });
let firstOpen = true;

async function begin(client: pg.Client): Promise<void> {
  await client.query("begin");
  try {
    await client.query("select private.load_begin()");
  } finally {
    await client.query("rollback");
  }
}

beforeAll(async () => {
  await first.connect();
  await second.connect();
});
afterAll(async () => {
  if (firstOpen) await first.end();
  await second.end();
});

it("refuses a second session's load while one is open, and takes it once the first session is gone", async () => {
  await begin(first);
  await expect(begin(second)).rejects.toThrow("load_begin: another load is running; wait for it to finish");
  // A load script that dies leaves no lock behind: the lock goes with its session.
  await first.end();
  firstOpen = false;
  await begin(second);
  const { rows } = await second.query<{ open: boolean }>("select private.load_open() as open");
  expect(rows[0].open).toBe(true);
  await second.query("select pg_advisory_unlock_all()");
});

// A category within another (13e-7): the check `load all` runs on each, refusing one whose root isn't under the other's
// (13e-7 review; 13f-3b-2). On the fixture base and a category rooted at its bear, in a transaction rolled back.
describe("checkWithin", () => {
  it("takes a category whose root is under the other's, and refuses one whose isn't", async () => {
    await second.query("begin");
    try {
      await loadFixtureBase(second);
      await second.query("select private.define_category('fixture_bear', 'bear', 'wikidata', 'fixture_animal-bear', null)");
      await expect(checkWithin(second, "fixture_bear", "fixture_animal")).resolves.toBeUndefined();
      await expect(checkWithin(second, "fixture_fruit", "fixture_animal")).rejects.toThrow("fixture_fruit says it's within fixture_animal, but its root isn't under fixture_animal's");
    } finally {
      await second.query("rollback");
    }
  });
});
