// The leaderboard graph's drawing (docs/milestones/M14-14b-14-leaderboard-graph.md): its grid steps, cut names, tied
// labels, the labels' spacing and ticks, the right margin and picking the nearest line.
import { describe, expect, it } from "vitest";
import { gridStep, layout, shortName, type RacePlayer } from "./race-layout";

// Each character 6px wide, whatever the weight.
const measure = (text: string) => [...text].length * 6;
const player = (key: string, daily: number[], you = false): RacePlayer => ({ key, name: you ? "You" : key, you, daily });
const base = { days: 7, hidden: [], picked: null, width: 326, height: 200, long: false, text: 12, measure };

describe("gridStep", () => {
  it.each([
    [4, 1],
    [9, 2.5],
    [36, 10],
    [40, 10],
    [41, 20],
    // Not 2500: 2000 already keeps 6800 to 4 steps.
    [6800, 2000],
    [10000, 2500],
    [10001, 5000],
  ])("for a top total of %d, steps by %d (answer 29: 1, 2, 2.5 or 5 × 10ⁿ, at most 4 steps)", (max, step) => {
    expect(gridStep(max)).toBe(step);
    expect(Math.ceil(max / step)).toBeLessThanOrEqual(4);
  });
});

describe("shortName", () => {
  it("cuts a name past 10 characters with … and keeps a shorter one (answer 30)", () => {
    expect(shortName("abcdefghij")).toBe("abcdefghij");
    expect(shortName("abcdefghijk")).toBe("abcdefghij…");
  });
});

describe("layout", () => {
  const players = [
    player("Ana", [5, 6, 3, 4, 6, 7, 5]),
    player("me", [4, 3, 6, 5, 4, 6, 7], true),
    player("Ben", [6, 5, 2, 3, 4, 3, 2]),
    player("Fay", [4, 3, 6, 5, 4, 6, 7]),
  ];

  it("names you and the leader, and a found player, sharing one label on a tie", () => {
    expect(layout({ ...base, players }).labels.map((l) => l.text)).toEqual(["Ana 36", "You 35"]);
    expect(layout({ ...base, players, picked: "Fay" }).labels.map((l) => [l.text, l.role])).toEqual([
      ["Ana 36", "other"],
      ["You & Fay 35", "you"],
    ]);
    expect(layout({ ...base, players, picked: "Ben" }).labels.map((l) => [l.text, l.role])).toEqual([
      ["Ana 36", "other"],
      ["You 35", "you"],
      ["Ben 25", "found"],
    ]);
  });

  it("keeps labels 14 apart, with a tick to a dot a label moved more than 4 from, all above the plot's foot", () => {
    const { labels, ticks } = layout({ ...base, players });
    expect(labels[1].y - labels[0].y).toBeGreaterThanOrEqual(14);
    // You're 1 point under Ana, about 4px: your label moved down to 14 below hers, so it has a tick.
    expect(ticks).toHaveLength(1);
    expect(ticks[0].y1).toBe(labels[1].dot);
    // Three players on 0: the labels stack up from the foot, not below it.
    const flat = layout({ ...base, players: [player("Ana", [0]), player("me", [0], true), player("Ben", [0])], days: 1, picked: "Ben" });
    expect(Math.max(...flat.labels.map((l) => l.y))).toBeLessThanOrEqual(200 - 26 + 4);
  });

  it("ends a finished week's lines where the widest label still fits, and an unfinished one's at the plot's edge", () => {
    const done = layout({ ...base, players });
    // "You 35" and "Ana 36": 6 characters, 36px, after a 13px gap.
    expect(done.labels[0].x + 36).toBeLessThanOrEqual(326);
    expect(done.grid[0].to).toBe(326 - 13 - 36);
    const thursday = layout({ ...base, players: players.map((p) => ({ ...p, daily: p.daily.slice(0, 4) })), days: 4 });
    expect(thursday.grid[0].to).toBe(326 - 14);
    expect(thursday.today).toMatchObject({ x: thursday.names[4].x });
    expect(thursday.names[4].text).toBe("Today");
  });

  it("widens the left margin for wide axis numbers", () => {
    const big = layout({ ...base, players: [player("Ana", [3000, 3800, 0, 0, 0, 0, 0]), player("me", [100, 0, 0, 0, 0, 0, 0], true)] });
    // 8000: 4 characters, 24px, then the 6px gap.
    expect(big.grid.map((g) => g.text)).toEqual(["0", "2000", "4000", "6000", "8000"]);
    expect(big.grid[0].from).toBe(30);
  });

  it("marks a day the viewer is still playing", () => {
    expect(layout({ ...base, players, hidden: [2] }).names.map((n) => n.hidden)).toEqual([false, false, true, false, false, false, false]);
  });

  it("picks the nearest line on the tapped day, never yours", () => {
    const view = layout({ ...base, players });
    const sunday = (key: string) => view.lines.find((l) => l.key === key)!.points[6];
    expect(view.nearest(sunday("Ben").x + 3, sunday("Ben").y - 2)).toBe("Ben");
    // Right on your end, the nearest other line: Fay, level with you.
    expect(view.nearest(sunday("me").x, sunday("me").y)).toBe("Fay");
  });

  it("at twice the text size, keeps twice the room for text and spaces its labels twice as far apart (14b-17)", () => {
    const one = layout({ ...base, players });
    const two = layout({ ...base, players, text: 24 });
    // The plot's foot: 26px of day names, then 52px.
    expect(one.today).toBeNull();
    expect(two.names[0].y).toBe(200 - 12);
    expect(Math.max(...two.grid.map((g) => g.y))).toBe(200 - 52);
    // Labels at least 28 apart; Ana's and yours 1 point apart, so yours is pushed down to 28 under hers, with a tick.
    expect(two.labels[1].y - two.labels[0].y).toBeGreaterThanOrEqual(28);
    expect(two.ticks).toHaveLength(1);
    expect(two.ticks[0].y2).toBe(two.labels[1].y - 8);
    // The badge and the axis numbers' baseline.
    expect(two.badge.r).toBe(16);
    expect(two.grid[0].ty - two.grid[0].y).toBe(8);
  });

  it("draws your line last and a found one above the rest", () => {
    expect(layout({ ...base, players, picked: "Ben" }).lines.map((l) => [l.key, l.role])).toEqual([
      ["Ana", "other"],
      ["Fay", "other"],
      ["Ben", "found"],
      ["me", "you"],
    ]);
  });
});
