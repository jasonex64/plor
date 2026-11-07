// The substring picker (scripts/substrings.ts). Counts are hand-made, as the bands run to thousands of words: each
// round gets a pool of sets inside its rule, and one set per rule sits just outside it.
import { describe, expect, it } from "vitest";
import { SUBSTRING_EVERYDAY_FLOOR, SUBSTRING_ROUNDS } from "../src/config/tunables.ts";
import { checkSubstringDay, substringGapProblems } from "../src/content/substrings.ts";
import { draftBatch, eligibleSets, pickDay, samples, setStats, type SetStats } from "./substrings.ts";

// Sets of a round's length that share no letters between rounds' pools, so nothing overlaps by accident.
const LETTERS = "bcdfghjklmnpqrstvwxyz";
function pool(round: number, size: number): string[] {
  const length = SUBSTRING_ROUNDS[round].letters;
  const lead = LETTERS[round];
  return Array.from({ length: size }, (_, i) => (lead + LETTERS[(i + 7) % 21] + LETTERS[Math.floor(i / 21) + 7]).slice(0, length === 2 ? 2 : 3));
}
function stats(size = 40): SetStats {
  const out: SetStats = new Map();
  SUBSTRING_ROUNDS.forEach((r, i) => {
    for (const set of pool(i, size)) out.set(set, { words: r.atLeast, everyday: SUBSTRING_EVERYDAY_FLOOR });
  });
  return out;
}

describe("setStats", () => {
  it("counts each word once per set, and everyday words apart", () => {
    const counted = setStats([
      { key: "banana", spelling: "banana", everyday: true },
      { key: "ban", spelling: "ban" },
    ]);
    expect(counted.get("an")).toEqual({ words: 2, everyday: 1 });
    expect(counted.get("ban")).toEqual({ words: 2, everyday: 1 });
    expect(counted.get("nan")).toEqual({ words: 1, everyday: 1 });
  });

  it("counts a word once though its spellings are two", () => {
    const counted = setStats([
      { key: "its", spelling: "it's", everyday: true },
      { key: "its", spelling: "its", everyday: true },
    ]);
    expect(counted.get("its")).toEqual({ words: 1, everyday: 1 });
  });
});

describe("eligibleSets", () => {
  const round = SUBSTRING_ROUNDS[6];

  it("keeps a set at the band's lower number, and leaves out one just below or at its upper", () => {
    const counted: SetStats = new Map([
      ["abc", { words: round.atLeast, everyday: 9 }],
      ["abd", { words: round.atLeast - 1, everyday: 9 }],
      ["abe", { words: round.below, everyday: 9 }],
      ["abf", { words: round.below - 1, everyday: 9 }],
    ]);
    expect(eligibleSets(6, counted)).toEqual(["abc", "abf"]);
  });

  it("holds the floor of everyday words", () => {
    const counted: SetStats = new Map([
      ["abc", { words: round.atLeast, everyday: SUBSTRING_EVERYDAY_FLOOR }],
      ["abd", { words: round.atLeast, everyday: SUBSTRING_EVERYDAY_FLOOR - 1 }],
    ]);
    expect(eligibleSets(6, counted)).toEqual(["abc"]);
  });

  it("leaves out a set of the wrong length, whatever its count", () => {
    const counted: SetStats = new Map([["ab", { words: round.atLeast, everyday: 9 }]]);
    expect(eligibleSets(6, counted)).toEqual([]);
  });

  it("leaves out a set that spells a listed word", () => {
    const counted: SetStats = new Map([
      ["sex", { words: round.atLeast, everyday: 9 }],
      ["sax", { words: round.atLeast, everyday: 9 }],
    ]);
    expect(eligibleSets(6, counted)).toEqual(["sax"]);
  });
});

