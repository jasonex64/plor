// Checks that a content change only adds: `npm run content:additions-check -- <git-ref> [root]` (default root
// `content`). Prompts, host banks, host answers, match groups and every existing entry must stay as they were;
// existing entries may only gain aliases, and questions may gain entries. Used when growing the accepted lists
// (M02 2d; M03), so a list change can't quietly change a puzzle's difficulty. Exits 1 on any other change.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Puzzle } from "../src/content/puzzle.ts";
import { listPuzzleFiles } from "./content-validate.ts";

export type AdditionsSummary = { problems: string[]; newEntries: number; newAliases: number };

export function compareAdditions(file: string, before: Puzzle, after: Puzzle): AdditionsSummary {
  const problems: string[] = [];
  let newEntries = 0;
  let newAliases = 0;
  for (const key of ["format", "game_id", "date"] as const) {
    if (before[key] !== after[key]) problems.push(`${file}: "${key}" changed`);
  }
  if (before.questions.length !== after.questions.length) problems.push(`${file}: number of questions changed`);
  before.questions.forEach((q, i) => {
    const a = after.questions[i];
    if (!a) return;
    const where = `${file} q${i + 1}`;
    for (const key of ["prompt", "host_bank", "host_answers", "match_groups"] as const) {
      if (JSON.stringify(q[key]) !== JSON.stringify(a[key])) problems.push(`${where}: "${key}" changed`);
    }
    const afterById = new Map(a.entries.map((e) => [e.id, e]));
    for (const e of q.entries) {
      const n = afterById.get(e.id);
      if (!n) {
        problems.push(`${where} entry "${e.id}": removed`);
        continue;
      }
      if (n.name !== e.name || n.plural !== e.plural) problems.push(`${where} entry "${e.id}": name or plural changed`);
      const lost = e.aliases.filter((alias) => !n.aliases.includes(alias));
      if (lost.length) problems.push(`${where} entry "${e.id}": aliases removed (${lost.join(", ")})`);
      newAliases += n.aliases.length - e.aliases.length + lost.length;
    }
    newEntries += a.entries.length - q.entries.length;
  });
  return { problems, newEntries, newAliases };
}

function main() {
  const [ref, root = "content"] = process.argv.slice(2);
  if (!ref) throw new Error("usage: npm run content:additions-check -- <git-ref> [content-root]");
  const total: AdditionsSummary = { problems: [], newEntries: 0, newAliases: 0 };
  for (const file of listPuzzleFiles(root)) {
    const after: Puzzle = JSON.parse(readFileSync(join(root, file), "utf8"));
    let text: string;
    try {
      text = execFileSync("git", ["show", `${ref}:${root}/${file}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      continue; // a new file is all additions
    }
    const s = compareAdditions(file, JSON.parse(text), after);
    total.problems.push(...s.problems);
    total.newEntries += s.newEntries;
    total.newAliases += s.newAliases;
  }
  for (const line of total.problems) console.error(line);
  console.log(
    total.problems.length
      ? `ADDITIONS CHECK FAILED against ${ref}: ${total.problems.length} change(s) that aren't additions`
      : `ADDITIONS ONLY against ${ref}: ${total.newEntries} new entries, ${total.newAliases} new aliases on existing entries`,
  );
  process.exitCode = total.problems.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
