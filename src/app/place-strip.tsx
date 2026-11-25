"use client";

import { useEffect, useState } from "react";
import type { TodayBoard } from "@/friends/leaderboard";
import { api } from "@/lib/api-client";
import { GAME, SUBSTRINGS } from "@/platform/game";
import { ButtonLink } from "./button-link";
import kit from "./kit.module.css";
import { errorText } from "./messages";
import { ordinal } from "./ordinal";
import styles from "./place-strip.module.css";
import { FORWARD } from "./slide";

// Where the player stands among friends today, on Today under the cards (docs/milestones/M20-design-rules-and-clean-up.md,
// 20n-6b; the human's answers 77 and 91 to 93): one line a game the player has finished, "Fragments: 1st of 4", counted
// from today's board for that game, which opens only once the player's own run of it is over. Each line opens the
// Friends tab's leaderboard on that game. Nothing shows until a friend has finished the same game (answer 93).
type Line = { id: string; name: string; place: number; of: number };

export function PlaceStrip() {
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    Promise.all([GAME, SUBSTRINGS].map(async (game) => ({ game, board: (await api<{ board: TodayBoard }>(`/api/leaderboard/today?game=${game.id}`, { method: "GET" })).board }))).then(
      (boards) => {
        if (!current) return;
        setLines(
          boards.flatMap(({ game, board }) => {
            const place = board.entries.findIndex((e) => e.you) + 1;
            return board.open && place > 0 && board.entries.length > 1 ? [{ id: game.id, name: game.name, place, of: board.entries.length }] : [];
          }),
        );
      },
      (err) => current && setError(errorText(err)),
    );
    return () => {
      current = false;
    };
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (lines.length === 0) return null;
  return (
    <section aria-label="Your place today" className={`${kit.chips} ${styles.strip}`}>
      <span className={styles.label}>Among friends today</span>
      {lines.map((line) => (
        <ButtonLink key={line.id} href={`/friends?board=${line.id}`} transitionTypes={FORWARD}>
          {line.name}: {ordinal(line.place)} of {line.of}
        </ButtonLink>
      ))}
    </section>
  );
}
