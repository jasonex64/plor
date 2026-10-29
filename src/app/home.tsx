"use client";

// The frame every player page shares (src/app/(shell)/layout.tsx): the profile, loaded once, and the shell around the
// page (docs/milestones/M14-14a-1-shell.md), kept across navigations so a tab switch swaps only the page's own section
// (docs/milestones/M14-14b-6-feel-and-polish.md, design 1; Next.js, "Preserving UI state"). Each page wraps its section
// in Signed: sign-in, then picking a username, then the section: Today (Offbeat's banner and the feed), Friends, Groups
// or Me; Offbeat's game screen and How to play (docs/milestones/M14-14a-2b-game-screen.md); the streak's ranks (/streak,
// docs/milestones/M14-14b-2a-streak-ranks.md); the admin area (/admin/…, docs/milestones/M14-14b-2b-2-admin-build.md);
// or, on an invite link (/i/<code>), the friend request; on a group's link (/g/<code>), joining it; on a group's page
// (/groups/<id>), the group. Every step goes through the API; errors are shown to the player and never retried
// silently (DECISIONS.md: Error handling).
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Fragment,
  Suspense,
  createContext,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { Friend } from "@/friends/friends";
import { INVITE_CODE } from "@/friends/invite-code";
import { api } from "@/lib/api-client";
import { FINISHED, type RunStatus } from "@/game/status";
import type { Profile } from "@/lib/profile";
import { AdminArea, type AdminPage } from "./admin/admin-area";
import { Board, FriendsInviteCard } from "./board";
import { ButtonLink } from "./button-link";
import { PAYLOAD_VERSION, changesThread, useBoardChannel } from "./board-channel";
import { Comments } from "./comments";
import { FriendsList } from "./friends-list";
import { TodayBanner } from "./game";
import { GroupPage } from "./groups";
import { InviteLink } from "./invite-link";
import { Leaderboard, LeaderboardCard } from "./leaderboard";
import { MeStats } from "./me";
import { useMinWidth } from "./min-width";
import { errorText, messageForRedirect } from "./messages";
import { LiveStatus } from "./live-status";
import { OffbeatScreen } from "./offbeat";
import { SideColumn } from "./side-column";
import { PageSkeleton } from "./skeleton";
import { StreakRanks } from "./streak";
import { applyTheme } from "./theme";
import { ClockBar, MeAdminLink, Shell } from "./shell";
import styles from "./today.module.css";
import { UndoProvider } from "./undo";
import { BACK } from "./slide";
import { GAME } from "@/platform/game";

// GET /api/profile: signed out; signed in without a username yet; or signed in with the profile, which the settings
// sheet shows and Today and Me follow (docs/milestones/M14-14a-3b-settings.md), with the streak, which the shell shows as
// its rank (docs/milestones/M14-14b-2a-streak-ranks.md).
type Me =
  | { signedIn: false }
  | { signedIn: true; username: null; admin: boolean }
  | ({ signedIn: true; admin: boolean; streak: number } & Profile);

// A player signed in with a username, as the pages inside Signed see them.
type Player = Extract<Me, { streak: number }>;

// The player's name as their comments show it: the display name, or the username without one (src/comments/comments.ts).
function nameOf(player: Player): string {
  return player.displayName ?? player.username;
}

// The pages without the friends feed's column: Today, the game screen and the admin area have their own, and an invite
// or a group's link is one decision, with nothing beside it (human, 2026-10-26: "Hide it there (Recommended)";
// docs/milestones/M14-14b-2c-review-items.md, answer 12).
function feedBeside(path: string): boolean {
  return path !== "/" && path !== GAME.path && !path.startsWith("/admin") && !INVITE_PATH.test(path);
}

// Google sign-in leaves the page and comes back to "/" (src/app/auth/callback/route.ts), so an invite link opened
// while signed out, a friend's or a group's, is remembered for that round trip in this tab's sessionStorage, as its
// path (M07 7b; M10 10b).
const PENDING_INVITE = "plor.pendingInvite";
const INVITE_PATH = /^\/[ig]\/(.+)$/;

// What the frame shares with the page inside it: the profile, null until it loads (or when loading it failed, loadError).
type FrameState = { me: Me | null; loadError: string | null; loadMe: () => void; timeUps: number; reloadStreak: () => void };
const FrameContext = createContext<FrameState | null>(null);

