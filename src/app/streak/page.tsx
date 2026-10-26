import { Suspense } from "react";
import { Home } from "../home";
import { Footer } from "../footer";

// The streak's ranks, opened from the pill in the top bar or sidebar (docs/milestones/M14-14b-2a-streak-ranks.md).
// Signed out, it shows sign-in first, as every page does through Home.
export default function StreakPage() {
  return (
    <main>
      <h1>Plor</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Home view={{ kind: "streak" }} />
      </Suspense>
      <Footer />
    </main>
  );
}
