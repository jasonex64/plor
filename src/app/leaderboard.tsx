"use client";

// A weekly leaderboard (docs/milestones/M10-groups.md, 10a and 10c; M09 9b): the player and their friends, or a
// group's members, highest total first, this week and last week below it (W1). A day's points arrive once that day is
// over (M09 D9), so loading it once is enough. Plain UI; the look is M14.
import { useEffect, useState } from "react";
import type { Leaderboard as Board, Day, LeaderboardEntry, Week } from "@/friends/leaderboard";
import { api } from "@/lib/api-client";
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

// Yesterday's standings (docs/milestones/M11-home-screen.md, H7): friends by default, with a chip for each of the
// player's groups. Yesterday is closed, so its points are final (M09 D9) and load once per choice.
export function Yesterday() {
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  // null: the friends board.
  const [group, setGroup] = useState<string | null>(null);
  const [day, setDay] = useState<Day | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ groups: { id: string; name: string }[] }>("/api/groups", { method: "GET" }).then(
      (r) => setGroups(r.groups),
      (err) => setError(errorText(err)),
    );
  }, []);
  useEffect(() => {
    const path = group === null ? "/api/leaderboard/yesterday" : `/api/leaderboard/yesterday?group=${encodeURIComponent(group)}`;
    api<{ day: Day }>(path, { method: "GET" }).then(
      (r) => setDay(r.day),
      (err) => setError(errorText(err)),
    );
  }, [group]);

  return (
    <section aria-label="Yesterday">
      <h2>Yesterday</h2>
      <p>
        {[{ id: null, name: "Friends" }, ...groups].map((g) => (
          <button key={g.id ?? "friends"} type="button" aria-pressed={group === g.id} onClick={() => setGroup(g.id)}>
            {g.name}
          </button>
        ))}
      </p>
      {day && <Entries entries={day.entries} />}
      {!day && !error && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
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
