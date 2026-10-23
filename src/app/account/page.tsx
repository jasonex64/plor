import Link from "next/link";
import { Suspense } from "react";
import { Home } from "../home";

// The player's account page (docs/milestones/M12-account.md, 12a; A1). Signed out, it shows sign-in first, as every
// page does through Home.
export default function AccountPage() {
  return (
    <main>
      <h1>Plor</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Home view={{ kind: "account" }} />
      </Suspense>
      <footer>
        <p>
          <Link href="/privacy">Privacy policy</Link>
        </p>
      </footer>
    </main>
  );
}
