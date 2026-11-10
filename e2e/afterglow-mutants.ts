// Afterglow's mutants (docs/milestones/M14-14c-6-afterglow-in-play.md, 14c-6b-2b, answers 48, 51 and 61 to 66): proof
// that the full look check can fail. Each is a broken copy of the game's compiled code, as the dev server sends it to
// the check's pages, so no file on disk changes (answer 48; Playwright, network: modifying a response). Carried from
// RIFF-mocks `themes/festival/mutants.mjs` at fcc11e4, each break rewritten for the compiled code; run by
// `npm run check:afterglow-mutants` (scripts/afterglow-mutants.ts).
import type { BrowserContext } from "@playwright/test";

// A text in one source file's compiled module and what replaces it. It must be in that module exactly once.
export type Break = { file: string; find: string; put: string };
// A mutant is caught when at least `need` (default 1) of the lines whose names match `want` fail, as mutants.mjs
// judged. `withFps` runs it alone with the fps test, whose line is the only one that can catch it (answer 66).
export type Mutant = { breaks: Break[]; want: RegExp; need?: number; withFps?: true };

export const MUTANT_PORT = 3001; // Answers 63, 65: their own dev server, so game 2's session keeps port 3000.
export const MUTANT_POOL = 4; // mutants.mjs: "eight made the PC unusable"; answer 48.
// The unbroken game, run through the whole check under the same routes before any mutant (answer 69): a line that fails
// with nothing broken would be counted as a catch, as the first full run counted R7's (ticket 14c-6b-2b, Evidence).
export const BASELINE = "the unbroken game";

const SCENE = "src/afterglow/scene.ts", STREET = "src/afterglow/street.ts", CSS = "src/afterglow/afterglow.module.css", TUNE = "src/config/tunables.ts";
// next/font's own module for Handjet and its stylesheet (src/afterglow/font.ts), named by the font's settings.
const FONT = "src/afterglow/handjet_18b491f6.js", FONT_CSS = "src/afterglow/handjet_18b491f6.module.css";

// The reviewer's eleven, as mutants.mjs's `R`.
const R = {
  timeupRises: { file: SCENE, find: 'if (t >= phaseDur) showEnding("timeup", answer);', put: 'if (answer) placeWord(innerWidth / 2, innerHeight * CHARGE_Y - t * 400); if (t >= phaseDur) showEnding("timeup", answer);' },
  serif: { file: CSS, find: ".afterglow-module__l4pe7a__q {\n  text-align: center;", put: ".afterglow-module__l4pe7a__q {\n  text-align: center; font-family: serif;" },
  greenSmoke: { file: SCENE, find: "g.drawImage(img, Math.round(x) - (img.width >> 1), Math.round(yy) - (img.height >> 1));", put: 'rc(x, yy, 9, 9, "#2fbf5a");' },
  secsFrozen: { file: SCENE, find: "String(Math.ceil(l))", put: '"20"' },
  litTower: { file: STREET, find: "lit = isOn(ON.window(R())), cloth", put: "lit = (R(), true), cloth" },
  noRumbleX: { file: SCENE, find: "(n & 1 ? 1 : -1) * Math.ceil(hash(n, 5) * amp)", put: "0" },
  noRumbleY: { file: SCENE, find: "(n >> 1 & 1 ? 1 : -1) * Math.round(hash(n, 6) * amp)", put: "0" },
  noZoom: { file: SCENE, find: "w * WALK_ZOOM[walkKind]", put: "0" },
  // The burst/result/leaving case's call (16 spaces), not the ending's (24), as mutants.mjs's first match.
  noBurst: { file: SCENE, find: "\n                drawBurst(burst, clockT - burst.at);", put: "" },
  allCommon: { file: SCENE, find: "if (!dud) burst = makeBurst(r.tier", put: 'if (!dud) burst = makeBurst("common"' },
  noFloors: { file: SCENE, find: "CLIMB_FLOORS, jolt", put: "0, jolt" },
  noEmbers: { file: SCENE, find: "embers(t);\n", put: "\n" },
};

