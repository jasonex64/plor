import { MeTab, Signed } from "../../home";

// The Me tab: the player's stats (docs/milestones/M14-14a-3a-me.md); their account is in the settings sheet
// (docs/milestones/M14-14a-3b-settings.md). Signed out, it shows sign-in first, as every page does through Signed.
export default function Page() {
  return (
    <Signed>
      <MeTab />
    </Signed>
  );
}
