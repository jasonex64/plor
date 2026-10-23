"use client";

// The weekly friends leaderboard (docs/milestones/M10-groups.md, 10a; M09 9b): the player and their friends, highest
// total first, this week and last week below it (W1). A day's points arrive once that day is over (M09 D9), so
// loading it once is enough. Plain UI; the look is M14.
import { useEffect, useState } from "react";
import type { Leaderboard as Board, Week } from "@/friends/leaderboard";
import { ApiError, api } from "@/lib/api-client";
import { messageFor } from "./messages";

function errorText(err: unknown): string {
  return err instanceof ApiError ? messageFor(err.code) : `Something went wrong: ${String(err)}`;
}

// "Mon, Oct 19". The date is a calendar date; read in UTC so the label can't shift by a day (as src/game/share.ts).
function monday(from: string): string {
  return new Date(`${from}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export function Leaderboard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Board>("/api/leaderboard", { method: "GET" }).then(setBoard, (err) => setError(errorText(err)));
  }, []);

  return (
    <section aria-label="Friends leaderboard">
      <h2>Friends leaderboard</h2>
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

function Standings({ title, label, week }: { title: string; label: string; week: Week }) {
  return (
    <section aria-label={label}>
      <h3>{title}</h3>
      <ol>
        {week.entries.map((e) => (
          <li key={e.username}>
            {e.name}
            {e.you && " (you)"}: {e.points === 1 ? "1 point" : `${e.points} points`}
          </li>
        ))}
      </ol>
    </section>
  );
}
