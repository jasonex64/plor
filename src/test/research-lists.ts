// The researched lists a test needs in the answer database (docs/milestones/M23-23a-researched-lists.md): loaded where the stack
// lacks them, as CI's fresh stack does, and taken out again afterwards, as the lists' own tests do (src/app/api/admin/lists/
// route.db.test.ts, e2e/lists.e2e.ts). Shared by the database tests and the e2e tests of a day on a clock.
import { readFileSync } from "node:fs";
import pg from "pg";
import { LISTS_DIR, parseList } from "../content/list.ts";
import { loadResearch } from "../../scripts/base.ts";

// Loads each of these lists that the database does not have, with its category, and returns the ones it loaded.
export async function ensureResearched(databaseUrl: string, categories: string[]): Promise<string[]> {
  const db = new pg.Client({ connectionString: databaseUrl });
  await db.connect();
  try {
    const have = await db.query<{ key: string }>("select key from private.category where key = any($1::text[])", [categories]);
    const missing = categories.filter((c) => !have.rows.some((r) => r.key === c));
    if (missing.length === 0) return [];
    const lists = missing.map((c) => parseList(`${LISTS_DIR}/${c}.json`, readFileSync(`content/${LISTS_DIR}/${c}.json`, "utf8"), null).list!);
    await loadResearch(db, lists);
    for (const c of missing) await db.query("select private.define_category($1, $1, 'research', $1, null)", [c]);
    return missing;
  } finally {
    await db.end();
  }
}

// Takes out what ensureResearched loaded.
export async function removeResearched(db: { query: (sql: string, params?: unknown[]) => Promise<unknown> }, loaded: string[]): Promise<void> {
  if (loaded.length === 0) return;
  await db.query("delete from private.category where key = any($1::text[])", [loaded]);
  await db.query("delete from private.thing where id in (select thing_id from private.thing_source where source = 'research' and split_part(source_id, '/', 1) = any($1::text[]))", [loaded]);
  await db.query(
    "delete from private.base_log where (action = 'import' and actor = 'source:research' and detail ->> 'snapshot' = 'lists') or (action = 'define_category' and detail ->> 'key' = any($1::text[]))",
    [loaded],
  );
}
