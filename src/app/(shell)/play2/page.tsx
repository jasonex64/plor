import { BrewScreen } from "@/brew/brew";
import { Signed } from "../../home";
import { Slide } from "../../slide";

// Game 2's screen: its run in Midnight Brew, full screen, and the cards at the end
// (docs/milestones/M16-16g-2-midnight-brew-in-play2.md). Reached by its address until the shared screens (16f). Signed out,
// it shows sign-in first, as every page does through Signed.
export default function Page() {
  return (
    <Slide>
      <Signed>
        <BrewScreen />
      </Signed>
    </Slide>
  );
}
