// Helpers for Afterglow's look check (docs/milestones/M14-14c-6-afterglow-in-play.md, 14c-6b-2a), carried from the
// mock's check, RIFF-mocks `themes/festival/check.mjs` at fcc11e4: its canvas hooks, its readers of the art and its
// measures, unchanged but for where they read. The mock's page-wide variables are the probe's core (`__core`, src/afterglow/scene.ts,
// Core) and its element ids are data-part names (`__part`), as 14c-6b-1 moved them.
import fs from "node:fs";
import path from "node:path";
import type { Browser, BrowserContextOptions, Page } from "@playwright/test";
import type { Core, Phase, Stop } from "../src/afterglow/scene";
import { AFTERGLOW } from "../src/config/tunables";
export { RUN, TAKEN_AT } from "../src/app/check/afterglow/day";

export type Trace = { ph: Phase; q: number; t: number; x: number; y: number; w: number; ow: number; h: number; fs: string; a: number; b: number; c: number; d: number; cam: number; k: number };
export type LayerFrame = { ph: Phase; q: number; t: number; k: number; cam: number; sky: number; deck: number; back: number; css: string };
export type Floor = { cam: number; d: Uint8ClampedArray };
declare global {
  var __core: Core;
  var __part: (name: string) => HTMLElement;
  var __artImage: (x: number, y: number, w: number, h: number) => { data: Uint8ClampedArray };
  var __artLog: Set<string>;
  var __transforms: number;
  var __trace: Trace[];
  var __layers: LayerFrame[];
  var __walk: Parameters<Core["drawWalk"]>;
  var __mem: { max: number; most: number };
  var __a: Floor;
  var __prevF: Uint8ClampedArray | undefined;
  var __ch: number[] | undefined;
  var __camMax: number;
  var __band0: number | null;
  var __bandOk: boolean;
  var __decode: (b64: string) => Promise<{ w: number; h: number; d: Uint8ClampedArray }>;
  var __hueOf: (r: number, g: number, b: number) => number | null;
}

// The game's numbers the readers use, from tunables.ts, as the mock read them from its page.
export const { CLIMB_FLOORS, DESCENT_FLOORS, TOWER_IN, WALK_PARALLAX, WORD_ENTER, FPS } = AFTERGLOW;
export const A = '[data-part="answer"]', R = '[data-part="rBtn"]';

// check.mjs's constants, carried with their origins there.
export const EDGE_RUN = 40;            // proposed, ticket 14c-5: art rows of buildings stopping short of the edge in one run; measured 9 to 32 with the edge strips, 99 to 152 without
export const ARC = [0, 4, 6];        // the questions whose whole arc is photographed: common, rare, the last
export const DOWN = [.05, .1, .14, .18, .22, .27, .33, .4, .5, .62, .75, .9];   // frames through a whole descent, at the two major steps
export const FAST = 3;               // the game clock's speed where only the order and the frames matter
export const LINGER_S = 62;          // ticket 14c-5: frames compared over at least a minute
export const FPS_FLOOR = 59;         // human, 2026-11-07 (ticket 14c-5, answer 41): judged in real Chrome only; headless reports its number
export const HITCH_LIMIT = 16.7;     // a pre-draw slice must fit in a frame (ticket 14c-5: "no frame hitches")
export const AGES = { common: 1.2, uncommon: 1.4, rare: 2.8 };   // seconds after it opens at which each burst is measured
export const V5 = { seconds: { common: 2.7, uncommon: 2.3, rare: 1.9 }, floors: 6, peak: { wide: { common: 1186, uncommon: 1396, rare: 1697 }, phone: { common: 1394, uncommon: 1639, rare: 1982 } } };   // the last version's climb, measured
export const SIZES = [["wide", { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }], ["phone", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 }]] as const;

