// The question bank's rules (docs/milestones/M13-13d-the-question-bank.md): the shape, the 30-day gap per category, the
// pick for a date, the hand-picked 7, and easiest first. Pure: a bank and drafted days built here.
import { describe, expect, it } from "vitest";
import { easiestFirst, gapProblems, namedQuestions, parseBank, pickQuestions, type Bank, type BankQuestion } from "./bank";
import type { Puzzle } from "./puzzle";

const question = (id: string, category = id.replaceAll("-", "_"), themes: string[] = []): BankQuestion => ({
  id,
  prompt: `Name a ${id}`,
  category,
  host_bank: ["x", "y", "z"],
  uncommon: [],
  themes,
  added_by: "claude",
});
// A drafted day asking these bank questions (by prompt and category, as uses are matched).
const day = (date: string, questions: BankQuestion[]): Puzzle => ({
  format: 3,
  game_id: "offbeat",
  date,
  questions: questions.map((q) => ({ prompt: q.prompt, category: q.category, host_bank: [], host_answers: [], levels: {} })),
});
const ten = "abcdefghij".split("").map((c) => question(`q-${c}`));
const bank = (questions: BankQuestion[], themes: Record<string, string> = {}): Bank => ({ format: 1, questions, themes });

describe("the bank file", () => {
  it("parses a valid bank, and lists every problem in a broken one", () => {
    expect(parseBank("bank.json", JSON.stringify(bank(ten.slice(0, 2), { "2026-12-25": "christmas" }))).errors).toEqual([]);
    const broken = { format: 1, questions: [{ ...ten[0], id: "Bad Id" }, ten[1], ten[1]], themes: { "2026-02-30": "x" } };
    expect(parseBank("bank.json", JSON.stringify(broken)).errors).toEqual([
      'bank.json question 1: "id" must be a lower-case slug',
      'bank.json: question id "q-b" is listed twice',
      'bank.json: theme "2026-02-30": "x" must map a date to a slug',
    ]);
  });

  it("refuses a host bank smaller than the most host answers a position takes", () => {
    const small = bank([{ ...ten[0], host_bank: ["x", "y"] }]);
    expect(parseBank("bank.json", JSON.stringify(small)).errors).toEqual(['bank.json question 1: "host_bank" lists 2 names, at least 3 needed']);
  });
});

describe("the gap", () => {
  it("refuses a category asked 29 days apart, and passes 30", () => {
    expect(gapProblems([day("2026-11-01", [ten[0]]), day("2026-11-30", [ten[0]])])).toEqual([
      "q_a is asked on 2026-11-01 and 2026-11-30, less than 30 days apart",
    ]);
    expect(gapProblems([day("2026-11-01", [ten[0]]), day("2026-12-01", [ten[0]])])).toEqual([]);
  });
});

describe("pickQuestions", () => {
  it("leaves out a category used within 30 days before or after, and keeps one used 30 days away", () => {
    // Nine questions, two blocked: the 7 left must include q-c, used exactly 30 days before.
    const days = [day("2026-10-03", [ten[0]]), day("2026-11-30", [ten[1]]), day("2026-10-02", [ten[2]])];
    const picked = pickQuestions(bank(ten.slice(0, 9)), days, "2026-11-01").map((q) => q.id);
    expect(picked).not.toContain("q-a");
    expect(picked).not.toContain("q-b");
    expect(picked).toContain("q-c");
  });

  it("takes the date's theme first, then never used, then least recently used, each category once", () => {
    const themed = [question("t-one", "t_one", ["winter"]), question("t-two", "q_a", ["winter"])];
    const days = [day("2026-01-01", [ten[3]]), day("2026-03-01", [ten[4]])];
    const picked = pickQuestions(bank([...ten, ...themed], { "2026-12-25": "winter" }), days, "2026-12-25").map((q) => q.id);
    expect(picked.slice(0, 2).sort()).toEqual(["t-one", "t-two"]);
    // q-a shares t-two's category, so it's out; q-d and q-e were used, so the 5 never used (q-b, q-c, q-f to q-j) fill
    // the remaining 5 before them.
    expect(picked).not.toContain("q-a");
    expect(picked).not.toContain("q-d");
    expect(picked).not.toContain("q-e");
    expect(pickQuestions(bank([...ten, ...themed], { "2026-12-25": "winter" }), days, "2026-12-25").map((q) => q.id)).toEqual(picked);
  });

  it("prefers the least recently used once every question has run", () => {
    const eight = ten.slice(0, 8);
    const days = eight.map((q, i) => day(`2026-0${(i % 8) + 1}-01`, [q]));
    // q-h ran last (August), so it's the one left out of 7.
    expect(pickQuestions(bank(eight), days, "2026-12-01").map((q) => q.id)).not.toContain("q-h");
  });

  it("stops, saying how many are missing, when fewer than 7 are eligible", () => {
    expect(() => pickQuestions(bank(ten.slice(0, 5)), [], "2026-12-01")).toThrow(
      "2026-12-01: only 5 bank questions ask a category not used within 30 days; 2 more needed",
    );
  });
});

describe("namedQuestions", () => {
  const ids = ten.slice(0, 7).map((q) => q.id);
  it("takes the 7 named questions in that order", () => {
    expect(namedQuestions(bank(ten), [], "2026-12-01", [...ids].reverse()).map((q) => q.id)).toEqual([...ids].reverse());
  });

  it("refuses an unknown ID, and a category inside the gap", () => {
    expect(() => namedQuestions(bank(ten), [], "2026-12-01", [...ids.slice(0, 6), "nope"])).toThrow('no bank question "nope"');
    expect(() => namedQuestions(bank(ten), [day("2026-11-20", [ten[0]])], "2026-12-01", ids)).toThrow(
      "q_a is asked on 2026-11-20 and 2026-12-01, less than 30 days apart",
    );
  });
});

describe("easiestFirst", () => {
  it("orders by expected catch rate, lowest first, keeping ties in order", () => {
    expect(easiestFirst(["a", "b", "c", "d"], (x) => ({ a: 0.2, b: 0.05, c: 0.2, d: 0.1 })[x]!)).toEqual(["b", "d", "a", "c"]);
  });
});
