import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About Plor" };

// What Plor is, who makes it, its credits and its use of AI (docs/milestones/M14-14b-1-themes.md; M14 L48). The
// human chose its parts (2026-10-25: "What Plor is", "Who makes it, contact", "by jason") and the AI line, at the
// bare minimum ("Plor is built with help from AI."). Moonlit's colours are monkeytype's "rose pine moon"
// (frontend/src/ts/constants/themes.ts, read 2026-10-25), from the Rosé Pine palette. The answer data's credits stay
// on the privacy page.
export default function About() {
  return (
    <main>
      <h1>About Plor</h1>
      <p>
        Plor is a small site with a daily word game. Everyone gets the same puzzle each day, and a new one starts at
        midnight Pacific time. Play with your friends, compare your scores each week, and talk about the day&apos;s
        answers.
      </p>

      <h2>Who makes it</h2>
      <p>
        Plor is made by Jason. Questions, ideas or problems: <a href="mailto:privacy@plor.app">privacy@plor.app</a>.
      </p>

      <h2>Credits</h2>
      <p>
        The Moonlit theme uses the colours of <a href="https://monkeytype.com/">monkeytype</a>&apos;s &quot;rose pine
        moon&quot; theme, from the <a href="https://rosepinetheme.com/">Rosé Pine</a> palette.
      </p>
      <p>
        The open data sets behind Plor&apos;s answers are credited on the <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>AI</h2>
      <p>Plor is built with help from AI.</p>

      <p>
        <Link href="/">Back to Plor</Link>
      </p>
    </main>
  );
}
