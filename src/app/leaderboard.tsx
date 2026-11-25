"use client";

// A weekly leaderboard (docs/milestones/M10-groups.md, 10a and 10c; M09 9b): the player and their friends, or a
// group's members, highest total first, this week and last week below it (W1). A day's points arrive once that day is
// over (M09 D9), so loading it once is enough. Mockup 3's "Friends leaderboard" card (M14 14b-8c): each week's
// heading with its first day as a chip, then its badged rows. Since 14b-14 (docs/milestones/M14-14b-14-leaderboard-graph.md)
// a List / Graph switch shows each week as a race instead, with Find a player over both. Since M16 16e-2 a Game switch
// picks game 1's board or game 2's, and since 16e-3b the overall one, list only, by Sum or Average
// (docs/milestones/M16-16e-points-and-boards.md, answers 23, 29 and 33).
import { useEffect, useId, useState, type CSSProperties } from "react";
import type { Leaderboard as Board, Day, LeaderboardEntry, OverallBoard, OverallEntry, OverallWeek, TodayBoard, Week } from "@/friends/leaderboard";
import { ranked } from "@/friends/rank";
import { api } from "@/lib/api-client";
import { latestOnly } from "@/lib/latest";
import { GAME, OVERALL, SUBSTRINGS } from "@/platform/game";
import { PlaceBadge } from "./place-badge";
import { PlayerAvatar, PlayerName } from "./player-link";
import kit from "./kit.module.css";
import { gameColour } from "./game-colour";
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

// The Game switch, for a leaderboard, Today's card and the live board (M16 16e-2, answer 23; 16f-6, answers 20, 56 and 57):
// one choice a game, each by its name.
export function GameSwitch<T extends string>({ choices, value, onChange }: { choices: readonly { id: T; name: string }[]; value: T; onChange: (id: T) => void }) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label="Game" className={styles.switch} style={{ "--choices": choices.length } as CSSProperties}>
      {choices.map((g) => (
        <label key={g.id} className={value === g.id ? `${styles.choice} ${styles.on}` : styles.choice}>
          <input type="radio" name={name} checked={value === g.id} onChange={() => onChange(g.id)} />
          {g.name}
        </label>
      ))}
    </div>
  );
}

