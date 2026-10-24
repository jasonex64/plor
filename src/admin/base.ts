// The answer database's admin lookup (docs/milestones/M13-13a-the-base.md; human, 2026-10-24: "Search and browse
// (Recommended)"): every thing one of whose aliases is exactly the typed text, normalized as aliases are.
import { DatabaseError } from "pg";
import { normalize } from "@/content/puzzle";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";

export type ThingView = {
  id: string;
  name: string;
  aliases: { alias: string; kind: string; origin: string }[];
  sources: { source: string; id: string }[];
  facts: { trait: string; value: string; origin: string; source_ref: string | null }[];
  categories: string[];
};

// The typed text is user input: anything that normalizes to nothing is refused.
export async function lookupThings(db: Db, adminId: string, text: unknown): Promise<ThingView[]> {
  const alias = typeof text === "string" ? normalize(text) : "";
  if (!alias) throw new AppError("bad_request", 400, "q");
  try {
    const { rows } = await db.query<{ things: ThingView[] }>("select private.base_lookup($1, $2) as things", [adminId, alias]);
    return rows[0].things;
  } catch (err) {
    // private.base_lookup's own admin check (migration 20261024095732_answer_base.sql).
    if (err instanceof DatabaseError && err.code === "OB007") throw new AppError("admins_only", 403);
    throw err;
  }
}
