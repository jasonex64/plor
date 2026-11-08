// Game 2's day (src/content/substrings.ts): one valid day, then that day with a single rule broken per case.
import { describe, expect, it } from "vitest";
import { checkSubstringsFile, setsNear, substringGapProblems, type SubstringDay } from "./substrings.ts";

const FILE = "substrings/2026-12-01.json";
const valid = (): SubstringDay => ({
  format: 1,
  game_id: "substrings",
  date: "2026-12-01",
  rounds: ["ou", "lu", "att", "yin", "odo", "hec", "vet"],
  bonus_letter: "f",
});
const check = (day: unknown, file = FILE) => checkSubstringsFile(file, JSON.stringify(day));

describe("checkSubstringsFile", () => {
  it("passes a good day", () => {
    expect(check(valid())).toEqual([]);
  });

  it("refuses text that isn't JSON or isn't an object", () => {
    expect(checkSubstringsFile(FILE, "{")[0]).toMatch(/not valid JSON/);
    expect(check([])[0]).toMatch(/JSON object/);
  });

  it.each([
    ["a wrong format", { format: 3 }, /"format" must be 1/],
    ["a wrong game", { game_id: "offbeat" }, /"game_id" must be "substrings"/],
    ["a date that isn't one", { date: "2026-13-01" }, /calendar date/],
    ["rounds that aren't a list", { rounds: "ou" }, /"rounds" must be a list/],
    ["a round holding a capital", { rounds: ["Ou", "lu", "att", "yin", "odo", "hec", "vet"] }, /lower-case letters/],
    ["a round holding a digit", { rounds: ["o1", "lu", "att", "yin", "odo", "hec", "vet"] }, /lower-case letters/],
    ["a bonus of two letters", { bonus_letter: "fg" }, /one lower-case letter/],
    ["a capital bonus", { bonus_letter: "F" }, /one lower-case letter/],
  ])("refuses %s", (_name, change, message) => {
    expect(check({ ...valid(), ...change }).join("\n")).toMatch(message);
  });

  it("refuses a missing field and an unknown one", () => {
    const missing: Partial<SubstringDay> = valid();
    delete missing.bonus_letter;
    expect(check(missing).join("\n")).toMatch(/bonus_letter/);
    expect(check({ ...valid(), extra: 1 }).join("\n")).toMatch(/extra/);
  });

  it("refuses 6 rounds and 8 rounds", () => {
    expect(check({ ...valid(), rounds: valid().rounds.slice(0, 6) }).join("\n")).toMatch(/7 rounds/);
    expect(check({ ...valid(), rounds: [...valid().rounds, "ack"] }).join("\n")).toMatch(/7 rounds/);
  });

  it("refuses a round of the wrong length", () => {
    expect(check({ ...valid(), rounds: ["oub", "lu", "att", "yin", "odo", "hec", "vet"] }).join("\n")).toMatch(/round 1.*2 letters/);
    expect(check({ ...valid(), rounds: ["ou", "lu", "at", "yin", "odo", "hec", "vet"] }).join("\n")).toMatch(/round 3.*3 letters/);
  });

  it("refuses a round inside another, and one used twice", () => {
    expect(check({ ...valid(), rounds: ["ou", "at", "att", "yin", "odo", "hec", "vet"] }).join("\n")).toMatch(/"at" is inside "att"/);
    expect(check({ ...valid(), rounds: ["ou", "lu", "att", "yin", "yin", "hec", "vet"] }).join("\n")).toMatch(/"yin" is inside "yin"/);
  });

  it("refuses a bonus letter that's in a round", () => {
    expect(check({ ...valid(), bonus_letter: "y" }).join("\n")).toMatch(/bonus letter "y" is in "yin"/);
  });

  it("refuses a path that doesn't match the day", () => {
    expect(check(valid(), "substrings/2026-12-02.json").join("\n")).toMatch(/path must be substrings\/2026-12-01\.json/);
  });
});

describe("setsNear", () => {
  const on = (date: string): SubstringDay => ({ ...valid(), date, rounds: [date.slice(-2), ...valid().rounds.slice(1)] });

  it("holds a set for 29 days either side, frees it at 30, and leaves the date's own day out", () => {
    const sets = setsNear("2026-12-31", [on("2026-12-01"), on("2026-12-02"), on("2026-12-31"), on("2027-01-29"), on("2027-01-30")]);
    expect(sets.has("02")).toBe(true);
    expect(sets.has("29")).toBe(true);
    expect(sets.has("01")).toBe(false);
    expect(sets.has("30")).toBe(false);
    expect(sets.has("31")).toBe(false);
  });
});

describe("substringGapProblems", () => {
  const day = (date: string, first: string): SubstringDay => ({ ...valid(), date, rounds: [first, ...valid().rounds.slice(1)] });
  const others = (date: string): SubstringDay => ({ ...valid(), date, rounds: ["ab", "cd", "eff", "ghi", "jkl", "mno", "pqr"] });

  it("refuses a set back within 30 days, and passes one at 30", () => {
    expect(substringGapProblems([day("2026-12-01", "ou"), others("2026-12-15")])).toEqual([]);
    expect(substringGapProblems([day("2026-12-01", "ou"), day("2026-12-30", "ou")]).join("\n")).toMatch(/"ou".*2026-12-01.*2026-12-30/);
    expect(substringGapProblems([day("2026-12-01", "ou"), day("2026-12-31", "ou")]).join("\n")).not.toMatch(/"ou"/);
  });
});
