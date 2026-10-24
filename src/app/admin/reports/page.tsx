import Link from "next/link";
import { Suspense } from "react";
import { Reports } from "./reports";

// Admin-only reported comments (docs/milestones/M08-comments-and-reactions.md, 8c). The page itself shows nothing
// private: the list comes from /api/admin/reports, which checks the signed-in user against private.admin.
export default function ReportsPage() {
  return (
    <main>
      <h1>Reported comments</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Reports />
      </Suspense>
      <footer>
        <p>
          <Link href="/admin">Puzzle insights</Link> · <Link href="/admin/puzzles">Puzzles</Link> ·{" "}
          <Link href="/admin/base">Answer database</Link> · <Link href="/">Back to Plor</Link>
        </p>
      </footer>
    </main>
  );
}
