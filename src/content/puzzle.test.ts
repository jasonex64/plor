import { describe, expect, it } from "vitest";
import { expectedPlural, normalize, parsePuzzle } from "./puzzle.ts";

describe("normalize", () => {
  it.each([
    ["  Bald   Eagle ", "bald eagle"], // case and whitespace
    ["Lion's!", "lions"], // punctuation is removed, not replaced by a space
    ["Gato Montés", "gato montes"], // diacritics (NFKD, then marks stripped)
    ["İbis", "ibis"], // lowercasing U+0130 yields a combining mark, which is stripped
    ["ＬＩＯＮ", "lion"], // fullwidth forms fold under NFKD
    ["...", ""],
  ])("%j -> %j", (input, output) => {
    expect(normalize(input)).toBe(output);
  });
});

describe("expectedPlural", () => {
  it("uses the override when set, else pluralize", () => {
    expect(expectedPlural({ id: "cattle", name: "cattle", aliases: [], plural: "cattle" })).toBe("cattle");
    expect(expectedPlural({ id: "cattle", name: "cattle", aliases: [] })).toBe("cattles");
  });
});

describe("parsePuzzle (shape of untrusted files)", () => {
  const file = "offbeat/2026-11-02.json";
  const errorsOf = (value: unknown) => parsePuzzle(file, JSON.stringify(value)).errors;
  const top = { format: 2, game_id: "offbeat", date: "2026-11-02", questions: [] };

  it("rejects text that is not JSON", () => {
    expect(parsePuzzle(file, "{").errors).toEqual([expect.stringMatching(/^offbeat\/2026-11-02\.json: not valid JSON/)]);
  });

  it("rejects a missing field, an unknown field and a wrong format", () => {
    expect(errorsOf({ game_id: "offbeat", date: "2026-11-02", questions: [], version: 1 })).toEqual([
      `${file}: missing "format"`,
      `${file}: unknown field "version"`,
    ]);
    expect(errorsOf({ ...top, format: 1 })).toEqual([`${file}: "format" must be 2`]);
  });

  it("rejects an unknown game and an impossible date", () => {
    expect(errorsOf({ ...top, game_id: "ofbeat", date: "2026-02-30" })).toEqual([
      `${file}: "game_id" must be "offbeat"`,
      `${file}: "date" must be a calendar date YYYY-MM-DD`,
    ]);
  });

  it("rejects malformed questions and entries with their position", () => {
    const question = {
      prompt: "",
      entries: [{ id: "lion", name: "lion", aliases: "lions", note: "x" }],
      host_bank: ["lion"],
      host_answers: "lion",
      match_groups: { lion: "lion" },
    };
    expect(errorsOf({ ...top, questions: [question] })).toEqual([
      `${file} q1: "prompt" must be a non-empty string`,
      `${file} q1 entries[0]: unknown field "note"`,
      `${file} q1 entries[0]: "aliases" must be a list of non-empty strings`,
      `${file} q1: "host_answers" must be a list of entry IDs`,
      `${file} q1: "match_groups" must map a host answer ID to a list of entry IDs`,
    ]);
  });

  it("rejects a stolen letter that isn't one lower-case letter (M13 13c-3)", () => {
    const question = { prompt: "Name a pet", entries: [], host_bank: [], host_answers: [], match_groups: {} };
    for (const steals of ["E", "ab", "é", 5]) {
      expect(errorsOf({ ...top, questions: [{ ...question, steals }] })).toEqual([`${file} q1: "steals" must be one lower-case letter a-z`]);
    }
  });
});
