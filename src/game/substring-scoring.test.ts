// Game 2's score on the human's approved tables and worked runs (docs/milestones/M16-16e-points-and-boards.md, answer
// 13 and Numbers). The words are letters made up to hit each run's counts, as the score reads only a word's letters.
import { describe, expect, it } from "vitest";
import { lettersPoints, scoreRun, wordPoints } from "./substring-scoring";

describe("the approved tables", () => {
  it("scores each word length as the table says", () => {
    const table = { 3: 20, 4: 25, 5: 30, 6: 40, 7: 50, 8: 60, 9: 75, 10: 95, 11: 120, 12: 150, 13: 190, 14: 230, 15: 290, 16: 360, 17: 450, 18: 570 };
    for (const [length, points] of Object.entries(table)) expect(wordPoints("a".repeat(Number(length)))).toBe(points);
  });

  it("scores each count of different letters as the table says", () => {
    const table = { 13: 170, 14: 200, 15: 230, 18: 350, 20: 460, 22: 610, 23: 700, 24: 810, 26: 1100 };
    for (const [n, points] of Object.entries(table)) expect(lettersPoints(Number(n))).toBe(points);
  });

  it("gives no different-letters points to a run with no word", () => {
    expect(lettersPoints(0)).toBe(0);
    expect(scoreRun([], "j")).toEqual({ words: 0, bonus: 0, letters: 0, used: "", total: 0 });
  });
});

describe("the approved worked runs", () => {
  const runs: [string, string[], string, number][] = [
    ["typical: 7 words of 7, 18 letters, the bonus letter in 3", ["abcdefg", "hijklmn", "opqrabc", "jabcdef", "jghiklm", "gfedcba", "nopqrab"], "j", 1060],
    ["short: 7 words of 5, 15 letters, 2", ["abcde", "fghij", "klmno", "jabcd", "efghi", "klmna", "bcdef"], "j", 680],
    ["long: 7 words of 10, 20 letters, 3", ["abcdefghij", "klmnopqrst", "jabcdefghi", "jklmnopqrs", "abcdefghik", "lmnopqrsta", "bcdefghikl"], "j", 1485],
    ["wide: 7 words of 7, 23 letters, 3", ["abcdefg", "hijklmn", "opqrstu", "vwabcde", "jfghikl", "jmnopqr", "stuvwab"], "j", 1410],
    ["an e day: the bonus letter in all 7", ["abcdefg", "ehijklm", "enopqra", "ebcdfgh", "eijklmn", "eopqrab", "ecdfghi"], "e", 1540],
    ["a j day: the bonus letter in none", ["abcdefg", "hiklmno", "pqrsabc", "defghik", "lmnopqr", "sabcdef", "ghiklmn"], "j", 700],
    ["two misses: 5 words of 7, 14 letters, 1", ["abcdefg", "hijklmn", "abcdefh", "iklmnab", "cdefghi"], "j", 570],
  ];
  for (const [name, words, bonusLetter, total] of runs) {
    it(name, () => expect(scoreRun(words, bonusLetter).total).toBe(total));
  }

  it("splits the typical run about a third each", () => {
    expect(scoreRun(runs[0][1], "j")).toEqual({ words: 350, bonus: 360, letters: 350, used: "abcdefghijklmnopqr", total: 1060 });
  });
});

describe("the bonus letter", () => {
  it("counts once in a word that holds it more than once (answer 7)", () => {
    expect(scoreRun(["jjjabcd"], "j").bonus).toBe(120);
  });
});
