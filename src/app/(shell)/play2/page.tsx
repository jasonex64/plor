import { SubstringsScreen } from "../../substrings";
import { Signed } from "../../home";
import { GuestPlay } from "../../guest-play";
import { Slide } from "../../slide";

// Game 2's screen: its plain round in the play frame, and the cards at the end
// (docs/milestones/M14-14c-9-plain-game-2.md). Reached by its address until the shared screens (16f). Signed out, it is the bare
// guest game (src/app/guest-game.tsx).
export default function Page() {
  return (
    <Slide>
      <Signed signedOut={<GuestPlay game="substrings" />}>
        <SubstringsScreen />
      </Signed>
    </Slide>
  );
}
