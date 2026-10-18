import { Suspense } from "react";
import { Home } from "./home";

// The heading is static; everything that depends on the session or the address bar renders on the client
// behind Suspense (node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md).
export default function Page() {
  return (
    <main>
      <h1>Offbeat</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Home />
      </Suspense>
    </main>
  );
}
