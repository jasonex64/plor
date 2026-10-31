// Where a week's race goes on the leaderboard graph (docs/milestones/M14-14b-14-leaderboard-graph.md): its lines,
// end labels, gridlines and day names, from the players' points and the graph's size. Every size is the approved
// mockup's (the ticket's Numbers) unless its comment names an answer.

// A player's points on each of the week's days that are over, Monday first; name is "You" for the viewer.
export type RacePlayer = { key: string; name: string; you: boolean; daily: number[] };

export type RaceInput = {
  // Ranked as the board ranks them: the first leads.
  players: RacePlayer[];
  // How many of the week's days are over, 1 to 7; hidden, those the viewer is still playing (answer 28).
  days: number;
  hidden: number[];
  picked: string | null;
  width: number;
  height: number;
  // From 768px: the days' three-letter names.
  long: boolean;
  // A text's width in px at 12px in the given weight.
  measure: (text: string, weight: number) => number;
};

const TOP = 12;
const BOTTOM = 26;
const LEFT = 26;
const RIGHT = 14;
// The axis numbers' gap to the plot, and the end labels' to the last day's line.
const AXIS_GAP = 6;
const LABEL_GAP = 13;
// End labels: at least this far apart, with a tick back to the dot once moved further than TICK_FROM.
const LABEL_STEP = 14;
const TICK_FROM = 4;
// Answer 29: 1, 2, 2.5 or 5 × 10ⁿ, at most 4 steps above 0.
const STEPS = [1, 2, 2.5, 5];
const MOST_STEPS = 4;
// Answer 30.
const NAME_MAX = 10;
const SHORT_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const LONG_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function gridStep(max: number): number {
  for (let scale = 1; ; scale *= 10) {
    for (const step of STEPS) if (Math.ceil(max / (step * scale)) <= MOST_STEPS) return step * scale;
  }
}

export function shortName(name: string): string {
  const chars = [...name];
  return chars.length > NAME_MAX ? `${chars.slice(0, NAME_MAX).join("")}…` : name;
}

export function running(daily: number[]): number[] {
  let sum = 0;
  return daily.map((points) => (sum += points));
}

export type Role = "you" | "found" | "other";
type Point = { x: number; y: number };

export function layout({ players, days, hidden, picked, width, height, long, measure }: RaceInput) {
  const cum = new Map(players.map((p) => [p.key, running(p.daily)]));
  const total = (p: RacePlayer) => cum.get(p.key)![days - 1];
  const max = Math.max(1, ...players.map(total));
  const step = gridStep(max);
  const steps = Math.ceil(max / step);
  const values = Array.from({ length: steps + 1 }, (_, i) => i * step);
  const left = Math.max(LEFT, Math.max(...values.map((v) => measure(String(v), 400))) + AXIS_GAP);

  // You, the leader and the one found are named; players on the same total share a label.
  const you = players.find((p) => p.you);
  const leader = players[0];
  const found = players.find((p) => p.key === picked && !p.you);
  const named = [you, leader, found].filter((p, i, all): p is RacePlayer => p !== undefined && all.indexOf(p) === i);
  const byTotal = new Map<number, RacePlayer[]>();
  for (const p of named) byTotal.set(total(p), [...(byTotal.get(total(p)) ?? []), p]);
  const labels = [...byTotal].map(([points, who]) => {
    const role: Role = who.some((p) => p.you) ? "you" : who.includes(found!) ? "found" : "other";
    const text = `${who.map((p) => (p.you ? p.name : shortName(p.name))).join(" & ")} ${points}`;
    return { points, role, text, width: measure(text, role === "other" ? 700 : 800) };
  });

  // The last day's line ends where the widest label still fits after it: room is that x. A week not yet over keeps
  // no margin past Sunday for them unless the labels need it (answers 25 and 30).
  const room = width - LABEL_GAP - Math.max(...labels.map((l) => l.width));
  const right = days === 7 ? Math.min(width - RIGHT, room) : days > 1 ? Math.min(width - RIGHT, left + (6 * (room - left)) / (days - 1)) : width - RIGHT;
  const bottom = height - BOTTOM;
  const col = (right - left) / 6;
  const x = (i: number) => left + i * col;
  const y = (v: number) => bottom - (v / (steps * step)) * (bottom - TOP);
  const last = x(days - 1);

  const placed = labels.map((l) => ({ ...l, dot: y(l.points), x: last + LABEL_GAP, y: y(l.points) + 4 })).sort((a, b) => a.y - b.y);
  placed.forEach((l, i) => {
    if (i > 0 && l.y - placed[i - 1].y < LABEL_STEP) l.y = placed[i - 1].y + LABEL_STEP;
  });
  let limit = bottom + 4;
  for (let i = placed.length - 1; i >= 0; i--) {
    placed[i].y = Math.min(placed[i].y, limit);
    limit = placed[i].y - LABEL_STEP;
  }

  const role = (p: RacePlayer): Role => (p.you ? "you" : p === found ? "found" : "other");
  const order: Record<Role, number> = { other: 0, found: 1, you: 2 };
  const lines = [...players]
    .sort((a, b) => order[role(a)] - order[role(b)])
    .map((p) => ({ key: p.key, role: role(p), points: cum.get(p.key)!.map((v, i): Point => ({ x: x(i), y: y(v) })) }));

  return {
    grid: values.map((v) => ({ y: y(v), text: String(v), x: left - AXIS_GAP, from: left, to: right })),
    names: (long ? LONG_DAYS : SHORT_DAYS).map((text, i) => ({
      x: x(i),
      y: height - 6,
      text: i === days ? "Today" : text,
      today: i === days,
      hidden: hidden.includes(i),
    })),
    today: days < 7 ? { x: x(days), from: TOP, to: bottom } : null,
    lines,
    badge: { x: last, y: y(total(leader)) },
    labels: placed,
    ticks: placed.filter((l) => Math.abs(l.y - 4 - l.dot) > TICK_FROM).map((l) => ({ x1: last + 4, y1: l.dot, x2: l.x - 2, y2: l.y - 4 })),
    // The player, never the viewer, whose line passes nearest a point on that point's day (answer 24).
    nearest(px: number, py: number): string | null {
      const day = Math.max(0, Math.min(days - 1, Math.round((px - left) / col)));
      let best: { key: string; d: number } | null = null;
      for (const p of players) {
        if (p.you) continue;
        const d = Math.abs(y(cum.get(p.key)![day]) - py);
        if (!best || d < best.d) best = { key: p.key, d };
      }
      return best?.key ?? null;
    },
  };
}
