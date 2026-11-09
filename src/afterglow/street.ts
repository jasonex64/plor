// Moved from RIFF-mocks themes/festival/street.js at fcc11e4 for docs/milestones/M14-14c-6-afterglow-in-play.md (14c-6b-1): the same
// code, typed, with nothing renamed, moved or retuned. The original header follows.
//
// Afterglow's festival street, drawn by code on whole art pixels (ticket 14c-5, themes/festival/BRIEF.md and BRIEF-2.md).
// sceneSteps() is the pre-draw of one stage's depth layers, as a generator so the game can spread it across frames, and streetLayers()
// runs it to the end. Everything is built from one world (X across, Y up, Z along
// the street) seen through one camera, so a stage is a camera position plus the set of lights that are on (ON, below). stage is
// (q - 1) / 6, and any value between two questions draws. Passing a camera stage apart from the look stage draws one position
// with another stage's lights, which is what you see while walking there, before the lights come on.
// Besides the frame a scene carries what the climb needs: the street above the frame, the open sky over that, and the repeating
// building fronts of the tower (see "The climb", below). The buildings end long before the top of the pass above the frame, so the tower
// stands behind them and is not stacked on them.
// Colour is palette indices all the way down, and the indices are tones, not colours: the world is drawn in lightness steps
// and each stage says what those steps look like. Fog, ambient and lamp light are lookup tables over the frame's own palette,
// so nothing can leave it, and the palette itself is built inside the family.

// ---------- Types: what a scene carries, for the game that draws it ----------
export type RGB = [number, number, number];
type Pt = [number, number];
type Steps<R> = Generator<undefined, R, undefined>;
/** The frame's depth layers, back to front after the sky. */
export type FrameLayerKey = "street" | "palace" | "far" | "near" | "strings";
/** The pass above the frame has no street floor. */
export type AboveLayerKey = "palace" | "far" | "near" | "strings";
/** All six on a fresh scene; the game's settle() flattens the five depth layers into `ground` and keeps only skyBase here. */
export type SceneLayers = { skyBase: HTMLCanvasElement } & Partial<Record<FrameLayerKey, HTMLCanvasElement>>;
/** A lit lantern you can see, in art pixels of the frame, for the flicker. */
export interface Light { x: number; y: number; r: number }
export interface TowerSide { back: HTMLCanvasElement; front: HTMLCanvasElement; crownBack: HTMLCanvasElement; crownFront: HTMLCanvasElement }
export interface Tower {
  floor: number; backFloor: number; front: number; back: number; capH: number; frontPeriod: number; backPeriod: number;
  sides: TowerSide[];   // [left, right]
}
export interface Scene {
  layers: SceneLayers;
  vp: [number, number];
  camZ: number;
  palette: RGB[];
  lights: Light[];
  deck: HTMLCanvasElement;
  /** The street above the frame, one canvas per layer; null once the game's settle() has flattened it into `above`. */
  aboveLayers: Record<AboveLayerKey, HTMLCanvasElement> | null;
  high: HTMLCanvasElement;
  ext: number;
  cloudsAt: number;
  clouds: HTMLCanvasElement;
  tower: Tower;
  /** Added by the game's settle(): the five frame layers in one canvas. */
  ground?: HTMLCanvasElement;
  /** Added by the game's settle(): the four layers above the frame in one canvas. */
  above?: HTMLCanvasElement;
}
type ToneKey = "shade" | "rose" | "fire" | "sky";
type LayerKey = "sky" | "street" | "palace" | "far" | "near" | "strings";
interface Tier {
  y: number; h: number; inset: number; zin: number; roof: boolean; top: boolean; rh: number; ov: number; balcony: boolean; bay: number;
  shop: boolean; lift: number; gable: boolean;
}
interface Building {
  side: number; i: number; z0: number; z1: number; out: number; wallKind: number; roofKind: number; trimRed: boolean; topKind: number;
  width: number; seed: number; tiers: Tier[]; height?: number;
}
interface Above {
  aboveLayers: Record<AboveLayerKey, HTMLCanvasElement>; high: HTMLCanvasElement; clouds?: HTMLCanvasElement; cloudsAt?: number;
}

// ---------- Colour: one family, plum through rose and red to amber (ticket round 5, answers 16 and 17) ----------
// Hue runs from -60 (plum, 300 degrees) through 0 (red) to 50 (amber). Each ladder is [hue, sat, light] at its dark end and at
// its light end, once for the first question and once for the palace: lighter is always warmer, and WARMTH walks between the two.
const TONES: Record<ToneKey, [number[], number[]]> = {
  shade: [[-57, .3, .045, -42, .2, .32], [-10, .64, .1, 16, .66, .6]],      // walls, roofs, stone, plants: separated by lightness alone
  rose: [[-50, .32, .1, -28, .3, .42], [-2, .76, .17, 28, .88, .7]],      // red things and painted trim, a step warmer than shade
  fire: [[2, .76, .36, 46, .96, .84], [10, .88, .42, 48, 1, .92]],          // only ever a light that is on
  sky: [[-58, .3, .13, -14, .34, .48], [-8, .72, .34, 47, .98, .82]],
};
const LADDER: Record<ToneKey, number> = { shade: 10, rose: 8, fire: 8, sky: 6 };
const WARMTH = [0, .05, .46, .6, .66, .9, 1];  // Q1 to Q7: small steps, with the two big moves at Q3 and Q6 (answer 1)
const IDENT = Uint8Array.from({ length: 256 }, (_, i) => i);
const AT = {} as Record<ToneKey, number[]>; let NC = 1;
for (const k in LADDER) AT[k as ToneKey] = Array.from({ length: LADDER[k as ToneKey] }, () => NC++);
const tone = (a: number[]) => (p: number) => a[Math.round(p * (a.length - 1))], shadeAt = tone(AT.shade), roseAt = tone(AT.rose), fireAt = tone(AT.fire);
const FIRE_INK = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => fireAt(i / 7)), RED_INK = [0, .17, .33, .5, .67, .83].map(roseAt);
const INK = {
  ink: [0, .11, .22, .33, .44].map(shadeAt), plant: [.11, .22, .33, .44, .56].map(shadeAt), roof: [0, .11, .22, .33, .44, .56].map(shadeAt),
  cloth: [.22, .33, .44, .56, .67].map(shadeAt), haze: [.56, .67, .78, .89, 1].map(shadeAt), stone: [.11, .22, .33, .44, .56, .67, .78].map(shadeAt),
  plaster: [.33, .44, .56, .67, .78, .89].map(shadeAt), wood: [shadeAt(.11), shadeAt(.22), shadeAt(.33), shadeAt(.44), roseAt(.33), roseAt(.5)],
  red: RED_INK, gold: [.33, .5, .67, .83, 1, 1, 1].map(roseAt), pale: [roseAt(.83), roseAt(1), roseAt(1), shadeAt(1), shadeAt(1)], fire: FIRE_INK,
};
const LIT: Record<number, number[]> = { 0: [RED_INK[3], RED_INK[5], FIRE_INK[1], FIRE_INK[2], FIRE_INK[3], FIRE_INK[4], FIRE_INK[6], FIRE_INK[7]], 1: [RED_INK[4], FIRE_INK[0], FIRE_INK[1], FIRE_INK[2], FIRE_INK[4], FIRE_INK[5], FIRE_INK[6], FIRE_INK[7]], 2: [FIRE_INK[0], FIRE_INK[1], FIRE_INK[2], FIRE_INK[3], FIRE_INK[4], FIRE_INK[5], FIRE_INK[7], FIRE_INK[7]] };
const UNLIT = RED_INK.slice(0, 5), FIRE = new Set(AT.fire), SKYT = AT.sky;
let PAL: RGB[], WARM: Uint8Array[], DARK1: Uint8Array, WET: Uint8Array, REFL: Uint8Array, PENS: Uint8Array[], mirrorLum: number;
const rgbOf = (hue: number, s: number, l: number): RGB => {
  const h = (hue + 360) % 360, c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(h / 60 % 2 - 1)), m = l - c / 2, i = flo(h / 60);
  return [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][i].map((v) => rnd((v + m) * 255)) as RGB;
};
function nearest(r: number, g: number, b: number) {
  let best = 1, bd = 1e18;
  for (let i = 1; i < NC; i++) {
    const p = PAL[i], rm = (r + p[0]) / 2, dr = r - p[0], dg = g - p[1], db = b - p[2];
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function lutOf(fn: (p: RGB, i: number) => RGB) { const l = new Uint8Array(NC); for (let i = 1; i < NC; i++) l[i] = nearest(...fn(PAL[i], i)); return l; }
const lum = (c: number) => { const p = PAL[c]; return (p[0] * .3 + p[1] * .59 + p[2] * .11) / 255; };
// This frame's palette and the lookup tables over it. WARM[l] is lamp light of strength l: warm surfaces climb fastest.
function setColours(stage: number) {
  const w = lerpArr(WARMTH, stage);
  PAL = [[0, 0, 0]];
  for (const k in TONES) {
    const [a, b] = TONES[k as ToneKey], q = a.map((x, i) => x + (b[i] - x) * w), n = AT[k as ToneKey].length;
    for (let i = 0; i < n; i++) { const t = i / (n - 1); PAL.push(rgbOf(q[0] + (q[3] - q[0]) * t, q[1] + (q[4] - q[1]) * t, q[2] + (q[5] - q[2]) * t)); }
  }
  WARM = [IDENT];
  for (let l = 1; l <= 7; l++) WARM.push(lutOf((p) => [p[0] * (1 + .16 * l) + 16 * l, p[1] * (1 + .1 * l) + 7 * l, p[2] * (1 + .01 * l) + 1 * l]));
  const darkest = PAL[AT.shade[0]], mid = PAL[AT.shade[3]];
  DARK1 = lutOf((p) => mixRGB(p, darkest, .34));
  WET = lutOf((p) => mixRGB(p, darkest, .22)); REFL = lutOf((p) => mixRGB(p, mid, .34));
  mirrorLum = lum(SKYT[flo(SKYT.length / 2)]);
  const haze = PAL[SKYT[flo(SKYT.length * .6)]], FOGS = 7;   // Far things go paler and flatter, into the sky behind them.
  PENS = [];
  for (let i = 0; i < FOGS; i++) { const t = i / (FOGS - 1) * .86; PENS.push(lutOf((p, c) => mixRGB(p, haze, FIRE.has(c) ? t * .45 : t))); }
}


// ---------- Small numeric helpers ----------
const clamp = (v: number, a: number, b: number) => v < a ? a : v > b ? b : v;
const rnd = Math.round, flo = Math.floor;
function h2(a: number, b: number) { let x = Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663); x = Math.imul(x ^ x >>> 13, 1274126177); return ((x ^ x >>> 16) >>> 0) / 4294967296; }
function vnoise(x: number, y: number) {
  const i = flo(x), j = flo(y), f = x - i, g = y - j, u = f * f * (3 - 2 * f), v = g * g * (3 - 2 * g);
  const a = h2(i, j), b = h2(i + 1, j), c = h2(i, j + 1), d = h2(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function rng(seed: number) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const lerpArr = (A: number[], stage: number) => { const p = clamp(stage, 0, 1) * 6, i = Math.min(5, flo(p)); return A[i] + (A[i + 1] - A[i]) * (p - i); };   // A has one value per question

// ---------- World ----------
const F = 400, EYE = 4.5, NEAR = 2.6, WALL_MEET = .38, WALL_MEET_TALL = .47;   // WALL_MEET: how far down the frame the street's walls reach the screen edge
const PZ = 285, STREET_END = 243, GATE_Z = 112;

// ---------- Scene state: one pre-draw at a time ----------
let W: number, H: number, cx: number, vy: number, X0: number, camZ: number, T: Uint8Array, PEN: Uint8Array = IDENT, STG: number;
let H0 = 0, YOFF = 0, LIGHTS: Light[] | null = null, BANDS: number[] | null = null, SKY_V = 0;   // the frame's height, rows the buffer sits above the frame, lit lanterns, the sky's bands
let LW: Float32Array, LS: Float32Array, LF: Float32Array, LR: Float32Array, SB: Uint8Array, CM: Uint8Array;  // light on walls, glow on the sky, pools on the floor, columns mirrored in wet stone, the sky before clouds, where clouds fell
const LY = {} as Record<LayerKey, Uint8Array>;

// ---------- Pixel routines: the only things that touch a layer ----------
const put = (x: number, y: number, c: number) => { if (x >= 0 && y >= 0 && x < W && y < H) { const i = y * W + x; T[i] = PEN[c]; LW[i] = 0; } };
function span(a: number, b: number, y: number, c: number) { if (y < 0 || y >= H) return; a = Math.max(a, 0); b = Math.min(b, W - 1); const p = PEN[c], o = y * W; for (let x = a; x <= b; x++) { T[o + x] = p; LW[o + x] = 0; } }
function rect(x: number, y: number, w: number, h: number, c: number) { for (let j = 0; j < h; j++) span(x, x + w - 1, y + j, c); }
function scan(pts: Pt[], fn: (y: number, a: number, b: number) => void) {
  const n = pts.length, P = pts.map((p): Pt => [rnd(p[0]), rnd(p[1])]);
  let top = 1e9, bot = -1e9; for (const p of P) { if (p[1] < top) top = p[1]; if (p[1] > bot) bot = p[1]; }
  top = Math.max(top, 0); bot = Math.min(bot, H - 1);
  const xs: number[] = [];
  for (let y = top; y <= bot; y++) {
    xs.length = 0; const yc = y + .5;
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[(i + 1) % n];
      if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) fn(y, Math.ceil(xs[i] - .5), Math.floor(xs[i + 1] - .5));
  }
}
function poly(pts: Pt[], c: number) { scan(pts, (y, a, b) => span(a, b, y, c)); }
function tint(pts: Pt[], lut: Uint8Array) { scan(pts, (y, a, b) => { if (y < 0 || y >= H) return; a = Math.max(a, 0); b = Math.min(b, W - 1); for (let x = a; x <= b; x++) { const i = y * W + x; if (T[i]) T[i] = lut[T[i]]; } }); }
function line(x0: number, y0: number, x1: number, y1: number, c: number, th = 1) {
  x0 = rnd(x0); y0 = rnd(y0); x1 = rnd(x1); y1 = rnd(y1);
  if (Math.max(x0, x1) < -th || Math.min(x0, x1) > W + th || Math.max(y0, y1) < -th || Math.min(y0, y1) > H + th) return;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, off = -(th - 1 >> 1);
  let e = dx - dy, x = x0, y = y0, guard = 0;
  for (;;) {
    if (dx >= dy) for (let k = 0; k < th; k++) put(x, y + off + k, c); else for (let k = 0; k < th; k++) put(x + off + k, y, c);
    if (x === x1 && y === y1 || ++guard > 6000) break;
    const e2 = 2 * e; if (e2 > -dy) { e -= dy; x += sx; } if (e2 < dx) { e += dx; y += sy; }
  }
}
function disc(cx0: number, cy0: number, r: number, c: number) { const R = r * r + r * .6; for (let y = -r; y <= r; y++) { const w = flo(Math.sqrt(Math.max(0, R - y * y))); span(cx0 - w, cx0 + w, cy0 + y, c); } }
function addLR(x: number, gy: number, sc: number, height: number, level: number, width = .62) { if (Math.abs(x - cx) > W * .44) return; const ry = Math.max(4, height * sc * .62), rx = Math.max(2, width * sc); addLight(LR, x, gy + ry * .72, rx, level, ry / rx); }
function addLight(F32: Float32Array, x: number, y: number, r: number, level: number, sq = 1) {       // sq squashes the pool for light lying on the floor
  r = Math.max(2, r); const ry = r * sq, x0 = Math.max(0, flo(x - r)), x1 = Math.min(W - 1, Math.ceil(x + r)), y0 = Math.max(0, flo(y - ry)), y1 = Math.min(H - 1, Math.ceil(y + ry));
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
    const dx = (i - x) / r, dy = (j - y) / ry, d = dx * dx + dy * dy;
    if (d < 1) { const f = 1 - Math.sqrt(d); F32[j * W + i] += level * f * f * (1.4 - .4 * f); }
  }
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + .5) / 16 - .5);
function* applyLight(buf: Uint8Array, L: Float32Array, amp = .2, max = 7): Steps<void> {
  for (let y = 0, i = 0; y < H; y++) {
    for (let x = 0; x < W; x++, i++) {
      const c = buf[i]; if (!c || L[i] < .3) continue;
      const lv = flo(L[i] + BAYER[(y & 3) * 4 + (x & 3)] * amp);
      if (lv > 0) buf[i] = WARM[Math.min(lv, max)][c];
    }
    yield;
  }
}

