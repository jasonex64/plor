// `npm run lists -- fold [--from <file>]` (docs/milestones/M23-23b-research-and-review.md, Part 3): writes what an admin
// did on the review page into the list files: a struck answer's line deleted, an added answer a line (rare, no marks), an answer's tier changed,
// and the date a list was seen as its borderline_seen. The commit is the fold; the next load marks the edits folded
// (scripts/base.ts, loadResearch), and `hosted load` refuses until they are.
// The edits come from the local stack, or from a file (--from) a Claude session exported read-only from the hosted
// database through its own connector, in the shape private.list_edits returns: this script never connects to the hosted
// database. It runs nothing else (no load).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { foldList, formatList, parseReview, type Review } from "../src/content/list-edits.ts";
import { LISTS_DIR, listPath, parseList } from "../src/content/list.ts";
import { localClient, readEdits, readSeen } from "./base.ts";

// Writes the review's edits into the files under `root` (the content folder); the lines it prints say what changed.
export function foldFiles(review: Review, root = "content"): string[] {
  const categories = [...new Set([...review.edits.map((e) => e.category), ...review.seen.map((s) => s.category)])].sort();
  const printed: string[] = [];
  for (const category of categories) {
    const file = join(root, listPath(category));
    // The file may sit on disk with CRLF endings; git keeps it with LF, as formatList writes it.
    const before = readFileSync(file, "utf8").replaceAll("\r\n", "\n");
    const { list, errors } = parseList(listPath(category), before, null);
    if (!list) throw new Error(errors.join("\n"));
    const edits = review.edits.filter((e) => e.category === category);
    const seen = review.seen.find((s) => s.category === category);
    const folded = foldList(list, edits, seen ? seen.at.slice(0, 10) : null);
    const after = formatList(folded);
    if (after !== before) writeFileSync(file, after);
    const count = (kind: string) => edits.filter((e) => e.kind === kind).length;
    printed.push(`FOLDED ${category}: ${count("strike")} struck, ${count("add")} added${count("tier") ? `, ${count("tier")} given another tier` : ""}, ${list.answers.length} → ${folded.answers.length} answers${seen ? `, seen ${folded.borderline_seen}` : ""}${after === before ? " (the file already held them)" : ""}`);
  }
  return printed;
}

async function main(): Promise<void> {
  const [command, flag, from] = process.argv.slice(2);
  if (command !== "fold" || (flag !== undefined && (flag !== "--from" || !from))) {
    console.error(`usage: npm run lists -- fold [--from <file>]\n  fold writes the strikes, adds and seen marks made on /admin/lists into ${LISTS_DIR}/, from the local stack,\n  or from <file>, an export of private.list_edits's answer taken from the hosted database`);
    process.exit(2);
  }
  let review: Review;
  if (from) review = parseReview(from, readFileSync(from, "utf8"));
  else {
    const client = await localClient();
    try {
      review = { edits: await readEdits(client), seen: await readSeen(client) };
    } finally {
      await client.end();
    }
  }
  const printed = foldFiles(review);
  if (printed.length === 0) console.log("NOTHING TO FOLD: no strike, add or seen mark waits");
  for (const line of printed) console.log(line);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
