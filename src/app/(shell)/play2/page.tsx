import { SubstringsScreen } from "../../substrings";
import { Signed } from "../../home";
import { Slide } from "../../slide";

// Game 2's screen: its plain round in the play frame, and the cards at the end
// (docs/milestones/M14-14c-9-plain-game-2.md). Reached by its address until the shared screens (16f). Signed out,
// it shows sign-in first, as every page does through Signed.
export default function Page() {
  return (
    <Slide>
      <Signed>
        <SubstringsScreen />
      </Signed>
    </Slide>
  );
}
