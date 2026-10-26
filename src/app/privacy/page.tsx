import type { Metadata } from "next";
import { ButtonLink } from "../button-link";

export const metadata: Metadata = { title: "Plor privacy policy" };

// The privacy page Google brand verification asks for (M02 ticket, 2c; D5). Every statement here must match what
// the code and the services actually do; the facts the human chose (contact, minimum age, AI use) are in the
// ticket's Numbers table. Update "Last updated" whenever the text changes.
export default function Privacy() {
  return (
    <main>
      <h1>Plor privacy policy</h1>
      <p>Last updated: 2026-10-25</p>
      <p>
        Plor (plor.app) is a small daily word game. This page says what we keep about you, why, and how to have it
        deleted. Questions: <a href="mailto:privacy@plor.app">privacy@plor.app</a>.
      </p>

      <h2>What we keep</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your email address, the username you pick, your display name if you set one, and your settings (Skip the game
          screen, Numbers on the calendar, your theme). If you sign in with Google,
          Google also shares your name, and your profile picture if you have one; they are stored with your
          account. Plor doesn&apos;t show or use them.
        </li>
        <li>
          <strong>Your games:</strong> each day you play, which answer you picked for each question, whether it matched
          the host, and when. If you send an answer that isn&apos;t on our list, we keep what you typed (up to 40
          characters). Once enough players type the same answer, it can become an answer everyone can give, shown
          without who typed it.
        </li>
        <li>
          <strong>Your friends:</strong> who you are friends with, and your invite link. Your friends, and anyone
          signed in who opens your invite link, can see your username and your display name if you set one.
        </li>
        <li>
          <strong>Your groups:</strong> which groups you are in, and the comments and reactions you post in them.
          Everyone in a group, friends or not, can see your username and display name, your points for the week, and
          your comments and reactions in that group. Anyone signed in who opens a group&apos;s invite link sees its
          name.
        </li>
        <li>
          <strong>Deleted comments:</strong> if an admin deletes one of your comments after it was reported, we keep
          its text, and which admin deleted it, until you delete your account.
        </li>
        <li>
          <strong>Sign-in cookies:</strong> they keep you signed in. Plor has no ads, no analytics and no tracking
          cookies.
        </li>
        <li>
          <strong>Your theme, in this browser:</strong> a copy of the theme you picked, kept in this browser&apos;s
          storage so pages open in it straight away. Signing out removes it.
        </li>
        <li>
          <strong>Sign-in attempts:</strong> to stop anyone guessing sign-in codes or flooding sign-in, we count recent
          attempts by a scrambled form of your IP address and email address, never the addresses themselves. An
          attempt stops counting after an hour or less, and is deleted the next time anyone signs in after that.
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
        We keep your account and games until you delete them. You can delete your account yourself in Settings (the
        gear): it removes your account together with all your games, unlisted answers, points, comments, reactions,
        reports and friends, straight away. A group you made stays with its other members, and an answer that enough
        players typed stays in the game, without your name. For anything else, email{" "}
        <a href="mailto:privacy@plor.app">privacy@plor.app</a> from the address you sign in with. Our providers&apos;
        logs are not part of your account and expire on their own schedules.
      </p>

      <h2>Children</h2>
      <p>Plor is not for children under 13. If you are under 13, please don&apos;t sign up.</p>

      {/* Credits for the answer database's sources (docs/milestones/M13-13a-the-base.md; SOURCES.md, M13 D2): CC BY
          asks for attribution; CC0 asks for none, and Plor names those sources anyway. A source is listed once
          its data is in the game: Catalogue of Life joins when it's used. LDNOOBW (13b) is CC BY too. */}
      <h2>Data sources</h2>
      <p>The answers Plor accepts are built partly from these open data sets:</p>
      <ul>
        <li>
          <a href="https://www.wikidata.org/">Wikidata</a> (CC0).
        </li>
        <li>
          <a href="https://github.com/globalwordnet/english-wordnet">Open English WordNet</a>, 2025 Edition, adapted: Plor normalizes its words and links them to the other sets (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>).
        </li>
        <li>
          <a href="https://fdc.nal.usda.gov/">USDA FoodData Central</a>, SR Legacy (CC0).
        </li>
      </ul>
      <p>
        A new answer that players add waits for a person&apos;s review if it holds a word on the English list of{" "}
        <a href="https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words">
          List of Dirty, Naughty, Obscene and Otherwise Bad Words
        </a>{" "}
        (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>).
      </p>

      <h2>Changes</h2>
      <p>If this page changes, the date at the top changes too.</p>

      <p>
        <ButtonLink href="/">Back to Plor</ButtonLink>
      </p>
    </main>
  );
}
