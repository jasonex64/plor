"use client";

// Sign-in, then picking a username, then the player's tab inside the shell (docs/milestones/M14-14a-1-shell.md): Today
// (Offbeat's banner and the feed), Friends, Groups or Me; Offbeat's game screen and How to play
// (docs/milestones/M14-14a-2b-game-screen.md); the streak's ranks (/streak, docs/milestones/M14-14b-2a-streak-ranks.md);
// or, on an invite link (/invite/<code>), the friend request; on a
// group's link (/groups/join/<code>), joining it; on a group's page (/groups/<id>), the group. Every step goes through
// the API; errors are shown to the player and never retried silently (DECISIONS.md: Error handling).
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useLayoutEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import type { Friend } from "@/friends/friends";
import { INVITE_CODE } from "@/friends/invite-code";
import { api } from "@/lib/api-client";
import type { Profile } from "@/lib/profile";
import { Board } from "./board";
import { PAUSED_TEXT, PAYLOAD_VERSION, changesThread, useBoardChannel } from "./board-channel";
import { Comments } from "./comments";
import { FriendsList } from "./friends-list";
import { TodayBanner } from "./game";
import { GroupPage, Groups, JoinGroup } from "./groups";
import { Leaderboard, LeaderboardCard } from "./leaderboard";
import { MeStats } from "./me";
import { errorText, messageForRedirect } from "./messages";
import { HowToPlay, OffbeatScreen } from "./offbeat";
import { StreakRanks } from "./streak";
import { applyTheme } from "./theme";
import { ClockBar, MeAdminLink, Shell } from "./shell";
import styles from "./today.module.css";

// GET /api/profile: signed out; signed in without a username yet; or signed in with the profile, which the settings
// sheet shows and Today and Me follow (docs/milestones/M14-14a-3b-settings.md), with the streak, which the shell shows as
// its rank (docs/milestones/M14-14b-2a-streak-ranks.md).
type Me =
  | { signedIn: false }
  | { signedIn: true; username: null; admin: boolean }
  | ({ signedIn: true; admin: boolean; streak: number } & Profile);

// What a page other than "/" shows once the player is signed in with a username.
export type View =
  | { kind: "friends" }
  | { kind: "groups" }
  | { kind: "me" }
  | { kind: "offbeat" }
  | { kind: "howToPlay" }
  | { kind: "streak" }
  | { kind: "invite"; code: string }
  | { kind: "joinGroup"; code: string }
  | { kind: "group"; id: string };

// Google sign-in leaves the page and comes back to "/" (src/app/auth/callback/route.ts), so an invite link opened
// while signed out, a friend's or a group's, is remembered for that round trip in this tab's sessionStorage, as its
// path (M07 7b; M10 10b).
const PENDING_INVITE = "plor.pendingInvite";
const INVITE_PATH = /^\/(?:invite|groups\/join)\/(.+)$/;

function invitePath(view?: View): string | undefined {
  if (view?.kind === "invite") return `/invite/${view.code}`;
  if (view?.kind === "joinGroup") return `/groups/join/${view.code}`;
}

