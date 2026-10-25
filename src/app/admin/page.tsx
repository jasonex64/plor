import Link from "next/link";
import { AuditLink } from "./audit-link";
import { Suspense } from "react";
import { Insights } from "./insights";

// Admin-only puzzle insights (docs/milestones/M03-puzzle-insights.md). The page itself shows nothing private: the
// report comes from /api/admin/insights, which checks the signed-in user against private.admin.
export default function AdminPage() {
  return (
    <main>
      <h1>Puzzle insights</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Insights />
      </Suspense>
      <footer>
        <p>
          <Link href="/admin/puzzles">Puzzles</Link> · <Link href="/admin/reports">Reported comments</Link> ·{" "}
          <Link href="/admin/base">Answer database</Link> · <AuditLink /> · <Link href="/admin/bank">Question bank</Link> · <Link href="/">Back to Plor</Link>
        </p>
      </footer>
    </main>
  );
}
