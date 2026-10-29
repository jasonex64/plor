import { Groups } from "../../groups";
import { Signed } from "../../home";
import { Slide } from "../../slide";

// The Groups tab: the player's groups, and making one (docs/milestones/M14-14a-1-shell.md). Signed out, it shows
// sign-in first, as every page does through Signed.
export default function Page() {
  return (
    <Slide>
      <Signed>
        <Groups />
      </Signed>
    </Slide>
  );
}
