// The drafted-day validator on format 3 (src/content/puzzle.ts; docs/milestones/M13-13a-the-base.md): one valid day,
// then the same day with a single rule broken per case, written to a temporary content root (M01: one case per rule).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { Puzzle } from "../src/content/puzzle.ts";
import { validateRoot } from "./content-validate.ts";

const FILE = "offbeat/2026-11-02.json";
const id = (n: number) => `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`;
// Schedule A: Q2 and Q4 steal a medium letter, Q5 a heavy consonant, Q7 a vowel (M04 G8).
const STEALS: (string | undefined)[] = [undefined, "c", undefined, "p", "r", undefined, "o"];

function valid(): Puzzle {
  return {
    format: 3,
    game_id: "offbeat",
    date: "2026-11-02",
    questions: STEALS.map((steals, i) => ({
      prompt: `Name a thing ${i + 1}`,
      category: "animal",
      host_bank: [id(i * 10 + 1), id(i * 10 + 2)],
      host_answers: [id(i * 10 + 1)],
      levels: { [id(i * 10 + 1)]: "common" as const, [id(i * 10 + 3)]: "uncommon" as const },
      ...(steals ? { steals } : {}),
    })),
  };
}

const roots: string[] = [];
afterAll(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

// A content root holding the given files.
function root(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "plor-content-"));
  roots.push(dir);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

const errorsFor = (puzzle: unknown, file = FILE) => validateRoot(root({ [file]: JSON.stringify(puzzle) })).errors;
const broken = (change: (p: Puzzle) => void) => {
  const p = valid();
  change(p);
  return errorsFor(p);
};

describe("content:validate on format 3", () => {
  it("passes a valid drafted day", () => {
    expect(validateRoot(root({ [FILE]: JSON.stringify(valid()) }))).toEqual({ files: 1, errors: [] });
  });

  it("refuses an empty root, a stray file, and a file that isn't JSON", () => {
    expect(validateRoot(root({})).errors).toEqual([expect.stringMatching(/no puzzle files found$/)]);
    expect(validateRoot(root({ [FILE]: JSON.stringify(valid()), "offbeat/2026-11-03.jsno": "{}" })).errors).toEqual([
      "offbeat/2026-11-03.jsno: not a .json file; every file under the content root must be a puzzle",
    ]);
    expect(validateRoot(root({ [FILE]: "{ nope" })).errors).toEqual([expect.stringMatching(/^offbeat\/2026-11-02\.json: not valid JSON/)]);
  });

  it.each<[string, (p: Puzzle) => void, string]>([
    ["question count", (p) => p.questions.pop(), `${FILE}: has 6 questions, expected 7`],
    ["no host answers", (p) => (p.questions[1].host_answers = []), `${FILE} q2: has no host answers`],
    ["host answer outside the bank", (p) => (p.questions[2].host_answers = [id(99)]), `${FILE} q3 thing "${id(99)}": host answer is not in host_bank`],
    ["host bank duplicate", (p) => p.questions[0].host_bank.push(id(1)), `${FILE} q1 thing "${id(1)}": listed twice in host_bank`],
    ["host answer duplicate", (p) => p.questions[0].host_answers.push(id(1)), `${FILE} q1 thing "${id(1)}": listed twice in host_answers`],
    ["steals where schedule A steals nothing", (p) => (p.questions[0].steals = "b"), `${FILE} q1: steals "b", but schedule A steals nothing at question 1`],
    ["no steal where schedule A steals", (p) => delete p.questions[1].steals, `${FILE} q2: schedule A steals a medium letter here, and "steals" is missing`],
    ["a letter from the wrong tier", (p) => (p.questions[4].steals = "e"), `${FILE} q5: steals "e", which is not a heavy consonant letter (rnlts)`],
    ["a letter stolen twice", (p) => (p.questions[3].steals = "c"), `${FILE} q4: steals "c", which an earlier question already stole`],
  ])("refuses %s", (_, change, message) => {
    expect(broken(change)).toEqual([message]);
  });

  it("refuses fields of the wrong shape, and unknown ones", () => {
    const p = valid() as unknown as { questions: Record<string, unknown>[] };
    p.questions[0].host_bank = ["dog"];
    p.questions[1].category = "Dog Breed";
    p.questions[2].levels = { [id(21)]: "rare" };
    p.questions[3].entries = [];
    expect(errorsFor(p)).toEqual([
      `${FILE} q1: "host_bank" must be a list of thing IDs`,
      `${FILE} q2: "category" must be a category key (lower-case letters and _)`,
      `${FILE} q3: "levels" must map thing IDs to "common" or "uncommon"`,
      `${FILE} q4: unknown field "entries"`,
    ]);
  });

  it("refuses a file whose path doesn't match its date", () => {
    expect(errorsFor(valid(), "offbeat/2026-11-03.json")).toEqual(["offbeat/2026-11-03.json: path must be offbeat/2026-11-02.json to match its game_id and date"]);
  });

  it("refuses an older format", () => {
    expect(errorsFor({ ...valid(), format: 2 })).toEqual([`${FILE}: "format" must be 3`]);
  });
});