export function Home({ view }: { view?: View }) {
  const redirectError = useSearchParams().get("error");
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  function loadMe() {
    api<Me>("/api/profile", { method: "GET" }).then(setMe, (err) => setLoadError(errorText(err)));
  }
  useEffect(loadMe, []);
  // The account's theme, once the profile is known, keeping this browser's copy in step (the copy itself is re-applied
  // on every page by KeepTheme, src/app/keep-theme.tsx). Signed out, or before a username, nothing is picked.
  useLayoutEffect(() => {
    if (me) applyTheme(me.signedIn && me.username !== null ? me.settings.theme : null);
  }, [me]);

  // Back from Google with an invite pending: go back to its page. On an invite page the remembered one is spent, so
  // a code kept for a Google round trip that was cancelled doesn't send the player back here from the next visit to
  // "/". Storage that can't be read holds nothing, because the write before leaving for Google would have failed and
  // been shown to the player.
  const onInvite = invitePath(view) !== undefined;
  useEffect(() => {
    if (!me?.signedIn) return;
    let pending: string | null;
    try {
      pending = window.sessionStorage.getItem(PENDING_INVITE);
      window.sessionStorage.removeItem(PENDING_INVITE);
    } catch {
      return;
    }
    const code = pending && !onInvite ? INVITE_PATH.exec(pending)?.[1] : undefined;
    if (pending && code && INVITE_CODE.test(code)) router.replace(pending);
  }, [onInvite, me, router]);

  if (loadError) return <p role="alert">{loadError}</p>;
  if (!me) return <p>Loading…</p>;
  return (
    <>
      {redirectError && !me.signedIn && <p role="alert">{messageForRedirect(redirectError)}</p>}
      {!me.signedIn ? (
        <SignIn returnTo={invitePath(view)} onSignedIn={loadMe} />
      ) : me.username === null ? (
        <PickUsername onDone={loadMe} />
      ) : (
        <>
          <Shell
            admin={me.admin}
            profile={me}
            streak={me.streak}
            onChanged={loadMe}
            onSettings={(settings) => setMe({ ...me, settings })}
            onSignedOut={() => setMe({ signedIn: false })}
          />
          {/* Away from the game screen, a question left in play keeps its clock in view (M14 L18). */}
          {view?.kind !== "offbeat" && <ClockBar />}
          {view?.kind === "offbeat" ? (
            <OffbeatScreen username={me.username} onStarted={loadMe} />
          ) : view?.kind === "howToPlay" ? (
            <HowToPlay />
          ) : view?.kind === "streak" ? (
            <StreakRanks days={me.streak} />
          ) : view?.kind === "friends" ? (
            <Friends username={me.username} />
          ) : view?.kind === "groups" ? (
            <Groups />
          ) : view?.kind === "me" ? (
            <>
              {/* Only the stats (L45); the account is in the settings sheet (14a-3b). */}
              <MeStats numbers={me.settings.calendarNumbers} />
              {me.admin && <MeAdminLink />}
            </>
          ) : view?.kind === "invite" ? (
            <AcceptInvite code={view.code} />
          ) : view?.kind === "joinGroup" ? (
            <JoinGroup code={view.code} />
          ) : view?.kind === "group" ? (
            <GroupPage id={view.id} username={me.username} />
          ) : (
            <Today username={me.username} skip={me.settings.skipGameScreen} />
          )}
        </>
      )}
    </>
  );
}

