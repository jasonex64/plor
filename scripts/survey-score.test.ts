import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parsePuzzle, type Puzzle } from "../src/content/puzzle.ts";
import { parseCsv, readResponses, scoreSet } from "./survey-score.ts";

// The real 2026-10-26 puzzle: Q2 "a US state" (host texas), Q4 "a letter" (host a), Q7 "a zodiac sign" (hosts leo,
// scorpio).
const { puzzle } = parsePuzzle("offbeat/2026-10-26.json", readFileSync("content/offbeat/2026-10-26.json", "utf8"));
const day = puzzle as Puzzle;

describe("parseCsv", () => {
  it("reads quoted commas and doubled quotes, and either line end", () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\n')).toEqual([
      ["a", "b, c", 'say "hi"'],
      ["1", "2", "3"],
    ]);
  });
});

describe("readResponses", () => {
  const HEADER = "person,set,q1,q2,q3,q4,q5,q6,q7";

  it("allows Sheets' empty columns past q7 and trims each cell", () => {
    expect(readResponses(`${HEADER},,,\r\n1,1, panda ,iowa,,v,,,leo,,, \r\n`)).toEqual([
      { person: "1", set: "1", answers: ["panda", "iowa", "", "v", "", "", "leo"] },
    ]);
  });

  it("refuses anything typed past q7, a wrong header and an unknown set", () => {
    expect(() => readResponses(`${HEADER},\n1,1,a,b,c,d,e,f,g,oops\n`)).toThrow('line 2: "oops" is past q7');
    expect(() => readResponses("name,set,q1\n")).toThrow("the header must start with");
    expect(() => readResponses(`${HEADER}\n1,4,a,b,c,d,e,f,g\n`)).toThrow('set must be one of 1, 2, 3, got "4"');
  });
});

describe("scoreSet", () => {
  const responses = readResponses(
    [
      "person,set,q1,q2,q3,q4,q5,q6,q7",
      "1,1,,TEXAS,,a,,,Leo",
      "2,1,,Massachusetts,,b,,,Scorpio",
      "3,1,,Texsa,,the letter b,,,hare",
    ].join("\n"),
  );
  const { insights, unmatched } = scoreSet("2026-10-26", day, responses);

  it("counts an exact entry, after normalization, and whether the host caught it", () => {
    const q = (n: number) => insights.questions[n - 1];
    expect([q(2).answered, q(2).caught]).toEqual([2, 1]); // TEXAS caught; Massachusetts not; Texsa not an entry
    expect([q(4).answered, q(4).caught]).toEqual([2, 1]);
    expect([q(7).answered, q(7).caught]).toEqual([2, 2]); // both zodiac hosts
  });

  it("lists what isn't an entry, with what the answer box would offer, and never guesses", () => {
    expect(unmatched).toEqual([
      { question: 2, typed: "Texsa", suggestions: ["Texas"] },
      { question: 4, typed: "the letter b", suggestions: [] },
      { question: 7, typed: "hare", suggestions: [] },
    ]);
    expect(insights.questions[1].misses).toEqual([{ text: "Texsa", count: 1 }]);
  });
});
