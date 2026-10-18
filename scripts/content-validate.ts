// Validates every puzzle file under a content root: `npm run content:validate [-- <root>]` (default `content`).
// Prints one line per error naming the file, question and entry, and exits 1 on any error, or when no
// puzzle file is found, so a wrong root can't pass silently (M01 ticket).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { checkPuzzleFile } from "../src/content/puzzle.ts";

// Paths relative to `root`, with "/" separators, sorted so output is stable. Throws if `root` is missing.
export function listPuzzleFiles(root: string): string[] {
  return readdirSync(root, { recursive: true, encoding: "utf8" })
    .map((p) => p.replaceAll("\\", "/"))
    .filter((p) => p.endsWith(".json"))
    .sort();
}

export function validateRoot(root: string): { files: number; errors: string[] } {
  const files = listPuzzleFiles(root);
  if (files.length === 0) return { files: 0, errors: [`${root}: no puzzle files found`] };
  const errors = files.flatMap((file) => checkPuzzleFile(file, readFileSync(join(root, file), "utf8")));
  return { files: files.length, errors };
}

function main() {
  const root = process.argv[2] ?? "content";
  const { files, errors } = validateRoot(root);
  for (const line of errors) console.error(line);
  if (errors.length) {
    console.error(`CONTENT INVALID ${root}: ${errors.length} error(s) in ${files} file(s)`);
    process.exitCode = 1;
  } else {
    console.log(`CONTENT OK ${root}: ${files} file(s)`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
