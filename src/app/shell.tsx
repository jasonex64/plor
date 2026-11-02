"use client";

// The navigation every signed-in page sits in (docs/milestones/M14-14a-1-shell.md): the four tabs the human chose
// (M14 L17, "Me" from L45), as a bottom tab bar on phones and a sidebar from 768px (L42). It stays during a run, and
// leaving lets the question's timer run (L18). Admins find Admin in the sidebar, and on phones on the Me tab
// (MeAdminLink), which replaces M15 15c (human, 2026-10-24: "14a-1 does it, close 15c"). The gear opens the settings
// sheet (docs/milestones/M14-14a-3b-settings.md; L44): in a top bar on phones, at the foot of the sidebar from 768px.
// The streak's pill shows its rank and opens /streak (docs/milestones/M14-14b-2a-streak-ranks.md): beside the gear on
// phones, under the sidebar's wordmark with the avatar slot from 768px.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { RunState } from "@/game/runs";
import type { Profile, Settings } from "@/lib/profile";
import { api } from "@/lib/api-client";
import { Avatar } from "./avatar";
import { useBodyFlag } from "./body-flag";
import { ButtonLink } from "./button-link";
import { useCountdown } from "./countdown";
import { errorText } from "./messages";
import { useMinWidth } from "./min-width";
import { RankFlower, rankFor } from "./ranks";
import { SettingsSheet } from "./settings";
import { CountUp } from "./count-up";
import { useNew } from "./shown";
import kit from "./kit.module.css";
import styles from "./shell.module.css";
import { GAME } from "@/platform/game";
import { capitalized, timedOutText } from "@/game/words";
import { BACK, FORWARD } from "./slide";
import { markToPlay } from "./to-play";

