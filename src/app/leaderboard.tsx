"use client";

// A weekly leaderboard (docs/milestones/M10-groups.md, 10a and 10c; M09 9b): the player and their friends, or a
// group's members, highest total first, this week and last week below it (W1). A day's points arrive once that day is
// over (M09 D9), so loading it once is enough. Mockup 3's "Friends leaderboard" card (M14 14b-8c): each week's
// heading with its first day as a chip, then its badged rows. Since 14b-14 (docs/milestones/M14-14b-14-leaderboard-graph.md)
// a List / Graph switch shows each week as a race instead, with Find a player over both. Since M16 16e-2 a Game switch
// picks game 1's board or game 2's, and since 16e-3b the overall one, list only, by Sum or Average
// (docs/milestones/M16-16e-points-and-boards.md, answers 23, 29 and 33).
import { useEffect, useId, useState } from "react";
import type { Leaderboard as Board, Day, LeaderboardEntry, OverallBoard, OverallWeek, Week } from "@/friends/leaderboard";
import { ranked } from "@/friends/rank";
import { api } from "@/lib/api-client";
import { latestOnly } from "@/lib/latest";
import { GAME, OVERALL, SUBSTRINGS } from "@/platform/game";
import { Avatar } from "./avatar";
import kit from "./kit.module.css";
import styles from "./leaderboard.module.css";
import { dayText } from "./day-text";
import { FindPlayer } from "./find-player";
import { errorText } from "./messages";
import { Race, RaceTable, hiddenText } from "./race";
import raceStyles from "./race.module.css";
import { Line, Skeleton } from "./skeleton";

// The games a board switches between (M16 16e-2, answer 23), game 1 first, as on every load, then the overall board
// (16e-3b, answer 29).
const GAMES = [GAME, SUBSTRINGS, OVERALL] as const;

