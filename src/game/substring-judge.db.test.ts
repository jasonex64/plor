// The judge under load, against the local stack (`npm run test:db`; docs/milestones/M16-16d-playing-it.md). pgTAP covers
// its rules in one transaction; only real connections can show tries in parallel can't slip past the lockout, and that
// a load is all or nothing.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { loadDictionary } from "../../scripts/base.ts";
import { LOCAL_DATABASE_URL } from "@/test/local-stack";
import { SUBSTRING_LOCKOUT_MS } from "@/config/tunables";
import { SUBSTRINGS_ID } from "@/platform/game";

const RUN = Date.now().toString(36);
const db = new pg.Pool({ connectionString: LOCAL_DATABASE_URL, max: 8 });
let user = "";
let day = "";

beforeAll(async () => {
  user = (await db.query<{ id: string }>("insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id", [`${RUN}@example.test`])).rows[0].id;
  day = (await db.query<{ d: string }>("select (private.today() + 450)::text as d")).rows[0].d;
  const content = { format: 1, game_id: SUBSTRINGS_ID, date: day, rounds: ["ck", "ro", "af", "own", "hes", "no", "zz"], bonus_letter: "f" };
  await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [SUBSTRINGS_ID, day, content]);
  await db.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [user, SUBSTRINGS_ID, day]);
});

afterAll(async () => {
  await db.query("delete from private.round_reject where user_id = $1", [user]);
  await db.query("delete from private.run where user_id = $1", [user]);
  await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [SUBSTRINGS_ID, day]);
  await db.query("delete from auth.users where id = $1", [user]);
  await db.end();
});

describe("the judge", () => {
  it("lets one of many parallel tries through the lockout", async () => {
    const tries = Array.from({ length: 8 }, () => db.query<{ r: { outcome: string } }>("select private.judge_word($1, $2::date, 'zzzqqq', 'zzzqqq', 'zzzqqq') as r", [user, day]));
    const outcomes = (await Promise.all(tries)).map((res) => res.rows[0].r.outcome).sort();
    expect(outcomes).toEqual(["locked", "locked", "locked", "locked", "locked", "locked", "locked", "not_a_word"]);
    const rejected = await db.query("select from private.round_reject where user_id = $1", [user]);
    expect(rejected.rowCount).toBe(1);
  });

  it("holds the lockout to the tunable, as the database and the app must agree", async () => {
    await db.query("update private.round_reject set rejected_at = statement_timestamp() - make_interval(secs => $2::float / 1000) where user_id = $1", [user, SUBSTRING_LOCKOUT_MS - 100]);
    const held = await db.query<{ r: { outcome: string } }>("select private.judge_word($1, $2::date, 'zzzqqq', 'zzzqqq', 'zzzqqq') as r", [user, day]);
    expect(held.rows[0].r.outcome).toBe("locked");
    await db.query("update private.round_reject set rejected_at = statement_timestamp() - make_interval(secs => $2::float / 1000) where user_id = $1", [user, SUBSTRING_LOCKOUT_MS + 100]);
    const freed = await db.query<{ r: { outcome: string } }>("select private.judge_word($1, $2::date, 'zzzqqq', 'zzzqqq', 'zzzqqq') as r", [user, day]);
    expect(freed.rows[0].r.outcome).toBe("not_a_word");
  });
});

describe("loadDictionary", () => {
  it("replaces the list, or on a failure leaves it as it was", async () => {
    const client = new pg.Client({ connectionString: LOCAL_DATABASE_URL });
    await client.connect();
    // The local list may be the real one: it's put back after.
    await client.query("create temp table saved as select * from private.dictionary_word");
    try {
      await loadDictionary(client, [{ key: "apple", spelling: "apple", everyday: true }, { key: "cafe", spelling: "café" }]);
      const loaded = await client.query("select word_key, spelling, plain, everyday from private.dictionary_word order by word_key");
      expect(loaded.rows).toEqual([
        { word_key: "apple", spelling: "apple", plain: "apple", everyday: true },
        { word_key: "cafe", spelling: "café", plain: "cafe", everyday: false },
      ]);
      await expect(loadDictionary(client, [{ key: "pear", spelling: "pear" }, { key: "pear", spelling: "pear" }])).rejects.toThrow();
      const kept = await client.query("select word_key from private.dictionary_word order by word_key");
      expect(kept.rows.map((r) => r.word_key)).toEqual(["apple", "cafe"]);
    } finally {
      await client.query("delete from private.dictionary_word");
      await client.query("insert into private.dictionary_word select * from saved");
      await client.end();
    }
  });
});
