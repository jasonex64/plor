import { GameTab, Signed } from "../../home";

// Updraft's game screen: the run, the player's stats, yesterday's answers and the feed
// (docs/milestones/M14-14a-2b-game-screen.md). Signed out, it shows sign-in first, as every page does through Signed.
export default function Page() {
  return (
    <Signed>
      <GameTab />
    </Signed>
  );
}