// ---------- Projection ----------
const pj = (X: number, Y: number, Z: number): Pt => { const z = Math.max(Z - camZ, NEAR); return [cx + F * X / z, vy + F * (EYE - Y) / z]; };
const scaleAt = (Z: number) => F / Math.max(Z - camZ, NEAR);
function setPen(z: number) { PEN = PENS[Math.min(PENS.length - 1, flo(Math.pow(Math.max(0, z - 12) / 150, .75) * PENS.length))]; }
function quiet(x: number, y: number, r: number) {                  // The prompt's patch: stays free of bright large things.
  y -= YOFF;
  return Math.abs(x - cx) < Math.min(W * .3, 150) + r && y > H0 * .24 - r && y < H0 * .43 + r;
}

// ---------- What is lit when: every light has the question it comes on at (ticket round 5, answer 18) ----------
const Qn = (n: number) => (n - 1) / 6, isOn = (on: number) => STG >= on - 1e-6;
const ON = {
  string: (z: number, u: number) => z > 170 && u < .3 ? Qn(2) : u < .72 ? Qn(3) : u < .87 ? Qn(4) : Qn(5),    // far ones first, then you pass under the gate
  eave: (u: number) => u < .35 ? Qn(4) : u < .8 ? Qn(5) : Qn(6),
  window: (u: number) => u < .04 ? Qn(4) : u < .12 ? Qn(5) : u < .86 ? Qn(6) : Qn(7),
  shop: (u: number) => u < .16 ? Qn(5) : u < .9 ? Qn(6) : Qn(7),
  stall: (u: number) => u < .16 ? Qn(5) : Qn(6),
  sign: (u: number) => u < .3 ? Qn(5) : Qn(6),
  palace: (u: number, y: number) => u > .9 ? Qn(7) : y > 20 ? Qn(2) : y > 15 ? Qn(4) : y > 10 ? Qn(5) : Qn(6),
  hall: (u: number) => u < .66 ? Qn(6) : Qn(7),
};

// ---------- Sprites ----------
function lantern(x: number, y: number, rx: number, ry: number, kind: number, lit: boolean) {    // (x, y) is the top of the body. Returns the height it took.
  x = rnd(x); y = rnd(y); rx = Math.max(1, rnd(rx)); ry = Math.max(1, rnd(ry));
  const ramp = lit ? LIT[kind] : UNLIT, cy0 = y + ry, band = lit ? INK.fire[3] : INK.gold[1];
  if (ry <= 2) { rect(x - rx + 1, y, rx * 2 - 1, ry * 2, ramp[lit ? 4 : 2]); rect(x - rx, y + 1, rx * 2 + 1, Math.max(1, ry * 2 - 2), ramp[lit ? 2 : 1]); if (rx > 1) rect(x - rx + 1, y + 1, rx * 2 - 1, Math.max(1, ry * 2 - 2), ramp[lit ? 5 : 2]); return ry * 2; }
  const ribs = Math.max(4, Math.min(10, rnd(rx / 2.4))), big = rx >= (lit ? 5 : 3);
  for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) {
    const e = dx * dx / ((rx + .3) * (rx + .3)) + dy * dy / ((ry + .3) * (ry + .3));
    if (e > 1) continue;
    const q = 1 - Math.hypot(dx / rx, (dy - .16 * ry) / ry);        // the candle sits a little low
    let k = lit ? clamp(flo(Math.pow(q, 1.2) * 1.5 * ramp.length + 1.2), 0, ramp.length - 1) : clamp(flo((.42 - dx / rx * .5 - dy / ry * .55) * 3), 0, 3);
    if (big) {
      const u = dx / (rx * Math.sqrt(Math.max(.02, 1 - dy * dy / (ry * ry)))), th = Math.asin(clamp(u, -1, 1)) / Math.PI * ribs + .5, f = th - flo(th);
      if (f < (lit ? .2 : .3) && Math.abs(u) < .97) k = Math.max(0, k - (lit ? 2 : 1));
    }
    put(x + dx, cy0 + dy, ramp[k]);
  }
  // A dark paper lantern reads by the sky along its shoulder, not by a flame.
  if (!lit && rx >= 3) for (let a = 0; a < 12; a++) { const t = -2.7 + a * .13; put(rnd(x + Math.cos(t) * (rx - 1)), rnd(cy0 + Math.sin(t) * (ry - 1)), ramp[4]); }
  const cw = Math.max(1, rnd(rx * .4)), ch = Math.max(1, rnd(ry * .1)), inset = Math.max(0, rnd(ry * .04));
  rect(x - cw, y + inset - ch + 1, cw * 2 + 1, ch, INK.ink[1]); rect(x - cw + 1, y + inset - ch, Math.max(1, cw * 2 - 1), 1, band);
  rect(x - cw, y + ry * 2 - inset, cw * 2 + 1, ch, INK.ink[1]); rect(x - cw + 1, y + ry * 2 - inset + ch, Math.max(1, cw * 2 - 1), 1, band);
  const tl = Math.max(2, rnd(ry * .75)), ty = y + ry * 2 + ch;
  if (rx >= 4) {
    const tw = Math.max(1, rnd(rx * .14));
    rect(x - tw, ty, tw * 2 + 1, Math.max(1, rnd(tl * .2)), band);
    rect(x - tw, ty + rnd(tl * .2), tw * 2 + 1, tl, INK.red[lit ? 5 : 2]);
    rect(x - tw, ty + rnd(tl * .2), Math.max(1, tw), tl, INK.red[lit ? 3 : 1]);
  } else rect(x, ty, 1, tl, INK.red[lit ? 5 : 2]);
  return ry * 2 + ch + tl;
}
function hang(x: number, y: number, rx: number, ry: number, kind: number, lit: boolean, layerLight = 1) {
  const pen = PEN; if (lit && T !== LY.far) PEN = IDENT;
  const h = lantern(x, y, rx, ry, kind, lit); PEN = pen;
  if (lit) {
    const r = Math.max(rx, ry), c = y + ry;
    if (LIGHTS) LIGHTS.push({ x: rnd(x), y: rnd(c), r });
    addLight(LS, x, c, r * 3.4, 2.1 * layerLight); addLight(LS, x, c, r * 2, 1.4 * layerLight);
    addLight(LW, x, c, r * 4.4, 2.6 * layerLight);
  }
  return h;
}
function sparkle(x: number, y: number, n: number, c = INK.fire[7], c2 = INK.fire[6]) {   // Four-point stars after reference 6.
  x = rnd(x); y = rnd(y);
  if (n <= 1) { rect(x - 1, y, 3, 1, c2); rect(x, y - 1, 1, 3, c2); put(x, y, c); return; }
  for (let i = 0; i <= n; i++) { const w = i > n * .55 ? 0 : (i > n * .25 ? 1 : 2); rect(x - w, y - i, w * 2 + 1, 1, i > n * .6 ? c2 : c); rect(x - w, y + i, w * 2 + 1, 1, i > n * .6 ? c2 : c); rect(x - i, y - w, 1, w * 2 + 1, i > n * .6 ? c2 : c); rect(x + i, y - w, 1, w * 2 + 1, i > n * .6 ? c2 : c); }
}
function foliage(x: number, y: number, r: number, ramp: number[], seed: number, spill = 0) {            // Small leaf dabs over a dark mass, lit from above, trailing strands.
  const R = rng(seed), dabs: [number, number, number, number][] = [], n = Math.min(70, rnd(r * r * .8) + 5), size = (q: number) => Math.max(1, rnd(r * .13 + R() * r * q));
  for (let i = 0; i < n; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * r; const dx = Math.cos(a) * d * 1.35, dy = Math.sin(a) * d * .62; dabs.push([x + dx, y + dy, size(.1), .5 - dy / r * .7 + (R() - .5) * .5]); }
  for (let i = 0; i < spill; i++) {
    let lx = x + (R() - .5) * r * 2.3, ly = y + r * .35; const len = r * (.8 + R() * 1.5), st = Math.max(1, r * .2);
    for (let j = 0; j < len; j += st) { lx += (R() - .5) * st * .8; ly += st; dabs.push([lx, ly, Math.max(1, rnd(r * .1)), .25 + R() * .3]); }
  }
  for (const d of dabs) disc(rnd(d[0]), rnd(d[1] + 1), d[2], ramp[0]);
  dabs.sort((a, b) => a[3] - b[3]);
  for (const d of dabs) disc(rnd(d[0]), rnd(d[1]), r > 5 ? d[2] : Math.max(0, d[2] - 1), ramp[clamp(flo(d[3] * 3.4) + 1, 1, 3)]);
  if (ramp[4] && r > 5) for (let i = 0; i < r * .9; i++) { const d = dabs[flo(R() * dabs.length)]; rect(rnd(d[0]), rnd(d[1]), 2, 2, ramp[4]); }
}
function person(x: number, by: number, h: number, seed: number, warmSide: number) {                     // From behind, simple: hair, shoulders, a robe that flares.
  const R = rng(seed), robe = [INK.red.slice(1, 5), INK.roof.slice(1, 5), INK.haze.slice(0, 4), INK.plaster.slice(1, 5), INK.wood.slice(1, 5)][flo(R() * 5)];
  x = rnd(x); by = rnd(by); h = Math.max(6, rnd(h)); const w = Math.max(1, h * .15), head = Math.max(1, rnd(h * .085));
  const top = by - h, sh = top + head * 2 + 1, hip = sh + rnd(h * .34), flare = w * (1.1 + R() * .4);
  poly([[x - w, sh], [x + w + 1, sh], [x + w * .9 + 1, hip], [x + flare + 1, by], [x - flare, by], [x - w * .9, hip]], robe[1]);
  if (h >= 10) {
    const lit = warmSide > 0 ? 1 : -1;
    poly([[x + lit * w, sh], [x + lit * w * .3, sh], [x + lit * flare * .35, by], [x + lit * flare, by]], robe[3]);
    poly([[x - lit * w, sh + 1], [x - lit * w * .55, sh + 1], [x - lit * flare * .6, by], [x - lit * flare, by]], robe[0]);
    rect(rnd(x - w * .9), hip, rnd(w * 1.8) + 1, Math.max(1, rnd(h * .04)), R() < .5 ? INK.gold[2] : robe[0]);
  }
  disc(x, top + head, head, INK.ink[1]);
  if (h >= 14) disc(x, top, Math.max(1, rnd(head * .55)), INK.ink[1]);
  if (h >= 12) rect(warmSide > 0 ? x + head : x - head, top + head, 1, head, INK.wood[3]);
  rect(rnd(x - flare), by, rnd(flare * 2) + 1, 1, INK.ink[0]);
}
function motif(x: number, y: number, w: number, h: number, kind: number, a: number, b: number) {                        // Shapes for signs: never letters from any script.
  if (h < 8 || w < 4) { rect(x + 1, y + 1, Math.max(1, w - 2), Math.max(1, h - 2), b); return; }
  const m = Math.max(3, flo(w * .7 + 1)), n = Math.max(1, flo(h / (m + 2))), step = h / n, mx = x + flo(w / 2);
  for (let i = 0; i < n; i++) {
    const c = rnd(y + step * (i + .5)), r = flo(m / 2);
    if (kind === 0) for (let k = -r; k <= r; k++) span(mx - (r - Math.abs(k)), mx + (r - Math.abs(k)), c + k, i % 2 ? a : b);
    else if (kind === 1) { disc(mx, c, r, a); disc(mx, c, Math.max(0, r - 1), b); if (r > 2) disc(mx, c, r - 2, a); }
    else if (kind === 2) { for (let k = 0; k < 3; k++) { const o = (k - 1) * Math.max(2, flo(step / 4)); line(mx - r, c + o, mx, c + o - 1, a); line(mx, c + o - 1, mx + r, c + o, a); } }
    else { rect(mx - r, c - r, r * 2 + 1, 1, a); rect(mx - r, c + r, r * 2 + 1, 1, a); rect(mx - r, c - r, 1, r * 2 + 1, a); rect(mx + r, c - r, 1, r * 2 + 1, a); if (r > 1) rect(mx - r + 2, c - r + 2, r * 2 - 3, r * 2 - 3, b); }
  }
}

