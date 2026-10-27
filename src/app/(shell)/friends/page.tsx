import { FriendsTab, Signed } from "../../home";

// The Friends tab: the live board and the friends leaderboard (docs/milestones/M14-14a-1-shell.md). Signed out, it
// shows sign-in first, as every page does through Signed.
export default function Page() {
  return (
    <Signed>
      <FriendsTab />
    </Signed>
  );
}
