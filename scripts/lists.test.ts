// The fold's pure part and the load's guard (docs/milestones/M23-23b-research-and-review.md, 23b-2 criteria 4 and 5):
// an admin's strikes, adds and seen marks, written into the list files, and the check of which of them a file already
// holds. The files' own formatting is round-tripped over every real list, so a fold changes only the lines it means to.
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { foldList, formatList, parseReview, unfoldedEdits } from "../src/content/list-edits.ts";
import type { ResearchList } from "../src/content/list.ts";
import { foldFiles } from "./lists.ts";

const list = (...answers: ResearchList["answers"]): ResearchList => ({ format: 1, category: "hat", passes: 2, borderline_seen: null, answers });
const HATS = list(
  { name: "top hat", aliases: ["topper", "Silk Hat"], tier: "common" },
  { name: "beanie", aliases: ["knit cap"], tier: "common", borderline: true },
  { name: "stetson", aliases: [], tier: "uncommon", brand: true, borderline: true },
);

describe("formatList", () => {
  it.each(readdirSync("content/lists").filter((f) => f.endsWith(".json")))("writes %s back exactly as it is", (file) => {
    // A few files sit on disk with CRLF endings; git keeps every file with LF (.gitattributes), the way fold writes it.
    const text = readFileSync(`content/lists/${file}`, "utf8").replaceAll("\r\n", "\n");
    expect(formatList(JSON.parse(text))).toBe(text);
  });
});

describe("foldList", () => {
  it("deletes the line a strike's typed form belongs to, by its name or any alias, however it was typed", () => {
    const folded = foldList(HATS, [{ category: "hat", name: "silk hat", kind: "strike" }, { category: "hat", name: "Knit Cap", kind: "strike" }], null);
    expect(folded.answers.map((a) => a.name)).toEqual(["stetson"]);
  });

  it("adds an answer as a rare line with no marks, once, and not when the file already has it", () => {
    const folded = foldList(HATS, [{ category: "hat", name: "Fez", kind: "add" }, { category: "hat", name: "fez", kind: "add" }, { category: "hat", name: "Topper", kind: "add" }], null);
    expect(folded.answers.slice(3)).toEqual([{ name: "Fez", aliases: [], tier: "rare" }]);
    expect(folded.answers).toHaveLength(4);
  });

  it("sets the date the list was seen, and leaves it alone when there is none", () => {
    expect(foldList(HATS, [], "2026-11-26").borderline_seen).toBe("2026-11-26");
    expect(foldList({ ...HATS, borderline_seen: "2026-11-25" }, [], null).borderline_seen).toBe("2026-11-25");
  });

  it("ignores another category's edits, and does not change the list it was given", () => {
    const before = structuredClone(HATS);
    expect(foldList(HATS, [{ category: "bag", name: "beanie", kind: "strike" }, { category: "bag", name: "sack", kind: "add" }], null)).toEqual(before);
    expect(HATS).toEqual(before);
  });

  it("changes nothing else about the lines it keeps", () => {
    const text = formatList(foldList(HATS, [{ category: "hat", name: "topper", kind: "strike" }], null));
    expect(text).toContain('{"name":"stetson","aliases":[],"tier":"uncommon","brand":true,"borderline":true}');
    expect(text).not.toContain("top hat");
  });
});

describe("unfoldedEdits (the load's guard)", () => {
  const lists = [HATS];
  it("holds back a strike whose answer is still on the file's list, by any of its typed forms", () => {
    const edits = [{ category: "hat", name: "topper", kind: "strike" as const }, { category: "hat", name: "stetson", kind: "strike" as const }];
    expect(unfoldedEdits(edits, lists)).toEqual(edits);
  });

  it("lets a strike through once the file no longer has the answer", () => {
    expect(unfoldedEdits([{ category: "hat", name: "fedora", kind: "strike" }], lists)).toEqual([]);
  });

  it("holds back an add the file does not have, and lets one through that it does", () => {
    const missing = { category: "hat", name: "fez", kind: "add" as const };
    expect(unfoldedEdits([missing, { category: "hat", name: "Knit Cap", kind: "add" }], lists)).toEqual([missing]);
  });

  it("keeps the extra fields an edit came with", () => {
    expect(unfoldedEdits([{ id: 7, category: "hat", name: "fez", kind: "add" as const }], lists)).toEqual([{ id: 7, category: "hat", name: "fez", kind: "add" }]);
  });
});

describe("parseReview (the file a session exports from the hosted database)", () => {
  const good = { edits: [{ category: "hat", name: "fez", kind: "add", at: "2026-11-25T10:00:00Z" }], seen: [{ category: "hat", at: "2026-11-25T11:00:00Z" }] };
  it("reads what private.list_edits returns", () => {
    expect(parseReview("review.json", JSON.stringify(good))).toEqual(good);
  });
  it.each([
    ["not JSON", "{"],
    ["no edits", JSON.stringify({ seen: [] })],
    ["a kind that is neither", JSON.stringify({ ...good, edits: [{ ...good.edits[0], kind: "remove" }] })],
    ["an empty name", JSON.stringify({ ...good, edits: [{ ...good.edits[0], name: "" }] })],
    ["a seen row with no date", JSON.stringify({ ...good, seen: [{ category: "hat" }] })],
    ["a seen time that is no date", JSON.stringify({ ...good, seen: [{ category: "hat", at: "garbage" }] })],
    ["an edit time that is no date", JSON.stringify({ ...good, edits: [{ ...good.edits[0], at: "soon" }] })],
    ["a category that is no key", JSON.stringify({ ...good, seen: [{ category: "../hat", at: good.seen[0].at }] })],
  ])("refuses %s", (_what, text) => {
    expect(() => parseReview("review.json", text)).toThrow(/review\.json/);
  });
});

describe("foldFiles", () => {
  it("writes a category's edits into its file, once, and touches no other file", () => {
    const root = mkdtempSync(join(tmpdir(), "fold-"));
    try {
      mkdirSync(join(root, "lists"));
      writeFileSync(join(root, "lists", "hat.json"), formatList(HATS));
      writeFileSync(join(root, "lists", "bag.json"), formatList({ ...HATS, category: "bag" }));
      const review = { edits: [{ category: "hat", name: "topper", kind: "strike" as const, at: "2026-11-25T10:00:00.000Z" }, { category: "hat", name: "Fez", kind: "add" as const, at: "2026-11-25T10:01:00.000Z" }], seen: [{ category: "hat", at: "2026-11-25T23:30:00.000Z" }] };
      expect(foldFiles(review, root)).toEqual(["FOLDED hat: 1 struck, 1 added, 3 → 3 answers, seen 2026-11-25"]);
      const hat = readFileSync(join(root, "lists", "hat.json"), "utf8");
      expect(hat).toContain('"borderline_seen": "2026-11-25"');
      expect(hat).toContain('{"name":"Fez","aliases":[],"tier":"rare"}');
      expect(hat).not.toContain("top hat");
      expect(readFileSync(join(root, "lists", "bag.json"), "utf8")).toBe(formatList({ ...HATS, category: "bag" }));
      // A second fold finds the file already holding them.
      expect(foldFiles(review, root)).toEqual(["FOLDED hat: 1 struck, 1 added, 3 → 3 answers, seen 2026-11-25 (the file already held them)"]);
    } finally {
      rmSync(root, { recursive: true });
    }
  });
});