// ---------- Curved tiled roof seen from the front: the piece the whole scene is built on (reference 5) ----------
// xa..xb is the eave, yt the ridge, ye the eave's height at its centre; lift bends the corners up.
function frontRoof(xa: number, xb: number, yt: number, ye: number, ridgeHalf: number, lift: number, tilePx: number, ramp: number[], trim: number[], opts: { noRidge?: boolean } = {}) {
  const xm = (xa + xb) / 2, he = (xb - xa) / 2, H0 = ye - yt;
  if (H0 < 1 || he < 1) return;
  const N = Math.max(3, rnd(he * 2 / tilePx)), rows = Math.max(2, Math.min(ramp.length, rnd(H0 / 2.5)));
  const lo = Math.max(0, flo(xa)), hi = Math.min(W - 1, Math.ceil(xb));
  const eaveAt = (x: number) => ye - lift * Math.pow(Math.min(1, Math.abs(x - xm) / he), 2.6);
  for (let x = lo; x <= hi; x++) {
    const e = eaveAt(x);
    for (let y = Math.max(0, flo(yt)); y < Math.min(H, Math.ceil(e)); y++) {
      const v = Math.max(0, (y - yt) / (e - yt)), hw = ridgeHalf + (he - ridgeHalf) * Math.pow(v, 1.7);
      const d = Math.abs(x - xm); if (d > hw) continue;
      const u = (x - xm) / hw * .5 + .5, ti = flo(u * N), fr = u * N - ti, band = flo(v * rows);
      let k = Math.min(ramp.length - 1, flo(v * .55 * ramp.length) + 1);
      if (ti & 1) k = Math.max(0, k - 1);
      if (fr * hw * 2 / N < 1 && tilePx >= 3) k = 0;
      if (tilePx >= 4 && ((y - yt) * rows / H0 % 1) * (H0 / rows) < 1 && band > 0) k = Math.max(0, k - 1);
      if (hw - d < Math.max(1, tilePx * .4)) { put(x, y, trim[1]); continue; }
      put(x, y, ramp[k]);
    }
    if (x >= lo) {
      const ey = rnd(e), th = Math.max(1, rnd(tilePx * .4));
      for (let k = 0; k < th; k++) put(x, ey - k, trim[k === 0 ? 0 : 2] ?? trim[0]);
      if (tilePx >= 3) { const cap = flo(((x - xa) / (he * 2)) * N) & 1; put(x, ey + 1, cap ? trim[1] : INK.ink[1]); put(x, ey + 2, INK.ink[0]); }
    }
  }
  if (!opts.noRidge) {
    const rh = Math.max(1, rnd(tilePx * .55)), a = rnd(xm - ridgeHalf), b = rnd(xm + ridgeHalf);
    rect(a, rnd(yt) - rh, b - a + 1, rh, ramp[1]); rect(a, rnd(yt) - rh, b - a + 1, 1, trim[1]);
    if (tilePx >= 2) for (const [ex, dir] of [[a, -1], [b, 1]]) {     // Curled ridge ends
      const c = Math.max(2, rnd(tilePx * .9)); rect(ex + (dir < 0 ? -1 : 0) * 1, rnd(yt) - rh - c, Math.max(1, rnd(c * .7)), c + rh, trim[0]); put(ex + dir * c * .7 | 0, rnd(yt) - rh - c, trim[1]);
    }
  }
}
function gableFace(xm: number, yb: number, hw: number, h: number, red: number[], gold: number) {                  // Nested triangles, after the gables in reference 5.
  for (let j = 0; j <= h; j++) { const w = rnd(hw * j / h); span(rnd(xm) - w, rnd(xm) + w, rnd(yb - h + j), red[0]); }
  if (h >= 6) {
    for (let i = 0; i < 3; i++) {
      const o = i * Math.max(2, rnd(h * .24)), t = yb - h + o * 1.2, b = yb - 1, w = hw * (b - t) / h;
      if (b - t < 3) break;
      line(xm - w, b, xm, t, i % 2 ? red[2] : gold); line(xm + w, b, xm, t, i % 2 ? red[2] : gold);
    }
    rect(rnd(xm - hw), rnd(yb) - 1, rnd(hw * 2), 1, gold);
  }
}

// ---------- A building: a stack of tiers, each with a street-facing side and a camera-facing front ----------
function buildingSpecs(side: number) {
  const R = rng(side > 0 ? 9127 : 4403), list: Building[] = []; let z = -34, i = 0;
  const OUT = [0, 2.5, .4, 3.1, 1.2, 2.2, .2, 2.8, 1.7];
  while (z < STREET_END) {
    const len = 6 + R() * 5, gap = R() < .2 ? 1 + R() * 1.5 : 0, n = 4 + flo(R() * R() * 5) + (R() < .25 ? 3 : 0);
    const wallKind = flo(R() * 4), roofKind = R() < .72 ? 0 : (R() < .6 ? 1 : 2), trimRed = R() < .55, topKind = flo(R() * 4);
    const b: Building = { side, i, z0: z, z1: z + len, out: OUT[i % OUT.length] + R() * .5, wallKind, roofKind, trimRed, topKind, width: 8 + R() * 5, seed: flo(R() * 1e9), tiers: [] };
    let y = 0, inset = 0;
    for (let k = 0; k < n; k++) {
      const h = k === 0 ? 3.7 : 2.9 + R() * .8, top = k === n - 1, roof = top || R() < .62;
      const t: Tier = { y, h, inset, zin: inset * .6, roof, top, rh: top ? 2.3 + R() * 1.4 : 1.15 + R() * .6, ov: .95 + R() * .55, balcony: k > 0 && R() < .62, bay: 1.7 + R() * .9, shop: k === 0, lift: .55 + R() * .5, gable: top ? R() < .7 : R() < .22 };
      b.tiers.push(t); y += h + (roof ? t.rh * .62 : 0); if (roof) inset += .35 + R() * .75;
    }
    b.height = y; list.push(b); z += len + gap; i++;
  }
  return list;
}
const SPECS = [buildingSpecs(-1), buildingSpecs(1)];
const WALLS = () => [
  { wall: INK.plaster, a: 2, b: 3, beam: INK.wood },
  { wall: INK.wood, a: 2, b: 3, beam: INK.red },
  { wall: INK.red, a: 1, b: 2, beam: INK.wood },
  { wall: INK.plaster, a: 1, b: 2, beam: INK.red },
];
const ROOFS = () => [INK.roof, INK.red, INK.ink];

function* drawBuilding(b: Building): Steps<void> {
  const s = b.side, X = X0 + b.out * (X0 > 8 ? 1.6 : 1), zm = b.z0 - camZ, R = rng(b.seed);
  if (zm + (b.z1 - b.z0) < NEAR || zm > 215) return;
  const near = (b.z0 + b.z1) / 2 - camZ, lod = near > 110 ? 2 : near > 58 ? 1 : 0;
  T = zm + 2 > 48 ? LY.far : LY.near; setPen(Math.max(zm, 0));
  const M = WALLS()[b.wallKind], roofRamp = ROOFS()[b.roofKind], trim = b.trimRed ? [INK.gold[3], INK.gold[5], INK.gold[2]] : [INK.gold[2], INK.gold[4], INK.gold[1]];
  const after: (() => void)[] = [];
  for (let k = b.tiers.length - 1; k >= 0; k--) {
    const t = b.tiers[k], xi = X + t.inset, z0 = b.z0 + t.zin, z1 = b.z1 - t.zin * .4, y0 = t.y, y1 = t.y + t.h, w = b.width, sc = scaleAt(z0);
    const sq = (a: number, c: number, zA: number, zB: number, col: number) => poly([pj(s * xi, a, zA), pj(s * xi, c, zA), pj(s * xi, c, zB), pj(s * xi, a, zB)], col);
    const fr = (xa: number, xb: number, a: number, c: number, col: number) => { const A = pj(s * xa, c, z0), Bq = pj(s * xb, a, z0); rect(rnd(Math.min(A[0], Bq[0])), rnd(A[1]), rnd(Math.abs(Bq[0] - A[0])) + 1, rnd(Bq[1] - A[1]) + 1, col); };
    // Walls, base colour first, the lower part of each storey one step darker for weight.
    sq(y0, y1, z0, z1, M.wall[M.b]); sq(y0, y0 + t.h * .34, z0, z1, M.wall[M.a]);
    fr(xi, xi + w, y0, y1, M.wall[M.a]); fr(xi, xi + w, y0, y0 + .4, M.wall[Math.max(0, M.a - 1)]);
    const beam = M.beam, posts = Math.max(1, rnd((z1 - z0) / t.bay)), bay = (z1 - z0) / posts;
    // Street-facing bays: posts, windows, and the shop front at ground level.
    if (lod < 2) for (let i = posts - 1; i >= 0; i--) {
      const za = z0 + i * bay, zb = za + bay, win = R(), lit = isOn((t.shop ? ON.shop : ON.window)(R()));
      const pA = pj(s * xi, 0, za + bay * .2), pB = pj(s * xi, 0, zb - bay * .2), pxw = Math.abs(pA[0] - pB[0]);
      if (t.shop) {
        sq(.2, 2.7, za + .25, zb - .25, lit ? INK.fire[4] : INK.ink[3]);
        sq(.2, 1.25, za + .25, zb - .25, lit ? INK.fire[3] : INK.ink[2]);
        if (lit) { sq(2.2, 2.7, za + .25, zb - .25, INK.fire[5]); for (let n = 0; n < 5; n++) { const zz = za + .3 + (bay - .6) * n / 5; sq(2.25, 2.8, zz, zz + (bay - .6) * .17, n % 2 ? INK.red[4] : INK.pale[3]); } const c = pj(s * xi, 1.6, za + bay / 2); addLight(LW, c[0], c[1], 3.2 * scaleAt(za), 3.2); const f = pj(s * (xi - 1.4), 0, za + bay / 2); addLight(LF, f[0], f[1], 3.5 * scaleAt(za), 3, .35); }
      } else if (win < .82) {
        const wy0 = y0 + t.h * .3, wy1 = y0 + t.h * .8, za2 = za + bay * .2, zb2 = zb - bay * .2;
        sq(wy0 - .1, wy1 + .1, za2 - .1, zb2 + .1, beam[1]);
        sq(wy0, wy1, za2, zb2, lit ? INK.fire[4] : INK.ink[3]);
        if (lit) {
          sq(wy0, wy0 + (wy1 - wy0) * .45, za2, zb2, INK.fire[5]);
          sq(wy1 - .18, wy1, za2, zb2, INK.fire[3]);
          const c = pj(s * xi, (wy0 + wy1) / 2, (za2 + zb2) / 2); addLight(LW, c[0], c[1], 1.5 * scaleAt(za), 1.5);
        } else sq(wy0, wy0 + .14, za2, zb2, INK.haze[0]);
        if (lod === 0 && pxw > 3) {
          const cols = pxw > 12 ? 3 : pxw > 7 ? 2 : 1;
          for (let n = 1; n <= cols; n++) { const zz = za2 + (zb2 - za2) * n / (cols + 1), q = pj(s * xi, wy0, zz), r = pj(s * xi, wy1, zz); line(q[0], q[1], r[0], r[1], beam[1]); }
          const hn = sc > 22 ? 3 : 1; for (let n = 1; n <= hn; n++) { const yy = wy0 + (wy1 - wy0) * n / (hn + 1), q = pj(s * xi, yy, za2), r = pj(s * xi, yy, zb2); line(q[0], q[1], r[0], r[1], beam[1]); }
        }
      } else {                                                               // A hung cloth instead of a window
        const zc = za + bay * .25, ze = zb - bay * .25; sq(y0 + .5, y1 - .3, zc, ze, b.i % 2 ? INK.red[3] : INK.cloth[3]); sq(y0 + .5, y0 + .75, zc, ze, INK.gold[2]);
      }
      if (lod === 0) { const q = pj(s * xi, y0, zb), r = pj(s * xi, y1, zb); line(q[0], q[1], r[0], r[1], beam[1], Math.max(1, rnd(.17 * scaleAt(zb)))); }
    }
    { const th = Math.max(1, rnd(.16 * sc)); for (const yy of [y0 + .02, y1 - .1]) { const q = pj(s * xi, yy, z0), r = pj(s * xi, yy, z1); line(q[0], q[1], r[0], r[1], beam[lod ? 0 : 1], th); } }
    if (lod === 0 && t.shop) tint([pj(s * xi, 0, z0), pj(s * xi, .3, z0), pj(s * xi, .3, z1), pj(s * xi, 0, z1)], DARK1);
    // The camera-facing front: columns and paper windows, flat and drawn at full scale.
    const pA = pj(s * xi, y1, z0), bY = pj(s * xi, y0, z0)[1], dirX = s;
    if (lod < 2) {
      const nb = Math.max(2, rnd(w / (t.bay * .95))), step = sc * w / nb, wy = rnd(pA[1]), hh = rnd(bY - pA[1]);
      for (let i = 0; i < nb; i++) {
        const ax = pA[0] + dirX * step * i, bx = ax + dirX * step, x0 = rnd(Math.min(ax, bx)), wd = rnd(step), lit = isOn((t.shop ? ON.shop : ON.window)(R())), sm = sc;
        if (x0 + wd < 0 || x0 > W) continue;
        const m = Math.max(1, rnd(.17 * sm)), top = wy + rnd(hh * .2), wh = rnd(hh * .52);
        if (t.shop) {
          rect(x0 + m, wy + rnd(hh * .25), wd - m, hh - rnd(hh * .25) - m, lit ? INK.fire[4] : INK.ink[2]);
          if (lit) { rect(x0 + m, wy + rnd(hh * .55), wd - m, hh - rnd(hh * .55) - m, INK.fire[3]); addLight(LW, x0 + wd / 2, wy + hh * .6, 3 * sm, 3); const f = pj(s * (xi + w * (i + .5) / nb), 0, z0 - 1); addLight(LF, f[0], f[1], 3 * sm, 2.4, .35); rect(x0 + m, wy + rnd(hh * .25), wd - m, Math.max(1, rnd(hh * .14)), i % 2 ? INK.red[4] : INK.pale[1]); }
        } else {
          rect(x0 + m + 1, top, wd - m * 2 - 1, wh, beam[1]);
          rect(x0 + m + 2, top + 1, wd - m * 2 - 3, wh - 2, lit ? INK.fire[4] : INK.ink[3]);
          if (lit) {
            rect(x0 + m + 2, top + rnd(wh * .5), wd - m * 2 - 3, wh - rnd(wh * .5) - 1, INK.fire[5]); rect(x0 + m + 2, top + 1, wd - m * 2 - 3, Math.max(1, rnd(wh * .12)), INK.fire[3]);
            addLight(LW, x0 + wd / 2, top + wh / 2, 1.5 * sm, 1.6);
          }
          if (lod === 0 && wd > 9) {
            const pitch = Math.max(3, rnd(.36 * sm)); for (let q = x0 + m + 2 + pitch; q < x0 + wd - m - 1; q += pitch) rect(q, top + 1, 1, wh - 2, beam[1]);
            for (let q = top + pitch; q < top + wh - 1; q += pitch) rect(x0 + m + 2, q, wd - m * 2 - 3, 1, beam[1]);
          }
        }
        rect(x0, wy, m, hh, beam[1]); if (m > 2) rect(x0 + m - 1, wy, 1, hh, beam[2]);
      }
      rect(rnd(Math.min(pA[0], pA[0] + dirX * sc * w)), wy, rnd(sc * w), Math.max(1, rnd(.17 * sc)), beam[1]);
    }
    // The corner post, the strongest vertical in the front.
    { const th = Math.max(1, rnd(.26 * sc)); rect(rnd(pA[0]) - (s > 0 ? 0 : th - 1), rnd(pA[1]), th, rnd(bY - pA[1]), beam[0]); }
    // The roof above this tier, and the balcony of the tier above it, which stands on that roof.
    if (t.roof) drawRoof(b, t, s, xi, z0, z1, w, y1, roofRamp, trim, lod, after);
    const up = b.tiers[k + 1];
    if (up && up.balcony && lod < 2) drawBalcony(b, up, s, X + up.inset, b.z0 + up.zin, b.z1 - up.zin * .4, lod, R, after);
    if (k === 0 && lod < 2 && R() < .8) drawSign(b, s, X, b.z0 + .3, R, after);
    yield;
  }
  for (const f of after) { f(); yield; }
}
function drawRoof(b: Building, t: Tier, s: number, xi: number, z0: number, z1: number, w: number, yE: number, ramp: number[], trim: number[], lod: number, after: (() => void)[]) {
  const ov = t.ov, rh = t.rh, zn = z0 - ov, zf = z1 + ov, L = t.lift, sc = scaleAt(zn), len = zf - zn;
  const lip = (u: number) => yE + L * Math.pow(Math.abs(2 * u - 1), 3), P = (u: number, v: number) => pj(s * (xi - ov + (ov + .15) * v), lip(u) * (1 - v) + (yE + rh) * v, zn + len * u);
  const px = Math.abs(P(0, 0)[0] - P(1, 0)[0]) || 1, tileM = .44, n = clamp(flo(len / tileM), 3, Math.max(3, flo(px / 2))), rows = lod === 2 ? 2 : 4;
  // Soffit shadow first, on the wall under the eave.
  tint([pj(s * xi, yE - .8, z0), pj(s * xi, yE, z0), pj(s * xi, yE, z1), pj(s * xi, yE - .8, z1)], DARK1);
  for (let i = n - 1; i >= 0; i--) {
    const a = i / n, c = (i + 1) / n, odd = i & 1;
    for (let r = rows - 1; r >= 0; r--) {
      const v0 = r / rows, v1 = (r + 1) / rows, k = clamp(rows === 4 ? 4 - r - odd : 3 - r * 2 - odd, 0, ramp.length - 1);
      poly([P(a, v0), P(c, v0), P(c, v1), P(a, v1)], ramp[k]);
    }
  }
  const th = Math.max(1, rnd(.14 * sc));
  for (let i = 0; i < n; i++) {
    const a = P(i / n, 0), c = P((i + 1) / n, 0);
    line(a[0], a[1] + th, c[0], c[1] + th, INK.ink[1], Math.max(1, th));
    line(a[0], a[1], c[0], c[1], i % 2 && lod === 0 ? trim[1] : trim[0], th);
  }
  // The roof end that faces us, with its gold-edged hip, plus a gable on the taller ones.
  const inner = pj(s * (xi - ov), yE, zn), outer = pj(s * (xi + w + ov), yE, zn), top = pj(0, yE + rh, zn)[1];
  const xa = Math.min(inner[0], outer[0]), xb = Math.max(inner[0], outer[0]), tp = Math.max(2, .42 * sc);
  frontRoof(xa, xb, top, inner[1], Math.max(1, (xb - xa) / 2 - rh * sc * 1.2), L * sc, tp, ramp, trim, { noRidge: !t.top });
  if (t.gable && lod < 2) {
    const xm = (xa + xb) / 2, hw = rh * sc * .78, hgt = rh * sc * .72;
    const y0 = inner[1] - rh * sc * .15;
    frontRoof(xm - hw * 1.32, xm + hw * 1.32, y0 - hgt * 1.12, y0 + 1, 1, hgt * .2, tp, ramp, trim, { noRidge: false });
    gableFace(xm, y0 - hgt * .02, hw * .92, hgt * .78, [INK.red[2], INK.red[1], INK.red[3]], trim[0]);
  }
  // Lanterns hang off the eaves of the nearer buildings.
  if (lod === 0 && sc > 8) {
    const R = rng(b.seed + t.y * 11 | 0);
    const count = sc > 16 ? 3 : 2;
    for (let i = 0; i < count; i++) if (R() < .7) {
      const u = (i + .35 + R() * .3) / count * .92, q = P(u, 0), sz = scaleAt(zn + len * u), rr = .3 * sz, dy = rnd(.32 * sz), pen = PEN;
      const lit = isOn(ON.eave(R())); after.push(() => { PEN = pen; rect(rnd(q[0]), rnd(q[1]), 1, dy + 2, INK.ink[1]); hang(q[0], q[1] + dy + 2, rr, rr * 1.2, (i + b.i) % 3 === 2 ? 1 : 0, lit, .75); });
    }
  }
}
function drawBalcony(b: Building, t: Tier, s: number, xi: number, z0: number, z1: number, lod: number, R: () => number, after: (() => void)[]) {
  const d = .78, y = t.y, yr = y + 1.08, sc = scaleAt(z0), len = z1 - z0, rail = t.bay > 2.1 ? INK.red : INK.wood;
  poly([pj(s * xi, y, z0), pj(s * xi, y, z1), pj(s * (xi - d), y, z1), pj(s * (xi - d), y, z0)], INK.wood[0]);
  poly([pj(s * (xi - d), y - .2, z0), pj(s * (xi - d), y, z0), pj(s * (xi - d), y, z1), pj(s * (xi - d), y - .2, z1)], rail[2]);
  const n = clamp(rnd(len / .46), 2, 40), bx = s * (xi - d);
  for (let i = n; i >= 0; i--) {
    const z = z0 + len * i / n, q = pj(bx, y, z), r = pj(bx, yr, z), big = i % 4 === 0;
    const px = Math.abs(pj(bx, y, z)[0] - pj(bx, y, z + len / n)[0]);
    if (px >= 2 || big) line(q[0], q[1], r[0], r[1], big ? rail[3] : rail[1], big ? Math.max(1, rnd(.09 * scaleAt(z))) : 1);
  }
  const a = pj(bx, yr, z0), c = pj(bx, yr, z1), a2 = pj(bx, y + .3, z0), c2 = pj(bx, y + .3, z1);
  line(a2[0], a2[1], c2[0], c2[1], rail[2], 1);
  line(a[0], a[1], c[0], c[1], rail[3], Math.max(1, rnd(.1 * sc)));
  line(a[0], a[1] - 1, c[0], c[1] - 1, rail[4] ?? rail[3], 1);
  if (lod === 0 && R() < .8) {
    const n2 = 1 + flo(R() * 3);
    for (let i = 0; i < n2; i++) {
      const z = z0 + len * (.1 + R() * .8), q = pj(bx, yr, z), sz = scaleAt(z), red = R() < .5, seed = flo(R() * 1e6), pen = PEN;
      after.push(() => { PEN = pen; foliage(rnd(q[0]), rnd(q[1]), Math.max(2, rnd(.55 * sz)), red ? [INK.red[0], INK.red[1], INK.red[3], INK.red[4], INK.gold[2]] : INK.plant, seed, sz > 12 ? 3 : 1); });
    }
  }
}
function drawSign(b: Building, s: number, X: number, z: number, R: () => number, after: (() => void)[]) {
  const sc = scaleAt(z), glows = isOn(ON.sign(R())), yt = 7.4 - R() * 2.6, h = 1.8 + R() * 1.6, w = .62 + R() * .3, off = .5 + R() * .4, pal = flo(R() * 3), kind = flo(R() * 4), pen = PEN;
  const q = pj(s * (X - off - w), yt, z), bracket = pj(s * X, yt + .2, z);
  after.push(() => {
    PEN = pen;
    const wp = Math.max(3, rnd(w * sc)), hp = Math.max(6, rnd(h * sc)), x = rnd(s < 0 ? q[0] - wp : q[0]), y = rnd(q[1]);
    if (x > W || x + wp < 0) return;
    line(bracket[0], bracket[1], x + wp / 2, bracket[1], INK.wood[1], Math.max(1, rnd(.06 * sc)));
    const base = [INK.red[3], INK.cloth[3], INK.ink[4]][pal], lit = [INK.red[4], INK.cloth[4], INK.haze[0]][pal];
    rect(x, y, wp, hp, base);
    rect(x, y, Math.max(1, rnd(wp * .22)), hp, lit);
    rect(x, y, wp, 1, INK.gold[3]); rect(x, y + hp - 1, wp, 1, INK.gold[3]);
    if (wp >= 6) { rect(x, y, 1, hp, INK.gold[2]); rect(x + wp - 1, y, 1, hp, INK.gold[1]); }
    motif(x + 1, y + 2, wp - 2, hp - 4, kind, INK.gold[4], INK.gold[2]);
    if (glows && hp > 12) addLight(LW, x + wp / 2, y + hp / 2, hp * .6, 1);
  });
}