const icon = (children: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

// The four tab icons in two versions (docs/milestones/M14-14b-10-calm-and-alive.md, answers 28 to 33; drawn on the
// human's "Plor Tab Icons" page): the outline at rest, and a solid one, hovered or current, that does something.
// fill is cut by cut (the negative); extra is drawn on top, uncut. turn: the switch turns it 60° about its middle.
type TabArt = { outline: ReactNode; fill: ReactNode; cut?: ReactNode; extra?: ReactNode; turn?: boolean };

const TABS: { href: string; label: string; art: TabArt }[] = [
  {
    href: "/",
    label: "Today",
    // The calendar's corner peels up (answer 31).
    art: {
      outline: (
        <>
          <rect x="4" y="5" width="16" height="15" rx="3" />
          <path d="M4 10h16M9 3v4M15 3v4" />
          <circle cx="12" cy="15" r="1.6" fill="currentColor" />
        </>
      ),
      fill: (
        <>
          <path d="M6.5 4h11A3.5 3.5 0 0 1 21 7.5v6.7L14.2 21H6.5A3.5 3.5 0 0 1 3 17.5v-10A3.5 3.5 0 0 1 6.5 4z" />
          <rect x="8" y="2" width="2" height="5" rx="1" />
          <rect x="14" y="2" width="2" height="5" rx="1" />
        </>
      ),
      cut: (
        <>
          <rect x="5" y="9.6" width="14" height="1.6" />
          <circle cx="10" cy="15.2" r="1.9" />
        </>
      ),
      extra: <path d="M15.9 21.2v-3.7a1.4 1.4 0 0 1 1.4-1.4H21z" />,
    },
  },
  {
    href: "/friends",
    label: "Friends",
    // Happy closed eyes, ^ ^, and an open grin (answer 32).
    art: {
      outline: (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="9" cy="10.5" r="0.9" fill="currentColor" />
          <circle cx="15" cy="10.5" r="0.9" fill="currentColor" />
          <path d="M8.5 14.5c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2" />
        </>
      ),
      fill: <circle cx="12" cy="12" r="9.5" />,
      cut: (
        <>
          <path d="M7.4 10.8q1.6-2 3.2 0M13.4 10.8q1.6-2 3.2 0" fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7.8 13.4h8.4a4.2 4.2 0 0 1-8.4 0z" />
        </>
      ),
    },
  },
  {
    href: "/groups",
    label: "Groups",
    // The three turn point-down as they fill (answer 32).
    art: {
      turn: true,
      outline: (
        <>
          <circle cx="12" cy="7" r="3.2" />
          <circle cx="6.5" cy="16" r="3.2" />
          <circle cx="17.5" cy="16" r="3.2" />
        </>
      ),
      fill: (
        <>
          <circle cx="12" cy="19" r="3.9" />
          <circle cx="6.5" cy="10" r="3.9" />
          <circle cx="17.5" cy="10" r="3.9" />
        </>
      ),
    },
  },
  {
    href: "/me",
    label: "Me",
    // A sparkle beside the head (answer 33).
    art: {
      outline: (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 20.5c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
        </>
      ),
      fill: (
        <>
          <circle cx="10.5" cy="9.4" r="4.6" />
          <path d="M2.3 21.5c0-4.6 3.6-7.6 8.2-7.6s8.2 3 8.2 7.6z" />
        </>
      ),
      extra: <path d="M19.8 1.2 20.7 3.3 22.8 4.2 20.7 5.1 19.8 7.2 18.9 5.1 16.8 4.2 18.9 3.3z" />,
    },
  },
];

// Both versions, stacked; shell.module.css shows one (the hover and the current tab show the solid one).
function TabIcon({ art }: { art: TabArt }) {
  const mask = useId();
  const turn = (body: ReactNode) => (art.turn ? <g className={styles.turn}>{body}</g> : body);
  return (
    <span className={styles.icon}>
      <svg className={styles.outline} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {turn(art.outline)}
      </svg>
      <svg className={styles.solid} width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <mask id={mask}>
          <rect width="24" height="24" fill="#fff" />
          <g fill="#000">{art.cut}</g>
        </mask>
        {turn(
          <>
            <g fill="currentColor" mask={`url(#${mask})`}>
              {art.fill}
            </g>
            <g fill="currentColor">{art.extra}</g>
          </>,
        )}
      </svg>
    </span>
  );
}

// A tab is the current page on its own path, and the current section on a page under it (a group's page is under
// Groups).
function current(path: string, href: string, sidebar: boolean): "page" | "true" | undefined {
  if (path === href) return "page";
  // Offbeat's game screen and its How to play are opened from Today (docs/milestones/M14-14a-2b-game-screen.md).
  if (href === "/" && (path === GAME.path || path.startsWith(`${GAME.path}/`))) return "true";
  // On phones Admin is reached from the Me tab (MeAdminLink), so the admin pages sit under it; the sidebar has its own
  // Admin (round 10).
  if (href === "/me" && !sidebar && (path === "/admin" || path.startsWith("/admin/"))) return "true";
  if (href !== "/" && path.startsWith(`${href}/`)) return "true";
}

// The page's name in its "Plor" heading (docs/milestones/M14-14b-18-headings-today-invites-words.md, answers 5 and 17
// to 19): the tab it's under, as the tab bar marks it from 768px, so the game screen and How to play are Today's;
// /streak is Me's and the admin pages Admin's; an invite and the 404 have none. Shown with the shell from 768px and read
// on phones, where the heading is hidden for the top bar's wordmark (globals.css, .page-name).
export function pageName(path: string, lost: boolean): string | null {
  if (lost) return null;
  if (path === "/streak") return "Me";
  if (path === "/admin" || path.startsWith("/admin/")) return "Admin";
  return TABS.find((tab) => current(path, tab.href, true))?.label ?? null;
}

// The comma is read, not shown (globals.css gives it no size): "Plor, Friends".
export function PageName({ lost }: { lost: boolean }) {
  const name = pageName(usePathname(), lost);
  return (
    name && (
      <span className="page-name">
        , <span>{name}</span>
      </span>
    )
  );
}

// Round 7's gear, 22px at stroke 2.
const GEAR = icon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </>,
);

