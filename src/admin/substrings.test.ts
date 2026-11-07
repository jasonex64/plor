// Game 2's days on the admin page, past the database (src/admin/substrings.ts).
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SubstringDay } from "@/content/substrings";
import { setsDiffer } from "./substring-sets";
import { readSubstringDrafts, viewDays } from "./substrings";

const TODAY = "2026-12-10";
const A = ["ou", "lu", "att", "yin", "odo", "hec", "vet"];
const B = ["nt", "mu", "cen", "bin", "agr", "ipt", "vio"];
const day = (date: string, rounds = A, bonus_letter = "f"): SubstringDay => ({ format: 1, game_id: "substrings", date, rounds, bonus_letter });
const byDate = (...days: SubstringDay[]) => new Map(days.map((d) => [d.date, d]));

describe("readSubstringDrafts", () => {
  afterEach(() => vi.restoreAllMocks());

  it("finds no days, and doesn't fail, with no drafts folder at all", () => {
    const empty = mkdtempSync(join(tmpdir(), "plor-no-drafts-"));
    vi.spyOn(process, "cwd").mockReturnValue(empty);
    expect(readSubstringDrafts().size).toBe(0);
    rmSync(empty, { recursive: true });
  });
});

describe("viewDays", () => {
  it("lists a draft with nothing approved", () => {
    expect(viewDays(TODAY, byDate(day("2026-12-11")), new Map())).toEqual([
      { date: "2026-12-11", draft: { rounds: A, bonusLetter: "f" }, live: null, started: false },
    ]);
  });

  it("keeps the draft and the approved day apart when a redraft changed one", () => {
    const [view] = viewDays(TODAY, byDate(day("2026-12-11", B)), byDate(day("2026-12-11", A)));
    expect(view.draft?.rounds).toEqual(B);
    expect(view.live?.rounds).toEqual(A);
  });

  it("lists an approved day with no draft", () => {
    expect(viewDays(TODAY, new Map(), byDate(day("2026-12-11")))[0]).toMatchObject({ draft: null, live: { rounds: A } });
  });

  it("leaves out a draft that's past, and keeps today's", () => {
    expect(viewDays(TODAY, byDate(day("2026-12-09"), day(TODAY)), new Map()).map((d) => d.date)).toEqual([TODAY]);
  });

  it("marks a day started only when it's approved and today or earlier", () => {
    expect(viewDays(TODAY, new Map(), byDate(day(TODAY)))[0].started).toBe(true);
    expect(viewDays(TODAY, new Map(), byDate(day("2026-12-11")))[0].started).toBe(false);
    expect(viewDays(TODAY, byDate(day(TODAY)), new Map())[0].started).toBe(false);
  });

  it("sorts by date", () => {
    expect(viewDays(TODAY, byDate(day("2026-12-13"), day("2026-12-11")), byDate(day("2026-12-12"))).map((d) => d.date)).toEqual(["2026-12-11", "2026-12-12", "2026-12-13"]);
  });
});

describe("setsDiffer", () => {
  const sets = (rounds: string[], bonusLetter = "f") => ({ rounds, bonusLetter });

  it("sees a changed round and a changed bonus letter", () => {
    expect(setsDiffer(sets(A), sets(A))).toBe(false);
    expect(setsDiffer(sets(A), sets(B))).toBe(true);
    expect(setsDiffer(sets(A), sets(A, "g"))).toBe(true);
    expect(setsDiffer(sets(A), sets([...A.slice(0, 6), "zzz"]))).toBe(true);
  });
});