// ---------- Stalls ----------
function stall(z: number, s: number, kind: number, seed: number) {
  const zp = z - camZ, len = 3.3, d = 2; if (zp < (X0 > 8 ? NEAR + .4 : 7.2) || zp > 150) return;
  const Xs = X0 - 1.75 + (X0 > 8 ? -2.2 : 0), sc = scaleAt(z), far = zp > 60, lit = isOn(ON.stall(h2(seed, 3)));
  setPen(zp); T = zp > 48 ? LY.far : LY.near;
  const stripe = [[INK.red[3], INK.pale[1]], [INK.cloth[3], INK.pale[0]], [INK.gold[1], INK.red[2]], [INK.red[2], INK.gold[3]]][kind % 4];
  const Pt = (x: number, y: number, zz: number) => pj(s * x, y, zz);
  const q4 = (a: Pt, b: Pt, c: Pt, e: Pt, col: number) => poly([a, b, c, e], col);
  // Back wall and warm inside
  q4(Pt(Xs + d, 0, z), Pt(Xs + d, 2.6, z), Pt(Xs + d, 2.6, z + len), Pt(Xs + d, 0, z + len), INK.wood[2]);
  q4(Pt(Xs + d, 1.5, z), Pt(Xs + d, 2.3, z), Pt(Xs + d, 2.3, z + len), Pt(Xs + d, 1.5, z + len), INK.wood[3]);
  if (!far) for (let i = 0; i < 6; i++) { const zz = z + .25 + (len - .5) * i / 5, a = Pt(Xs + d, 1.5, zz), b = Pt(Xs + d, 1.5, zz + .22), c = Pt(Xs + d, 1.86, zz + .22), e = Pt(Xs + d, 1.86, zz); q4(a, b, c, e, [INK.gold[1], INK.red[3], INK.plaster[4]][(i + kind) % 3]); }
  q4(Pt(Xs, 0, z + len), Pt(Xs, 2.6, z + len), Pt(Xs + d, 2.6, z + len), Pt(Xs + d, 0, z + len), INK.wood[1]);
  q4(Pt(Xs, 0, z), Pt(Xs + d, 0, z), Pt(Xs + d, 0, z + len), Pt(Xs, 0, z + len), INK.wood[1]);
  // Counter: its top is seen from above, its face toward the street.
  const ch = 1.05, cd = .85;
  q4(Pt(Xs, ch, z), Pt(Xs + cd, ch, z), Pt(Xs + cd, ch, z + len), Pt(Xs, ch, z + len), INK.wood[4]);
  q4(Pt(Xs + cd, ch, z), Pt(Xs + cd + .1, ch, z), Pt(Xs + cd + .1, ch, z + len), Pt(Xs + cd, ch, z + len), INK.wood[5]);
  q4(Pt(Xs, 0, z), Pt(Xs, ch, z), Pt(Xs, ch, z + len), Pt(Xs, 0, z + len), INK.wood[2]);
  if (!far) for (let i = 1; i < 7; i++) { const zz = z + len * i / 7, a = Pt(Xs, .05, zz), b = Pt(Xs, ch, zz); line(a[0], a[1], b[0], b[1], INK.wood[1]); }
  if (!far) { const a = Pt(Xs, ch - .16, z), b = Pt(Xs, ch - .16, z + len); line(a[0], a[1], b[0], b[1], INK.wood[3], Math.max(1, rnd(.1 * sc))); }
  q4(Pt(Xs, 0, z), Pt(Xs, ch, z), Pt(Xs + d, ch, z), Pt(Xs + d, 0, z), INK.wood[3]);
  q4(Pt(Xs, ch - .15, z), Pt(Xs, ch, z), Pt(Xs + d, ch, z), Pt(Xs + d, ch - .15, z), INK.wood[5]);
  if (!far) { for (let i = 1; i < 6; i++) { const a = Pt(Xs + d * i / 6, 0, z), b = Pt(Xs + d * i / 6, ch - .15, z); line(a[0], a[1], b[0], b[1], INK.wood[2]); } for (let i = 1; i < 4; i++) { const a = Pt(Xs + cd * i / 4, ch, z), b = Pt(Xs + cd * i / 4, ch, z + len); line(a[0], a[1], b[0], b[1], INK.wood[3]); } }
  // Goods along the counter
  if (zp < 90) {
    const n = sc > 30 ? 10 : sc > 18 ? 6 : 3;
    for (let i = n - 1; i >= 0; i--) {
      const zz = z + len * (i + .5) / n, sz = scaleAt(zz), q = Pt(Xs + .36, ch, zz), x = rnd(q[0]), y = rnd(q[1]), g = (i + kind) % 4, r = Math.max(1, rnd(.13 * sz));
      if (g === 0) { for (let k = 0; k < 3; k++) { rect(x - r * 2, y - r * (k + 1) * 2 + 1, r * 4 + 1, r * 2 - 1, INK.wood[k % 2 ? 4 : 5]); rect(x - r * 2, y - r * (k + 1) * 2 + 1, r * 4 + 1, 1, INK.gold[2]); } if (sz > 12 && lit) steam(x, y - r * 6, sz, seed + i); }
      else if (g === 1) { for (let k = -1; k <= 1; k++) { disc(x + k * r * 2, y - r, r, INK.plaster[5]); put(x + k * r * 2 - 1, y - r - 1, INK.pale[3]); } disc(x, y - r * 2, r, INK.pale[3]); }
      else if (g === 2) { for (let k = -2; k <= 2; k++) { rect(x + k * r, y - r * 4, 1, r * 4, INK.wood[5]); rect(x + k * r, y - r * 4, 1, r * 2, k % 2 ? INK.red[4] : INK.gold[2]); } }
      else { disc(x, y - r * 2, r * 2, INK.gold[2]); disc(x - flo(r / 2), y - r * 2 - flo(r / 2), r, INK.gold[3]); }
    }
  }
  // Posts
  for (const [xx, zz] of [[Xs, z], [Xs, z + len]]) { const a = Pt(xx, 0, zz), b = Pt(xx, 2.5, zz); line(a[0], a[1], b[0], b[1], INK.wood[1], Math.max(1, rnd(.09 * scaleAt(zz)))); }
  // The awning: stripes that run away from us across the street-side slope, and a scalloped edge.
  const lipX = Xs - .5, lipY = 2.45, topX = Xs + d, topY = 3.15, nS = clamp(rnd(len / .42), 3, 12);
  for (let i = nS - 1; i >= 0; i--) {
    const a = z - .15 + (len + .3) * i / nS, b = z - .15 + (len + .3) * (i + 1) / nS, c = stripe[i & 1];
    q4(Pt(lipX, lipY, a), Pt(lipX, lipY, b), Pt(topX, topY, b), Pt(topX, topY, a), c);
    if (!far) { const mx = (lipX * .55 + topX * .45), my = lipY * .55 + topY * .45; q4(Pt(lipX, lipY, a), Pt(lipX, lipY, b), Pt(mx, my, b), Pt(mx, my, a), c); }
    const sa = Pt(lipX, lipY, a), sb = Pt(lipX, lipY, b), dp = Math.max(1, rnd(.26 * scaleAt(a)));
    q4([sa[0], sa[1]], [sb[0], sb[1]], [sb[0], sb[1] + dp * .7], [(sa[0] + sb[0]) / 2, sa[1] + dp * 1.3], stripe[0]);
  }
  // The awning's end, seen from the front, a thin bright stripe.
  q4(Pt(lipX, lipY, z - .15), Pt(topX, topY, z - .15), Pt(topX, topY - .14, z - .15), Pt(lipX, lipY - .14, z - .15), INK.wood[2]);
  // Lamps under the lip: what lights the awning, the counter and the stones.
  const nL = 2;
  for (let i = 0; i < nL; i++) {
    const zz = z + len * (i + .5) / nL, q = Pt(Xs + .05, 2.05, zz), sz = scaleAt(zz), g = Pt(Xs - .9, 0, zz);
    if (sz > 5) { const rr = .17 * sz; rect(rnd(q[0]), rnd(q[1] - rr * 2), 1, rnd(rr), INK.ink[2]); lantern(q[0], q[1] - rr, rr, rr * 1.1, 1, lit); } else rect(rnd(q[0]), rnd(q[1]), 1, 1, lit ? INK.fire[6] : INK.ink[3]);
    if (lit && zp < 70) { addLight(LW, q[0], q[1], 2.1 * sz, 1.5); addLight(LF, g[0], g[1], 3.4 * sz, 2, .32); addLR(g[0], g[1], sz, 3, 2.2); }
  }
}
function steam(x: number, y: number, sc: number, seed: number) {                        // Thin curling wisps in close tones, rising from the basket.
  const R = rng(seed), n = 5, ramp = [INK.haze[3], INK.haze[4], INK.pale[0]];
  let px = x, py = y;
  for (let i = 0; i < n; i++) {
    const r = Math.max(1, rnd((.05 + i * .018) * sc));
    disc(rnd(px), rnd(py), r, ramp[0]); if (r > 1) disc(rnd(px - r * .3), rnd(py - r * .3), r - 1, ramp[i < 2 ? 2 : 1]);
    px += Math.sin(i * 1.7 + R() * 2) * .1 * sc; py -= .14 * sc;
  }
}

