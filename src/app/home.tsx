"use client";

// Sign-in, then picking a username, then the player's tab inside the shell (docs/milestones/M14-14a-1-shell.md): Today
// (Offbeat's banner and the feed), Friends, Groups or Me; Offbeat's game screen and How to play
// (docs/milestones/M14-14a-2b-game-screen.md); the streak's ranks (/streak, docs/milestones/M14-14b-2a-streak-ranks.md);
// the admin area (/admin/…, docs/milestones/M14-14b-2b-2-admin-build.md);
// or, on an invite link (/invite/<code>), the friend request; on a
// group's link (/groups/join/<code>), joining it; on a group's page (/groups/<id>), the group. Every step goes through
// the API; errors are shown to the player and never retried silently (DECISIONS.md: Error handling).
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useLayoutEffect, useState, type FormEvent } from "react";
import type { Friend } from "@/friends/friends";
import { INVITE_CODE } from "@/friends/invite-code";
import { api } from "@/lib/api-client";
import { FINISHED, type RunStatus } from "@/game/status";
import type { Profile } from "@/lib/profile";
import { AdminArea, type AdminPage } from "./admin/admin-area";
import { Board } from "./board";
import { ButtonLink } from "./button-link";
import { PAYLOAD_VERSION, changesThread, useBoardChannel } from "./board-channel";
import { Comments } from "./comments";
import { FriendsList } from "./friends-list";
import { TodayBanner } from "./game";
import { GroupPage, Groups, JoinGroup } from "./groups";
import { InviteLink } from "./invite-link";
import { Leaderboard, LeaderboardCard } from "./leaderboard";
import { MeStats } from "./me";
import { useMinWidth } from "./min-width";
import { errorText, messageForRedirect } from "./messages";
import { LiveStatus } from "./live-status";
import { HowToPlay, OffbeatScreen } from "./offbeat";
import { SideColumn } from "./side-column";
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

// The pages without the friends feed's column: the game screen and the admin area have their own, and an invite or a
// group's link is one decision, with nothing beside it (human, 2026-10-26: "Hide it there (Recommended)";
// docs/milestones/M14-14b-2c-review-items.md, answer 12).
const NO_FEED: View["kind"][] = ["offbeat", "admin", "invite", "joinGroup"];