function useFrame(): FrameState {
  const frame = use(FrameContext);
  if (!frame) throw new Error("a player page rendered outside the frame (src/app/(shell)/layout.tsx)");
  return frame;
}

// For the sections inside Signed, which renders them only for a player with a username.
function usePlayer(): { player: Player; timeUps: number; reloadStreak: () => void } {
  const { me, timeUps, reloadStreak } = useFrame();
  if (!me?.signedIn || me.username === null) throw new Error("a player section rendered outside Signed");
  return { player: me, timeUps, reloadStreak };
}

// The frame reads no address-bar hooks itself, so the page inside it is in the served HTML (Google's brand check, M02
// 2c) and Next.js can check its navigation is instant: a component that reads the address renders on the client up to
// its nearest Suspense boundary, and on a route with an unknown code or ID even usePathname waits for the request
// (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md, Prerendering; use-pathname.md,
// Cache Components). The parts that read it are FrameParts, behind their own boundary, and RedirectError, shown only
// on the client; what depends on the session waits inside Signed.
export function Frame({ children }: { children: ReactNode }) {
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

  const player = me?.signedIn && me.username !== null ? me : null;
  return (
    <FrameContext value={{ me, loadError, loadMe, timeUps, reloadStreak }}>
      {/* Around the feed's column too, which holds comments (14b-6b). */}
      <UndoProvider>
        <Suspense fallback={null}>
          <FrameParts
            signedIn={me?.signedIn === true}
            player={player}
            timeUp={timeUp}
            timeUps={timeUps}
            streakError={streakError}
            shell={
              player && (
                <Shell
                  admin={player.admin}
                  profile={player}
                  streak={player.streak}
                  onChanged={loadMe}
                  // The updater form: a profile reload landing while a setting saves isn't overwritten by this render's
                  // copy (docs/milestones/M14-14b-2c-review-items.md, item 29).
                  onSettings={(settings) => setMe((m) => (m?.signedIn && m.username !== null ? { ...m, settings } : m))}
                  onSignedOut={() => setMe({ signedIn: false })}
                />
              )
            }
          />
        </Suspense>
        {children}
      </UndoProvider>
    </FrameContext>
  );
}

