import { Signed } from "../../../home";
import { HowToPlay } from "../../../offbeat";
import { Slide } from "../../../slide";

// How to play Updraft, opened from its game screen (docs/milestones/M14-14a-2b-game-screen.md, criterion 3).
export default function Page() {
  return (
    <Slide>
      <Signed>
        <HowToPlay />
      </Signed>
    </Slide>
  );
}
