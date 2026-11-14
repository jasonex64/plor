import { FragmentsTab, Signed } from "../../home";
import { GuestPlay } from "../../guest-play";
import { Slide } from "../../slide";

// Game 2's screen: its plain round in the play frame, and the cards and its comments at the end
// (docs/milestones/M14-14c-9-plain-game-2.md; M16 16f-3). Signed out, it is the bare
// guest game (src/app/guest-game.tsx).
export default function Page() {
  return (
    <Slide>
      <Signed signedOut={<GuestPlay game="substrings" />}>
        <FragmentsTab />
      </Signed>
    </Slide>
  );
}