// ---------- Strings of lanterns across the street ----------
function stringAcross(z: number, Y: number, k: number, sag: number, lanternsPerM: number) {
  const zp = z - camZ; if (zp < 7.5 || zp > 200) return;
  const sc = scaleAt(z), sw = X0 + .5, R = rng(flo(z * 31) + k), pts: Pt[] = [], N = 26;
  for (let i = 0; i <= N; i++) { const u = i / N * 2 - 1; pts.push(pj(u * sw, Y - sag * (1 - u * u), z)); }
  const gateInFront = camZ < GATE_Z && z > GATE_Z;
  T = zp > 48 ? LY.far : gateInFront ? LY.near : LY.strings; setPen(zp);
  if (zp < 34 || k % 2 === 0) for (let i = 0; i < N; i++) line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], zp > 30 ? INK.wood[2] : INK.ink[2], Math.max(1, rnd(.03 * sc)));
  const n = Math.max(2, rnd(sw * 2 * lanternsPerM)), big = k % 3 === 0;
  if (k % 7 === 3 && zp < 80 && STG < .9) {                          // Bunting, for the rhythm change
    for (let i = 0; i < n * 3; i++) {
      const u = (i + .5) / (n * 3) * 2 - 1, q = pj(u * sw, Y - sag * (1 - u * u), z), w = Math.max(1, rnd(.13 * sc)), hh = rnd(.3 * sc);
      if (quiet(q[0], q[1], 0) && zp > 20) continue;
      poly([[q[0] - w, q[1]], [q[0] + w, q[1]], [q[0], q[1] + hh]], [INK.red[3], INK.gold[2], INK.cloth[4], INK.plaster[3]][i % 4]);
    }
    return;
  }
  for (let i = 0; i < n; i++) {
    const u = (i + .5) / n * 2 - 1, q = pj(u * sw, Y - sag * (1 - u * u), z), lit = isOn(ON.string(z, R())), oval = R() < .35, kd = R() < .68 ? 0 : (R() < .6 ? 2 : 1), rr = (big ? .54 : .41) * sc * (.9 + R() * .2);
    if ((quiet(q[0], q[1], rr) && rr > 3.2) || (rr > 10 && Math.abs(q[0] - cx) < W * .17)) continue;
    if (q[0] < -rr * 2 || q[0] > W + rr * 2) continue;
    rect(rnd(q[0]), rnd(q[1]), 1, rnd(.3 * sc), INK.ink[2]);
    const yy = q[1] + rnd(.3 * sc) + Math.max(1, rnd(rr * .12));
    hang(q[0], yy, oval ? rr * .78 : rr, oval ? rr * 1.32 : rr * .96, kd, lit);
    if (lit && zp < 60) { const g = pj(u * sw, 0, z); addLight(LF, g[0], g[1], 3 * sc, 2.1, .34); addLR(g[0], g[1], sc, Y, 3.1); }
  }
}

// ---------- Gate and bridges: frontal, close, red and gold ----------
function gate(z: number) {
  const zp = z - camZ; if (zp < 3) return;
  const sc = scaleAt(z), T0 = T; T = zp > 48 ? LY.far : LY.near; setPen(zp);
  const X = X0 + .3, c = (X_: number, Y: number) => pj(X_, Y, z), red = INK.red, gold = INK.gold;
  const lintel = 11, pw = .62;
  const col = (X_: number) => {
    const a = c(X_ - pw / 2, lintel), b = c(X_ + pw / 2, 0), x = rnd(a[0]), wd = Math.max(2, rnd(b[0] - a[0])), y = rnd(a[1]), hh = rnd(b[1] - a[1]);
    rect(x, y, wd, hh, red[3]); rect(x, y, Math.max(1, rnd(wd * .3)), hh, red[4]); rect(x + wd - Math.max(1, rnd(wd * .25)), y, Math.max(1, rnd(wd * .25)), hh, red[1]);
    if (wd >= 8) rect(x + rnd(wd * .3), y, 1, hh, red[5]);
    for (const [ya, yh] of [[4.2, .3], [0, 1.1], [9.2, .25]]) { const q = c(X_ - pw * .65, ya + yh), r = c(X_ + pw * .65, ya); rect(rnd(q[0]), rnd(q[1]), rnd(r[0] - q[0]), Math.max(1, rnd(r[1] - q[1])), ya ? gold[2] : INK.stone[3]); rect(rnd(q[0]), rnd(q[1]), rnd(r[0] - q[0]), 1, ya ? gold[3] : INK.stone[5]); }
  };
  col(-X); col(X); col(-X + 1.9); col(X - 1.9);
  // Lintel: two rows of carved panels between gold beams, then three stepped roofs.
  const beam = (Y0: number, Y1: number, X_: number, cRed: number) => { const a = c(-X_, Y1), b = c(X_, Y0); rect(rnd(a[0]), rnd(a[1]), rnd(b[0] - a[0]), rnd(b[1] - a[1]), cRed); rect(rnd(a[0]), rnd(a[1]), rnd(b[0] - a[0]), Math.max(1, rnd(.08 * sc)), gold[4]); rect(rnd(a[0]), rnd(b[1]) - 1, rnd(b[0] - a[0]), 1, gold[1]); };
  beam(9.2, 9.75, X + 1, red[2]);
  beam(10.3, 11.9, X + 1.2, red[1]);
  { // Carved panels in the lintel: lozenges and medallion, glowing a little from below.
    const a = c(0, 11.75), b = c(0, 10.45), y = rnd(a[1]), hh = rnd(b[1] - a[1]), step = Math.max(8, rnd(1.5 * sc));
    for (let x = rnd(cx) - step * 40; x < W; x += step) {
      const m = x + flo(step / 2), rr = Math.min(flo(hh / 2) - 1, flo(step / 2) - 2);
      if (Math.abs(x + step / 2 - cx) > (X + .9) * sc) continue;
      rect(x, y, 1, hh, gold[2]);
      if (rr > 1) for (let k = -rr; k <= rr; k++) span(m - (rr - Math.abs(k)), m + (rr - Math.abs(k)), y + flo(hh / 2) + k, gold[2 + (Math.abs(k) < rr * .5 ? 2 : 0)]);
    }
    if (hh > 10) { const r = rnd(hh * .72), my = y + flo(hh / 2); disc(rnd(cx), my, r + 2, red[0]); disc(rnd(cx), my, r + 1, gold[3]); disc(rnd(cx), my, r, red[3]); disc(rnd(cx), my, Math.max(1, rnd(r * .62)), gold[4]); disc(rnd(cx), my, Math.max(0, rnd(r * .28)), gold[5]); }
  }
  const trim = [gold[3], gold[5], gold[2]], tp = Math.max(2, .42 * sc), ramp = INK.roof;
  const rf = (X_: number, Y: number, rh: number, lift: number, top2: boolean) => { const a = c(-X_, Y), b = c(X_, Y), t = c(0, Y + rh); frontRoof(a[0], b[0], t[1], a[1], (b[0] - a[0]) / 2 - rh * sc * 1.1, lift * sc, tp, ramp, trim, { noRidge: !top2 }); };
  rf(X + 2.2, 12, 1.5, .9, false);
  if (sc > 5) { const a = c(-X * .34 - 1, 13.2), b = c(X * .34 + 1, 12.9); const px = rnd(a[0]), wp = rnd(b[0] - a[0]), py = rnd(a[1]), hp = rnd(b[1] - a[1]) + 4; rect(px, py, wp, hp, red[1]); rect(px, py, wp, 1, gold[4]); rect(px, py + hp - 1, wp, 1, gold[2]); const st = Math.max(4, rnd(.8 * sc)); for (let q = px + 2; q < px + wp - st; q += st) { rect(q, py + 2, st - 1, hp - 4, red[2]); rect(q + 1, py + 3, st - 3, hp - 6, gold[q % 3 === 0 ? 2 : 1]); } }
  rf(X * .34 + 2.3, 14, 1.6, .8, true);
  // Big lanterns under the lintel, and hung banners on the columns.
  const lit = isOn(Qn(3));
  for (const [X_, big] of [[-X * .62, 1], [X * .62, 1], [-X * .24, 0], [X * .24, 0]]) {
    const q = c(X_, 9.2), rr = (big ? .62 : .46) * sc;
    if (quiet(q[0], q[1], 0) && !big) continue;
    rect(rnd(q[0]), rnd(q[1]), 1, rnd(.4 * sc), INK.ink[2]);
    hang(q[0], q[1] + rnd(.4 * sc), rr, rr * .96, big ? 0 : 2, lit, 1.1);
  }
  if (lit) { const m = c(0, 9.6), f = c(0, 0); addLight(LF, f[0], f[1], (X + 1) * sc * 1.1, W > 400 ? .9 : 2.4, .55); gateGlow = [m[0], m[1], (X + 2) * sc * 1.3]; }
  for (const s of [-1, 1]) {
    const q = c(s * (X - .95) - .52, 8.6), wp = rnd(1.04 * sc), hp = rnd(4.1 * sc), x = rnd(q[0]), y = rnd(q[1]);
    rect(x, y, wp, hp, red[3]); rect(x, y, wp, 1, gold[4]); rect(x, y, Math.max(1, rnd(wp * .2)), hp, red[4]); rect(x + wp - 1, y, 1, hp, red[1]);
    motif(x + 2, y + 3, wp - 4, hp - 6, 1, gold[3], gold[1]);
    for (let k = 0; k < rnd(wp / 2); k += 2) rect(x + k * 2, y + hp, 1, 2 + (k % 3), gold[3]);
    if (lit) addLight(LW, x + wp / 2, y + hp * .4, hp * .7, 1.2);
  }
  T = T0;
}
function bridge(z: number, Y: number) {                                       // A covered walkway over the street, as in reference 1.
  const zp = z - camZ; if (zp < 5 || zp > 190) return;
  const sc = scaleAt(z); T = zp > 48 ? LY.far : LY.near; setPen(zp);
  const X = X0 + 1, a = pj(-X, Y + 2.2, z), b = pj(X, Y, z), xL = rnd(a[0]), wd = rnd(b[0] - a[0]), y = rnd(a[1]), hh = rnd(b[1] - a[1]);
  rect(xL, y, wd, hh, INK.red[1]); rect(xL, y + hh - Math.max(1, rnd(.3 * sc)), wd, Math.max(1, rnd(.3 * sc)), INK.red[3]);
  rect(xL, y + hh, wd, 1, INK.gold[2]);
  const step = Math.max(3, rnd(1.3 * sc));
  for (let x = xL + 1; x < xL + wd - step; x += step) {
    const lit = isOn(ON.hall(h2(x - xL, z | 0)));
    rect(x + 1, y + rnd(hh * .22), Math.max(1, step - 2), rnd(hh * .5), lit ? INK.fire[5] : INK.ink[3]);
    rect(x, y + 1, 1, hh - 2, INK.red[0]);
    if (lit) addLight(LW, x + step / 2, y + hh * .4, step, 1.2);
  }
  const t = pj(0, Y + 3.5, z), e = pj(-X - 1.1, Y + 2.2, z), e2 = pj(X + 1.1, Y + 2.2, z);
  frontRoof(e[0], e2[0], t[1], e[1], (e2[0] - e[0]) / 2 - 1.5 * sc, .5 * sc, Math.max(2, .42 * sc), INK.roof, [INK.gold[3], INK.gold[5], INK.gold[2]]);
}

