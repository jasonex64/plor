import { Signed, TodayTab } from "../home";
import { GAME } from "@/platform/game";
import { Slide } from "../slide";

// The introduction is static, so it is in the served HTML before any script runs: Google's brand verification rejected
// a home page that showed only a sign-in form, didn't explain the app, and was headed "Offbeat" while the app is "Plor"
// (human, 2026-10-19; M02 ticket, 2c). The heading and the privacy link are the shell's
// (src/app/shell-page.tsx). Everything that depends on the session or the address bar renders on the client
// (node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md).
export default function Page() {
  return (
    <Slide>
      {/* For signed-out visitors only: hidden by globals.css once the shell shows (14b-8b, answer 12). */}
      <div data-signed-out className="reading">
        <p>
          Plor is a small site with a daily word game. Everyone gets the same puzzle each day, and a new one starts at
          midnight Pacific time.
        </p>
        <h2>Today&apos;s game: {GAME.name}</h2>
        <p>
          Seven stops up the ridge, each asking something like &quot;Name an animal&quot;. At each one, give an answer
          the Wind didn&apos;t think of: match the Wind and it sends you flying. Unusual answers are your way up. Sign in
          to play and see how your friends did.
        </p>
      </div>
      <Signed>
        <TodayTab />
      </Signed>
    </Slide>
  );
}
