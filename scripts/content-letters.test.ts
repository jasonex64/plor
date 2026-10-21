import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkPuzzleFile, parsePuzzle, type Puzzle } from "../src/content/puzzle.ts";
import { addLetters, pickLetters } from "./content-letters.ts";

const FIXTURES = join(import.meta.dirname, "fixtures", "content");
const FILE = "offbeat/2026-11-02.json";
const valid = () => parsePuzzle(FILE, readFileSync(join(FIXTURES, "valid", FILE), "utf8")).puzzle!;
const withoutLetters = (p: Puzzle): Puzzle => ({
  ...p,
  questions: p.questions.map((q) => {
    const copy = { ...q };
    delete copy.steals;
    return copy;
  }),
});

describe("pickLetters", () => {
  it("gives a day letters the validator accepts, the same every time", () => {
    const picked = pickLetters(withoutLetters(valid()))!;
    expect(checkPuzzleFile(FILE, JSON.stringify(picked))).toEqual([]);
    expect(pickLetters(withoutLetters(valid()))).toEqual(picked);
  });

  it("returns null when no letters fit, instead of breaking a rule", () => {
    // Every month is a host answer: any stolen letter that leaves a host typeable leaves no safe month.
    const p = withoutLetters(valid());
    p.questions[5] = { ...p.questions[5], host_bank: p.questions[5].entries.map((e) => e.id), host_answers: p.questions[5].entries.map((e) => e.id) };
    expect(pickLetters(p)).toBeNull();
  });
});

describe("addLetters", () => {
  it("fills a day with no letters and leaves a day that has them", () => {
    const root = mkdtempSync(join(tmpdir(), "plor-letters-"));
    try {
      cpSync(join(FIXTURES, "valid"), root, { recursive: true });
      expect(addLetters(root)).toEqual([]);
      const file = join(root, FILE);
      const stripped = withoutLetters(valid());
      writeFileSync(file, JSON.stringify(stripped, null, 2) + "\n");
      expect(addLetters(root)).toHaveLength(1);
      expect(checkPuzzleFile(FILE, readFileSync(file, "utf8"))).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