// ---------- The palace: a stack of frontal halls with everything in close ramps (reference 5) ----------
function* palace(): Steps<void> {
  const zp = PZ - camZ, sc = scaleAt(PZ); T = LY.palace; setPen(Math.min(zp * .4, 62));
  const by = pj(0, 0, PZ)[1], c = (x: number, y: number): Pt => [cx + x * sc, by - y * sc], fine = sc >= 3.4, lod = sc >= 7 ? 2 : fine ? 1 : 0, det = lod;
  const gold = INK.gold, red = INK.red, fire = INK.fire, tr = [gold[3], gold[5], gold[2]], tp = Math.max(2, .5 * sc);
  const hall = (hw: number, y0: number, wh: number, ey: number, rh: number, eaveHW: number, lift: number, ridge: number, gable: boolean, bays: number, rail: boolean) => {
    const a = c(-hw, y0 + wh), b = c(hw, y0), x = rnd(a[0]), wd = rnd(b[0] - a[0]), y = rnd(a[1]), hh = rnd(b[1] - a[1]);
    rect(x, y, wd, hh, red[2]);
    rect(x, y, wd, Math.max(1, rnd(hh * .2)), red[0]);
    const step = wd / bays, pil = Math.max(1, rnd(.34 * sc));
    for (let i = 0; i < bays; i++) {
      const bx = rnd(x + step * i), bw = rnd(step), mid = Math.abs(i - (bays - 1) / 2) < .6;
      const px = bx + pil, pw = bw - pil, wy = y + rnd(hh * .2), wh2 = hh - rnd(hh * .28);
      if (pw > 0) {
        const lit = isOn(ON.palace(h2(i, y0 * 7 | 0), y0));
        rect(px, wy, pw, wh2, lit ? fire[4] : red[1]);
        if (lit) {
          rect(px, wy + rnd(wh2 * .45), pw, wh2 - rnd(wh2 * .45), fire[5]);
          if (det === 2) rect(px, wy + rnd(wh2 * .72), pw, wh2 - rnd(wh2 * .72), fire[6]);
          rect(px, wy, pw, Math.max(1, rnd(wh2 * .1)), fire[3]);
          addLight(LW, px + pw / 2, wy + wh2 / 2, Math.max(4, sc * 1.8), 1.8);
        }
        if (det >= 1) { const pitch = Math.max(2, rnd(.45 * sc)); for (let q = px + pitch; q < px + pw; q += pitch) rect(q, wy, 1, wh2, lit ? fire[2] : red[0]); if (pitch >= 3) for (let q = wy + pitch; q < wy + wh2; q += pitch) rect(px, q, pw, 1, lit ? fire[2] : red[0]); }
        if (mid && det === 2 && hh > 26) { rect(px + rnd(pw * .15), wy + rnd(wh2 * .1), pw - rnd(pw * .3), wh2, red[4]); rect(px + rnd(pw * .15) + 1, wy + rnd(wh2 * .1) + 1, pw - rnd(pw * .3) - 2, wh2 - 1, lit ? fire[6] : red[2]); const m = px + flo(pw / 2); for (let q = wy + 4; q < wy + wh2 - 3; q += 4) rect(m - 1, q, 3, 2, lit ? fire[2] : red[1]); }
      }
      rect(bx, y, pil, hh, red[3]); if (pil > 1) rect(bx, y, 1, hh, red[4]); if (pil > 3) rect(bx + pil - 1, y, 1, hh, red[0]);
      if (pil > 2) { rect(bx - 1, y, pil + 2, Math.max(1, rnd(.25 * sc)), gold[3]); rect(bx - 1, y + hh - Math.max(1, rnd(.3 * sc)), pil + 2, Math.max(1, rnd(.3 * sc)), gold[2]); }
    }
    rect(x + wd - pil, y, pil, hh, red[3]);
    // Bracketed beam under the eave: the row of gold dots that makes it read as carved.
    { const t = Math.max(1, rnd(.3 * sc)); rect(x - 1, y, wd + 2, t, gold[1]); if (det >= 1) { const p = Math.max(2, rnd(.5 * sc)); for (let q = x; q < x + wd; q += p * 2) rect(q, y, p, t, gold[3]); } }
    if (rail && det >= 1) {
      const ry = rnd(c(0, y0 + 1.1)[1]), fy = rnd(c(0, y0)[1]), rx0 = rnd(c(-hw - .9, 0)[0]), rw = rnd((hw + .9) * 2 * sc);
      rect(rx0, fy, rw, Math.max(1, rnd(.3 * sc)), gold[2]);
      const p = Math.max(2, rnd(.42 * sc)); for (let q = rx0; q < rx0 + rw; q += p) rect(q, ry, 1, fy - ry, q % (p * 4) < p ? gold[4] : gold[2]);
      rect(rx0, ry, rw, Math.max(1, rnd(.14 * sc)), gold[5]);
    }
    const e0 = c(-eaveHW, ey), e1 = c(eaveHW, ey), t = c(0, ey + rh);
    frontRoof(e0[0], e1[0], t[1], e0[1], ridge * sc, lift * sc, tp, INK.roof, tr, { noRidge: !gable });
    // Hanging lanterns all along the eave, the palace's own string of lights.
    if (lod >= 1) {
      const n = rnd(eaveHW * 2 / 2.7);
      for (let i = 0; i < n; i++) {
        const X_ = -eaveHW * .94 + (eaveHW * 1.88) * (i + .5) / n, q = c(X_, ey - .15 - .9 * Math.pow(Math.abs(X_ / eaveHW), 3) * -lift), rr = .36 * sc;
        rect(rnd(q[0]), rnd(q[1]), 1, 2, INK.ink[2]); hang(q[0], q[1] + 2, rr, rr * 1.15, i % 3 === 1 ? 2 : 0, isOn(ON.eave(h2(i, ey | 0))), .7);
      }
    }
  };
  // Side halls, seen only when the frame is wide.
  for (const s of [-1, 1]) {
    for (let k = 3; k >= 1; k--) {
      const x0 = s * (22 + k * 13), hwS = 8;
      const a = c(x0 - hwS, 6.4), b = c(x0 + hwS, 0), x = rnd(a[0]), wd = rnd(b[0] - a[0]);
      if (x > W || x + wd < 0) continue;
      rect(x, rnd(a[1]), wd, rnd(b[1] - a[1]), red[1]);
      const st = Math.max(3, rnd(1.7 * sc)); const wy = rnd(a[1]) + rnd(1.2 * sc), wh = rnd(3.6 * sc), pit = Math.max(2, rnd(.42 * sc)); for (let q = x + 1; q < x + wd - st; q += st) { const lit = isOn(ON.hall(h2(q, k))); rect(q + 1, wy, st - 2, wh, lit ? fire[3] : red[0]); if (lit) rect(q + 1, wy + rnd(wh * .5), st - 2, wh - rnd(wh * .5), fire[4]); for (let u = q + 1 + pit; u < q + st - 1; u += pit) rect(u, wy, 1, wh, lit ? fire[1] : red[1]); for (let u = wy + pit; u < wy + wh; u += pit) rect(q + 1, u, st - 2, 1, lit ? fire[1] : red[1]); rect(q, rnd(a[1]), 1, rnd(b[1] - a[1]), red[3]); }
      const e0 = c(x0 - hwS - 1.8, 6.4), e1 = c(x0 + hwS + 1.8, 6.4), t = c(x0, 10.2);
      frontRoof(e0[0], e1[0], t[1], e0[1], (e1[0] - e0[0]) / 2 - 3.8 * sc, .6 * sc, tp, INK.roof, tr);
      yield;
    }
  }
  hall(4.4, 23.2, 2.5, 25.7, 3.6, 7, .95, 1.5, true, 3, true);
  yield;
  hall(7.8, 17.5, 3.1, 20.6, 2.9, 10.6, .85, 5.2, false, 5, true);
  yield;
  hall(11.4, 11.1, 3.7, 14.8, 3, 14.8, .9, 8.6, false, 7, true);
  yield;
  hall(15.2, 3.7, 4.4, 8.1, 3.3, 19, 1, 11.6, false, 9, true);
  yield;
  // Centre gable on the second roof and the great one over the door.
  { const g = c(0, 15.6), w = 4.6 * sc, h = 2.4 * sc; frontRoof(g[0] - w * 1.25, g[0] + w * 1.25, g[1] - h * 1.1, g[1] + 2, 1, .3 * sc, tp, INK.roof, tr); gableFace(g[0], g[1], w * .88, h * .8, [red[2], red[1], red[3]], gold[3]); }
  { const g = c(0, 9), w = 6 * sc, h = 3 * sc; frontRoof(g[0] - w * 1.25, g[0] + w * 1.25, g[1] - h * 1.1, g[1] + 2, 1, .4 * sc, tp, INK.roof, tr); gableFace(g[0], g[1], w * .88, h * .8, [red[2], red[1], red[3]], gold[3]); }
  // Finial
  { const a = c(0, 32), b = c(0, 29.3); rect(rnd(a[0]), rnd(a[1]), Math.max(1, rnd(.3 * sc)), rnd(b[1] - a[1]), gold[3]); if (sc > 3) { disc(rnd(a[0]), rnd(c(0, 30.1)[1]), Math.max(1, rnd(.42 * sc)), gold[4]); disc(rnd(a[0]), rnd(c(0, 31)[1]), Math.max(1, rnd(.3 * sc)), gold[5]); } }
  yield;
  // Terrace and its stairs.
  const ta = c(-22, 3.7), tb = c(22, 0), tx = rnd(ta[0]), tw = rnd(tb[0] - ta[0]), ty = rnd(ta[1]), th = rnd(tb[1] - ta[1]);
  rect(tx, ty, tw, th, INK.wood[2]);
  if (det >= 1) { const p = Math.max(2, rnd(.65 * sc)); for (let r = 0; r * p < th; r++) { rect(tx, ty + r * p, tw, 1, INK.wood[1]); const o = (r & 1) * p; for (let q = tx + o; q < tx + tw; q += p * 3) rect(q, ty + r * p, 1, p, INK.wood[1]); } }
  rect(tx, ty, tw, Math.max(1, rnd(.3 * sc)), INK.wood[5]); rect(tx, ty + Math.max(1, rnd(.3 * sc)), tw, 1, gold[3]);
  const sa = c(-5, 3.7), sw = rnd(10 * sc), stepN = det ? Math.max(3, Math.min(10, rnd(th / 3))) : 2;
  rect(rnd(sa[0]) - 2, ty, sw + 4, th, INK.plaster[1]);
  for (let i = 0; i < stepN; i++) { const y = ty + rnd(th * i / stepN), hh2 = rnd(th / stepN), ex = rnd(i * .13 * sc); rect(rnd(sa[0]) - ex, y, sw + ex * 2, hh2, INK.plaster[3]); rect(rnd(sa[0]) - ex, y, sw + ex * 2, 1, INK.plaster[5]); rect(rnd(sa[0]) - ex, y + hh2 - 1, sw + ex * 2, 1, INK.plaster[1]); }
  if (lod >= 1) for (const s of [-1, 1]) for (const x_ of [6.4, 14, 20]) {
    const q = c(s * x_, 3.7); rect(rnd(q[0]), rnd(q[1]) - rnd(1.5 * sc), Math.max(1, rnd(.26 * sc)), rnd(1.5 * sc), INK.wood[1]);
    hang(q[0], q[1] - rnd(2.2 * sc), .42 * sc, .46 * sc, 2, isOn(Qn(6)), .9);
  }
  yield;
  // The palace throws light on the sky and the plaza in front of it.
  const glow = lerpArr([0, .1, .4, .5, .7, 2.2, 3.4], STG), m = c(0, 12);
  addLight(LS, m[0], m[1], 30 * sc, glow * .8); yield; addLight(LS, m[0], m[1], 60 * sc, glow * .55); yield;
  const g = pj(0, 0, PZ - 4); addLight(LF, g[0], g[1], 26 * sc, glow * .9, .22);
  for (const [x_, a, b] of [[-14, .8, 1.7], [-8, 1.05, 1.3], [-2, .9, 2], [3.5, 1.1, 1.2], [9, .85, 1.8], [14.5, 1, 1.4]]) addLR(cx + x_ * sc, g[1], sc, 26 * a + 4, glow * a, b);
  addLight(LW, c(0, 2)[0], c(0, 2)[1], 22 * sc, glow * .9);
}

// ---------- Sky ----------
// One row of the sky. Bands run from the top of the frame to the glow low in the street; y may be above the frame.
function skyRow(y: number, row: number) {
  const bands = BANDS!.length, hy = SKY_V + 30, ax = Math.max(1.5, W / H0 * 1.15), top = hy;
  for (let x = 0; x < W; x++) {
    const dx = (x - cx) / ax, dy = hy - y, d = Math.min(1, Math.sqrt(dx * dx + dy * dy) / top * .98), tv = Math.pow(1 - d, .72) * (bands - 1), i = flo(tv), f = tv - i;
    const bandPx = top / bands * 1.2, near = f * bandPx > bandPx - 2;
    T[row * W + x] = BANDS![Math.min(bands - 1, near && (x + y & 1) === 0 ? i + 1 : i)];
  }
}
function* drawClouds(): Steps<void> {
  // Clouds: lumpy masses shaded from the light low in the street, so their bellies catch the glow.
  const n = SKYT.length, ramp = [.2, .35, .55, .75, .95].map((p) => SKYT[Math.min(n - 1, flo(p * n))]), R = rng(77);
  const spots = [[-.52, .1, 1.5], [.92, .15, 1.7], [-.2, .03, 1], [-.18, .32, 1.2], [.34, .36, .9], [-.72, .48, 1.5], [.82, .5, 1.6], [-.96, .2, 1.8], [1.08, .24, 1.6], [-.4, .62, .9], [.5, .7, .8]];
  const unit = Math.min(W, 460) / 2;
  for (const sp of spots) { yield* cloud(cx + sp[0] * unit * (W > 400 ? 1.75 : 1) + STG * 26, SKY_V * sp[1] + 22, sp[2] * 34, ramp, R); yield; }
}
function* drawSky(): Steps<void> {
  T = LY.sky; PEN = IDENT; SKY_V = vy;
  const stops = SKYT.map((c) => PAL[c]), bands = 22;
  BANDS = [];
  for (let i = 0; i < bands; i++) {
    const p = i / (bands - 1) * (stops.length - 1), a = flo(p), f = p - a, q = stops[Math.min(stops.length - 1, a + 1)];
    BANDS.push(nearest(...mixRGB(stops[a], q, f)));
  }
  for (let y = 0; y < H; y++) { skyRow(y, y); yield; }
  SB = T.slice();
  yield* drawClouds();
  CM = new Uint8Array(W * H); for (let i = 0; i < CM.length; i++) CM[i] = T[i] !== SB[i] ? 1 : 0;
  // Stars only while the sky is still dark, small marks, never a light.
  const Rs = rng(55), n2 = rnd(lerpArr([.14, .12, .06, .04, 0, 0, 0], STG) * W);
  for (let i = 0; i < n2; i++) { const x = rnd(Rs() * W), y = rnd(Rs() * Rs() * vy * .75); if (lum(T[y * W + x]) < mirrorLum * .8) rect(x, y, 2, 1, INK.haze[0]); }
}
function* cloud(x: number, y: number, size: number, ramp: number[], R: () => number): Steps<void> {
  const n = 6 + flo(R() * 5), lobes: [number, number, number][] = [], base = y + size * .5, wide = size * 2.1;
  for (let i = 0; i < n; i++) { const t = i / (n - 1) * 2 - 1, r = size * (.32 + .5 * (1 - t * t)) * (.7 + R() * .5); lobes.push([x + t * wide * .78 + (R() - .5) * size * .3, base - r * (.4 + R() * .35), r]); }
  for (let i = 0; i < 6; i++) { const k = lobes[flo(R() * n)]; lobes.push([k[0] + (R() - .5) * k[2] * 1.6, k[1] - k[2] * (.2 + R() * .5), k[2] * (.35 + R() * .25)]); }
  const x0 = rnd(x - wide * 1.6), x1 = rnd(x + wide * 1.6), y0 = rnd(y - size * 1.9), y1 = rnd(base + size * .45), seed = x * .01;
  for (let py = Math.max(-YOFF, y0); py <= Math.min(H - 1 - YOFF, y1); py++) {
   for (let px = Math.max(0, x0); px <= Math.min(W - 1, x1); px++) {
    const warp = .34, wx = px + (vnoise(px * .05 + seed, py * .07) - .5) * size * warp, wy = py + (vnoise(px * .06, py * .05 + seed) - .5) * size * warp;
    let f = -1;
    for (const b of lobes) { const dx = (wx - b[0]) / 1.35, dy = wy - b[1], v = 1 - Math.sqrt(dx * dx + dy * dy) / b[2]; if (v > f) f = v; }
    const wob = Math.sin(px * .13) * 2 + Math.sin(px * .31 + 1) * 1.4;
    let l;
    if (py > base + wob) {                         // The belly tears into long thin streaks.
      const below = py - base, g = vnoise(px * .02, py * .34 + 3);
      if (!(below < size * .4 && g > .48 + below / size * .6)) continue;
      l = 3;
    } else {
      if (f <= 0) continue;
      // Bands climb from the belly, which faces the glow; the rim of the top stays in shadow.
      const up = (base - wy) / (size * 1.5), rim = f < .1 ? 1 : 0;
      l = 4.3 - up * 4.2 + (vnoise(wx * .04, wy * .09) - .5) * 1.5 - rim * 1.2;
    }
    T[(py + YOFF) * W + px] = ramp[clamp(flo(l), 0, 4)];
   }
   yield;
  }
}
function skyLanterns() {
  T = LY.far; const n = rnd(lerpArr([0, 0, 0, 3, 6, 22, 30], STG) * (W > 400 ? 1.9 : 1)), R = rng(303); PEN = IDENT;
  for (let i = 0; i < n; i++) {
    const x = cx + (R() - .5) * W * .98, y = 6 + R() * vy * .78, d = R(), r = 1 + rnd(d * d * 7);
    if (quiet(x, y, r + 8)) continue;
    const X = rnd(x), Y = rnd(y), hh = rnd(r * 2.2), ramp = LIT[i % 3 === 0 ? 2 : 1];
    if (r <= 2) { rect(X - r + 1, Y, Math.max(1, r * 2 - 1), hh, ramp[4]); rect(X - r + 1, Y + flo(hh / 2), Math.max(1, r * 2 - 1), Math.ceil(hh / 2), ramp[6]); addLight(LS, X, Y + hh / 2, 8 + r * 4, 1.4); continue; }
    for (let j = 0; j < hh; j++) { const t = j / hh, w = rnd(r * (.68 + .4 * Math.sin(t * 2.2 + .4))), k = clamp(rnd(2 + t * 5 - Math.abs(0) ), 0, 7); span(X - w, X + w, Y + j, ramp[k]); put(X - w, Y + j, ramp[Math.max(0, k - 3)]); put(X + w, Y + j, ramp[Math.max(0, k - 3)]); }
    rect(X - rnd(r * .6), Y + hh, rnd(r * 1.2) + 1, 1, INK.red[1]);
    addLight(LS, X, Y + hh / 2, r * 4.2, 2.1); addLight(LS, X, Y + hh / 2, r * 2.4, 1.3);
  }
}

