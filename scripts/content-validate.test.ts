// content:validate (scripts/content-validate.ts) on a content root: one valid day on a clock, then the same day with a single rule
// broken per case, written to a temporary content root (M01: one case per rule).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { ClockDraft } from "../src/content/puzzle.ts";
import { validateRoot } from "./content-validate.ts";

const FILE = "offbeat/2026-11-02.json";
const GAME_2_FILE = "substrings/2026-11-03.json";
const game2Day = (date: string, first = "ou") => ({ format: 1, game_id: "substrings", date, rounds: [first, "lu", "att", "yin", "odo", "hec", "vet"], bonus_letter: "f" });
const id = (n: number) => `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`;

// A day on a clock asking these lists, as a drafting session writes it.
function clockDay(date: string, categories: string[]): ClockDraft {
  return {
    format: 4,
    game_id: "offbeat",
    date,
    questions: categories.map((category, i) => ({
      prompt: `Name a ${category}`,
      category,
      levels: { [id(i * 10 + 1)]: "common", [id(i * 10 + 2)]: "uncommon" },
      rare: Array.from({ length: 6 }, (_, k) => id(i * 10 + 3 + k)),
      size: 40,
    })),
  };
}
const valid = () => clockDay("2026-11-02", ["animal", "fruit", "color"]);