// title names the board (its heading and region); path is the API route that returns it, which the game is added to;
// todayPath is today's (docs/milestones/M22-todays-board.md, answer 9). One period shows at a time, chosen by the Period
// switch, Today on every load (inbox #248; docs/milestones/M20-design-rules-and-clean-up.md, answer 27).
// opensOn: the game the board opens on when it names one of the board's (Today's place strip's link), else Offbeat.
export function Leaderboard({ title, path, todayPath, opensOn = null }: { title: string; path: string; todayPath: string; opensOn?: string | null }) {
  const [board, setBoard] = useState<Board | OverallBoard | null>(null);
  const [today, setToday] = useState<TodayBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Today's own, so the week's answer arriving after a failed Today doesn't clear it (M22 review).
  const [todayError, setTodayError] = useState<string | null>(null);
  const [game, setGame] = useState<(typeof GAMES)[number]["id"]>(() => GAMES.find((g) => g.id === opensOn)?.id ?? GAME.id);
  // List on every load (answer 3); the player found, by username, the same in both weeks (answer 18).
  const [graph, setGraph] = useState(false);
  // The overall board's Sum on every load, or its Average (answer 29).
  const [average, setAverage] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [period, setPeriod] = useState<keyof typeof BOARD_PERIODS>("today");
  const name = useId();
  const countName = useId();
  const periodName = useId();
  // Switching games faster than the answers come back shows only the newest game's (M11 H6).
  const [latest] = useState(latestOnly);
  const [latestToday] = useState(latestOnly);
  const overall = game === OVERALL.id;

  useEffect(() => {
    const url = `${path}${path.includes("?") ? "&" : "?"}game=${game}`;
    latest(api<Board | OverallBoard>(url, { method: "GET" }), (b) => (setBoard(b), setError(null)), (err) => setError(errorText(err)));
  }, [path, game, latest]);
  useEffect(() => {
    const url = `${todayPath}${todayPath.includes("?") ? "&" : "?"}game=${game}`;
    latestToday(api<{ board: TodayBoard }>(url, { method: "GET" }), (r) => (setToday(r.board), setTodayError(null)), (err) => setTodayError(errorText(err)));
  }, [todayPath, game, latestToday]);

  const others = board ? board.thisWeek.entries.filter((e) => !e.you).map((e) => ({ key: e.username, name: e.name })) : [];
  return (
    <section aria-label={title} className={`${kit.card} ${gameColour(game) ?? ""}`}>
      <h2>{title}</h2>
      <GameSwitch
        choices={GAMES}
        value={game}
        onChange={(id) => {
          setBoard(null);
          setToday(null);
          setGame(id);
        }}
      />
      <div role="radiogroup" aria-label="Period" className={styles.switch} style={{ "--choices": 3 } as CSSProperties}>
        {(["today", "this", "last"] as const).map((p) => (
          <label key={p} className={period === p ? `${styles.choice} ${styles.on}` : styles.choice}>
            <input type="radio" name={periodName} checked={period === p} onChange={() => setPeriod(p)} />
            {BOARD_PERIODS[p]}
          </label>
        ))}
      </div>
      {/* The overall board is a list (answer 33): Sum or Average in the place of List or Graph. List or Graph is a week's
          (the graph is the week's race), so Today has neither. */}
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
        period !== "today" && (
          // Today's period switch, once more (answer 3).
          <div role="radiogroup" aria-label="View" className={styles.switch}>
            {([false, true] as const).map((g) => (
              <label key={String(g)} className={graph === g ? `${styles.choice} ${styles.on}` : styles.choice}>
                <input type="radio" name={name} checked={graph === g} onChange={() => setGraph(g)} />
                {g ? "Graph" : "List"}
              </label>
            ))}
          </div>
        )
      )}
      {graph && !overall && period !== "today" && board && <FindPlayer players={others.sort((a, b) => a.name.localeCompare(b.name))} picked={picked} onPick={setPicked} />}
      {period !== "today" && <p className={styles.note}>Weeks run Monday to Sunday. A day&apos;s points count once that day is over, so Sunday&apos;s arrive on Monday.</p>}
      {/* The overall board adds up par scores, not points; these notes are Claude's words, approved with the ticket
          (docs/milestones/M15-15i-par-scores.md). */}
      {overall && <p className={styles.note}>{average ? "Your average score out of 100, per game played." : "Each day adds your score out of 100 in each game."}</p>}
      {period === "today" && today && (
        <section aria-label="Today" className={styles.week}>
          <div className={kit.head}>
            <h3>Today</h3>
            <span className={kit.chip}>{dayText(today.date)}</span>
          </div>
          <TodayStandings board={today} game={game} average={average} />
        </section>
      )}
      {period !== "today" && board && overall && (
        <OverallStandings
          key={period}
          label={BOARD_PERIODS[period]}
          week={period === "this" ? (board as OverallBoard).thisWeek : (board as OverallBoard).lastWeek}
          average={average}
        />
      )}
      {period !== "today" && board && !overall && (
        <Standings
          key={period}
          label={BOARD_PERIODS[period]}
          week={period === "this" ? (board as Board).thisWeek : (board as Board).lastWeek}
          graph={graph}
          picked={picked}
          onPick={setPicked}
        />
      )}
      {(period === "today" ? !today && !todayError : !board && !error) && (
        <Skeleton label="Loading scores">
          <Line />
        </Skeleton>
      )}
      {period === "today" ? todayError && <p role="alert">{todayError}</p> : error && <p role="alert">{error}</p>}
    </section>
  );
}

const BOARD_PERIODS = { today: "Today", this: "This week", last: "Last week" } as const;

// The card's periods, each by its name (M22, answer 3).
const PERIODS = { today: "Today", yesterday: "Yesterday", week: "This week" } as const;

