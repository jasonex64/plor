// The audit of what the game learned from misses (docs/milestones/M13-13b-learning-from-misses.md; human,
// 2026-10-24: "an easy way for me to audit what's added and remove if needed"): every text that reached the threshold,
// and an admin's decision on one, through private.audit_list, private.audit_open_count and private.audit_decide; and
// what a near-typo is near, through private.audit_near (M14 14b-2b-2b). The routes check the admin first; the
// functions check again.
import { DatabaseError } from "pg";
import { withinTypo } from "@/game/matching";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";

export type Named = { id: string; name: string };
export type Review = {
  id: number;
  category: string;
  category_name: string;
  text: string;
  outcome: "accepted" | "held" | "held_subset" | "rejected" | "near_typo";
  players: number;
  answered: number;
  reached_at: string;
  thing: Named | null;
  decision: "undone" | "linked" | "accepted" | "dismissed" | null;
  decided_at: string | null;
  chosen: Named | null;
  named: Named[];
  // For a waiting near-typo, the answers it's a typo of, to link it to in one click; otherwise empty.
  near: Named[];
};

export const ACTIONS = ["undo", "link", "accept", "accept_for_category", "dismiss"] as const;
export type Action = (typeof ACTIONS)[number];
// The actions that name a thing: the member a text is linked to, or the thing a rejected text is accepted as.
const NEEDS_THING: readonly Action[] = ["link", "accept_for_category"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// The functions' own admin check (OB007), and a decision that doesn't fit the text's state (OB012).
function mapError(err: unknown): never {
  if (err instanceof DatabaseError && err.code === "OB007") throw new AppError("admins_only", 403);
  if (err instanceof DatabaseError && err.code === "OB012") throw new AppError("audit_invalid", 409, err.message);
  throw err;
}

export async function listReviews(db: Db, adminId: string): Promise<{ reviews: Review[]; open: number }> {
  try {
    const { rows } = await db.query<{ reviews: Omit<Review, "near">[]; open: number }>(
      "select private.audit_list($1) as reviews, private.audit_open_count($1) as open",
      [adminId],
    );
    const reviews = await Promise.all(
      rows[0].reviews.map(async (r) => {
        if (r.outcome !== "near_typo" || r.decision) return { ...r, near: [] };
        // The text is stored normalized (logMiss, src/game/runs.ts), as withinTypo expects.
        const near = await db.query<{ near: Named[] }>("select private.audit_near($1, $2, $3) as near", [adminId, r.id, withinTypo(r.text)]);
        return { ...r, near: near.rows[0].near };
      }),
    );
    return { reviews, open: rows[0].open };
  } catch (err) {
    mapError(err);
  }
}

export async function openCount(db: Db, adminId: string): Promise<number> {
  try {
    const { rows } = await db.query<{ open: number }>("select private.audit_open_count($1) as open", [adminId]);
    return rows[0].open;
  } catch (err) {
    mapError(err);
  }
}

// The request body is user input: a review ID, one of ACTIONS, and a thing ID for the actions that name one.
export async function decide(db: Db, adminId: string, body: Record<string, unknown>): Promise<void> {
  const { id, action, thing } = body;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1) throw new AppError("bad_request", 400, "id");
  if (typeof action !== "string" || !(ACTIONS as readonly string[]).includes(action)) throw new AppError("bad_request", 400, "action");
  const needsThing = NEEDS_THING.includes(action as Action);
  if (needsThing ? typeof thing !== "string" || !UUID.test(thing) : thing !== undefined) throw new AppError("bad_request", 400, "thing");
  try {
    await db.query("select private.audit_decide($1, $2, $3, $4)", [adminId, id, action, needsThing ? thing : null]);
  } catch (err) {
    mapError(err);
  }
}
