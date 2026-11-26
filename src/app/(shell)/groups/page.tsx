import { GroupsTab, Signed } from "../../home";
import { Slide } from "../../slide";

// The Groups tab: the player's default group, or making one (docs/milestones/M14-14a-1-shell.md; M24 24b). Signed out, it shows
// sign-in first, as every page does through Signed.
export default function Page() {
  return (
    <Slide>
      <Signed>
        <GroupsTab />
      </Signed>
    </Slide>
  );
}
