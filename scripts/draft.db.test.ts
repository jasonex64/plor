// The drafting script's database steps against the local stack (run with `npm run test:db`): the easiest-first measure
// (M13 13d) and the familiar check (docs/milestones/M13-13c-rarity-and-the-host.md): at least 3 members in the day's levels that the host doesn't catch, itself or under
// a host answer, and that can be typed by some name past the stolen letters. private.approve_puzzle checks the same
// rule (supabase/tests/puzzle_entry.test.sql). On the fixture base (src/test/answer-fixture.ts).
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Level } from "../src/content/puzzle.ts";
import { fixtureId, loadFixtureBase } from "../src/test/answer-fixture.ts";
import { bankProblems, familiarLeft, oneHostCatch } from "./draft.ts";

const db = new pg.Client({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
const animal = (slug: string) => fixtureId(0, slug);
const levels = (...slugs: string[]): Record<string, Level> => Object.fromEntries(slugs.map((s) => [animal(s), "uncommon" as const]));
const question = (host: string[], uncommon: string[]) => ({ id: "q", prompt: "Name an animal", category: "fixture_animal", host_bank: host, uncommon, themes: [], added_by: "claude" as const });
const left = (hosts: string[], lv: Record<string, Level>, stolen: string[]) => familiarLeft(db, "fixture_animal", hosts.map(animal), lv, stolen);

beforeAll(async () => {
  await db.connect();
  await loadFixtureBase(db);
});
afterAll(() => db.end());

describe("familiarLeft", () => {
  it("counts three familiar members the host doesn't catch, and refuses two", async () => {
    expect(await left(["bear"], levels("dog", "cat", "fish"), [])).toBe(true);
    expect(await left(["bear"], levels("dog", "cat"), [])).toBe(false);
  });

  it("leaves out a member a stolen letter keeps from being typed", async () => {
    // Fish goes by "fish" alone, so with F stolen only dog and cat are left.
    expect(await left(["bear"], levels("dog", "cat", "fish"), ["f"])).toBe(false);
  });

  it("leaves out a member under a host answer, and a member not in the levels", async () => {
    // Polar bear is under bear; horse is a member, but not familiar here.
    expect(await left(["bear"], levels("dog", "cat", "polar-bear"), [])).toBe(false);
  });

  it("counts a member typeable by another of its names", async () => {
    // The aardvark species is "aardvark" and "orycteropus afer": with K stolen, its scientific name still types.
    expect(await left(["bear"], levels("dog", "cat", "aardvark-species"), ["k"])).toBe(true);
  });
});

// A letter subset (13e-4a, O4): only names starting with its letter count, so a day that steals the letter at or
// before it leaves no familiar answer typeable and the letter search refuses that letter ("Yes, the draft skips it").
// Its own small base, with made-up names.
describe("familiarLeft on a letter subset", () => {
  const ref = (slug: string) => db.query<{ id: string }>("select private.thing_by_ref('wikidata', $1)::text as id", [slug]).then((r) => r.rows[0].id);
  beforeAll(async () => {
    const item = (id: string, names: string[]) => ({ id, name: names[0], aliases: names.map((alias, k) => ({ alias, kind: k ? "synonym" : "name" })), kind_of: ["dt-root"] });
    await db.query("select private.import_source('wikidata', 'draft-letter-test', $1::jsonb)", [JSON.stringify([
      { id: "dt-root", name: "dt thing", aliases: [] },
      item("dt-host", ["dekko"]), item("dt-a", ["daxo"]), item("dt-b", ["dimo"]), item("dt-c", ["dunzo", "zonbi"]),
    ])]);
    await db.query("select private.define_category('dt_base', 'dt thing', 'wikidata', 'dt-root', null)");
    await db.query(`select private.define_subset('dt_d', 'dt thing starting with D', 'dt_base', 'wikidata', '{"starts_with": "d"}')`);
  });
  const lv = async () => Object.fromEntries(await Promise.all(["dt-a", "dt-b", "dt-c"].map(async (s) => [await ref(s), "common" as const])));
  const fits = async (stolen: string[]) => familiarLeft(db, "dt_d", [await ref("dt-host")], await lv(), stolen);

  it("counts three names starting with the letter, and none once the letter is stolen", async () => {
    expect(await fits([])).toBe(true);
    expect(await fits(["d"])).toBe(false);
  });

  it("doesn't count a typeable name that doesn't start with the letter", async () => {
    // With U stolen, "dunzo" can't be typed; "zonbi" can, but doesn't start with D: two are left.
    expect(await fits(["u"])).toBe(false);
  });

  it("refuses a bank answer that names a member only by a name off the letter, and an ID that isn't a member", async () => {
    // "zonbi" is dunzo's other name, which the draft can't read for a D subset (13e-9 review: "hockey" for sport F).
    const cat = `#${animal("cat")}`;
    expect(await bankProblems(db, [{ ...question(["dekko", "daxo"], ["zonbi", cat]), category: "dt_d" }])).toEqual([
      'q: "zonbi" names no member',
      `q: ${cat} is not a member`,
    ]);
  });
});

// The bank check (13e-9): each answer gives one member as the draft reads it, and no two answers name one thing.
describe("bankProblems", () => {
  it("passes answers that each name one member, by name or by ID", async () => {
    expect(await bankProblems(db, [question(["bear", "dog"], ["cat", `#${animal("fish")}`])])).toEqual([]);
  });

  it("names an answer fitting two members or none, and two answers naming one thing", async () => {
    const problems = await bankProblems(db, [question(["robin", "unicorn"], ["cat", `#${animal("cat")}`, "robin"])]);
    expect(problems.map((p) => p.replace(/ several members: .*/, " several"))).toEqual([
      'q: "robin" names several',
      'q: "unicorn" names no member',
      `q: "cat" and "#${animal("cat")}" name the same thing`,
      'q: "robin" names several',
    ]);
  });
});

describe("oneHostCatch", () => {
  it("averages, over the host bank, the expected catch of each answer as the only host", async () => {
    // Bear as the host catches bear (common, 0.4/2) and polar bear under it (rare, 0.2/6): 0.2333. Dog catches dog alone:
    // 0.2. The mean is 0.2167. The question names bear as its host answer, which the measure ignores. On a date before any
    // play, so nothing is pooled.
    const question = {
      prompt: "Name an animal",
      category: "fixture_animal",
      host_bank: [animal("bear"), animal("dog")],
      host_answers: [animal("bear")],
      levels: { [animal("bear")]: "common" as const, [animal("dog")]: "common" as const, ...levels("cat", "fish", "horse") },
    };
    expect(await oneHostCatch(db, "2000-01-01", question)).toBeCloseTo((0.2 + 0.2 / 6 + 0.2) / 2, 6);
  });
});
