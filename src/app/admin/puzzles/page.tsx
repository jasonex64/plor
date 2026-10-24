import Link from "next/link";
import { Suspense } from "react";
import { Puzzles } from "./puzzles";

// Admin-only puzzle entry (docs/milestones/M06-puzzle-entry.md). The page itself shows nothing private: the days come
// from /api/admin/puzzles, which checks the signed-in user against private.admin.
export default function PuzzlesPage() {
  return (
    <main>
      <h1>Puzzles</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Puzzles />
      </Suspense>
      <footer>
        <p>
          <Link href="/admin">Puzzle insights</Link> · <Link href="/admin/reports">Reported comments</Link> ·{" "}
          <Link href="/admin/base">Answer database</Link> · <Link href="/">Back to Plor</Link>
        </p>
      </footer>
    </main>
  );
}
