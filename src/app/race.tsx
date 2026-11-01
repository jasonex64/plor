"use client";

// A week's race on the leaderboard's Graph view, and its table (docs/milestones/M14-14b-14-leaderboard-graph.md):
// every player's running total on each day that's over. The graph is drawn at the width it shows at, so its 12px text
// stays 12px; a tap or click anywhere picks the nearest line on that day (answer 24). The table is the graph's long
// description, open to everyone (WAI Complex Images, "Long descriptions"; answer 17).
import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Week } from "@/friends/leaderboard";
import { layout, running, type RacePlayer } from "./race-layout";
import { useMinWidth } from "./min-width";
import styles from "./race.module.css";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const players = (week: Week): RacePlayer[] =>
  week.entries.map((e) => ({ key: e.username, name: e.you ? "You" : e.name, you: e.you, daily: e.daily }));

// The graph's short description: who leads, and where you stand (WAI Complex Images, "Overview").
function summary(label: string, week: Week): string {
  const [leader] = week.entries;
  const you = week.entries.find((e) => e.you)!;
  return `${label}, day by day: ${leader.you ? `you lead with ${you.points}` : `${leader.name} leads with ${leader.points}; you have ${you.points}`}.`;
}

// The graph's text size: 0.75rem (race.module.css), 12px at the browser's default and more when the player sets a bigger
// text size (14b-17). Read, like the measuring, only once the graph has a width, so only in the browser.
const textSize = () => parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.75;

// The width of a text in the graph's size, in the page's one font (body's, which the graph inherits).
let canvas: CanvasRenderingContext2D | null = null;
function measure(text: string, weight: number): number {
  canvas ??= document.createElement("canvas").getContext("2d")!;
  canvas.font = `${weight} ${textSize()}px ${getComputedStyle(document.body).fontFamily}`;
  return canvas.measureText(text).width;
}

// Drawn again once the font has loaded: until then the canvas measures in a fallback font.
function useFontLoaded() {
  const [, setLoaded] = useState(false);
  useEffect(() => {
    document.fonts.ready.then(() => setLoaded(true));
  }, []);
}

export function Race({ label, week, picked, onPick }: { label: string; week: Week; picked: string | null; onPick: (key: string | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(box.current!);
    return () => observer.disconnect();
  }, []);
  const long = useMinWidth(768);
  const height = long ? 230 : 200;
  useFontLoaded();
  const view = width > 0 ? layout({ players: players(week), days: week.days, hidden: week.hidden, picked, width, height, long, text: textSize(), measure }) : null;

  function tap(event: MouseEvent<SVGSVGElement>) {
    const at = event.currentTarget.getBoundingClientRect();
    const key = view!.nearest(event.clientX - at.left, event.clientY - at.top);
    onPick(key === picked ? null : key);
  }

  return (
    <div ref={box} className={styles.race} style={{ height }}>
      {view && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary(label, week)} onClick={tap}>
          {view.grid.map((g) => (
            <g key={g.text}>
              <line className={styles.grid} x1={g.from} x2={g.to} y1={g.y} y2={g.y} />
              <text className={styles.axis} x={g.x} y={g.ty} textAnchor="end">
                {g.text}
              </text>
            </g>
          ))}
          {view.today && <line className={styles.today} x1={view.today.x} x2={view.today.x} y1={view.today.from} y2={view.today.to} />}
          {view.names.map((n, i) => (
            <text key={i} className={n.today ? styles.todayName : n.hidden ? styles.hiddenName : styles.axis} x={n.x} y={n.y} textAnchor="middle">
              {n.text}
            </text>
          ))}
          {view.lines.map((l) => (
            <g key={l.key} className={styles[l.role]}>
              <polyline className={styles.line} points={l.points.map((p) => `${p.x},${p.y}`).join(" ")} />
              <circle className={styles.dot} cx={l.points.at(-1)!.x} cy={l.points.at(-1)!.y} r={l.role === "other" ? 2.5 : 3.5} />
            </g>
          ))}
          {/* The leader's end carries the List's first-place badge (answer 23). */}
          <circle className={styles.badge} cx={view.badge.x} cy={view.badge.y} r={view.badge.r} />
          <text className={styles.badgeText} x={view.badge.x} y={view.badge.ty} textAnchor="middle">
            1
          </text>
          {view.ticks.map((t, i) => (
            <line key={i} className={styles.tick} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
          {view.labels.map((l) => (
            <text key={l.text} className={`${styles.label} ${styles[`${l.role}Label`]}`} x={l.x} y={l.y}>
              {l.text}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}

// The running totals by place, a dash on a day the viewer is still playing (answer 28); it scrolls inside its own box
// with the names held at its left (answer 20).
export function RaceTable({ label, week, picked }: { label: string; week: Week; picked: string | null }) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <caption className="sr-only">{label}, running totals by day</caption>
        <thead>
          <tr>
            <th scope="col">Player</th>
            {DAYS.slice(0, week.days).map((d) => (
              <th key={d} scope="col">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {week.entries.map((e) => (
            <tr key={e.username} className={e.you ? styles.yourRow : e.username === picked ? styles.foundRow : undefined}>
              <th scope="row">{e.you ? "You" : e.name}</th>
              {running(e.daily).map((sum, i) => (
                <td key={i}>{week.hidden.includes(i) ? "–" : sum}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Under a week with days the viewer is still playing (answer 28).
export function hiddenText(hidden: number[]): string {
  const names = hidden.map((i) => DAY_NAMES[i]);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return `${list}'s points are hidden until you finish ${names.length === 1 ? "that run" : "those runs"}.`;
}
