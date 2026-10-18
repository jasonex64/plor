// Adds each entry's missing plural alias: `npm run content:plurals [-- <root>]` (default `content`).
// Plurals come from the entry's "plural" override, else pluralize 8.0.0, and are applied at authoring
// time, never guessed at runtime (DECISIONS.md: Answer model). Every added plural is printed, so the
// human reviews them here and in the git diff, and fixes a wrong one with a "plural" override.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expectedPlural, hasPlural, parsePuzzle } from "../src/content/puzzle.ts";
import { listPuzzleFiles } from "./content-validate.ts";

// Returns one line per plural added. Throws on a file whose shape is invalid: fix that first.
export function addPlurals(root: string): string[] {
  const added: string[] = [];
  for (const file of listPuzzleFiles(root)) {
    const path = join(root, file);
    const { puzzle, errors } = parsePuzzle(file, readFileSync(path, "utf8"));
    if (!puzzle) throw new Error(`cannot add plurals to an invalid file:\n${errors.join("\n")}`);
    let changed = false;
    puzzle.questions.forEach((q, i) => {
      for (const entry of q.entries) {
        if (hasPlural(entry)) continue;
        const plural = expectedPlural(entry);
        entry.aliases.push(plural);
        added.push(`${file} q${i + 1} entry "${entry.id}": added plural "${plural}"`);
        changed = true;
      }
    });
    if (changed) writeFileSync(path, JSON.stringify(puzzle, null, 2) + "\n");
  }
  return added;
}

function main() {
  const root = process.argv[2] ?? "content";
  const added = addPlurals(root);
  for (const line of added) console.log(line);
  console.log(`PLURALS ${root}: ${added.length} added. Review each one; set "plural" on an entry to override.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
