// The drafting script's pure parts (scripts/draft.ts): the letter picker, which tries schedule A's slots in a
// date-seeded order and skips what doesn't fit (the database checks it runs per choice are the caller's: here fits is
// a stand-in); the host answers drawn from the bank, among those the letters leave sayable; and the soft guide.
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { LETTER_SCHEDULE, LETTER_TIERS } from "../src/config/tunables.ts";
import { blockRange, clockArgs, clockLines, draftArgs, fitOrder, isDayFailure, moveTo, pickHosts, pickLetters, softGuide, swapLines, withHosts, withSwaps } from "./draft.ts";

const fitsAll = async () => true;

describe("pickLetters", () => {
  it("steals one letter of the scheduled tier at each scheduled question, each letter once, the same for a date every time", async () => {
    const steals = await pickLetters("2026-11-02", 7, fitsAll);
    expect(steals).toHaveLength(7);
    steals!.forEach((letter, i) => {
      const tier = LETTER_SCHEDULE[i];
      if (tier === null) expect(letter).toBeUndefined();
      else expect(LETTER_TIERS[tier]).toContain(letter);
    });
    expect(new Set(steals!.filter(Boolean)).size).toBe(4);
    expect(await pickLetters("2026-11-02", 7, fitsAll)).toEqual(steals);
  });

  it("tries the next letter when a choice doesn't fit", async () => {
    const first = (await pickLetters("2026-11-02", 7, fitsAll))!;
    const steals = await pickLetters("2026-11-02", 7, async (_, trial) => trial[1] !== first[1]);
    expect(steals![1]).not.toBe(first[1]);
    expect(LETTER_TIERS.medium).toContain(steals![1]);
  });

  it("finds nothing when no letter fits", async () => {
    expect(await pickLetters("2026-11-02", 7, async (upTo) => upTo < 5)).toBeNull();
  });
});

describe("pickHosts", () => {
  const bank = ["a", "b", "c", "d"];
  it("draws 1, 1, 1, 1, 2, 2, 3 answers from the bank, the same for a date every time", () => {
    const hosts = [0, 1, 2, 3, 4, 5, 6].map((i) => pickHosts("2026-11-02", i, bank));
    expect(hosts.map((h) => h.length)).toEqual([1, 1, 1, 1, 2, 2, 3]);
    for (const h of hosts) {
      expect(h.every((x) => bank.includes(x))).toBe(true);
      expect(new Set(h).size).toBe(h.length);
    }
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => pickHosts("2026-11-02", i, bank))).toEqual(hosts);
  });

  it("refuses a bank smaller than the host's count", () => {
    expect(() => pickHosts("2026-11-02", 6, ["a", "b"])).toThrow("the host bank holds 2, and the host names 3");
  });
});

describe("withHosts", () => {
  // Seven questions whose host banks are named as the letters suggest: "bee" and "ant" avoid "o"; "owl", "ox" and "cow" don't.
  const names = new Map([["bee", "bee"], ["ant", "ant"], ["gnu", "gnu"], ["owl", "owl"], ["ox", "ox"], ["cow", "cow"]]);
  const question = (host_bank: string[]) => ({ prompt: "Name an animal", category: "animal", host_bank, host_answers: [], levels: {} });
  const steals = [undefined, undefined, undefined, undefined, undefined, undefined, "o"];
  it("draws the host answers only among bank answers whose names avoid the letters stolen so far", () => {
    const bank = ["bee", "ant", "gnu", "owl", "ox", "cow"];
    const day = withHosts("2026-11-02", Array.from({ length: 7 }, () => question(bank)), steals, names)!;
    expect(day.questions[6].steals).toBe("o");
    // Before the "o" is stolen, the draw is over the whole bank; at Q7, over the three that avoid it, the same each time.
    for (let i = 0; i < 6; i++) expect(day.questions[i].host_answers).toEqual(pickHosts("2026-11-02", i, bank));
    expect(day.questions[6].host_answers).toEqual(pickHosts("2026-11-02", 6, ["bee", "ant", "gnu"]));
  });

  it("finds no day when a question has fewer sayable answers than the host names there", () => {
    expect(withHosts("2026-11-02", Array.from({ length: 7 }, () => question(["bee", "ant", "owl", "ox", "cow"])), steals, names)).toBeNull();
  });
});

