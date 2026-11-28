// Resolving typed answers against the answer database as of the day's approval (src/game/matching.ts;
// docs/milestones/M13-13a-the-base.md, "13a-2 and 13a-3"), on the fixture's day on a clock (src/test/answer-fixture.ts). Run with
// `npm run test:db`.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ClockPuzzle } from "@/content/puzzle";
import { getPool } from "@/lib/db";
import { fixtureId } from "@/test/answer-fixture";
import { useLocalStack } from "@/test/local-stack";
import { ensurePuzzle, removeFixtures } from "@/test/puzzles";
import { dayLookup, resolveTyped } from "./matching";

let puzzle: ClockPuzzle;
const resolve = (index: number, typed: string) => resolveTyped(dayLookup(getPool(), puzzle), puzzle, index, typed);
const animal = (slug: string) => fixtureId(0, slug);

beforeAll(async () => {
  useLocalStack();
  const { rows } = await getPool().query<{ today: string }>("select private.today()::text as today");
  puzzle = await ensurePuzzle(rows[0].today);
});

afterAll(async () => {
  await removeFixtures();
  await getPool().end();
});

describe("resolveTyped", () => {
  it("finds a member by any of its names, typed loosely, the scientific one included", async () => {
    expect(await resolve(0, "  DOGS! ")).toEqual({ thingId: animal("dog") });
    expect(await resolve(0, "bear")).toEqual({ thingId: animal("bear") });
    expect(await resolve(0, "polar bear")).toEqual({ thingId: animal("polar-bear") });
    expect(await resolve(0, "Ursus maritimus")).toEqual({ thingId: animal("polar-bear") });
  });

  it("reads a name on one line of the tree as its highest member", async () => {
    expect(await resolve(0, "aardvark")).toEqual({ thingId: animal("aardvark-genus") });
  });

  it("reads a name two unrelated members share as one answer", async () => {
    const robin = await resolve(0, "robin");
    expect([animal("american-robin"), animal("european-robin")]).toContain(robin?.thingId);
  });

  it("refuses a member of another question's category", async () => {
    expect(await resolve(0, "banana")).toBeNull();
  });

  it("fixes one typo onto exactly one name, and refuses a typo two names are as close to", async () => {
    expect(await resolve(0, "elephnt")).toBeNull();
    expect(await resolve(0, "polr bear")).toEqual({ thingId: animal("polar-bear") });
    expect(await resolve(0, "horze")).toBeNull();
    expect(await resolve(0, "hors")).toEqual({ thingId: animal("horse") });
  });

  it("fixes no typo of fewer than four letters", async () => {
    expect(await resolve(0, "dgo")).toBeNull();
    // Digits aren't letters: "dog1" is one edit from "dog", but has 3 letters.
    expect(await resolve(0, "dog1")).toBeNull();
    // "kiwiz" is one typo from "kiwi", at question 2.
    expect(await resolve(1, "kiwiz")).toEqual({ thingId: fixtureId(1, "kiwi") });
  });

  it("ignores a name the base gained after the day was approved", async () => {
    const db = getPool();
    await db.query("select private.import_source('wikidata', 'fixture-late', $1::jsonb)", [
      JSON.stringify([{ id: "fixture_animal-dog", name: "dog", aliases: [{ alias: "doggo", kind: "name" }] }]),
    ]);
    try {
      expect(await resolve(0, "doggo")).toBeNull();
    } finally {
      await db.query("delete from private.thing_alias where alias = 'doggo' and source_ref = 'wikidata:fixture-late'");
      await db.query("delete from private.base_log where detail->>'snapshot' = 'fixture-late'");
    }
  });
});
