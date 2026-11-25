// The lists-only hosted load (docs/milestones/M23-23b-research-and-review.md, 23b-3), against the local stack (run with
// `npm run test:db`): into a database that has a base, it re-points a question at its researched list and its subset
// with it, leaves a day approved before judging as it did, leaves every other category's answers alone, changes
// nothing on a second run, and writes nothing on a wrong name or a category that fails. Its own small category,
// loaded in committed transactions and taken out again.
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CategoryDef } from "../src/content/categories.ts";
import type { ResearchList } from "../src/content/list.ts";
import { removeTestBase } from "../src/test/answer-fixture.ts";
import { hostedLoadLists } from "./base.ts";
import { localStack } from "./slot.ts";

const KEY = "hl_demo";
const SUBSET = "hl_demo_a";
const OTHER = "hl_other";
const SNAPSHOT = "hl-test";
const HOST = "127.0.0.1";
const db = new pg.Client({ connectionString: localStack().databaseUrl });
const list = (...names: string[]): ResearchList => ({ format: 1, category: KEY, passes: 2, borderline_seen: null, answers: names.map((name) => ({ name, aliases: [], tier: "common" as const })) });
const CATEGORIES: CategoryDef[] = [
  { key: KEY, name: "demo", source: "research", root: KEY },
  { key: SUBSET, name: "demo starting with A", of: KEY, starts_with: "a" },
];
const logged = () => vi.spyOn(console, "log").mockImplementation(() => {});
const yes = async () => HOST;

async function clean(): Promise<void> {
  await db.query("delete from private.category where key in ($1, $2)", [KEY, SUBSET]);
  await db.query("delete from private.thing where id in (select thing_id from private.thing_source where source = 'research' and split_part(source_id, '/', 1) = $1)", [KEY]);
  await db.query("delete from private.base_log where (action = 'import' and detail ->> 'snapshot' = $1) or (action = 'define_category' and detail ->> 'key' in ($2, $3))", [SNAPSHOT, KEY, SUBSET]);
  await removeTestBase(db, "hl-%", "hl\\_%", "hl-old");
}

// The names a category answers with now.
async function members(key: string): Promise<string[]> {
  const { rows } = await db.query<{ name: string }>("select t.name from private.thing t where t.id in (select private.category_members($1)) order by 1", [key]);
  return rows.map((r) => r.name);
}
// Whether a question, as a day stored it, takes this text as of a time.
async function counts(question: object, asOf: string, text: string): Promise<boolean> {
  const { rows } = await db.query("select from private.resolve_in($1::jsonb, $2::timestamptz, array[$3])", [JSON.stringify(question), asOf, text]);
  return rows.length > 0;
}
// Everything a load could write, but the log (a second run logs again).
const everything = async () => (await db.query(`select (select count(*) from private.thing)::int as things, (select count(*) from private.fact)::int as facts,
  (select count(*) from private.fact where removed_at is not null)::int as ended, (select count(*) from private.thing_alias)::int as aliases,
  (select count(*) from private.category)::int as categories`)).rows[0];

let dayQuestion: object;
let dayAsOf = "";

beforeAll(() => db.connect());
afterAll(async () => {
  await clean();
  await db.end();
});
// A base as plor.app has one: the demo question answered from Wikidata (ant, old bee), another question beside it, and
// a day approved on the demo question then.
beforeEach(async () => {
  await clean();
  const item = (id: string, name: string, under?: string) => ({ id, name, aliases: under ? [{ alias: name, kind: "name" }] : [], ...(under ? { kind_of: [under] } : {}) });
  await db.query("select private.import_source('wikidata', 'hl-old', $1::jsonb)", [JSON.stringify([
    item("hl-root", "hl root"), item("hl-ant", "ant", "hl-root"), item("hl-bee", "old bee", "hl-root"),
    item("hl-other-root", "hl other root"), item("hl-owl", "owl", "hl-other-root"),
  ])]);
  await db.query("select private.define_category($1, 'demo', 'wikidata', 'hl-root', null)", [KEY]);
  await db.query("select private.define_category($1, 'other', 'wikidata', 'hl-other-root', null)", [OTHER]);
  const { rows } = await db.query<{ root: string; now: string }>("select root::text, clock_timestamp()::text as now from private.category where key = $1", [KEY]);
  dayQuestion = { category: KEY, root: rows[0].root };
  dayAsOf = rows[0].now;
});

describe("the lists-only hosted load", () => {
  it("points the question and its subset at the list, leaving the old day and every other category as they were", async () => {
    const log = logged();
    try {
      expect(await members(KEY)).toEqual(["ant", "old bee"]);
      await hostedLoadLists(db, HOST, yes, [list("apple", "plum")], CATEGORIES);
      expect(await members(KEY)).toEqual(["apple", "plum"]);
      expect(await members(SUBSET)).toEqual(["apple"]);
      expect(await members(OTHER)).toEqual(["owl"]);
      // The day approved before the load judges by its own stored question, as of its own time.
      expect(await counts(dayQuestion, dayAsOf, "old bee")).toBe(true);
      expect(await counts(dayQuestion, dayAsOf, "plum")).toBe(false);
      expect(log.mock.calls.map((c) => c[0]).join("\n")).toMatch(/DEFINED 2 categories of the lists: hl_demo, hl_demo_a/);
    } finally {
      log.mockRestore();
    }
  });

  it("changes nothing but the log on a second run", async () => {
    const log = logged();
    try {
      await hostedLoadLists(db, HOST, yes, [list("apple", "plum")], CATEGORIES);
      const before = await everything();
      await hostedLoadLists(db, HOST, yes, [list("apple", "plum")], CATEGORIES);
      expect(await everything()).toEqual(before);
      expect(await members(KEY)).toEqual(["apple", "plum"]);
    } finally {
      log.mockRestore();
    }
  });

  it("a typed name that isn't the host's writes nothing and says so", async () => {
    const log = logged();
    try {
      const before = await everything();
      await expect(hostedLoadLists(db, HOST, async () => "localhost", [list("apple")], CATEGORIES)).rejects.toThrow(/what you typed isn't 127\.0\.0\.1.*nothing was written/);
      expect(await everything()).toEqual(before);
    } finally {
      log.mockRestore();
    }
  });

  it("a category that fails to define takes the lists' answers back with it", async () => {
    const log = logged();
    try {
      const before = await everything();
      const broken: CategoryDef[] = [CATEGORIES[0], { key: SUBSET, name: "broken", of: KEY, fact: { trait: "genre", values: ["hl-nothing"] } }];
      await expect(hostedLoadLists(db, HOST, yes, [list("apple")], broken)).rejects.toThrow(/define_subset/);
      expect(await everything()).toEqual(before);
      expect(await members(KEY)).toEqual(["ant", "old bee"]);
    } finally {
      log.mockRestore();
    }
  });
});
