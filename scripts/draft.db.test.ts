// The drafting script's database steps against the local stack (run with `npm run test:db`): the easiest-first measure
// (M13 13d) and the familiar check (docs/milestones/M13-13c-rarity-and-the-host.md): at least 3 members in the day's levels that the host doesn't catch, itself or under
// a host answer, and that can be typed by some name past the stolen letters. private.approve_puzzle checks the same
// rule (supabase/tests/puzzle_entry.test.sql), with the same minimum (FAMILIAR_SAFE_MIN). On the fixture base
// (src/test/answer-fixture.ts), taken out again with this file's own small base once it's done (13f-3b-2).
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FAMILIAR_SAFE_MIN } from "../src/config/tunables.ts";
import type { Level, Puzzle } from "../src/content/puzzle.ts";
import { fixtureDraft, fixtureId, loadFixtureBase, removeFixtureBase, removeTestBase } from "../src/test/answer-fixture.ts";
import { bankFlags, bankProblems, expectedCatches, familiarLeft, oneHostCatch, resolveNames } from "./draft.ts";

const db = new pg.Client({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
const animal = (slug: string) => fixtureId(0, slug);
const levels = (...slugs: string[]): Record<string, Level> => Object.fromEntries(slugs.map((s) => [animal(s), "uncommon" as const]));
const question = (host: string[], uncommon: string[]) => ({ id: "q", prompt: "Name an animal", category: "fixture_animal", host_bank: host, uncommon, themes: [], added_by: "claude" as const });
const left = (hosts: string[], lv: Record<string, Level>, stolen: string[]) => familiarLeft(db, "fixture_animal", hosts.map(animal), lv, stolen);

beforeAll(async () => {
  await db.connect();
  await loadFixtureBase(db);
});
afterAll(async () => {
  await removeTestBase(db, "dt-%", "dt\\_%", "draft-letter-test");
  await removeFixtureBase(db);
  await db.end();
});

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
      item("dt-host", ["dekko"]), item("dt-a", ["daxo"]), item("dt-b", ["dimo"]), item("dt-c", ["dunzo", "zonbi"]), item("dt-e", ["zuzu", "dazu"]),
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

  it("refuses a host answer whose shown name doesn't start with the letter, as the draft does", async () => {
    // "dazu" names dt-e, a member by that name, but the host says it as "zuzu" (13e-10: a renamed thing broke animal_w).
    expect(await bankProblems(db, [{ ...question(["dekko", "dazu"], ["daxo"]), category: "dt_d" }])).toEqual([
      'q: host answer "dazu" shows as "zuzu", which doesn\'t start with its letter',
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

// The names a drafted question gives become its things (13a-2 review; 13f-3b-2): one member each, by name or by ID.
describe("resolveNames", () => {
  it("gives each name its one member, and refuses a name with several or none, naming the candidates", async () => {
    expect(await resolveNames(db, "fixture_animal", ["bear", `#${animal("dog")}`])).toEqual(new Map([["bear", animal("bear")], [`#${animal("dog")}`, animal("dog")]]));
    await expect(resolveNames(db, "fixture_animal", ["robin"])).rejects.toThrow(/^fixture_animal: "robin" names several members: /);
    await expect(resolveNames(db, "fixture_animal", ["unicorn"])).rejects.toThrow('fixture_animal: "unicorn" names no member');
    await expect(resolveNames(db, "fixture_animal", [`#${fixtureId(1, "banana")}`])).rejects.toThrow(`#${fixtureId(1, "banana")} is not a member`);
  });
});

// The soft guide's numbers (13c review; 13f-3b-2): per question, the expected share its host answers catch, the members
// under them included. As oneHostCatch's: bear (common, 0.4/2) with polar bear under it (rare, 0.2/6), dog (common).
describe("expectedCatches", () => {
  it("adds up what each question's host answers catch, and nothing for a question with none", async () => {
    const day = fixtureDraft("2000-01-01");
    const q = day.questions[0];
    const two: Puzzle = { ...day, questions: [{ ...q, host_answers: [animal("bear"), animal("dog")] }, { ...q, host_answers: [] }] };
    const [both, none] = await expectedCatches(db, two);
    expect(both).toBeCloseTo(0.2 + 0.2 / 6 + 0.2, 6);
    expect(none).toBe(0);
  });
});

// check-bank reads "#<id>" through private.thing_now, so a bank answer naming a retired ID still finds its thing (13e-9
// review; 13f-3b-2). The retirement is rolled back.
describe("bankProblems on a retired ID", () => {
  it("passes an answer naming a retired ID of a member", async () => {
    const retired = fixtureId(0, "old-dog");
    await db.query("begin");
    try {
      await db.query("insert into private.thing_retired (id, thing_id, source_ref) values ($1, $2, 'draft-test')", [retired, animal("dog")]);
      expect(await bankProblems(db, [question(["bear", `#${retired}`], ["cat", "fish"])])).toEqual([]);
    } finally {
      await db.query("rollback");
    }
  });
});

// The draft and approval agree on the familiar minimum (13c review; 13f-3b-2): FAMILIAR_SAFE_MIN familiar members the
// host doesn't catch pass both, one fewer fails both. The approval runs as an admin added for it, rolled back.
describe("the familiar minimum, in the draft and at approval", () => {
  it(`passes ${FAMILIAR_SAFE_MIN} safe familiar members and refuses one fewer, in both`, async () => {
    // Bear, the host, catches polar bear; dog, cat, fish and horse are the fixture's safe ones, enough for the minimum.
    const safe = ["dog", "cat", "fish", "horse"].slice(0, FAMILIAR_SAFE_MIN);
    expect(safe.length).toBe(FAMILIAR_SAFE_MIN);
    const day = (n: number) => {
      const draft = fixtureDraft("2999-01-01");
      draft.questions[0] = { ...draft.questions[0], host_bank: [animal("bear")], host_answers: [animal("bear")],
        levels: { [animal("bear")]: "common", ...Object.fromEntries(safe.slice(0, n).map((s) => [animal(s), "uncommon" as const])) } };
      return draft;
    };
    expect(await left(["bear"], day(FAMILIAR_SAFE_MIN).questions[0].levels, [])).toBe(true);
    expect(await left(["bear"], day(FAMILIAR_SAFE_MIN - 1).questions[0].levels, [])).toBe(false);
    const admin = fixtureId(0, "draft-test-admin");
    await db.query("begin");
    try {
      await db.query("insert into auth.users (id, email) values ($1, 'draft-test-admin@example.test')", [admin]);
      await db.query("insert into private.admin (user_id) values ($1)", [admin]);
      const approve = async (n: number) => {
        await db.query("savepoint a");
        try {
          await db.query("select private.approve_puzzle($1, $2)", [admin, day(n)]);
          return [];
        } catch (err) {
          return JSON.parse((err as pg.DatabaseError).detail!) as string[];
        } finally {
          await db.query("rollback to savepoint a");
        }
      };
      expect(await approve(FAMILIAR_SAFE_MIN)).toEqual([]);
      const refused = (await approve(FAMILIAR_SAFE_MIN - 1)).filter((p) => p.startsWith("question 1:"));
      expect(refused).toHaveLength(1);
      expect(refused[0]).toMatch(new RegExp(`^question 1: fewer than ${FAMILIAR_SAFE_MIN} familiar answers the host doesn't catch`));
    } finally {
      await db.query("rollback");
    }
  });
});

// check-bank's flags for the human (13f-4c): a host answer above a familiar one, and an answer of a status subset that
// holds another status too. The status subset is this test's own, rolled back.
describe("bankFlags", () => {
  it("flags a host answer above another familiar answer of its question", async () => {
    expect(await bankFlags(db, [question(["bear", "dog"], ["polar bear", "cat", "fish"])])).toEqual(['q: host answer "bear" is above "polar bear"']);
    expect(await bankFlags(db, [question(["bear", "dog"], ["cat", "fish"])])).toEqual([]);
  });

  it("flags an answer of a status subset that also holds another status", async () => {
    await db.query("begin");
    try {
      await db.query("select private.import_source('wikidata', 'bf-test', $1::jsonb)", [JSON.stringify([
        { id: "bf-ex", name: "bf extinct", aliases: [] }, { id: "bf-en", name: "bf endangered", aliases: [] }, { id: "bf-root", name: "bf root", aliases: [] },
        { id: "bf-a", name: "bf a", aliases: [{ alias: "bf a", kind: "name" }], kind_of: ["bf-root"], conservation_status: ["bf-ex", "bf-en"] },
        { id: "bf-b", name: "bf b", aliases: [{ alias: "bf b", kind: "name" }], kind_of: ["bf-root"], conservation_status: ["bf-ex"] },
      ])]);
      await db.query("select private.define_category('bf_base', 'bf thing', 'wikidata', 'bf-root', null)");
      await db.query(`select private.define_subset('bf_ex', 'bf extinct thing', 'bf_base', 'wikidata', '{"trait": "conservation_status", "values": ["bf-ex"]}')`);
      expect(await bankFlags(db, [{ ...question(["bf a", "bf b"], []), category: "bf_ex" }])).toEqual(['q: "bf a" also holds the status bf endangered']);
    } finally {
      await db.query("rollback");
    }
  });
});
