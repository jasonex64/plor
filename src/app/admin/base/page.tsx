import Link from "next/link";
import { AuditLink } from "../audit-link";
import { Suspense } from "react";
import { AnswerBase } from "./base";

// Admin-only answer database lookup (docs/milestones/M13-13a-the-base.md). The page itself shows nothing private: the
// results come from /api/admin/base, which checks the signed-in user against private.admin.
export default function AnswerBasePage() {
  return (
    <main>
      <h1>Answer database</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <AnswerBase />
      </Suspense>
      <footer>
        <p>
          <Link href="/admin">Puzzle insights</Link> · <Link href="/admin/puzzles">Puzzles</Link> ·{" "}
          <Link href="/admin/reports">Reported comments</Link> · <AuditLink /> · <Link href="/">Back to Plor</Link>
        </p>
      </footer>
    </main>
  );
}
