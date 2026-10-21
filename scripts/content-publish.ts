// Loads validated puzzles into private.puzzle: `npm run content:publish -- <database-url> [content-root]`
// (docs/milestones/M00-data-design.md §4; DECISIONS.md: Content publishing role).
// - The URL must not contain a password, so it never lands in shell history; the script asks for it, hidden.
// - Remote databases connect as plor_publisher with verify-full against Supabase's CA; the local stack may use
//   its documented default login.
// - Every file must pass `content:validate`, and the dates must run without gaps (ROADMAP item from M01 review).
// - One transaction: new days are inserted, changed future days updated, unchanged days left alone. A change to a
//   day that has started is refused by the database (trigger, OB004) and nothing is written.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseError, Pool, type PoolClient } from "pg";
import { LOCAL_HOSTS, parseDatabaseUrl } from "../src/config/env.ts";
import type { Puzzle } from "../src/content/puzzle.ts";
import { withTransaction } from "../src/lib/db.ts";
import { listPuzzleFiles, validateRoot } from "./content-validate.ts";

const PUBLISHER = "plor_publisher";
// The same CA psql uses for staging (M00); the app reads it from DATABASE_CA_CERT (ROADMAP: one source later).
const CA_FILE = "supabase/certs/prod-ca-2021.crt";
const DAY_MS = 86_400_000;

export type PublishSummary = { inserted: string[]; updated: string[]; unchanged: string[] };

// Dates in order, each the day after the one before. Returns one message per gap.
export function dateGaps(dates: string[]): string[] {
  const sorted = [...dates].sort();
  const gaps: string[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const expected = new Date(Date.parse(`${sorted[i - 1]}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
    if (sorted[i] !== expected) gaps.push(`no puzzle between ${sorted[i - 1]} and ${sorted[i]} (expected ${expected})`);
  }
  return gaps;
}

export async function publish(client: PoolClient, puzzles: Puzzle[]): Promise<PublishSummary> {
  const summary: PublishSummary = { inserted: [], updated: [], unchanged: [] };
  for (const puzzle of puzzles) {
    let rows: { inserted: boolean }[];
    try {
      ({ rows } = await client.query<{ inserted: boolean }>(
        `insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)
         on conflict (game_id, puzzle_date) do update set content = excluded.content
           where private.puzzle.content is distinct from excluded.content
         returning (xmax = 0) as inserted`,
        [puzzle.game_id, puzzle.date, puzzle],
      ));
    } catch (err) {
      if (err instanceof DatabaseError && err.code === "OB004") {
        throw new Error(`${puzzle.game_id}/${puzzle.date} has started and can't change; nothing was published`);
      }
      throw err;
    }
    // No row back means the stored content was already identical, so nothing was written.
    const bucket = rows.length === 0 ? summary.unchanged : rows[0].inserted ? summary.inserted : summary.updated;
    bucket.push(puzzle.date);
  }
  return summary;
}

// Reads a password without echoing it. The streams are arguments so the test can drive it; main passes
// process.stdin and process.stdout. Input that ends before Enter rejects instead of waiting forever (M02 2f, B7).
export async function askHidden(prompt: string, input: NodeJS.ReadStream, output: NodeJS.WriteStream): Promise<string> {
  if (!input.isTTY) throw new Error("content:publish asks for the password, so it needs an interactive terminal");
  output.write(prompt);
  input.setRawMode(true);
  input.setEncoding("utf8");
  input.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const done = () => {
      input.setRawMode(false);
      input.pause();
      input.off("data", onData);
      input.off("end", onEnd);
      output.write("\n");
    };
    const onEnd = () => {
      done();
      reject(new Error("the input ended before the password was entered"));
    };
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          done();
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          done();
          reject(new Error("cancelled"));
          return;
        }
        value = ch === "\u007f" || ch === "\b" ? value.slice(0, -1) : value + ch;
      }
    };
    input.on("data", onData);
    input.on("end", onEnd);
  });
}

async function main() {
  const [rawUrl, root = "content"] = process.argv.slice(2);
  if (!rawUrl) throw new Error("usage: npm run content:publish -- postgresql://<user>@<host>:<port>/<database> [content-root]");
  const target = parseDatabaseUrl(rawUrl, "the database URL");
  if (target.password) throw new Error("leave the password out of the URL; content:publish asks for it");
  const local = LOCAL_HOSTS.has(target.host);
  if (!local && target.user.split(".")[0] !== PUBLISHER) {
    throw new Error(`a remote database must be published as ${PUBLISHER} (DECISIONS.md: Content publishing role)`);
  }

  const { files, errors } = validateRoot(root);
  for (const line of errors) console.error(line);
  if (errors.length) throw new Error(`CONTENT INVALID ${root}: ${errors.length} error(s) in ${files} file(s); nothing was published`);
  const puzzles: Puzzle[] = listPuzzleFiles(root).map((file) => JSON.parse(readFileSync(join(root, file), "utf8")));
  const gaps = dateGaps(puzzles.map((p) => p.date));
  for (const line of gaps) console.error(line);
  if (gaps.length) throw new Error("the puzzle dates have gaps; nothing was published");

  const password = await askHidden(`Password for ${target.user}@${target.host}: `, process.stdin, process.stdout);
  const pool = new Pool({ ...target, password, max: 1, ssl: local ? false : { ca: readFileSync(CA_FILE, "utf8") } });
  try {
    const summary = await withTransaction(pool, (client) => publish(client, puzzles));
    const dates = puzzles.map((p) => p.date).sort();
    console.log(
      `PUBLISHED ${dates[0]}..${dates[dates.length - 1]} to ${target.host}: ` +
        `${summary.inserted.length} new, ${summary.updated.length} updated, ${summary.unchanged.length} unchanged`,
    );
    for (const date of summary.updated) console.log(`updated ${date}`);
  } finally {
    await pool.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err: Error) => {
    console.error(`PUBLISH FAILED: ${err.message}`);
    process.exitCode = 1;
  });
}
