// Resolving typed answers against the answer database as of the day's approval (src/game/matching.ts;
// docs/milestones/M13-13a-the-base.md, "13a-2 and 13a-3"), on the fixture day (src/test/answer-fixture.ts). Run with
// `npm run test:db`.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ApprovedPuzzle } from "@/content/puzzle";
import { getPool } from "@/lib/db";
import { fixtureId } from "@/test/answer-fixture";
import { useLocalStack } from "@/test/local-stack";
import { ensurePuzzle, removeFixtures } from "@/test/puzzles";
import { dayLookup, resolveTyped } from "./matching";
import { thingNames } from "./payload";

let puzzle: ApprovedPuzzle;
const resolve = (index: number, typed: string, stolen: string[] = []) =>
  resolveTyped(dayLookup(getPool(), puzzle), (ids) => thingNames(getPool(), ids), puzzle, index, typed, stolen);
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
  it("finds a member by any of its names, typed loosely, and says whether the host catches it", async () => {
    expect(await resolve(0, "  DOGS! ")).toEqual({ thingId: animal("dog"), caught: false });
    expect(await resolve(0, "bear")).toEqual({ thingId: animal("bear"), caught: true });
  });

  it("catches what sits under a host answer, by any name, the scientific one included", async () => {
    expect(await resolve(0, "polar bear")).toEqual({ thingId: animal("polar-bear"), caught: true });
    expect(await resolve(0, "Ursus maritimus")).toEqual({ thingId: animal("polar-bear"), caught: true });
  });

  it("reads a name on one line of the tree as its highest member", async () => {
    expect(await resolve(0, "aardvark")).toEqual({ thingId: animal("aardvark-genus"), caught: false });
  });

  it("reads a name two unrelated members share as one answer", async () => {
    const robin = await resolve(0, "robin");
    expect(robin).toMatchObject({ caught: false });
    expect([animal("american-robin"), animal("european-robin")]).toContain(robin && "thingId" in robin ? robin.thingId : null);
  });

  it("refuses a member of another question's category", async () => {
    expect(await resolve(0, "banana")).toBeNull();
  });

  it("fixes one typo onto exactly one name, and refuses a typo two names are as close to", async () => {
    expect(await resolve(0, "elephnt")).toBeNull();
    expect(await resolve(0, "polr bear")).toEqual({ thingId: animal("polar-bear"), caught: true });
    expect(await resolve(0, "horze")).toBeNull();
    expect(await resolve(0, "hors")).toEqual({ thingId: animal("horse"), caught: false });
  });

  it("fixes no typo of fewer than four letters, and none onto a name with a stolen letter", async () => {
    expect(await resolve(0, "dgo")).toBeNull();
    // Digits aren't letters: "dog1" is one edit from "dog", but has 3 letters.
    expect(await resolve(0, "dog1")).toBeNull();
    // "kiwi" at question 2, where C is stolen, is one typo from "kiwis"; "cherr" is one typo from "cherry", which has a C.
    expect(await resolve(1, "kiwiz", ["c"])).toEqual({ thingId: fixtureId(1, "kiwi"), caught: false });
    expect(await resolve(1, "herry", ["c"])).toBeNull();
  });

  // docs/milestones/M15-15h-taken-letters-follow-the-name.md: the shown name decides, whatever name was typed.
  it("taken letter follows the name: a clean alias of a thing whose shown name holds the letter names nothing, and says which letter", async () => {
    // "ursus maritimus" has no P; its thing is shown as "polar bear".
    expect(await resolve(0, "ursus maritimus", ["p"])).toEqual({ needs: "p" });
    expect(await resolve(0, "ursus maritimus", ["c", "p"])).toEqual({ needs: "p" });
    expect(await resolve(0, "ursus maritimus", ["c"])).toEqual({ thingId: animal("polar-bear"), caught: true });
    expect(await resolve(0, "ursus maritimus")).toEqual({ thingId: animal("polar-bear"), caught: true });
  });

  it("taken letter follows the name: a shared alias is the thing with the clean name, and nothing when none has one", async () => {
    // "robin" is the American and the European robin: only "american robin" holds an M; both hold an E.
    expect(await resolve(0, "robin", ["m"])).toEqual({ thingId: animal("european-robin"), caught: false });
    expect(await resolve(0, "robin", ["e"])).toEqual({ needs: "e" });
  });

  it("taken letter follows the name: a typo lands on no thing whose shown name holds the letter", async () => {
    // "robim" is one typo from "robin", which has no E; both robins' shown names do.
    expect(await resolve(0, "robim", ["e"])).toBeNull();
    expect(await resolve(0, "robim", ["m"])).toEqual({ thingId: animal("european-robin"), caught: false });
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
