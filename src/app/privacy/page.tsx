import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Plor privacy policy" };

// The privacy page Google brand verification asks for (M02 ticket, 2c; D5). Every statement here must match what
// the code and the services actually do; the facts the human chose (contact, minimum age, AI use) are in the
// ticket's Numbers table. Update "Last updated" whenever the text changes.
export default function Privacy() {
  return (
    <main>
      <h1>Plor privacy policy</h1>
      <p>Last updated: 2026-10-19</p>
      <p>
        Plor (plor.app) is a small daily word game. This page says what we keep about you, why, and how to have it
        deleted. Questions: <a href="mailto:privacy@plor.app">privacy@plor.app</a>.
      </p>

      <h2>What we keep</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your email address, and the username you pick. If you sign in with Google,
          Google also shares your name and profile picture, which are stored with your account. Plor doesn&apos;t
          show or use them.
        </li>
        <li>
          <strong>Your games:</strong> each day you play, which answer you picked for each question, whether it matched
          the host, and when. If you send an answer that isn&apos;t on our list, we keep what you typed (up to 40
          characters) so we can add it.
        </li>
        <li>
          <strong>Sign-in cookies:</strong> they keep you signed in. Plor has no ads, no analytics and no tracking
          cookies.
        </li>
        <li>
          <strong>Technical logs:</strong> our providers keep logs, which can include your email address, your IP
          address and when you signed in, to run and protect the service.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To sign you in, run the game and show your results.</li>
        <li>
          To make better puzzles: we look at answers and unlisted answers across all players, without emails or
          usernames, including by giving those statistics to AI tools that help write puzzles.
        </li>
        <li>We never sell your data and never use it for advertising.</li>
      </ul>

      <h2>Who handles it for us</h2>
      <ul>
        <li>Supabase: database and sign-in, in the United States.</li>
        <li>Vercel: hosts the website; Plor&apos;s servers run in the United States.</li>
        <li>Resend: sends the sign-in emails, so it sees your email address.</li>
        <li>An email forwarding service: passes mail sent to privacy@plor.app on to us.</li>
        <li>Google: only if you choose to sign in with Google.</li>
      </ul>

      <h2>Keeping and deleting</h2>
      <p>
        We keep your account and games until you ask us to delete them. Email{" "}
        <a href="mailto:privacy@plor.app">privacy@plor.app</a> from the address you sign in with, and we will delete
        your account together with all your games and unlisted answers. Our providers&apos; logs are not part of
        your account and expire on their own schedules.
      </p>

      <h2>Children</h2>
      <p>Plor is not for children under 13. If you are under 13, please don&apos;t sign up.</p>

      <h2>Changes</h2>
      <p>If this page changes, the date at the top changes too.</p>

      <p>
        <Link href="/">Back to Plor</Link>
      </p>
    </main>
  );
}