describe("moving a question that blocks the letters", () => {
  const seven = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"];
  it("knows which questions a stop covers: schedule A's slots end at Q3, Q4, Q6 and Q7", () => {
    expect([0, 3, 4, 6].map((held) => blockRange(held, 7))).toEqual([[0, 3], [3, 4], [4, 6], [6, 7]]);
  });

  it("moves one question to an earlier place, the others in order", () => {
    expect(moveTo(seven, 6, 3)).toEqual(["q1", "q2", "q3", "q7", "q4", "q5", "q6"]);
  });

  // A stand-in for the letters: "q7" only fits at Q4 or earlier, and the letters stop at the slot that covers it.
  const lettersFor = async (order: string[]) => {
    const at = order.indexOf("q7");
    return at <= 3 ? { steals: ["x"], held: 7 } : { steals: null, held: at >= 6 ? 6 : 4 };
  };

  it("moves a blocker past the slot that covers Q5 and Q6, to the nearest place that fits", async () => {
    expect(await fitOrder(seven, lettersFor)).toEqual({ questions: ["q1", "q2", "q3", "q7", "q4", "q5", "q6"], steals: ["x"], held: 7 });
  });

  it("keeps the order when it fits, and returns it with its stop when no place does", async () => {
    expect((await fitOrder(seven, async () => ({ steals: ["x"], held: 7 }))).questions).toEqual(seven);
    expect(await fitOrder(seven, async () => ({ steals: null, held: 6 }))).toEqual({ questions: seven, steals: null, held: 6 });
  });
});

// 13e-10b ("Draft swaps the blocker (Recommended)"): a picked day whose letters don't fit leaves out the last question
// where they stopped and takes the pick's next choice, until they fit or the pick runs out.
describe("swapping out a question the letters block", () => {
  const q = (id: string) => ({ id, prompt: `Name ${id}` });
  const bank = ["a", "b", "c", "d", "e", "f", "g", "h", "i"].map(q);
  // The pick: the first 7 not left out, or a throw when fewer than 7 are left.
  const pick = (leftOut: ReadonlySet<string>) => {
    const left = bank.filter((x) => !leftOut.has(x.id));
    if (left.length < 7) throw new Error(`only ${left.length} bank questions eligible`);
    return left.slice(0, 7);
  };

  it("tries each blocker alone, last first, and keeps the last out when none fits alone, until the letters fit", async () => {
    // g and f block (the letters stop there); the day fits once neither is in it.
    const tried: string[][] = [];
    const result = await withSwaps(pick, async (chosen) => {
      tried.push(chosen.map((x) => x.id));
      const blockers = chosen.filter((x) => x.id === "f" || x.id === "g");
      return blockers.length ? { blockers } : { built: chosen.map((x) => x.id).join("") };
    });
    expect(result).toEqual({ built: "abcdehi", swapped: [q("g"), q("f")] });
    // g alone left out still blocks at f, f alone still blocks at g; so g stays out and f goes next.
    expect(tried).toEqual(["abcdefg", "abcdefh", "abcdegh", "abcdehi"].map((t) => [...t]));
  });

  it("leaves out the real blocker of a two-question block, not the question after it (review)", async () => {
    // The letters stop at f and g together, but only f is thin: leaving out g alone still blocks, f alone fits.
    const result = await withSwaps(pick, async (chosen) =>
      chosen.some((x) => x.id === "f") ? { blockers: [q("f"), chosen[6]] } : { built: chosen.map((x) => x.id).join("") });
    expect(result).toEqual({ built: "abcdegh", swapped: [q("f")] });
  });

  it("names each swap in the summary", () => {
    expect(swapLines([q("g"), q("f")])).toEqual(['swapped out "Name g": no letters fit with it', 'swapped out "Name f": no letters fit with it']);
  });

  it("builds the first pick with no swap when its letters fit", async () => {
    expect(await withSwaps(pick, async (chosen) => ({ built: chosen.length }))).toEqual({ built: 7, swapped: [] });
  });

  it("fails as the pick does when too few are left, naming the questions swapped out", async () => {
    await expect(withSwaps(pick, async (chosen) => ({ blockers: [chosen[6]] }))).rejects.toThrow(
      'only 6 bank questions eligible, after swapping out "Name g", "Name h", "Name i", as no letters fit with them',
    );
    const none = () => { throw new Error("only 5 bank questions eligible"); };
    await expect(withSwaps(none, async () => ({ built: 0 }))).rejects.toThrow(/^only 5 bank questions eligible$/);
  });

  it("fails as building a swapped-in day does, naming the questions swapped out before it (13f-3b-2)", async () => {
    // g blocks; the day without it holds h, whose name doesn't resolve.
    const build = async (chosen: { id: string; prompt: string }[]) => {
      if (chosen.some((x) => x.id === "h")) throw new Error("h: no thing named that");
      return chosen.some((x) => x.id === "g") ? { blockers: [q("g")] } : { built: 0 };
    };
    await expect(withSwaps(pick, build)).rejects.toThrow('h: no thing named that, after swapping out "Name g", as no letters fit with them');
    await expect(withSwaps(() => bank.slice(1, 8), build)).rejects.toThrow(/^h: no thing named that$/);
  });
});

