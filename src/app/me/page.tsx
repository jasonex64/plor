import Link from "next/link";
import { Suspense } from "react";
import { Home } from "../home";

// The Me tab: the player's stats (docs/milestones/M14-14a-3a-me.md); their account is in the settings sheet
// (docs/milestones/M14-14a-3b-settings.md). Signed out, it shows sign-in first, as every page does through Home.
export default function MePage() {
  return (
    <main>
      <h1>Plor</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Home view={{ kind: "me" }} />
      </Suspense>
      <footer>
        <p>
          <Link href="/privacy">Privacy policy</Link>
        </p>
      </footer>
    </main>
  );
}
