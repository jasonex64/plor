"use client";

// The navigation every signed-in page sits in (docs/milestones/M14-14a-1-shell.md): the four tabs the human chose
// (M14 L17, "Me" from L45), as a bottom tab bar on phones and a sidebar from 768px (L42). It stays during a run, and
// leaving lets the question's timer run (L18). Admins find Admin in the sidebar, and on phones on the Me tab
// (MeAdminLink), which replaces M15 15c (human, 2026-10-24: "14a-1 does it, close 15c").
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
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
  if (href !== "/" && path.startsWith(`${href}/`)) return "true";
}

export function Shell({ admin }: { admin: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className={styles.nav}>
      <span className={styles.word} aria-hidden="true">
        Plor
      </span>
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
    </nav>
  );
}

// Admin on the Me tab, for phones, which have no sidebar.
export function MeAdminLink() {
  return (
    <p className={styles.meAdmin}>
      <Link href="/admin">Admin</Link>
    </p>
  );
}
