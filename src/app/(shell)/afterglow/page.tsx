import type { Metadata } from "next";
import { GAME } from "@/platform/game";
import { GameTab, Signed } from "../../home";
import { Slide } from "../../slide";

// The browser tab names the game (docs/milestones/M14-14c-6-afterglow-in-play.md, answer 12).
export const metadata: Metadata = { title: GAME.name };

// The game's screen: the run, the player's stats, yesterday's answers and the feed
// (docs/milestones/M14-14a-2b-game-screen.md). Signed out, it shows sign-in first, as every page does through Signed.
export default function Page() {
  return (
    <Slide>
      <Signed>
        <GameTab />
      </Signed>
    </Slide>
  );
}
