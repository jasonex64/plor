import { Suspense } from "react";
import { PlayFirst, Signed, SignInBelow, TodayTab } from "../home";
import { GAME, SUBSTRINGS } from "@/platform/game";
import { Slide } from "../slide";

// The introduction is static, so it is in the served HTML before any script runs: Google's brand verification rejected
// a home page that showed only a sign-in form, didn't explain the app, and was headed "Offbeat" while the app is "Plor"
// (human, 2026-10-19; M02 ticket, 2c). The heading and the privacy link are the shell's
// (src/app/shell-page.tsx). Everything that depends on the session or the address bar renders on the client
// (node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md).
// Signed out, down the page: one line saying what Plor is, the two games' cards, how each game works, then Sign in
// (docs/milestones/M20-design-rules-and-clean-up.md, 20n-7, answers 97 to 99).
export default function Page() {
  return (
    <Slide>
      {/* For signed-out visitors only: hidden by globals.css when <html data-signed-in>, set before the first paint
          (src/app/signed-in.ts; 14b-8b, answer 12; 14b-18, answer 6). */}
      <div data-signed-out className="reading">
        <p>
          Plor is a small site with two daily word games. Everyone gets the same puzzles each day, and new ones start at
          midnight Pacific time.
        </p>
      </div>
      <Signed signedOut={<PlayFirst />}>
        <TodayTab />
      </Signed>
      <div data-signed-out className="reading">
        <h2>How {GAME.name} works</h2>
        <p>
          Seven questions, such as &quot;Name an animal&quot;. For each one, give an answer the host didn&apos;t pick:
          if you match the host, your run ends. Unusual answers are your way through.
        </p>
        <h2>How {SUBSTRINGS.name} works</h2>
        <p>
          Seven rounds, each with a few letters, such as &quot;cks&quot;. Type a word that holds them together, in that
          order: &quot;rocks&quot; or &quot;backspace&quot;. Longer words score more.
        </p>
      </div>
      <Suspense fallback={null}>
        <SignInBelow />
      </Suspense>
    </Slide>
  );
}