describe("pickDay", () => {
  it("makes a day the format accepts, and the same day each time", () => {
    const day = pickDay("2026-12-01", stats(), new Set(), new Set());
    expect(checkSubstringDay("day", day)).toEqual([]);
    expect(pickDay("2026-12-01", stats(), new Set(), new Set())).toEqual(day);
  });

  it("gives another date another day", () => {
    expect(pickDay("2026-12-02", stats(), new Set(), new Set()).rounds).not.toEqual(pickDay("2026-12-01", stats(), new Set(), new Set()).rounds);
  });

  it("doesn't step through the list in order from one date to the next", () => {
    const list = eligibleSets(6, stats()).length;
    const picks = ["2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04"].map((date) => eligibleSets(6, stats()).indexOf(pickDay(date, stats(), new Set(), new Set()).rounds[6]));
    const steps = picks.slice(1).map((p, i) => (p - picks[i] + list) % list);
    expect(new Set(steps).size).toBeGreaterThan(1);
  });

  it("skips a set used nearby, and one the human turned down", () => {
    const first = pickDay("2026-12-01", stats(), new Set(), new Set());
    const near = pickDay("2026-12-01", stats(), new Set([first.rounds[6]]), new Set());
    const turned = pickDay("2026-12-01", stats(), new Set(), new Set([first.rounds[6]]));
    expect(near.rounds[6]).not.toBe(first.rounds[6]);
    expect(turned.rounds[6]).not.toBe(first.rounds[6]);
    expect(turned.rounds.slice(0, 6)).toEqual(first.rounds.slice(0, 6));
  });

  it("won't let one set sit inside another that day", () => {
    const counted: SetStats = new Map();
    SUBSTRING_ROUNDS.forEach((r, i) => {
      if (i !== 2) for (const set of pool(i, 40)) counted.set(set, { words: r.atLeast, everyday: 9 });
    });
    const inner = pickDay("2026-12-01", counted.set("zzz", { words: SUBSTRING_ROUNDS[2].atLeast, everyday: 9 }), new Set(), new Set()).rounds[0];
    counted.delete("zzz");
    counted.set(`${inner}z`, { words: SUBSTRING_ROUNDS[2].atLeast, everyday: 9 });
    counted.set("zzz", { words: SUBSTRING_ROUNDS[2].atLeast, everyday: 9 });
    expect(pickDay("2026-12-01", counted, new Set(), new Set()).rounds[2]).toBe("zzz");
  });

  it("draws the bonus from the letters no round holds", () => {
    const day = pickDay("2026-12-01", stats(), new Set(), new Set());
    expect(day.rounds.join("")).not.toContain(day.bonus_letter);
    expect(day.bonus_letter).toMatch(/^[a-z]$/);
  });

  it("stops loudly when a round has nothing left, naming the date and round", () => {
    expect(() => pickDay("2026-12-01", new Map(), new Set(), new Set())).toThrow(/2026-12-01 round 1/);
  });
});

describe("draftBatch", () => {
  it("drafts 7 days in date order, across a month's end, with no repeat", () => {
    const days = draftBatch("2026-12-28", stats(), [], new Set());
    expect(days.map((d) => d.date)).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
    expect(substringGapProblems(days)).toEqual([]);
  });

  it("keeps clear of days already drafted, before and after the batch", () => {
    const before = draftBatch("2026-11-25", stats(), [], new Set());
    const after = draftBatch("2026-12-20", stats(), before, new Set());
    const days = draftBatch("2026-12-05", stats(), [...before, ...after], new Set());
    expect(substringGapProblems([...before, ...after, ...days]).filter((p) => days.some((d) => p.includes(d.date)))).toEqual([]);
  });

  it("replaces a date already drafted, and doesn't count it against itself", () => {
    const first = draftBatch("2026-12-01", stats(), [], new Set());
    expect(draftBatch("2026-12-01", stats(), first, new Set())).toEqual(first);
  });

  it("changes only the turned-down round's day when it can", () => {
    const first = draftBatch("2026-12-01", stats(), [], new Set());
    const again = draftBatch("2026-12-01", stats(), [], new Set([first[2].rounds[6]]));
    expect(again[0]).toEqual(first[0]);
    expect(again[1]).toEqual(first[1]);
    expect(again[2].rounds[6]).not.toBe(first[2].rounds[6]);
  });
});

describe("samples", () => {
  it("gives the shortest everyday words holding the set", () => {
    const words = [
      { key: "banana", spelling: "banana", everyday: true as const },
      { key: "ban", spelling: "ban", everyday: true as const },
      { key: "bant", spelling: "bant" },
      { key: "bank", spelling: "bank", everyday: true as const },
    ];
    expect(samples("an", words, 2)).toEqual(["ban", "bank"]);
  });
});
