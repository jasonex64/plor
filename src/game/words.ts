// Updraft's words for how a stop went (docs/milestones/M14-14c-1-name-and-words.md, "The words"): what a player who
// got past a stop sees, and how a run ended, by the stop's tier. Pure, so the pages and the share text use one copy.

// The three tiers: stops 1-2, 3-5 and 6-7 (human, 2026-10-25: "Three tiers"; timeouts too, 2026-10-27, round 6).
// stop is 1-based, as the pages number them.
export function tierOf(stop: number): 0 | 1 | 2 {
  return stop <= 2 ? 0 : stop <= 5 ? 1 : 2;
}

// Round 8: "Steady! / Holding on! / Still standing!".
const GOT_PAST = ["Steady!", "Holding on!", "Still standing!"] as const;
// Round 8: "Tipped over / tumbled / sent flying (Recommended)".
const CAUGHT = ["tipped over", "tumbled", "sent flying"] as const;
// Round 7: "Dozed off / stalled / frozen solid (Recommended)".
const TIMED_OUT = ["dozed off", "stalled", "frozen solid"] as const;

export const gotPastText = (stop: number) => GOT_PAST[tierOf(stop)];
// The catch's word alone, where the stop is already shown (yesterday's card).
export const caughtWord = (stop: number) => CAUGHT[tierOf(stop)];
// "tumbled at stop 4", always the word then the stop (round 5's "<word> at stop N").
export const caughtText = (stop: number) => `${caughtWord(stop)} at stop ${stop}`;
export const timedOutText = (stop: number) => `${TIMED_OUT[tierOf(stop)]} at stop ${stop}`;

// The same line starting a sentence or a heading.
export const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