// title names the board (its heading and region); path is the API route that returns it, which the game is added to.
export function Leaderboard({ title, path }: { title: string; path: string }) {
  const [board, setBoard] = useState<Board | OverallBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<(typeof GAMES)[number]["id"]>(GAME.id);
  // List on every load (answer 3); the player found, by username, the same in both weeks (answer 18).
  const [graph, setGraph] = useState(false);
  // The overall board's Sum on every load, or its Average (answer 29).
  const [average, setAverage] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const name = useId();
  const gameName = useId();
  const countName = useId();
  // Switching games faster than the answers come back shows only the newest game's (M11 H6).
  const [latest] = useState(latestOnly);
  const places = game === SUBSTRINGS.id;
  const overall = game === OVERALL.id;

  useEffect(() => {
    const url = `${path}${path.includes("?") ? "&" : "?"}game=${game}`;
    latest(api<Board | OverallBoard>(url, { method: "GET" }), (b) => (setBoard(b), setError(null)), (err) => setError(errorText(err)));
  }, [path, game, latest]);

  const others = board ? board.thisWeek.entries.filter((e) => !e.you).map((e) => ({ key: e.username, name: e.name })) : [];
  return (
    <section aria-label={title} className={kit.card}>
      <h2>{title}</h2>
      <div role="radiogroup" aria-label="Game" className={styles.switch}>
        {GAMES.map((g) => (
          <label key={g.id} className={game === g.id ? `${styles.choice} ${styles.on}` : styles.choice}>
            <input
              type="radio"
              name={gameName}
              checked={game === g.id}
              onChange={() => {
                setBoard(null);
                setGame(g.id);
              }}
            />
            {g.name}
          </label>
        ))}
      </div>
      {/* The overall board is a list (answer 33): Sum or Average in the place of List or Graph. */}
      {overall ? (
        <div role="radiogroup" aria-label="Count" className={styles.switch}>
          {([false, true] as const).map((a) => (
            <label key={String(a)} className={average === a ? `${styles.choice} ${styles.on}` : styles.choice}>
              <input type="radio" name={countName} checked={average === a} onChange={() => setAverage(a)} />
              {a ? "Average" : "Sum"}
            </label>
          ))}
        </div>
      ) : (
        // Today's period switch, once more (answer 3).
        <div role="radiogroup" aria-label="View" className={styles.switch}>
          {([false, true] as const).map((g) => (
            <label key={String(g)} className={graph === g ? `${styles.choice} ${styles.on}` : styles.choice}>
              <input type="radio" name={name} checked={graph === g} onChange={() => setGraph(g)} />
              {g ? "Graph" : "List"}
            </label>
          ))}
        </div>
      )}
      {graph && !overall && board && <FindPlayer players={others.sort((a, b) => a.name.localeCompare(b.name))} picked={picked} onPick={setPicked} />}
      <p className={styles.note}>Weeks run Monday to Sunday. A day&apos;s points count once that day is over, so Sunday&apos;s arrive on Monday.</p>
      {/* A game 2 week adds up places, not points (answer 24); the overall board's notes are Claude's words, approved with
          the design (16e-3 in detail). */}
      {places && <p className={styles.note}>Each day adds the % of players you beat.</p>}
      {overall && <p className={styles.note}>{average ? "Your average % of players beaten, per game played." : "Each day adds the % of players you beat, in each game."}</p>}
      {board && overall && (
        <>
          <OverallStandings label="This week" week={(board as OverallBoard).thisWeek} average={average} />
          <OverallStandings label="Last week" week={(board as OverallBoard).lastWeek} average={average} />
        </>
      )}
      {board && !overall && (
        <>
          <Standings label="This week" week={(board as Board).thisWeek} graph={graph} picked={picked} onPick={setPicked} places={places} />
          <Standings label="Last week" week={(board as Board).lastWeek} graph={graph} picked={picked} onPick={setPicked} places={places} />
        </>
      )}
      {!board && !error && (
        <Skeleton label="Loading scores">
          <Line />
        </Skeleton>
      )}
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
  // Kept apart from the board's error, which each new choice clears, so a failed list of groups stays on show.
  const [groupsError, setGroupsError] = useState<string | null>(null);
  // Choices can change faster than the answers come back: only the newest choice's answer is shown (M11 H6).
  const [latest] = useState(latestOnly);
  // A new choice clears the last one's rows and error, so they aren't shown under the new label while it loads, or
  // for good if it fails (docs/milestones/M14-14b-2c-review-items.md, item 13).
  function choose(next: { period?: "yesterday" | "week"; group?: string | null }) {
    if (next.period !== undefined) setPeriod(next.period);
    if (next.group !== undefined) setGroup(next.group);
    setDay(null);
    setWeek(null);
    setError(null);
  }

  useEffect(() => {
    api<{ groups: { id: string; name: string }[] }>("/api/groups", { method: "GET" }).then(
      (r) => setGroups(r.groups),
      (err) => setGroupsError(errorText(err)),
    );
  }, []);
  useEffect(() => {
    const failed = (err: unknown) => setError(errorText(err));
    if (period === "yesterday") {
      const path = group === null ? "/api/leaderboard/yesterday" : `/api/leaderboard/yesterday?group=${encodeURIComponent(group)}`;
      latest(api<{ day: Day }>(path, { method: "GET" }), (r) => (setDay(r.day), setWeek(null), setError(null)), failed);
    } else {
      // Today's card is game 1's until both games come to Today (M16 16f).
      const path = group === null ? `/api/leaderboard?game=${GAME.id}` : `/api/groups/leaderboard?id=${encodeURIComponent(group)}&game=${GAME.id}`;
      latest(api<Board>(path, { method: "GET" }), (r) => (setWeek(r.thisWeek), setDay(null), setError(null)), failed);
    }
  }, [group, period, latest]);

  const label = period === "yesterday" ? "Yesterday" : "This week";
  return (
    <section aria-label="Leaderboard" className={kit.card}>
      {/* Mockup 3's card: the heading with the day it shows as a chip (M14 14b-8b). */}
      <div className={kit.head}>
        <h2>Leaderboard</h2>
        {(day || week) && <span className={kit.chip}>{day ? dayText(day.date) : `From ${dayText(week!.from)}`}</span>}
      </div>
      <div role="radiogroup" aria-label="Period" className={styles.switch}>
        {(["yesterday", "week"] as const).map((p) => (
          <label key={p} className={period === p ? `${styles.choice} ${styles.on}` : styles.choice}>
            <input type="radio" name="leaderboard-period" checked={period === p} onChange={() => choose({ period: p })} />
            {p === "yesterday" ? "Yesterday" : "This week"}
          </label>
        ))}
      </div>
      <label className={styles.board}>
        {/* Named for screen readers; mockup 3 shows the picker alone. */}
        <span className="sr-only">Board</span>
        <select value={group ?? ""} onChange={(e) => choose({ group: e.target.value === "" ? null : e.target.value })}>
          <option value="">Friends</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      <section aria-label={label}>
        {day && <Entries entries={day.entries} />}
        {week && <Entries entries={week.entries} />}
        {!day && !week && !error && (
          <Skeleton label="Loading scores">
            <Line />
          </Skeleton>
        )}
      </section>
      {groupsError && <p role="alert">{groupsError}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

// A week as its rows or, in Graph, its race (answers 5 and 15), with Show table beside its chip (answers 17 and 25).
function Standings(props: { label: string; week: Week; graph: boolean; picked: string | null; onPick: (key: string | null) => void; places: boolean }) {
  const { label, week, graph, picked, onPick, places } = props;
  const [table, setTable] = useState(false);
  const drawn = graph && week.days > 0;
  return (
    <section aria-label={label} className={styles.week}>
      <div className={kit.head}>
        <h3>{label}</h3>
        <div className={raceStyles.tools}>
          <span className={kit.chip}>From {dayText(week.from)}</span>
          {drawn && (
            <button type="button" className={kit.link} aria-expanded={table} onClick={() => setTable(!table)}>
              {table ? "Hide table" : "Show table"}
            </button>
          )}
        </div>
      </div>
      {!graph && <Entries entries={week.entries} places={places} />}
      {graph && !drawn && <p className={raceStyles.empty}>The first points arrive Tuesday, once Monday is over.</p>}
      {drawn && <Race label={label} week={week} picked={picked} onPick={onPick} />}
      {drawn && week.hidden.length > 0 && <p className={styles.note}>{hiddenText(week.hidden)}</p>}
      {drawn && table && <RaceTable label={label} week={week} picked={picked} />}
    </section>
  );
}

// An overall week (answer 29): its rows by Sum, as the server ranks them, or by Average, ranked again here, each a
// plain number like game 2's (answer 24).
function OverallStandings({ label, week, average }: { label: string; week: OverallWeek; average: boolean }) {
  const entries = average ? ranked(week.entries.map((e) => ({ ...e, points: e.average })), (e) => e.points) : week.entries;
  return (
    <section aria-label={label} className={styles.week}>
      <div className={kit.head}>
        <h3>{label}</h3>
        <span className={kit.chip}>From {dayText(week.from)}</span>
      </div>
      <Entries entries={entries} places />
    </section>
  );
}

// Mockup 3's rows: the place as a badge (the first in the accent), the avatar, the name, the points. The list's own order
// is the place for screen readers, so the badge's number is drawn by CSS (kit.module.css's [data-place]) and isn't in
// the row's text; a hidden ": " keeps the row read as "name: 3 points". A game 2 week's number is its places added up,
// the plain total the note explains (answer 24).
function Entries({ entries, places = false }: { entries: LeaderboardEntry[]; places?: boolean }) {
  return (
    <ol className={kit.rows}>
      {entries.map((e, i) => (
        <li key={e.username} className={e.you ? `${kit.row} ${kit.you} ${styles.entry}` : `${kit.row} ${styles.entry}`}>
          <span className={i === 0 ? `${kit.badge} ${kit.hot}` : kit.badge} data-place={i + 1} aria-hidden="true" />
          <Avatar name={e.name} />
          <span className={`${kit.grow} ${styles.name}`}>
            {e.name}
            {e.you && " (you)"}
            <span className="sr-only">: </span>
          </span>
          <b>{places ? e.points : e.points === 1 ? "1 point" : `${e.points} points`}</b>
        </li>
      ))}
    </ol>
  );
}
