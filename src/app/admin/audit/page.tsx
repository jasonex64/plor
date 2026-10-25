import Link from "next/link";
import { Suspense } from "react";
import { Audit } from "./audit";

// Admin-only audit of what was learned from misses (docs/milestones/M13-13b-learning-from-misses.md). The page itself
// shows nothing private: the list comes from /api/admin/audit, which checks the signed-in user against private.admin.
export default function AuditPage() {
  return (
    <main>
      <h1>Answer audit</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Audit />
      </Suspense>
      <footer>
        <p>
          <Link href="/admin">Puzzle insights</Link> · <Link href="/admin/puzzles">Puzzles</Link> ·{" "}
          <Link href="/admin/reports">Reported comments</Link> · <Link href="/admin/base">Answer database</Link> ·{" "}
          <Link href="/">Back to Plor</Link>
        </p>
      </footer>
    </main>
  );
}
