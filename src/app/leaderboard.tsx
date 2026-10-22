"use client";

// The all-time friends leaderboard (docs/milestones/M09-points-and-leaderboard.md, 9b): the player and their friends,
// highest total first. A day's points arrive once that day is over (D9), so loading it once is enough. Plain UI; the
// look is M14.
import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "@/friends/leaderboard";
import { ApiError, api } from "@/lib/api-client";
import { messageFor } from "./messages";

function errorText(err: unknown): string {
  return err instanceof ApiError ? messageFor(err.code) : `Something went wrong: ${String(err)}`;
}

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ leaderboard: LeaderboardEntry[] }>("/api/leaderboard", { method: "GET" }).then(
      (r) => setEntries(r.leaderboard),
      (err) => setError(errorText(err)),
    );
  }, []);

  return (
    <section aria-label="Friends leaderboard">
      <h2>Friends leaderboard</h2>
      <p>All-time points. A day&apos;s points count once that day is over.</p>
      {entries && (
        <ol>
          {entries.map((e) => (
            <li key={e.username}>
              {e.name}
              {e.you && " (you)"}: {e.points === 1 ? "1 point" : `${e.points} points`}
            </li>
          ))}
        </ol>
      )}
      {!entries && !error && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
