import type { Metadata } from "next";
import { GAME } from "@/platform/game";
import { GameTab, Signed } from "../../home";
import { GuestPlay } from "../../guest-play";
import { Slide } from "../../slide";

// The browser tab names the game (14c-6, answer 12).
export const metadata: Metadata = { title: GAME.name };

// The game's screen: the run, the player's stats, yesterday's answers and the feed
// (docs/milestones/M14-14a-2b-game-screen.md). Signed out, it is the bare guest game (src/app/guest-game.tsx).
export default function Page() {
  return (
    <Slide>
      <Signed signedOut={<GuestPlay game="offbeat" />}>
        <GameTab />
      </Signed>
    </Slide>
  );
}
