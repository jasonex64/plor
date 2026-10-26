// Validates every puzzle file under a content root, and its question bank (bank.json at the root, M13 13d):
// `npm run content:validate [-- <root>]` (default `content`). Prints one line per error naming the file, question and
// entry, and exits 1 on any error, or when no puzzle file is found, so a wrong root can't pass silently (M01 ticket).
// Across the days, no category is asked twice within REPEAT_GAP_DAYS (13d), and no day asks two of one family (13e-4a).
// The bank asks only categories listed in data/categories.json, which is checked too (13e).
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { gapProblems, parseBank } from "../src/content/bank.ts";
import { CATEGORIES_FILE, familyOf, parseCategories } from "../src/content/categories.ts";
import { checkPuzzleFile, parsePuzzle, type Puzzle } from "../src/content/puzzle.ts";

// Every file (not directory) under `root`, relative to it, with "/" separators, sorted so output is stable.
// Throws if `root` is missing.
function listFiles(root: string): string[] {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => relative(root, join(d.parentPath, d.name)).replaceAll("\\", "/"))
    .sort();
}

const BANK = "bank.json";

export function listPuzzleFiles(root: string): string[] {
  return listFiles(root).filter((p) => p.endsWith(".json") && p !== BANK);
}

export function validateRoot(root: string): { files: number; errors: string[] } {
  const all = listFiles(root);
  const files = listPuzzleFiles(root);
  // Anything else under the root is an error, so a mistyped file name can't drop a day while CONTENT OK prints
  // (M02 2f, B9).
  const strays = all.filter((p) => !p.endsWith(".json")).map((p) => `${p}: not a .json file; every file under the content root must be a puzzle or the bank`);
  if (files.length === 0) return { files: 0, errors: [...strays, `${root}: no puzzle files found`] };
  const texts = files.map((file) => ({ file, text: readFileSync(join(root, file), "utf8") }));
  const errors = [...strays, ...texts.flatMap(({ file, text }) => checkPuzzleFile(file, text))];
  const days = texts.flatMap(({ file, text }) => parsePuzzle(file, text).puzzle ?? []) as Puzzle[];
  const { categories, errors: categoryErrors } = parseCategories(CATEGORIES_FILE, readFileSync(CATEGORIES_FILE, "utf8"));
  errors.push(...categoryErrors);
  // A broken categories file is reported above, and every family is then its own category.
  errors.push(...gapProblems(days, familyOf(categories ?? [])));
  if (all.includes(BANK)) {
    const { bank, errors: bankErrors } = parseBank(BANK, readFileSync(join(root, BANK), "utf8"));
    errors.push(...bankErrors);
    if (bank && categories) {
      const keys = new Set(categories.map((c) => c.key));
      for (const q of bank.questions) if (!keys.has(q.category)) errors.push(`${BANK} question "${q.id}": category "${q.category}" is not in ${CATEGORIES_FILE}`);
    }
  }
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
