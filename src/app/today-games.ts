import { GAME, SUBSTRINGS } from "@/platform/game";

// Which of Today's game cards show and which is in front on opening (docs/milestones/M16-16f-the-shared-pieces.md,
// 16f-2; the human's answers 5, 7 and 25). A game's day: null when it has no approved day today, else whether the
// player's run is over (a game not started or in play is left to play).
export type DayState = { over: boolean } | null;

// The cards in a fixed order, Offbeat first (answer 25). A day with an approved day in only one game shows that card
// alone (answer 7); with neither, Offbeat's card says there is no puzzle, as it did before Fragments had a card. In
// front: the one left to play, Offbeat once both are over (answer 5).
export function todayCards(offbeat: DayState, fragments: DayState): { cards: (typeof GAME.id | typeof SUBSTRINGS.id)[]; front: number } {
  if (offbeat && fragments) return { cards: [GAME.id, SUBSTRINGS.id], front: offbeat.over && !fragments.over ? 1 : 0 };
  return { cards: [fragments && !offbeat ? SUBSTRINGS.id : GAME.id], front: 0 };
}
