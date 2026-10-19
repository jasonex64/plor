// Whether a player's answer matches the host (DECISIONS.md: Answer model). Pure: the content decides, nothing
// is guessed at runtime. Players submit entry IDs, never raw text.
import type { Question } from "@/content/puzzle";

export type MatchResult = "matched" | "not_matched" | "invalid_entry";

export function matchAnswer(question: Question, entryId: string): MatchResult {
  if (!question.entries.some((entry) => entry.id === entryId)) return "invalid_entry";
  for (const host of question.host_answers) {
    // A host answer always matches itself; its group lists only the other entries it covers. Most questions
    // have no group for a host answer, which is the format's "no other entries" (human, 2026-10-18).
    if (entryId === host || (question.match_groups[host] ?? []).includes(entryId)) return "matched";
  }
  return "not_matched";
}
