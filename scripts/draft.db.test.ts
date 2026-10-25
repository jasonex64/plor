// The drafting script's database steps against the local stack (run with `npm run test:db`): the easiest-first measure
// (M13 13d) and the familiar check (docs/milestones/M13-13c-rarity-and-the-host.md): at least 3 members in the day's levels that the host doesn't catch, itself or under
// a host answer, and that can be typed by some name past the stolen letters. private.approve_puzzle checks the same
// rule (supabase/tests/puzzle_entry.test.sql). On the fixture base (src/test/answer-fixture.ts).
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Level } from "../src/content/puzzle.ts";
import { fixtureId, loadFixtureBase } from "../src/test/answer-fixture.ts";
import { familiarLeft, oneHostCatch } from "./draft.ts";

const db = new pg.Client({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
const animal = (slug: string) => fixtureId(0, slug);
const levels = (...slugs: string[]): Record<string, Level> => Object.fromEntries(slugs.map((s) => [animal(s), "uncommon" as const]));
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
