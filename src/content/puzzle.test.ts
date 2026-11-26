import { describe, expect, it } from "vitest";
import { fixtureClockDay } from "../test/answer-fixture.ts";
import { checkClockPuzzle, checkHostNames, normalize, parsePuzzle, type ClockPuzzle, type ClockQuestion, type Puzzle } from "./puzzle.ts";

describe("normalize", () => {
  it.each([
    ["  Bald   Eagle ", "bald eagle"], // case and whitespace
    ["Lion's!", "lions"], // punctuation is removed, not replaced by a space
    ["Gato Montés", "gato montes"], // diacritics (NFKD, then marks stripped)
    ["İbis", "ibis"], // lowercasing U+0130 yields a combining mark, which is stripped
    ["ＬＩＯＮ", "lion"], // fullwidth forms fold under NFKD
    ["...", ""],
    ["li​on‍", "lion"], // format characters (zero-width space, zero-width joiner) are dropped
    ["Łódź", "lodz"], // Latin letters NFKD leaves whole are folded (13f-1)
    ["Straße", "strasse"],
    ["Ærøskøbing", "aeroskobing"],
  ])("%j -> %j", (input, output) => {
    expect(normalize(input)).toBe(output);
  });
});

const id = (n: number) => `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`;

describe("parsePuzzle (shape of untrusted files)", () => {
  const file = "offbeat/2026-11-02.json";
  const errorsOf = (value: unknown) => parsePuzzle(file, JSON.stringify(value)).errors;
  const top = { format: 3, game_id: "offbeat", date: "2026-11-02", questions: [] };

  it("rejects text that is not JSON", () => {
    expect(parsePuzzle(file, "{").errors).toEqual([expect.stringMatching(/^offbeat\/2026-11-02\.json: not valid JSON/)]);
  });

  it("rejects a missing field, an unknown field and a wrong format", () => {
    expect(errorsOf({ game_id: "offbeat", date: "2026-11-02", questions: [], version: 1 })).toEqual([
      `${file}: missing "format"`,
      `${file}: unknown field "version"`,
    ]);
    expect(errorsOf({ ...top, format: 2 })).toEqual([`${file}: "format" must be 3`]);
  });

  it("rejects an unknown game and an impossible date", () => {
    expect(errorsOf({ ...top, game_id: "ofbeat", date: "2026-02-30" })).toEqual([
      `${file}: "game_id" must be "offbeat"`,
      `${file}: "date" must be a calendar date YYYY-MM-DD`,
    ]);
  });

  it("rejects malformed questions with their position", () => {
    const question = { prompt: "", category: "Animal", host_bank: [id(1)], host_answers: id(1), levels: { lion: "common" }, entries: [] };
    expect(errorsOf({ ...top, questions: [question] })).toEqual([
      `${file} q1: unknown field "entries"`,
      `${file} q1: "prompt" must be a non-empty string`,
      `${file} q1: "category" must be a category key (lower-case letters and _)`,
      `${file} q1: "host_answers" must be a list of thing IDs`,
      `${file} q1: "levels" must map thing IDs to "common" or "uncommon"`,
    ]);
  });

  it("rejects a stolen letter that isn't one lower-case letter (M04 13c-3)", () => {
    const question = { prompt: "Name a pet", category: "pet", host_bank: [], host_answers: [], levels: {} };
    for (const steals of ["E", "ab", "é", 5]) {
      expect(errorsOf({ ...top, questions: [{ ...question, steals }] })).toEqual([`${file} q1: "steals" must be one lower-case letter a-z`]);
    }
  });
});

describe("checkHostNames", () => {
  const day = (steals: (string | undefined)[], hosts: string[][]): Puzzle => ({
    format: 3,
    game_id: "offbeat",
    date: "2026-11-02",
    questions: hosts.map((h, i) => ({ prompt: `q${i}`, category: "thing", host_bank: h, host_answers: h, levels: {}, ...(steals[i] ? { steals: steals[i] } : {}) })),
  });

  it("refuses a host answer whose main name holds a letter stolen at or before its question", () => {
    const names = new Map([
      [id(1), "Chamomile"],
      [id(2), "mint"],
    ]);
    expect(checkHostNames("d", day([undefined, "c"], [[id(2)], [id(1)]]), names)).toEqual([`d q2 thing "${id(1)}": host answer's name "Chamomile" can't be typed without C`]);
    expect(checkHostNames("d", day([undefined, "c"], [[id(1)], [id(2)]]), names)).toEqual([]);
  });

  it("refuses a host answer the answer database doesn't know", () => {
    expect(checkHostNames("d", day([undefined], [[id(9)]]), new Map())).toEqual([`d q1 thing "${id(9)}": host answer is not in the answer database`]);
  });
});

describe("checkClockPuzzle (a day on a clock)", () => {
  const ids = (from: number, n: number) => Array.from({ length: n }, (_, i) => id(from + i));
  const question = (over: Record<string, unknown> = {}) => ({
    prompt: "Name a thing",
    category: "thing",
    root: id(99),
    member_of: null,
    levels: { [id(1)]: "common" as const, [id(2)]: "uncommon" as const },
    rare: ids(10, 6),
    size: 40,
    ...over,
  });
  const day = (q: object): ClockPuzzle => ({ format: 4, game_id: "offbeat", date: "2026-12-01", questions: [q, q, q] as ClockQuestion[] });

  it("accepts a day whose questions each carry six rare answers and a size", () => {
    expect(checkClockPuzzle("d", day(question()))).toEqual([]);
  });

  it("accepts the tests' own clock day", () => {
    expect(checkClockPuzzle("fixture", fixtureClockDay("2026-12-01", "2026-12-01T00:00:00Z"))).toEqual([]);
  });

  it("refuses a question without rare or size", () => {
    const { rare, size, ...bare } = question();
    expect(rare).toHaveLength(6);
    expect(size).toBe(40);
    expect(checkClockPuzzle("d", day(bare))).toEqual(["d q1: missing \"rare\"", "d q1: missing \"size\"", "d q2: missing \"rare\"", "d q2: missing \"size\"", "d q3: missing \"rare\"", "d q3: missing \"size\""]);
  });

  it("refuses rare that is not exactly six thing IDs, holds a level's answer, or repeats", () => {
    expect(checkClockPuzzle("d", day(question({ rare: ids(10, 5) })))[0]).toBe('d q1: "rare" must be 6 thing IDs');
    expect(checkClockPuzzle("d", day(question({ rare: ids(10, 7) })))[0]).toBe('d q1: "rare" must be 6 thing IDs');
    expect(checkClockPuzzle("d", day(question({ rare: [...ids(10, 5), "cat"] })))[0]).toBe('d q1: "rare" must be 6 thing IDs');
    expect(checkClockPuzzle("d", day(question({ rare: [id(1), ...ids(10, 5)] })))[0]).toBe(`d q1 thing "${id(1)}": rare, but it is in levels`);
    expect(checkClockPuzzle("d", day(question({ rare: [id(10), ...ids(10, 5)] })))[0]).toBe(`d q1 thing "${id(10)}": listed twice in rare`);
  });

  it("refuses a size that is not a positive integer", () => {
    for (const size of [0, -3, 2.5, "40"]) expect(checkClockPuzzle("d", day(question({ size })))[0]).toBe('d q1: "size" must be a positive integer');
  });
});
