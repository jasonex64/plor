// The bank check against the local stack (run with `npm run test:db`): on the fixture base (src/test/answer-fixture.ts),
// a name answer must name one member, an ID answer must be a member, and two answers may not name one thing (13e-9).
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fixtureId, loadFixtureBase } from "../src/test/answer-fixture.ts";
import { bankProblems } from "./base.ts";

const db = new pg.Client({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
const question = (host: string[], uncommon: string[]) => ({ id: "q", prompt: "Name an animal", category: "fixture_animal", host_bank: host, uncommon, themes: [], added_by: "claude" as const });

beforeAll(async () => {
  await db.connect();
  await loadFixtureBase(db);
});
afterAll(() => db.end());

describe("bankProblems", () => {
  it("passes answers that each name one member, by name or by ID", async () => {
    expect(await bankProblems(db, [question(["bear", "dog"], ["cat", `#${fixtureId(0, "fish")}`])])).toEqual([]);
  });

  it("names an answer fitting two members or none, and two answers naming one thing", async () => {
    expect(await bankProblems(db, [question(["robin", "unicorn"], ["cat", `#${fixtureId(0, "cat")}`])])).toEqual([
      'q: "robin" names 2 members of fixture_animal',
      'q: "unicorn" names 0 members of fixture_animal',
      `q: "cat" and "#${fixtureId(0, "cat")}" name the same thing`,
    ]);
  });
});
