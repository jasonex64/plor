import { describe, expect, it } from "vitest";
import { normalize } from "../content/puzzle";
import { LDNOOBW_EN } from "./ldnoobw-en";
import { isListed, isListedWord, isPlorListed } from "./misses";
import { PLOR_LISTED } from "./plor-listed";

// The held-word check (human, 2026-10-24: "Hold listed words (Recommended)") matches whole words of the normalized
// text, so a listed word inside a harmless one doesn't hold it.
describe("isListed", () => {
  it("holds a text that is, or holds, a listed word or phrase", () => {
    expect(isListed("butt")).toBe(true);
    expect(isListed("big butt")).toBe(true);
    expect(isListed("2 girls 1 cup")).toBe(true);
  });

  it("doesn't hold a listed word inside another word", () => {
    expect(isListed("button")).toBe(false);
    expect(isListed("scunthorpe")).toBe(false);
  });

  // Plor's list (13e-9b): the slur in every spelling, plural and compound found in the base, and not the Latin
  // species names or the words that only start like it (human, 2026-10-27: "Keep Latin names (Recommended)").
  it("holds Plor's list beside LDNOOBW's", () => {
    for (const text of ["kaffir lime", "cape kafferboom", "kafirs", "caffer cat", "ambulance chaser", "old squaw", "hottentots bread vine", "gypsy cab", "whorehouse", "shrink"]) expect(isListed(text)).toBe(true);
    for (const text of ["syncerus caffer", "cossypha caffra", "kaffiyeh", "kaffrine", "squaw lake", "hottentot teal", "shrink-wrap"]) expect(isListed(text)).toBe(false);
  });
});

describe("isPlorListed", () => {
  it("holds Plor's words and not LDNOOBW's", () => {
    expect(isPlorListed("kaffir pox")).toBe(true);
    expect(isPlorListed("butt")).toBe(false);
  });
});

describe("isListedWord", () => {
  it("agrees with isListed on every one-word entry and on a word that only holds one", () => {
    const onePerList = [...LDNOOBW_EN, ...PLOR_LISTED].map(normalize).filter((w) => w !== "" && !w.includes(" "));
    for (const word of onePerList) expect(isListedWord(word)).toBe(isListed(word));
    expect(isListedWord("button")).toBe(isListed("button"));
  });
});
