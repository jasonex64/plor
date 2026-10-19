import { describe, expect, it } from "vitest";
import type { PublicEntry } from "./payload";
import { editDistanceAtMost, suggest } from "./suggest";

const entries: PublicEntry[] = [
  { id: "passport", name: "passport", aliases: ["passports"] },
  { id: "phone", name: "phone", aliases: ["phones", "cell phone"] },
  { id: "cat", name: "cat", aliases: ["cats"] },
  { id: "car", name: "car", aliases: ["cars"] },
];
const ids = (list: PublicEntry[]) => list.map((e) => e.id);

describe("editDistanceAtMost", () => {
  it.each([
    ["passprt", "passport", true], // a letter missing
    ["passsport", "passport", true], // a letter extra
    ["passpord", "passport", true], // a letter wrong
    ["paspsort", "passport", true], // two neighbours swapped
    ["pasprt", "passport", false], // two letters missing
    ["passport", "passport", true],
  ])("%s → %s within one edit: %s", (a, b, within) => {
    expect(editDistanceAtMost(a, b, 1)).toBe(within);
  });
});

describe("suggest", () => {
  it("offers entries with a word that starts with the text", () => {
    expect(ids(suggest(entries, "pho").matches)).toEqual(["phone"]);
    expect(ids(suggest(entries, "cell").matches)).toEqual(["phone"]);
  });

  it("finds the exact entry for Enter, after normalization", () => {
    expect(suggest(entries, "  Passport ").exact?.id).toBe("passport");
    expect(suggest(entries, "passports").exact?.id).toBe("passport");
    expect(suggest(entries, "pass").exact).toBeNull();
  });

  it("suggests an entry one typo away when nothing starts with the text (human, 2026-10-19)", () => {
    expect(suggest(entries, "passprt")).toEqual({ matches: [], typos: [entries[0]], exact: null });
  });

  it("offers no typo suggestions for text shorter than 4 letters", () => {
    expect(suggest(entries, "cst").typos).toEqual([]);
  });

  it("offers no typo suggestions while something starts with the text", () => {
    expect(suggest(entries, "pass").typos).toEqual([]);
  });

  it("offers nothing for empty text", () => {
    expect(suggest(entries, "   ")).toEqual({ matches: [], typos: [], exact: null });
  });
});
