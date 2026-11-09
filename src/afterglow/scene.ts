// Afterglow's firework festival, playing the day's real run (docs/milestones/M14-14c-6-afterglow-in-play.md, 14c-6b-1):
// moved from RIFF-mocks `themes/festival/game.js` at fcc11e4, the look approved in docs/milestones/M14-14c-5-firework-festival.md.
// Its frame loop, layout and flow are the mock's; what changed is where the rules come from. The mock judged answers
// itself from made-up questions; here every answer and every Next goes to the server through `io`, the database
// judging (DECISIONS.md, Game 1), and the scene waits on the reply:
// - Light it charges the word plainly at once and takes its rarity when the reply lands (14c-6 answer 16).
// - Text that names no answer drops back into the box, which shakes, with today's line under it (answers 9, 23, 28).
// - Next is sent when the next box appears, after the walk and any lantern, so the walk never costs time (DECISIONS.md,
//   Game 1: Timer); the box shows no time until the reply.
// - The fuse burns from the database's time left; at zero the server is asked, and decides (DECISIONS.md, Game 1).
// - A way out, the ×, shows only while no fuse burns (answers 5, 22).
// Gone with the mock's rules: its questions, play again, the Preview bar and the counters only its check read (14c-6b-2
// brings back what the check needs).
// Every motion is a function of the game clock and seeded indices, so nothing accumulates and a frame can be drawn from
// the clock alone.
import { AFTERGLOW, POINTS_PER_QUESTION, RARITY_BONUS_FRACTION } from "@/config/tunables";
import { normalize, type Tier } from "@/content/puzzle";
import { sceneSteps, streetLayers, type Scene as Street } from "./street";

const {
  FPS, FRAME_SLACK_MS, REF_TALL, REF_WIDE, EDGE, PROMPT_Y, PROMPT_W, LATE_SECONDS, FUSE_CSS, FUSE_MIN, PROMPT_R, PILL_STEP, TWIST,
  FUSE_HOT, SPARK_EARLY, SPARK_LATE, HEAD_GLOW, FLY_EARLY, FLY_LATE, FLY_REACH, FLY_LIFE, SPIT_EARLY, SPIT_LATE, SPIT_REACH,
  SPIT_LIFE, SHAKE_MAX, SHAKE_HZ, CLOUD_DRIFT, CLOUD_PERIOD, CLOUD_HOME, FLICKER_HZ, FLICKER_SHARE, IDLE_SPARKS, IDLE_SPARK_LIFE,
  IDLE_SPARK_RISE, WORD_SIZE, WORD_MARGIN, CHARGE_Y, BURST_Y, WORD_ENTER, BOX_PAD, RUMBLE, DIP, DIP_FROM, CHARGE_S, CHARGE_SPARKS,
  CLIMB_S, CLIMB_FLOORS, CLIMB_IN, CLIMB_OUT, WORD_RISE, WOBBLE, SWAY_TURNS, SWAY_END, WORD_EDGE, BLAST_N, BLAST_S, BLAST_R,
  LAUNCH_SHAKE, LAUNCH_SHAKE_S, TOWER_IN, BACK_RATE, SKY_END, DECK_UP, DECK_START, TRAIL_N, TRAIL_STEP, TRAIL_SPREAD, TRAIL_INK,
  BURST_S, BLOOM_S, BURST_R, BURST_ROOM_W, BURST_ROOM_H, PEONY_N, CHRYS_N, WILLOW_N, CHRYS_RING, WILLOW_DROP, WILLOW_TRAIL,
  WILLOW_FROM, GLITTER_N, GLITTER_LIFE, GLITTER_FROM, GLITTER_IN, GLITTER_HZ, GLITTER_FALL, GLOW_R, GLOW_FOR, GLOW, RESULT_AT,
  COUNT_S, BUTTON_AT, LANTERN_R, BOB_PX, BOB_S, DRIFT_S, DESCENT_FLOORS, LAND_AT, WALK_ZOOM, WALK_PARALLAX, ARRIVE_S, MAJOR,
  LIGHT_STEPS, LIGHT_BAND, EMBERS, DUD_CHARGE_S, DUD_LIFT_S, DUD_FALL_S, DUD_SMOKE_S, DUD_LIFT, TIMEUP_S, SMOKE_PUFFS, SMOKE_LIFE,
  SMOKE_RISE, RESULTS_FADE_S, OVER_BUTTON_AT, LETTER_LOWER, LETTER_BURN, LETTER_SPUTTER, LETTER_DROP, LETTER_RX, LETTER_Y,
  LETTER_FLICKER, LETTER_SMOKE, LETTER_SPARKS, POP_STEPS, POP_STEP_S, PREDRAW_SLICE_MS, REFUSE_STEPS, REFUSE_STEP_MS,
} = AFTERGLOW;

// ---------- The art's own colours (DECISIONS.md, Styling: drawn art keeps its colours), as the mock had them ----------
type Ink = Tier | "caught" | "timeup";
// proposed, ticket 14c-5 (answers 28, 35): gold, lime, sky blue, each further from the amber street; a dud and a time-out aren't rarities, and stay ash
export const WORD_INK: Record<Ink, string> = { common: "#ffd23c", uncommon: "#b6f23c", rare: "#6fd0ff", caught: "#d9a99c", timeup: "#d9a99c" };
// proposed, ticket 14c-5 (answer 33): each rarity's firework, dark to near white, built on its WORD_INK at step 4. These replace EMBER on the burst, trail, blast and the sparks round the word's box.
const RAMP: Record<Tier, readonly string[]> = {
  common: ["#3a2400", "#6e4600", "#a86e00", "#dc9a10", "#ffd23c", "#ffe37a", "#fff0b4", "#fffbe6"],
  uncommon: ["#1c3208", "#345c10", "#5a9416", "#86c71e", "#b6f23c", "#d2f97c", "#e9fcb8", "#f8ffe6"],
  rare: ["#0e2a4a", "#14507a", "#1f7fb0", "#36a6dc", "#6fd0ff", "#a8e4ff", "#d6f3ff", "#f2fbff"],
};
const LANTERN_INK = { lit: ["#9c2a34", "#d14a28", "#f08a24", "#ffc04d", "#ffe9a8"], low: ["#5c1a36", "#9c2a34", "#d14a28", "#d14a28", "#f08a24"], dark: ["#2a0f22", "#3a2130", "#54323f", "#54323f", "#6e4650"] };   // proposed, ticket 14c-5
// Plum to amber, dark to near-white gold (ticket round 5, answers 16 and 17). Everything the game adds to the street is drawn from these.
const EMBER = ["#2a0f22", "#5c1a36", "#9c2a34", "#d14a28", "#f08a24", "#ffc04d", "#ffe9a8", "#fff7e0"];
const SMOKE = ["#54323f", "#6e4650", "#8c5f63", "#a8787a"];
const ASH = "#1c0c17", CORD_LIGHT = "#d9a06a", CORD_DARK = "#8a4e3e";
const PANEL = "#24101f";

// The mock's words (14c-5), less play again; Walk on on every question, Q7's too (14c-6 answer 29), and See results on the
// ending list, which leaves full screen for today's cards (answer 21).
const WORDS = {
  submit: "Light it", placeholder: "Name a firework…", letters: "Damp fuses", continue: "Walk on", results: "See results",
  tiers: {
    common: { name: "Peony", flavour: "A fine round bloom. The crowd knew it by heart." },
    uncommon: { name: "Chrysanthemum", flavour: "A rarer bloom. Few in the crowd saw it coming." },
    rare: { name: "Kamuro", flavour: "Empty sky, until you. It blazes there now." },
  },
  caught: { name: "Dud", flavour: "The host lit that one first. Tonight's show ends here." },
  timeup: { name: "Fuse out", note: "Nothing lit", flavour: "Twenty seconds, and the fuse burned down." },
  complete: { name: "Show's over", flavour: "Seven shells up, and the street stayed to watch." },
} as const;

// ---------- What the scene and the page say to each other ----------
// An answered question as the run state gives it (src/game/runs.ts, AnsweredQuestion): total adds the provisional
// rarity bonus, which only sizes the burst (14c-5 answer 11); the screen shows points alone (14c-6 answers 7, 24).
export type Result = { answer: string; caught: boolean; tier: Tier; points: number; total: number };
// A question the database has opened: its prompt, the letters taken by then, and its time left.
export type Asked = { prompt: string; stolen: string[]; msLeft: number };
// What the next question takes, while a safe answer waits for Next (src/game/runs.ts, RunState.next): the letter taken
// there, or null, and every letter taken by then.
export type Upcoming = { steals: string | null; stolen: string[] };
// The server's reply to an answer. listed: it named an answer; over says whether the run ended with it, and next is what
// the next question takes (null when there is none). offList: it named none, a free retry. timeUp: the database refused
// it as late. failed: any other error, which the page shows; nothing is retried (DECISIONS.md, Error handling).
export type Reply =
  | { kind: "listed"; result: Result; hostSaid: string[]; next: Upcoming | null; over: boolean }
  | { kind: "offList" }
  | { kind: "timeUp" }
  | { kind: "failed" };
export type Io = {
  answer(text: string): Promise<Reply>;
  // null: Next failed, which the page shows.
  next(): Promise<Asked | null>;
  // The fuse is out: the database says whether time is up ("over"), or the question is still open, with its time left.
  timeUp(): Promise<Asked | "over" | null>;
  seeResults(): void;
  leave(): void;
  // Something the scene can't go on from, for the page to show (DECISIONS.md, Error handling: the client shows the error).
  fault(err: unknown): void;
};
// Where a run picks up: a question in play, or a safe answer's sky result waiting for Walk on (14c-6, Design: a run
// waiting for Next shows that question's sky result again).
export type Start = {
  total: number;
  msQuestion: number;
  results: Result[];
  at: { kind: "ask"; asked: Asked } | { kind: "result"; hostSaid: string[]; next: Upcoming };
};
// The page's elements the scene writes into, by their data-part names.
const PART_NAMES = [
  "screen", "name", "hud", "hudQ", "hudScore", "ask", "qnum", "secs", "qtext", "form", "answer", "submit", "letters", "note", "word",
  "result", "rTier", "rAns", "rHost", "rRecap", "rPts", "rFlav", "rBtn", "lett", "caption", "verdict", "out",
] as const;
type PartName = (typeof PART_NAMES)[number];

type Phase = "letter" | "open" | "ask" | "wait" | "charge" | "dud" | "climb" | "burst" | "result" | "leaving" | "descent" | "arrive" | "timeup" | "over";
// The way out shows while no fuse burns: on the sky result, the walk, a lantern and the ending list (answer 5).
const WAY_OUT: ReadonlySet<Phase> = new Set(["result", "leaving", "descent", "arrive", "letter", "over"]);
type Walk = "tiny" | "major";
type Ending = "caught" | "timeup" | "complete";
type Pill = { panel: HTMLCanvasElement; cord: HTMLCanvasElement; burnt: HTMLCanvasElement; cells: [number, number][]; w: number; h: number; a: number; T: number; ox: number; oy: number };
type Fuse = Pill & { x0: number; y0: number; now: HTMLCanvasElement; nx: CanvasRenderingContext2D; r: number; done: number };
type Burst = { tier: Tier; R: number; cx: number; cy: number; seed: number; glow: HTMLCanvasElement[]; linger: boolean; at: number };
type Flight = { sway: number; turns: number; tier: Tier; dur: number };
// The word on its way: pending until the reply lands, then the answer; timeup for the word left in the box at the end.
type Word = { kind: "pending" | "safe" | "caught" | "timeup"; answer: string; tier: Tier; total: number; points: number };
type Dissolve = { c: HTMLCanvasElement; x: CanvasRenderingContext2D; px: Uint32Array; outward: boolean; out: Uint32Array; image: ImageData; step: number };
type LetterState = "lit" | "low" | "dark";
type LetterNow = { L: string; y: number; state: LetterState; sputter?: number; drop?: number };
type Lantern = { sprites: Record<LetterState, HTMLCanvasElement>; w: number; h: number; rx: number; cx0: number; glow: HTMLCanvasElement; font: number };