// The 84 of mutants.mjs's 86 that 6b-2b carries, in its order, each rewritten for the compiled code (the two not carried are in the
// ticket's Source diff), then the six of answer 61.
export const MUTANTS: Record<string, Mutant> = {
  "R1 the word rises in a time-out": { breaks: [R.timeupRises], want: /time-out: the word never leaves/ },
  "R2 a hidden element in a second font": { breaks: [R.serif], want: /one font/ },
  "R3 green smoke": { breaks: [R.greenSmoke], want: /family or exactly the ramp|plum to amber/ },
  "R4 the seconds freeze": { breaks: [R.secsFrozen], want: /in step with the seconds/ },
  "R5 tower windows lit at Q1": { breaks: [R.litTower], want: /Q1 unlit/ },
  "R6 no rumble": { breaks: [R.noRumbleX, R.noRumbleY], want: /whole word rumbles/ },
  "R7 the walk doesn't zoom": { breaks: [R.noZoom], want: /Q3 and Q6 are major/ },
  "R8 no burst in the flow": { breaks: [R.noBurst], want: /burst of the right shape|common and rare bursts/ },
  "R9 every burst in the flow is common": { breaks: [R.allCommon], want: /burst of the right shape|common and rare bursts/ },
  "R10 no tower": { breaks: [R.noFloors], want: /tower of floors/ },
  "R11 no embers": { breaks: [R.noEmbers], want: /embers fall/ },
  "notracker": { breaks: [{ file: SCENE, find: "const res = run.results", put: "return; const res = run.results" }], want: /sky lantern joins/ },
  "combo, all eleven": { breaks: Object.values(R), want: /time-out: the word never|one font|ramp in play|plum to amber|in step with the seconds|Q1 unlit|rumbles|Q3 and Q6 are major|burst of the right|tower of floors|embers fall/, need: 9 },
  // Round 6. The charge's placeWord only; the wait's (the game's own phase, answer 16) keeps its rumble, as the mock had no wait.
  "no rumble on the lettering": { breaks: [{ file: SCENE, find: "e) + r.x * U, lerp(WORD.from.y, innerHeight * CHARGE_Y, e) + (r.y + dip) * U", put: "e), lerp(WORD.from.y, innerHeight * CHARGE_Y, e) + dip * U" }], want: /whole word rumbles/ },
  "the rumble doesn't build": { breaks: [{ file: SCENE, find: "k = clamp01(t / T)", put: "k = 1" }], want: /whole word rumbles/ },
  "the rumble ignores rarity": { breaks: [{ file: SCENE, find: "m = RUMBLE[kind]", put: "m = RUMBLE.common" }], want: /rumble differs/ },
  "straight flight": { breaks: [{ file: SCENE, find: " + f.sway * env * Math.sin(6.2832 * f.turns * s)", put: "" }], want: /sways in an S-curve/ },
  "every answer wobbles alike": { breaks: [{ file: TUNE, find: "WOBBLE: {\n        common: .2,\n        uncommon: .12,\n        rare: .05", put: "WOBBLE: {\n        common: .12,\n        uncommon: .12,\n        rare: .12" }], want: /sways in an S-curve/ },
  "flies off screen on a phone": { breaks: [{ file: SCENE, find: "sway: Math.min(WOBBLE[tier] * innerWidth, room)", put: "sway: WOBBLE[tier] * innerWidth * 3" }], want: /stays on screen/ },
  "no acceleration": { breaks: [
    { file: SCENE, find: "1 - Math.pow(1 - Math.pow(clamp01(k), CLIMB_IN), CLIMB_OUT)", put: "1 - Math.pow(1 - clamp01(k), CLIMB_OUT)" },
    { file: SCENE, find: "rise = w * w * (3 - 2 * w)", put: "rise = 1 - (1 - w) * (1 - w)" },
  ], want: /accelerates off the ground/ },
  "no deceleration": { breaks: [{ file: SCENE, find: "1 - Math.pow(1 - Math.pow(clamp01(k), CLIMB_IN), CLIMB_OUT)", put: "Math.pow(clamp01(k), CLIMB_IN)" }], want: /slows to a hang/ },
  "the burst fades": { breaks: [{ file: SCENE, find: "if (b.linger) drawGlitter(b, age);", put: "" }], want: /burst lingers|holds its shape/ },
  "the glitter stops moving": { breaks: [{ file: SCENE, find: "function drawGlitter(b, age) {", put: "function drawGlitter(b, age) { age = Math.min(age, 5);" }], want: /burst lingers/ },
  "the glitter thins away": { breaks: [{ file: SCENE, find: "n = GLITTER_N[b.tier]", put: "n = Math.max(0, Math.round(GLITTER_N[b.tier] * (1 - age / 40)))" }], want: /holds its shape/ },
  "the burst keeps flashing": { breaks: [{ file: SCENE, find: "const T = BURST_S[b.tier];", put: "if (b.linger && fract(age / 1.5) < .3) g.drawImage(b.glow[0], Math.round(b.cx) - (b.glow[0].width >> 1), Math.round(b.cy) - (b.glow[0].width >> 1)); const T = BURST_S[b.tier];" }], want: /never flashes again/ },
  // WORD_INK stayed in scene.ts with the art's colours (Source diff, "Their numbers move to tunables.ts").
  "one colour for all rarities": { breaks: [{ file: SCENE, find: 'uncommon: "#b6f23c",\n    rare: "#6fd0ff",', put: 'uncommon: "#ffd23c",\n    rare: "#ffd23c",' }], want: /word's colour differs/ },
  "a word colour not the ramp's": { breaks: [{ file: SCENE, find: 'rare: "#6fd0ff",\n    caught', put: 'rare: "#ff40c0",\n    caught' }], want: /share the rarity's colour|ramp/ },
  "square boxes": { breaks: [{ file: SCENE, find: "h - 1 - (T - 1 - a), r)", put: "h - 1 - (T - 1 - a), 0)" }], want: /stepped pills/ },
  "the thin plain cord": { breaks: [{ file: SCENE, find: "fuseW = Math.max(FUSE_MIN, Math.round(FUSE_CSS * K / U));", put: "fuseW = 3;" }], want: /a sparkler/ },
  "no sparks along the cord": { breaks: [{ file: SCENE, find: "spit(f, x0, y0, head, Math.round(lerp(SPIT_EARLY, SPIT_LATE, late)), t, SPIT_REACH * (1 + late));", put: "" }], want: /a sparkler/ },
  "the chopped-off section: the tower floats": { breaks: [{ file: SCENE, find: "camY + sc.vp[1]", put: "camY - sc.ext" }], want: /no gap between tower and street/ },
  // The three that used to be caught only by a stall.
  // The game's time-out is the server's (fuseOut -> io.timeUp() -> "over"); the mock judged the typed text and charged.
  // Here the time-out sets up its word as usual, then charges it as a common answer, as the mock's judge launched it.
  "a time-out launches": { breaks: [{ file: SCENE, find: 'if (r === "over") startTimeup();', put: 'if (r === "over") { startTimeup(); startCharge({ caught: false, answer: answer ? answer.answer : "kite", tier: "common", total: 25, points: 25 }); }' }], want: /time-out: the word never leaves/ },
  // The game's `answer` is a copy of the reply's result (the mock's was the same object), so both are made safe.
  "a dud reaches the sky": { breaks: [{ file: SCENE, find: "const dud = r.caught;", put: 'if (r.caught) { r = { ...r, caught: false, tier: "common", total: 25, points: 25 }; answer = { kind: "safe", answer: r.answer, tier: "common", total: 25, points: 25 }; } const dud = false;' }], want: /a dud never reaches the sky/ },
  "an empty time-out crashes": { breaks: [{ file: SCENE, find: "smokeAt = clockT;", put: "smokeAt = answer.kind && clockT;" }], want: /empty box/ },
  // The rules from the first pass.
  "lettering scales": { breaks: [{ file: SCENE, find: "${y}px)`", put: "${y}px) scale(${phase === 'climb' ? 1.15 : 1})`" }], want: /lettering never changes/ },
  "lettering resized in the climb": { breaks: [{ file: SCENE, find: "if (k >= 1) startBurst();", put: "WORD.el.style.fontSize = Math.round(WORD_SIZE * K * .8) + 'px'; if (k >= 1) startBurst();" }], want: /lettering never changes/ },
  "rarity doesn't change the charge": { breaks: [{ file: TUNE, find: "CHARGE_S: {\n        common: .7,\n        uncommon: 1.2,\n        rare: 1.9", put: "CHARGE_S: {\n        common: 1.2,\n        uncommon: 1.2,\n        rare: 1.2" }], want: /charges longer/ },
  "rarity doesn't change the climb": { breaks: [{ file: TUNE, find: "CLIMB_S: {\n        common: 3.7,\n        uncommon: 3.3,\n        rare: 2.9", put: "CLIMB_S: {\n        common: 3.3,\n        uncommon: 3.3,\n        rare: 3.3" }], want: /climbs faster/ },
  "burst ignores rarity": {
    breaks: [
      { file: SCENE, find: "if (b.tier === \"common\") peony(b, a, open);\n        else if (b.tier === \"uncommon\") chrysanthemum(b, a, open);\n        else willow(b, a, age);", put: "peony(b, a, open);" },
      { file: SCENE, find: "function shapePoint(b, v, w) {", put: "function shapePoint(b, v, w) { b = { ...b, tier: 'common' };" },
    ],
    want: /burst of the right shape|common and rare bursts/,
  },
  "burst ignores points": { breaks: [{ file: SCENE, find: "lerp(BURST_R[0], BURST_R[1], Math.sqrt(clamp01(pts)))", put: "BURST_R[1]" }], want: /burst size follows points/ },
  "fuse at the wrong speed": { breaks: [{ file: SCENE, find: "Q_SECONDS) * n)", put: "Q_SECONDS) * n * .7)" }], want: /in step with the seconds/ },
  "sparks never grow": { breaks: [{ file: SCENE, find: "size = Math.round(lerp(SPARK_EARLY, SPARK_LATE, late))", put: "size = SPARK_EARLY" }], want: /sparks grow/ },
  "the box never shakes": { breaks: [{ file: SCENE, find: "amp = Math.ceil(late * SHAKE_MAX) * (late > 0 ? 1 : 0)", put: "amp = 0" }], want: /box shakes/ },
  // The mock's #result is the module's .result class.
  "a result card appears": { breaks: [{ file: CSS, find: ".afterglow-module__l4pe7a__tier {", put: ".afterglow-module__l4pe7a__result { background: var(--panel); border: 2px solid var(--edge); } .afterglow-module__l4pe7a__tier {" }], want: /no result card/ },
  "green in a burst": { breaks: [{ file: SCENE, find: "ink[Math.max(2, 5 - (f >> 1) - (i % 3 === 0 ? 1 : 0))]", put: "\"#2fbf5a\"" }], want: /family or exactly the ramp|tier's ramp/ },
  "off-grid art in the climb": { breaks: [{ file: SCENE, find: "camY = dev(e * climbD)", put: "camY = e * climbD" }], want: /grid:/ },
  // The mock's page-wide `scene` is the scene's sceneNow().
  "scaling in the climb": { breaks: [{ file: SCENE, find: "blast(t, camY);", put: "g.drawImage(sceneNow().deck, 0, 0, 40, 40, 0, 0, 44, 44); blast(t, camY);" }], want: /grid:/ },
  // Round 7.
  "burst in the wrong tier's ramp": { breaks: [{ file: SCENE, find: "const ink = RAMP[b.tier], n = GLITTER_N", put: "const ink = RAMP[b.tier === 'rare' ? 'common' : 'rare'], n = GLITTER_N" }], want: /tier's ramp|ramp in play/ },
  // The compiled PUFFS spans lines; the first makePuff always returns a canvas, so the second (the real one) never runs.
  "a ramp colour in the smoke": { breaks: [{ file: SCENE, find: "].map((r)=>makePuff(r, r > 8 ? [", put: "].map((r)=>makePuff(r, [RAMP.common[3], RAMP.common[4]]) || makePuff(r, r > 8 ? [" }], want: /ask, descent, dud and time-out have no ramp/ },
  "word colour right but tier name not": { breaks: [{ file: SCENE, find: "inkText($(\"rTier\"), r.tier);", put: "" }], want: /share the rarity's colour/ },
  "points colour wrong": { breaks: [{ file: SCENE, find: "inkText($(\"rPts\"), r.tier)", put: "inkText($(\"rPts\"), \"uncommon\")" }], want: /share the rarity's colour/ },
  "the flavour line takes the rarity's colour": { breaks: [{ file: SCENE, find: "inkText($(\"rPts\"), r.tier);", put: "inkText($(\"rPts\"), r.tier); inkText($(\"rFlav\"), r.tier);" }], want: /keep their colours/ },
  // Round 8: the results, the box's cord and the outlines.
  "a walk down after Q7": { breaks: [{ file: SCENE, find: "const last = run.q >= QUESTIONS", put: "const last = false" }], want: /same sky|leads to the results/ },
  "the cord stays tan": { breaks: [{ file: SCENE, find: "? RAMP[answer.tier] :", put: "? null :" }], want: /box cord/ },
  "the cord takes the wrong rarity": { breaks: [{ file: SCENE, find: "? RAMP[answer.tier] :", put: "? RAMP.uncommon :" }], want: /box cord/ },
  "the outline stays plum": { breaks: [{ file: SCENE, find: "key && key in RAMP ? RAMP[key][0] : ", put: "" }], want: /darkest step|recap row wears/ },
  "the recap loses its last row": { breaks: [{ file: SCENE, find: "run.results.map(", put: "run.results.slice(0, -1).map(" }], want: /recap lists all seven|a dud's ending lists/ },
  "the recap only on a full run": { breaks: [{ file: SCENE, find: "= !run.results.length", put: "= kind !== \"complete\" || !run.results.length" }], want: /a dud's ending lists/ },
  "no fade to the results": { breaks: [{ file: SCENE, find: "String(clamp01(t / RESULTS_FADE_S))", put: "\"1\"" }], want: /fades? out and the results fade in/ },
  // The "over" case's held sky (24 spaces); the burst/result case's tracker() sits at 16.
  "the burst gone behind the results": { breaks: [{ file: SCENE, find: "drawBurst(burst, clockT - burst.at);\n                        tracker();", put: "tracker();" }], want: /still on screen behind/ },
  // The second review's finds.
  "a dud's recap goes one colour": { breaks: [{ file: SCENE, find: "inkText(li, r.caught ? \"caught\" : r.tier)", put: "inkText(li, \"caught\")" }], want: /dud's recap keeps/ },
  "the near buildings stop short coming down": { breaks: [{ file: SCENE, find: "if (k === \"near\") {", put: "if (0) {" }], want: /reach the screen's edges/ },
  "climb no longer than before": { breaks: [{ file: TUNE, find: "CLIMB_S: {\n        common: 3.7,\n        uncommon: 3.3,\n        rare: 2.9", put: "CLIMB_S: {\n        common: 2.7,\n        uncommon: 2.3,\n        rare: 1.9" }], want: /longer and much faster/ },
  "only as many floors as before": { breaks: [{ file: TUNE, find: "CLIMB_FLOORS: 30,", put: "CLIMB_FLOORS: 6," }], want: /longer and much faster/ },
  "layers back to whole art pixels": { breaks: [{ file: SCENE, find: "Math.round(v * S) / S", put: "Math.round(v)" }], want: /glide: at the slow ends/ },
  "canvas-nudge sawtooth": {
    breaks: [
      { file: SCENE, find: "Math.round(v * S) / S", put: "Math.round(v)" },
      { file: SCENE, find: "drawSky(g, sc, skyOff, dx);\n        if (floors)", put: "screen.style.transform = `scale(${1 / DPR}) translateY(${(camRaw - camY) * S}px)`; drawSky(g, sc, skyOff, dx);\n        if (floors)" },
      { file: SCENE, find: "camY = dev(e * climbD), skyOff = dev(e * skyTop());", put: "camY = dev(e * climbD), skyOff = dev(e * skyTop()); camRaw = e * climbD;" },
      { file: SCENE, find: "let camNow = 0", put: "let camRaw = 0, camNow = 0" },
    ],
    want: /isn't nudged/,
  },
  "the word back to whole art pixels": { breaks: [{ file: SCENE, find: "Math.round((cx - WORD.w / 2) * DPR) / DPR, y = Math.round((cy - WORD.h / 2) * DPR) / DPR", put: "Math.round((cx - WORD.w / 2) / U) * U, y = Math.round((cy - WORD.h / 2) / U) * U" }], want: /glide: at the slow ends/ },
  "the rumble off whole art pixels": { breaks: [{ file: SCENE, find: "Math.ceil(hash(n, 5) * amp),", put: "(Math.ceil(hash(n, 5) * amp) + .4)," }], want: /rumble stays in whole art/ },
  "frame cap back to the old line": { breaks: [{ file: SCENE, find: "if (ms < nextDraw - FRAME_SLACK_MS) return false;", put: "if (ms - (window.__l ?? -1e9) < 1000 / FPS - 3) return false;\n        window.__l = ms; return true;" }], want: /frame cap/ },
  "a second transform": { breaks: [{ file: SCENE, find: "blast(t, camY);", put: "g.translate(0, 0); blast(t, camY);" }], want: /exactly one transform/ },
  "no lantern": { breaks: [{ file: SCENE, find: "drawLantern(t);", put: "" }], want: /the lantern is drawn/ },
  "no lantern phase": { breaks: [{ file: SCENE, find: "if (fresh.length) startLetter(", put: "if (0) startLetter(" }], want: /lantern shows once/ },
  "lantern at a question with no new letter": { breaks: [{ file: SCENE, find: "if (fresh.length) startLetter(fresh[0].toUpperCase());", put: "if (fresh.length || run.q === 3) startLetter((fresh[0] || 'x').toUpperCase());" }], want: /lantern shows once/ },
  "lantern twice": { breaks: [{ file: SCENE, find: "function endLetter() {", put: "function endLetter() { if (!window.__twice) { window.__twice = true; startLetter(letterNow.L); return; } window.__twice = false;" }], want: /lantern shows once/ },
  // The mock's question started its clock at once; here the clock starts from the database's reply (ask()), so the
  // break carries the lantern's start (phaseAt) to it.
  "timer running during the lantern": {
    breaks: [
      { file: SCENE, find: "function endLetter() {", put: "function endLetter() { window.__q0 = phaseAt;" },
      { file: SCENE, find: "qStart = clockT - (Q_SECONDS - asked.msLeft / 1000);", put: "qStart = window.__q0 ?? clockT - (Q_SECONDS - asked.msLeft / 1000); window.__q0 = undefined;" },
    ],
    want: /timer starts full/,
  },
  "no caption": { breaks: [{ file: SCENE, find: "$(\"caption\").hidden = false;", put: "" }], want: /caption fits/ },
  "the letter isn't struck": { breaks: [{ file: SCENE, find: "run.taken.forEach(", put: "run.taken.slice(0, -1).forEach(" }], want: /struck in the row/ },
  "no pop": { breaks: [{ file: SCENE, find: "|| step >= POP_STEPS.length", put: "|| true" }], want: /struck in the row/ },
  "the lantern isn't announced": { breaks: [{ file: SCENE, find: "$(\"verdict\").textContent = `${L} is out.`;", put: "" }], want: /announced/ },
  "a Q3 step no longer major": { breaks: [{ file: TUNE, find: "MAJOR: [\n        3,\n", put: "MAJOR: [\n" }], want: /Q3 and Q6 are major/ },
  "lanterns lit at Q1": { breaks: [{ file: STREET, find: "isOn = (on)=>STG >= on - 1e-6", put: "isOn = (on)=>true" }], want: /Q1 unlit/ },
  // The game's stripTaken returns early when nothing is taken; the break makes it always do so.
  "taken letters allowed": { breaks: [{ file: SCENE, find: "if (clean === el.value) return false;", put: "return false;" }], want: /taken letter/ },
  "taken letters stripped mid-composition": { breaks: [{ file: SCENE, find: "!e.isComposing && ", put: "" }], want: /composition/ },
  "street off the grid at the screen": { breaks: [{ file: SCENE, find: "Math.round(dh / (dh > dw ? REF_TALL : REF_WIDE))", put: "dh / (dh > dw ? REF_TALL : REF_WIDE)" }], want: /whole-number scale/ },

  // Answer 61: the line 6b-2a added (answer 56), and each bug 6b-2a's check found, back in.
  "off-list text doesn't shake the box": { breaks: [{ file: SCENE, find: "isn't in our list. Try another answer.`);\n            refuse();", put: "isn't in our list. Try another answer.`);" }], want: /off-list text shakes the box/ },
  "the buttons wear the app's shadow": { breaks: [{ file: CSS, find: "--shadow-button: none;\n  transform: none;", put: "" }], want: /plum to amber|the family or exactly the ramp/ },
  "a word charges from the last word's place": { breaks: [{ file: SCENE, find: "placeWord(WORD.from.x, WORD.from.y);", put: "" }], want: /dud: charges/ },
  "a cloud drawn in one pre-draw step": { breaks: [{ file: STREET, find: "T[(py + YOFF) * W + px] = ramp[clamp(flo(l), 0, 4)];\n        }\n        yield;", put: "T[(py + YOFF) * W + px] = ramp[clamp(flo(l), 0, 4)];\n        }" }], want: /pre-draw never stalls a frame/, withFps: true },
  "the word on its own GPU layer": { breaks: [{ file: CSS, find: ".afterglow-module__l4pe7a__word {\n", put: ".afterglow-module__l4pe7a__word {\n  will-change: transform;\n" }], want: /lettering never changes/ },
  // As where Arial isn't installed (PR #172's first e2e run): a fallback face in the family that can't load.
  "Afterglow's font load fails": {
    breaks: [
      { file: FONT, find: `fontFamily: "'handjet'"`, put: `fontFamily: "'handjet', 'handjet Fallback'"` },
      { file: FONT_CSS, find: "font-weight: 100 900;\n}", put: `font-weight: 100 900;\n}\n@font-face {\n  font-family: "handjet Fallback";\n  src: local("No Such Font");\n}` },
    ],
    want: /no console errors/,
  },
  // The drawing schedule the mutants' runs led to (answers 73 to 76): a street not drawn yet is waited for, the walk's first.
  "Walk on doesn't wait for its street": { breaks: [{ file: SCENE, find: "(run.q >= QUESTIONS || ready(before))", put: "(run.q >= QUESTIONS || true)" }], want: /Walk on waits for it/ },
  "the landing doesn't wait for the next street": { breaks: [{ file: SCENE, find: "if (t >= phaseDur && ready(next)) {", put: "if (t >= phaseDur) {" }], want: /holds its landing/ },
  "the walk's street drawn last": { breaks: [{ file: SCENE, find: "wantFirst(stageOf(q), cam, true,", put: "want(stageOf(q), cam, true," }], want: /holds its landing/ },
};

// Where a file's module sits in a Turbopack dev chunk: each module opens with its path, a script's as a string before
// its factory and a stylesheet's in a comment, and runs to the next module's opening. The same module can be in more
// than one chunk the page loads (the scene is in two), so a break goes into every copy, each holding it exactly once.
const heads = (file: string) => [`"[project]/${file} [app-client] (ecmascript)", (`, `/* [project]/${file} [app-client] (css) */`];
const OPENINGS = ['\n"[project]/', "\n/* [project]/"];

// Puts a mutant's breaks into one chunk's text: counts each break's copies in `hits`, and anything that didn't match
// exactly once in `errors`.
export function breakChunk(text: string, breaks: Break[], hits: number[], errors: string[]) {
  breaks.forEach((b, i) => {
    for (const head of heads(b.file)) {
      for (let at = text.indexOf(head); at !== -1; at = text.indexOf(head, at + head.length)) {
        const from = at + head.length, ends = OPENINGS.map((o) => text.indexOf(o, from)).filter((e) => e !== -1);
        const to = ends.length ? Math.min(...ends) : text.length, part = text.slice(from, to), n = part.split(b.find).length - 1;
        if (n !== 1) errors.push(`${b.file} holds ${n} of ${JSON.stringify(b.find)}`);
        else { text = text.slice(0, from) + part.replace(b.find, () => b.put) + text.slice(to); hits[i]++; }
      }
    }
  });
  return text;
}

// What went wrong with a mutant's breaks, once the page's chunks are in: none means every break went into every copy.
export function misses(breaks: Break[], hits: number[], errors: string[]) {
  return [...new Set(errors), ...breaks.filter((_, i) => !hits[i]).map((b) => `no module sent was ${b.file}, for ${JSON.stringify(b.find)}`)];
}

// The check's pages under a mutant: every chunk the dev server sends goes through its breaks. The returned function
// throws, naming the mutant and the text, unless every break went into every copy of its module.
export async function breakCode(c: BrowserContext, name: string) {
  if (name !== BASELINE && !MUTANTS[name]) throw new Error(`no mutant named ${JSON.stringify(name)}`);
  const breaks = name === BASELINE ? [] : MUTANTS[name].breaks, hits = breaks.map(() => 0), errors: string[] = [];
  await c.route("**/_next/static/chunks/**", async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, body: breakChunk(await res.text(), breaks, hits, errors) });
  });
  return () => {
    const wrong = misses(breaks, hits, errors);
    if (wrong.length) throw new Error(`mutant ${JSON.stringify(name)}: ${wrong.join("; ")}`);
  };
}
