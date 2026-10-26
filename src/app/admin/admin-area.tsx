"use client";

// The admin area in Plor's shell (docs/milestones/M14-14b-2b-2-admin-build.md, 14b-2b-2a; round 10): the page's name
// under a small Admin; the sub-tabs in two groups split by a line, the first with what waits in each (human,
// 2026-10-26: "Drop the labels, keep the divider (Recommended)"); on phones one menu and a row of what's waiting; from
// 1200px what needs the admin in the right column ("What needs you, always (Recommended)"). The counts come from the
// admin APIs the pages already use, and again whenever a page changes something.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { DayView } from "@/admin/puzzles";
import type { ReportedComment } from "@/admin/reports";
import { api } from "@/lib/api-client";
import { ButtonLink } from "../button-link";
import { errorText } from "../messages";
import { useMinWidth } from "../min-width";
import { SideColumn } from "../side-column";
import { Audit } from "./audit/audit";
import { AnswerBase } from "./base/base";
import { Bank } from "./bank/bank";
import { dayText } from "./day-text";
import { Insights } from "./insights";
import { Puzzles } from "./puzzles/puzzles";
import { Reports } from "./reports/reports";
import styles from "./admin.module.css";

export type AdminPage = "puzzles" | "audit" | "reports" | "insights" | "bank" | "base";

// What waits for the admin: drafted days not yet approved (and the first), texts to review, reported comments (and
// when the first was reported), and the approved days after today (and the last).
type Counts = { toApprove: string[]; ahead: string[]; review: number; reports: ReportedComment[] };

const TO_DO: { page: AdminPage; name: string; count: (c: Counts) => number }[] = [
  { page: "puzzles", name: "Puzzles", count: (c) => c.toApprove.length },
  { page: "audit", name: "Audit", count: (c) => c.review },
  { page: "reports", name: "Reports", count: (c) => c.reports.length },
];
const LOOK_UP: { page: AdminPage; name: string }[] = [
  { page: "insights", name: "Insights" },
  { page: "bank", name: "Bank" },
  { page: "base", name: "Database" },
];
const NAMES = Object.fromEntries([...TO_DO, ...LOOK_UP].map((p) => [p.page, p.name])) as Record<AdminPage, string>;

function useCounts(): { counts: Counts | null; error: string | null; refresh: () => void } {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    Promise.all([
      api<{ today: string; days: DayView[] }>("/api/admin/puzzles", { method: "GET" }),
      api<{ open: number }>("/api/admin/audit?count", { method: "GET" }),
      api<{ reports: ReportedComment[] }>("/api/admin/reports", { method: "GET" }),
    ]).then(
      ([puzzles, audit, reports]) => {
        const dates = (keep: (d: DayView) => boolean) => puzzles.days.filter(keep).map((d) => d.date).sort();
        setCounts({
          toApprove: dates((d) => d.draft !== null && d.live === null),
          ahead: dates((d) => d.live !== null && d.date > puzzles.today),
          review: audit.open,
          reports: reports.reports,
        });
        setError(null);
      },
      (err) => setError(errorText(err)),
    );
  }, []);
  useEffect(refresh, [refresh]);
  return { counts, error, refresh };
}

export function AdminArea({ page, admin }: { page: AdminPage; admin: boolean }) {
  // A player who isn't an admin gets the page itself, which shows the API's refusal.
  if (!admin) return <Page page={page} onChanged={() => {}} />;
  return <Area page={page} />;
}

function Area({ page }: { page: AdminPage }) {
  const { counts, error, refresh } = useCounts();
  const wide = useMinWidth(768);
  const column = useMinWidth(1200);
  return (
    <div className={styles.area}>
      <div className={styles.head}>
        <span className={styles.eyebrow}>Admin</span>
        <h2 className={styles.title}>{NAMES[page]}</h2>
      </div>
      {wide ? <SubTabs page={page} counts={counts} /> : <PhoneMenu page={page} counts={counts} />}
      {error && <p role="alert">{error}</p>}
      <Page page={page} onChanged={refresh} />
      {column && counts && (
        <SideColumn label="What needs you">
          <NeedsYou counts={counts} />
        </SideColumn>
      )}
    </div>
  );
}

function Page({ page, onChanged }: { page: AdminPage; onChanged: () => void }) {
  switch (page) {
    case "puzzles":
      return <Puzzles onChanged={onChanged} />;
    case "audit":
      return <Audit onChanged={onChanged} />;
    case "reports":
      return <Reports onChanged={onChanged} />;
    case "insights":
      return <Insights />;
    case "bank":
      return <Bank />;
    case "base":
      return <AnswerBase />;
  }
}