const fract = (x: number) => x - Math.floor(x);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const mod = (a: number, n: number) => ((a % n) + n) % n;
const fmt = (n: number) => n.toLocaleString("en-US");
const stageOf = (q: number) => (q - 1) / 6;
function hash(i: number, salt = 0) { let h = Math.imul((i | 0) ^ 0x9E3779B9, 0x85EBCA6B) ^ Math.imul(salt | 0, 0xC2B2AE35); h ^= h >>> 16; h = Math.imul(h, 0x7FEB352D); h ^= h >>> 15; return (h >>> 0) / 4294967296; }
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + .5) / 16);
function layer(w: number, h: number, read?: boolean): [HTMLCanvasElement, CanvasRenderingContext2D] { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d", read ? { willReadFrequently: true } : undefined)!; x.imageSmoothingEnabled = false; return [c, x]; }
const easeOut = (k: number, p = 2) => 1 - Math.pow(1 - clamp01(k), p);
const climbEase = (k: number) => 1 - Math.pow(1 - Math.pow(clamp01(k), CLIMB_IN), CLIMB_OUT);
const FRAME_KEYS = ["street", "palace", "far", "near", "strings"] as const;
// The type scale for the window as it is, from the mock (`layout()` at fcc11e4): the scene's, and How to play's (14c-6d).
export const typeScale = () => Math.min(3, innerHeight / 375, innerWidth / 195);
const ABOVE_KEYS = ["palace", "far", "near", "strings"] as const;

// Starts the scene in root, the page's Afterglow layer, where start says, and returns its stop. fontFamily: the family
// next/font gave Handjet, loaded before the text is measured. Everything it draws or writes is inside root.
export function startScene(root: HTMLElement, fontFamily: string, start: Start, io: Io): () => void {
  const parts = Object.fromEntries(PART_NAMES.map((n) => {
    const el = root.querySelector<HTMLElement>(`[data-part="${n}"]`);
    if (!el) throw new Error(`Afterglow is missing its ${n}`);
    return [n, el];
  })) as Record<PartName, HTMLElement>;
  const $ = <T extends HTMLElement = HTMLElement>(n: PartName) => parts[n] as T;
  const screen = $<HTMLCanvasElement>("screen"), answerBox = $<HTMLInputElement>("answer"), rBtn = $<HTMLButtonElement>("rBtn");
  const g = screen.getContext("2d", { alpha: false })!;
  const QUESTIONS = start.total, Q_SECONDS = start.msQuestion / 1000;
  function rc(x: number, y: number, w: number, h: number, c: string) { g.fillStyle = c; g.fillRect(Math.floor(x), Math.floor(y), w, h); }

  // ---------- The run, as the server last told it ----------
  let upcoming: Upcoming | null = start.at.kind === "result" ? start.at.next : null, hostSaid: string[] = start.at.kind === "result" ? start.at.hostSaid : [];
  // At a sky result the letters taken so far are the next question's, less the one it takes.
  const takenNow = start.at.kind === "ask" ? start.at.asked.stolen : upcoming!.stolen.filter((l) => l !== upcoming!.steals);
  const run = { q: start.results.length + (start.at.kind === "ask" ? 1 : 0), taken: takenNow, results: [...start.results], over: false };
  // A taken letter's key does nothing (G11): each character normalized as the server normalizes text, as today's box did.
  const isTakenKey = (ch: string) => run.taken.some((letter) => normalize(ch).includes(letter));
  const runScore = () => run.results.reduce((s, r) => s + r.points, 0);
  // Moves to the next question; false after the last one.
  function advance() { if (run.q >= QUESTIONS) { run.over = true; return false; } run.q++; if (upcoming) run.taken = upcoming.stolen; upcoming = null; return true; }

  // ---------- The screen: one portrait design at any size, on whole device pixels ----------
  let S = 1, AW = 0, AH = 0, DPR = 1, K = 2, U = 1, fuseW: number = FUSE_MIN;
  const view = { hud: { x: 0, y: 0, w: 0, h: 0 }, prompt: { x: 0, y: 0, w: 0, h: 0 }, sky: { x0: 0, x1: 0, y0: 0, y1: 0 } };
  const dev = (v: number) => Math.round(v * S) / S;   // an art-unit position, on a whole screen pixel
  const skyTop = () => Math.round(AH * SKY_END);

  function snapSize(el: HTMLElement, wArt?: number) {   // Sizes an element to whole art pixels, so its edges stay on the grid.
    el.style.height = "auto";
    el.style.width = wArt ? wArt * U + "px" : "max-content";
    const r = el.getBoundingClientRect();
    const w = wArt || Math.ceil(r.width / U), h = Math.ceil(r.height / U);
    el.style.width = w * U + "px"; el.style.height = h * U + "px";
    return { w, h };
  }
  const setBox = (el: HTMLElement, x: number, y: number) => { el.style.left = x * U + "px"; el.style.top = y * U + "px"; };
  function layout() {
    DPR = window.devicePixelRatio || 1;
    const dw = Math.round(innerWidth * DPR), dh = Math.round(innerHeight * DPR);
    S = Math.max(1, Math.round(dh / (dh > dw ? REF_TALL : REF_WIDE)));
    AW = Math.ceil(dw / S); AH = Math.ceil(dh / S);
    // A device-resolution canvas, so each layer can land on a whole screen pixel and glide; the art is still drawn from art-resolution images, so its pixels stay square (answer 31).
    // Sized by a transform, not a width: layout rounds to 1/64 of a CSS px, which at a DPR of 3 would break the whole-pixel scale.
    screen.width = AW * S; screen.height = AH * S;
    screen.style.width = AW * S + "px"; screen.style.height = AH * S + "px"; screen.style.transform = `scale(${1 / DPR})`;
    g.setTransform(S, 0, 0, S, 0, 0);
    g.imageSmoothingEnabled = false;
    U = S / DPR;
    K = typeScale();
    root.style.setProperty("--u", U + "px"); root.style.setProperty("--k", String(K)); root.style.setProperty("--gap", EDGE * U + "px");
    buildLightMask();
    buildLanternArt();
    fit();
  }
  function fit() {
    const hud = $("hud"), ask = $("ask"), out = $("out");
    $("hudScore").textContent = "9,999"; const hb = snapSize(hud); $("hudScore").textContent = fmt(shown);
    view.hud = { x: AW - EDGE - hb.w, y: EDGE, w: hb.w, h: hb.h };
    setBox(hud, view.hud.x, view.hud.y);
    setBox($("name"), EDGE, EDGE);
    fuseW = Math.max(FUSE_MIN, Math.round(FUSE_CSS * K / U));
    const pw = Math.min(AW - 2 * (EDGE + fuseW), Math.round(PROMPT_W * K / U)), px0 = Math.floor((AW - pw) / 2);
    const wasHidden = ask.hidden; ask.hidden = false;
    const pb = snapSize(ask, pw); ask.hidden = wasHidden;
    const py = Math.round(AH * PROMPT_Y);
    view.prompt = { x: px0, y: py, w: pw, h: pb.h };
    setBox(ask, px0, py);
    buildFuse();
    // The gap the sky lanterns float in: under the HUD's row and above the prompt, never behind either.
    const top = view.hud.y + view.hud.h + 3 + LANTERN_R.rare, bottom = py - fuseW - 4 - LANTERN_R.rare * 3;
    view.sky = { x0: Math.floor(AW * .24), x1: Math.ceil(AW * .76), y0: top, y1: Math.max(top, bottom) };
    // The way out sits where the mock's Preview bar did, at the foot on the left, clear of the HUD and the prompt.
    const wasOut = out.hidden; out.hidden = false;
    const ob = snapSize(out); out.hidden = wasOut;
    setBox(out, EDGE, AH - EDGE - ob.h);
    root.style.setProperty("--out-w", ob.w * U + "px");
    if (!$("result").hidden) placeResult();
  }

  // ---------- Scenes: this stage's and the next one's, and nothing else (brief 3) ----------
  // A scene comes from sceneSteps a slice per frame. `scene` is where we stand, lit. `next` is the next stage, lit. `before` is the next
  // stage's camera with this stage's lights, what you see walking there: it keeps its separate layers for the zoom, and the other two flatten theirs.
  let scene: Street | null = null, next: Street | null = null, before: Street | null = null, held: HTMLCanvasElement | null = null;
  type Want = { stage: number; cam: number; keepLayers: boolean; take: (s: Street) => void };
  let job: (Want & { it: Generator<undefined, Street, undefined> }) | null = null;
  const waiting: Want[] = [];
  function settle(sc: Street, keepLayers: boolean) {
    if (!keepLayers) {
      const [c, x] = layer(AW, AH);
      for (const k of FRAME_KEYS) x.drawImage(sc.layers[k]!, 0, 0);
      const [ac, ax] = layer(AW, sc.ext);
      for (const k of ABOVE_KEYS) ax.drawImage(sc.aboveLayers![k], 0, 0);
      sc.ground = c; sc.above = ac; sc.layers = { skyBase: sc.layers.skyBase }; sc.aboveLayers = null;
    }
    return sc;
  }
  function want(stage: number, cam: number, keepLayers: boolean, take: (s: Street) => void) { waiting.push({ stage, cam, keepLayers, take }); }
  function pump(budget: number) {
    const t0 = performance.now();
    for (;;) {
      if (!job) {
        const w = waiting.shift();
        if (!w) break;
        job = { ...w, it: sceneSteps(AW, AH, w.stage, w.cam) };
      }
      const s = job.it.next();
      if (s.done) { const j = job; job = null; j.take(settle(s.value, j.keepLayers)); }
      if (performance.now() - t0 >= budget) break;
    }
  }
  // Needed now and not ready: finish it here, which stalls.
  function finishPredraw() { if (job || waiting.length) pump(Infinity); }
  const planNext = () => { if (!next) { const st = stageOf(Math.min(run.q + 1, QUESTIONS)); want(st, st, false, (s) => { next = s; }); } };
  const sceneNow = () => scene!;

  // ---------- Layers on the art canvas ----------
  function drawSky(x: CanvasRenderingContext2D, sc: Street, skyOff: number, dx: number) {
    if (skyOff > 0) x.drawImage(sc.high, 0, skyOff - sc.ext);
    x.drawImage(sc.layers.skyBase, 0, skyOff);
    x.drawImage(sc.clouds, dx, skyOff + sc.cloudsAt);
    // The bank starts below the horizon, hidden by the street, and comes up behind it as the view rises.
    if (skyOff > 0) { const v = skyOff + sc.vp[1] + 24 - DECK_UP * AH * clamp01(skyOff / skyTop() / DECK_START), top = x === g ? dev(v) : Math.round(v); x.drawImage(sc.deck, 0, top); }
  }
  function drawGround(sc: Street, camY: number) {
    if (sc.ground) { g.drawImage(sc.ground, 0, camY); return; }
    for (const k of FRAME_KEYS) g.drawImage(sc.layers[k]!, 0, camY);
  }
  // One strip, repeating down from phase by whole periods. Every piece keeps the same fraction of a pixel, so no seam opens; whole source rows land on whole screen pixels.
  function tile(img: HTMLCanvasElement, x: number, top: number, bottom: number, phase: number, period: number) {
    const w = img.width;
    for (let y = phase + Math.floor((top - phase) / period) * period; y < bottom; y += period) {
      const sy = Math.max(0, Math.floor(top - y)), h = Math.min(period - sy, Math.ceil(bottom - y));
      if (h > 0) g.drawImage(img, 0, sy, w, h, x, y + sy, w, h);
    }
  }
  // The tower stands behind the street, not on top of it: its foot is at the horizon, so the street's own roofs always stand in front of it and it can never
  // float clear of them. It closes in from the screen's edges as the view rises, because at rest none of it is there.
  function drawTower(sc: Street, camY: number, floors: number) {
    const t = sc.tower, r0 = clamp01(camY / (TOWER_IN * AH)), r = r0 * r0 * (3 - 2 * r0), foot = Math.min(AH, camY + sc.vp[1]);
    if (r <= 0) return;
    const heightF = sc.ext + floors * t.floor, topF = camY - heightF, topB = camY - sc.ext - Math.round(floors * t.floor * .8);
    if (topF - t.capH >= AH) return;
    const scroll = dev(camY * BACK_RATE), inB = dev(t.back * r), inF = dev(t.front * r);
    t.sides.forEach((s, i) => {
      const x = i ? AW - inB : inB - t.back;
      tile(s.back, x, Math.max(0, topB), foot, scroll, t.backPeriod);
      g.drawImage(s.crownBack, x, topB - t.capH + 3);
    });
    t.sides.forEach((s, i) => {
      const x = i ? AW - inF : inF - t.front;
      tile(s.front, x, Math.max(0, topF), foot, camY, t.frontPeriod);
      g.drawImage(s.crownFront, x, topF - t.capH + 3);
    });
  }
  // The whole world at a height: camY rows of it have dropped out of the bottom of the frame.
  function drawWorld(sc: Street, camY: number, skyOff: number, dx: number, floors: number, jolt = 0) {
    drawSky(g, sc, skyOff, dx);
    if (floors) drawTower(sc, camY, floors);
    if (camY < AH) drawGround(sc, camY + jolt);
    if (camY > 0 && camY - sc.ext < AH) g.drawImage(sc.above!, 0, camY + jolt - sc.ext);
  }
  // Drifted clouds leave a gap at the frame's edge, which only the buildings hide, so they are home before the buildings leave it (CLOUD_HOME).
  const cloudX = (t: number, away = 1) => dev(Math.sin(t / CLOUD_PERIOD * 6.2832) * CLOUD_DRIFT * away);
  // The way down and the walk: each layer scaled about the vanishing point, the near ones most, and each layer's part above the frame scaled with it, so no row
  // parts from the one below. w is how much of the walk is left. The only scaling in the game (answer 9). A layer shrunk off the frame's edge leaves a margin,
  // so its own edge pixels stay under it there.
  function drawWalk(sc: Street, camY: number, skyOff: number, dx: number, w: number, floors: number) {
    drawSky(g, sc, skyOff, dx);
    drawTower(sc, camY, floors);
    const [vx, vy] = sc.vp, mx = Math.ceil(w * vx) + 1, my = Math.ceil(w * (AH - vy)) + 1;
    for (const k of FRAME_KEYS) {
      const img = sc.layers[k]!, sl = 1 - w * WALK_PARALLAX[k], up = k === "street" ? null : sc.aboveLayers![k], top = vy + (-sc.ext - vy) * sl + camY;
      if (camY < AH) {
        if (k === "street" || k === "near") {
          g.drawImage(img, 0, 0, mx, AH, 0, camY, mx, AH); g.drawImage(img, AW - mx, 0, mx, AH, AW - mx, camY, mx, AH);
          g.drawImage(img, 0, AH - my, AW, my, 0, AH - my + camY, AW, my);
        }
        g.drawImage(img, vx * (1 - sl), vy * (1 - sl) + camY, AW * sl, AH * sl);
      }
      if (up && camY > 0 && top < AH) {
        if (k === "near") {   // As in the frame above: the scaled layer stops short of the edges, so its outermost columns stay under it at full size.
          const t0 = camY - sc.ext;
          g.drawImage(up, 0, 0, mx, sc.ext, 0, t0, mx, sc.ext); g.drawImage(up, AW - mx, 0, mx, sc.ext, AW - mx, t0, mx, sc.ext);
        }
        g.drawImage(up, vx * (1 - sl), top, AW * sl, sc.ext * sl);
      }
    }
  }

  // ---------- Small art ----------
  function star(x: number, y: number, n: number, c: string, c2: string) {   // Four-point stars after reference 6.
    x = Math.floor(x); y = Math.floor(y); g.fillStyle = c;
    if (n <= 0) { g.fillRect(x, y, 1, 1); return; }
    if (n === 1) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); return; }
    g.fillRect(x - n, y, n * 2 + 1, 1); g.fillRect(x, y - n, 1, n * 2 + 1);
    if (n >= 3) { const a = n >> 1; g.fillRect(x - a, y - 1, a * 2 + 1, 3); g.fillRect(x - 1, y - a, 3, a * 2 + 1); }
    g.fillStyle = c2; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3);
    if (n >= 4) g.fillRect(x - 1, y - 1, 3, 3);
  }
  // A round stepped glow: rings of ever fewer pixels in two-pixel cells, thinning as it fades, with no alpha.
  const u32 = (hex: string) => { const v = parseInt(hex.slice(1), 16); return (255 << 24 | (v & 255) << 16 | (v & 0xff00) | v >> 16) >>> 0; };
  function glowImage(w: number, h: number, cx: number, cy: number, R: number, cols: readonly string[], dens: number) {
    const [c, x] = layer(w, h), im = x.createImageData(w, h), d = new Uint32Array(im.data.buffer), ints = cols.map(u32);
    for (let j = 0; j + 1 < h; j += 2) for (let i = 0; i + 1 < w; i += 2) {
      const e = Math.hypot(i + 1 - cx, j + 1 - cy) / R; if (e >= 1) continue;
      if (BAYER[(j >> 1 & 3) * 4 + (i >> 1 & 3)] > Math.pow(1 - e, 1.4) * dens * 1.25) continue;
      const v = ints[e < .34 ? 2 : e < .64 ? 1 : 0], a = j * w + i;
      d[a] = d[a + 1] = d[a + w] = d[a + w + 1] = v;
    }
    x.putImageData(im, 0, 0);
    return c;
  }
  const GLOW_STEPS = [1, .62, .32];
  function makeGlow(R: number, cols: readonly string[]) { const n = 2 * Math.ceil(R); return GLOW_STEPS.map((dens) => glowImage(n, n, n / 2, n / 2, R, cols, dens)); }
  const glowFor = (R: number, tier: Tier) => makeGlow(R * GLOW_R, GLOW[tier].map((i) => RAMP[tier][i]));
  function makeLantern(r: number, ramp: readonly string[]) {
    const h = Math.round(r * 2.3), [c, x] = layer(r * 2 + 9, h + 8), m = r + 4;
    for (let j = 0; j < h; j++) {
      const t = j / h, w = Math.round(r * (.68 + .4 * Math.sin(t * 2.2 + .4)));
      x.fillStyle = ramp[Math.min(ramp.length - 1, Math.round(t * (ramp.length - 1)))]; x.fillRect(m - w, j + 2, w * 2 + 1, 1);
      x.fillStyle = ramp[0]; x.fillRect(m - w, j + 2, 1, 1); x.fillRect(m + w, j + 2, 1, 1);
    }
    x.fillStyle = EMBER[1]; x.fillRect(m - Math.round(r * .6), h + 2, Math.round(r * 1.2) + 1, 1); x.fillRect(m - Math.round(r * .5), 1, r + 1, 1);
    x.fillStyle = ramp[ramp.length - 1]; x.fillRect(m, h + 3, 1, 2);
    return c;
  }
  function makePuff(r: number, cols: readonly string[]) {
    const size = r * 2 + 1, [c, x] = layer(size, size);
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      const d = Math.hypot(i - r, j - r) / (r + .4); if (d >= 1) continue;
      if (d > .7 && BAYER[(j & 3) * 4 + (i & 3)] > (1 - d) * 3) continue;
      x.fillStyle = cols[d < .5 && (i + j) % 3 ? 1 : 0]; x.fillRect(i, j, 1, 1);
    }
    return c;
  }
  const LANTERNS: Record<Tier, HTMLCanvasElement> = {
    common: makeLantern(LANTERN_R.common, [EMBER[2], EMBER[3], EMBER[4]]),
    uncommon: makeLantern(LANTERN_R.uncommon, [EMBER[3], EMBER[4], EMBER[5]]),
    rare: makeLantern(LANTERN_R.rare, [EMBER[4], EMBER[5], EMBER[6], EMBER[7]]),
  };
  const PUFFS = [3, 5, 8, 12, 17].map((r) => makePuff(r, r > 8 ? [SMOKE[0], SMOKE[1]] : [SMOKE[1], SMOKE[2]]));

  // ---------- Pills, and the sparkler fuse that borders them ----------
  // A rounded box in art pixels: its corners are stairs, and the path runs clockwise along the middle of the cord from the top centre.
  function pillPath(x0: number, y0: number, x1: number, y1: number, r: number) {
    const pts: [number, number][] = [], arc = (cx: number, cy: number, a0: number) => { const n = Math.max(4, Math.ceil(r * 1.6)); for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; pts.push([cx + Math.round(Math.cos(a) * r / PILL_STEP) * PILL_STEP, cy + Math.round(Math.sin(a) * r / PILL_STEP) * PILL_STEP]); } };
    const mid = Math.floor((x0 + x1) / 2), cells: [number, number][] = [];
    arc(x1 - r, y0 + r, -Math.PI / 2); arc(x1 - r, y1 - r, 0); arc(x0 + r, y1 - r, Math.PI / 2); arc(x0 + r, y0 + r, Math.PI); pts.push([mid, y0]);
    let x = mid, y = y0;
    const walk = (tx: number, ty: number, first: boolean) => { const h = () => { while (x !== tx) { x += Math.sign(tx - x); cells.push([x, y]); } }, v = () => { while (y !== ty) { y += Math.sign(ty - y); cells.push([x, y]); } }; if (first) { h(); v(); } else { v(); h(); } };
    cells.push([x, y]);
    for (const [tx, ty] of pts) walk(tx, ty, (tx - mid) * (ty - (y0 + y1) / 2) < 0);   // the stair always bulges outward
    cells.pop();
    return cells;
  }
  // w by h art pixels, the cord's thickness included. Holds the panel, the cord as new, and the cord burnt out.
  const PILLS = new Map<string, Pill>();
  function pillOf(w: number, h: number, r: number, T: number, ramp?: readonly string[] | null): Pill {
    const key = [w, h, r, T, ramp && ramp[0]].join();
    const known = PILLS.get(key);
    if (known) return known;
    const a = T >> 1, cells = pillPath(a, a, w - 1 - (T - 1 - a), h - 1 - (T - 1 - a), r), [panel, px] = layer(w, h), [cord, cx] = layer(w, h), [burnt, bx] = layer(w, h);
    const rows = new Map<number, [number, number]>();
    for (const [x, y] of cells) { const q = rows.get(y) || [x, x]; q[0] = Math.min(q[0], x); q[1] = Math.max(q[1], x); rows.set(y, q); }
    px.fillStyle = PANEL; for (const [y, [p, q]] of rows) px.fillRect(p, y, q - p + 1, 1);
    const n = cells.length, ox = w / 2, oy = h / 2;
    cx.fillStyle = ramp ? ramp[0] : EMBER[0]; bx.fillStyle = ASH;
    for (const [x, y] of cells) { cx.fillRect(x - a, y - a, T, T); bx.fillRect(x - a, y - a, T, T); }
    cells.forEach(([x, y], i) => {
      const p = cells[(i + 3) % n], q = cells[(i + n - 3) % n], tx = p[0] - q[0], ty = p[1] - q[1], l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l;
      for (let d = -a + 1; d <= T - 1 - a - 1; d++) {   // Stripes that lean, so the cord reads as twisted; its edges stay dark.
        cx.fillStyle = mod(i + d * 3, TWIST) < TWIST / 2 ? (ramp ? ramp[3] : CORD_LIGHT) : (ramp ? ramp[1] : CORD_DARK);
        cx.fillRect(Math.round(x + nx * d), Math.round(y + ny * d), 1, 1);
      }
      if (hash(i, 7) < .1) { bx.fillStyle = SMOKE[0]; bx.fillRect(x, y, 1, 1); bx.fillStyle = ASH; }
    });
    const out = { panel, cord, burnt, cells, w, h, a, T, ox, oy };
    PILLS.set(key, out);
    return out;
  }
  function spit(P: Pill, x0: number, y0: number, from: number, count: number, t: number, reach: number, ink: readonly string[] = EMBER) {   // Sparks thrown outward from anywhere along the cord still unburnt.
    const n = P.cells.length, len = n - from;
    if (len <= 0) return;
    for (let i = 0; i < count; i++) {
      const p = t / SPIT_LIFE + hash(i, 33), c = Math.floor(p), u = p - c, cell = P.cells[from + Math.floor(hash(c, i + 50) * len)], dx = cell[0] - P.ox, dy = cell[1] - P.oy, l = Math.hypot(dx, dy * 1.6) || 1;
      const x = x0 + cell[0] + dx / l * u * reach + (hash(c, i + 51) - .5) * u * reach, y = y0 + cell[1] + dy / l * 1.6 * u * reach + u * u * 7;
      if (u < .35 && i % 3 === 0) star(x, y, 1, ink[7], ink[7]); else rc(x, y, 2, 2, ink[Math.max(3, 7 - Math.floor(u * 5))]);
    }
  }
  let fuse: Fuse | null = null, headGlow: HTMLCanvasElement | null = null;
  function buildFuse() {
    const p = view.prompt, T = fuseW, r = Math.min(Math.round(PROMPT_R * K / U), (p.h >> 1) + T), pill = pillOf(p.w + T * 2, p.h + T * 2, r, T);
    const [now, nx] = layer(pill.w, pill.h);
    nx.drawImage(pill.cord, 0, 0);
    fuse = { ...pill, x0: p.x - T, y0: p.y - T, now, nx, r, done: 0 };
    headGlow ||= makeGlow(HEAD_GLOW, [EMBER[3], EMBER[4], EMBER[6]])[0];
  }
  function drawFuse(left: number, t: number, ox: number, oy: number) {
    const f = fuse!, n = f.cells.length, head = Math.min(n - 1, Math.floor((1 - left / Q_SECONDS) * n)), x0 = f.x0 + ox, y0 = f.y0 + oy, late = clamp01(1 - left / LATE_SECONDS);
    if (head < f.done) { f.nx.drawImage(f.cord, 0, 0); f.done = 0; }
    for (; f.done < head; f.done++) { const [x, y] = f.cells[f.done], sx = x - f.a, sy = y - f.a; f.nx.drawImage(f.burnt, sx, sy, f.T, f.T, sx, sy, f.T, f.T); }
    g.drawImage(f.panel, x0, y0);
    g.drawImage(f.now, x0, y0);
    for (let i = 0; i < FUSE_HOT; i++) {   // The cord still glowing behind the head.
      const c = f.cells[head - i]; if (!c) break;
      rc(x0 + c[0] - 1, y0 + c[1] - 1, 3, 3, EMBER[Math.max(1, 6 - Math.floor(i / FUSE_HOT * 6))]);
    }
    spit(f, x0, y0, head, Math.round(lerp(SPIT_EARLY, SPIT_LATE, late)), t, SPIT_REACH * (1 + late));
    const h = f.cells[head], hx = x0 + h[0], hy = y0 + h[1], size = Math.round(lerp(SPARK_EARLY, SPARK_LATE, late)), fl = Math.floor(t * 18), flies = Math.round(lerp(FLY_EARLY, FLY_LATE, late));
    g.drawImage(headGlow!, hx - (headGlow!.width >> 1), hy - (headGlow!.height >> 1));
    for (let i = 0; i < flies; i++) {
      const p = t / FLY_LIFE + hash(i, 31), u = fract(p), c = Math.floor(p), an = hash(c, i + 40) * 6.2832, d = u * FLY_REACH * (1 + late), b = i % 3 === 0 ? 2 : 1;
      rc(hx + Math.cos(an) * d, hy + Math.sin(an) * d + u * u * 9, b, b, EMBER[Math.max(3, 7 - Math.floor(u * 5))]);
    }
    star(hx, hy, size - (fl % 3 === 0 ? 1 : 0), EMBER[6], EMBER[7]);
  }
  // The box before Next's reply: its panel and its cord, whole, with nothing burning (14c-6, Design: no time until the database answers).
  function drawUnlit() { const f = fuse!; g.drawImage(f.panel, f.x0, f.y0); g.drawImage(f.cord, f.x0, f.y0); }

  // ---------- The run ----------
  const WORD = { el: $("word"), w: 0, h: 0, cx: 0, cy: 0, from: { x: 0, y: 0 } };
  let clockT = 0;
  let phase: Phase = "ask", phaseAt = 0, phaseDur = 0;
  let shown = runScore(), shownFrom = shown, qStart = 0, atQ = run.q, walkKind: Walk = "tiny", walkStart = 0;
  let answer: Word | null = null, burst: Burst | null = null, ending: Ending | null = null, climbD = 0, shake = { x: 0, y: 0 }, boxPill: Pill | null = null, flight: Flight | null = null, smokeAt: number | null = null, dissolve: Dissolve | null = null;
  // At zero the server is asked whether time is up; until it says, the fuse stays out and the box takes nothing.
  let expiring = false;
  function go(p: Phase, dur = 0) {
    phase = p; phaseAt = clockT; phaseDur = dur;
    $("out").hidden = !WAY_OUT.has(p);
  }
  const phaseT = () => clockT - phaseAt;
  const left = () => Math.max(0, Q_SECONDS - (clockT - qStart));

  // A question starts with its lantern if the run has just taken a letter. Read from the run, so it holds for any schedule.
  let lettersSeen = [...run.taken], letterNow: LetterNow | null = null, popAt = -1;
  function beginQuestion() {
    const fresh = run.taken.filter((l) => !lettersSeen.includes(l));
    lettersSeen = [...run.taken];
    planNext();
    $("hudQ").textContent = `Q${run.q}/${QUESTIONS}`;
    if (fresh.length) startLetter(fresh[0].toUpperCase()); else openQuestion();
  }
  function startLetter(L: string) {
    $("ask").hidden = true; $("result").hidden = true; WORD.el.hidden = true;
    const lett = $("lett");
    lett.textContent = L; lett.hidden = false; lett.style.fontSize = lantern!.font + "px"; lett.style.color = "";
    $("caption").textContent = `${L} is out`; $("caption").hidden = false;
    $("verdict").textContent = `${L} is out.`;
    letterNow = { L, state: "lit", y: -lantern!.h };
    go("letter", LETTER_LOWER + LETTER_BURN + LETTER_SPUTTER + LETTER_DROP);
    placeLetter(0);
  }
  // Where the lantern is and how lit, at seconds into the phase: lowers, burns, sputters dark, drops.
  function letterAt(t: number): Omit<LetterNow, "L"> {
    const hang = dev(AH * LETTER_Y - lantern!.h / 2), a = LETTER_LOWER, c = a + LETTER_BURN, d = c + LETTER_SPUTTER, n = Math.floor(t * LETTER_FLICKER);
    if (t < a) return { y: dev(lerp(-lantern!.h, hang, easeOut(t / a, 3))), state: "lit" };
    if (t < c) return { y: hang, state: hash(n, 121) < .25 ? "low" : "lit" };
    if (t < d) { const u = (t - c) / LETTER_SPUTTER; return { y: hang, state: hash(n, 122) < u ? "dark" : "low", sputter: u }; }
    const u = (t - d) / LETTER_DROP;
    return { y: dev(hang + u * u * (AH + lantern!.h)), state: "dark", sputter: 1, drop: u };
  }
  function placeLetter(t: number) {
    const q = letterNow = { L: letterNow!.L, ...letterAt(t) }, el = $("lett"), cx = Math.round(innerWidth / 2 * DPR) / DPR, cy = (q.y + lantern!.h / 2) * U;
    el.style.transform = `translate(${Math.round((cx - el.offsetWidth / 2) * DPR) / DPR}px, ${Math.round((cy - el.offsetHeight / 2) * DPR) / DPR}px)`;
    el.style.color = q.state === "dark" ? "#8c5f63" : q.state === "low" ? "#3a2130" : "#2a0f22";
    const hang = dev(AH * LETTER_Y - lantern!.h / 2), c = $("caption");
    c.style.width = (AW - EDGE * 2) * U + "px"; setBox(c, EDGE, Math.ceil(hang + lantern!.h) + 6);
  }
  function endLetter() {
    $("lett").hidden = true; $("caption").hidden = true; letterNow = null;
    openQuestion(); popAt = clockT;
  }
  // The lantern, big: ribbed paper round a flame, in the street's own way, with dark caps and a dark rim that hold it against the brightest sky.
  let lantern: Lantern | null = null;
  function buildLanternArt() {
    const rx = Math.round(Math.min(AW * LETTER_RX[0], AH * LETTER_RX[1])), ry = Math.round(rx * 1.1), cap = Math.round(rx * .16), tassel = Math.round(rx * .6), w = rx * 2 + 9, h = ry * 2 + cap * 2 + tassel + 6, cx0 = rx + 4, cy0 = cap + ry + 2;
    const sprites = {} as Record<LetterState, HTMLCanvasElement>;
    for (const state of ["lit", "low", "dark"] as const) {
      const [c, x] = layer(w, h), ramp = LANTERN_INK[state], ribs = 10;
      for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) {
        const e = dx * dx / ((rx + .3) * (rx + .3)) + dy * dy / ((ry + .3) * (ry + .3)); if (e > 1) continue;
        const q = 1 - Math.hypot(dx / rx, (dy - .16 * ry) / ry), rim = e > .9;
        let k = Math.min(ramp.length - 1, Math.floor(Math.pow(Math.max(0, q), 1.1) * ramp.length * 1.5));
        const u = dx / (rx * Math.sqrt(Math.max(.02, 1 - dy * dy / (ry * ry)))), th = Math.asin(Math.max(-1, Math.min(1, u))) / Math.PI * ribs + .5, fr = th - Math.floor(th);
        if (fr < .14 && Math.abs(u) < .97) k = Math.max(0, k - 2);
        x.fillStyle = rim ? "#2a0f22" : ramp[k]; x.fillRect(cx0 + dx, cy0 + dy, 1, 1);
      }
      const cw = Math.round(rx * .46);
      for (const y of [2, cy0 + ry - 1]) { x.fillStyle = "#2a0f22"; x.fillRect(cx0 - cw, y, cw * 2 + 1, cap); x.fillStyle = "#d9a06a"; x.fillRect(cx0 - cw + 1, y + 1, cw * 2 - 1, 1); }
      const tw = Math.max(2, Math.round(rx * .05)), ty = cy0 + ry - 1 + cap;
      x.fillStyle = "#2a0f22"; x.fillRect(cx0 - tw - 1, ty, tw * 2 + 3, tassel);
      x.fillStyle = state === "dark" ? "#54323f" : "#d14a28"; x.fillRect(cx0 - tw, ty, tw * 2 + 1, tassel - 1);
      sprites[state] = c;
    }
    lantern = { sprites, w, h, rx, cx0, glow: makeGlow(rx * 1.9, [EMBER[2], EMBER[3], EMBER[4]])[0], font: Math.round(ry * 1.25 * U) };
  }
  function drawLantern(t: number) {
    const q = letterNow!, L = lantern!, x = Math.floor(AW / 2) - L.cx0, cy = q.y + L.h / 2, sput = q.sputter || 0;
    const stringEnd = q.drop !== undefined ? q.y * (1 - q.drop) * .3 : q.y + 3;   // the string is left behind and draws back up
    rc(Math.floor(AW / 2), 0, 2, Math.max(0, Math.round(stringEnd)), "#2a0f22"); rc(Math.floor(AW / 2) + 2, 0, 1, Math.max(0, Math.round(stringEnd)), "#d9a06a");
    if (q.state === "lit") g.drawImage(L.glow, Math.round(AW / 2 - L.glow.width / 2), Math.round(cy - L.glow.height / 2));
    g.drawImage(L.sprites[q.state], x, q.y);
    if (sput > 0) {
      for (let i = 0; i < LETTER_SMOKE; i++) {
        const st = hash(i, 131) * .6, u = (sput - st) / .6; if (u < 0 || u >= 1) continue;
        const img = PUFFS[Math.min(PUFFS.length - 1, Math.floor(u * PUFFS.length))];
        g.drawImage(img, Math.round(AW / 2 + (hash(i, 132) - .5) * L.rx) - (img.width >> 1), Math.round(q.y - u * L.h * .7) - (img.height >> 1));
      }
      for (let i = 0; i < LETTER_SPARKS; i++) {
        const u = fract(t * 1.6 + hash(i, 133)), a = hash(Math.floor(t * 1.6 + hash(i, 133)), i + 134) * 6.2832;
        if (q.drop === undefined) rc(AW / 2 + Math.cos(a) * u * L.rx * 1.1, cy + Math.sin(a) * u * L.rx * .8 + u * u * 30, 2, 2, EMBER[Math.max(2, 6 - Math.floor(u * 5))]);
      }
    }
  }
  function renderLetters() {
    const el = $("letters");
    el.textContent = "";
    el.append(WORDS.letters + ": ");
    if (run.taken.length) run.taken.forEach((l, i) => { const s = document.createElement("s"); s.textContent = l.toUpperCase(); el.append(i ? " " : "", s); });
    else el.append("none");
  }
  // The box appears, empty, and only now is Next sent (DECISIONS.md, Game 1: Timer): its 20 seconds start on the server
  // when the walk is over. Its prompt and time come with the reply.
  function openQuestion() {
    $("qnum").textContent = `Question ${run.q} of ${QUESTIONS}`;
    $("hudQ").textContent = `Q${run.q}/${QUESTIONS}`;
    $("qtext").textContent = "";
    $("secs").textContent = "";
    renderLetters();
    popAt = -1;
    answerBox.value = ""; answerBox.placeholder = WORDS.placeholder;
    answer = null; note(null);
    $("ask").hidden = false; $("ask").style.transform = ""; $("result").hidden = true; WORD.el.hidden = true;
    go("open");
    fit();
    answerBox.focus({ preventScroll: true });
    void io.next().then((asked) => { if (asked) ask(asked); else stranded(); });
  }
  // A question the database has opened: its prompt, the letters it takes, and its time left (msLeft, measured there).
  function ask(asked: Asked) {
    $("qtext").textContent = asked.prompt;
    run.taken = asked.stolen;
    renderLetters();
    qStart = clockT - (Q_SECONDS - asked.msLeft / 1000);
    $("secs").textContent = String(Math.ceil(left()));
    expiring = false;
    go("ask", Q_SECONDS);
    fit();
  }
  // The line under the box: a taken letter, or text that named no answer (today's words, 14c-6 answer 23).
  function note(text: string | null) {
    const el = $("note");
    if ((el.textContent || null) === text) return;
    el.textContent = text ?? ""; el.hidden = text === null;
    fit();
  }
  function showWord(text: string, size: number) {
    const el = WORD.el; el.textContent = text; el.hidden = false; el.style.fontSize = size + "px";
    WORD.w = el.offsetWidth; WORD.h = el.offsetHeight;
  }
  // The word's type is settled here, once, and only ever translated after this (answer 2). Long answers get a smaller size for their whole flight.
  function wordSizeFor(text: string) {
    const el = WORD.el, full = Math.round(WORD_SIZE * K); el.style.fontSize = full + "px"; el.textContent = text; el.hidden = false;
    return Math.min(full, Math.floor(full * innerWidth * WORD_MARGIN / el.offsetWidth));
  }
  function placeWord(cx: number, cy: number) {   // CSS px, landing on whole screen pixels, so the glyphs are never resampled.
    const x = Math.round((cx - WORD.w / 2) * DPR) / DPR, y = Math.round((cy - WORD.h / 2) * DPR) / DPR;
    WORD.cx = x + WORD.w / 2; WORD.cy = y + WORD.h / 2;
    WORD.el.style.transform = `translate(${x}px, ${y}px)`;
  }
  // answer 37: a rarity's text is outlined in its darkest step. No key: the plain ink of a word still waiting on its reply.
  const inkText = (el: HTMLElement, key?: Ink) => { el.style.color = key ? WORD_INK[key] : ""; el.style.setProperty("--line", key && key in RAMP ? RAMP[key as Tier][0] : "var(--panel)"); };
  function makeBoxPill() {   // The word's own pill: every step of it round.
    const T = fuseW, w = Math.ceil(WORD.w / U) + BOX_PAD * 2 + T * 2, h = Math.ceil(WORD.h / U) + T * 2;
    boxPill = pillOf(w, h, (h >> 1) - (T >> 1), T, answer!.kind === "safe" ? RAMP[answer!.tier] : null);
  }
  // Light it: the word steps forward and rumbles plainly at once, while the server judges it (answer 16).
  function startWait(text: string) {
    answer = { kind: "pending", answer: text, tier: "common", total: 0, points: 0 };
    inkText(WORD.el);
    showWord(text, wordSizeFor(text));
    makeBoxPill();
    const box = answerBox.getBoundingClientRect();
    WORD.from = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    $("ask").hidden = true; $("ask").style.transform = ""; shake = { x: 0, y: 0 };
    answerBox.blur();
    note(null);
    go("wait");
    void io.answer(text).then(replied);
  }
  function replied(reply: Reply) {
    if (phase !== "wait") return;
    if (reply.kind === "listed") {
      run.results.push(reply.result);
      hostSaid = reply.hostSaid; upcoming = reply.next; run.over = reply.over;
      startCharge(reply.result);
    } else if (reply.kind === "timeUp") startTimeup();
    else backToBox(reply.kind === "offList");
  }
  // The text named no answer (or the reply failed, which the page says): the word drops back into the box, the text kept
  // and selected so a typo is fixed or typed over (14b-2c answer 6); text that named no answer shakes it (answers 9, 28).
  function backToBox(offList: boolean) {
    const text = answer!.answer;
    answer = null; boxPill = null; WORD.el.hidden = true;
    $("ask").hidden = false;
    go("ask", Q_SECONDS);
    answerBox.focus({ preventScroll: true }); answerBox.select();
    if (offList) { note(`"${text}" isn't in our list. Try another answer.`); refuse(); }
  }
  // The reply landed: the word takes its rarity and charges as long as its tier says, from where the wait left it.
  function startCharge(r: Result) {
    answer = { kind: r.caught ? "caught" : "safe", answer: r.answer, tier: r.tier, total: r.total, points: r.points };
    inkText(WORD.el, r.caught ? "caught" : r.tier);
    makeBoxPill();
    WORD.from = { x: WORD.cx, y: WORD.cy };
    const dud = r.caught;
    go("charge", dud ? DUD_CHARGE_S : CHARGE_S[r.tier]);
    if (!dud) burst = makeBurst(r.tier, r.total);
  }
  // Shape from rarity, size from points (answer 11): the root widens the small end, so Q1's and Q7's are plainly apart without Q7's filling the screen.
  function makeBurst(tier: Tier, total: number): Burst {
    const pts = (total - POINTS_PER_QUESTION[0]) / (POINTS_PER_QUESTION[QUESTIONS - 1] * (1 + RARITY_BONUS_FRACTION) - POINTS_PER_QUESTION[0]);
    const room = Math.min(AW * BURST_ROOM_W, AH * BURST_ROOM_H), R = room * lerp(BURST_R[0], BURST_R[1], Math.sqrt(clamp01(pts)));
    return { tier, R, cx: Math.floor(AW / 2), cy: Math.round(AH * BURST_Y), seed: run.q * 13, glow: glowFor(R, tier), linger: true, at: 0 };
  }
  const climbDistance = (sc: Street) => sc.ext + CLIMB_FLOORS * sc.tower.floor + sc.tower.capH + AH;
  function startClimb() {
    climbD = climbDistance(sceneNow());
    const room = Math.max(0, (innerWidth - boxPill!.w * U) / 2 - WORD_EDGE), tier = answer!.tier;
    flight = { sway: Math.min(WOBBLE[tier] * innerWidth, room), turns: SWAY_TURNS[tier], tier, dur: CLIMB_S[tier] };
    go("climb", CLIMB_S[tier]);
  }
  function startBurst() {
    // The sky holds still from here. Everything of the street can go, so only the next stage's scenes are kept.
    const [c, x] = layer(AW, AH);
    drawSky(x, sceneNow(), skyTop(), 0);
    held = c; scene = null;
    burst!.at = clockT; boxPill = null;
    shownFrom = shown;
    const q = run.q, cam = stageOf(Math.min(q + 1, QUESTIONS));
    want(stageOf(q), cam, true, (s) => { before = s; });
    go("burst", RESULT_AT);
  }
  // The sky result: the firework's name, the answer, its points and flavour, and what the host said (answer 7); the
  // bonus estimate and the running total stay off it.
  function showResult() {
    const r = answer!, t = WORDS.tiers[r.tier];
    $("rTier").textContent = t.name;
    $("rAns").textContent = `“${r.answer}”`;
    $("rHost").textContent = `The host said ${hostSaid.join(", ")}.`; $("rHost").hidden = false;
    $("rPts").textContent = `+${fmt(r.points)}`;
    $("rFlav").textContent = t.flavour; $("rAns").hidden = false;
    inkText($("rTier"), r.tier); inkText($("rPts"), r.tier);
    const last = run.q >= QUESTIONS;
    rBtn.textContent = WORDS.continue; rBtn.onclick = last ? seeResults : walkOn; rBtn.hidden = true;
    $("rRecap").hidden = true;
    $("verdict").textContent = `${t.name}. ${r.points} points. The host said ${hostSaid.join(", ")}.`;
    $("result").hidden = false; placeResult();
    go("result", 0);
  }
  function placeResult() {
    const el = $("result"), w = Math.min(AW - EDGE * 2, Math.round(PROMPT_W * K / U));
    el.style.width = w * U + "px";
    const x = Math.floor((AW - w) / 2), sky = phase === "burst" || phase === "result";
    const y = sky ? Math.ceil((WORD.cy + WORD.h / 2) / U) + 4 : Math.min(Math.round(AH * PROMPT_Y), AH - EDGE - Math.ceil(el.offsetHeight / U));
    setBox(el, x, y);
  }
  function showEnding(kind: Ending, r: Word | null) {
    const e = WORDS[kind];
    $("rTier").textContent = e.name; inkText($("rTier")); inkText($("rPts"));
    $("rAns").textContent = r && r.answer ? `“${r.answer}”` : ("note" in e ? e.note : ""); $("rAns").hidden = !$("rAns").textContent;
    $("rHost").hidden = true;
    $("rPts").textContent = `Total ${fmt(runScore())}`;
    $("rRecap").replaceChildren(...run.results.map((r) => {   // Every ending lists the run so far (answer 39).
      const li = document.createElement("li"), a = document.createElement("span"), p = document.createElement("span");
      inkText(li, r.caught ? "caught" : r.tier);
      a.textContent = r.answer; p.textContent = r.caught ? "0" : `+${fmt(r.points)}`;
      li.append(a, p);
      return li;
    }));
    $("rRecap").hidden = !run.results.length;
    $("rFlav").textContent = e.flavour;
    rBtn.textContent = WORDS.results; rBtn.onclick = () => io.seeResults(); rBtn.hidden = true;
    $("verdict").textContent = `${e.name}. Total ${runScore()}.`;
    WORD.el.hidden = true; $("ask").hidden = true;
    ending = kind; shown = runScore(); $("hudScore").textContent = fmt(shown);
    go("over", OVER_BUTTON_AT);
    $("result").hidden = false; placeResult();
    // Nothing else needs drawing.
    waiting.length = 0; job = null; next = null;
  }
  function walkOn() {
    if (phase !== "result" || rBtn.hidden) return;
    $("result").hidden = true;
    advance();
    finishPredraw();
    walkKind = (MAJOR as readonly number[]).includes(run.q) ? "major" : "tiny";
    const t = before!.tower, dist = before!.ext + DESCENT_FLOORS * t.floor + t.capH + AH;
    // The walk starts as the street's own top comes off the bottom of the tower, so the two never part.
    const dur = DRIFT_S[walkKind];
    let kWalk: number = LAND_AT; for (let k = 0; k < LAND_AT; k += .01) if (dist * (1 - easeOut(k / LAND_AT, 3)) < before!.ext) { kWalk = k; break; }
    walkStart = kWalk;
    go("descent", dur);
    burst = null; held = null; climbD = dist;
  }
  // No finale (answers 38, 39): Q7's text fades out, and the results fade in over the same burst.
  function seeResults() {
    if (phase !== "result" || rBtn.hidden) return;
    advance();
    rBtn.hidden = true;
    go("leaving", RESULTS_FADE_S);
  }
  function startArrive() {
    // Light comes down the street toward you: the street as you walked in stays on top, thinning from the vanishing point out.
    const same = stageOf(atQ) === stageOf(run.q);
    scene = next; next = null;
    const old = before!; before = null; atQ = run.q;
    if (same) { finishWalk(); return; }
    dissolve = makeDissolve((x) => { x.drawImage(old.layers.skyBase, 0, 0); x.drawImage(old.clouds, Math.round(cloudX(clockT)), old.cloudsAt); for (const k of FRAME_KEYS) x.drawImage(old.layers[k]!, 0, 0); }, false);
    go("arrive", ARRIVE_S[walkKind]);
  }
  function finishWalk() {
    dissolve = null;
    beginQuestion();
  }
  let lightMask = new Float32Array(0);
  function buildLightMask() {   // How far each pixel is from the vanishing point, with the dither that breaks the edge of the light.
    const vx = Math.floor(AW / 2), vy = Math.round(AH * .45), far = Math.hypot(Math.max(vx, AW - vx), Math.max(vy, AH - vy));
    lightMask = new Float32Array(AW * AH);
    for (let y = 0, i = 0; y < AH; y++) for (let x = 0; x < AW; x++, i++) lightMask[i] = Math.hypot(x - vx, y - vy) / far + BAYER[(y & 3) * 4 + (x & 3)] * LIGHT_BAND;
  }
  function makeDissolve(paint: (x: CanvasRenderingContext2D) => void, outward: boolean): Dissolve {
    const [c, x] = layer(AW, AH, true);
    paint(x);
    const out = x.createImageData(AW, AH);
    return { c, x, px: new Uint32Array(x.getImageData(0, 0, AW, AH).data.buffer), outward, out: new Uint32Array(out.data.buffer), image: out, step: -1 };
  }
  function drawDissolve(k: number) {
    const d = dissolve!, step = Math.floor(k * LIGHT_STEPS);
    if (step !== d.step) {
      d.step = step;
      const th = step / LIGHT_STEPS * (1 + LIGHT_BAND);
      const top = 1 + LIGHT_BAND;
      for (let i = 0; i < d.px.length; i++) d.out[i] = (d.outward ? top - lightMask[i] : lightMask[i]) < th ? 0 : d.px[i];
      d.x.putImageData(d.image, 0, 0);
    }
    g.drawImage(d.c, 0, 0);
  }
  function startTimeup() {
    run.over = true;
    const typed = answer ? answer.answer : answerBox.value.trim();
    if (typed) { answer = { kind: "timeup", answer: typed, tier: "common", total: 0, points: 0 }; inkText(WORD.el, "timeup"); showWord(typed, wordSizeFor(typed)); makeBoxPill(); placeWord(innerWidth / 2, innerHeight * CHARGE_Y); } else answer = null;
    $("ask").hidden = true; answerBox.blur(); note(null);
    smokeAt = clockT;
    go("timeup", TIMEUP_S);
  }
  // The fuse is out: until the server says, nothing changes (the database decides whether time is up, DECISIONS.md).
  function fuseOut() {
    expiring = true;
    void io.timeUp().then((r) => {
      if (phase !== "ask") return;
      if (r === "over") startTimeup();
      else if (r) ask(r);
      else stranded();
    });
  }
  // A reply that failed leaves the scene where it was, its error shown over it by the page, and nothing is retried
  // (DECISIONS.md, Error handling); the way out shows, so the player isn't held full screen with nothing to do.
  function stranded() { $("out").hidden = false; }

  // ---------- Input, as in core: taken letters are refused, stripped, and left alone mid-composition ----------
  let refuseTimer = 0;
  function refuse() {
    const el = answerBox; let i = 0;
    clearTimeout(refuseTimer);
    const step = () => { el.style.transform = `translateX(${REFUSE_STEPS[i] * U}px)`; if (++i < REFUSE_STEPS.length) refuseTimer = window.setTimeout(step, REFUSE_STEP_MS); };
    step();
  }
  // Today's line for a taken letter (G11): the key does nothing, the box shakes, and the line says which.
  function stripTaken(): boolean {
    const el = answerBox, chars = [...el.value], clean = chars.filter((ch) => !isTakenKey(ch)).join("");
    if (clean === el.value) return false;
    const gone = chars.find((ch) => isTakenKey(ch))!; el.value = clean; takenLine(gone);
    return true;
  }
  function takenLine(ch: string) { refuse(); note(`${ch.toUpperCase()} is taken. Try a word without it.`); }
  const onSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    stripTaken();
    const text = answerBox.value.trim();
    if (phase !== "ask" || expiring || !text) return;
    startWait(text);
  };
  const onBeforeInput = (e: InputEvent) => { if (e.data && [...e.data].some(isTakenKey)) { e.preventDefault(); takenLine([...e.data].find(isTakenKey)!); } };
  // Rewriting the box mid-composition kills it and the keyboard's buffer lands again, so taken letters leave when it ends.
  // Any other change clears the line, as today's box did.
  const onInput = (e: Event) => { if (!(e as InputEvent).isComposing && !stripTaken()) note(null); };
  const onCompositionEnd = () => { stripTaken(); };
  const onOut = () => io.leave();
  $<HTMLFormElement>("form").addEventListener("submit", onSubmit);
  answerBox.addEventListener("beforeinput", onBeforeInput);
  answerBox.addEventListener("input", onInput);
  answerBox.addEventListener("compositionend", onCompositionEnd);
  $("out").addEventListener("click", onOut);

  // ---------- One frame ----------
  function tick() {
    const t = phaseT();
    switch (phase) {
      case "letter":
        placeLetter(t);
        if (t >= phaseDur) endLetter();
        break;
      case "ask": {
        const l = left();
        $("secs").textContent = String(Math.ceil(l));
        if (popAt >= 0) {   // The struck letter jumps as the box arrives, so the eye lands on where it went.
          const el = $("letters").querySelector<HTMLElement>("s:last-of-type"), step = Math.floor((clockT - popAt) / POP_STEP_S);
          if (!el || step >= POP_STEPS.length) { if (el) el.style.transform = ""; popAt = -1; } else el.style.transform = `translateY(${POP_STEPS[step] * U}px)`;
        }
        const late = clamp01(1 - l / LATE_SECONDS), amp = Math.ceil(late * SHAKE_MAX) * (late > 0 ? 1 : 0), n = Math.floor(clockT * SHAKE_HZ);
        const sx = amp ? Math.round((hash(n, 3) * 2 - 1) * amp) : 0, sy = amp ? Math.round((hash(n, 4) * 2 - 1) * amp) : 0;
        if (sx !== shake.x || sy !== shake.y) { shake = { x: sx, y: sy }; $("ask").style.transform = sx || sy ? `translate(${sx * U}px, ${sy * U}px)` : ""; }
        if (l === 0 && !expiring) fuseOut();
        break;
      }
      case "wait": {
        // The plain rumble: the start of a charge, held there until the reply (Claude's reading of answer 16).
        const e = easeOut(t / WORD_ENTER, 3), r = rumbleAt(t, Infinity, "common");
        placeWord(lerp(WORD.from.x, innerWidth / 2, e) + r.x * U, lerp(WORD.from.y, innerHeight * CHARGE_Y, e) + r.y * U);
        break;
      }
      case "charge": {
        const k = clamp01(t / phaseDur), e = easeOut(t / WORD_ENTER, 3), r = rumbleAt(t, phaseDur, answer!.kind === "caught" ? "caught" : answer!.tier), dip = Math.round(clamp01((k - DIP_FROM) / (1 - DIP_FROM)) * DIP);
        placeWord(lerp(WORD.from.x, innerWidth / 2, e) + r.x * U, lerp(WORD.from.y, innerHeight * CHARGE_Y, e) + (r.y + dip) * U);
        if (k >= 1) { if (answer!.kind === "caught") go("dud", DUD_LIFT_S + DUD_FALL_S + DUD_SMOKE_S); else startClimb(); }
        break;
      }
      case "dud": {
        const lift = dudLift(t), y = innerHeight * CHARGE_Y - lift * U;
        placeWord(innerWidth / 2, y);
        if (t >= phaseDur) showEnding("caught", answer);
        break;
      }
      case "climb": {
        const k = clamp01(t / phaseDur), p = flightAt(k);
        placeWord(p.x, p.y);
        if (k >= 1) startBurst();
        break;
      }
      case "burst":
        if (t >= phaseDur) showResult();
        break;
      case "result": {
        const k = clamp01((clockT - burst!.at - RESULT_AT) / COUNT_S), v = Math.round(lerp(shownFrom, runScore(), k));
        if (v !== shown) { shown = v; $("hudScore").textContent = fmt(v); }
        if (clockT - burst!.at >= BUTTON_AT && rBtn.hidden) { rBtn.hidden = false; placeResult(); rBtn.focus({ preventScroll: true }); }
        break;
      }
      case "leaving": {
        const k = clamp01(t / phaseDur);
        $("result").style.opacity = WORD.el.style.opacity = String(1 - k);
        if (t >= phaseDur) { WORD.el.style.opacity = ""; showEnding("complete", null); }
        break;
      }
      case "descent":
        if (t < 1.2) placeWordUp(t);
        if (t >= phaseDur) { WORD.el.hidden = true; startArrive(); }
        break;
      case "arrive":
        if (t >= phaseDur) finishWalk();
        break;
      case "timeup":
        if (t >= phaseDur) showEnding("timeup", answer);
        break;
      case "over":
        if (ending === "complete") $("result").style.opacity = String(clamp01(t / RESULTS_FADE_S));
        if (t >= OVER_BUTTON_AT && rBtn.hidden) { rBtn.hidden = false; placeResult(); rBtn.focus({ preventScroll: true }); }
        break;
      case "open":
        break;
    }
  }
  // The whole entity shakes, harder and quicker as the charge fills. Whole art pixels, by translation only. The step count is the rate's own integral, so it tightens without jumping.
  function rumbleAt(t: number, T: number, kind: keyof typeof RUMBLE) {
    const m = RUMBLE[kind], k = clamp01(t / T), [h0, h1] = m.hz, n = Math.floor(h0 * t + (h1 - h0) * t * t / (2 * T)), amp = Math.max(1, Math.round(m.amp * k * k + k * .6));
    return { x: (n & 1 ? 1 : -1) * Math.ceil(hash(n, 5) * amp), y: (n >> 1 & 1 ? 1 : -1) * Math.round(hash(n, 6) * amp), amp };   // side to side on every step, so a step always shows
  }
  // The rocket's path in CSS px at a part of the climb: an S-curve that dies away into a hang, rising with an ease that both starts and ends slow.
  function flightAt(k: number) {
    const f = flight!, w = clamp01(k / WORD_RISE), rise = w * w * (3 - 2 * w), s = clamp01(k / SWAY_END), env = Math.sin(Math.PI * s);
    return { x: innerWidth / 2 + f.sway * env * Math.sin(6.2832 * f.turns * s), y: lerp(innerHeight * CHARGE_Y + DIP * U, BURST_Y * innerHeight, rise) };
  }
  // The word stays with the sky as the view drifts down, so it leaves by the top. Translation only.
  function placeWordUp(t: number) { placeWord(innerWidth / 2, BURST_Y * innerHeight - t * t * innerHeight * .5); }
  function dudLift(t: number) {
    const up = DUD_LIFT * AH;
    if (t < DUD_LIFT_S) return up * easeOut(t / DUD_LIFT_S, 2) + (Math.floor(t * 26) & 1);
    const f = (t - DUD_LIFT_S) / DUD_FALL_S;
    return f < 1 ? up * (1 - f * f) : 0;
  }

  function draw() {
    const dx = cloudX(clockT), t = phaseT();
    switch (phase) {
      case "letter":
        drawWorld(sceneNow(), 0, 0, dx, 0);
        idle(sceneNow());
        tracker();
        drawLantern(t);
        break;
      case "open":
        drawWorld(sceneNow(), 0, 0, dx, 0);
        idle(sceneNow());
        tracker();
        drawUnlit();
        break;
      case "ask":
        drawWorld(sceneNow(), 0, 0, dx, 0);
        idle(sceneNow());
        tracker();
        drawFuse(left(), clockT, shake.x, shake.y);
        break;
      case "wait":
        drawWorld(sceneNow(), 0, 0, dx, 0);
        idle(sceneNow());
        tracker();
        drawCharge(0, "pending");
        break;
      case "charge": {
        const k = clamp01(t / phaseDur), rumble = k > .55 ? Math.floor(clockT * 30) & (k > .85 ? 3 : 1) : 0;
        drawWorld(sceneNow(), rumble, 0, dx, 0);
        idle(sceneNow());
        tracker();
        drawCharge(k, answer!.kind === "caught" ? "caught" : answer!.tier);
        break;
      }
      case "dud": {
        const lift = Math.round(dudLift(t) * .4);
        drawWorld(sceneNow(), lift, 0, dx, 0);
        idle(sceneNow());
        tracker();
        drawBoxAt(boxPill!.burnt);
        if (t < DUD_LIFT_S) sputter(t, AH * CHARGE_Y - dudLift(t));
        if (t > DUD_LIFT_S * .6) smoke(t - DUD_LIFT_S * .6, Math.round(AH * CHARGE_Y - dudLift(t)));
        break;
      }
      case "climb": {
        const e = climbEase(t / phaseDur), jolt = t < LAUNCH_SHAKE_S ? Math.round(hash(Math.floor(t * 40), 8) * LAUNCH_SHAKE * (1 - t / LAUNCH_SHAKE_S)) : 0, camY = dev(e * climbD), skyOff = dev(e * skyTop());
        drawWorld(sceneNow(), camY, skyOff, cloudX(clockT, 1 - clamp01(e / CLOUD_HOME)), CLIMB_FLOORS, jolt);
        blast(t, camY);
        trail(t, camY);
        drawBoxAt(boxPill!.cord);
        spitBox(1, t, RAMP[flight!.tier]);
        tracker();
        break;
      }
      case "burst":
      case "result":
      case "leaving":
        g.drawImage(held!, 0, 0);
        drawBurst(burst!, clockT - burst!.at);
        tracker();
        lanternJoin();
        break;
      case "descent": {
        const k = t / phaseDur, land = easeOut(k / LAND_AT, 3), camY = dev(climbD * (1 - land)), skyOff = dev(skyTop() * (1 - land));
        const home = clamp01((k - walkStart) / (1 - walkStart)), w = 1 - easeOut(home, 2.4), cdx = cloudX(clockT, home);
        drawWalk(before!, camY, skyOff, cdx, w * WALK_ZOOM[walkKind], DESCENT_FLOORS);
        embers(t);
        tracker();
        break;
      }
      case "arrive":
        drawWorld(sceneNow(), 0, 0, dx, 0);
        drawDissolve(clamp01(t / phaseDur));
        tracker();
        break;
      case "timeup":
        drawWorld(sceneNow(), 0, 0, dx, 0);
        idle(sceneNow());
        tracker();
        if (answer) drawBoxAt(boxPill!.burnt);
        smoke(clockT - smokeAt!, answer ? Math.round(AH * CHARGE_Y) : view.prompt.y);
        break;
      case "over": {
        if (held) {
          g.drawImage(held, 0, 0);
          drawBurst(burst!, clockT - burst!.at);
          tracker();
          break;
        }
        drawWorld(sceneNow(), 0, 0, dx, 0);
        idle(sceneNow());
        tracker();
        if (ending !== "complete" && smokeAt !== null) smoke(clockT - smokeAt, Math.round(AH * CHARGE_Y));
        break;
      }
    }
  }
  // Lit lanterns flicker and sparks rise from them; a stage with no light does neither (Q1).
  function idle(sc: Street) {
    const L = sc.lights, n = L.length;
    if (!n) return;
    const step = Math.floor(clockT * FLICKER_HZ);
    g.fillStyle = EMBER[7];
    for (let i = 0; i < n; i++) {
      const l = L[i];
      if (l.r < 2 || hash(i, step) > FLICKER_SHARE) continue;
      const a = l.r > 6 ? 2 : 1;
      g.fillRect(l.x - a, l.y - a + 1, a * 2 + 1, a * 2);
    }
    const sparks = Math.round(IDLE_SPARKS * Math.min(1, n / 60)) + 1;
    for (let i = 0; i < sparks; i++) {
      const p = clockT / IDLE_SPARK_LIFE + hash(i, 61), c = Math.floor(p), u = p - c, l = L[Math.floor(hash(c, i + 70) * n)];
      rc(l.x + Math.sin(u * 5 + i) * 4, l.y - u * IDLE_SPARK_RISE, 1, 1, EMBER[7 - Math.min(5, Math.floor(u * 6))]);
    }
  }
  function trackerSlot(i: number) {
    const s = view.sky, x = lerp(s.x0, s.x1, (i + .5) / QUESTIONS), y = lerp(s.y0, s.y1, hash(i, 111));
    return { x: Math.round(x), y: Math.round(y) };
  }
  function tracker() {
    const res = run.results, joining = phase === "burst" || phase === "result" || phase === "leaving" ? res.length - 1 : -1;
    res.forEach((r, i) => {
      if (r.caught || i === joining) return;
      const p = trackerSlot(i), img = LANTERNS[r.tier], bob = Math.round(Math.sin((clockT + i) / BOB_S * 6.2832) * BOB_PX);
      g.drawImage(img, p.x - (img.width >> 1), p.y + bob);
    });
  }
  function lanternJoin() {   // The new lantern rises out of the burst to its place.
    const b = burst!, i = run.results.length - 1, r = run.results[i], p = trackerSlot(i), k = easeOut((clockT - b.at - RESULT_AT * .4) / (BUTTON_AT - RESULT_AT * .4), 3), img = LANTERNS[r.tier];
    if (clockT - b.at < RESULT_AT * .4) return;
    g.drawImage(img, Math.round(lerp(b.cx, p.x, k)) - (img.width >> 1), Math.round(lerp(b.cy, p.y, k)));
  }
  // The box always sits on the word's own place, so what shakes the word shakes the box.
  function boxAt() { return { x: dev(WORD.cx / U - boxPill!.w / 2), y: dev(WORD.cy / U - boxPill!.h / 2) }; }
  function drawBoxAt(cord: HTMLCanvasElement) {
    const b = boxAt();
    g.drawImage(boxPill!.panel, b.x, b.y); g.drawImage(cord, b.x, b.y);
  }
  function spitBox(k: number, t: number, ink?: readonly string[]) { const b = boxAt(); spit(boxPill!, b.x, b.y, 0, Math.round(lerp(10, 46, k)), t, SPIT_REACH, ink); }
  // pending: the word waiting on its reply, in the street's own embers with a common charge's sparks, as at a charge's start.
  function drawCharge(k: number, tier: Tier | "caught" | "pending") {
    const b = boxAt(), P = boxPill!, ink = tier in RAMP ? RAMP[tier as Tier] : EMBER, count = Math.round((tier in CHARGE_SPARKS ? CHARGE_SPARKS[tier as Tier] : CHARGE_SPARKS.common) * (.25 + .75 * k)), reach = Math.max(P.w, P.h) * .55 + 40, cx = b.x + P.w / 2, cy = b.y + P.h / 2;
    drawBoxAt(P.cord);
    spitBox(k, clockT, ink);
    for (let i = 0; i < count; i++) {
      const p = clockT / .7 + hash(i, 21), c = Math.floor(p), u = p - c, an = hash(c, i + 200) * 6.2832, r = (1 - u * u) * reach + 2, sx = cx + Math.cos(an) * r * (P.w / P.h > 2 ? 1.6 : 1), sy = cy + Math.sin(an) * r * .8;
      star(sx, sy, i % 5 === 0 ? 2 : i % 2, ink[3 + Math.min(4, Math.floor(u * 5))], ink[7]);
    }
  }
  function sputter(t: number, y: number) {
    const b = Math.floor(t * 16), cx = AW / 2;
    for (let i = 0; i < 10; i++) if (hash(b, i) < .6) rc(cx + (hash(b, i + 20) - .5) * 60, y + WORD.h / U / 2 + hash(b, i + 40) * 14, 2, 2, EMBER[2 + (i % 3)]);
  }
  function smoke(t: number, y: number) {
    const cx = AW / 2;
    for (let i = 0; i < SMOKE_PUFFS; i++) {
      const st = hash(i, 301) * SMOKE_LIFE * .6, u = (t - st) / SMOKE_LIFE; if (u < 0 || u >= 1) continue;
      const img = PUFFS[Math.min(PUFFS.length - 1, Math.floor(u * PUFFS.length))], x = cx + (hash(i, 302) - .5) * 80 * (1 + u) + Math.sin(u * 4 + i) * 6, yy = y - u * SMOKE_RISE - hash(i, 303) * 12;
      g.drawImage(img, Math.round(x) - (img.width >> 1), Math.round(yy) - (img.height >> 1));
    }
  }
  // The takeoff's blast, left behind on the ground.
  function blast(t: number, camY: number) {
    if (t >= BLAST_S) return;
    const f = flight!, u = t / BLAST_S, cx = AW / 2, cy = AH * CHARGE_Y + WORD.h / U / 2 + camY, reach = AH * BLAST_R * (1 - Math.pow(1 - u, 3)), n = BLAST_N[f.tier], ink = RAMP[f.tier];
    for (let i = 0; i < n; i++) {
      const an = Math.PI * (1 + hash(i, 451)), r = reach * (.4 + hash(i, 452) * .6);
      star(cx + Math.cos(an) * r * 1.4, cy + Math.sin(an) * r * .5 + u * u * 20, u < .5 ? 2 : 1, ink[7 - Math.floor(u * 5)], ink[7]);
    }
  }
  // The spark trail lies along the path actually flown and stays in the world, so it shows the curve and is left behind as the view climbs.
  function trail(t: number, camNowY: number) {
    const f = flight!, ramp = RAMP[f.tier], ink = TRAIL_INK[f.tier], n = TRAIL_N[f.tier], top = Math.floor(t / TRAIL_STEP), spread = TRAIL_SPREAD[f.tier], h = WORD.h / U / 2;
    for (let j = 0; j < n; j++) {
      const id = top - j; if (id < 0) break;
      const tj = id * TRAIL_STEP, k = tj / f.dur, p = flightAt(k), cam = Math.round(climbEase(k) * climbD), age = j / n, y = p.y / U + h + camNowY - cam + age * age * 26, x = p.x / U;
      if (y > AH) continue;
      const c = ramp[ink[Math.max(0, 2 - Math.floor(age * 3))]], sp = spread * (.4 + age * .6);
      rc(x + (hash(id, 401) - .5) * sp, y + hash(id, 402) * 4, 3, 3, c);
      rc(x + (hash(id, 403) - .5) * sp * 1.6, y + hash(id, 404) * 6, 1, 2, ramp[Math.max(1, ink[0] - 1)]);
      if (id % 12 === 0) star(x + (hash(id, 405) - .5) * sp * 2, y, age < .4 ? 2 : 1, ramp[ink[2]], ramp[7]);
    }
  }
  function embers(t: number) {
    for (let i = 0; i < EMBERS; i++) {
      const sp = lerp(.22, .5, hash(i, 501)), p = t * sp + hash(i, 502), c = Math.floor(p), u = p - c, x = hash(c, i + 510) * AW + Math.sin(u * 7 + i) * 7;
      rc(x, u * AH, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1, EMBER[7 - Math.min(5, Math.floor(u * 6))]);
    }
  }
  // Shape from rarity, size from points (answer 11). `age` is seconds since it opened; nothing here keeps state. It blooms once, fading in steps, and a burst that
  // lingers then stays as glitter on that same shape for as long as anyone waits (answer 24).
  function drawBurst(b: Burst, age: number) {
    if (age < 0) return;
    if (b.linger) drawGlitter(b, age);
    const T = BURST_S[b.tier]; if (age >= T) return;
    const a = age / T, open = 1 - Math.pow(1 - clamp01(age / BLOOM_S[b.tier]), 3);
    if (a < GLOW_FOR) { const g0 = b.glow[Math.floor(a / GLOW_FOR * 3)], off = g0.width >> 1; g.drawImage(g0, Math.round(b.cx) - off, Math.round(b.cy) - off); }
    if (b.tier === "common") peony(b, a, open); else if (b.tier === "uncommon") chrysanthemum(b, a, open); else willow(b, a, age);
  }
  // A place in the settled shape, from two numbers in 0..1.
  function shapePoint(b: Burst, v: number, w: number): [number, number] {
    const R = b.R;
    if (b.tier === "common") { const an = v * 6.2832, r = R * Math.sqrt(w); return [b.cx + Math.cos(an) * r, b.cy + Math.sin(an) * r]; }
    if (b.tier === "uncommon") { const an = Math.floor(v * CHRYS_N) / CHRYS_N * 6.2832 + hash(b.seed, 3), r = R * (w < .5 ? 1 : w < .75 ? CHRYS_RING : lerp(.62, .96, (w - .75) * 4)); return [b.cx + Math.cos(an) * r, b.cy + Math.sin(an) * r]; }
    return willowAt(b, Math.floor(v * WILLOW_N), BURST_S.rare * lerp(.3, 1, w));
  }
  // Each spark lives a few seconds at a place in the shape, falling a little and twinkling in steps, then another takes up somewhere else in it. The count never changes, so nothing flashes.
  function drawGlitter(b: Burst, age: number) {
    const ink = RAMP[b.tier], n = GLITTER_N[b.tier], since = age - GLITTER_FROM[b.tier], fill = clamp01(since / GLITTER_IN), step = Math.floor(age * GLITTER_HZ), fall = b.R * GLITTER_FALL;
    if (since < 0) return;
    for (let i = 0; i < n; i++) {
      if (hash(i, 71) > fill) continue;
      const life = lerp(GLITTER_LIFE[0], GLITTER_LIFE[1], hash(i, 72)), p = age / life + hash(i, 73), c = Math.floor(p), u = p - c, tw = hash(step, i + 74);
      if (tw < .22) continue;
      const q = shapePoint(b, hash(c, i + 700), hash(c, i + 900));
      star(q[0], q[1] + u * u * fall, tw > .86 ? 2 : tw > .5 ? 1 : 0, ink[Math.max(2, 7 - Math.floor(u * 5))], ink[7]);
    }
  }
  const fadeStep = (a: number, i: number) => Math.floor(a * a * 7 + hash(i, 601) * 1.3);   // 0 bright to 7 gone
  const starSize = (R: number, f: number) => (R > 110 ? 1 : 0) + (f < 2 ? 3 : f < 4 ? 2 : f < 6 ? 1 : 0);
  function peony(b: Burst, a: number, open: number) {   // A full round ball of stars, no gaps and no streaks.
    const ink = RAMP[b.tier], R = b.R, sag = a * a * R * .14;
    for (let i = 0; i < PEONY_N; i++) {
      const an = i * 2.39996, r = R * open * Math.sqrt((i + .5) / PEONY_N), f = fadeStep(a, i); if (f > 6) continue;   // the golden angle fills a disc evenly
      const x = b.cx + Math.cos(an) * r, y = b.cy + Math.sin(an) * r + sag;
      if (i % 4 === 0) star(x, y, starSize(R, f + 1), ink[Math.max(3, 6 - f)], ink[7]);
      else rc(x, y, 2, 2, ink[Math.max(2, 5 - (f >> 1) - (i % 3 === 0 ? 1 : 0))]);
    }
  }
  function chrysanthemum(b: Burst, a: number, open: number) {   // Long straight petals with a bright ring at their tips and a second ring inside.
    const ink = RAMP[b.tier], R = b.R;
    for (let i = 0; i < CHRYS_N; i++) {
      const an = i / CHRYS_N * 6.2832 + hash(b.seed, 3), f = fadeStep(a, i); if (f > 6) continue;
      const r = R * open, c = Math.cos(an), s = Math.sin(an), tail = lerp(.16, .7, a) * r;
      for (let d = tail; d < r; d += 1.5) { const u = (r - d) / r; rc(b.cx + c * d, b.cy + s * d, u < .2 ? 2 : 1, u < .2 ? 2 : 1, ink[Math.max(1, 5 - Math.min(3, f) - Math.floor(u * 3))]); }
      star(b.cx + c * r, b.cy + s * r, starSize(R, f), ink[6 - Math.min(2, f >> 1)], ink[7]);
      if (i % 2 === 0) star(b.cx + c * r * CHRYS_RING, b.cy + s * r * CHRYS_RING, starSize(R, f + 1), ink[5 - Math.min(2, f >> 1)], ink[7]);
    }
  }
  function willowAt(b: Burst, i: number, ag: number): [number, number] {   // Where strand i has reached at an age.
    const an = Math.PI * (1.02 + i / (WILLOW_N - 1) * .96), wob = .8 + hash(i, b.seed) * .4, o = 1 - Math.pow(1 - clamp01(ag / BLOOM_S.rare), 3), dr = Math.pow(clamp01(ag / BURST_S.rare), 1.5) * WILLOW_DROP * b.R;
    return [b.cx + Math.cos(an) * b.R * o * wob, b.cy + Math.sin(an) * b.R * .7 * o * wob + dr];
  }
  function willow(b: Burst, a: number, age: number) {   // Long gold strands: each runs from the heart of the shell, up and out, and hangs as it falls.
    const ink = RAMP[b.tier];
    for (let i = 0; i < WILLOW_N; i++) {
      const f = fadeStep(a * .94, i); if (f > 6) continue;
      for (let j = 1; j < WILLOW_TRAIL; j++) {
        const u = j / WILLOW_TRAIL, p = willowAt(b, i, age * (WILLOW_FROM + (1 - WILLOW_FROM) * u)), fj = f + Math.floor((1 - u) * 4);   // the old end of the strand dims first
        if (fj <= 6) rc(p[0], p[1], u > .7 ? 2 : 1, 3, ink[Math.max(2, 6 - fj)]);
      }
      const p = willowAt(b, i, age);
      star(p[0], p[1], starSize(b.R, f + 1), ink[7], ink[7]);
    }
  }

  // Long-running clock: the frame loop is the only thing that moves it, so a hidden tab's clock catches up when it shows
  // again, by the whole gap.
  let lastMs = 0, nextDraw = 0, relayout = false, raf = 0, stopped = false;
  // 60 at most on any screen, by keeping an appointment every 1/60 s and drawing on the first screen frame at or after it. A screen that can't land on it exactly (75, 90, 144 Hz)
  // alternates its gaps and still averages 60, where a fixed minimum gap would round down to half its rate.
  function frameGate(ms: number) {
    if (ms < nextDraw - FRAME_SLACK_MS) return false;
    const step = 1000 / FPS;
    nextDraw = ms - nextDraw > step ? ms + step : nextDraw + step;   // a stall is forgiven, not made up
    return true;
  }
  function frame(ms: number) {
    raf = requestAnimationFrame(frame);
    if (!frameGate(ms)) return;
    if (lastMs) clockT += (ms - lastMs) / 1000;
    lastMs = ms;
    if (relayout) rebuild();
    tick();
    draw();
    pump(PREDRAW_SLICE_MS);
  }
  // A new size draws everything again at it. Mid-walk it lands at once, because the walk's own scene is gone.
  function rebuild() {
    relayout = false;
    waiting.length = 0; job = null; next = null; before = null;
    layout();
    if (phase === "descent" || phase === "arrive") { atQ = run.q; dissolve = null; WORD.el.hidden = true; }
    scene = settle(streetLayers(AW, AH, stageOf(atQ)), false);
    if (burst && answer) { const at = burst.at; burst = makeBurst(answer.tier, answer.total); burst.at = at; }
    if (boxPill) { WORD.w = WORD.el.offsetWidth; WORD.h = WORD.el.offsetHeight; makeBoxPill(); }
    switch (phase) {
      case "burst": case "result": case "leaving": {
        const [c, x] = layer(AW, AH);
        drawSky(x, scene, skyTop(), 0);
        held = c; scene = null;
        placeWord(innerWidth / 2, BURST_Y * innerHeight); placeResult();
        planNext(); want(stageOf(atQ), stageOf(Math.min(atQ + 1, QUESTIONS)), true, (v) => { before = v; });
        break;
      }
      case "descent": case "arrive": finishWalk(); break;
      case "over": {
        if (held) { const [c, x] = layer(AW, AH); drawSky(x, scene, skyTop(), 0); held = c; scene = null; }
        placeResult();
        break;
      }
      case "climb": climbD = climbDistance(scene); planNext(); break;
      default: planNext();
    }
  }
  const onResize = () => { relayout = true; };

  // ---------- Where the run picks up ----------
  $<HTMLButtonElement>("submit").textContent = WORDS.submit;
  answerBox.placeholder = WORDS.placeholder;
  layout();
  scene = settle(streetLayers(AW, AH, stageOf(run.q)), false);
  if (start.at.kind === "ask") {
    renderLetters();
    $("qnum").textContent = `Question ${run.q} of ${QUESTIONS}`;
    $("hudQ").textContent = `Q${run.q}/${QUESTIONS}`;
    $("ask").hidden = false; $("result").hidden = true; WORD.el.hidden = true;
    planNext();
    ask(start.at.asked);
    answerBox.focus({ preventScroll: true });
  } else {
    // Back on a safe answer's sky result: the burst has long opened and lingers as glitter, its word where it hung.
    const r = run.results[run.results.length - 1];
    answer = { kind: "safe", answer: r.answer, tier: r.tier, total: r.total, points: r.points };
    inkText(WORD.el, r.tier);
    showWord(r.answer, wordSizeFor(r.answer));
    placeWord(innerWidth / 2, BURST_Y * innerHeight);
    $("ask").hidden = true; $("hudQ").textContent = `Q${run.q}/${QUESTIONS}`;
    burst = makeBurst(r.tier, r.total); burst.at = clockT - BUTTON_AT;
    const [c, x] = layer(AW, AH);
    drawSky(x, scene, skyTop(), 0);
    held = c; scene = null;
    want(stageOf(run.q), stageOf(Math.min(run.q + 1, QUESTIONS)), true, (s) => { before = s; });
    planNext();
    showResult();
  }
  addEventListener("resize", onResize);
  // Measured once Handjet is in: until then the box and the HUD would be sized in the fallback. If it doesn't load, the
  // page says so and the scene goes on in the fallback.
  void document.fonts.load(`400 30px ${fontFamily}`).then(
    (faces) => {
      if (stopped) return;
      if (!faces.length) io.fault(new Error("Afterglow's font didn't load"));
      fit();
    },
    (err) => { if (!stopped) io.fault(err); },
  );
  raf = requestAnimationFrame(frame);

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    clearTimeout(refuseTimer);
    removeEventListener("resize", onResize);
    $<HTMLFormElement>("form").removeEventListener("submit", onSubmit);
    answerBox.removeEventListener("beforeinput", onBeforeInput);
    answerBox.removeEventListener("input", onInput);
    answerBox.removeEventListener("compositionend", onCompositionEnd);
    $("out").removeEventListener("click", onOut);
  };
}
