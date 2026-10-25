import Link from "next/link";
import { Suspense } from "react";
import { Home } from "../home";

// Offbeat's game screen: the run, the player's stats, yesterday's answers and the feed
// (docs/milestones/M14-14a-2b-game-screen.md). Signed out, it shows sign-in first, as every page does through Home.
export default function OffbeatPage() {
  return (
    <main>
      <h1>Plor</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Home view={{ kind: "offbeat" }} />
      </Suspense>
      <footer>
        <p>
          <Link href="/privacy">Privacy policy</Link>
        </p>
      </footer>
    </main>
  );
}