function SignIn({ returnTo, onSignedIn }: { returnTo?: string; onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/email", { method: "POST", body: { email } });
      setSentTo(email);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  // The emailed code, not a link: mail scanners open links and use them up (docs/milestones/M02-2f-cleanup.md, A3).
  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/email/verify", { method: "POST", body: { email: sentTo, code } });
      onSignedIn();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api<{ url: string }>("/api/auth/google", { method: "POST" });
      if (returnTo) window.sessionStorage.setItem(PENDING_INVITE, returnTo);
      window.location.assign(url);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <form onSubmit={verify}>
        <h2>Enter your code</h2>
        <p>We sent a sign-in code to {sentTo}.</p>
        <label>
          Code
          <input required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        <button type="submit" disabled={busy}>
          Sign in
        </button>{" "}
        {/* Back to the email step, to fix a mistyped address (docs/milestones/M12-account.md, A6). */}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setSentTo(null);
            setCode("");
            setError(null);
          }}
        >
          Use a different email
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    );
  }
  return (
    <section>
      <h2>Sign in to play</h2>
      <button type="button" onClick={google} disabled={busy}>
        Continue with Google
      </button>
      <form onSubmit={sendCode}>
        <label>
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <button type="submit" disabled={busy}>
          Email me a sign-in code
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

function PickUsername({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/profile", { method: "POST", body: { username } });
      onDone();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save}>
      <h2>Pick a username</h2>
      <p>Your friends will see it. You can change it later in Settings.</p>
      <label>
        Username
        <input
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
        />
      </label>
      <button type="submit" disabled={busy}>
        Save
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

// Whether the window is at least this wide, following resizes. The server's answer is false; Home renders on the
// client, behind Suspense.
function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`;
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

// Today (docs/milestones/M14-14a-2a-today.md): Offbeat's banner, which links to its game screen (14a-2b), the one
// leaderboard card and the feed;
// from 768px the live board too (L42), and from 1200px the board and the card in a right column. The page listens to
// the board's channel for the feed's nudges (M08 8d, M11 11b); from 768px the board brings its own.
function Today({ username, skip }: { username: string; skip: boolean }) {
  const [runOver, setRunOver] = useState(false);
  const [commentsNudge, setCommentsNudge] = useState(0);
  const nudgeComments = useCallback(() => setCommentsNudge((n) => n + 1), []);
  const [channelError, setChannelError] = useState<string | null>(null);
  const { paused } = useBoardChannel({
    joined: nudgeComments,
    changed: (message) => {
      if (message.v !== PAYLOAD_VERSION) console.error("board message with unknown version", message.v);
      if (changesThread(message, "feed")) nudgeComments();
    },
    failed: (err) => setChannelError(errorText(err)),
  });
  // Count resets: at midnight Pacific every section that shows a day starts again, from the server's new day (M11 H6).
  // The run itself is played on the game screen, which keeps a game in play to its end.
  const [day, setDay] = useState(0);
  const nextDay = useCallback(() => setDay((d) => d + 1), []);

  const wide = useMinWidth(768);

  return (
    <div className={styles.today}>
      <section id="offbeat" aria-label="Offbeat" className={styles.game}>
        <TodayBanner key={`game-${day}`} skip={skip} onOver={setRunOver} onDayOver={nextDay} />
      </section>
      <aside aria-label="Your circle" className={styles.side}>
        {wide && <Board key={`board-${day}`} username={username} invite />}
        <LeaderboardCard key={`card-${day}`} />
      </aside>
      <div className={styles.feed}>
        {paused && <p role="status">{PAUSED_TEXT}</p>}
        {channelError && <p role="alert">{channelError}</p>}
        <Comments key={`feed-${day}`} username={username} runOver={runOver} nudge={commentsNudge} />
      </div>
    </div>
  );
}

// Friends (M14 14a-1): the live board and the friends leaderboard, moved from the home page, then the friends list with
// the invite link (human, 2026-10-25: "friends list should be in the friends tab"; "Below the boards (Recommended)";
// docs/milestones/M14-14a-3b-settings.md), whose link is the board's here, so it shows once. With no game on the page,
// the time to the reset comes from the run's state, and the boards start again at midnight Pacific (M11 H6).
function Friends({ username }: { username: string }) {
  const [day, setDay] = useState(0);
  const [msToReset, setMsToReset] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ run: { msToReset: number } } | { run: null; msToReset: number }>("/api/run", { method: "GET" }).then(
      (r) => setMsToReset(r.run ? r.run.msToReset : r.msToReset),
      (err) => setError(errorText(err)),
    );
  }, [day]);
  useEffect(() => {
    if (msToReset === null) return;
    const timer = setTimeout(() => setDay((d) => d + 1), msToReset);
    return () => clearTimeout(timer);
  }, [msToReset]);

  return (
    <Fragment key={day}>
      {error && <p role="alert">{error}</p>}
      <Board username={username} invite={false} />
      <Leaderboard title="Friends leaderboard" path="/api/leaderboard" />
      <FriendsList />
    </Fragment>
  );
}

// What an invite link opens, once signed in with a username (M07 7b).
function AcceptInvite({ code }: { code: string }) {
  const [inviter, setInviter] = useState<Friend | null>(null);
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ inviter: Friend }>(`/api/friends/preview?code=${encodeURIComponent(code)}`, { method: "GET" }).then(
      (r) => setInviter(r.inviter),
      (err) => setError(errorText(err)),
    );
  }, [code]);

  async function addFriend() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/friends/add", { method: "POST", body: { code } });
      setAdded(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Invite">
      {inviter && !added && (
        <>
          <h2>Add {inviter.name} as a friend?</h2>
          <button type="button" disabled={busy} onClick={() => void addFriend()}>
            Add friend
          </button>
        </>
      )}
      {inviter && added && <h2>You and {inviter.name} are now friends.</h2>}
      {error && <p role="alert">{error}</p>}
      <p>
        <Link href="/">Go to today&apos;s puzzle</Link>
      </p>
    </section>
  );
}
