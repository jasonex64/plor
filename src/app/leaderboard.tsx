"use client";

// A weekly leaderboard (docs/milestones/M10-groups.md, 10a and 10c; M09 9b): the player and their friends, or a
// group's members, highest total first, this week and last week below it (W1). A day's points arrive once that day is
// over (M09 D9), so loading it once is enough. Plain UI; the look is M14.
import { useEffect, useState } from "react";
import type { Leaderboard as Board, Day, LeaderboardEntry, Week } from "@/friends/leaderboard";
import { api } from "@/lib/api-client";
import { latestOnly } from "@/lib/latest";
import styles from "./leaderboard.module.css";
import { errorText } from "./messages";

// "Mon, Oct 19". The date is a calendar date; read in UTC so the label can't shift by a day (as src/game/share.ts).
function monday(from: string): string {
  return new Date(`${from}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

// title names the board (its heading and region); path is the API route that returns it.
export function Leaderboard({ title, path }: { title: string; path: string }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Board>(path, { method: "GET" }).then(setBoard, (err) => setError(errorText(err)));
  }, [path]);

  return (
    <section aria-label={title}>
      <h2>{title}</h2>
      <p>Weeks run Monday to Sunday. A day&apos;s points count once that day is over, so Sunday&apos;s arrive on Monday.</p>
      {board && (
        <>
          <Standings title={`This week, from ${monday(board.thisWeek.from)}`} label="This week" week={board.thisWeek} />
          <Standings title={`Last week, from ${monday(board.lastWeek.from)}`} label="Last week" week={board.lastWeek} />
        </>
      )}
      {!board && !error && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

// Today's one leaderboard card (docs/milestones/M14-14a-2a-today.md; L41): Yesterday or This week, for friends or one
// of the player's groups, from the routes the boards already use. Yesterday is closed, so its points are final (M09
// D9); this week's count days once they're over. Each choice loads once.
export function LeaderboardCard() {
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  // null: the friends board.
  const [group, setGroup] = useState<string | null>(null);
  const [period, setPeriod] = useState<"yesterday" | "week">("yesterday");
  const [day, setDay] = useState<Day | null>(null);
  const [week, setWeek] = useState<Week | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Choices can change faster than the answers come back: only the newest choice's answer is shown (M11 H6).
  const [latest] = useState(latestOnly);

  useEffect(() => {
    api<{ groups: { id: string; name: string }[] }>("/api/groups", { method: "GET" }).then(
      (r) => setGroups(r.groups),
      (err) => setError(errorText(err)),
    );
  }, []);
  useEffect(() => {
    const failed = (err: unknown) => setError(errorText(err));
    if (period === "yesterday") {
      const path = group === null ? "/api/leaderboard/yesterday" : `/api/leaderboard/yesterday?group=${encodeURIComponent(group)}`;
      latest(api<{ day: Day }>(path, { method: "GET" }), (r) => (setDay(r.day), setWeek(null), setError(null)), failed);
    } else {
      const path = group === null ? "/api/leaderboard" : `/api/groups/leaderboard?id=${encodeURIComponent(group)}`;
      latest(api<Board>(path, { method: "GET" }), (r) => (setWeek(r.thisWeek), setDay(null), setError(null)), failed);
    }
  }, [group, period, latest]);

  const label = period === "yesterday" ? "Yesterday" : "This week";
  return (
    <section aria-label="Leaderboard" className={styles.card}>
      <h2 className={styles.title}>Leaderboard</h2>
      <div role="radiogroup" aria-label="Period" className={styles.switch}>
        {(["yesterday", "week"] as const).map((p) => (
          <label key={p} className={period === p ? `${styles.choice} ${styles.on}` : styles.choice}>
            <input type="radio" name="leaderboard-period" checked={period === p} onChange={() => setPeriod(p)} />
            {p === "yesterday" ? "Yesterday" : "This week"}
          </label>
        ))}
      </div>
      <label className={styles.board}>
        Board
        <select value={group ?? ""} onChange={(e) => setGroup(e.target.value === "" ? null : e.target.value)}>
          <option value="">Friends</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      <section aria-label={label}>
        <p className={styles.date}>
          {day && `${dayLabel(day.date)} · Offbeat`}
          {week && `From ${monday(week.from)} · Offbeat`}
        </p>
        {day && <Entries entries={day.entries} />}
        {week && <Entries entries={week.entries} />}
        {!day && !week && !error && <p>Loading…</p>}
      </section>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

// "Fri 23 Oct" (L25: Yesterday is dated). A calendar date, read in UTC so it can't shift by a day.
function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function Standings({ title, label, week }: { title: string; label: string; week: Week }) {
  return (
    <section aria-label={label}>
      <h3>{title}</h3>
      <Entries entries={week.entries} />
    </section>
  );
}

function Entries({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <ol>
      {entries.map((e) => (
        <li key={e.username}>
          {e.name}
          {e.you && " (you)"}: {e.points === 1 ? "1 point" : `${e.points} points`}
        </li>
      ))}
    </ol>
  );
}
