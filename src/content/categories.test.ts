// data/categories.json's shape (src/content/categories.ts; M13 13e): disk input, and define_category replaces a key
// it's given again, so a key listed twice must be refused before it reaches the database.
import { describe, expect, it } from "vitest";
import { parseCategories } from "./categories";

const animal = { key: "animal", name: "animal", source: "wikidata", root: "Q729" };

describe("parseCategories", () => {
  it("parses a valid list, and lists every problem in a broken one", () => {
    expect(parseCategories("c.json", JSON.stringify([animal, { ...animal, key: "country", member_of: "Q1065" }])).errors).toEqual([]);
    const broken = [{ ...animal, key: "Bad Key" }, { ...animal, source: "usda" }, { ...animal, member_of: null }, { ...animal, extra: 1 }];
    expect(parseCategories("c.json", JSON.stringify(broken)).errors).toEqual([
      'c.json category 1: "key" must be a category key (lower-case letters and _)',
      'c.json category 2: "source" must be "oewn" or "wikidata"',
      'c.json category 3: "member_of" must be the source\'s ID',
      'c.json category 4: unknown field "extra"',
      'c.json: category "animal" is listed twice',
    ]);
  });
});
