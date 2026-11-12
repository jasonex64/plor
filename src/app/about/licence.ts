import { readFileSync } from "node:fs";
import { join } from "node:path";

// The notices the English Speller Database's licence requires of game 2's dictionary, read from the licence file
// itself so they can't drift from it (docs/SOURCES.md, English Speller Database). The dictionary is a generated word
// list above size 80, so the top notice and UKACD's section apply (the file's lines 33-34); AU and WordNet don't
// plainly cover it, a question for the human (docs/milestones/M16-game-2-substrings.md, Evidence, 16h).
export function dictionaryNotices(): { top: string; ukacd: string } {
  const file = readFileSync(join(process.cwd(), "data", "licences", "english-speller-database-Copyright.txt"), "utf8");
  // "=== NAME" lines split the file; with the capture group the parts alternate: the top notice and the applicability
  // notes after its bare "===" line, a name, its text, ...
  const parts = file.split(/^=== (.*)$/m);
  const ukacd = parts.indexOf("UKACD");
  if (ukacd < 0) throw new Error("the licence file has no UKACD section");
  return { top: parts[0].split(/^===$/m)[0].trim(), ukacd: parts[ukacd + 1].trim() };
}