// Every canvas call that could leave the grid, by the phase it came in; and the art's one transform.
const hook = () => {
  const log = window.__artLog = new Set(), where = () => (window.__core ? window.__core.phase : "boot"), P = CanvasRenderingContext2D.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
  for (const m of ["arc", "arcTo", "ellipse", "lineTo", "quadraticCurveTo", "bezierCurveTo", "stroke", "fillText", "strokeText", "createLinearGradient", "createRadialGradient", "createConicGradient", "rotate"]) {
    const o = P[m]; P[m] = function (this: unknown, ...a: unknown[]) { log.add(`${m} in ${where()}`); return o.apply(this, a); };
  }
  const isArt = (x: CanvasRenderingContext2D) => (x.canvas as HTMLCanvasElement).dataset?.part === "screen", S = () => (window.__core ? __core.place().S : 1), off = (v: unknown) => typeof v === "number" && Math.abs(v * S() - Math.round(v * S())) > 1e-6;
  for (const m of ["translate", "scale", "transform", "resetTransform"]) { const o = P[m]; P[m] = function (this: CanvasRenderingContext2D, ...a: unknown[]) { if (isArt(this)) log.add(`${m} in ${where()}`); return o.apply(this, a); }; }
  const st = P.setTransform;   // Exactly one transform: the art's scale, and nothing else.
  P.setTransform = function (this: CanvasRenderingContext2D, ...a: unknown[]) { const n = a as number[]; if (isArt(this)) { window.__transforms = (window.__transforms || 0) + 1; if (n[1] || n[2] || n[4] || n[5] || n[0] !== n[3] || !Number.isInteger(n[0])) log.add(`setTransform ${a.join(",")} in ${where()}`); } return st.apply(this, a); };
  const fr = P.fillRect;
  P.fillRect = function (this: CanvasRenderingContext2D, ...a: unknown[]) { if (isArt(this) && (a as number[]).some((v) => !Number.isInteger(v))) log.add(`fillRect off grid in ${where()}`); return fr.apply(this, a); };
  const di = P.drawImage;
  P.drawImage = function (this: CanvasRenderingContext2D, ...a: unknown[]) {
    if (isArt(this)) {
      const img = a[0] as { width: number; height: number }, n = a as number[];
      if (a.slice(1).some(off)) log.add(`drawImage off grid in ${where()}`);
      const scaled = a.length === 5 ? (n[3] !== img.width || n[4] !== img.height) : a.length === 9 ? (n[3] !== n[7] || n[4] !== n[8]) : false;
      if (scaled) log.add(`scaled in ${where()}`);
    }
    return di.apply(this, a);
  };
  const ga = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "globalAlpha")!;
  Object.defineProperty(CanvasRenderingContext2D.prototype, "globalAlpha", { get: ga.get, set(v) { if (v !== 1) log.add(`globalAlpha in ${where()}`); ga.set!.call(this, v); } });
};

// The canvas is at device resolution; the checks read it an art pixel at a time. The page's parts by their data-part names.
const reader = () => {
  window.__part = (n) => document.querySelector<HTMLElement>(`[data-part="${n}"]`)!;
  window.__artImage = (x, y, w, h) => {
    const S = __core.place().S, d = __core.g.getImageData(x * S, y * S, w * S, h * S).data, data = new Uint8ClampedArray(w * h * 4), W = w * S;
    for (let j = 0, o = 0; j < h; j++) for (let i = 0; i < w; i++, o += 4) { const a = (j * S * W + i * S) * 4; data[o] = d[a]; data[o + 1] = d[a + 1]; data[o + 2] = d[a + 2]; data[o + 3] = 255; }
    return { data };
  };
};

// Next's dev-tools badge, which only `next dev` draws and no player sees, hidden before the check looks: its white and greys
// aren't the game's (14c-6b-2, answer 57). The mock's page had none.
const noBadge = () => addEventListener("DOMContentLoaded", () => { const st = document.createElement("style"); st.textContent = "nextjs-portal { display: none !important; }"; document.head.append(st); });
// Browser notes that aren't the game's: the mock's, and Next's dev build preloading a stylesheet a page doesn't use, as it does
// on every page (/about too; answer 58, and in ROADMAP for the app). Any other warning or error fails its line.
const NOT_OURS = [/getImageData are faster with the willReadFrequently/, /^The resource \S+\.css was preloaded using link preload but not used within a few seconds/];

