// Every colour pairing the screens use passes WCAG 2.2 in Paper and Night (docs/milestones/M14-14a-1-shell.md,
// criterion 7): text at 4.5:1 (1.4.3) and control outlines at 3:1 (1.4.11); the calendar's shades at 3:1 on the card,
// with their numbers at 4.5:1, and the danger colour (docs/milestones/M14-14a-3b-settings.md, criteria 6 and 9). The slots are read from globals.css, so a
// changed colour is checked where it's defined.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

// The custom properties declared in the first block after `marker`, a slot named as another (`var(--text)`) read as
// that slot's colour in the same block (the numbers on the calendar's shades, M14 14b-2c-2, item 28).
function slots(marker: string): Record<string, string> {
  const start = css.indexOf("{", css.indexOf(marker));
  const block = css.slice(start, css.indexOf("}", start));
  const declared = Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]+|var\(--[a-z0-9-]+\));/g)].map((m) => [m[1], m[2]]));
  return Object.fromEntries(Object.entries(declared).map(([name, value]) => [name, value.startsWith("var(") ? declared[value.slice(6, -1)] : value]));
}

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;

// A colour with alpha (#rrggbbaa) laid over an opaque one.
function over(hex: string, under: string): Rgb {
  const a = hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1;
  const [top, bottom] = [rgb(hex), rgb(under)];
  return top.map((c, i) => Math.round(c * a + bottom[i] * (1 - a))) as Rgb;
}

// WCAG 2.2's relative luminance and contrast ratio (Understanding 1.4.3).
function luminance(c: Rgb): number {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// The games' own colours sit in :root with Paper's and stay the same in every theme (M14 14a-2a). Each theme is a
// [data-theme] block, Paper's shared with :root, and Night's repeated for the device's dark mode
// (docs/milestones/M14-14b-1-themes.md, criterion 1).
const GAME_SLOTS = ["offbeat", "on-offbeat"];
const root = slots(":root,");
const themes = {
  Paper: Object.fromEntries(Object.entries(root).filter(([name]) => !GAME_SLOTS.includes(name))),
  Night: slots('[data-theme="night"]'),
  Sky: slots('[data-theme="sky"]'),
  Moonlit: slots('[data-theme="moonlit"]'),
  Ink: slots('[data-theme="ink"]'),
};

describe("Night", () => {
  it("is the same for the device's dark mode as when it's chosen", () => {
    expect(slots("prefers-color-scheme: dark")).toEqual(themes.Night);
  });
});

describe("Offbeat's colour", () => {
  it("is declared once, for every theme", () => {
    expect(GAME_SLOTS.every((name) => name in root)).toBe(true);
    for (const t of Object.values(themes).slice(1)) expect(GAME_SLOTS.some((name) => name in t)).toBe(false);
  });

  // The banner's text and Play's label (docs/milestones/M14-14a-2a-today.md, criterion 7).
  it("white on it is at least 4.5:1", () => {
    expect(ratio(rgb(root["on-offbeat"]), rgb(root.offbeat))).toBeGreaterThanOrEqual(4.5);
  });
});

describe.each(Object.entries(themes))("%s", (_, t) => {
  it("declares every slot", () => {
    expect(Object.keys(t).sort()).toEqual(["accent", "bg", "caught", "caught-bg", "danger", "edge", "line", "muted", "on-accent", "on-shade-1", "on-shade-2", "on-shade-3", "on-shade-4", "safe", "safe-bg", "shade-1", "shade-2", "shade-3", "shade-4", "soft", "surface", "text"]);
  });

  it.each([
    ["text", "bg"],
    ["text", "surface"],
    ["muted", "bg"],
    ["muted", "surface"],
    ["accent", "bg"],
    ["accent", "surface"],
    ["on-accent", "accent"],
    // The game screen's Safe and Caught pills (docs/milestones/M14-14a-2b-game-screen.md).
    ["safe", "safe-bg"],
    ["caught", "caught-bg"],
    // Delete account in the settings sheet, which sits on the background, its button on a card.
    ["danger", "bg"],
    ["danger", "surface"],
  ])("%s on %s is at least 4.5:1", (fg, bg) => {
    expect(ratio(rgb(t[fg]), rgb(t[bg]))).toBeGreaterThanOrEqual(4.5);
  });

  // The current tab: text and the accent icon on the soft pill, over the tab bar and sidebar's surface.
  it.each(["text", "accent"])("%s on the soft pill is at least 4.5:1", (fg) => {
    expect(ratio(rgb(t[fg]), over(t.soft, t.surface))).toBeGreaterThanOrEqual(4.5);
  });

  // The streak's number on its soft pill, which sits on the phone's top bar (the background) as well as the sidebar
  // (the surface, above) (docs/milestones/M14-14b-2a-streak-ranks.md, criterion 5).
  it("text on the soft pill over the background is at least 4.5:1", () => {
    expect(ratio(rgb(t.text), over(t.soft, t.bg))).toBeGreaterThanOrEqual(4.5);
  });

  // Me's calendar sits on a card: each played day's shade is a graphic the calendar needs (1.4.11), and its number,
  // shown with Numbers on the calendar, is text (1.4.3).
  it.each([1, 2, 3, 4])("shade %i is at least 3:1 on the surface, and its number at least 4.5:1 on it", (k) => {
    const shade = over(t[`shade-${k}`], t.surface);
    expect(ratio(shade, rgb(t.surface))).toBeGreaterThanOrEqual(3);
    expect(ratio(rgb(t[`on-shade-${k}`]), shade)).toBeGreaterThanOrEqual(4.5);
  });

  // The admin pages (docs/milestones/M14-14b-2b-2-admin-build.md, criterion 7): Delete's confirm button, text on the
  // danger colour; the insights chart's bars (muted, and caught for the dip) and its target line (accent) as graphics
  // on the card (1.4.11), and the dip's words in the caught colour as text.
  it("on-accent on the danger colour is at least 4.5:1", () => {
    expect(ratio(rgb(t["on-accent"]), rgb(t.danger))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["muted", "caught", "accent"])("the chart's %s on the surface is at least 3:1", (fg) => {
    expect(ratio(rgb(t[fg]), rgb(t.surface))).toBeGreaterThanOrEqual(3);
  });

  it("the caught colour as text on the surface is at least 4.5:1", () => {
    expect(ratio(rgb(t.caught), rgb(t.surface))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["bg", "surface"])("the control outline on %s is at least 3:1", (bg) => {
    expect(ratio(rgb(t.edge), rgb(t[bg]))).toBeGreaterThanOrEqual(3);
  });
});
