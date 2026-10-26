import { Suspense } from "react";
import { Footer } from "../../footer";
import { Home } from "../../home";

// Puzzle insights (docs/milestones/M03-puzzle-insights.md). In the admin area of Plor's shell (docs/milestones/M14-14b-2b-2-admin-build.md). The page itself shows
// nothing private: its data comes from the admin APIs, which check the signed-in user against private.admin.
export default function InsightsPage() {
  return (
    <main>
      <h1>Plor</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Home view={{ kind: "admin", page: "insights" }} />
      </Suspense>
      <Footer />
    </main>
  );
}