export type Opened = { c: Awaited<ReturnType<Browser["newContext"]>>; p: Page; errs: string[] };
// The test page at a question (?q, answer 46: where the mock skipped ahead or played again), its fonts in.
export async function open(b: Browser, opts: BrowserContextOptions, withHook = true, q = 1): Promise<Opened> {
  const c = await b.newContext(opts);
  await c.addInitScript(reader);
  await c.addInitScript(noBadge);
  if (withHook) await c.addInitScript(hook);
  const p = await c.newPage(), errs: string[] = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !NOT_OURS.some((re) => re.test(m.text()))) errs.push(m.text()); });
  await p.goto(q === 1 ? "/check/afterglow" : `/check/afterglow?q=${q}`, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => !!window.__core);
  await p.waitForTimeout(400);
  return { c, p, errs };
}
// A wait that can fail is a named line's business, so it answers instead of throwing.
export const until = (p: Page, fn: () => unknown, ms = 30000) => p.waitForFunction(fn, undefined, { timeout: ms }).then(() => true, () => false);
export const buttonUp = (p: Page, ms?: number) => until(p, () => { const b = __part("rBtn"); return !b.hidden && !__part("result").hidden; }, ms);
export const asking = (p: Page, q: number, ms = 30000) => p.waitForFunction((q) => __core.phase === "ask" && __core.q === q, q, { timeout: ms }).then(() => true, () => false);
export const landed = async (p: Page, ms?: number) => {
  const ok = await until(p, () => __core.frozen, ms);
  if (!ok) await p.evaluate(() => __core.freezeAt(null));
  await p.waitForTimeout(40);
  return ok;
};
// Stops the game clock at a point in a phase; the page goes on redrawing that one frame.
export const freeze = async (p: Page, f: Stop, ms = 25000) => {
  await p.evaluate((f) => __core.freezeAt(f), f);
  return landed(p, ms);
};
// The next stop, set in one step with the thaw. Set after it, a slow frame can lose a short phase, and the game then runs on through the question's timer for the whole wait.
export const thawTo = async (p: Page, f: Stop, ms = 25000) => {
  await p.evaluate((f) => { __core.freezeAt(f); __core.thaw(); }, f);
  return landed(p, ms);
};
export const thaw = (p: Page) => p.evaluate(() => __core.thaw());
export const answerIt = async (p: Page, word: string) => {
  const was = await p.evaluate(() => { const r = __core.rateNow; __core.rate(1); return r; });
  await p.fill(A, word, { timeout: 5000 }); await p.press(A, "Enter", { timeout: 5000 });
  await p.evaluate((r) => __core.rate(r), was);
};
export const wordFacts = () => {
  const e = __part("word"), s = getComputedStyle(e), r = e.getBoundingClientRect(), m = new DOMMatrixReadOnly(s.transform), rg = document.createRange();
  rg.selectNodeContents(e); const gl = rg.getBoundingClientRect();
  return { size: s.fontSize, w: +r.width.toFixed(3), h: +r.height.toFixed(3), gw: +gl.width.toFixed(3), gh: +gl.height.toFixed(3), a: m.a, b: m.b, c: m.c, d: m.d, x: r.left, y: r.top, colour: s.color };
};
// Every frame the word shows: where it is and what shape. The rumble and the flight are read from this.
export const startTrace = () => {
  const e = __part("word"); window.__trace = []; window.__layers = [];
  const f = () => {
    if (!e.hidden) { const r = e.getBoundingClientRect(), s = getComputedStyle(e), m = new DOMMatrixReadOnly(s.transform); __trace.push({ ph: __core.phase, q: __core.q, t: __core.t, x: r.left, y: r.top, w: r.width, ow: e.offsetWidth, h: r.height, fs: s.fontSize, a: m.a, b: m.b, c: m.c, d: m.d, cam: __core.camNow, k: __core.k }); }
    if (__core.phase === "climb" || __core.phase === "descent") __layers.push({ ph: __core.phase, q: __core.q, t: __core.t, k: __core.k, cam: __core.camNow, sky: __core.skyNow.off, deck: __core.skyNow.deck, back: __core.towerNow.back, css: __core.screen.style.transform });
    requestAnimationFrame(f);
  };
  f();
};
export const stageMean = () => {
  const { AW, AH } = __core.place(), sc = __core.scene!, cv = document.createElement("canvas"); cv.width = AW; cv.height = AH; const x = cv.getContext("2d", { willReadFrequently: true })!;
  x.drawImage(sc.layers.skyBase, 0, 0); x.drawImage(sc.clouds, 0, sc.cloudsAt); x.drawImage(sc.ground!, 0, 0);
  const d = x.getImageData(0, 0, AW, AH).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]; return s / (d.length / 4);
};
// The canvas alone, no text: its colours.
export const artColours = () => { const { AW, AH } = __core.place(), d = __artImage(0, 0, AW, AH).data, seen = new Set<number>(); for (let i = 0; i < d.length; i += 4) seen.add(d[i] << 16 | d[i + 1] << 8 | d[i + 2]); return [...seen]; };
// The mock's #ui: everything over the canvas.
export const allFonts = () => { const ui = __part("name").parentElement!; return [...new Set([ui, ...ui.querySelectorAll("*")].map((e) => { const s = getComputedStyle(e); return s.fontFamily.split(",")[0].replace(/"/g, "") + " " + s.fontWeight; }))]; };
// Pixels of a stage's art drawn in the fire ladder, which only a light that is on may use: the street, and every piece of the climb's tower and sky.
export const fireCount = () => {
  const sc = __core.scene!, fire = new Set<number>(); for (let i = 19; i < 27; i++) { const c = sc.palette[i]; fire.add(c[0] << 16 | c[1] << 8 | c[2]); }
  const parts: Record<string, HTMLCanvasElement> = { street: sc.ground!, sky: sc.layers.skyBase, clouds: sc.clouds, above: sc.above!, high: sc.high, deck: sc.deck }, t: Record<string, number> = {};
  sc.tower.sides.forEach((s, i) => { for (const [k, v] of Object.entries(s)) parts[`tower ${k} ${i}`] = v as HTMLCanvasElement; });
  for (const [k, cv] of Object.entries(parts)) { const d = cv.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] && fire.has(d[i] << 16 | d[i + 1] << 8 | d[i + 2])) n++; t[k] = n; }
  return t;
};
// What a burst has lit on the canvas: this frame against the held sky, leaving out the sky lanterns.
export const burstLit = () => {
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
  const { AW, AH } = __core.place(), d = __artImage(0, 0, AW, AH).data, cv = document.createElement("canvas"); cv.width = AW; cv.height = AH;
  const x = cv.getContext("2d", { willReadFrequently: true })!; x.drawImage(__core.held!, 0, 0);
  const b0 = x.getImageData(0, 0, AW, AH).data, b = __core.burst!, slots = __core.run.results.map((r, i) => (r.caught ? null : __core.trackerSlot(i))).filter((s) => s !== null), last = slots.at(-1);
  const ramp = new Set(__core.RAMP[b.tier].map((c) => parseInt(c.slice(1), 16)));
  let n = 0, centre = 0, up = 0, down = 0, far = 0, sum = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, wrong = 0;
  for (let y = 0, i = 0; y < AH; y++) for (let px = 0; px < AW; px++, i += 4) if (d[i] !== b0[i] || d[i + 1] !== b0[i + 1] || d[i + 2] !== b0[i + 2]) {
    if (slots.some((q) => Math.abs(px - q.x) < 16 && y > q.y - 6 && y < q.y + 34)) continue;
    if (last && Math.abs(px - lerp(b.cx, last.x, (y - b.cy) / (last.y - b.cy))) < 14 && y < b.cy && y > last.y) continue;   // the lantern on its way up
    const dx = px - b.cx, dy = y - b.cy, r = Math.hypot(dx, dy); n++; sum += dy;
    if (!ramp.has(d[i] << 16 | d[i + 1] << 8 | d[i + 2])) wrong++;
    if (r < b.R * .35) centre++; if (r > far) far = r; if (-dy > up) up = -dy; if (dy > down) down = dy;
    if (px < x0) x0 = px; if (px > x1) x1 = px; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { tier: b.tier, R: b.R, n, wrong, centre: centre / (n || 1), up: up / b.R, down: down / b.R, far, sag: sum / (n || 1) / b.R, boxW: x1 - x0, boxH: y1 - y0 };
};
export type Mark = ReturnType<typeof burstLit>;
export const shapeOk = (m: Pick<Mark, "tier" | "centre" | "sag" | "up" | "down">) => m.tier === "common" ? m.centre > .05 && Math.abs(m.sag) < .3 && m.up > .55 : m.tier === "uncommon" ? m.centre < .03 && Math.abs(m.sag) < .2 && m.up > .75 : m.down > m.up * 1.3 && m.sag > .25;
export const fmtM = (m: Pick<Mark, "tier" | "n" | "centre" | "up" | "down" | "sag" | "far">) => `${m.tier} ${m.n} px, centre ${m.centre.toFixed(2)}, up ${m.up.toFixed(2)}, down ${m.down.toFixed(2)}, sag ${m.sag.toFixed(2)}, reach ${m.far.toFixed(0)}`;
// The floor at mid-walk against the same floor landed: which scale about the vanishing point fits, read from canvas pixels.
export const grabFloor = (): Floor => { const { AW, AH } = __core.place(); return { cam: __core.camNow, d: __artImage(0, 0, AW, AH).data.slice() }; };
export const fitZoom = (a: Floor, z: Floor) => {
  // The scene's own sampling hash, as the mock's page had it.
  const hash = (i: number, salt = 0) => { let h = Math.imul((i | 0) ^ 0x9E3779B9, 0x85EBCA6B) ^ Math.imul(salt | 0, 0xC2B2AE35); h ^= h >>> 16; h = Math.imul(h, 0x7FEB352D); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
  const { AW, AH } = __core.place(), vx = Math.floor(AW / 2), vy = Math.round(AH * .45), rows = Math.floor(AH * .78); let best = 1, bestE = 1e18;
  for (let s = .78; s <= 1.0001; s += .004) {
    let e = 0, n = 0;
    for (let k = 0; k < 6000; k++) {
      const x = 8 + Math.floor(hash(k, 9001) * (AW - 16)), y = rows + Math.floor(hash(k, 9002) * (AH - rows - 2)), sx = Math.round(vx + (x - vx) / s), sy = Math.round(vy + (y - a.cam - vy) / s);
      if (sx < 0 || sy < 0 || sx >= AW || sy >= AH) continue;
      const i = (y * AW + x) * 4, j = (sy * AW + sx) * 4; e += Math.abs(a.d[i] - z.d[j]) + Math.abs(a.d[i + 1] - z.d[j + 1]); n++;
    }
    if (n > 1000 && e / n < bestE) { bestE = e / n; best = s; }
  }
  return best;
};
// Is there building at the screen's edge from the tower's top down to where the street stands in front of it? Bare sky there is a section chopped off.
export const towerJoin = ({ CLIMB_FLOORS, DESCENT_FLOORS, TOWER_IN }: { CLIMB_FLOORS: number; DESCENT_FLOORS: number; TOWER_IN: number }) => {
  const { AW, AH, S } = __core.place(), d = __artImage(0, 0, AW, AH).data, sc = (__core.scene || __core.before)!, sky = __core.skyNow, camNow = __core.camNow, cv = document.createElement("canvas"); cv.width = AW * S; cv.height = AH * S;
  const x = cv.getContext("2d", { willReadFrequently: true })!; x.imageSmoothingEnabled = false; x.setTransform(S, 0, 0, S, 0, 0);
  x.drawImage(sc.high, 0, sky.off - sc.ext); x.drawImage(sc.layers.skyBase, 0, sky.off); x.drawImage(sc.clouds, sky.dx, sky.off + sc.cloudsAt); if (sky.deck) x.drawImage(sc.deck, 0, sky.deck);
  const full = x.getImageData(0, 0, AW * S, AH * S).data, s0 = new Uint8ClampedArray(AW * AH * 4); for (let j = 0, o = 0; j < AH; j++) for (let i = 0; i < AW; i++, o += 4) { const a = (j * S * AW * S + i * S) * 4; s0[o] = full[a]; s0[o + 1] = full[a + 1]; s0[o + 2] = full[a + 2]; }
  const t = sc.tower, floors = __core.phase === "climb" ? CLIMB_FLOORS : DESCENT_FLOORS, top = Math.ceil(Math.max(0, camNow - sc.ext - floors * t.floor)), bottom = Math.floor(Math.min(AH, camNow + sc.vp[1]));
  let open = 0, tower = 0, rows = 0, gap = 0;
  for (const side of [0, 1]) { let now = 0; for (let y = top; y < bottom; y++) { rows++; let bare = true; for (let c = 3; c < 40 && bare; c += 5) { const i = (y * AW + (side ? AW - 1 - c : c)) * 4; if (d[i] !== s0[i] || d[i + 1] !== s0[i + 1] || d[i + 2] !== s0[i + 2]) bare = false; } if (bare) { open++; now++; if (now > gap) gap = now; } else { tower++; now = 0; } } }
  return { open, tower, rows, gap, floor: t.floor, cam: camNow, closed: TOWER_IN * AH };
};
// The near buildings, alone on a blank canvas, in the walk's own call: rows where they stop short of the screen's edge, with nothing outside them.
export const walkEdge = (WALK_PARALLAX: Record<string, number>) => {
  const { AW, AH } = __core.place(), [sc, camY, skyOff, dx, w, floors] = window.__walk, blank = document.createElement("canvas"), only = <T extends object>(l: T) => Object.fromEntries(Object.keys(l).map((k) => [k, k === "near" ? l[k as keyof T] : blank])) as T, [, x] = __core.layer(AW, AH), sky = __core.drawSky, tower = __core.drawTower, main = __core.g;
  blank.width = blank.height = 1;
  __core.drawSky = __core.drawTower = () => {}; __core.g = x;
  __core.drawWalk({ ...sc, layers: only(sc.layers), aboveLayers: only(sc.aboveLayers!) }, camY, skyOff, dx, w, floors);
  __core.drawSky = sky; __core.drawTower = tower; __core.g = main;
  const d = x.getImageData(0, 0, AW, AH).data, sl = 1 - w * WALK_PARALLAX.near, inset = Math.ceil(sc.vp[0] * (1 - sl)) + 1;
  let longest = 0, near = 0;
  for (const [out, inn] of [[0, inset], [AW - 1, AW - 1 - inset]]) { let now = 0; for (let y = 0; y < AH; y++) { const on = d[(y * AW + inn) * 4 + 3]; if (on) near++; now = on && !d[(y * AW + out) * 4 + 3] ? now + 1 : 0; longest = Math.max(longest, now); } }
  return { longest, near, inset };
};
export const emberCount = () => {
  const { AW, AH } = __core.place(), y0 = Math.floor(AH * .1), h = Math.floor(AH * .5), d = __artImage(0, y0, AW, h).data, ember = new Set(__core.EMBER.slice(2).map((c) => parseInt(c.slice(1), 16))), slots = __core.run.results.map((r, i) => __core.trackerSlot(i)); let n = 0;
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < AW; x++, i += 4) if (ember.has(d[i] << 16 | d[i + 1] << 8 | d[i + 2]) && !slots.some((q) => Math.abs(x - q.x) < 16 && y + y0 > q.y - 6 && y + y0 < q.y + 34)) n++;
  return n;
};
// Bright pixels at each sky lantern's place on the canvas.
export const lanternArea = () => {
  const on = new Set(__core.EMBER.slice(2).map((h) => parseInt(h.slice(1), 16)));
  return __core.run.results.map((r, i): [string, number] => { const p = __core.trackerSlot(i), d = __artImage(p.x - 14, p.y - 4, 28, 36).data; let n = 0; for (let k = 0; k < d.length; k += 4) if (on.has(d[k] << 16 | d[k + 1] << 8 | d[k + 2])) n++; return [r.caught ? "caught" : r.tier, n]; });
};
// The pill: the corners of its bounding box are not panel or cord, its middle is, and the corner comes in over several steps.
export const pillFacts = ([x0, y0, w, h, r]: number[]) => {
  x0 = Math.ceil(x0); y0 = Math.ceil(y0);
  const { AW, AH } = __core.place(), d = __artImage(0, 0, AW, AH).data, at = (x: number, y: number) => { const i = (y * AW + x) * 4; return d[i] << 16 | d[i + 1] << 8 | d[i + 2]; }, inside = new Set(["#24101f", "#d9a06a", "#8a4e3e", "#2a0f22", "#1c0c17"].map((c) => parseInt(c.slice(1), 16)));
  const corners = [[x0 + 1, y0 + 1], [x0 + w - 2, y0 + 1], [x0 + 1, y0 + h - 2], [x0 + w - 2, y0 + h - 2]].filter(([x, y]) => inside.has(at(x, y))).length, insets = new Set<number>();
  for (let y = y0 + 1; y < y0 + Math.min(r, h >> 1); y++) { let x = x0; while (x < x0 + r + 6 && !inside.has(at(x, y))) x++; insets.add(x - x0); }
  return { corners, steps: insets.size, middle: inside.has(at(x0 + (w >> 1), y0 + (h >> 1))) };
};
export const bandHash = () => { const { AW, AH } = __core.place(), d = __artImage(0, Math.floor(AH * .86), AW, AH - Math.floor(AH * .86)).data; let h = 7; for (let i = 0; i < d.length; i += 4) h = Math.imul(h ^ (d[i] | d[i + 1] << 8 | d[i + 2] << 16), 0x9E3779B1); return h; };
export const contrast = (c1: number[], c2: number[]) => { const L = (c: number[]) => { const v = c.map((x) => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; }, a = L(c1), c = L(c2); return (Math.max(a, c) + .05) / (Math.min(a, c) + .05); };
export const rgbHexOf = (h: string) => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;
export const rgbOf = (s: string) => (/(\d+), (\d+), (\d+)/.exec(s) || []).slice(1).map(Number);
export const hueOfN = (v: number) => { const r = v >> 16, g = v >> 8 & 255, bl = v & 255, mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), d = mx - mn; if (!d) return null; return (mx === r ? ((g - bl) / d + 6) % 6 : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4) * 60; };
export const inFamily = (h: number | null) => h !== null && (h >= 300 || h <= 50);

// A blank page that decodes screenshots, for the checks that look at what reached the screen.
export async function analyser(b: Browser) {
  const an = await (await b.newContext()).newPage();
  await an.evaluate(() => {
    window.__decode = (b64) => new Promise((f) => { const i = new Image(); i.onload = () => { const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const x = c.getContext("2d", { willReadFrequently: true })!; x.drawImage(i, 0, 0); f({ w: i.width, h: i.height, d: x.getImageData(0, 0, i.width, i.height).data }); }; i.src = "data:image/png;base64," + b64; });
    window.__hueOf = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return null; return (mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; };
  });
  type Rect = { x: number; y: number; w: number; h: number };
  // Every colour on the screen, text edges included: how many, and any outside plum (300) to amber (50). A grey has no hue, so it counts as outside. The rarity text may be any colour
  // (answer 28), so the boxes of the word, tier name and points are left out; what's on the canvas behind them is checked exactly, from the canvas.
  const coloursOf = (buf: Buffer, rects: Rect[] = []) => an.evaluate(async ({ b64, rects }) => {
    const { d, w } = await __decode(b64), seen = new Map<number, number>();
    for (const r of rects) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { const i = (y * w + x) * 4; d[i] = 36; d[i + 1] = 16; d[i + 2] = 31; }
    for (let i = 0; i < d.length; i += 4) { const v = d[i] << 16 | d[i + 1] << 8 | d[i + 2]; seen.set(v, (seen.get(v) || 0) + 1); }
    const off: [string, number | "grey", number][] = [];
    for (const [v, n] of seen) { const r = v >> 16, g = v >> 8 & 255, bl = v & 255, h = __hueOf(r, g, bl); if (h === null ? v !== 0 : !(h >= 300 || h <= 50)) off.push(["#" + v.toString(16).padStart(6, "0"), h === null ? "grey" : Math.round(h), n]); }
    return { colours: seen.size, off: off.sort((a, c) => c[2] - a[2]) };
  }, { b64: buf.toString("base64"), rects });
  // The lettering's own pixels: those of exactly the word's colour, as a bitmap from their top-left corner.
  const lettering = (buf: Buffer, clip: Rect, col: number[]) => an.evaluate(async ({ b64, clip, col }) => {
    const { w, h, d } = await __decode(b64), pts: number[] = []; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = Math.max(0, clip.y); y < Math.min(h, clip.y + clip.h); y++) for (let x = Math.max(0, clip.x); x < Math.min(w, clip.x + clip.w); x++) {
      const a = (y * w + x) * 4; if (d[a] === col[0] && d[a + 1] === col[1] && d[a + 2] === col[2]) { pts.push(x, y); if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    }
    let hash = 7; for (let i = 0; i < pts.length; i += 2) hash = Math.imul(hash ^ ((pts[i] - x0) * 4099 + (pts[i + 1] - y0)), 0x9E3779B1);
    return { n: pts.length / 2, w: x1 - x0 + 1, h: y1 - y0 + 1, hash };
  }, { b64: buf.toString("base64"), clip, col });
  // Frames side by side, for the human's eye (answer 53).
  const strip = async (dir: string, name: string, files: string[], h: number) => {
    const list = files.filter((f) => fs.existsSync(path.join(dir, f))); if (!list.length) return;
    const url = await an.evaluate(async ({ uris, h }) => {
      const imgs = await Promise.all(uris.map((u) => new Promise<HTMLImageElement>((f) => { const i = new Image(); i.onload = () => f(i); i.src = u; })));
      const ws = imgs.map((i) => Math.round(i.width * h / i.height)), c = document.createElement("canvas");
      c.width = ws.reduce((a, b) => a + b + 4, -4); c.height = h;
      const x = c.getContext("2d")!; x.fillStyle = "#1a0a18"; x.fillRect(0, 0, c.width, h); let at = 0;
      imgs.forEach((im, i) => { x.drawImage(im, at, 0, ws[i], h); at += ws[i] + 4; });
      return c.toDataURL("image/png");
    }, { uris: list.map((f) => "data:image/png;base64," + fs.readFileSync(path.join(dir, f)).toString("base64")), h });
    fs.writeFileSync(path.join(dir, name), Buffer.from(url.split(",")[1], "base64"));
  };
  return { an, coloursOf, lettering, strip };
}
