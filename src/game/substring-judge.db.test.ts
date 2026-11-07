// The judge under load, against the local stack (`npm run test:db`; docs/milestones/M16-16d-playing-it.md). pgTAP covers
// its rules in one transaction; only real connections can show tries in parallel can't slip past the lockout, and that
// a load is all or nothing.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { loadDictionary } from "../../scripts/base.ts";
import { LOCAL_DATABASE_URL } from "@/test/local-stack";
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

  it("holds the lockout at 0.5 seconds", async () => {
    await db.query("update private.round_reject set rejected_at = statement_timestamp() - make_interval(secs => $2::float / 1000) where user_id = $1", [user, 400]);
    const held = await db.query<{ r: { outcome: string } }>("select private.judge_word($1, $2::date, 'zzzqqq', 'zzzqqq', 'zzzqqq') as r", [user, day]);
    expect(held.rows[0].r.outcome).toBe("locked");
    await db.query("update private.round_reject set rejected_at = statement_timestamp() - make_interval(secs => $2::float / 1000) where user_id = $1", [user, 600]);
    const freed = await db.query<{ r: { outcome: string } }>("select private.judge_word($1, $2::date, 'zzzqqq', 'zzzqqq', 'zzzqqq') as r", [user, day]);
    expect(freed.rows[0].r.outcome).toBe("not_a_word");
  });
});

describe("a run as plor_app", () => {
  it("reads its status, tries a word, and moves to the next round", async () => {
    const other = (await db.query<{ id: string }>("insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id", [`${RUN}-app@example.test`])).rows[0].id;
    await db.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [other, SUBSTRINGS_ID, day]);
    await db.query("insert into private.dictionary_word (word_key, spelling, plain) values ('qckq', 'qckq', 'qckq') on conflict do nothing");
    // Locally the routes connect as postgres, which can't take this role (src/game/runs.plor-app.db.test.ts).
    const app = new pg.Client({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres" });
    await app.connect();
    try {
      await app.query("set role plor_app");
      const tried = await app.query<{ r: { outcome: string } }>("select private.judge_word($1, $2::date, 'qckq', 'qckq', 'qckq') as r", [other, day]);
      expect(tried.rows[0].r.outcome).toBe("accepted");
      const status = await app.query("select answered, status from private.run_status where user_id = $1 and game_id = $2", [other, SUBSTRINGS_ID]);
      expect(status.rows).toEqual([{ answered: 1, status: "in_progress" }]);
      const next = `insert into private.question_open (user_id, game_id, puzzle_date, question_idx) values ($1, $2, $3::date, 1) on conflict do nothing`;
      await app.query(next, [other, SUBSTRINGS_ID, day]);
      await app.query(next, [other, SUBSTRINGS_ID, day]);
      const words = await app.query("select word from private.round_word where user_id = $1", [other]);
      expect(words.rows).toEqual([{ word: "qckq" }]);
    } finally {
      await app.end();
      await db.query("delete from private.dictionary_word where word_key = 'qckq'");
      await db.query("delete from auth.users where id = $1", [other]);
    }
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