function Count({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <>
      <span className={styles.badge}>{n}</span>
      <span className={styles.sr}> waiting</span>
    </>
  );
}

function SubTabs({ page, counts }: { page: AdminPage; counts: Counts | null }) {
  const tab = (p: AdminPage, name: string, count?: number): ReactNode => (
    <Link key={p} href={`/admin/${p}`} className={p === page ? `${styles.tab} ${styles.on}` : styles.tab} aria-current={p === page ? "page" : undefined}>
      {name}
      {count !== undefined && <Count n={count} />}
    </Link>
  );
  return (
    <nav aria-label="Admin" className={styles.tabs}>
      <div role="group" aria-label="To do" className={styles.group}>
        {TO_DO.map((t) => tab(t.page, t.name, counts ? t.count(counts) : undefined))}
      </div>
      <span className={styles.divider} aria-hidden="true" />
      <div role="group" aria-label="Look up" className={styles.group}>
        {LOOK_UP.map((t) => tab(t.page, t.name))}
      </div>
    </nav>
  );
}

// On phones: one menu in the sub-tabs' order, the groups split by a line, then what's waiting as buttons. Escape or a
// press outside it closes the open menu, Escape returning the focus to its button (item 41).
function PhoneMenu({ page, counts }: { page: AdminPage; counts: Counts | null }) {
  const [open, setOpen] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onPress = (event: PointerEvent) => {
      if (!nav.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPress);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPress);
    };
  }, [open]);
  const current = TO_DO.find((t) => t.page === page);
  const waiting = counts
    ? [
        { href: "/admin/puzzles", n: counts.toApprove.length, one: "day", many: "days" },
        { href: "/admin/audit", n: counts.review, one: "answer", many: "answers" },
        { href: "/admin/reports", n: counts.reports.length, one: "report", many: "reports" },
      ].filter((w) => w.n > 0)
    : [];
  const item = (p: AdminPage, name: string, count?: number) => (
    <li key={p}>
      <Link href={`/admin/${p}`} className={styles.menuItem} aria-current={p === page ? "page" : undefined}>
        {name}
        {count !== undefined && <Count n={count} />}
      </Link>
    </li>
  );
  return (
    <nav ref={nav} aria-label="Admin" className={styles.phone}>
      <button type="button" ref={button} className={styles.menuButton} aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>
          {NAMES[page]}
          {current && counts && <Count n={current.count(counts)} />}
        </span>
        <span aria-hidden="true">▾</span>
        <span className={styles.sr}> (admin pages)</span>
      </button>
      {open && (
        <div className={styles.menu}>
          <ul aria-label="To do">{TO_DO.map((t) => item(t.page, t.name, counts ? t.count(counts) : undefined))}</ul>
          <ul aria-label="Look up" className={styles.menuLookUp}>
            {LOOK_UP.map((t) => item(t.page, t.name))}
          </ul>
        </div>
      )}
      {waiting.length > 0 && (
        <p className={styles.waiting}>
          <span className={styles.muted}>Waiting:</span>
          {waiting.map((w) => (
            <ButtonLink key={w.href} href={w.href}>
              {w.n} {w.n === 1 ? w.one : w.many}
            </ButtonLink>
          ))}
        </p>
      )}
    </nav>
  );
}

function NeedsYou({ counts }: { counts: Counts }) {
  const first = counts.reports[0];
  const rows = [
    {
      href: "/admin/puzzles",
      n: counts.toApprove.length,
      what: counts.toApprove.length === 1 ? "day to approve" : "days to approve",
      more: counts.toApprove.length ? `Next: ${dayText(counts.toApprove[0])}` : "None drafted",
    },
    {
      href: "/admin/audit",
      n: counts.review,
      what: counts.review === 1 ? "answer to review" : "answers to review",
      more: "Held, rejected or near a typo",
    },
    {
      href: "/admin/reports",
      n: counts.reports.length,
      what: counts.reports.length === 1 ? "reported comment" : "reported comments",
      more: first ? `First reported ${new Date(first.firstReportedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "None",
    },
    {
      href: "/admin/puzzles",
      n: counts.ahead.length,
      what: counts.ahead.length === 1 ? "day approved ahead" : "days approved ahead",
      more: counts.ahead.length ? `Through ${dayText(counts.ahead[counts.ahead.length - 1])}` : "None yet",
    },
  ];
  return (
    <>
      <h2 className={styles.needsTitle}>What needs you</h2>
      <ul className={styles.needs}>
        {rows.map((r, i) => (
          <li key={i}>
            <Link href={r.href} className={styles.need}>
              <b className={styles.needNumber}>{r.n}</b>
              <span className={styles.needWhat}>{r.what}</span>
              <span className={styles.muted}>{r.more}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