// What a page other than "/" shows once the player is signed in with a username.
export type View =
  | { kind: "friends" }
  | { kind: "groups" }
  | { kind: "me" }
  | { kind: "offbeat" }
  | { kind: "howToPlay" }
  | { kind: "streak" }
  | { kind: "admin"; page: AdminPage }
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
  // Again once the game screen's Start begins today's run, which counts in the streak at once
  // (docs/milestones/M14-14b-2a-streak-ranks.md). A failure here is shown beside the page, not instead of it: the
  // run's question is already being timed (14b-2a review).
  const [streakError, setStreakError] = useState<string | null>(null);
  // From 1200px the other player pages show the friends feed in the right column (FriendsFeed).
  const feedColumn = useMinWidth(1200);
  // Counts the times the clock bar saw a question's time run out away from the game screen. The database decides a
  // timeout when the run is next read (src/game/status.ts), so the parts of the page that wait for the run to be over
  // read it again then (docs/milestones/M14-14b-2c-review-items.md, items 6 and 46).
  const [timeUps, setTimeUps] = useState(0);
  const timeUp = useCallback(() => setTimeUps((n) => n + 1), []);
  function reloadStreak() {
    setStreakError(null);
    api<Me>("/api/profile", { method: "GET" }).then(setMe, (err) => setStreakError(errorText(err)));
  }
  // Signed out, or before a username, no theme is picked, and this browser's copy is cleared (the copy itself is
  // re-applied on every page by KeepTheme, src/app/keep-theme.tsx). Signed in, the settings sheet, which the shell
  // always holds, applies the theme it shows: the account's, or the one being saved, so a profile reload or another
  // setting's reply landing mid-save doesn't put the page back (docs/milestones/M14-14b-2c-review-items.md, item 33).
  const accountTheme = me?.signedIn === true && me.username !== null;
  useLayoutEffect(() => {
    if (me && !accountTheme) applyTheme(null);
  }, [me, accountTheme]);

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
            // The updater form: a profile reload landing while a setting saves isn't overwritten by this render's copy
            // (docs/milestones/M14-14b-2c-review-items.md, item 29).
            onSettings={(settings) => setMe((m) => (m?.signedIn && m.username !== null ? { ...m, settings } : m))}
            onSignedOut={() => setMe({ signedIn: false })}
          />
          {/* Away from the game screen, a question left in play keeps its clock in view (M14 L18). */}
          {view?.kind !== "offbeat" && <ClockBar onTimeUp={timeUp} />}
          {streakError && <p role="alert">{streakError}</p>}
          {view && !NO_FEED.includes(view.kind) && feedColumn && <FriendsFeed username={me.username} timeUps={timeUps} />}
          {view?.kind === "offbeat" ? (
            <OffbeatScreen username={me.username} onStarted={reloadStreak} />
          ) : view?.kind === "howToPlay" ? (
            <HowToPlay />
          ) : view?.kind === "streak" ? (
            <StreakRanks days={me.streak} />
          ) : view?.kind === "admin" ? (
            <AdminArea page={view.page} admin={me.admin} />
          ) : view?.kind === "friends" ? (
            <Friends username={me.username} timeUps={timeUps} />
          ) : view?.kind === "groups" ? (
            <Groups />
          ) : view?.kind === "me" ? (
            <>
              {/* Only the stats (L45); the account is in the settings sheet (14a-3b). */}
              <MeStats numbers={me.settings.calendarNumbers} />
              {me.admin && <MeAdminLink />}
            </>
          ) : view?.kind === "invite" ? (
            <AcceptInvite code={view.code} username={me.username} />
          ) : view?.kind === "joinGroup" ? (
            <JoinGroup code={view.code} />
          ) : view?.kind === "group" ? (
            <GroupPage id={view.id} username={me.username} timeUps={timeUps} />
          ) : (
            <Today username={me.username} skip={me.settings.skipGameScreen} timeUps={timeUps} />
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

// Today (docs/milestones/M14-14a-2a-today.md): Offbeat's banner, which links to its game screen (14a-2b), the one
// leaderboard card and the feed;
// from 768px the live board too (L42), and from 1200px the board and the card in the right column (SideColumn). The page listens to
// the board's channel for the feed's nudges (M08 8d, M11 11b); from 768px the board brings its own.
function Today({ username, skip, timeUps }: { username: string; skip: boolean; timeUps: number }) {
  const [runOver, setRunOver] = useState(false);
  const [commentsNudge, setCommentsNudge] = useState(0);
  const nudgeComments = useCallback(() => setCommentsNudge((n) => n + 1), []);
  const channel = useBoardChannel({
    joined: nudgeComments,
    changed: (message) => {
      if (message.v !== PAYLOAD_VERSION) console.error("board message with unknown version", message.v);
      if (changesThread(message, "feed")) nudgeComments();
    },
  });
  // Count resets: at midnight Pacific every section that shows a day starts again, from the server's new day (M11 H6).
  // The run itself is played on the game screen, which keeps a game in play to its end.
  const [day, setDay] = useState(0);
  const nextDay = useCallback(() => setDay((d) => d + 1), []);

  const wide = useMinWidth(768);

  return (
    <div className={styles.today}>
      <section id="offbeat" aria-label="Offbeat" className={styles.game}>
        <TodayBanner key={`game-${day}-${timeUps}`} skip={skip} onOver={setRunOver} onDayOver={nextDay} />
      </section>
      <SideColumn label="Your circle" inPlace className={styles.side}>
        {/* Again on a time-up too: how friends' runs ended shows once the player's is over (src/friends/board.ts). */}
        {wide && <Board key={`board-${day}-${timeUps}`} username={username} invite />}
        <LeaderboardCard key={`card-${day}`} />
      </SideColumn>
      <div className={styles.feed}>
        <LiveStatus channel={channel} />
        <Comments key={`feed-${day}`} username={username} runOver={runOver} nudge={commentsNudge} />
      </div>
    </div>
  );
}

// The friends feed in the right column of every player page but Today and the game screen, which have their own
// (docs/milestones/M14-14b-2b-1-shell.md, criterion 2; human, 2026-10-26: "The friends feed everywhere (Recommended)").
// As on Today: locked until today's run is over (M08 8a), nudged by the board's channel (M08 8d), and started again at
// midnight Pacific (M11 H6), from the run's state.
function FriendsFeed({ username, timeUps }: { username: string; timeUps: number }) {
  const [day, setDay] = useState(0);
  const [run, setRun] = useState<{ over: boolean; msToReset: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Read again on the new day and when the clock bar's time runs out (Home's timeUps), so the feed opens once the run
  // is over, whichever page the player is on.
  useEffect(() => {
    type RunResponse = { run: { status: RunStatus; msToReset: number } } | { run: null; msToReset: number };
    api<RunResponse>("/api/run", { method: "GET" }).then(
      (r) => {
        setRun(r.run ? { over: FINISHED.includes(r.run.status), msToReset: r.run.msToReset } : { over: false, msToReset: r.msToReset });
        setError(null);
      },
      (err) => setError(errorText(err)),
    );
  }, [day, timeUps]);
  useEffect(() => {
    if (!run) return;
    const timer = setTimeout(() => setDay((d) => d + 1), run.msToReset);
    return () => clearTimeout(timer);
  }, [run]);
  const [nudge, setNudge] = useState(0);
  const nudgeFeed = useCallback(() => setNudge((n) => n + 1), []);
  const channel = useBoardChannel({
    joined: nudgeFeed,
    changed: (message) => {
      if (message.v !== PAYLOAD_VERSION) console.error("board message with unknown version", message.v);
      if (changesThread(message, "feed")) nudgeFeed();
    },
  });

  return (
    <SideColumn label="Friends feed">
      <LiveStatus channel={channel} />
      {error && <p role="alert">{error}</p>}
      {run && <Comments key={`feed-${day}`} username={username} runOver={run.over} nudge={nudge} />}
    </SideColumn>
  );
}

// Friends (M14 14a-1): the live board and the friends leaderboard, moved from the home page, then the friends list with
// the invite link (human, 2026-10-25: "friends list should be in the friends tab"; "Below the boards (Recommended)";
// docs/milestones/M14-14a-3b-settings.md), whose link is the board's here, so it shows once. With no game on the page,
// the time to the reset comes from the run's state, and the boards start again at midnight Pacific (M11 H6).
function Friends({ username, timeUps }: { username: string; timeUps: number }) {
  const [day, setDay] = useState(0);
  // Held in an object, so each answer starts the timer again even when it repeats the last (0 right at midnight), and
  // the next reset still fires (14b-2c-1, item 5).
  const [reset, setReset] = useState<{ ms: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ run: { msToReset: number } } | { run: null; msToReset: number }>("/api/run", { method: "GET" }).then(
      (r) => setReset({ ms: r.run ? r.run.msToReset : r.msToReset }),
      (err) => setError(errorText(err)),
    );
  }, [day]);
  useEffect(() => {
    if (reset === null) return;
    const timer = setTimeout(() => setDay((d) => d + 1), reset.ms);
    return () => clearTimeout(timer);
  }, [reset]);

  // The boards start again when the clock bar's time runs out too: how friends' runs ended shows once the player's is
  // over (src/friends/board.ts).
  return (
    <Fragment key={`${day}-${timeUps}`}>
      {error && <p role="alert">{error}</p>}
      <Board username={username} invite={false} />
      <Leaderboard title="Friends leaderboard" path="/api/leaderboard" />
      <FriendsList />
    </Fragment>
  );
}

// What an invite link opens, once signed in with a username (M07 7b). The player's own link says so, with the link to
// share, rather than offering to add themselves (human, 2026-10-26: "Say it's yours (Recommended)";
// docs/milestones/M14-14b-2c-review-items.md, answer 8).
function AcceptInvite({ code, username }: { code: string; username: string }) {
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

  if (inviter?.username === username) {
    return (
      <section aria-label="Invite">
        <h2>This is your invite link</h2>
        <InviteLink canReset={false} />
        <p>
          <ButtonLink href="/">Go to today&apos;s puzzle</ButtonLink>
        </p>
      </section>
    );
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
        <ButtonLink href="/">Go to today&apos;s puzzle</ButtonLink>
      </p>
    </section>
  );
}
