// A question's answer pool on the admin pages (docs/milestones/M15-15g-the-answer-pool.md): how many answers its
// category holds, a search by any part of any alias, and the answers a page at a time, by name. On a drafted day an
// answer whose shown name holds a taken letter is marked, the rule host answers follow (DECISIONS.md, Log,
// 2026-10-21; the ticket's answer 9).
import { DatabaseError } from "pg";
import { POOL_PAGE_SIZE } from "@/config/tunables";
import { avoids, normalize } from "@/content/puzzle";
import { shownName } from "@/game/payload";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { STATUS } from "@/lib/status";

// alias: the alias the search found the answer by, when its shown name doesn't hold the typed text. taken: the first
// taken letter its shown name holds, or null.
export type PoolRow = { id: string; name: string; alias: string | null; taken: string | null };
// clean: how many answers' shown names hold no taken letter. It is counted with the first page of the whole pool, when
// letters are taken, and null otherwise: the page keeps it while the admin searches and pages.
export type PoolView = { members: number; matching: number; clean: number | null; rows: PoolRow[] };

type Found = { members: number; matching: number; rows: { id: string; name: string; alias: string | null }[] };

// The query's values are user input: a category, the letters taken so far (a to z), the typed text, where the page starts.
export async function poolView(db: Db, adminId: string, query: URLSearchParams): Promise<PoolView> {
  const category = query.get("category");
  const taken = query.get("taken") ?? "";
  const start = query.get("offset") ?? "0";
  if (!category) throw new AppError("bad_request", STATUS.badRequest, "category");
  if (!/^[a-z]*$/.test(taken)) throw new AppError("bad_request", STATUS.badRequest, "taken");
  if (!/^\d+$/.test(start)) throw new AppError("bad_request", STATUS.badRequest, "offset");
  const letters = [...taken];
  const needle = normalize(query.get("q") ?? "");
  const offset = Number(start);
  // The shown name's letters are judged as the game normalizes them (avoids), which SQL can't do, so counting the clean
  // names reads every member's name: once, with the pool's first page.
  const counting = letters.length > 0 && needle === "" && offset === 0;
  let found: Found | null;
  try {
    const { rows } = await db.query<{ pool: Found | null }>("select private.category_pool($1, $2, $3, $4, $5) as pool", [
      adminId,
      category,
      needle,
      offset,
      counting ? null : POOL_PAGE_SIZE,
    ]);
    found = rows[0].pool;
  } catch (err) {
    // private.category_pool's own admin check (supabase/migrations/20261116051619_answer_pool.sql).
    if (err instanceof DatabaseError && err.code === "OB007") throw new AppError("admins_only", STATUS.forbidden);
    throw err;
  }
  if (!found) throw new AppError("no_category", STATUS.notFound);
  const all = found.rows.map((r) => ({ ...r, name: shownName(r.name) }));
  return {
    members: found.members,
    matching: found.matching,
    clean: counting ? all.filter((r) => avoids(r.name, letters)).length : null,
    rows: all.slice(0, POOL_PAGE_SIZE).map((r) => ({
      id: r.id,
      name: r.name,
      alias: needle !== "" && r.alias !== null && !normalize(r.name).includes(needle) ? r.alias : null,
      taken: letters.find((letter) => !avoids(r.name, [letter])) ?? null,
    })),
  };
}
