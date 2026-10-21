// Validates every puzzle file under a content root: `npm run content:validate [-- <root>]` (default `content`).
// Prints one line per error naming the file, question and entry, and exits 1 on any error, or when no
// puzzle file is found, so a wrong root can't pass silently (M01 ticket).
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { checkPuzzleFile } from "../src/content/puzzle.ts";

// Every file (not directory) under `root`, relative to it, with "/" separators, sorted so output is stable.
// Throws if `root` is missing.
function listFiles(root: string): string[] {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => relative(root, join(d.parentPath, d.name)).replaceAll("\\", "/"))
    .sort();
}

export function listPuzzleFiles(root: string): string[] {
  return listFiles(root).filter((p) => p.endsWith(".json"));
}

export function validateRoot(root: string): { files: number; errors: string[] } {
  const all = listFiles(root);
  const files = all.filter((p) => p.endsWith(".json"));
  // Anything else under the root is an error, so a mistyped file name can't drop a day while CONTENT OK prints
  // (M02 2f, B9).
  const strays = all.filter((p) => !p.endsWith(".json")).map((p) => `${p}: not a .json file; every file under the content root must be a puzzle`);
  if (files.length === 0) return { files: 0, errors: [...strays, `${root}: no puzzle files found`] };
  const errors = [...strays, ...files.flatMap((file) => checkPuzzleFile(file, readFileSync(join(root, file), "utf8")))];
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