describe("the soft guide", () => {
  it("shows each question's expected catch rate against its target, and the finish rates", () => {
    // Seven questions catching 10% each: 0.9^7 = 47.8% finish. The targets: 0.97 × 0.95 × 0.93 × 0.90 × 0.87 × 0.84 × 0.80
    // = 45.1%.
    expect(softGuide([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1])).toEqual([
      "  q1: expected catch 10% (target 3%)",
      "  q2: expected catch 10% (target 5%)",
      "  q3: expected catch 10% (target 7%)",
      "  q4: expected catch 10% (target 10%)",
      "  q5: expected catch 10% (target 13%)",
      "  q6: expected catch 10% (target 16%)",
      "  q7: expected catch 10% (target 20%)",
      "  expected finish 48% (the targets': 45%)",
    ]);
  });
});

describe("draftArgs", () => {
  it("reads a date alone as it did before --not", () => {
    expect(draftArgs(["2026-11-20"])).toEqual({ date: "2026-11-20", ids: undefined, not: [] });
    expect(draftArgs(["2026-11-20", "--questions", "a,b"])).toEqual({ date: "2026-11-20", ids: ["a", "b"], not: [] });
    expect(draftArgs(["simulate"])).toEqual({ date: "simulate", ids: undefined, not: [] });
  });

  it("reads --not as a list of IDs", () => {
    expect(draftArgs(["2026-11-20", "--not", "a,b"])).toEqual({ date: "2026-11-20", ids: undefined, not: ["a", "b"] });
  });

  it("refuses --not naming a question that --questions names, saying which", () => {
    expect(() => draftArgs(["2026-11-20", "--questions", "a,b", "--not", "b,c"])).toThrow('--not and --questions both name "b"');
  });

  it("returns null for usage it doesn't take", () => {
    expect(draftArgs([])).toBeNull();
    expect(draftArgs(["2026-11-20", "--not"])).toBeNull();
    expect(draftArgs(["2026-11-20", "--questions"])).toBeNull();
    expect(draftArgs(["2026-11-20", "--bogus", "x"])).toBeNull();
    expect(draftArgs(["not-a-date"])).toBeNull();
    expect(draftArgs(["simulate", "--not", "a"])).toBeNull();
  });
});

describe("isDayFailure", () => {
  it("counts the draft's own refusals as failed days, and stops on the database's errors or a lost connection (13f-4c)", () => {
    expect(isDayFailure(new Error("no letters fit schedule A for 2027-01-03"))).toBe(true);
    expect(isDayFailure(Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" }))).toBe(false);
    expect(isDayFailure(new Error("Connection terminated unexpectedly"))).toBe(false);
  });
});

// `npm run draft` runs under plain Node, which resolves no "@/" alias: one in a module the script imports stopped every
// draft from M14 14c-6b-1 until the beta's first batch (2026-11-15). Vitest resolves the alias, so only a real run shows it.
describe("the script under plain Node", () => {
  it("loads its imports and prints its usage", () => {
    const run = spawnSync(process.execPath, ["scripts/draft.ts"], { encoding: "utf8" });
    expect(run.stderr).not.toContain("ERR_MODULE_NOT_FOUND");
    expect(run.stderr).toContain("usage: npm run draft");
  });
});

// `npm run draft -- clock <date>` (docs/milestones/M23-23e-drafting-and-approving.md, 23e-1): the command line, and what it prints.
describe("clockArgs", () => {
  it("reads the clock command and its date", () => {
    expect(clockArgs(["clock", "2026-12-01"])).toBe("2026-12-01");
  });

  it("returns null for anything else: another command, no date, a date that isn't one, a flag", () => {
    expect(clockArgs(["2026-12-01"])).toBeNull();
    expect(clockArgs(["clock"])).toBeNull();
    expect(clockArgs(["clock", "2026-02-30"])).toBeNull();
    expect(clockArgs(["clock", "2026-12-01", "--not", "a"])).toBeNull();
    expect(draftArgs(["clock", "2026-12-01"])).toBeNull();
  });
});

describe("clockLines", () => {
  it("says for each question its wording and list, and how many days ago the list last appeared, or never", () => {
    const day = { format: 4 as const, game_id: "offbeat" as const, date: "2026-12-01", questions: [{ prompt: "Name a bread", category: "bread" }, { prompt: "Name a soup", category: "soup" }, { prompt: "Name a tool", category: "tool" }] };
    const lines = clockLines(day as never, [{ category: "bread", last: "2026-11-19" }, { category: "soup", last: null }, { category: "tool", last: "2026-11-30" }]);
    expect(lines).toEqual([
      '  q1 "Name a bread" (bread): last appeared 12 days ago',
      '  q2 "Name a soup" (soup): last appeared never',
      '  q3 "Name a tool" (tool): last appeared 1 day ago',
    ]);
  });
});
