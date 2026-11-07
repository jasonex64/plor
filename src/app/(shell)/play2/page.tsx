import { Signed } from "../../home";
import { Slide } from "../../slide";
import { SubstringsScreen } from "../../substrings";

// Game 2's screen (docs/milestones/M16-16d-playing-it.md). Reached by its address until the shared screens (16f). Signed
// out, it shows sign-in first, as every page does through Signed.
export default function Page() {
  return (
    <Slide>
      <Signed>
        <SubstringsScreen />
      </Signed>
    </Slide>
  );
}
