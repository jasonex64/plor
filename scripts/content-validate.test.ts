// The drafted-day validator on format 3 (src/content/puzzle.ts; docs/milestones/M13-13a-the-base.md): one valid day,
// then the same day with a single rule broken per case, written to a temporary content root (M01: one case per rule).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { HOST_ANSWERS_PER_QUESTION } from "../src/config/tunables.ts";
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
      // Seven categories, as a day must hold (each category once: the 30-day gap, M13 13d).
      category: ["animal", "fruit", "color", "country", "metal", "sport", "body_part"][i],
      host_bank: [id(i * 10 + 1), id(i * 10 + 2), id(i * 10 + 4)],
      host_answers: [id(i * 10 + 1), id(i * 10 + 2), id(i * 10 + 4)].slice(0, HOST_ANSWERS_PER_QUESTION[i]),
      levels: { [id(i * 10 + 1)]: "common" as const, [id(i * 10 + 3)]: "uncommon" as const },
      ...(steals ? { steals } : {}),
    })),
  };
}

const roots: string[] = [];
afterAll(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

// The seven categories the day asks, in a file of this test's own (13f-4c: not the repo's data/categories.json).
const CATS = join(mkdtempSync(join(tmpdir(), "plor-categories-")), "categories.json");
roots.push(join(CATS, ".."));
writeFileSync(CATS, JSON.stringify(["animal", "fruit", "color", "country", "metal", "sport", "body_part"].map((key, i) => ({ key, name: key, source: "wikidata", root: `Q${i + 1}` }))));

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

const errorsFor = (puzzle: unknown, file = FILE) => validateRoot(root({ [file]: JSON.stringify(puzzle) }), CATS).errors;
const broken = (change: (p: Puzzle) => void) => {
  const p = valid();
  change(p);
  return errorsFor(p);
};

describe("content:validate on format 3", () => {
  it("passes a valid drafted day", () => {
    expect(validateRoot(root({ [FILE]: JSON.stringify(valid()) }), CATS)).toEqual({ files: 1, errors: [] });
  });

  it("refuses an empty root, a stray file, and a file that isn't JSON", () => {
    expect(validateRoot(root({}), CATS).errors).toEqual([expect.stringMatching(/no puzzle files found$/)]);
    expect(validateRoot(root({ [FILE]: JSON.stringify(valid()), "offbeat/2026-11-03.jsno": "{}" }), CATS).errors).toEqual([
      "offbeat/2026-11-03.jsno: not a .json file; every file under the content root must be a puzzle or the bank",
    ]);
    expect(validateRoot(root({ [FILE]: "{ nope" }), CATS).errors).toEqual([expect.stringMatching(/^offbeat\/2026-11-02\.json: not valid JSON/)]);
  });

  it.each<[string, (p: Puzzle) => void, string]>([
    ["question count", (p) => p.questions.pop(), `${FILE}: has 6 questions, expected 7`],
    ["a host count off 1, 1, 1, 1, 2, 2, 3", (p) => (p.questions[1].host_answers = []), `${FILE} q2: has 0 host answers, expected 1`],
    ["host answer outside the bank", (p) => (p.questions[2].host_answers = [id(99)]), `${FILE} q3 thing "${id(99)}": host answer is not in host_bank`],
    ["host bank duplicate", (p) => p.questions[0].host_bank.push(id(1)), `${FILE} q1 thing "${id(1)}": listed twice in host_bank`],
    ["host answer duplicate", (p) => (p.questions[4].host_answers = [id(41), id(41)]), `${FILE} q5 thing "${id(41)}": listed twice in host_answers`],
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

// M13 13d: the question bank at the root, and the 30-day gap across drafted days.
describe("content:validate with the bank and the gap", () => {
  const dated = (date: string) => ({ ...valid(), date });
  it("refuses two days asking a category less than 30 days apart, and passes 30", () => {
    const near = validateRoot(root({ "offbeat/2026-11-02.json": JSON.stringify(valid()), "offbeat/2026-12-01.json": JSON.stringify(dated("2026-12-01")) }), CATS);
    expect(near.errors).toContain("animal is asked on 2026-11-02 and 2026-12-01, less than 30 days apart");
    const far = validateRoot(root({ "offbeat/2026-11-02.json": JSON.stringify(valid()), "offbeat/2026-12-02.json": JSON.stringify(dated("2026-12-02")) }), CATS);
    expect(far.errors.filter((e) => e.includes("days apart") && e.includes("2026-12-02"))).toEqual([]);
  });

  it("checks bank.json at the root, and doesn't count it as a puzzle", () => {
    const good = { format: 1, questions: [], themes: {} };
    expect(validateRoot(root({ [FILE]: JSON.stringify(valid()), "bank.json": JSON.stringify(good) }), CATS)).toEqual({ files: 1, errors: [] });
    expect(validateRoot(root({ [FILE]: JSON.stringify(valid()), "bank.json": JSON.stringify({ ...good, format: 2 }) }), CATS).errors).toContain('bank.json: "format" must be 1');
  });

  // M13 13e: the bank asks only categories in data/categories.json, each host bank holding the 3 Q7 takes.
  it("refuses a bank question asking a category not in data/categories.json, and a host bank under 3", () => {
    const q = { id: "name-a-x", prompt: "Name a thing", category: "animal", host_bank: ["a", "b", "c"], uncommon: [], themes: [], added_by: "claude" };
    const withBank = (questions: object[]) => validateRoot(root({ [FILE]: JSON.stringify(valid()), "bank.json": JSON.stringify({ format: 1, questions, themes: {} }) }), CATS).errors;
    expect(withBank([q])).toEqual([]);
    expect(withBank([{ ...q, category: "no_such_category" }])).toEqual([`bank.json question "name-a-x": category "no_such_category" is not in ${CATS}`]);
    expect(withBank([{ ...q, host_bank: ["a", "b"] }])).toEqual(['bank.json question "name-a-x": "host_bank" lists 2 names, at least 3 needed']);
  });
});
