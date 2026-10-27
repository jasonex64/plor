"use client";

// The Me tab's stats (docs/milestones/M14-14a-3a-me.md; L45): the player's header, totals across games, this month's
// calendar of days played, a card per game and the rarest answers, laid out from round 7's Me boards. The account is
// in the settings sheet (docs/milestones/M14-14a-3b-settings.md).
import { ButtonLink } from "./button-link";
import { useEffect, useState } from "react";
import { QUESTIONS_PER_DAY } from "@/config/tunables";
import type { Me } from "@/game/me";
import { api } from "@/lib/api-client";
import { Avatar } from "./avatar";
import { givenText } from "./given";
import { errorText } from "./messages";
import styles from "./me.module.css";
import { GAME } from "@/platform/game";

// Calendar dates, read in UTC so they can't shift by a day: "2 Oct 2026", "12 Oct", "October 2026".
const dateText = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { ...options, timeZone: "UTC" });

// numbers: the player's Numbers on the calendar setting (L46).
export function MeStats({ numbers }: { numbers: boolean }) {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ me: Me }>("/api/me", { method: "GET" }).then((r) => setMe(r.me), (err) => setError(errorText(err)));
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!me) return <p>Loading…</p>;
  return (
    <div className={styles.me}>
      <div className={styles.header}>
        <Avatar name={me.username} large />
        <div className={styles.who}>
          <h2 className={styles.name}>{me.username}</h2>
          <span className={styles.muted}>Playing since {dateText(me.since, { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
      </div>
      <section aria-label="All games" className={styles.section}>
        <h2 className={styles.heading}>All games</h2>
        <dl className={styles.totals}>
          <Total value={me.totals.points.toLocaleString("en-US")} label="points all time" />
          <Total value={String(me.totals.daysPlayed)} label="days played" />
          <Total value={String(me.totals.streak)} label="day streak now" />
          <Total value={String(me.totals.longestStreak)} label="longest streak" />
        </dl>
      </section>
      <Calendar month={me.month} numbers={numbers} />
      <section aria-label={GAME.name} className={styles.card}>
        <div className={styles.game}>
          {/* Offbeat's plain block until 14c's pixel world draws its chip. */}
          <span className={styles.chip} aria-hidden="true" />
          <h2 className={styles.heading}>{GAME.name}</h2>
        </div>
        <dl className={styles.stats}>
          <Total value={me.offbeat.best === null ? "–" : me.offbeat.best.toLocaleString("en-US")} label="best score" />
          <Total value={me.offbeat.average === null ? "–" : `${me.offbeat.average.toFixed(1)}/${QUESTIONS_PER_DAY}`} label="avg. stops climbed" />
          <Total value={String(me.offbeat.fullClimbs)} label="full climbs" />
        </dl>
        <ButtonLink href={GAME.path}>{GAME.name}&apos;s game screen</ButtonLink>
      </section>
      <section aria-label="Your rarest answers" className={styles.card}>
        <h2 className={styles.heading}>Your rarest answers</h2>
        {me.rarest.length === 0 ? (
          <p className={styles.muted}>None yet. Answers show here once their day is over and enough players have answered.</p>
        ) : (
          <ol className={styles.rarest}>
            {me.rarest.map((r) => (
              <li key={`${r.date} ${r.prompt}`}>
                {/* The space keeps the name and its line apart for screen readers ("cat Name an animal", not "catName";
                    docs/milestones/M14-14b-2c-review-items.md, item 20); each is its own line on screen. */}
                <strong>{r.answer.name}</strong>{" "}
                <span className={styles.muted}>
                  {r.prompt} · {givenText(r.share)} · {dateText(r.date, { day: "numeric", month: "short" })}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Total({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

// Round 7's shading: four steps of questions survived, 0-1, 2-3, 4-5 and 6-7 (M14 L46).
function shade(survived: number): number {
  return Math.min(3, Math.floor(survived / 2));
}

// This month, Sunday first: a played day (a finished run) shaded by questions survived, with its number when the
// setting is on (L46), an earlier day without one outlined, today outlined thick, and the days after it dashed. Every
// shade reaches 3:1 on the card (WCAG 2.2 1.4.11; globals.css), and one text alternative names each played day and
// how far it went, so the shade isn't the only way to tell (1.1.1, 1.4.1; human, 2026-10-25: "Meet 3:1").
function Calendar({ month, numbers }: { month: Me["month"]; numbers: boolean }) {
  const first = month.days[0].date;
  const sofar = month.days.filter((d) => d.date <= month.today);
  const days = sofar.filter((d) => d.survived !== null);
  const played = days.length;
  const name = dateText(first, { month: "long" });
  const named = days.map((d) => `${dateText(d.date, { day: "numeric", month: "long" })}, ${d.survived} of ${QUESTIONS_PER_DAY} stops climbed`);
  const blanks = new Date(`${first}T00:00:00Z`).getUTCDay();
  return (
    <section aria-label="Calendar" className={styles.card}>
      <div className={styles.titled}>
        <h2 className={styles.heading}>{dateText(first, { month: "long", year: "numeric" })}</h2>
        <span className={styles.muted}>
          {played} of {sofar.length} days
        </span>
      </div>
      <div
        role="img"
        aria-label={`Days played in ${name}: ${played} of the ${sofar.length} days so far${played > 0 ? `: ${named.join("; ")}` : ""}`}
        className={styles.calendar}
      >
        {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
          <span key={i} className={styles.weekday}>
            {w}
          </span>
        ))}
        {Array.from({ length: blanks }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {month.days.map((d) => (
          <span
            key={d.date}
            data-date={d.date}
            className={[
              styles.day,
              d.survived !== null ? styles[`shade${shade(d.survived) + 1}`] : d.date > month.today ? styles.later : styles.missed,
              d.date === month.today ? styles.today : "",
            ].join(" ")}
          >
            {numbers && d.survived}
          </span>
        ))}
      </div>
      <div className={styles.legend} aria-hidden="true">
        <span>Fewer</span>
        {[1, 2, 3, 4].map((k) => (
          <i key={k} className={styles[`shade${k}`]} />
        ))}
        <span>More climbed</span>
      </div>
    </section>
  );
}