// The frame's parts that read the address: the shell (its current tab), the clock bar away from the game screen, the
// friends feed's column, and the invite remembered across a Google sign-in.
function FrameParts({ signedIn, player, timeUp, timeUps, streakError, shell }: {
  signedIn: boolean;
  player: Player | null;
  timeUp: () => void;
  timeUps: number;
  streakError: string | null;
  shell: ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  // From 1200px the other player pages show the friends feed in the right column (FriendsFeed).
  const feedColumn = useMinWidth(1200);
  // Back from Google with an invite pending: go back to its page. On an invite page the remembered one is spent, so
  // a code kept for a Google round trip that was cancelled doesn't send the player back here from the next visit to
  // "/". Storage that can't be read holds nothing, because the write before leaving for Google would have failed and
  // been shown to the player.
  const onInvite = INVITE_PATH.test(path);
  useEffect(() => {
    if (!signedIn) return;
    let pending: string | null;
    try {
      pending = window.sessionStorage.getItem(PENDING_INVITE);
      window.sessionStorage.removeItem(PENDING_INVITE);
    } catch {
      return;
    }
    const code = pending && !onInvite ? INVITE_PATH.exec(pending)?.[1] : undefined;
    if (pending && code && INVITE_CODE.test(code)) router.replace(pending);
  }, [onInvite, signedIn, router]);

  if (!player) return null;
  return (
    <>
      {shell}
      {/* Away from the game screen, a question left in play keeps its clock in view (M14 L18). */}
      {path !== GAME.path && <ClockBar onTimeUp={timeUp} />}
      {streakError && <p role="alert">{streakError}</p>}
      {feedBeside(path) && feedColumn && <FriendsFeed username={player.username} name={nameOf(player)} timeUps={timeUps} />}
    </>
  );
}

// Around each page's own section: sign-in, then picking a username, then the section. The profile is read on the
// client, so the served HTML holds the skeleton here.
export function Signed({ children }: { children: ReactNode }) {
  const { me, loadError, loadMe } = useFrame();
  if (loadError) return <p role="alert">{loadError}</p>;
  // Only until the profile first loads (a page opened from its address); afterwards the frame keeps it.
  if (!me) return <PageSkeleton />;
  if (!me.signedIn)
    return (
      <>
        <RedirectError />
        <SignIn onSignedIn={loadMe} />
      </>
    );
  if (me.username === null) return <PickUsername onDone={loadMe} />;
  return children;
}

// A sign-in that came back with an error (src/app/auth/callback/route.ts), above the sign-in it failed.
function RedirectError() {
  const redirectError = useSearchParams().get("error");
  return redirectError && <p role="alert">{messageForRedirect(redirectError)}</p>;
}

// Each page's section, with what it needs from the player.
export function TodayTab() {
  const { player, timeUps } = usePlayer();
  return <Today username={player.username} name={nameOf(player)} skip={player.settings.skipGameScreen} timeUps={timeUps} />;
}

export function FriendsTab() {
  const { player, timeUps } = usePlayer();
  return <Friends username={player.username} timeUps={timeUps} />;
}

export function MeTab() {
  const { player } = usePlayer();
  return (
    <>
      {/* Only the stats (L45); the account is in the settings sheet (14a-3b). */}
      <MeStats numbers={player.settings.calendarNumbers} />
      {player.admin && <MeAdminLink />}
    </>
  );
}

export function GameTab() {
  const { player, reloadStreak } = usePlayer();
  return <OffbeatScreen username={player.username} name={nameOf(player)} onStarted={reloadStreak} />;
}

// The detail pages' way back up, which slides back (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6e, answer 25),
// as the game screen's "← Today" does.
function BackTo({ href, children }: { href: string; children: ReactNode }) {
  return (
    <p>
      <ButtonLink href={href} transitionTypes={BACK}>
        <span aria-hidden="true">← </span>
        {children}
      </ButtonLink>
    </p>
  );
}

export function StreakTab() {
  const { player } = usePlayer();
  return (
    <>
      <BackTo href="/me">Me</BackTo>
      <StreakRanks days={player.streak} />
    </>
  );
}

export function AdminTab({ page }: { page: AdminPage }) {
  const { player } = usePlayer();
  return <AdminArea page={page} admin={player.admin} />;
}

export function GroupTab({ id }: { id: string }) {
  const { player, timeUps } = usePlayer();
  return (
    <>
      <BackTo href="/groups">Groups</BackTo>
      <GroupPage id={id} username={player.username} name={nameOf(player)} timeUps={timeUps} />
    </>
  );
}

export function InviteTab({ code }: { code: string }) {
  const { player } = usePlayer();
  return <AcceptInvite code={code} username={player.username} />;
}

function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  // An invite page's own path, remembered across a Google sign-in (PENDING_INVITE).
  const path = usePathname();
  const returnTo = INVITE_PATH.test(path) ? path : undefined;
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
function Today({ username, name, skip, timeUps }: { username: string; name: string; skip: boolean; timeUps: number }) {
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
      <section id="offbeat" aria-label={GAME.name} className={styles.game}>
        <TodayBanner key={`game-${day}-${timeUps}`} skip={skip} onOver={setRunOver} onDayOver={nextDay} />
      </section>
      <SideColumn label="Your circle" inPlace className={styles.side}>
        {/* Again on a time-up too: how friends' runs ended shows once the player's is over (src/friends/board.ts). */}
        {wide && <Board key={`board-${day}-${timeUps}`} username={username} invite />}
        <LeaderboardCard key={`card-${day}`} />
      </SideColumn>
      <div className={styles.feed}>
        <LiveStatus channel={channel} />
        <Comments key={`feed-${day}`} username={username} name={name} runOver={runOver} nudge={commentsNudge} />
      </div>
      {/* Phones end with the invite card when the player has no friends, as mockup 3 draws Today (answer 13). */}
      {!wide && <FriendsInviteCard />}
    </div>
  );
}

// The friends feed in the right column of every player page but Today and the game screen, which have their own
// (docs/milestones/M14-14b-2b-1-shell.md, criterion 2; human, 2026-10-26: "The friends feed everywhere (Recommended)").
// As on Today: locked until today's run is over (M08 8a), nudged by the board's channel (M08 8d), and started again at
// midnight Pacific (M11 H6), from the run's state.
function FriendsFeed({ username, name, timeUps }: { username: string; name: string; timeUps: number }) {
  const [day, setDay] = useState(0);
  const [run, setRun] = useState<{ over: boolean; msToReset: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Read again on the new day and when the clock bar's time runs out (the frame's timeUps), so the feed opens once the run
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
      {run && <Comments key={`feed-${day}`} username={username} name={name} runOver={run.over} nudge={nudge} />}
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
