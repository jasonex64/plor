import { Suspense } from "react";
import { Footer } from "../../footer";
import { Home } from "../../home";

// Reported comments (docs/milestones/M08-comments-and-reactions.md, 8c). In the admin area of Plor's shell (docs/milestones/M14-14b-2b-2-admin-build.md). The page itself shows
// nothing private: its data comes from the admin APIs, which check the signed-in user against private.admin.
export default function ReportsPage() {
  return (
    <main>
      <h1>Plor</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Home view={{ kind: "admin", page: "reports" }} />
      </Suspense>
      <Footer />
    </main>
  );
}