// ---------- The street floor: worn stone, wet in pools, carrying a broken mirror of the scene ----------
function* drawFloor(C: Uint8Array): Steps<void> {
  T = LY.street; PEN = IDENT; const S = INK.stone, plazaZ = PZ - 21, rowM = .34, colM = .56, GL = LIT[1];
  for (let y = flo(vy) + 1; y < H; y++) {
    const dy = y - vy + .5, zp = F * EYE / dy, Z = camZ + zp, p = dy / (H - vy), hpx = rowM * dy * dy / (F * EYE), wpx = colM * F / zp;
    const ry = Z / rowM, r = flo(ry), fy = ry - r, A = .7 + p * 4.6, rowJit = h2(r, 7) * .6;
    const fog = PENS[Math.min(PENS.length - 1, flo(Math.pow(Math.max(0, zp - 12) / 150, .75) * PENS.length))];
    const band = hpx >= 2.4 && !(Z > STREET_END + 2) && ((Z + 200) % 9.5) < .62, fine = hpx >= 3, ringK = W > H ? 1 : .55;
    for (let x = 0; x < W; x++) {
      const X = (x - cx) * zp / F, cxx = X / colM + (r & 1) * .5 + rowJit, col = flo(cxx), fx = cxx - col, h = h2(r, col);
      const inPlaza = Z > STREET_END + 2;
      let k = hpx >= 1.2 ? 3 + flo(h * h * 1.55) : 3 + (vnoise(X * .28, Z * .05) * 2 | 0);
      if (band) k = 2;
            const rr = inPlaza ? Math.hypot(X, Z - plazaZ) / ringK : 0, inRing = inPlaza && rr > 8.8 && rr < 12 && ((Math.atan2(Z - plazaZ, X) * 7 / Math.PI + 40) % 2) < 1;
      if (inRing) k = Math.min(5, k + 1);
      let c = S[k];
      if (fine) {
        if (fy * hpx < 1 || (fx * wpx < 1 && wpx >= 4)) c = S[Math.max(1, k - 2)];
        else if (hpx >= 4.5 && fy * hpx < 2) c = S[k + 1];
      }
      if (inPlaza && ((rr > 8.5 && rr < 8.8) || (rr > 12 && rr < 12.2))) c = INK.gold[0];
      // Wet stone: darker and glassy, carrying the sky's colour where the sky is overhead, and broken columns of lamp light.
      const w = vnoise(X * .5 + 11, Z * .3) * .62 + vnoise(X * 1.3, Z * .8 + 5) * .38;
      const wet = w > .47, damp = !wet && w > .4 && h > .35, wob = vnoise(x * .06, y * .3 / (.25 + p));
      const brk = vnoise(x * .09 / (.25 + p), y * 1.05 / (.25 + p * .55) + 40), rip = rnd(A * Math.sin(y * .95 / (.5 + p * 2.4) + wob * 7));
      const sx = clamp(x + rip, 0, W - 1);
      if (wet) {
        c = WET[c];
        const yc = Math.min(y - 1, vy + Math.abs(x - cx) * EYE / X0), my = clamp(rnd(2 * yc - y * 1 + (wob - .5) * A), 0, H - 1), i = my * W + sx;
        if (brk > .34 && C[i] && SB[i] === C[i] && C[Math.max(0, i - 3)] === SB[Math.max(0, i - 3)] && C[i + 3] === SB[i + 3] && lum(SB[i]) > mirrorLum) c = REFL[SB[i]];
      }
      c = fog[c];
      if ((wet || damp) && brk > .37) {
        const l = LR[y * W + sx] * (wet ? 1 : .6);
        if (l >= .55) { const q = Math.min(GL.length - 1, flo(l * 2 + (brk - .5) * 1.6)); if (q >= 0) c = GL[q]; }
      }
      T[y * W + x] = c;
    }
    yield;
  }
  yield* applyLight(LY.street, LF, .3, 5);
}

// ---------- Crowd ----------
function crowd() {
  const count = rnd(lerpArr([3, 4, 12, 15, 18, 38, 30], STG) * (W > 400 ? 2 : 1)), R = rng(611), arr: [number, number, number, number][] = [];
  const atPalace = STG > .9;
  for (let i = 0; i < count; i++) {
    const zp = atPalace ? (camZ + 25 > PZ - 6 ? 21 : 24) + R() * 11 : 26 + R() * R() * 46, Z = camZ + zp, edge = R() < .6, side = R() < .5 ? -1 : 1;
    const X = side * (edge ? X0 - 2.5 - R() * .9 : R() * (X0 - 2.5)) * (atPalace ? 1.7 : 1);
    arr.push([zp, X, Z, flo(R() * 1e6)]);
  }
  arr.sort((a, b) => b[0] - a[0]);
  for (const [zp, X, Z, seed] of arr) {
    const q = pj(X, 0, Z), sc = scaleAt(Z); T = zp > 48 ? LY.far : LY.near; setPen(zp);
    person(q[0], q[1], 1.75 * sc, seed, X > 0 ? -1 : 1);
  }
}

// ---------- One pre-draw ----------
export function* sceneSteps(w: number, h: number, stage: number, camStage = stage): Steps<Scene> {
  W = w; H = H0 = h; YOFF = 0; LIGHTS = []; STG = clamp(stage, 0, 1); setColours(STG); cx = flo(w / 2); vy = rnd(h * .45);
  X0 = EYE * (W / 2) / ((H - vy) * (W < H ? WALL_MEET_TALL : WALL_MEET));
  const end = PZ - F * (30.5 - EYE) / (.93 * vy);
  camZ = lerpArr([0, 47.5, 95, 132, 168, 205, end], camStage);
  for (const k of ["sky", "street", "palace", "far", "near", "strings"] as const) LY[k] = new Uint8Array(W * H);
  LW = new Float32Array(W * H); LS = new Float32Array(W * H); LF = new Float32Array(W * H); LR = new Float32Array(W * H);

  yield* drawSky();
  yield;
  yield* palace();
  yield;
  skyLanterns();
  yield* drawStanding(true);
  addLight(LF, cx, vy + (H - vy) * .3, W * 1.1, lerpArr([0, 0, 1.2, 2, 2.3, 2.6, 2.8], STG), .7);
  yield;
  yield* lightLayers();
  yield;
  // A composite the wet stone can mirror.
  const C = new Uint8Array(W * H);
  for (const k of ["sky", "palace", "far", "near", "strings"] as const) { const b = LY[k]; for (let i = 0; i < C.length; i++) if (b[i]) C[i] = b[i]; yield; }
  yield;
  yield* drawFloor(C);
  sparkleField();
  yield;
  // Only the lanterns you can actually see will flicker.
  const lights = LIGHTS.filter((l) => { if (l.x < 0 || l.y < 0 || l.x >= W || l.y >= H) return false; const c = C[l.y * W + l.x]; return FIRE.has(c) || lum(c) > .7; });
  LIGHTS = null;
  // The clouds come apart from the sky behind them, so they can drift; together they are exactly the sky as drawn.
  const skyLit = SB.slice(); yield* applyLight(skyLit, LS, .5, 6);
  const frameSky = LY.sky, cloudsIn = new Uint8Array(W * H);
  for (let i = 0; i < frameSky.length; i++) { if (CM[i]) cloudsIn[i] = frameSky[i]; else skyLit[i] = frameSky[i]; }
  yield;
  const layers: SceneLayers = { skyBase: toCanvas(skyLit) };
  yield;
  for (const k of ["street", "palace", "far", "near", "strings"] as const) { layers[k] = toCanvas(LY[k]); yield; }
  const frameW = W, frameH = H, frameVy = vy, top = yield* drawAbove(cloudsIn);
  W = frameW; H = frameH; vy = frameVy; YOFF = 0;
  const deck = yield* drawDeck();
  W = frameW; H = frameH;
  const tower = yield* drawTower();
  W = frameW; H = frameH;
  return { layers, vp: [cx, vy], camZ, palette: PAL, lights, deck, aboveLayers: top.aboveLayers, high: top.high, ext: top.high.height, cloudsAt: top.cloudsAt!, clouds: top.clouds!, tower };
}
// Everything that stands above the floor. The stalls and the crowd never reach above the frame, so the pass over it skips them.
function* drawStanding(frame: boolean): Steps<void> {
  // Buildings, far to near on each side.
  const list = [...SPECS[0], ...SPECS[1]].sort((a, b) => b.z0 - a.z0);
  for (const b of list) { yield* drawBuilding(b); yield; }
  // Plaza halls that frame the palace on arrival.
  plazaHalls();
  yield;
  // Everything that stands in the street, far to near.
  const items: [number, () => void][] = [];
  {
    let k = 0;
    for (let z = 5; z < PZ - 16; z += 4.6 + h2(k, 3) * 2, k++) { const zz = z; const kk = k; items.push([zz, () => stringAcross(zz, 8.3 + h2(kk, 5) * 2.2, kk, (.8 + h2(kk, 6) * .6) * (X0 > 8 ? 2.6 : 1), X0 > 8 ? .24 : .44)]); }
    const SK = (z: number) => z < STREET_END;
    let j = 0;
    if (frame) for (let z = -6; SK(z); z += 3.9 + h2(j, 21) * 1.7, j++) { const zz = z, jj = j; for (const s of [-1, 1]) if (h2(jj, s + 40) > .05) items.push([zz, () => stall(zz, s, flo(h2(jj, s + 60) * 4), jj * 7 + s + 100)]); }
    items.push([GATE_Z, () => gate(GATE_Z)]); items.push([36, () => bridge(36, 10)]); items.push([168, () => bridge(168, 10)]);
  }
  items.sort((a, b) => b[0] - a[0]);
  crowdDone = false;
  for (const it of items) { if (frame && !crowdDone && it[0] - camZ < 30) { crowd(); crowdDone = true; } it[1](); yield; }
  if (frame && !crowdDone) crowd();
}
// Light lands on what the layers now hold.
function* lightLayers(): Steps<void> {
  if (gateGlow) { addLight(LW, gateGlow[0], gateGlow[1], gateGlow[2], W > 400 ? 1.5 : 2.4, .75); gateGlow = null; }
  yield;
  yield* applyLight(LY.far, LW, .18, 4); yield* applyLight(LY.near, LW, .18, 4); { const L = new Float32Array(W * H); for (let i = 0; i < L.length; i++) L[i] = Math.min(2.4, LS[i] * .4) + LW[i] * .3; yield; yield* applyLight(LY.palace, L, .15, 3); }
  yield* applyLight(LY.sky, LS, .5, 6);
}

// ---------- The climb: the same street carried on above the frame, then a tower of repeating fronts ----------
// The numbers here are proposed, ticket 14c-5.
const ABOVE_K = .8;        // how far above the frame the street is drawn, as a part of its height
const CLOUD_ROWS = 96;     // rows above the frame the clouds can reach
const HIGH_STEPS = 7;      // bands of open sky, darkening as you rise
const HIGH_DARK = .9;      // how far the top of the open sky goes toward the darkest tone
const HIGH_STARS = .05;    // stars per art pixel of width
const FLOOR_K = .2;        // one floor of the front strip, as a part of the frame's height
const BACK_FLOOR = .66;    // the back strip's floors, against the front's: further off, so smaller
const REPEAT = 3;          // floors in one strip before it repeats
const FRONT_K = [.2, .3];  // the front strip's width: the smaller of this part of the frame's width and of its height
const BACK_K = [.3, .46];  // the same for the back strip
const CAP_FLOOR = .46;     // height of the roof pieces, as a part of a floor
const DECK_K = .62;        // height of the bank of cloud that rises behind the street, as a part of the frame's height
const DECK_CLOUDS = 9;     // clouds along its top

