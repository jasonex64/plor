// Every e2e file's player names are its own (docs/milestones/M14-14b-2c-review-items.md, item 32; human, 2026-10-26:
// "A check that fails on repeats (Recommended)"): every file in a run shares RUN, so a name another file uses signs
// into that file's player, who has a username already (14a-3b's settings file did, with groups.e2e.ts's "ga"). Run by
// `npm test`; Playwright runs only *.e2e.ts.
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dir = new URL("./", import.meta.url);
// A name is the literal a file passes to signInAndPick, or to its own player() or admin() helpers, which pass it on.
// A name built at run time (`sf${viewport.width}`) is left out: only literals can be compared before a run.
const NAME = /\b(?:signInAndPick\(\s*\w+|player\(\s*browser|admin\(\s*browser)\s*,\s*"([^"]+)"/g;

describe("e2e player names", () => {
  it("are never used by two files", () => {
    const owners = new Map<string, string[]>();
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".e2e.ts"))) {
      const names = new Set([...readFileSync(new URL(file, dir), "utf8").matchAll(NAME)].map((m) => m[1]));
      for (const name of names) owners.set(name, [...(owners.get(name) ?? []), file]);
    }
    expect(owners.size).toBeGreaterThan(20);
    expect([...owners].filter(([, files]) => files.length > 1)).toEqual([]);
  });
});
