import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { addPlurals } from "./content-plurals";
import { validateRoot } from "./content-validate";

const FIXTURES = join(import.meta.dirname, "fixtures", "content");
const FILE = "offbeat/2026-11-02.json";

// The script rewrites files, so each case works on a temporary copy of a fixture.
let dir: string | undefined;
function copyOf(fixture: string): string {
  dir = mkdtempSync(join(tmpdir(), "riff-plurals-"));
  cpSync(join(FIXTURES, fixture), dir, { recursive: true });
  return dir;
}

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("addPlurals", () => {
  it("adds the missing plural, reports it, and the file then validates", () => {
    const root = copyOf("plural-missing");
    expect(addPlurals(root)).toEqual([`${FILE} q1 entry "lion": added plural "lions"`]);
    expect(validateRoot(root).errors).toEqual([]);
  });

  it("leaves a valid file byte-for-byte unchanged", () => {
    const root = copyOf("valid");
    const before = readFileSync(join(root, FILE), "utf8");
    expect(addPlurals(root)).toEqual([]);
    expect(readFileSync(join(root, FILE), "utf8")).toBe(before);
  });

  it("refuses a file whose shape is invalid", () => {
    const root = copyOf("valid");
    writeFileSync(join(root, FILE), "{}");
    expect(() => addPlurals(root)).toThrow(/missing "format"/);
  });
});
