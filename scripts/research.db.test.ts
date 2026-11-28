// A researched list's way into the answer database (docs/milestones/M23-23a-researched-lists.md, criteria 2 to 4), against
// the local stack (run with `npm run test:db`). The first two describes read the base `npm run base -- load all` left
// there; where no base is loaded (CI's fresh stack) they load the three lists themselves and take them out again, so there
// "refuses" only shows a name absent from the list isn't judged in: the old WordNet members it refuses are in a loaded
// base alone. The third makes its own small category and takes it out again.
import { readFileSync } from "node:fs";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ResearchList } from "../src/content/list.ts";
import { normalize } from "../src/content/puzzle.ts";
import { thingId } from "../src/content/thing-id.ts";
import { loadResearch } from "./base.ts";
import { localStack } from "./slot.ts";

const db = new pg.Client({ connectionString: localStack().databaseUrl });
beforeAll(() => db.connect());
afterAll(() => db.end());

const KEYS = ["bed", "acid", "cake", "cheese", "bread", "pasta", "soup", "candy", "sandwich", "hat", "bag", "footwear", "fabric", "kitchen_utensil", "tool", "knot", "bone", "gemstone", "color", "sport", "dance"];
const file = (key: string) => JSON.parse(readFileSync(`content/lists/${key}.json`, "utf8")) as ResearchList;
// An answer's permanent ID: its list's key and its name as typed, with "research" as its source.
const answerId = (key: string, name: string) => thingId("research", `${key}/${normalize(name)}`);

// On a stack with no base loaded, the lists as `load all` would load and define them; taken out again after.
let loadedHere = false;
beforeAll(async () => {
  const { rows } = await db.query("select key from private.category where key = any($1)", [KEYS]);
  if (rows.length === KEYS.length) return;
  loadedHere = true;
  await loadResearch(db, KEYS.map(file));
  for (const key of KEYS) await db.query("select private.define_category($1, $1, 'research', $1, null)", [key]);
});
afterAll(async () => {
  if (!loadedHere) return;
  await db.query("delete from private.category where key = any($1)", [KEYS]);
  await db.query("delete from private.thing where id in (select thing_id from private.thing_source where source = 'research' and split_part(source_id, '/', 1) = any($1))", [KEYS]);
  await db.query("delete from private.base_log where (action = 'import' and actor = 'source:research' and detail ->> 'snapshot' = 'lists') or (action = 'define_category' and detail ->> 'key' = any($1))", [KEYS]);
});

describe("a researched category's members", () => {
  it.each(KEYS)("%s has exactly the answers of its list file", async (key) => {
    const { rows } = await db.query<{ id: string }>("select m::text as id from private.category_members($1) as m", [key]);
    expect(new Set(rows.map((r) => r.id))).toEqual(new Set(file(key).answers.map((a) => answerId(key, a.name))));
  });
});

// Through the admin-only function a test run uses, as a draft would be judged now.
describe("typed answers on the researched lists", () => {
  const admin = new pg.Client({ connectionString: localStack().adminDatabaseUrl });
  beforeAll(() => admin.connect());
  afterAll(() => admin.end());

  async function accepted(key: string, typed: string): Promise<boolean> {
    const { rows: cat } = await admin.query<{ root: string }>("select root::text from private.category where key = $1", [key]);
    const question = { category: key, root: cat[0].root, member_of: null };
    const { rows } = await admin.query("select * from private.resolve_in($1::jsonb, now(), array[$2])", [JSON.stringify(question), normalize(typed)]);
    return rows.length > 0;
  }

  it.each([["bed", "king"], ["bed", "twin"], ["acid", "citric"], ["acid", "nitric"], ["cake", "bundt"], ["cake", "chocolate"], ["hat", "beanie"], ["kitchen_utensil", "air fryer"], ["bone", "pelvic"], ["bone", "clavical"], ["bone", "distal metatarsal"], ["bag", "sleeping"], ["bag", "sling"], ["bag", "plastic"], ["knot", "dead"], ["cake", "tirimisu"], ["bed", "water"]])("accepts %s: %s", async (key, typed) => {
    expect(await accepted(key, typed)).toBe(true);
  });
  it.each([["cake", "tortilla"], ["cake", "dog biscuit"], ["acid", "lansoprazole"], ["bed", "couch"]])("refuses %s: %s", async (key, typed) => {
    expect(await accepted(key, typed)).toBe(false);
  });
});

// A day approved before a load keeps judging by the answers it was approved with: its own small category, loaded twice
// in committed transactions (the second load must come after the day's approval), taken out again after.
describe("a day approved before a load", () => {
  const KEY = "rs_demo";
  const DATE = "2000-01-03";
  const list = (names: string[]): ResearchList => ({ format: 1, category: KEY, passes: 1, borderline_seen: null, answers: names.map((name) => ({ name, aliases: [], tier: "common" as const })) });

  async function clean(): Promise<void> {
    await db.query("delete from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date", [DATE]);
    await db.query("delete from private.category where key = $1", [KEY]);
    await db.query("delete from private.thing where id in (select thing_id from private.thing_source where source = 'research' and source_id like 'rs\\_demo%')");
    await db.query("delete from private.base_log where (action = 'import' and detail ->> 'snapshot' = 'rs-test') or (action = 'define_category' and detail ->> 'key' = $1)", [KEY]);
  }
  beforeAll(clean);
  afterAll(clean);

  it("still refuses an answer the list gained afterwards, which a draft judged now accepts", async () => {
    await loadResearch(db, [list(["alpha"])], "rs-test");
    await db.query("select private.define_category($1, 'demo', 'research', $1, null)", [KEY]);
    const { rows } = await db.query<{ root: string }>("select root::text from private.category where key = $1", [KEY]);
    const question = { prompt: "Name a demo", category: KEY, root: rows[0].root, member_of: null, levels: {}, rare: [], size: 1 };
    const content = { format: 4, game_id: "offbeat", date: DATE, approved_at: (await db.query<{ now: string }>("select now()::text")).rows[0].now, questions: [question] };
    await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ('offbeat', $1::date, $2::jsonb)", [DATE, JSON.stringify(content)]);
    // The load comes after the approval: pg_sleep keeps the two clocks apart.
    await db.query("select pg_sleep(0.05)");
    await loadResearch(db, [list(["alpha", "beta"])], "rs-test");

    const onDay = async (typed: string) => (await db.query("select * from private.resolve_answer('offbeat', $1::date, 0, array[$2])", [DATE, typed])).rows.length;
    expect(await onDay("alpha")).toBe(1);
    expect(await onDay("beta")).toBe(0);
    const now = async (typed: string) => (await db.query("select * from private.resolve_in($1::jsonb, now(), array[$2])", [JSON.stringify(question), typed])).rows.length;
    expect(await now("beta")).toBe(1);
  });
});
