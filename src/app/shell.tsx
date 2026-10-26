"use client";

// The navigation every signed-in page sits in (docs/milestones/M14-14a-1-shell.md): the four tabs the human chose
// (M14 L17, "Me" from L45), as a bottom tab bar on phones and a sidebar from 768px (L42). It stays during a run, and
// leaving lets the question's timer run (L18). Admins find Admin in the sidebar, and on phones on the Me tab
// (MeAdminLink), which replaces M15 15c (human, 2026-10-24: "14a-1 does it, close 15c"). The gear opens the settings
// sheet (docs/milestones/M14-14a-3b-settings.md; L44): in a top bar on phones, at the foot of the sidebar from 768px.
// The streak's pill shows its rank and opens /streak (docs/milestones/M14-14b-2a-streak-ranks.md): beside the gear on
// phones, under the sidebar's wordmark with the avatar slot from 768px.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { RunState } from "@/game/runs";
import type { Profile, Settings } from "@/lib/profile";
import { api } from "@/lib/api-client";
import { Avatar } from "./avatar";
import { ButtonLink } from "./button-link";
import { useCountdown } from "./countdown";
import { errorText } from "./messages";
import { RankFlower, rankFor } from "./ranks";
import { SettingsSheet } from "./settings";
import styles from "./shell.module.css";

const icon = (children: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const TABS = [
  {
    href: "/",
    label: "Today",
    icon: icon(
      <>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M4 10h16M9 3v4M15 3v4" />
        <circle cx="12" cy="15" r="1.6" fill="currentColor" />
      </>,
    ),
  },
  {
    href: "/friends",
    label: "Friends",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="9" cy="10.5" r="0.9" fill="currentColor" />
        <circle cx="15" cy="10.5" r="0.9" fill="currentColor" />
        <path d="M8.5 14.5c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2" />
      </>,
    ),
  },
  {
    href: "/groups",
    label: "Groups",
    icon: icon(
      <>
        <circle cx="12" cy="7" r="3.2" />
        <circle cx="6.5" cy="16" r="3.2" />
        <circle cx="17.5" cy="16" r="3.2" />
      </>,
    ),
  },
  {
    href: "/me",
    label: "Me",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="10" r="3" />
        <path d="M6.8 18c1.2-2 3-3 5.2-3s4 1 5.2 3" />
      </>,
    ),
  },
];

// A tab is the current page on its own path, and the current section on a page under it (a group's page is under
// Groups).
function current(path: string, href: string): "page" | "true" | undefined {
  if (path === href) return "page";
  // Offbeat's game screen and its How to play are opened from Today (docs/milestones/M14-14a-2b-game-screen.md).
  if (href === "/" && (path === "/offbeat" || path.startsWith("/offbeat/"))) return "true";
  if (href !== "/" && path.startsWith(`${href}/`)) return "true";
}

// Round 7's gear, 22px at stroke 2.
const GEAR = icon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </>,
);

// Rendered into <body>, beside the page's <main>, so the navigation isn't inside the main landmark (M14 14a-1
// review). Home, which renders it, runs only on the client (it reads the address bar behind Suspense). On phones the
// top bar's wordmark stands for the page's own "Plor" heading, which is then read but not shown twice.
export function Shell({ admin, profile, streak, onChanged, onSettings, onSignedOut }: {
  admin: boolean;
  profile: Profile;
  streak: number;
  onChanged: () => void;
  onSettings: (settings: Settings) => void;
  onSignedOut: () => void;
}) {
  const path = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const open = () => dialog.current?.showModal();
  return createPortal(
    <>
      <header className={styles.top}>
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
      <nav aria-label="Main" className={styles.nav}>
        <span className={styles.word} aria-hidden="true">
          Plor
        </span>
        <div className={styles.who}>
          <Avatar name={profile.username} />
          <StreakPill days={streak} />
        </div>
        <ul className={styles.tabs}>
          {TABS.map((tab) => {
            const here = current(path, tab.href);
            return (
              <li key={tab.href}>
                <Link href={tab.href} aria-current={here} className={here ? `${styles.tab} ${styles.on}` : styles.tab}>
                  <span className={styles.icon}>{tab.icon}</span>
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
        {admin && (
          <Link href="/admin" className={styles.admin}>
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

// The streak and its rank on the soft pill (round 7's .streak), read as "4 day streak, Daisy": the flower is decoration.
function StreakPill({ days }: { days: number }) {
  const rank = rankFor(days);
  return (
    <Link href="/streak" className={styles.streak}>
      <RankFlower rank={rank} size={22} />
      {days}
      <span className={styles.hidden}> day streak, {rank.name}</span>
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
// question in play.
export function ClockBar() {
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
  return createPortal(<Clock index={run.question.index} msLeft={run.msLeft} />, document.body);
}

const NOTHING = () => {};

function Clock({ index, msLeft }: { index: number; msLeft: number }) {
  const seconds = Math.ceil(useCountdown(msLeft, NOTHING) / 1000);
  // A timer isn't read out as it changes; the end is, once, as a status (WCAG 2.2 4.1.2).
  return (
    <section aria-label="Question in play" className={styles.clock}>
      {seconds > 0 ? (
        <>
          <span role="timer">
            Question {index + 1} · {seconds}s left
          </span>
          <ButtonLink href="/offbeat">Back</ButtonLink>
        </>
      ) : (
        <>
          <span role="status">Time&apos;s up on question {index + 1}</span>
          <ButtonLink href="/offbeat#result">Result</ButtonLink>
        </>
      )}
    </section>
  );
}
