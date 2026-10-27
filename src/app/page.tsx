import { Suspense } from "react";
import { Home } from "./home";
import { Footer } from "./footer";
import { GAME } from "@/platform/game";

// The introduction and the privacy link are static, so they are in the served HTML before any script runs: Google's
// brand verification rejected a home page that showed only a sign-in form, didn't explain the app, and was headed
// "Offbeat" while the app is "Plor" (human, 2026-10-19; M02 ticket, 2c). Everything that depends on the session or
// the address bar renders on the client behind Suspense
// (node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md).
export default function Page() {
  return (
    <main>
      <h1>Plor</h1>
      <p>
        Plor is a small site with a daily word game. Everyone gets the same puzzle each day, and a new one starts at
        midnight Pacific time.
      </p>
      <h2>Today&apos;s game: {GAME.name}</h2>
      <p>
        Seven questions, such as &quot;Name an animal&quot;. For each one, give an answer the host didn&apos;t pick: if
        you match the host, your run ends. Unusual answers are your way through. Sign in to play and see how your friends
        did.
      </p>
      <Suspense fallback={<p>Loading…</p>}>
        <Home />
      </Suspense>
      <Footer />
    </main>
  );
}
