import Link from "next/link";
import { Suspense } from "react";
import { Home } from "../../home";

// How to play Offbeat, opened from its game screen (docs/milestones/M14-14a-2b-game-screen.md, criterion 3).
export default function HowToPlayPage() {
  return (
    <main>
      <h1>Plor</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Home view={{ kind: "howToPlay" }} />
      </Suspense>
      <footer>
        <p>
          <Link href="/privacy">Privacy policy</Link>
        </p>
      </footer>
    </main>
  );
}