// The street above the frame: a second pass over the same world with the buffer sitting on top of the frame, so a row here continues
// the row below it exactly, seam included (the dither runs on rows, so the offset is a multiple of 4).
function* drawAbove(cloudsIn: Uint8Array): Steps<Above> {
  const ext = (rnd(H0 * ABOVE_K) >> 2) << 2, frameCl = cloudsIn, hF = H;
  YOFF = ext; H = ext; vy += ext;
  for (const k of ["sky", "palace", "far", "near", "strings"] as const) LY[k] = new Uint8Array(W * H);
  LW = new Float32Array(W * H); LS = new Float32Array(W * H); LF = new Float32Array(W * H); LR = new Float32Array(W * H);
  // Open sky first: the same bands, then darker as you rise.
  T = LY.sky; PEN = IDENT;
  const steps: number[] = [], base = PAL[BANDS![0]], dark = PAL[AT.shade[0]];
  for (let i = 0; i < HIGH_STEPS; i++) steps.push(nearest(...mixRGB(base, dark, (i + 1) / HIGH_STEPS * HIGH_DARK)));
  for (let row = 0; row < ext; row++) {
    const y = row - ext; skyRow(y, row);
    const up = 1 - row / ext, i = flo(up * HIGH_STEPS) - 1;
    if (i >= 0) for (let x = 0; x < W; x++) { const f = up * HIGH_STEPS - i - 1; T[row * W + x] = steps[Math.min(HIGH_STEPS - 1, f > .85 && (x + row & 1) ? i + 1 : i)]; }
    yield;
  }
  const Rs = rng(58);
  for (let i = 0, n = rnd(W * HIGH_STARS); i < n; i++) { const x = flo(Rs() * W), y = flo(Rs() * Rs() * ext * .7); rect(x, y, Rs() < .3 ? 2 : 1, 1, INK.haze[0]); }
  const high = T.slice();
  yield* drawClouds();
  const cloudM = new Uint8Array(W * H), withClouds = T.slice(); for (let i = 0; i < cloudM.length; i++) cloudM[i] = T[i] !== high[i] ? 1 : 0;
  T.set(high);
  yield;
  yield* palace();
  yield;
  yield* drawStanding(false);
  yield* lightLayers();
  yield;
  // The sky took its glow; the clouds take the same one.
  yield* applyLight(withClouds, LS, .5, 6);
  const skyGlow = LY.sky, cloudUp = new Uint8Array(W * H);
  for (let i = 0; i < cloudM.length; i++) if (cloudM[i]) cloudUp[i] = withClouds[i];
  const out: Above = { aboveLayers: {} as Record<AboveLayerKey, HTMLCanvasElement>, high: toCanvas(skyGlow) };
  yield;
  for (const k of ["palace", "far", "near", "strings"] as const) { out.aboveLayers[k] = toCanvas(LY[k]); yield; }
  // The drifting clouds, frame and above it together, trimmed to the rows they use.
  const rows = CLOUD_ROWS, tall = new Uint8Array(W * (rows + hF));
  tall.set(cloudUp.subarray(W * (ext - rows)), 0); tall.set(frameCl, W * rows);
  let a = 0, b = rows + hF - 1;
  const used = (r: number) => { for (let x = 0; x < W; x++) if (tall[r * W + x]) return true; return false; };
  while (a < b && !used(a)) a++;
  while (b > a && !used(b)) b--;
  H = b - a + 1;
  out.clouds = toCanvas(tall.subarray(a * W, (b + 1) * W));
  out.cloudsAt = a - rows;
  return out;
}

// A bank of cloud, solid under its lumpy top. The sky's low glow is only ever seen in a slit between the buildings; with the street gone this hides it.
function* drawDeck(): Steps<HTMLCanvasElement> {
  const n = SKYT.length, ramp = [.2, .35, .55, .75, .95].map((p) => SKYT[Math.min(n - 1, flo(p * n))]), R = rng(99);
  YOFF = 0; H = rnd(H0 * DECK_K); T = new Uint8Array(W * H); LW = new Float32Array(W * H);
  // Solid first, then rows of cloud over it, so what shows below the top edge is more cloud, not a flat fill.
  const tops = new Int16Array(W), rows = [[.2, 1], [.5, .85], [.8, .7]];
  for (let x = 0; x < W; x++) { tops[x] = rnd(H * .3 + Math.sin(x * .021) * 16 + Math.sin(x * .053 + 1) * 8); for (let y = tops[x]; y < H; y++) T[y * W + x] = ramp[y > H * .75 ? 0 : 1]; }
  yield;
  for (const [at, big] of rows) for (let i = 0; i < DECK_CLOUDS; i++) { yield* cloud(W * (i + .5) / DECK_CLOUDS + (R() - .5) * 30, H * at + R() * H * .12, (40 + R() * 26 + W * .02) * big, ramp, R); yield; }
  return toCanvas(T);
}

// One repeating building front, seen straight on, in the same pieces as the street. side -1 is the left edge, 1 the right.
function* facade(w: number, fh: number, seed: number, side: number, pen: Uint8Array): Steps<HTMLCanvasElement> {
  const h = fh * REPEAT, R = rng(seed), sc = fh / 3.6, ov = rnd(.8 * sc), wallW = w - ov, tile = Math.max(2, rnd(.42 * sc));
  W = w; H = h; T = new Uint8Array(w * h); LW = new Float32Array(w * h); LS = new Float32Array(w * h); LF = new Float32Array(w * h);
  PEN = pen;
  for (let f = 0; f < REPEAT; f++) {
    const y0 = f * fh, rh = rnd(fh * .3), M = WALLS()[flo(R() * 4)], ramp = ROOFS()[R() < .72 ? 0 : 1], trim = R() < .55 ? [INK.gold[3], INK.gold[5], INK.gold[2]] : [INK.gold[2], INK.gold[4], INK.gold[1]];
    const wy = y0 + rnd(rh * .6), wh = y0 + fh - wy, beam = M.beam, m = Math.max(1, rnd(.2 * sc));
    rect(0, wy, wallW, wh, M.wall[M.b]); rect(0, wy + rnd(wh * .66), wallW, wh - rnd(wh * .66), M.wall[M.a]);
    const bays = Math.max(1, rnd(wallW / (2.1 * sc))), step = wallW / bays, top = y0 + rh + rnd(fh * .1), hh = rnd(fh * .38);
    for (let i = 0; i < bays; i++) {
      const x0 = rnd(i * step), wd = rnd(step), lit = isOn(ON.window(R())), cloth = R() > .82;
      if (cloth) { rect(x0 + m + 2, top - 2, wd - m * 2 - 3, hh + rnd(fh * .1), f % 2 ? INK.red[3] : INK.cloth[3]); rect(x0 + m + 2, top - 2, wd - m * 2 - 3, 2, INK.gold[2]); }
      else {
        rect(x0 + m + 1, top, wd - m * 2 - 1, hh, beam[1]);
        rect(x0 + m + 2, top + 1, wd - m * 2 - 3, hh - 2, lit ? INK.fire[4] : INK.ink[3]);
        if (lit) {
          rect(x0 + m + 2, top + rnd(hh * .5), wd - m * 2 - 3, hh - rnd(hh * .5) - 1, INK.fire[5]); rect(x0 + m + 2, top + 1, wd - m * 2 - 3, Math.max(1, rnd(hh * .12)), INK.fire[3]);
          addLight(LW, x0 + wd / 2, top + hh / 2, 1.5 * sc, 1.6);
        }
        const pitch = Math.max(3, rnd(.36 * sc));
        for (let q = x0 + m + 2 + pitch; q < x0 + wd - m - 1; q += pitch) rect(q, top + 1, 1, hh - 2, beam[1]);
        for (let q = top + pitch; q < top + hh - 1; q += pitch) rect(x0 + m + 2, q, wd - m * 2 - 3, 1, beam[1]);
      }
      rect(x0, wy, m, wh, beam[1]); if (m > 2) rect(x0 + m - 1, wy, 1, wh, beam[2]);
    }
    rect(wallW - Math.max(1, rnd(.26 * sc)), wy, Math.max(1, rnd(.26 * sc)), wh, beam[0]);
    // A balcony rail across the foot of the storey, on some floors.
    if (R() < .62) {
      const ry = y0 + fh - rnd(fh * .2), rail = R() < .5 ? INK.red : INK.wood;
      rect(0, y0 + fh - 3, wallW + rnd(ov * .5), 3, INK.wood[0]); rect(0, ry, wallW + rnd(ov * .5), Math.max(1, rnd(.1 * sc)), rail[3]);
      for (let x = 2; x < wallW + rnd(ov * .5); x += Math.max(3, rnd(.46 * sc))) rect(x, ry, 1, y0 + fh - 3 - ry, x % 4 === 0 ? rail[3] : rail[1]);
    }
    frontRoof(-w, w, y0 + 1, y0 + rh, Math.max(1, w * .5), rh * .55, tile, ramp, trim, { noRidge: true });
    // Lanterns under the eave, each with the same rule as the eaves in the street.
    for (let i = 0; i < 2; i++) {
      const x = w - ov * .7 - i * step, rr = .32 * sc, dy = rh + rnd(.2 * sc), lit = isOn(ON.eave(R()));
      if (x < 0 || R() < .3) continue;
      rect(rnd(x), y0 + rh - 2, 1, dy - rh + 3, INK.ink[1]); hang(x, y0 + dy, rr, rr * 1.2, (i + f) % 3 === 2 ? 1 : 0, lit, .75);
    }
    yield;
  }
  yield* applyLight(T, LW, .18, 4);
  if (side > 0) for (let y = 0; y < h; y++) T.subarray(y * w, (y + 1) * w).reverse();
  return toCanvas(T);
}
// A roof piece: its eave along the foot of the sprite, across the tower and past its inner edge.
function roofPiece(w: number, h: number, seed: number, side: number, withRidge: boolean) {
  W = w; H = h; T = new Uint8Array(w * h); LW = new Float32Array(w * h); PEN = IDENT;
  const R = rng(seed), tile = Math.max(2, rnd(h * .1)), trim = [INK.gold[3], INK.gold[5], INK.gold[2]];
  frontRoof(-w, w, withRidge ? rnd(h * .3) : 2, h - 4, Math.max(1, w * (withRidge ? .4 : .5)), h * .3, tile, ROOFS()[R() < .7 ? 0 : 1], trim, { noRidge: !withRidge });
  if (side > 0) for (let y = 0; y < h; y++) T.subarray(y * w, (y + 1) * w).reverse();
  return toCanvas(T);
}
function* drawTower(): Steps<Tower> {
  const fW = W, fH = H, floor = rnd(fH * FLOOR_K), backFloor = rnd(floor * BACK_FLOOR), capH = rnd(floor * CAP_FLOOR);
  const front = Math.min(rnd(fW * FRONT_K[0]), rnd(fH * FRONT_K[1])), back = Math.min(rnd(fW * BACK_K[0]), rnd(fH * BACK_K[1]));
  const t: Tower = { floor, backFloor, front, back, capH, frontPeriod: floor * REPEAT, backPeriod: backFloor * REPEAT, sides: [] };
  for (const [i, s] of [[0, -1], [1, 1]]) {
    const side = {} as TowerSide;
    side.back = yield* facade(back, backFloor, 501 + i, s, PENS[2]); yield;
    side.front = yield* facade(front, floor, 301 + i, s, IDENT); yield;
    side.crownBack = roofPiece(back, capH, 21 + i, s, true);
    side.crownFront = roofPiece(front, capH, 31 + i, s, true);
    yield;
    t.sides.push(side);
  }
  return t;
}
let crowdDone = false, gateGlow: [number, number, number] | null = null;
function plazaHalls() {
  for (const s of [-1, 1]) for (let i = 2; i >= 0; i--) {
    const z = PZ - 8 - i * 10, zp = z - camZ; if (zp < 6) continue;
    const sc = scaleAt(z); T = zp > 48 ? LY.far : LY.near; setPen(zp);
    const X = X0 * 1.9 + (X0 > 8 ? 9 : 0), a = pj(s * X, 6, z), b = pj(s * (X + 18), 0, z), x = rnd(Math.min(a[0], b[0])), wd = rnd(Math.abs(b[0] - a[0])), y = rnd(a[1]), hh = rnd(b[1] - a[1]);
    rect(x, y, wd, hh, INK.red[1]);
    const st = Math.max(4, rnd(1.8 * sc)), pil = Math.max(1, rnd(.3 * sc)), wy = y + rnd(hh * .24), wh = rnd(hh * .6), lp = Math.max(2, rnd(.4 * sc));
    for (let q = x + 1; q < x + wd; q += st) { const lit = isOn(ON.hall(h2(q, 3))); rect(q + pil, wy, st - pil, wh, lit ? INK.fire[3] : INK.red[0]); if (lit) rect(q + pil, wy + rnd(wh * .55), st - pil, wh - rnd(wh * .55), INK.fire[4]); for (let u = q + pil + lp; u < q + st; u += lp) rect(u, wy, 1, wh, lit ? INK.fire[1] : INK.red[1]); for (let u = wy + lp; u < wy + wh; u += lp) rect(q + pil, u, st - pil, 1, lit ? INK.fire[1] : INK.red[1]); rect(q, y, pil, hh, INK.red[3]); if (pil > 1) rect(q, y, 1, hh, INK.red[4]); }
    const e0 = pj(s * (X - 1.8), 6, z), e1 = pj(s * (X + 19), 6, z), t = pj(0, 9.6, z);
    frontRoof(Math.min(e0[0], e1[0]), Math.max(e0[0], e1[0]), t[1], e0[1], Math.abs(e1[0] - e0[0]) / 2 - 3.4 * sc, .7 * sc, Math.max(2, .42 * sc), INK.roof, [INK.gold[3], INK.gold[5], INK.gold[2]]);
    if (isOn(Qn(6))) addLight(LW, x + wd / 2, y + hh / 2, wd * .7, 1);
    const f = pj(s * X, 0, z); if (isOn(Qn(6))) addLight(LF, f[0], f[1], 7 * sc, 3, .3);
  }
}
function sparkleField() {
  T = LY.strings; PEN = IDENT;
  const R = rng(21), n = rnd(lerpArr([0, 0, 0, 1, 2, 6, 10], STG) * (W > 400 ? 1.6 : 1));
  for (let i = 0; i < n; i++) {
    const x = R() * W, y = R() * H * .42, big = R();
    if (quiet(x, y, 12)) continue;
    sparkle(x, y, big > .7 ? 3 : big > .4 ? 2 : 1);
  }
}
function toCanvas(buf: Uint8Array) {
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d")!, im = x.createImageData(W, H), d = im.data;
  for (let i = 0, j = 0; i < buf.length; i++, j += 4) { const k = buf[i]; if (k) { const p = PAL[k]; d[j] = p[0]; d[j + 1] = p[1]; d[j + 2] = p[2]; d[j + 3] = 255; } }
  x.putImageData(im, 0, 0);
  return c;
}

// ---------- Public ----------
// A whole scene at once, with the positions of its lit lanterns in .lights. The game keeps its own scenes, so this holds none.
export function streetLayers(w: number, h: number, stage: number, camStage = stage): Scene {
  const it = sceneSteps(w, h, stage, camStage);
  for (;;) { const s = it.next(); if (s.done) return s.value; }
}
