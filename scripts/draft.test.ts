// The drafting script's pure parts (scripts/draft.ts): the letter picker, which tries schedule A's slots in a
// date-seeded order and skips what doesn't fit (the database checks it runs per choice are the caller's: here fits is
// a stand-in); the host answers drawn from the bank; and the soft guide.
import { describe, expect, it } from "vitest";
import { LETTER_SCHEDULE, LETTER_TIERS } from "../src/config/tunables.ts";
import { pickHosts, pickLetters, softGuide } from "./draft.ts";

const fitsAll = async () => true;

describe("pickLetters", () => {
  it("steals one letter of the scheduled tier at each scheduled question, each letter once, the same for a date every time", async () => {
    const steals = await pickLetters("2026-11-02", 7, fitsAll);
    expect(steals).toHaveLength(7);
    steals!.forEach((letter, i) => {
      const tier = LETTER_SCHEDULE[i];
      if (tier === null) expect(letter).toBeUndefined();
      else expect(LETTER_TIERS[tier]).toContain(letter);
    });
    expect(new Set(steals!.filter(Boolean)).size).toBe(4);
    expect(await pickLetters("2026-11-02", 7, fitsAll)).toEqual(steals);
  });

  it("tries the next letter when a choice doesn't fit", async () => {
    const first = (await pickLetters("2026-11-02", 7, fitsAll))!;
    const steals = await pickLetters("2026-11-02", 7, async (_, trial) => trial[1] !== first[1]);
    expect(steals![1]).not.toBe(first[1]);
    expect(LETTER_TIERS.medium).toContain(steals![1]);
  });

  it("finds nothing when no letter fits", async () => {
    expect(await pickLetters("2026-11-02", 7, async (upTo) => upTo < 5)).toBeNull();
  });
});

describe("pickHosts", () => {
  const bank = ["a", "b", "c", "d"];
  it("draws 1, 1, 1, 1, 2, 2, 3 answers from the bank, the same for a date every time", () => {
    const hosts = [0, 1, 2, 3, 4, 5, 6].map((i) => pickHosts("2026-11-02", i, bank));
    expect(hosts.map((h) => h.length)).toEqual([1, 1, 1, 1, 2, 2, 3]);
    for (const h of hosts) {
      expect(h.every((x) => bank.includes(x))).toBe(true);
      expect(new Set(h).size).toBe(h.length);
    }
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => pickHosts("2026-11-02", i, bank))).toEqual(hosts);
  });

  it("refuses a bank smaller than the host's count", () => {
    expect(() => pickHosts("2026-11-02", 6, ["a", "b"])).toThrow("the host bank holds 2, and the host names 3");
  });
});

describe("the soft guide", () => {
  it("shows each question's expected catch rate against its target, and the finish rates", () => {
    // Seven questions catching 10% each: 0.9^7 = 47.8% finish. The targets: 0.97 × 0.95 × 0.93 × 0.90 × 0.87 × 0.84 × 0.80
    // = 45.1%.
    expect(softGuide([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1])).toEqual([
      "  q1: expected catch 10% (target 3%)",
      "  q2: expected catch 10% (target 5%)",
      "  q3: expected catch 10% (target 7%)",
      "  q4: expected catch 10% (target 10%)",
      "  q5: expected catch 10% (target 13%)",
      "  q6: expected catch 10% (target 16%)",
      "  q7: expected catch 10% (target 20%)",
      "  expected finish 48% (the targets': 45%)",
    ]);
  });
});