// Rendered into <body>, beside the page's <main>, so the navigation isn't inside the main landmark (M14 14a-1
// review). The frame (Frame, src/app/home.tsx), which renders it, runs only on the client (it reads the address bar
// behind Suspense). On phones the top bar's wordmark stands for the page's own "Plor" heading, which is then read but
// not shown twice.
export function Shell({ lost, admin, profile, streak, onChanged, onSettings, onSignedOut }: {
  // On the 404 page no tab is current (docs/milestones/M14-14b-16-not-found.md).
  lost: boolean;
  admin: boolean;
  profile: Profile;
  streak: number;
  onChanged: () => void;
  onSettings: (settings: Settings) => void;
  onSignedOut: () => void;
}) {
  const path = usePathname();
  const sidebar = useMinWidth(768);
  useBodyFlag("shell", true);
  const nav = useRef<HTMLElement>(null);
  useSlideTaps(nav);
  const dialog = useRef<HTMLDialogElement>(null);
  const open = () => dialog.current?.showModal();
  return createPortal(
    <>
      {/* Anchored while a detail page slides (globals.css; M14 14b-6e), as are the tab bar and the clock bar: named
          inline, as the guide does, since a CSS Module would rename them and the global rules wouldn't match. */}
      <header className={styles.top} style={{ viewTransitionName: "plor-top" }}>
        <span className={styles.topWord} aria-hidden="true">
          Plor
        </span>
        <div className={styles.me}>
          <StreakPill days={streak} />
          <button type="button" className={styles.gear} aria-label="Settings" aria-haspopup="dialog" onClick={open}>
            {GEAR}
          </button>
        </div>
      </header>
      <nav ref={nav} aria-label="Main" className={styles.nav} style={{ viewTransitionName: "plor-nav" }}>
        <span className={styles.word} aria-hidden="true">
          Plor
        </span>
        <div className={styles.who}>
          <Avatar name={profile.username} />
          <StreakPill days={streak} />
        </div>
        <ul className={styles.tabs}>
          {TABS.map((tab) => {
            const here = lost ? undefined : current(path, tab.href, sidebar);
            return (
              <li key={tab.href}>
                <Link href={tab.href} aria-current={here} className={here ? `${styles.tab} ${styles.on}` : styles.tab}>
                  <TabIcon art={tab.art} />
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
        {admin && (
          <Link href="/admin" className={styles.admin} aria-current={!lost && (path === "/admin" || path.startsWith("/admin/")) ? "true" : undefined}>
            Admin
          </Link>
        )}
        <button type="button" className={styles.settings} aria-haspopup="dialog" onClick={open}>
          <span className={styles.icon}>{GEAR}</span>
          Settings
        </button>
      </nav>
      <SettingsSheet dialog={dialog} profile={profile} onChanged={onChanged} onSettings={onSettings} onSignedOut={onSignedOut} />
    </>,
    document.body,
  );
}

// A tap on the navigation while a page slides: the navigation is named for the slide, so it stays put, and a named part
// isn't hit-tested until the slide ends (Next.js, view-transitions guide, "Keeping the page interactive"); the tap falls
// through the overlay (globals.css, ::view-transition) to the page under it. Caught here before that page sees it,
// it opens the link that was under the finger (docs/milestones/M14-14b-19-controls-layout-and-state.md, answer 5). :active-view-transition matches
// the root while a view transition runs (MDN).
function useSlideTaps(nav: RefObject<HTMLElement | null>) {
  const router = useRouter();
  useEffect(() => {
    function tap(event: MouseEvent) {
      if (!document.documentElement.matches(":active-view-transition")) return;
      // A press: a keyboard's click has no count (detail 0) and no point; a modified one opens elsewhere; one in a dialog
      // or popover is that dialog's, whatever lies under it.
      if (event.detail === 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if ((event.target as Element).closest("dialog[open], :popover-open")) return;
      // Only a link that's shown: a hidden one (the sidebar's pill on a phone) has an empty box at 0, 0.
      const link = [...nav.current!.querySelectorAll("a")].find((a) => {
        const at = a.getBoundingClientRect();
        return at.width > 0 && event.clientX >= at.left && event.clientX <= at.right && event.clientY >= at.top && event.clientY <= at.bottom;
      });
      if (!link) return;
      event.preventDefault();
      event.stopPropagation();
      router.push(link.getAttribute("href")!);
    }
    document.addEventListener("click", tap, true);
    return () => document.removeEventListener("click", tap, true);
  }, [nav, router]);
}

// The streak and its rank on the soft pill (round 7's .streak), read as "4 day streak, Daisy": the flower is decoration.
// The number counts up when it has changed, and a new rank's flower pops in (14b-10b, answers 12 and 27).
function StreakPill({ days }: { days: number }) {
  const rank = rankFor(days);
  const newRank = useNew("streak.rank", rank.name);
  return (
    <Link href="/streak" transitionTypes={FORWARD} className={styles.streak}>
      <span className={newRank ? kit.pop : undefined}>
        <RankFlower rank={rank} size={22} />
      </span>
      <CountUp name="streak.days" value={days} />
      <span className="sr-only"> day streak, {rank.name}</span>
    </Link>
  );
}

// Admin on the Me tab, for phones, which have no sidebar.
export function MeAdminLink() {
  return (
    <p className={styles.meAdmin}>
      <ButtonLink href="/admin">Admin</ButtonLink>
    </p>
  );
}

// A question left in play, seen from another page (M14 L18, docs/milestones/M14-14a-2a-today.md): its seconds left,
// counted down from the run state the page read, and Back to the game screen (14a-2b); at zero, that time is up, with
// a link to the result. The database stays the judge of the timer; this is only a display. Nothing shows without a
// question in play. up: How to play, under the game screen, whose Back slides back up to it (docs/milestones/
// M14-14b-18-headings-today-invites-words.md, answer 8).
export function ClockBar({ up, onTimeUp }: { up: boolean; onTimeUp: () => void }) {
  const [run, setRun] = useState<RunState | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ run: RunState | null }>("/api/run", { method: "GET" }).then(
      (r) => setRun(r.run),
      (err) => setError(errorText(err)),
    );
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!run || run.status !== "in_progress" || !run.question || run.msLeft === null) return null;
  return createPortal(<Clock index={run.question.index} msLeft={run.msLeft} up={up} onTimeUp={onTimeUp} />, document.body);
}

// At zero the page's parts that wait for the run to be over read it again (the frame's timeUps).
function Clock({ index, msLeft, up, onTimeUp }: { index: number; msLeft: number; up: boolean; onTimeUp: () => void }) {
  useBodyFlag("clock", true);
  const seconds = Math.ceil(useCountdown(msLeft, onTimeUp) / 1000);
  // A timer isn't read out as it changes; the end is, once, as a status (WCAG 2.2 4.1.2).
  return (
    <section aria-label="Stop in play" className={styles.clock} style={{ viewTransitionName: "plor-clock" }}>
      {seconds > 0 ? (
        <>
          <span role="timer">
            Stop {index + 1} · {seconds}s left
          </span>
          <ButtonLink href={GAME.path} transitionTypes={up ? BACK : FORWARD} onClick={markToPlay}>
            Back
          </ButtonLink>
        </>
      ) : (
        <>
          <span role="status">{capitalized(timedOutText(index + 1))}</span>
          <ButtonLink href={`${GAME.path}#result`} transitionTypes={FORWARD}>
            Result
          </ButtonLink>
        </>
      )}
    </section>
  );
}
