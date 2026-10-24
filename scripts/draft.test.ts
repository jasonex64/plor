// The drafting script's letter picker (scripts/draft.ts): schedule A's slots, in a date-seeded order, skipping what
// doesn't fit. The database checks it runs per choice are the caller's (fits); here fits is a stand-in.
import { describe, expect, it } from "vitest";
import { LETTER_SCHEDULE, LETTER_TIERS } from "../src/config/tunables.ts";
import { pickLetters } from "./draft.ts";

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
