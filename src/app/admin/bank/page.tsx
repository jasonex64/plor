import Link from "next/link";
import { Suspense } from "react";
import { AuditLink } from "../audit-link";
import { Bank } from "./bank";

// Admin-only question bank (docs/milestones/M13-13d-the-question-bank.md). The page itself shows nothing private: the
// bank comes from /api/admin/bank, which checks the signed-in user against private.admin.
export default function BankPage() {
  return (
    <main>
      <h1>Question bank</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Bank />
      </Suspense>
      <footer>
        <p>
          <Link href="/admin">Puzzle insights</Link> · <Link href="/admin/puzzles">Puzzles</Link> ·{" "}
          <Link href="/admin/reports">Reported comments</Link> · <Link href="/admin/base">Answer database</Link> · <AuditLink /> ·{" "}
          <Link href="/">Back to Plor</Link>
        </p>
      </footer>
    </main>
  );
}
