// The drafting script's pure parts (scripts/draft.ts): its command line, which takes a date and nothing else, and the line it
// prints for each question of the day it drafted.
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { clockLines, draftArgs } from "./draft.ts";

describe("draftArgs", () => {
  it("reads a date", () => {
    expect(draftArgs(["2026-11-20"])).toBe("2026-11-20");
  });

  it("returns null for usage it doesn't take: no date, a date that isn't one, a flag, a second word, and the words the old draft took", () => {
    expect(draftArgs([])).toBeNull();
    expect(draftArgs(["not-a-date"])).toBeNull();
    expect(draftArgs(["2026-02-30"])).toBeNull();
    expect(draftArgs(["2026-11-20", "--not", "a"])).toBeNull();
    expect(draftArgs(["2026-11-20", "--questions", "a,b"])).toBeNull();
    expect(draftArgs(["clock", "2026-12-01"])).toBeNull();
    expect(draftArgs(["clock"])).toBeNull();
    expect(draftArgs(["simulate"])).toBeNull();
    expect(draftArgs(["check-bank"])).toBeNull();
  });
});

// `npm run draft` runs under plain Node, which resolves no "@/" alias: one in a module the script imports stopped every
// draft from M14 14c-6b-1 until the beta's first batch (2026-11-15). Vitest resolves the alias, so only a real run shows it.
describe("the script under plain Node", () => {
  it("loads its imports and prints its usage, which names a date alone", () => {
    const run = spawnSync(process.execPath, ["scripts/draft.ts"], { encoding: "utf8" });
    expect(run.stderr).not.toContain("ERR_MODULE_NOT_FOUND");
    expect(run.stderr).toContain("usage: npm run draft -- <date>");
    expect(run.stderr).not.toMatch(/clock|simulate|check-bank/);
  });

  it("refuses the word clock before it reads anything", () => {
    const run = spawnSync(process.execPath, ["scripts/draft.ts", "clock", "2026-12-01"], { encoding: "utf8" });
    expect(run.status).toBe(2);
    expect(run.stderr).toContain("usage: npm run draft -- <date>");
    expect(run.stdout).not.toContain("DRAFTED");
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