const roots: string[] = [];
afterAll(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

// The categories the day asks, in a file of this test's own (13f-4c: not the repo's data/categories.json).
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
const broken = (change: (p: ClockDraft) => void) => {
  const p = valid();
  change(p);
  return errorsFor(p);
};

describe("content:validate on a day on a clock", () => {
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

  it.each<[string, (p: ClockDraft) => void, string]>([
    ["question count", (p) => p.questions.pop(), `${FILE}: has 2 questions, expected 3`],
    ["a list asked twice", (p) => (p.questions[2].category = "fruit"), `${FILE} q3: "fruit" is asked by q2 too`],
    ["an empty wording", (p) => (p.questions[0].prompt = " "), `${FILE} q1: "prompt" must be a non-empty string`],
    ["too few rare answers", (p) => p.questions[1].rare.pop(), `${FILE} q2: "rare" must be 6 thing IDs`],
    ["a rare answer that is in levels", (p) => (p.questions[0].rare[0] = id(1)), `${FILE} q1 thing "${id(1)}": rare, but it is in levels`],
    ["a size that is not positive", (p) => (p.questions[2].size = 0), `${FILE} q3: "size" must be a positive integer`],
  ])("refuses %s", (_, change, message) => {
    expect(broken(change)).toEqual([message]);
  });

  it("refuses fields of the wrong shape, and unknown ones", () => {
    const p = valid() as unknown as { questions: Record<string, unknown>[] };
    p.questions[0].rare = ["dog"];
    p.questions[1].category = "Dog Breed";
    p.questions[2].levels = { [id(21)]: "rare" };
    p.questions[0].entries = [];
    expect(errorsFor(p)).toEqual([
      `${FILE} q1: unknown field "entries"`,
      `${FILE} q1: "rare" must be a list of thing IDs`,
      `${FILE} q2: "category" must be a category key (lower-case letters and _)`,
      `${FILE} q3: "levels" must map thing IDs to "common" or "uncommon"`,
    ]);
  });

  it("refuses a file whose path doesn't match its date", () => {
    expect(errorsFor(valid(), "offbeat/2026-11-03.json")).toEqual(["offbeat/2026-11-03.json: path must be offbeat/2026-11-02.json to match its game_id and date"]);
  });

  it("refuses any other format", () => {
    expect(errorsFor({ ...valid(), format: 3 })).toEqual([`${FILE}: "format" must be 4`]);
  });

  it("does not hold a list to a gap: the same list on the next day is fine", () => {
    expect(validateRoot(root({ [FILE]: JSON.stringify(valid()), "offbeat/2026-11-03.json": JSON.stringify(clockDay("2026-11-03", ["animal", "metal", "sport"])) }), CATS).errors).toEqual([]);
  });
});

// M13 13d: the question bank at the root.
describe("content:validate with the bank", () => {
  it("checks bank.json at the root, and doesn't count it as a puzzle", () => {
    const good = { format: 1, questions: [] };
    expect(validateRoot(root({ [FILE]: JSON.stringify(valid()), "bank.json": JSON.stringify(good) }), CATS)).toEqual({ files: 1, errors: [] });
    expect(validateRoot(root({ [FILE]: JSON.stringify(valid()), "bank.json": JSON.stringify({ ...good, format: 2 }) }), CATS).errors).toContain('bank.json: "format" must be 1');
  });

  // M13 13e: the bank asks only categories in data/categories.json.
  it("refuses a bank question asking a category not in data/categories.json", () => {
    const q = { id: "name-a-x", prompt: "Name a thing", category: "animal", host_bank: ["a", "b", "c"], uncommon: [] };
    const withBank = (questions: object[]) => validateRoot(root({ [FILE]: JSON.stringify(valid()), "bank.json": JSON.stringify({ format: 1, questions }) }), CATS).errors;
    expect(withBank([q])).toEqual([]);
    expect(withBank([{ ...q, category: "no_such_category" }])).toEqual([`bank.json question "name-a-x": category "no_such_category" is not in ${CATS}`]);
  });
});

// M16 16c: each game's folder is held to that game's rules.
describe("content:validate on game 2's days", () => {
  it("passes a good day beside Offbeat's, and counts both", () => {
    expect(validateRoot(root({ [FILE]: JSON.stringify(valid()), [GAME_2_FILE]: JSON.stringify(game2Day("2026-11-03")) }), CATS)).toEqual({ files: 2, errors: [] });
  });

  it("holds a game 2 day to game 2's rules", () => {
    const errors = validateRoot(root({ [GAME_2_FILE]: JSON.stringify({ ...game2Day("2026-11-03"), rounds: ["ou"] }) }), CATS).errors;
    expect(errors.join("\n")).toMatch(/7 rounds/);
  });

  it("refuses a set back within 30 days", () => {
    const days = { "substrings/2026-11-03.json": JSON.stringify(game2Day("2026-11-03")), "substrings/2026-11-04.json": JSON.stringify(game2Day("2026-11-04")) };
    expect(validateRoot(root(days), CATS).errors.join("\n")).toMatch(/"ou" is used on 2026-11-03 and 2026-11-04/);
  });

  it("refuses a day in a folder that's no game's", () => {
    const errors = validateRoot(root({ "substring/2026-11-03.json": JSON.stringify(game2Day("2026-11-03")) }), CATS).errors;
    expect(errors.length).toBeGreaterThan(0);
  });
});

// M23 23a: an everyday question's researched list, content/lists/<category>.json. One case per refusal; a typed form is
// compared after normalize, and a name is itself a typed form.
describe("content:validate on researched lists", () => {
  const LIST = "lists/animal.json";
  const list = () => ({
    format: 1,
    category: "animal",
    passes: 1,
    borderline_seen: null as string | null,
    answers: [
      { name: "King Bed", aliases: ["king", "king size"], tier: "common" },
      { name: "Tempur-Pedic", aliases: ["tempurpedic"], tier: "rare", brand: true },
      { name: "flower bed", aliases: [], tier: "rare", borderline: true },
    ],
  });
  const withList = (value: unknown, file = LIST) => validateRoot(root({ [FILE]: JSON.stringify(valid()), [file]: typeof value === "string" ? value : JSON.stringify(value) }), CATS);

  it("passes a valid list beside a day, counts it, and doesn't read it as a puzzle", () => {
    expect(withList(list())).toEqual({ files: 2, errors: [] });
  });

  // M23 23b: a researched question's own names in the bank are all on its list (23a's review: the cake question still
  // named brownie, cookie and waffle).
  it("refuses a bank name that isn't on its question's researched list, and a thing ID there", () => {
    const q = { id: "name-a-x", prompt: "Name a thing", category: "animal", host_bank: ["King Bed", "king size", "tempurpedic"], uncommon: ["FLOWER  bed"] };
    const withBank = (question: object) => validateRoot(root({ [FILE]: JSON.stringify(valid()), [LIST]: JSON.stringify(list()), "bank.json": JSON.stringify({ format: 1, questions: [question] }) }), CATS).errors;
    expect(withBank(q)).toEqual([]);
    expect(withBank({ ...q, uncommon: ["cookie"] })).toEqual([`bank.json question "name-a-x": "cookie" is not on ${LIST}`]);
    expect(withBank({ ...q, host_bank: [...q.host_bank, "#b09d10e2-458c-557b-9e66-92836482b320"] })).toEqual([
      `bank.json question "name-a-x": "#b09d10e2-458c-557b-9e66-92836482b320" is a thing ID, but ${LIST} is a researched list: name the answer`,
    ]);
  });

  it("refuses two answers sharing a typed form after normalization, a name being one", () => {
    const l = list();
    l.answers[2].aliases = ["KING!"];
    expect(withList(l).errors).toEqual([`${LIST}: "king" is typed for both "King Bed" and "flower bed"`]);
    l.answers[2].aliases = [];
    l.answers[2].name = "king  bed";
    expect(withList(l).errors).toEqual([`${LIST}: "king bed" is typed for both "King Bed" and "king  bed"`]);
  });

  it("refuses an empty name, an alias or name with no typed form, and an unknown tier", () => {
    const l = list();
    l.answers[0].name = "  ";
    l.answers[1].aliases = ["..."];
    l.answers[2].tier = "first10";
    expect(withList(l).errors).toEqual([
      `${LIST} answer 1: "name" must be a non-empty string`,
      `${LIST} answer 2: alias "..." has no letters or digits to type`,
      `${LIST} answer 3: "tier" must be "common", "uncommon" or "rare"`,
    ]);
  });

  it("refuses a category not in the categories file, and one that isn't the file's name", () => {
    expect(withList({ ...list(), category: "no_such_category" }, "lists/no_such_category.json").errors).toEqual([
      `lists/no_such_category.json: category "no_such_category" is not in ${CATS}`,
    ]);
    expect(withList({ ...list(), category: "fruit" }).errors).toEqual([`${LIST}: "category" is "fruit", but the path must be lists/fruit.json`]);
  });

  it("refuses fields of the wrong shape, an unknown one, and a file that isn't JSON", () => {
    const l = { ...list(), format: 2, passes: 3, borderline_seen: "2026-02-30", extra: 1 } as Record<string, unknown>;
    expect(withList(l).errors).toEqual([
      `${LIST}: unknown field "extra"`,
      `${LIST}: "format" must be 1`,
      `${LIST}: "passes" must be 0, 1 or 2`,
      `${LIST}: "borderline_seen" must be null or a real date, YYYY-MM-DD`,
    ]);
    expect(withList("{ nope").errors).toEqual([expect.stringMatching(/^lists\/animal\.json: not valid JSON/)]);
  });
});

