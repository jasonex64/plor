// data/categories.json's shape (src/content/categories.ts; M13 13e): disk input, and define_category replaces a key
// it's given again, so a key listed twice must be refused before it reaches the database.
import { describe, expect, it } from "vitest";
import { familyOf, filterOf, isSubset, parseCategories } from "./categories";

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

describe("subsets", () => {
  const country = { key: "country", name: "country", source: "wikidata", root: "Q6256", member_of: "Q1065" };
  it("parses each filter, and gives each subset its base's family", () => {
    const subsets = [
      { key: "african_country", name: "African country", of: "country", fact: { trait: "continent", value: "Q15" } },
      { key: "african_capital", name: "African capital", of: "capital", fact: { trait: "continent", value: "Q15", via: "country" } },
      { key: "big_country", name: "big country", of: "country", at_least: { number: "population", value: 1000 } },
      { key: "d_country", name: "country starting with D", of: "country", starts_with: "d" },
    ];
    const capital = { key: "capital", name: "capital", source: "wikidata", root: "Q5119" };
    const { categories, errors } = parseCategories("c.json", JSON.stringify([country, capital, ...subsets]));
    expect(errors).toEqual([]);
    const family = familyOf(categories!);
    expect(["country", "african_country", "d_country", "african_capital", "unlisted"].map(family)).toEqual(["country", "country", "country", "capital", "unlisted"]);
    expect(categories!.filter(isSubset).map(filterOf)).toEqual([
      { trait: "continent", value: "Q15" },
      { trait: "continent", value: "Q15", via: "country" },
      { number: "population", at_least: 1000 },
      { starts_with: "d" },
    ]);
  });

  it("refuses a subset with no base before it, two filters or none, and a filter outside A1's forms", () => {
    const sub = { key: "s", name: "s", of: "country" };
    const broken = [
      { ...sub, key: "early", starts_with: "a" },
      country,
      { ...sub, starts_with: "a", at_least: { number: "population", value: 1 } },
      sub,
      { ...sub, fact: { trait: "country", value: "Q30" } },
      { ...sub, fact: { trait: "conservation_status", value: "Q1", via: "country" } },
      { ...sub, at_least: { number: "area", value: 1 } },
      { ...sub, at_least: { number: "population", value: 0.5 } },
      { ...sub, starts_with: "D" },
      { ...sub, key: "sub_of_sub", of: "early", starts_with: "a" },
    ].map((c, i) => ("of" in c && c.key === "s" ? { ...c, key: `s_${"abcdefghij"[i]}` } : c));
    expect(parseCategories("c.json", JSON.stringify(broken)).errors).toEqual([
      'c.json category 1: "of" must be a base category listed before it',
      'c.json category 3: a subset has exactly one of "fact", "at_least" and "starts_with"',
      'c.json category 4: a subset has exactly one of "fact", "at_least" and "starts_with"',
      'c.json category 5: "fact" must be {"trait": "continent" or "conservation_status", "value": the source\'s ID}, with "via": "country" only for a continent',
      'c.json category 6: "fact" must be {"trait": "continent" or "conservation_status", "value": the source\'s ID}, with "via": "country" only for a continent',
      'c.json category 7: "at_least" must be {"number": "population", "value": a whole number above 0}',
      'c.json category 8: "at_least" must be {"number": "population", "value": a whole number above 0}',
      'c.json category 9: "starts_with" must be one letter, a to z',
      'c.json category 10: "of" must be a base category listed before it',
    ]);
  });
});