// Today's one leaderboard card (docs/milestones/M14-14a-2a-today.md; L41): Yesterday or This week, for friends or one
// of the player's groups, from the routes the boards already use, and for Offbeat, Fragments or Overall (M16 16f-6,
// answer 20), Offbeat on every load as the other leaderboards. Yesterday is closed, so its points are final (M09
// D9); this week's count days once they're over. Each choice loads once.
export function LeaderboardCard() {
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  // null: the friends board.
  const [group, setGroup] = useState<string | null>(null);
  // Today on every load (M22, answer 3).
  const [period, setPeriod] = useState<"today" | "yesterday" | "week">("today");
  const [game, setGame] = useState<(typeof GAMES)[number]["id"]>(GAME.id);
  const [today, setToday] = useState<TodayBoard | null>(null);
  const [day, setDay] = useState<Day | null>(null);
  const [week, setWeek] = useState<Week | OverallWeek | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Kept apart from the board's error, which each new choice clears, so a failed list of groups stays on show.
  const [groupsError, setGroupsError] = useState<string | null>(null);
  // Choices can change faster than the answers come back: only the newest choice's answer is shown (M11 H6).
  const [latest] = useState(latestOnly);
  // A new choice clears the last one's rows and error, so they aren't shown under the new label while it loads, or
  // for good if it fails (docs/milestones/M14-14b-2c-review-items.md, item 13).
  function choose(next: { period?: "today" | "yesterday" | "week"; group?: string | null; game?: (typeof GAMES)[number]["id"] }) {
    if (next.period !== undefined) setPeriod(next.period);
    if (next.group !== undefined) setGroup(next.group);
    if (next.game !== undefined) setGame(next.game);
    setToday(null);
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
    if (period === "today") {
      const path = `/api/leaderboard/today?game=${game}${group === null ? "" : `&group=${encodeURIComponent(group)}`}`;
      latest(api<{ board: TodayBoard }>(path, { method: "GET" }), (r) => (setToday(r.board), setDay(null), setWeek(null), setError(null)), failed);
    } else if (period === "yesterday") {
      const path = `/api/leaderboard/yesterday?game=${game}${group === null ? "" : `&group=${encodeURIComponent(group)}`}`;
      latest(api<{ day: Day }>(path, { method: "GET" }), (r) => (setDay(r.day), setToday(null), setWeek(null), setError(null)), failed);
    } else {
      const path = group === null ? `/api/leaderboard?game=${game}` : `/api/groups/leaderboard?id=${encodeURIComponent(group)}&game=${game}`;
      latest(api<Board | OverallBoard>(path, { method: "GET" }), (r) => (setWeek(r.thisWeek), setToday(null), setDay(null), setError(null)), failed);
    }
  }, [group, period, game, latest]);

  const label = PERIODS[period];
  return (
    <section aria-label="Leaderboard" className={`${kit.card} ${gameColour(game) ?? ""}`}>
      {/* Mockup 3's card: the heading with the day it shows as a chip (M14 14b-8b). */}
      <div className={kit.head}>
        <h2>Leaderboard</h2>
        {(today || day || week) && <span className={kit.chip}>{today ? dayText(today.date) : day ? dayText(day.date) : `From ${dayText(week!.from)}`}</span>}
      </div>
      <div role="radiogroup" aria-label="Period" className={styles.switch} style={{ "--choices": 3 } as CSSProperties}>
        {(["today", "yesterday", "week"] as const).map((p) => (
          <label key={p} className={period === p ? `${styles.choice} ${styles.on}` : styles.choice}>
            <input type="radio" name="leaderboard-period" checked={period === p} onChange={() => choose({ period: p })} />
            {PERIODS[p]}
          </label>
        ))}
      </div>
      <GameSwitch choices={GAMES} value={game} onChange={(id) => choose({ game: id })} />
      <label className={`${styles.board} ${kit.select}`}>
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
        {today && <TodayStandings board={today} game={game} average={false} />}
        {day && <Entries entries={day.entries} places={game === OVERALL.id} />}
        {week && <Entries entries={week.entries} places={game === OVERALL.id} />}
        {!today && !day && !week && !error && (
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

// Today's board (docs/milestones/M22-todays-board.md): no board without today's day, the line that says what opens it
// until the player has finished (answers 7 and 10), then the finished players ranked and the rest below, playing or not
// played yet (answer 5). On Overall, average ranks by the Average, per game finished today, as the weekly Count does.
function TodayStandings({ board, game, average }: { board: TodayBoard; game: (typeof GAMES)[number]["id"]; average: boolean }) {
  const named = (id: string) => GAMES.find((g) => g.id === id)!.name;
  // Claude's words for Overall and for a day with no game (M22, Design), the human's for a game (answer 10).
  if (board.games.length === 0) return <p className={styles.note}>{game === OVERALL.id ? "No games today." : `No ${named(game)} today.`}</p>;
  if (!board.open) {
    const what = board.games.length === 2 ? "both of today's games" : `today's ${named(board.games[0])}`;
    return <p className={styles.note}>Finish {what} to see today&apos;s board.</p>;
  }
  const entries =
    game === OVERALL.id && average ? ranked((board.entries as OverallEntry[]).map((e) => ({ ...e, points: e.average })), (e) => e.points) : board.entries;
  return (
    <>
      <Entries entries={entries} places={game === OVERALL.id} />
      {board.rest.length > 0 && (
        <ul className={kit.rows}>
          {board.rest.map((r) => (
            <li key={r.username} className={r.you ? `${kit.row} ${kit.board} ${kit.you} ${styles.entry}` : `${kit.row} ${kit.board} ${styles.entry}`}>
              <PlayerAvatar name={r.name} username={r.username} me={r.you} />
              <PlayerName username={r.username} me={r.you} className={`${kit.grow} ${styles.name}`}>
                {r.name}
                {r.you && " (you)"}
              </PlayerName>
              <span className="sr-only">: </span>
              <span>{r.state === "playing" ? "playing" : "not played yet"}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// A week as its rows or, in Graph, its race (answers 5 and 15), with Show table beside its chip (answers 17 and 25).
function Standings(props: { label: string; week: Week; graph: boolean; picked: string | null; onPick: (key: string | null) => void }) {
  const { label, week, graph, picked, onPick } = props;
  const [table, setTable] = useState(false);
  // Last week's friends board is empty for a viewer who joined this week with no older friends (M19 19c): no race.
  const empty = week.entries.length === 0;
  const drawn = graph && week.days > 0 && !empty;
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
      {(!graph || empty) && <Entries entries={week.entries} />}
      {graph && week.days === 0 && <p className={raceStyles.empty}>The first points arrive Tuesday, once Monday is over.</p>}
      {drawn && <Race label={label} week={week} picked={picked} onPick={onPick} />}
      {drawn && week.hidden.length > 0 && <p className={styles.note}>{hiddenText(week.hidden)}</p>}
      {drawn && table && <RaceTable label={label} week={week} picked={picked} />}
    </section>
  );
}

// An overall week (answer 29): its rows by Sum, as the server ranks them, or by Average, ranked again here, each a
// plain number (answer 24).
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

// Mockup 3's rows: the place as a badge (place-badge.tsx: the first in the accent under a crown, the second and third with ribbon tails), the avatar, the name, the points. The list's own order
// is the place for screen readers, so the badge's number is drawn by CSS (kit.module.css's [data-place]) and isn't in
// the row's text; a hidden ": " keeps the row read as "name: 3 points". The overall board's number is its par scores
// added up, the plain total the note explains (M16 16e, answer 24; M15 15i).
function Entries({ entries, places = false }: { entries: LeaderboardEntry[]; places?: boolean }) {
  return (
    <ol className={kit.rows}>
      {entries.map((e, i) => (
        <li key={e.username} className={e.you ? `${kit.row} ${kit.board} ${kit.you} ${styles.entry}` : `${kit.row} ${kit.board} ${styles.entry}`}>
          <PlaceBadge place={i + 1} />
          <PlayerAvatar name={e.name} username={e.username} me={e.you} />
          <PlayerName username={e.username} me={e.you} className={`${kit.grow} ${styles.name}`}>
            {e.name}
            {e.you && " (you)"}
          </PlayerName>
          <span className="sr-only">: </span>
          <b>{places ? e.points : e.points === 1 ? "1 point" : `${e.points} points`}</b>
        </li>
      ))}
    </ol>
  );
}
