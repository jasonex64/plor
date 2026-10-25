import Link from "next/link";
import { Suspense } from "react";
import { Home } from "../home";

// The Me tab: the player's account, as the account page had it (M12 12a; it becomes the player's stats in 14a-3)
// (docs/milestones/M14-14a-1-shell.md). Signed out, it shows sign-in first, as every page does through Home.
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
