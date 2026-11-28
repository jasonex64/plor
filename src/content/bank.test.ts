// The question bank's rules (docs/milestones/M13-13d-the-question-bank.md): the shape. Pure: a bank built here.
import { describe, expect, it } from "vitest";
import { parseBank, type Bank, type BankQuestion } from "./bank";

const question = (id: string, category = id.replaceAll("-", "_")): BankQuestion => ({
  id,
  prompt: `Name a ${id}`,
  category,
  host_bank: ["x", "y", "z"],
  uncommon: [],
});
const ten = "abcdefghij".split("").map((c) => question(`q-${c}`));
const bank = (questions: BankQuestion[]): Bank => ({ format: 1, questions });

describe("the bank file", () => {
  it("parses a valid bank, and lists every problem in a broken one", () => {
    expect(parseBank("bank.json", JSON.stringify(bank([question("q-a", "fruit"), ten[1]]))).errors).toEqual([]);
    const broken = { format: 1, questions: [{ ...ten[0], id: "Bad Id" }, ten[1], ten[1]] };
    expect(parseBank("bank.json", JSON.stringify(broken)).errors).toEqual([
      'bank.json question 1: "id" must be a lower-case slug',
      'bank.json: question id "q-b" is listed twice',
    ]);
  });

  it("refuses two questions asking one prompt for one category (13f-4c)", () => {
    const twin = { ...ten[1], prompt: ten[0].prompt, category: ten[0].category };
    expect(parseBank("bank.json", JSON.stringify(bank([ten[0], twin]))).errors).toEqual(['bank.json: questions "q-a" and "q-b" ask "Name a q-a" for q_a']);
  });
});
