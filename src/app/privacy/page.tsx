import type { Metadata } from "next";
import { ButtonLink } from "../button-link";

export const metadata: Metadata = { title: "Plor privacy policy" };

// The privacy page Google brand verification asks for (M02 ticket, 2c; D5). Every statement here must match what
// the code and the services actually do; the facts the human chose (contact, minimum age, AI use) are in the
// ticket's Numbers table. Update "Last updated" whenever the text changes.
export default function Privacy() {
  return (
    <main className="reading">
      <h1>Plor privacy policy</h1>
      <p>Last updated: 2026-11-13</p>
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
        {/* The next two, the guest cookie under "Sign-in cookies" and Cloudflare below: docs/milestones/M18-guest-play.md,
            "Privacy page draft" (approved 2026-11-13); the guest item's run-keeping words: docs/milestones/M19-pre-beta-fixes.md,
            answer 16 (approved 2026-11-13). */}
        <li>
          <strong>Playing without an account:</strong> you can play a day&apos;s game as a guest. While you play, a
          cookie holds a random code so the game knows which run is yours; it is not an account and has no name.
          Your answers are added to the day&apos;s counts of how many people gave each answer, with nothing that says
          who gave them. Your run is kept until that day ends, so you can see your result again, and is then deleted,
          finished or not. Text you type that isn&apos;t on our list isn&apos;t kept. A guest has no streak, points or history;
          making an account starts fresh.
        </li>
        <li>
          <strong>The bot check:</strong> when a guest presses Start, Cloudflare Turnstile checks that a person, not a
          program, is there. For that, your browser loads a script from Cloudflare, which sees your IP address and
          details of your browser. Plor gets back only whether the check passed.
        </li>
        <li>
          <strong>Your friends:</strong> who you are friends with. Your friends can see your username and your display
          name if you set one.
        </li>
        {/* The next three: docs/milestones/M17-profiles-and-friend-requests.md, "17c design", Privacy page (answer 33). */}
        <li>
          <strong>Your profile and who can find it:</strong> any signed-in player can look you up by your exact
          username (not by display name or part of a username) and open your profile. A signed-in player who isn&apos;t
          your friend sees your username, your display name if you set one, your points, days played and streaks, and
          your best and average results in the daily game. Your friends also see when you started playing, your
          calendar of days played this month, your rarest answers and a chart of your last 7 days. Nobody who is signed
          out can see a profile. If you change your username, the old one still opens your profile for 30 days and no
          one else can take it; if you delete your account in that time, the old username is freed at once.
        </li>
        <li>
          <strong>Friend requests and blocks:</strong> we keep the friend requests you send and receive, and the players
          you block. Blocking someone ends any friendship with them, stops their requests reaching you, and makes your
          profile and username show nothing to them. You and they stop seeing each other&apos;s comments and reactions,
          though results on a shared group&apos;s board still show. They are not told. You can unblock someone from a
          list in Settings.
        </li>
        <li>
          <strong>Lookup counts:</strong> to stop anyone listing usernames, we count how many times each signed-in
          player looks up a username that isn&apos;t their own or a friend&apos;s, and how many friend requests they
          send, in an hour. We count by a scrambled form of your account&apos;s ID. An entry stops counting after an
          hour, and is deleted the next time anyone&apos;s lookup is counted after that.
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
          <strong>Sign-in cookies:</strong> they keep you signed in. Also the guest cookie above, which lasts until you
          close the browser. Plor has no ads, no analytics and no tracking cookies.
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
        <li>Cloudflare: the bot check when a guest starts a game.</li>
      </ul>

      <h2>Keeping and deleting</h2>
      <p>
        We keep your account and games until you delete them. You can delete your account yourself in Settings (the
        gear): it removes your account together with all your games, unlisted answers, points, comments, reactions,
        reports, friends, friend requests, blocks and any old username held for you, straight away. A group you made stays with its other members, and an answer that enough
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
