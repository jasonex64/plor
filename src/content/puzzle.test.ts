import { describe, expect, it } from "vitest";
import { checkHostNames, normalize, parsePuzzle, type Puzzle } from "./puzzle.ts";

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
