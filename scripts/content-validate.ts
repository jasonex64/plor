// Validates every puzzle file under a content root, and its question bank (bank.json at the root, M13 13d):
// `npm run content:validate [-- <root>]` (default `content`). Prints one line per error naming the file, question and
// entry, and exits 1 on any error, or when no puzzle file is found, so a wrong root can't pass silently (M01 ticket).
// A researched list under lists/ (M23 23a) is checked too, and counted; the bank's names for its question must be on it (23b).
// Across the days, no category is asked twice within REPEAT_GAP_DAYS (13d), and no day asks two of one family (13e-4a).
// The bank asks only categories listed in the categories file (data/categories.json from the command; a test passes
// its own, 13e-1 review; 13f-4c), which is checked too (13e).
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { gapProblems, parseBank } from "../src/content/bank.ts";
import { CATEGORIES_FILE, familyOf, parseCategories } from "../src/content/categories.ts";
import { LISTS_DIR, parseList } from "../src/content/list.ts";
import { checkPuzzleFile, normalize, parsePuzzle, type Puzzle } from "../src/content/puzzle.ts";
import { checkSubstringsFile, parseSubstringDay, substringGapProblems, type SubstringDay } from "../src/content/substrings.ts";
import { SUBSTRINGS_ID } from "../src/platform/game.ts";

// Every file (not directory) under `root`, relative to it, with "/" separators, sorted so output is stable.
// Throws if `root` is missing.
function listFiles(root: string): string[] {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => relative(root, join(d.parentPath, d.name)).replaceAll("\\", "/"))
    .sort();
}

const BANK = "bank.json";

// A researched list (M23 23a) is no puzzle: content/lists/<category>.json, checked by src/content/list.ts.
const isList = (p: string) => p.startsWith(`${LISTS_DIR}/`);

export function listPuzzleFiles(root: string): string[] {
  return listFiles(root).filter((p) => p.endsWith(".json") && p !== BANK && !isList(p));
}

export function validateRoot(root: string, categoriesFile: string): { files: number; errors: string[] } {
  const all = listFiles(root);
  const files = listPuzzleFiles(root);
  const lists = all.filter((p) => p.endsWith(".json") && isList(p));
  // Anything else under the root is an error, so a mistyped file name can't drop a day while CONTENT OK prints
  // (M02 2f, B9).
  const strays = all.filter((p) => !p.endsWith(".json")).map((p) => `${p}: not a .json file; every file under the content root must be a puzzle or the bank`);
  if (files.length === 0) return { files: 0, errors: [...strays, `${root}: no puzzle files found`] };
  const allTexts = files.map((file) => ({ file, text: readFileSync(join(root, file), "utf8") }));
  // Each game's folder holds it to that game's rules. A folder that's neither fails game 1's checks, so a typo can't skip
  // them (M16 16c).
  const secondGame = allTexts.filter(({ file }) => file.startsWith(`${SUBSTRINGS_ID}/`));
  const texts = allTexts.filter(({ file }) => !file.startsWith(`${SUBSTRINGS_ID}/`));
  const errors = [...strays, ...texts.flatMap(({ file, text }) => checkPuzzleFile(file, text)), ...secondGame.flatMap(({ file, text }) => checkSubstringsFile(file, text))];
  errors.push(...substringGapProblems(secondGame.flatMap(({ file, text }) => parseSubstringDay(file, text).day ?? []) as SubstringDay[]));
  const days = texts.flatMap(({ file, text }) => parsePuzzle(file, text).puzzle ?? []) as Puzzle[];
  const { categories, errors: categoryErrors } = parseCategories(categoriesFile, readFileSync(categoriesFile, "utf8"));
  errors.push(...categoryErrors);
  const keys = categories && { file: categoriesFile, keys: new Set(categories.map((c) => c.key)) };
  // Each good list's typed forms by its category, for the bank's check below (M23 23b).
  const typed = new Map<string, { file: string; forms: Set<string> }>();
  for (const file of lists) {
    const { list, errors: listErrors } = parseList(file, readFileSync(join(root, file), "utf8"), keys);
    errors.push(...listErrors);
    if (list) typed.set(list.category, { file, forms: new Set(list.answers.flatMap((a) => [a.name, ...a.aliases].map(normalize))) });
  }
  // A broken categories file is reported above, and every family is then its own category.
  errors.push(...gapProblems(days, familyOf(categories ?? [])));
  if (all.includes(BANK)) {
    const { bank, errors: bankErrors } = parseBank(BANK, readFileSync(join(root, BANK), "utf8"));
    errors.push(...bankErrors);
    if (bank && categories) {
      for (const q of bank.questions) if (!keys!.keys.has(q.category)) errors.push(`${BANK} question "${q.id}": category "${q.category}" is not in ${categoriesFile}`);
    }
    // A researched question's own names are all on its list, by name: a thing ID there is another source's (M23 23b).
    for (const q of bank?.questions ?? []) {
      const list = typed.get(q.category);
      if (!list) continue;
      for (const name of [...q.host_bank, ...q.uncommon]) {
        if (name.startsWith("#")) errors.push(`${BANK} question "${q.id}": "${name}" is a thing ID, but ${list.file} is a researched list: name the answer`);
        else if (!list.forms.has(normalize(name))) errors.push(`${BANK} question "${q.id}": "${name}" is not on ${list.file}`);
      }
    }
  }
  return { files: files.length + lists.length, errors };
}

function main() {
  const root = process.argv[2] ?? "content";
  const { files, errors } = validateRoot(root, CATEGORIES_FILE);
  for (const line of errors) console.error(line);
  if (errors.length) {
    console.error(`CONTENT INVALID ${root}: ${errors.length} error(s) in ${files} file(s)`);
    process.exitCode = 1;
  } else {
    console.log(`CONTENT OK ${root}: ${files} file(s)`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
