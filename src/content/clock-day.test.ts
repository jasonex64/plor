// A day on a clock built from the researched lists, and the pick of which lists it asks (docs/milestones/M23-23e-drafting-
// and-approving.md, 23e-1). Pure: the lists, the admin's edits and the days already used come in as arguments.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { QUESTIONS_PER_CLOCK_DAY, RARE_PER_CLOCK_QUESTION } from "../config/tunables.ts";
import { answerId, parseList, type ListAnswer, type ResearchList } from "./list.ts";
import { buildClockDay, listAnswers, pickLists, rankLists, whenText, type ClockSource } from "./clock-day.ts";
import { checkClockDay } from "./puzzle.ts";

// A list of `rare` rare answers (Odd <list> 0, 1, …) behind one common and one uncommon answer.
function list(category: string, rare = 12): ResearchList {
  const answers: ListAnswer[] = [
    { name: "Plain", aliases: ["plains"], tier: "common" },
    { name: "Fancy", aliases: [], tier: "uncommon" },
    ...Array.from({ length: rare }, (_, i): ListAnswer => ({ name: `Odd ${category} ${i}`, aliases: [], tier: "rare" })),
  ];
  return { format: 1, category, passes: 2, borderline_seen: null, answers };
}
const source = (over: Partial<ClockSource> = {}): ClockSource => ({
  lists: [list("alpha"), list("beta"), list("gamma"), list("delta")],
  edits: [],
  prompts: new Map([["alpha", "Name an alpha"], ["beta", "Name a beta"], ["gamma", "Name a gamma"], ["delta", "Name a delta"]]),
  ...over,
});
const picks = (...categories: string[]) => categories.map((category) => ({ category, reroll: 0 }));

describe("listAnswers", () => {
  it("gives the list's common and uncommon answers as levels by thing ID, its rare ones as the pool, and its count", () => {
    const a = listAnswers(list("alpha"), []);
    expect(a.levels).toEqual({ [answerId("alpha", "Plain")]: "common", [answerId("alpha", "Fancy")]: "uncommon" });
    expect(a.rare).toHaveLength(12);
    expect(a.rare[0]).toEqual({ id: answerId("alpha", "Odd alpha 0"), name: "Odd alpha 0" });
    expect(a.size).toBe(14);
  });

  it("leaves out an answer struck by any of its names, and counts an answer added and not in the file as one more", () => {
    const a = listAnswers(list("alpha"), [
      { category: "alpha", name: "plains", kind: "strike" },
      { category: "alpha", name: "odd alpha 3", kind: "strike" },
      { category: "alpha", name: "Brand New", kind: "add" },
      { category: "alpha", name: "FANCY", kind: "add" }, // the file has it already
      { category: "beta", name: "fancy", kind: "strike" }, // another list's
    ]);
    expect(a.levels).toEqual({ [answerId("alpha", "Fancy")]: "uncommon" });
    expect(a.rare.map((r) => r.name)).not.toContain("Odd alpha 3");
    expect(a.rare).toHaveLength(11);
    // 14 in the file, two struck, one added: 13.
    expect(a.size).toBe(13);
  });
});

