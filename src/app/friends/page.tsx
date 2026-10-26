import { Suspense } from "react";
import { Home } from "../home";
import { Footer } from "../footer";

// The Friends tab: the live board and the friends leaderboard (docs/milestones/M14-14a-1-shell.md). Signed out, it
// shows sign-in first, as every page does through Home.
export default function FriendsPage() {
  return (
    <main>
      <h1>Plor</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Home view={{ kind: "friends" }} />
      </Suspense>
      <Footer />
    </main>
  );
}
