// A played question's answers, searched (docs/milestones/M14-14b-12-answer-lists.md): through private.search_answers,
// which decides who may (a player whose run of the day is over, for the questions they answered; after the day's
// midnight, anyone whose run of it isn't still going: OB013 otherwise) and reads only what the day accepted.
import { DatabaseError } from "pg";
import { normalize } from "@/content/puzzle";
import { ANSWER_SEARCH_LIMIT, ANSWER_SHARE_MIN_PLAYERS } from "@/config/tunables";
import { shownName } from "./payload";
import { GAME_ID } from "@/platform/game";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";

// An answer the question accepted: its main name, the name the search matched when that's another of its names,
// its tier from the day's levels, and how many players gave it, or null while too few answered the question (M11 H5).
export type FoundAnswer = { name: string; matched: string | null; tier: "common" | "uncommon" | "rare"; players: number | null };

export async function searchAnswers(db: Db, userId: string, date: string, index: number, typed: string): Promise<FoundAnswer[]> {
  try {
    const { rows } = await db.query<{ name: string; matched: string; tier: FoundAnswer["tier"]; players: number | null }>(
      "select name, matched, tier, players from private.search_answers($1, $2, $3::date, $4, $5, $6, $7)",
      [userId, GAME_ID, date, index, normalize(typed), ANSWER_SEARCH_LIMIT, ANSWER_SHARE_MIN_PLAYERS],
    );
    // Names are matched as aliases are stored, normalized; the main name is shown as every screen shows names.
    return rows.map((r) => {
      const name = shownName(r.name);
      return { name, matched: normalize(name) === r.matched ? null : r.matched, tier: r.tier, players: r.players };
    });
  } catch (err) {
    if (err instanceof DatabaseError && err.code === "OB013") throw new AppError("answers_closed", 403);
    throw err;
  }
}
