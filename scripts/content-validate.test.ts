import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateRoot } from "./content-validate";

// Each failing fixture is the valid one with a single rule broken (M01 ticket: one fixture per rule).
const FIXTURES = join(import.meta.dirname, "fixtures", "content");
const FILE = "offbeat/2026-11-02.json";

const EXPECTED: Record<string, string> = {
  "alias-shared": `${FILE} q2 entry "tiger": "lions" collides with "lions" of entry "lion" (both normalize to "lions")`,
  "alias-normalized": `${FILE} q3 entry "zebra": "  LÏON'S " collides with "lions" of entry "lion" (both normalize to "lions")`,
  "host-bank-unknown-entry": `${FILE} q1 entry "panda": in host_bank but not in the accepted bank`,
  "host-answer-not-in-bank": `${FILE} q3 entry "giraffe": host answer is not in host_bank`,
  "match-group-unknown-entry": `${FILE} q1 entry "golden-eagle": in match group "eagle" but not in the accepted bank`,
  "match-group-key-not-host-answer": `${FILE} q1 entry "lion": match group key is not a host answer`,
  "match-group-contains-key": `${FILE} q1 entry "eagle": listed in its own match group (a host answer always matches itself)`,
  "plural-missing": `${FILE} q1 entry "lion": no plural alias "lions" (run npm run content:plurals, or set "plural" to override)`,
  "path-mismatch": `${FILE}: path must be offbeat/2026-11-03.json to match its game_id and date`,
  "question-count": `${FILE}: has 6 questions, expected 7`,
  "host-answer-count": `${FILE} q2: has 3 host answers, expected 2`,
  "duplicate-entry-id": `${FILE} q2 entry "lion": ID used by more than one entry`,
};

describe("validateRoot", () => {
  it("passes the valid fixture", () => {
    expect(validateRoot(join(FIXTURES, "valid"))).toEqual({ files: 1, errors: [] });
  });

  it.each(Object.entries(EXPECTED))("rejects %s with exactly its own error", (name, error) => {
    expect(validateRoot(join(FIXTURES, name))).toEqual({ files: 1, errors: [error] });
  });

  it("fails when the root holds no puzzle files", () => {
    const empty = mkdtempSync(join(tmpdir(), "riff-content-"));
    try {
      expect(validateRoot(empty)).toEqual({ files: 0, errors: [`${empty}: no puzzle files found`] });
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it("throws when the root does not exist", () => {
    expect(() => validateRoot(join(FIXTURES, "no-such-root"))).toThrow(/ENOENT/);
  });
});

describe("content:validate exit code", () => {
  const run = (root: string) =>
    spawnSync(process.execPath, [join(import.meta.dirname, "content-validate.ts"), root], { encoding: "utf8" });

  it("exits 0 on valid content", () => {
    expect(run(join(FIXTURES, "valid")).status).toBe(0);
  });

  it("exits 1 and prints the error on invalid content", () => {
    const result = run(join(FIXTURES, "plural-missing"));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(EXPECTED["plural-missing"]);
  });
});
