import { GAME_ID, SUBSTRINGS_ID } from "@/platform/game";
import kit from "./kit.module.css";

// The kit's class that carries a game's colour (kit.module.css .offbeat, .fragments), or none for the overall board,
// which is no one game's (docs/milestones/M20-design-rules-and-clean-up.md, 20k-1).
export function gameColour(id: string): string | undefined {
  if (id === GAME_ID) return kit.offbeat;
  if (id === SUBSTRINGS_ID) return kit.fragments;
  return undefined;
}
