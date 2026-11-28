import { describe, expect, it } from "vitest";
import { fixtureClockDay } from "../test/answer-fixture.ts";
import { checkClockDay, checkClockPuzzle, checkDraftFile, normalize, parseClockDraft, type ClockDraft, type ClockPuzzle, type ClockQuestion } from "./puzzle.ts";

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

// A drafted day on a clock (docs/milestones/M23-23e-drafting-and-approving.md, 23e-1): the file the draft writes and the
// approval page reads, which holds no root and no member_of (approval adds them).
describe("a drafted day on a clock", () => {
  const ids = (from: number, n: number) => Array.from({ length: n }, (_, i) => id(from + i));
  const question = (n: number, over: Record<string, unknown> = {}) => ({
    prompt: `Name a thing ${n}`,
    category: `thing_${"abc"[n]}`,
    levels: { [id(1)]: "common", [id(2)]: "uncommon" },
    rare: ids(10, 6),
    size: 40,
    ...over,
  });
  const draft = (questions: object[] = [question(0), question(1), question(2)]) => ({ format: 4, game_id: "offbeat", date: "2026-12-01", questions });
  const text = (day: object) => JSON.stringify(day);

  it("reads a good day", () => {
    expect(parseClockDraft("offbeat/2026-12-01.json", text(draft())).errors).toEqual([]);
    expect(parseClockDraft("offbeat/2026-12-01.json", text(draft())).puzzle).toEqual(draft());
    expect(checkDraftFile("offbeat/2026-12-01.json", text(draft()))).toEqual([]);
  });

  it("refuses text that is not JSON, any other format, an unknown game and an impossible date", () => {
    expect(parseClockDraft("f", "{").errors).toEqual([expect.stringMatching(/^f: not valid JSON/)]);
    expect(parseClockDraft("f", text({ ...draft(), format: 3 })).errors).toEqual(['f: "format" must be 4']);
    expect(parseClockDraft("f", text({ ...draft(), game_id: "ofbeat", date: "2026-02-30" })).errors).toEqual([
      'f: "game_id" must be "offbeat"',
      'f: "date" must be a calendar date YYYY-MM-DD',
    ]);
  });

  it("refuses a file with a missing or unknown field, a bad id or a bad tier", () => {
    const { rare, ...noRare } = question(0);
    expect(rare).toHaveLength(6);
    expect(parseClockDraft("f", text(draft([noRare, question(1), question(2)]))).errors).toEqual(['f q1: missing "rare"']);
    expect(parseClockDraft("f", text(draft([question(0, { root: id(9) }), question(1), question(2)]))).errors).toEqual(['f q1: unknown field "root"']);
    expect(parseClockDraft("f", text(draft([question(0, { rare: ["cat"] }), question(1), question(2)]))).errors).toEqual(['f q1: "rare" must be a list of thing IDs']);
    expect(parseClockDraft("f", text(draft([question(0, { levels: { [id(1)]: "rare" } }), question(1), question(2)]))).errors).toEqual(['f q1: "levels" must map thing IDs to "common" or "uncommon"']);
    expect(parseClockDraft("f", text(draft([question(0, { prompt: " " }), question(1), question(2)]))).errors).toEqual(['f q1: "prompt" must be a non-empty string']);
  });

  it("checks the day: three questions, three different lists, a wording that is not empty, and each question's rare and size", () => {
    expect(checkClockDay("d", draft([question(0), question(1)]) as ClockDraft)).toEqual(["d: has 2 questions, expected 3"]);
    expect(checkClockDay("d", draft([question(0), question(1), question(1)]) as ClockDraft)).toEqual(['d q3: "thing_b" is asked by q2 too']);
    expect(checkClockDay("d", draft([question(0), question(1, { prompt: "  " }), question(2)]) as ClockDraft)).toEqual(["d q2: the wording is empty"]);
    expect(checkClockDay("d", draft([question(0), question(1, { size: 0 }), question(2)]) as ClockDraft)).toEqual(['d q2: "size" must be a positive integer']);
  });

  it("holds a file to its path", () => {
    expect(checkDraftFile("offbeat/2026-12-02.json", text(draft()))).toEqual(["offbeat/2026-12-02.json: path must be offbeat/2026-12-01.json to match its game_id and date"]);
  });
});