describe("buildClockDay", () => {
  it("builds a format 4 day of the bank's wording, the list's tiers, six rare answers and the list's count", () => {
    const { day } = buildClockDay("2026-12-01", picks("alpha", "beta", "gamma"), source());
    expect(day).toMatchObject({ format: 4, game_id: "offbeat", date: "2026-12-01" });
    expect(day.questions.map((q) => [q.prompt, q.category, q.size])).toEqual([["Name an alpha", "alpha", 14], ["Name a beta", "beta", 14], ["Name a gamma", "gamma", 14]]);
    expect(day.questions[0].levels).toEqual(listAnswers(list("alpha"), []).levels);
    expect(day.questions[0].rare).toHaveLength(RARE_PER_CLOCK_QUESTION);
    expect(checkClockDay("d", day)).toEqual([]);
  });

  it("draws the six from the list's rare answers, the same for a date, list and re-roll count every time, another six for another count", () => {
    const six = (reroll: number, date = "2026-12-01") => buildClockDay(date, [{ category: "alpha", reroll }, ...picks("beta", "gamma")], source()).day.questions[0].rare;
    expect(six(0)).toEqual(six(0));
    expect(six(1)).not.toEqual(six(0));
    expect(six(0, "2026-12-02")).not.toEqual(six(0));
    const pool = new Set(listAnswers(list("alpha"), []).rare.map((r) => r.id));
    expect(six(0).every((id) => pool.has(id))).toBe(true);
    expect(new Set(six(0)).size).toBe(RARE_PER_CLOCK_QUESTION);
  });

  it("gives a list the same six wherever its question sits, so moving a question changes nothing in it", () => {
    const at = (...order: string[]) => buildClockDay("2026-12-01", picks(...order), source()).day.questions;
    const before = at("alpha", "beta", "gamma");
    const after = at("gamma", "alpha", "beta");
    for (const category of ["alpha", "beta", "gamma"]) {
      expect(after.find((q) => q.category === category)).toEqual(before.find((q) => q.category === category));
    }
  });

  it("names the six it drew, in the order it drew them, for the page", () => {
    const { day, examples } = buildClockDay("2026-12-01", picks("alpha", "beta", "gamma"), source());
    const pool = listAnswers(list("alpha"), []).rare;
    expect(examples[0]).toEqual(day.questions[0].rare.map((id) => pool.find((r) => r.id === id)!.name));
  });

  it("uses a given wording for that question, and takes a struck answer out of its levels and its six", () => {
    const edits = [{ category: "alpha", name: "plain", kind: "strike" as const }];
    const { day } = buildClockDay("2026-12-01", [{ category: "alpha", wording: "Name any alpha", reroll: 0 }, ...picks("beta", "gamma")], source({ edits }));
    expect(day.questions[0].prompt).toBe("Name any alpha");
    expect(day.questions[1].prompt).toBe("Name a beta");
    expect(day.questions[0].levels).toEqual({ [answerId("alpha", "Fancy")]: "uncommon" });
    expect(day.questions[0].size).toBe(13);
  });

  it("keeps an empty wording for the day check to refuse, and refuses a list that is not one, or has too few rare answers", () => {
    const { day } = buildClockDay("2026-12-01", [{ category: "alpha", wording: " ", reroll: 0 }, ...picks("beta", "gamma")], source());
    expect(checkClockDay("d", day)).toEqual(["d q1: the wording is empty"]);
    expect(() => buildClockDay("2026-12-01", picks("alpha", "beta", "nope"), source())).toThrow('"nope" is not a researched list');
    expect(() => buildClockDay("2026-12-01", picks("gamma"), source({ lists: [list("gamma", 5)] }))).toThrow("gamma has 5 rare answers, and a day on a clock needs 6");
  });

  it("builds from a real list, whose every answer counts", () => {
    const { list: bread } = parseList("lists/bread.json", readFileSync("content/lists/bread.json", "utf8"), null);
    const { day } = buildClockDay("2026-12-01", picks("bread"), { lists: [bread!], edits: [], prompts: new Map([["bread", "Name a kind of bread"]]) });
    expect(day.questions[0].size).toBe(bread!.answers.length);
    expect(Object.keys(day.questions[0].levels)).toHaveLength(bread!.answers.filter((a) => a.tier !== "rare").length);
  });
});

describe("rankLists and pickLists", () => {
  const day = (date: string, ...categories: string[]) => ({ date, questions: categories.map((category) => ({ category })) });
  const all = ["alpha", "beta", "gamma", "delta", "eps", "zeta"];

  it("puts a list never used first, then the longest unused", () => {
    const days = [day("2026-11-20", "alpha", "beta", "gamma"), day("2026-11-25", "delta", "eps")];
    const ranked = rankLists("2026-12-01", all, days);
    expect(ranked[0]).toEqual({ category: "zeta", last: null });
    expect(ranked.slice(1, 4).map((r) => r.category).sort()).toEqual(["alpha", "beta", "gamma"]);
    expect(ranked.slice(4).map((r) => r.category).sort()).toEqual(["delta", "eps"]);
    expect(ranked.map((r) => r.last)).toEqual([null, "2026-11-20", "2026-11-20", "2026-11-20", "2026-11-25", "2026-11-25"]);
  });

  it("picks three, breaking ties by the date: the same every time for a date, not the same for every date", () => {
    const pick = (date: string) => pickLists(date, all, []).map((p) => p.category);
    expect(pick("2026-12-01")).toHaveLength(QUESTIONS_PER_CLOCK_DAY);
    expect(pick("2026-12-01")).toEqual(pick("2026-12-01"));
    expect(new Set([1, 2, 3, 4, 5, 6, 7, 8].map((d) => pick(`2026-12-0${d}`).join())).size).toBeGreaterThan(1);
  });

  it("takes the least recently used of what is left once the used ones are taken", () => {
    const days = [day("2026-11-20", "alpha"), day("2026-11-21", "beta"), day("2026-11-22", "gamma"), day("2026-11-23", "delta")];
    expect(pickLists("2026-12-01", all, days).map((p) => p.category).sort()).toEqual(["alpha", "eps", "zeta"]);
  });

  it("uses the latest day a list appeared on, leaves out the date's own day (a redraft replaces it), and the lists it is told to skip", () => {
    const own = [day("2026-12-01", "alpha", "beta", "gamma")];
    expect(rankLists("2026-12-01", all, own).every((r) => r.last === null)).toBe(true);
    expect(rankLists("2026-12-01", all, [day("2026-11-01", "alpha"), day("2026-11-20", "alpha")]).find((r) => r.category === "alpha")!.last).toBe("2026-11-20");
    expect(pickLists("2026-12-01", all, [], ["alpha", "beta", "gamma", "delta", "eps"]).map((p) => p.category)).toEqual(["zeta"]);
  });

  it("says when a list last appeared in words", () => {
    expect(whenText("2026-12-01", null)).toBe("never");
    expect(whenText("2026-12-01", "2026-11-30")).toBe("1 day ago");
    expect(whenText("2026-12-01", "2026-11-19")).toBe("12 days ago");
    expect(whenText("2026-12-01", "2026-12-02")).toBe("in 1 day");
    expect(whenText("2026-12-01", "2026-12-05")).toBe("in 4 days");
  });
});
