// The words the clock game's screens use for what the server gives as numbers (docs/milestones/M23-23d-the-screens.md, Design).
import type { Tier } from "@/content/puzzle";

// An answer's tier as a plain word (docs/milestones/M23-23d-the-screens.md, Assumptions 3: answers 10 and 11).
export const TIER_WORD: Record<Tier, string> = { common: "Common", uncommon: "Uncommon", rare: "Rare" };

// The time an answer added, in seconds: whole seconds as they are, otherwise to one decimal (answer 41's "+N s").
export function addedText(addedMs: number): string {
  const seconds = addedMs / 1000;
  return `+${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)} s`;
}

export const answersText = (count: number): string => (count === 1 ? "1 answer" : `${count} answers`);
