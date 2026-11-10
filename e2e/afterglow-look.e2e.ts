// Afterglow's look check (docs/milestones/M14-14c-6-afterglow-in-play.md, 14c-6b-2a, answers 44 to 56): the mock's
// check, RIFF-mocks `themes/festival/check.mjs` at fcc11e4, on the real scene at /check/afterglow, its replies scripted.
// Each of the mock's named lines is a soft check under the same name, so one failure doesn't hide the rest, and is
// printed as the mock printed it ("pass", "FAIL" or "note", the size, the name, what was measured).
// Two sets (answers 15, 47, 50): the CI set, the phone size's scripted run, in `npm run test:e2e`; the full set, both
// sizes and every section, by `npm run check:afterglow`, in real Chrome (14c-5 answer 41), the project afterglow-full.
// The game dropped the skip link and New show (answer 46): a section that skipped ahead or played again opens the test
// page at the question it needs (?q=N), and the lines about those two are rewritten or dropped, each said where.
// Hypothesis: the scene meets each line. Disproved by any failed line. 6b-2b's mutants break it one rule at a time.
import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { DAY } from "../src/app/check/afterglow/day";
import { AFTERGLOW } from "../src/config/tunables";
import {
  A, AGES, ARC, CLIMB_FLOORS, DESCENT_FLOORS, DOWN, EDGE_RUN, FAST, FPS_FLOOR, HITCH_LIMIT, LINGER_S, R, RUN, SIZES, SWEEP, SWEEP_Q, TAKEN_AT, TOWER_IN, V5,
  WALK_PARALLAX, WORD_ENTER, allFonts, analyser, answerIt, artColours, asking, bandHash, burstLit, buttonUp, contrast, emberCount, fireCount, fitZoom,
  fmtM, freeze, grabFloor, hueOfN, inFamily, lanternArea, landed, open, pillFacts, rgbHexOf, rgbOf, shapeOk, stageMean, startTrace, thaw,
  thawTo, towerJoin, until, walkEdge, wordFacts, type LayerFrame, type Mark, type Trace,
} from "./afterglow-look";

const FLOORS = { CLIMB_FLOORS, DESCENT_FLOORS, TOWER_IN };
// The full set runs in its own project (playwright.config.ts); CI's runs the phone size's scripted run alone.
const isFull = () => test.info().project.name === "afterglow-full";
const realChrome = () => test.info().project.use.channel === "chrome";
// A named line, as the mock's say(): printed, and a soft check under its name.
const say = (size: string, name: string, ok: unknown, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"} ${size} ${name} ${detail}`);
  expect.soft(!!ok, `${size} ${name}: ${detail}`).toBe(true);
};
// The answer typed, or a FAIL line saying the box didn't take it and where the game was (answer 80): a broken game
// fails by name rather than ending the run, and the caller decides whether to go on.
const typeIn = async (p: Page, size: string, word: string) => {
  if (await answerIt(p, word)) return true;
  say(size, "every answer goes into the box", false, `"${word}" not taken, on ${await p.evaluate(() => `${__core.phase} Q${__core.q}`)}`);
  return false;
};
// A number this browser cannot judge (answer 41): printed, never counted as a pass.
const note = (size: string, name: string, detail: string) => console.log(`note ${size} ${name} ${detail}`);
const shots = () => { const d = test.info().outputPath("shots"); fs.mkdirSync(d, { recursive: true }); return d; };
const phases = (p: Page) => p.evaluate(() => __core.log.map((e) => e.phase));

// The mock waited on each step, never on the whole check: a whole section has no limit of its own, each wait the mock's
// (LIBRARY_TIMEOUT unless it set its own, e2e/afterglow-look.ts).
test.beforeEach(() => test.setTimeout(0));

// ---------- Layout, at every size the ticket names ----------
test("Afterglow's layout at every size the ticket names", { tag: "@full" }, async ({ browser }) => {
  const dir = shots();
  for (const [w, h, d] of [[390, 844, 3], [360, 640, 3], [1920, 1080, 1], [1366, 768, 1], [844, 390, 3]]) {
    const size = `${w}x${h}@${d}`, { c, p, errs } = await open(browser, { viewport: { width: w, height: h }, deviceScaleFactor: d }, false);
    const r = await p.evaluate(() => {
      const box = (n: string) => { const b = __part(n).getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
      const { S, AW: aw, AH: ah, U } = __core.place(), cv = __part("screen").getBoundingClientRect();
      const a = __core.scene!.ground!.getContext("2d")!.getImageData(0, 0, aw, Math.floor(ah * .4)).data, opaque = (x0: number, x1: number) => { let n = 0, t = 0; for (let y = 0; y < Math.floor(ah * .4); y += 3) for (let x = x0; x < x1; x++) { t++; if (a[(y * aw + x) * 4 + 3]) n++; } return n / t; };
      const edge = Math.floor(aw * .06), mid = Math.floor(aw / 2);
      return { S, aw, ah, U, cw: cv.width, ch: cv.height, scrollW: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, hud: box("hud"), ask: box("ask"), ans: box("answer"), left: opaque(0, edge), right: opaque(aw - edge, aw), mid: opaque(mid - 8, mid + 8) };
    });
    const dw = Math.round(w * d), dh = Math.round(h * d), wantS = Math.max(1, Math.round(dh / (dh > dw ? 633 : 540)));   // the brief's formula, worked here on its own
    const inside = (b: { l: number; t: number; r: number; b: number }) => b.l >= 0 && b.t >= 0 && b.r <= r.iw && b.b <= r.ih;
    const apart = r.hud.b <= r.ask.t || r.ask.b <= r.hud.t || r.hud.r <= r.ask.l || r.ask.r <= r.hud.l;
    say(size, "whole-number scale, art size as the brief says", r.S === wantS && Number.isInteger(r.S) && r.aw === Math.ceil(dw / wantS) && r.ah === Math.ceil(dh / wantS), `S ${r.S}, art ${r.aw}x${r.ah}`);
    say(size, "art covers the screen, unstretched", Math.abs(r.cw * d - r.aw * r.S) < .01 && Math.abs(r.ch * d - r.ah * r.S) < .01 && r.aw * r.S >= dw && r.ah * r.S >= dh, `${r.cw * d}x${r.ch * d} device px`);
    say(size, "no sideways scroll", r.scrollW <= r.iw, `${r.scrollW} of ${r.iw}`);
    say(size, "prompt and HUD on screen, not overlapping", inside(r.hud) && inside(r.ask) && inside(r.ans) && apart, `HUD bottom ${r.hud.b.toFixed(0)}, prompt ${r.ask.t.toFixed(0)}-${r.ask.b.toFixed(0)} of ${r.ih}`);
    say(size, "buildings at the edges, middle open", r.left > .7 && r.right > .7 && r.mid < .4, `opaque: left ${r.left.toFixed(2)}, right ${r.right.toFixed(2)}, middle ${r.mid.toFixed(2)}`);
    say(size, "no console errors", !errs.length, errs.slice(0, 2).join(" | "));
    await p.screenshot({ path: path.join(dir, `layout-${w}x${h}.png`) });
    // The mock skipped to Q2's lantern; here Q1 is answered and walked on from, fast (answer 46).
    await p.evaluate((f) => __core.rate(f), FAST);
    await typeIn(p, size, RUN[0]);
    await buttonUp(p, 30000);
    await p.click(R);
    const lit = await freeze(p, { phase: "letter", t: 1 }, 30000);
    await p.waitForTimeout(40);
    const cap = !lit ? { shown: false, cap: { text: "no lantern" }, tx: { l: 0, r: 0, t: 0, b: 0 }, lett: { t: 0 }, bottom: 0, ih: 0, iw: 0 } : await p.evaluate(() => { const box = (n: string) => { const b = __part(n).getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, text: __part(n).textContent }; }, rg = document.createRange(); rg.selectNodeContents(__part("caption")); const tx = rg.getBoundingClientRect(), L = __core.lantern!, U = __core.place().U, y = __core.letterNow!.y * U; return { cap: box("caption"), tx: { l: tx.left, t: tx.top, r: tx.right, b: tx.bottom }, lett: box("lett"), bottom: y + L.h * U, iw: innerWidth, ih: innerHeight, shown: !__part("caption").hidden }; });
    await p.screenshot({ path: path.join(dir, `lantern-${w}x${h}.png`) });
    say(size, "the lantern's caption fits, under it", lit && cap.shown && cap.tx.l >= 0 && cap.tx.r <= cap.iw && cap.tx.b <= cap.ih && cap.tx.t >= cap.bottom - 1 && cap.lett.t >= 0 && cap.cap.text === "P is out", `"${cap.cap.text}" ${cap.tx.l.toFixed(0)}-${cap.tx.r.toFixed(0)}, ${cap.tx.t.toFixed(0)}-${cap.tx.b.toFixed(0)} of ${cap.ih}; lantern ends at ${cap.bottom.toFixed(0)}`);
    await c.close();
  }
});

// ---------- The frame cap, by simulated screens ----------
test("Afterglow's frame cap, by simulated screens", { tag: "@full" }, async ({ browser }) => {
  const { c, p } = await open(browser, SIZES[1][1], false);
  const table = await p.evaluate(() => {
    const out: Record<number, { fps: number; most: number }> = {}; window.requestAnimationFrame = () => 0;   // the page's own loop steps aside for the simulation
    for (const hz of [60, 75, 90, 120, 144, 360]) { __core.nextDraw = 0; const t0 = 1000, ms: number[] = []; for (let i = 0; i < hz * 4; i++) { const at = t0 + i * 1000 / hz; if (__core.frameGate(at)) ms.push(at); } const gaps = ms.slice(1).map((v, i) => v - ms[i]); out[hz] = { fps: gaps.length / ((ms.at(-1)! - ms[0]) / 1000), most: Math.max(...gaps) }; }
    return out;
  });
  say("all", "frame cap: 60 at most on every screen, never half rate", Object.entries(table).every(([hz, r]) => r.fps <= 60.6 && r.fps >= 59 && r.most <= 1000 / 60 + 1000 / +hz + 1.5), Object.entries(table).map(([hz, r]) => `${hz} Hz ${r.fps.toFixed(1)} fps, longest gap ${r.most.toFixed(1)} ms`).join("; "));
  await c.close();
});

// ---------- 60 fps: one whole run at the real clock, with nothing else going on ----------
for (const [size, opts] of SIZES) {
  test(`Afterglow at 60 fps, ${size}`, { tag: "@full" }, async ({ browser }) => {
    const { c, p, errs } = await open(browser, opts, false);
    // The mock also counted the play-again scene it kept; the game has none (answer 46).
    await p.evaluate(() => { __core.perf(); window.__mem = { max: 0, most: 0 }; setInterval(() => { const m = __core.memory(); window.__mem.max = Math.max(window.__mem.max, m.bytes); window.__mem.most = Math.max(window.__mem.most, +m.scene + +m.next + +m.before); }, 50); });
    for (let i = 0; i < RUN.length; i++) {
      await asking(p, i + 1, 40000);
      await typeIn(p, size, RUN[i]);
      await buttonUp(p, 40000);
      await p.click(R);
    }
    await until(p, () => __core.phase === "over", 60000);
    const f = await p.evaluate(() => __core.perf()), pre = await p.evaluate(() => __core.predraw), mem = await p.evaluate(() => window.__mem);
    (realChrome() ? (n: string, d: string) => say(size, n, f.avg < 16.7 && 1000 / f.ivAvg >= FPS_FLOOR, d) : (n: string, d: string) => note(size, n, d))("60 fps, whole run", `script ${f.avg.toFixed(2)} ms avg, ${f.max.toFixed(1)} ms worst; frame interval ${f.ivAvg.toFixed(2)} ms avg (${(1000 / f.ivAvg).toFixed(1)} fps), ${f.ivMax.toFixed(1)} ms worst; ${f.n} frames`);
    for (const [k, v] of Object.entries(f.phases)) console.log(`     ${size} ${k.padEnd(8)} script ${(v.sum / v.n).toFixed(2)} ms avg ${v.max.toFixed(1)} worst, interval ${(v.iv / v.n).toFixed(2)} avg ${v.ivMax.toFixed(1)} worst, ${v.n} frames`);
    say(size, "pre-draw never stalls a frame", pre.maxSlice < HITCH_LIMIT, `${pre.slices} slices, ${pre.ms.toFixed(0)} ms in all, worst ${pre.maxSlice.toFixed(1)} ms; waited for a street ${pre.waited} times (answer 76: printed, not judged); slowest step ${pre.maxStep.toFixed(1)} ms, ${pre.where}`);
    say(size, "memory bounded: two scenes at most", mem.most <= 2, `at most ${mem.most} scenes, ${(mem.max / 1048576).toFixed(1)} MB in canvases at the peak`);
    await c.close();
    // The same moments again, this time paying for raster inside the frame. The mock played again; here a new page.
    const again = await open(browser, opts, false), q = again.p;
    await q.evaluate(() => { const d = __core.draw; __core.draw = function () { d(); __core.g.getImageData(0, 0, 1, 1); }; __core.perf(); });
    await asking(q, 1, 15000);
    await typeIn(q, size, "kite");
    await buttonUp(q, 30000);
    await q.waitForTimeout(3000);
    await q.click(R);
    await asking(q, 2, 30000);
    await q.waitForTimeout(1000);
    const fl = await q.evaluate(() => __core.perf());
    (realChrome() ? (n: string, d: string) => note(size, n, d) : (n: string, d: string) => say(size, n, fl.avg < 16.7, d))("60 fps with raster paid inside the frame", `${fl.avg.toFixed(2)} ms avg, ${fl.max.toFixed(1)} ms worst; ${Object.entries(fl.phases).map(([k, v]) => `${k} ${(v.sum / v.n).toFixed(1)}/${v.max.toFixed(0)}`).join(", ")}`);
    say(size, "no console errors in the fps run", !errs.length && !again.errs.length, [...errs, ...again.errs].slice(0, 2).join(" | "));
    await again.c.close();
  });
}

// ---------- A street drawn late (answers 73, 74, ticket 14c-6b-2b): Walk on, then the landing, wait for it, the screen moving ----------
test("Afterglow waits for a street drawn late", async ({ browser }) => {
  const size = "phone", { c, p, errs } = await open(browser, SIZES[1][1], false), waitMs = AFTERGLOW.BUTTON_AT * 1000;
  await asking(p, 1);
  await typeIn(p, size, RUN[0]);
  await buttonUp(p, 30000);
  // Held from Q1's walk, once Q1's streets are drawn: Q2's walk and Q3's street are then asked for and never drawn.
  await until(p, () => __core.memory().before && __core.memory().next, 30000);
  await p.evaluate(() => __core.holdDrawing(true));
  await p.click(R);
  await asking(p, 2, 30000);
  const w0 = await p.evaluate(() => __core.predraw.waited), story = () => p.evaluate(() => __core.log.slice(-5).map((e) => `${e.phase} Q${e.q}`).join(" > "));
  await typeIn(p, size, RUN[1]);
  const buttonWaited = await until(p, (n) => __core.predraw.waited > n, 30000, w0);
  await p.evaluate(() => __core.perf());
  await p.waitForTimeout(waitMs);   // as long again as the button's own wait
  const atButton = await p.evaluate(() => ({ phase: __core.phase, hidden: __part("rBtn").hidden, frames: __core.perf().n }));
  say(size, "a late walk's street: Walk on waits for it, the screen moving", buttonWaited && atButton.phase === "result" && atButton.hidden && atButton.frames > 0, `${JSON.stringify(atButton)}; ${await story()}`);
  // Only the walk's street drawn, then held again: it goes first (answer 75), so Q3's street is still to draw at the landing.
  await p.evaluate(() => { __core.holdDrawing(false); const f = () => { if (__core.memory().before) __core.holdDrawing(true); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const shown = await buttonUp(p, 30000), nextLate = await p.evaluate(() => !__core.memory().next);
  const w1 = await p.evaluate(() => __core.predraw.waited);
  await p.click(R);
  const landingWaited = await until(p, (n) => __core.predraw.waited > n, 30000, w1);
  await p.evaluate(() => __core.perf());
  await p.waitForTimeout(waitMs);
  const atLanding = await p.evaluate(() => ({ phase: __core.phase, frames: __core.perf().n }));
  await p.evaluate(() => __core.holdDrawing(false));
  const landed2 = await until(p, () => __core.phase !== "descent", 30000), pre = await p.evaluate(() => __core.predraw);
  say(size, "a late next street: the walk holds its landing for it, the screen moving, then lands", shown && nextLate && landingWaited && atLanding.phase === "descent" && atLanding.frames > 0 && landed2, `Walk on ${shown}, next undrawn ${nextLate}; ${JSON.stringify(atLanding)}; landed ${landed2}; ${await story()}`);
  say(size, "no slice drew a late street in one go", pre.maxSlice < HITCH_LIMIT && !errs.length, `worst slice ${pre.maxSlice.toFixed(1)} ms; waited ${pre.waited}${errs.length ? `; ${errs[0]}` : ""}`);
  await c.close();
});

// ---------- Each size: the scripted run, and in the full set every other section ----------
for (const [size, opts] of SIZES) {
  test(`Afterglow's look, ${size}`, size === "wide" ? { tag: "@full" } : {}, async ({ browser }) => {
    const full = isFull(), dir = shots(), { coloursOf, lettering, strip } = await analyser(browser);
    const iw = opts.viewport.width, ih = opts.viewport.height, dpr = opts.deviceScaleFactor;
    const colourLog = new Map<string, string>(), rampLog = new Map<string, string>(), byPhase: Record<string, { min: number; max: number; frames: number }> = {}, allArt = new Map<number, string>(), fontsSeen = new Set<string>(); let colourMax = 0;
    const RAMPS = await (async () => { const o = await open(browser, opts, false); const r = await o.p.evaluate(() => __core.RAMP); await o.c.close(); return r; })();
    const RAMP_ALL = Object.values(RAMPS).flat().map((h) => parseInt(h.slice(1), 16));
    const shotOf = async (p: Page, name: string) => { const f = `${size}-${name}.png`, buf = await p.screenshot({ path: path.join(dir, f) }); return { f, buf }; };
    // Every frame looked at goes through here: colours on screen, colours on the canvas by phase, and the font of every element, hidden ones too.
    // tiers: the rarities in play in this frame. Everything on the canvas must then be the background family or exactly those ramps, and no other ramp's colour may appear at all.
    const lookAt = async (p: Page, name: string, where: string, tiers: string[] = []) => {
      const rects = await p.evaluate(({ d, over }) => (over ? ["word", "result", "name"] : ["word"]).map((n) => __part(n)).filter((e) => !e.hidden).map((e) => { const b = e.getBoundingClientRect(); return { x: Math.floor(b.left * d) - 6, y: Math.floor(b.top * d) - 6, w: Math.ceil(b.width * d) + 12, h: Math.ceil(b.height * d) + 12 }; }), { d: dpr, over: tiers.length > 0 });
      const s = await shotOf(p, name), r = await coloursOf(s.buf, rects); if (r.colours > colourMax) colourMax = r.colours;
      const a = await p.evaluate(artColours), ph = where.split(" ").pop()!, q = byPhase[ph] ||= { min: 1e9, max: 0, frames: 0 }, own = new Set(tiers.flatMap((t) => RAMPS[t as keyof typeof RAMPS]).map((c) => parseInt(c.slice(1), 16))), all = new Set(RAMP_ALL);
      for (const [hex, hue, n] of r.off) if (!own.has(parseInt(hex.slice(1), 16))) colourLog.set(hex, `${where}, hue ${hue}, ${n} px`);
      q.min = Math.min(q.min, a.length); q.max = Math.max(q.max, a.length); q.frames++;
      for (const v of a) {
        if (!allArt.has(v)) allArt.set(v, where);
        if (own.has(v)) continue;
        if (all.has(v)) rampLog.set(v.toString(16).padStart(6, "0"), `a ramp colour in ${where}`);
        else if (!inFamily(hueOfN(v)) && v !== 0) rampLog.set(v.toString(16).padStart(6, "0"), `off family in ${where}`);
      }
      for (const f of await p.evaluate(allFonts)) fontsSeen.add(f);
      return s;
    };

    // ---------- The whole flow, with frames ----------
    const { c, p, errs } = await open(browser, opts);
    await p.evaluate(startTrace);
    await p.evaluate((f) => __core.rate(f), FAST);
    type Fact = ReturnType<typeof wordFacts> & { mark: { n: number; w: number; h: number; hash: number } };
    const means: number[] = [], camZ: number[] = [], lights: number[] = [], facts: Record<number, [string, Fact][]> = {}, marks: Record<number, Mark> = {}, arcs: Record<number, string[]> = {}, gridBlocks = { bad: 0, n: 0 }, joins: ({ where: string } & ReturnType<typeof towerJoin>)[] = [], emberN: number[] = [], downFiles: string[] = [];
    let fire: Record<string, number> | null = null, pills: ReturnType<typeof pillFacts> | null = null, boxPills: ReturnType<typeof pillFacts> | null = null, lanterns: [string, number][] = [], ranAll = true, lastBtn = "", endedOn = "";
    const lanternFiles: Record<number, string[]> = {}, lanternPx: Record<number, number> = {}, pops: Record<number, number[]> = {}, edges: ({ where: string } & ReturnType<typeof walkEdge>)[] = [];
    const timers: Record<number, { left: number; shown: string; startedAt: number; letterEnd: number; askAt: number; row: string[]; letter: string; verdict: string; head: number; hidden: boolean }> = {};
    await p.evaluate(() => { const d = __core.drawWalk; __core.drawWalk = (...a) => { window.__walk = a; d(...a); }; });
    const noteWord = async (where: string, i: number) => {
      const w = await p.evaluate(wordFacts), clip = { x: Math.floor(w.x * dpr) - 2, y: Math.floor(w.y * dpr) - 2, w: Math.ceil(w.w * dpr) + 4, h: Math.ceil(w.h * dpr) + 4 };
      await p.evaluate(() => { __part("screen").style.visibility = "hidden"; });
      const bare = await p.screenshot();
      await p.evaluate(() => { __part("screen").style.visibility = ""; });
      (facts[i] ||= []).push([where, { ...w, mark: await lettering(bare, clip, rgbOf(w.colour)) }]);
    };
    for (let i = 0; i < RUN.length; i++) {
      const stop = async (at: string) => { ranAll = false; endedOn = `${at}, phases ${await p.evaluate(() => __core.log.slice(-5).map((e) => e.phase).join(" > "))}`; };
      if (!(await asking(p, i + 1, 60000))) { await stop(`asking Q${i + 1}`); break; }
      await freeze(p, { phase: "ask", t: 0 });
      means.push(await p.evaluate(stageMean)); camZ.push(await p.evaluate(() => __core.scene!.camZ)); lights.push(await p.evaluate(() => __core.scene!.lights.length));
      if (i === 0) { fire = await p.evaluate(fireCount); pills = await p.evaluate(pillFacts, await p.evaluate(() => { const f = __core.fuseBox!; return [f.x0, f.y0, f.w, f.h, f.r]; })); }
      if (i) lanterns = await p.evaluate(lanternArea);
      const arc = arcs[i] = [(await lookAt(p, `q${i + 1}`, `Q${i + 1} ask`)).f];
      // Every stop from here to the result is set before the clock runs again (see thawTo).
      await p.evaluate(() => __core.freezeAt({ phase: "charge", k: .8 }));
      await thaw(p);
      if (!(await typeIn(p, size, RUN[i]))) { await stop(`answering Q${i + 1}`); break; }
      await p.evaluate((f) => __core.rate(f), FAST);
      const full2 = ARC.includes(i);
      if (!(await landed(p, 25000))) { await stop(`Q${i + 1} charge`); break; }
      // Read once the reply has landed: the word waits in plain ink until then (answer 16).
      const tierNow = await p.evaluate(() => __core.answer && __core.answer.tier).then((t) => (t ? [t] : []));
      { const s = await lookAt(p, `q${i + 1}-charge`, `Q${i + 1} charge`, tierNow); await noteWord("charge", i); arc.push(s.f); if (i === 0) boxPills = await p.evaluate(pillFacts, await p.evaluate(() => { const b = __core.boxAt(), pill = __core.boxPill!; return [b.x, b.y, pill.w, pill.h, pill.h >> 1]; })); }
      for (const k of full2 ? [.08, .16, .24, .32, .4, .5, .6, .7, .8, .9] : i === SWEEP_Q ? SWEEP : [.5]) {
        if (!(await thawTo(p, { phase: "climb", k }))) { await stop(`Q${i + 1} climb ${k}`); break; }
        const s = await lookAt(p, `q${i + 1}-climb${Math.round(k * 100)}`, `Q${i + 1} climb`, tierNow);
        await noteWord(`climb ${k}`, i); arc.push(s.f);
        if (k >= .3 && k <= .7) {
          const bl = await p.evaluate(() => { const { S, AH } = __core.place(), h = AH * S, x = 4 * S, d = __core.g.getImageData(x, 0, 1, h).data; let bad = 0, n = 0, run = 1; for (let y = 1; y < h; y++) { if (d[y * 4] === d[y * 4 - 4] && d[y * 4 + 1] === d[y * 4 - 3] && d[y * 4 + 2] === d[y * 4 - 2]) run++; else { if (y - run > 0) { n++; if (run % S) bad++; } run = 1; } } return { bad, n }; });
          gridBlocks.bad += bl.bad; gridBlocks.n += bl.n;
        }
        if (k >= .16 && k <= .7) joins.push({ where: `Q${i + 1} climb ${k}`, ...(await p.evaluate(towerJoin, FLOORS)) });
      }
      if (!ranAll) break;
      if (!(await thawTo(p, { phase: "burst", t: .35 }))) { await stop(`Q${i + 1} burst`); break; }
      { const s = await lookAt(p, `q${i + 1}-burst`, `Q${i + 1} burst`, tierNow); await noteWord("burst", i); arc.push(s.f); }
      const tier = await p.evaluate(() => __core.burst!.tier);
      if (!(await thawTo(p, { phase: "result", t: AGES[tier] - .7 }))) { await stop(`Q${i + 1} result`); break; }
      marks[i] = await p.evaluate(burstLit);
      arc.push((await lookAt(p, `q${i + 1}-bloom`, `Q${i + 1} result`, tierNow)).f);
      await thaw(p);
      await buttonUp(p, 20000);
      await p.waitForTimeout(150);
      { const s = await lookAt(p, `q${i + 1}-result`, `Q${i + 1} result`, tierNow); await noteWord("result", i); arc.push(s.f); }
      if (i === 6) { lastBtn = (await p.textContent(R)) ?? ""; await p.evaluate(() => __core.freezeAt({ phase: "leaving", k: .5 })); }
      await p.click(R);
      const seam = i === 2 || i === 5;
      let held = false;
      for (const k of i === 6 ? [] : seam ? DOWN : full2 ? [.1, .22, .4, .75] : [.5]) {
        held = await (held ? thawTo : freeze)(p, { phase: "descent", k });
        if (!held) break;
        const s = await lookAt(p, `q${i + 1}-down${Math.round(k * 100)}`, `Q${i + 1} descent`);
        arc.push(s.f); if (seam) downFiles.push(s.f);
        if (k <= .33) { const r = await p.evaluate(towerJoin, FLOORS); if (r.cam >= r.closed && r.rows > 40) joins.push({ where: `Q${i + 1} descent ${k}`, ...r }); }
        if (k === .22) emberN.push(await p.evaluate(emberCount));
        if (seam && k > 0 && k <= .4) edges.push({ where: `Q${i + 1} descent ${k}`, ...(await p.evaluate(walkEdge, WALK_PARALLAX)) });
      }
      // Real speed from here to the answer: at speed a long frame eats the question's timer.
      if (i < 6) await p.evaluate(() => __core.rate(1));
      if (i < 6 && (await (held ? thawTo : freeze)(p, { phase: "arrive", k: .5 }))) { arc.push((await lookAt(p, `q${i + 1}-arrive`, `Q${i + 1} arrive`)).f); await thaw(p); }
      if (i < 6) {
        // The box after a walk opens empty until Next's reply (14c-6b-1), so the next question shows as "open", then "ask".
        const hasL = await until(p, () => __core.phase === "letter" || __core.phase === "open" || __core.phase === "ask", 15000) && await p.evaluate(() => __core.phase === "letter");
        if (hasL) {
          const fr: string[] = [];
          held = false;
          for (const [t, n] of [[.3, 1], [.8, 2], [1.35, 3], [1.75, 4]]) {
            held = await (held ? thawTo : freeze)(p, { phase: "letter", t }, 6000);
            if (!held) break;
            fr.push((await lookAt(p, `q${i + 2}-lantern${n}`, `Q${i + 2} letter`)).f);
            if (n === 2) lanternPx[i + 2] = await p.evaluate(() => { const { AW, AH } = __core.place(), on = new Set(__core.LANTERN_INK.lit.map((c) => parseInt(c.slice(1), 16))), d = __artImage(0, 0, AW, AH).data; let n = 0; for (let k = 0; k < d.length; k += 4) if (on.has(d[k] << 16 | d[k + 1] << 8 | d[k + 2])) n++; return n; });
          }
          lanternFiles[i + 2] = fr;
          // The box arrives with the whole twenty seconds, and the letter struck.
          await (held ? thawTo : freeze)(p, { phase: "ask", t: 0 });
          timers[i + 2] = await p.evaluate(() => { const row = [...__part("letters").querySelectorAll("s")].map((e) => e.textContent!), log = __core.log, l = log.findLast((e) => e.phase === "letter")!, a = log.at(-1)!; return { left: __core.Q_SECONDS - (__core.t - __core.qStart), shown: __part("secs").textContent!, startedAt: __core.qStart, letterEnd: l.at + l.dur, askAt: a.at, row, letter: l.letter as string, verdict: __part("verdict").textContent!, head: (__core.fuse || { head: 0 }).head, hidden: __part("lett").hidden && __part("caption").hidden }; });
          await p.waitForTimeout(60);
          await thaw(p);
          pops[i + 2] = await p.evaluate(async () => { const e = __part("letters").querySelector<HTMLElement>("s:last-of-type"), seen = new Set<number>(), U = __core.place().U; for (let n = 0; n < 40 && e; n++) { const m = new DOMMatrixReadOnly(getComputedStyle(e).transform); seen.add(+(m.f / U).toFixed(3)); await new Promise((f) => requestAnimationFrame(f)); } return [...seen]; });
        }
      }
    }
    say(size, "the scripted run answered all seven", ranAll && Object.keys(marks).length === 7, `${Object.keys(marks).length} results${endedOn && `, ended on ${endedOn}`}`);
    // The results: no walk down and no show (answers 38, 39). Q7's text fades out, and they fade in over Q7's own burst.
    const fin: string[] = [], showTiers = ["common", "uncommon", "rare"], resultOpacity = () => p.evaluate(() => +getComputedStyle(__part("result")).opacity);
    let fadeOut = -1, fadeIn = -1;
    if (ranAll && await until(p, () => __core.frozen, 8000)) {
      fadeOut = await resultOpacity(); fin.push((await lookAt(p, "results-leaving", "results leaving", showTiers)).f);
      await p.evaluate(() => { __core.freezeAt({ phase: "over", t: .25 }); __core.thaw(); });
      if (await until(p, () => __core.frozen, 8000)) { fadeIn = await resultOpacity(); fin.push((await lookAt(p, "results-fading", "results over", showTiers)).f); await thaw(p); }
    }
    await buttonUp(p, 25000);
    await p.waitForTimeout(300);
    fin.push((await lookAt(p, "results-end", "results over", showTiers)).f);
    const lg = await p.evaluate(() => __core.log.map((e) => ({ ...e }))), seq = lg.map((e) => e.phase), leftAt = seq.lastIndexOf("leaving");
    say(size, "a full run goes from Q7's result to the results, in the same sky", leftAt > 0 && seq[leftAt - 1] === "result" && seq[leftAt + 1] === "over" && lg[leftAt].q === 7 && !seq.slice(leftAt).includes("descent"), seq.slice(-4).join(" > "));
    const endMark = await p.evaluate(burstLit);
    say(size, "Q7's burst is still on screen behind the results", endMark.n > 200 && endMark.wrong === 0, fmtM(endMark));
    say(size, "Q7's text fades out and the results fade in", fadeOut > .3 && fadeOut < .7 && fadeIn > .3 && fadeIn < .7 && await resultOpacity() === 1, `out ${fadeOut.toFixed(2)}, in ${fadeIn.toFixed(2)}`);
    const rc = await p.evaluate(() => {
      const box = (el: Element) => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
      return { shown: __part("rRecap").getClientRects().length > 0, rows: [...__part("rRecap").querySelectorAll("li")].map((li, i) => { const c = getComputedStyle(li), r = __core.run.results[i]; return { ans: li.children[0].textContent, pts: li.children[1].textContent, ink: c.color, shadow: c.textShadow, want: r.answer, points: r.points, wantInk: __core.WORD_INK[r.tier], wantLine: __core.RAMP[r.tier][0] }; }),
        head: __part("rTier").textContent, total: __part("rPts").textContent, score: __core.runScore(), res: box(__part("result")), kids: [...__part("result").children].filter((e) => (e as HTMLElement).offsetParent).map(box), hud: box(__part("hud")), iw: innerWidth, ih: innerHeight };
    });
    // Rewritten (answers 7, 24): the game lists points from the server; the bonus estimate only sizes the burst.
    say(size, "the recap lists all seven, answer and points", rc.shown && rc.rows.length === 7 && rc.rows.every((r) => r.ans === r.want && r.pts === `+${r.points.toLocaleString("en-US")}`), rc.rows.map((r) => `${r.ans} ${r.pts}`).join("; "));
    say(size, "each recap row wears its rarity's colour and outline", rc.rows.length === 7 && rc.rows.every((r) => r.ink === rgbHexOf(r.wantInk) && r.shadow.includes(rgbHexOf(r.wantLine))), rc.rows.map((r) => r.ink).join("; "));
    say(size, "the results name the show's end and the run's total", rc.head === "Show's over" && rc.total === `Total ${rc.score.toLocaleString("en-US")}`, `${rc.head}, ${rc.total}`);
    say(size, "the results fit under the HUD", rc.res.t >= rc.hud.b && rc.res.b <= rc.ih && rc.kids.every((k) => k.l >= 0 && k.r <= rc.iw && k.b <= rc.ih), `text ${rc.res.t.toFixed(0)} to ${rc.res.b.toFixed(0)} of ${rc.ih}, HUD to ${rc.hud.b.toFixed(0)}`);
    const rtrace = await p.evaluate(() => window.__trace);
    // Rewritten (answers 21, 29): Q7's result says Walk on, as every question's does, and the ending's See results leaves
    // for the cards; the mock's Q7 said See results, and its ending played again.
    // Pressed once it shows: a run that never reaches the ending fails this line rather than ending (answer 64).
    const endUp = await buttonUp(p), endBtn = endUp ? await p.textContent(R) : "never shown";
    if (endUp) await p.click(R);
    say(size, "the last result's button leads to the results", lastBtn === "Walk on" && endBtn === "See results" && await p.evaluate(() => document.body.dataset.left === "results"), `Q7 ${lastBtn}, the ending ${endBtn}`);
    // The lantern: from the run's own taken letters, exactly once each, and never otherwise.
    const letters = lg.filter((e) => e.phase === "letter"), wantQ = Object.keys(TAKEN_AT).map(Number), wantL = Object.entries(TAKEN_AT).map(([q, l]): [number, string] => [+q, l.toUpperCase()]);
    say(size, "a lantern shows once at each newly taken letter and never otherwise", letters.map((e) => e.q).join() === wantQ.join() && wantL.every(([q, l]) => letters.some((e) => e.q === q && e.letter === l)), `at ${letters.map((e) => `Q${e.q} ${e.letter}`).join(", ") || "none"}; the schedule says ${wantQ.join(", ")}`);
    // Rewritten (DECISIONS.md, Game 1: Timer): after the lantern the box opens and Next is sent, so "open" comes before "ask".
    const order2 = lg.map((e, i) => (e.phase === "letter" ? `${lg[i - 1].phase}>letter>${lg[i + 1].phase}` : "")).filter(Boolean);
    say(size, "the lantern comes after the arrival and before the box", order2.length === 4 && order2.every((e) => e === "arrive>letter>open" || e === "descent>letter>open"), order2[0] || "none");
    say(size, "the lantern is drawn on screen", Object.keys(lanternPx).length === 4 && Object.values(lanternPx).every((n) => n > 400), Object.entries(lanternPx).map(([q, n]) => `Q${q} ${n} px`).join(", "));
    const durs = letters.map((e) => { const n = lg[lg.indexOf(e) + 1]; return n ? n.at - e.at : 0; });
    say(size, "the lantern takes about 2 seconds", durs.length === 4 && durs.every((d2) => d2 > 1.6 && d2 < 2.5), durs.map((d2) => d2.toFixed(2)).join(" "));
    const ts = Object.entries(timers);
    say(size, "the timer starts full as the box appears", ts.length === 4 && ts.every(([, t]) => t.left > 19.8 && t.shown === "20" && t.startedAt >= t.letterEnd - .1 && t.hidden), ts.map(([q, t]) => `Q${q} ${t.left.toFixed(2)} s left, showing ${t.shown}`).join("; "));
    say(size, "the letter is struck in the row, with a pop in whole art pixels", ts.length === 4 && ts.every(([q, t]) => t.row.at(-1) === t.letter && (pops[+q] || []).some((v) => v <= -1) && (pops[+q] || []).every((v) => Number.isInteger(v))), ts.map(([q, t]) => `Q${q} ${t.row.join(" ")}; pop ${(pops[+q] || []).join(",")}`).join("; "));
    say(size, "the lantern is announced", ts.length === 4 && ts.every(([, t]) => t.verdict === `${t.letter} is out.`), ts[0] ? ts[0][1].verdict : "");

    say(size, "each question lands further along", camZ.length === 7 && camZ.every((z, i) => !i || z > camZ[i - 1]), `camera ${camZ.map((z) => z.toFixed(0)).join(" ")}, as approved; these steps are not what makes a step major`);
    const jumps = means.slice(1).map((m, i) => m - means[i]), top = [...jumps].sort((a, c) => c - a).slice(0, 2);
    say(size, "brighter every step, biggest at Q3 and Q6, Q7 highest", means.length === 7 && jumps.every((j) => j > 0) && top.includes(jumps[1]) && top.includes(jumps[4]) && means[6] === Math.max(...means), `mean ${means.map((m) => m.toFixed(1)).join(" ")}`);
    const fireAll = fire ? Object.values(fire).reduce((a, n) => a + n, 0) : -1;
    say(size, "Q1 unlit, the climb's tower included", lights[0] === 0 && fireAll === 0 && lights[1] > 0 && lights[2] > lights[1], `lit lanterns ${lights.join(" ")}; fire-coloured pixels at Q1 ${fireAll}${fireAll > 0 && fire ? " in " + Object.entries(fire).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(", ") : ""}, ${fire ? Object.keys(fire).length : 0} pieces read`);
    // Lettering: the same at every set point by every measure, and on every frame of the trace.
    const bad: string[] = [], shown: string[] = [];
    for (const [i, list] of Object.entries(facts)) {
      const base = list[0][1];
      if (!base.mark.n) bad.push(`Q${+i + 1} found no lettering pixels`);
      for (const [where, w] of list) {
        if (w.size !== base.size || Math.abs(w.w - base.w) > .01 || Math.abs(w.h - base.h) > .01 || Math.abs(w.gw - base.gw) > .01 || Math.abs(w.gh - base.gh) > .01) bad.push(`Q${+i + 1} ${where} box ${w.w}x${w.h} size ${w.size}`);
        if (w.a !== 1 || w.d !== 1 || w.b !== 0 || w.c !== 0) bad.push(`Q${+i + 1} ${where} transform ${w.a} ${w.b} ${w.c} ${w.d}`);
        if (w.mark.n !== base.mark.n || w.mark.hash !== base.mark.hash || w.mark.w !== base.mark.w || w.mark.h !== base.mark.h) bad.push(`Q${+i + 1} ${where} lettering ${w.mark.n} px against ${base.mark.n}`);
      }
      shown.push(`Q${+i + 1} ${base.size}, ${base.mark.n} px, ${list.length} points`);
    }
    const frames = rtrace.filter((f) => ["charge", "climb", "burst", "result"].includes(f.ph));
    let traceBad = 0;
    for (const f of frames) if (f.a !== 1 || f.d !== 1 || f.b !== 0 || f.c !== 0) traceBad++;
    const qSizes: Record<number, Set<string>> = {}; for (const f of frames) if (f.ph === "climb" || f.ph === "charge") (qSizes[f.q] ||= new Set()).add(f.fs + f.w.toFixed(1));
    const resized = Object.values(qSizes).filter((v) => v.size > 1).length;
    say(size, "lettering never changes shape or size", shown.length === 7 && !bad.length && !traceBad && !resized && frames.length > 100, bad.length ? bad.slice(0, 3).join("; ") : `${shown.join("; ")}; ${frames.length} traced frames, ${traceBad} scaled, ${resized} resized`);
    const wordY = Object.values(facts).map((l) => [l[0][1].y, l[l.length - 2][1].y]);
    say(size, "the word really moved up", wordY.length === 7 && wordY.every(([a, c]) => c < a - 50), wordY.length ? `from ${wordY[0][0].toFixed(0)} to ${wordY[0][1].toFixed(0)}` : "");
    say(size, "both boxes are stepped pills", pills && boxPills && pills.corners === 0 && boxPills.corners === 0 && pills.middle && boxPills.middle && pills.steps >= 3 && boxPills.steps >= 3, `prompt ${pills && pills.corners} square corners, ${pills && pills.steps} steps; word box ${boxPills && boxPills.corners} square corners, ${boxPills && boxPills.steps} steps`);
    // Rarity: charge and climb, as actually played.
    const real = (phase: string) => lg.map((e, i) => ({ e, real: lg[i + 1] ? lg[i + 1].at - e.at : 0 })).filter((x) => x.e.phase === phase).slice(0, 7);
    const ch = real("charge"), avg = (l: { real: number }[]) => l.reduce((a, x) => a + x.real, 0) / (l.length || 1), tierOf = (t: string) => ch.map((x, i) => (x.e.tier === t ? i : -1)).filter((i) => i >= 0);
    const chC = avg(tierOf("common").map((i) => ch[i])), chU = avg(tierOf("uncommon").map((i) => ch[i])), chR = avg(tierOf("rare").map((i) => ch[i]));
    say(size, "a better answer charges longer", chR > chU * 1.2 && chU > chC * 1.2, `charge s: common ${chC.toFixed(2)}, uncommon ${chU.toFixed(2)}, rare ${chR.toFixed(2)}`);
    const cl = real("climb"), speed = (t: string) => { const l = tierOf(t).map((i) => cl[i]).filter(Boolean); return { s: avg(l), px: l.length ? (l[0].e.distance as number) / avg(l) : 0, fl: l.length ? (l[0].e.floors as number) / avg(l) : 0 }; }, spC = speed("common"), spR = speed("rare");
    say(size, "a better answer climbs faster", spR.px > spC.px * 1.15, `common ${spC.s.toFixed(2)} s, ${spC.px.toFixed(0)} art px/s, ${spC.fl.toFixed(1)} floors/s; rare ${spR.s.toFixed(2)} s, ${spR.px.toFixed(0)} art px/s, ${spR.fl.toFixed(1)} floors/s`);
    say(size, "every answer reached open sky", seq.filter((e) => e === "burst").length >= 7, `${seq.filter((e) => e === "burst").length} bursts`);
    // The tower and the join.
    const jc = joins.filter((j) => j.where.includes("climb")), jd = joins.filter((j) => j.where.includes("descent")), worst = (l: typeof joins) => l.reduce((a, j) => (j.gap > a.gap ? j : a), { gap: -1, where: "none", cam: 0, open: 0, rows: 0 } as (typeof joins)[number]);
    say(size, "the climb passes a tower of floors", jc.length > 3 && jc.every((j) => j.tower > j.rows * .7), jc.length ? `building at the screen's edge in at least ${Math.min(...jc.map((j) => Math.round(j.tower / (j.rows || 1) * 100)))}% of rows` : "no climb frames");
    say(size, "the near buildings reach the screen's edges coming down", edges.filter((e) => e.near).length > 3 && edges.every((e) => e.longest < EDGE_RUN), edges.map((e) => `${e.where}: ${e.longest} rows`).join("; "));
    say(size, "no gap between tower and street, climbing or coming down", jc.length > 3 && jd.length > 2 && joins.every((j) => j.gap <= j.floor * .2), `longest run of bare sky at the edge: climb ${worst(jc).gap} rows (${worst(jc).where}), descent ${worst(jd).gap} rows (${worst(jd).where}, view at ${worst(jd).cam}, ${worst(jd).open} of ${worst(jd).rows} bare), a floor being ${joins[0] ? joins[0].floor : 0}; ${joins.length} frames`);
    say(size, "embers fall on the way down", emberN.length > 0 && emberN.every((n) => n >= 20), `ember pixels ${emberN.join(" ")}`);
    say(size, "a sky lantern joins per answer, sized by rarity", lanterns.length === 6 && lanterns.every(([, n]) => n > 5) && lanterns[4][1] > lanterns[0][1], lanterns.map(([t, n]) => `${t} ${n}`).join(", "));
    // The grid.
    const art = await p.evaluate(() => [...window.__artLog]), allowed = (l: string) => /^(drawImage off grid|scaled) in descent$/.test(l), wrong = art.filter((l) => !allowed(l)), tf = await p.evaluate(() => { const m = __core.g.getTransform(); return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f, S: __core.place().S, n: window.__transforms }; });
    say(size, "grid: no forbidden call, off a screen pixel or scaled only in the walk", !wrong.length, wrong.join(", ") || `only: ${art.join(", ") || "none"}`);
    say(size, "grid: exactly one transform, the scale S", tf.a === tf.S && tf.d === tf.S && !tf.b && !tf.c && !tf.e && !tf.f && tf.n >= 1 && !art.some((l) => /transform|translate|scale\(/i.test(l) && !/scaled/.test(l)), `scale ${tf.a}, set ${tf.n} time(s)`);
    say(size, "grid: art pixels stay whole on a moving layer", gridBlocks.n > 0 && gridBlocks.bad < gridBlocks.n * .05, `${gridBlocks.bad} of ${gridBlocks.n} runs of a tower column not a whole art pixel, where two layers meet`);
    // Bursts in the flow, from canvas pixels.
    const mk = Object.values(marks);
    say(size, "a burst of the right shape is on screen at every question", mk.length === 7 && mk.every((m) => m.n > 200 && shapeOk(m)), mk.map((m, i) => `Q${i + 1} ${fmtM(m)}`).join("; "));
    say(size, "burst pixels are all in their tier's ramp", mk.length === 7 && mk.every((m) => m.wrong === 0), mk.map((m, i) => `Q${i + 1} ${m.tier} ${m.wrong} of ${m.n} off`).join("; "));
    await strip(dir, `${size}-strip-common.png`, arcs[0] || [], 560);
    await strip(dir, `${size}-strip-rare.png`, arcs[4] || [], 560);
    await strip(dir, `${size}-strip-last.png`, arcs[6] || [], 560);
    await strip(dir, `${size}-strip-results.png`, fin, 560);
    await strip(dir, `${size}-strip-seven.png`, Object.values(arcs).map((a) => a[0]), 560);
    for (const [q, fr] of Object.entries(lanternFiles)) await strip(dir, `${size}-strip-lantern-q${q}.png`, fr, 560);
    await strip(dir, `${size}-strip-descent-q3.png`, downFiles.slice(0, DOWN.length), 480);
    await strip(dir, `${size}-strip-descent-q6.png`, downFiles.slice(DOWN.length), 480);
    say(size, "no console errors in the run", !errs.length, errs.slice(0, 2).join(" | "));
    await c.close();

    if (full) {
      // ---------- The rumble, the flight and the colours, at the real clock ----------
      {
        const { c, p, errs } = await open(browser, opts, false);
        const { U, S } = await p.evaluate(() => __core.place());
        await p.evaluate(startTrace);
        const inks: Record<string, string> = {}, texts: Record<string, { word: string; tier: string; pts: string; ans: string; flav: string; hud: string; lines: string[] }> = {}, cords: Record<string, string[]> = {}, order = [["rare", "kite"], ["common", "lemon"], ["uncommon", "chess"]];
        for (let i = 0; i < order.length; i++) {
          await asking(p, i + 1, 30000);
          await typeIn(p, size, order[i][1]);
          await until(p, () => __core.phase === "charge", 5000);
          inks[order[i][0]] = await p.evaluate(() => getComputedStyle(__part("word")).color);
          cords[order[i][0]] = await p.evaluate(() => { const c = __core.boxPill!.cord, d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data, seen = new Set<string>(); for (let k = 0; k < d.length; k += 4) if (d[k + 3]) seen.add("#" + (d[k] << 16 | d[k + 1] << 8 | d[k + 2]).toString(16).padStart(6, "0")); return [...seen]; });
          await buttonUp(p, 30000);
          texts[order[i][0]] = await p.evaluate(() => { const c = (n: string) => getComputedStyle(__part(n)).color; const o = (n: string) => getComputedStyle(__part(n)).textShadow; return { word: c("word"), tier: c("rTier"), pts: c("rPts"), ans: c("rAns"), flav: c("rFlav"), hud: c("hudScore"), lines: [o("word"), o("rTier"), o("rPts")] }; });
          await p.click(R);
        }
        await asking(p, 4, 30000);
        const tr: Trace[] = await p.evaluate(() => window.__trace), lg = await p.evaluate(() => __core.log.map((e) => ({ ...e }))), ly: LayerFrame[] = await p.evaluate(() => window.__layers);
        const seg = (q: number, ph: string) => tr.filter((f) => f.ph === ph && f.q === q).filter((f, n, l) => !n || f.t !== l[n - 1].t);
        const rumble = (q: number) => {
          const e = lg.find((x) => x.phase === "charge" && x.q === q)!, s = seg(q, "charge"), part = (a: number, c: number) => s.filter((f) => (f.t - e.at) / e.dur >= a && (f.t - e.at) / e.dur < c);
          const spread = (l: Trace[]) => { const m = (v: number[]) => v.reduce((a, x) => a + x, 0) / (v.length || 1), off = (k: "x" | "y") => { const v = l.map((f) => f[k] / U), c = m(v); return m(v.map((x) => Math.abs(x - c))); }; return Math.hypot(off("x"), off("y")); };
          const rate = (l: Trace[]) => { let n = 0; for (let j = 1; j < l.length; j++) if (l[j].x !== l[j - 1].x || l[j].y !== l[j - 1].y) n++; return l.length > 1 ? n / (l.at(-1)!.t - l[0].t) : 0; };
          // The game's own steps a second (answer 77): over common's late part, ~0.13 s, a count of moves drawn is mostly rounding.
          const steps = (l: Trace[]) => l.reduce((a, f) => a + f.hz, 0) / (l.length || 1);
          return { early: spread(part(.34, .52)), late: spread(part(.68, .86)), hzEarly: rate(part(.34, .52)), hzLate: rate(part(.68, .86)), stepsLate: steps(part(.68, .86)) };
        };
        const rm = { common: rumble(2), uncommon: rumble(3), rare: rumble(1) }, rl = Object.entries(rm), charge2 = lg.find((x) => x.phase === "charge" && x.q === 2)!, late = seg(2, "charge").filter((f) => f.t - charge2.at >= WORD_ENTER).slice(-20),
          // Against the word's rest place, not the frame before: placeWord rounds to screen pixels, so a half-art-pixel offset on both sides still leaves whole steps between frames.
          offArt = late.filter((f) => { const d = (f.x - Math.round((iw / 2 - f.ow / 2) * dpr) / dpr) / U; return Math.abs(d - Math.round(d)) > .02; }).length;
        say(size, "the rumble stays in whole art pixels", late.length > 5 && offArt === 0, `${offArt} of ${late.length} frames off the art grid`);
        say(size, "the whole word rumbles, growing and tightening through the charge", rl.every(([, r]) => r.late >= 1 && r.late > r.early * 1.25 && r.hzLate > r.hzEarly * 1.2), rl.map(([k, r]) => `${k} ${r.early.toFixed(1)} > ${r.late.toFixed(1)} art px, ${r.hzEarly.toFixed(0)} > ${r.hzLate.toFixed(0)} moves/s`).join("; "));
        say(size, "the rumble differs by rarity", rm.rare.late > rm.common.late && rm.rare.stepsLate > rm.common.stepsLate, `late: common ${rm.common.late.toFixed(1)}, uncommon ${rm.uncommon.late.toFixed(1)}, rare ${rm.rare.late.toFixed(1)} art px; steps/s ${rl.map(([k, r]) => `${k} ${r.stepsLate.toFixed(1)}`).join(", ")}`);
        const flightOf = (q: number) => {
          const s = seg(q, "climb"), e = lg.find((x) => x.phase === "climb" && x.q === q); if (!e || s.length < 8) return null;
          const y0 = s[0].y, pts = s.map((f) => ({ k: (f.t - e.at) / e.dur, h: f.cam + (y0 - f.y) / U, dev: (f.x + f.w / 2 - iw / 2) / U, l: f.x, r: f.x + f.w })), v: { k: number; v: number }[] = [];
          for (let j = 4; j < pts.length; j++) v.push({ k: pts[j - 2].k, v: (pts[j].h - pts[j - 4].h) / ((pts[j].k - pts[j - 4].k) * e.dur) });
          const mean = (l: { v: number }[]) => l.reduce((a, x) => a + x.v, 0) / (l.length || 1), early = mean(v.filter((x) => x.k < .1)), late = mean(v.filter((x) => x.k > .9)), peak = Math.max(...v.map((x) => x.v)), peakK = v.find((x) => x.v === peak)!.k;
          let turns = 0, last = 0; for (const p0 of pts) { const sg = Math.abs(p0.dev) < 1 ? 0 : Math.sign(p0.dev); if (sg && last && sg !== last) turns++; if (sg) last = sg; }
          return { early, late, peak, peakK, sway: Math.max(...pts.map((p0) => Math.abs(p0.dev))), turns, onScreen: pts.every((p0) => p0.l >= 0 && p0.r <= iw), end: pts.at(-1)!.dev };
        };
        const fl = { common: flightOf(2), uncommon: flightOf(3), rare: flightOf(1) }, fv = Object.values(fl), ok = fv.every(Boolean), text = (fn: (f: NonNullable<ReturnType<typeof flightOf>>) => string) => Object.entries(fl).map(([k, f]) => `${k} ${f ? fn(f) : "no flight"}`).join("; ");
        const climbLine = (["common", "uncommon", "rare"] as const).map((k) => { const f2 = fl[k], e = lg.find((x) => x.phase === "climb" && x.q === { rare: 1, common: 2, uncommon: 3 }[k]); return { k, dur: e ? e.dur : 0, floors: e ? (e.floors as number) : 0, peak: f2 ? f2.peak : 0 }; });
        say(size, "the climb is longer and much faster than version 5", ok && climbLine.every((c) => c.dur >= V5.seconds[c.k] + .7 && c.floors >= V5.floors * 2 && c.peak >= V5.peak[size][c.k] * 1.4) && climbLine.find((c) => c.k === "rare")!.dur < climbLine.find((c) => c.k === "common")!.dur, climbLine.map((c) => `${c.k} ${c.dur} s (was ${V5.seconds[c.k]}), ${c.floors} floors (was ${V5.floors}), peak ${c.peak.toFixed(0)} art px/s (was ${V5.peak[size][c.k]})`).join("; "));
        // The glide. At the slow ends each layer must take steps under an art pixel, on whole screen pixels, changing gently: the opposite of 0, 0, 1, 0.
        type Pt = { t: number } & Record<string, number | string>;
        const steps = (l: Pt[], key: string) => { const o: number[] = []; for (let j = 1; j < l.length; j++) if (l[j].t !== l[j - 1].t) o.push(Math.abs((l[j][key] as number) - (l[j - 1][key] as number))); return o; };
        const stat = (l: Pt[], key: string) => { const v = steps(l, key), jump = v.slice(1).map((x, j) => Math.abs(x - v[j])); return { n: v.length, max: v.length ? Math.max(...v) : 0, still: v.filter((x) => x === 0).length, jump: jump.length ? Math.max(...jump) : 0, fractional: l.filter((f2) => Math.abs((f2[key] as number) - Math.round(f2[key] as number)) > 1e-6).length, onPixel: l.every((f2) => Math.abs((f2[key] as number) * S - Math.round((f2[key] as number) * S)) < 1e-6) }; };
        const q2c = ly.filter((f2) => f2.q === 2 && f2.ph === "climb"), q3d = ly.filter((f2) => f2.ph === "descent" && f2.q === 3 && f2.k < .86);
        const headRun = (l: Pt[], key: string) => { const o: Pt[] = []; for (let j = 0; j < l.length; j++) { if (j && Math.abs((l[j][key] as number) - (l[j - 1][key] as number)) >= 1) break; o.push(l[j]); } return o; }, tailRun = (l: Pt[], key: string) => headRun([...l].reverse(), key).reverse();
        const glide: ({ where: string; key: string } & ReturnType<typeof stat>)[] = []; for (const key of ["cam", "sky"]) { glide.push({ where: "climb start", key, ...stat(headRun(q2c, key), key) }, { where: "climb hang", key, ...stat(tailRun(q2c, key), key) }, { where: "landing", key, ...stat(tailRun(q3d, key), key) }); }
        const wordEnd = tailRun(tr.filter((f2) => f2.ph === "climb" && f2.q === 2 && f2.k < .62).map((f2) => ({ t: f2.t, y: f2.y * dpr / S })), "y"), ws = stat(wordEnd, "y"); glide.push({ where: "word slowing", key: "y", ...ws, onPixel: true });
        const gl = glide.filter((x) => x.n > 2);
        say(size, S > 1 ? "glide: at the slow ends every layer steps under an art pixel, on screen pixels, smoothly" : "glide: at scale 1 steps are whole pixels, as before", gl.length >= 4 && gl.every((x) => x.onPixel && (S === 1 || (x.max < 1 && x.jump <= 2 / S + 1e-6 && x.fractional > 0))), gl.map((x) => `${x.where} ${x.key}: ${x.n} steps, largest ${x.max.toFixed(2)}, jump ${x.jump.toFixed(2)}, still ${x.still}`).join("; ") + " (art px)");
        say(size, "glide: the picture isn't nudged by its element", new Set(ly.map((f2) => f2.css)).size === 1, [...new Set(ly.map((f2) => f2.css))].join(", "));
        const backOk = ly.filter((f2) => f2.back).every((f2) => Math.abs(f2.back * S - Math.round(f2.back * S)) < 1e-6 && Math.abs(f2.deck * S - Math.round(f2.deck * S)) < 1e-6);
        say(size, "glide: the tower's strips and the cloud bank land on screen pixels", backOk && ly.some((f2) => f2.back), `${ly.length} frames`);
        say(size, "the climb accelerates off the ground and slows to a hang", ok && fv.every((f) => f!.early < f!.peak * .5 && f!.late < f!.peak * .25 && f!.peakK > .12 && f!.peakK < .7), text((f) => `${f.early.toFixed(0)} > ${f.peak.toFixed(0)} at ${f.peakK.toFixed(2)} > ${f.late.toFixed(0)} art px/s`));
        say(size, "the path sways in an S-curve, common wobbling most, true at the top", ok && fl.common!.turns >= 2 && fl.common!.sway > fl.uncommon!.sway * 1.25 && fl.uncommon!.sway > fl.rare!.sway * 1.25 && fl.rare!.sway > 0 && fv.every((f) => Math.abs(f!.end) < 2), text((f) => `sway ${f.sway.toFixed(0)} art px, ${f.turns} crossings`));
        say(size, "the word stays on screen in flight", ok && fv.every((f) => f!.onScreen));
        const ramps = RAMPS, want = await p.evaluate(() => __core.WORD_INK), cols = Object.entries(inks), rgb = cols.map(([, v]) => rgbOf(v)), ctr = cols.map(([k], i) => contrast(rgb[i], rgbOf(rgbHexOf(ramps[k as keyof typeof ramps][0])))), hexOf = (t: string) => rgbHexOf(want[t as keyof typeof want]), tk = Object.entries(texts);
        say(size, "the word's colour differs by rarity, readable", new Set(cols.map(([, v]) => v)).size === 3 && ctr.every((v) => v >= 7), cols.map(([k, v], i) => `${k} ${v}, ${ctr[i].toFixed(1)}:1 on its outline`).join("; "));
        say(size, "word, tier name and points wear the rarity's darkest step as their outline", tk.length === 3 && tk.every(([k, t]) => t.lines.every((l) => l.includes(rgbHexOf(ramps[k as keyof typeof ramps][0])))), tk.map(([k, t]) => `${k}: ${t.lines[0].slice(0, 18)}`).join("; "));
        say(size, "the word's box cord is drawn from its rarity's ramp", Object.keys(cords).length === 3 && Object.entries(cords).every(([k, v]) => v.length === 3 && [0, 1, 3].every((n) => v.includes(ramps[k as keyof typeof ramps][n]))), Object.entries(cords).map(([k, v]) => `${k} ${v.join(" ")}`).join("; "));
        say(size, "word, tier name and points share the rarity's colour", tk.length === 3 && tk.every(([k, t]) => ramps[k as keyof typeof ramps].includes(want[k as keyof typeof want]) && t.word === hexOf(k) && t.tier === hexOf(k) && t.pts === hexOf(k)), tk.map(([k, t]) => `${k}: word ${t.word}, name ${t.tier}, points ${t.pts}`).join("; "));
        say(size, "the answer line, flavour and HUD keep their colours", tk.every(([, t]) => !(["common", "uncommon", "rare"] as const).some((k) => [t.ans, t.flav, t.hud].includes(hexOf(k)))), tk.map(([k, t]) => `${k}: ${t.ans}, ${t.flav}`).join("; "));
        say(size, "no console errors in the flights", !errs.length, errs.slice(0, 2).join(" | "));
        await c.close();
      }

      // ---------- What the walk really draws ----------
      {
        const { c, p } = await open(browser, opts, false);
        await p.evaluate(() => __core.rate(4));
        const fits: Record<number, { fit: number; dur: number }> = {}; let walkEnded = "";
        for (let q = 1; q <= 6; q++) {
          if (!(await asking(p, q, 30000))) { walkEnded = `Q${q} not asked in 30 s, on ${await p.evaluate(() => `${__core.phase} Q${__core.q}, log ${__core.log.length} long, last ${__core.log.slice(-3).map((e) => `${e.phase} Q${e.q}`).join(" > ")}`)}`; break; }
          if (!(await typeIn(p, size, RUN[q - 1]))) { walkEnded = `Q${q}'s answer not taken`; break; }
          await p.evaluate(() => __core.rate(4));
          await buttonUp(p, 30000);
          // The stop goes in before the click, as thawTo's does: at 4× a small step's descent is about 0.7 s, and set after
          // the click, a slow page lost it, and the game ran on into the next question until its time ran out (the
          // mutants' baseline, ticket 14c-6b-2b, Evidence; check.mjs set it after).
          await p.evaluate(() => __core.freezeAt({ phase: "descent", k: .5 }));
          await p.click(R);
          if (!(await landed(p, 25000))) { walkEnded = `Q${q} ended on ${await p.evaluate(() => __core.log.slice(-4).map((e) => `${e.phase} Q${e.q}`).join(" > "))}`; break; }
          await p.evaluate(`window.__a = (${grabFloor})()`);
          const e = await p.evaluate(() => __core.log.at(-1)!);
          await p.evaluate(() => __core.rate(1));
          await thawTo(p, { phase: "descent", k: .985 });   // and real speed on to the next answer, as in the scripted run
          fits[q + 1] = { fit: await p.evaluate(`(${fitZoom})(window.__a, (${grabFloor})())`) as number, dur: e.dur };
          await thaw(p);
        }
        await c.close();
        const major = [3, 6].map((q) => fits[q] || { fit: 1, dur: 0 }), tiny = [2, 4, 5].map((q) => fits[q] || { fit: 1, dur: 0 }), step = (f: { fit: number }) => 1 - f.fit, rise = (i: number) => means[i] - means[i - 1];
        say(size, "Q3 and Q6 are major: the walk drawn zooms further and takes longer, and the light jumps", major.every((m) => step(m) >= .03 && tiny.every((t) => step(m) > step(t) * 1.8 && m.dur > t.dur * 1.2)) && [2, 5].every((i) => rise(i) > 8), `floor's scale at mid-walk, from pixels: ${Object.entries(fits).map(([q, f]) => `Q${q} ${f.fit.toFixed(3)} in ${f.dur} s`).join(", ")}; brightness rise Q3 ${rise(2).toFixed(1)}, Q6 ${rise(5).toFixed(1)}. Measures zoom, time and light, not camera distance${walkEnded && `; ${walkEnded}`}`);
      }

      // ---------- Common and rare, at Q1 and Q7, by the real path ----------
      {
        const seen: Record<string, Mark> = {}, files: string[] = [];
        // The mock skipped from Q1 to Q7; here Q7 is a page of its own (answer 46).
        for (const [tier, first, last] of [["common", "sunscreen", "sonic"], ["rare", "kite", "hawkman"]] as const) {
          for (const [q, word] of [[1, first], [7, last]] as const) {
            const { c, p } = await open(browser, opts, false, q);
            await p.evaluate(() => __core.rate(3));
            await typeIn(p, size, word);
            if (await freeze(p, { phase: "result", t: AGES[tier] - .7 })) {
              seen[`${tier} Q${q}`] = await p.evaluate(burstLit);
              files.push((await lookAt(p, `burst-${tier}-q${q}`, `Q${q} result`, [tier])).f);
            }
            await c.close();
          }
        }
        await strip(dir, `${size}-strip-bursts.png`, files, 560);
        const v = Object.values(seen), get = (k: string) => seen[k] || { far: 0, n: 0, tier: "", centre: 0, up: 0, down: 0, sag: 0 };
        say(size, "common and rare bursts on screen at Q1 and Q7, in their own shapes", v.length === 4 && v.every((m) => m.n > 200 && shapeOk(m)), Object.entries(seen).map(([k, m]) => `${k}: ${fmtM(m)}`).join("; "));
        say(size, "the four bursts are in their tier's ramp", v.length === 4 && v.every((m) => m.wrong === 0), Object.entries(seen).map(([k, m]) => `${k} ${m.wrong} off`).join("; "));
        say(size, "burst size follows points, on screen", get("common Q7").far > get("common Q1").far * 1.8 && get("rare Q7").far > get("rare Q1").far * 1.8, `reach common ${get("common Q1").far.toFixed(0)} > ${get("common Q7").far.toFixed(0)}, rare ${get("rare Q1").far.toFixed(0)} > ${get("rare Q7").far.toFixed(0)} art px`);
      }

      // ---------- The fuse against the seconds on screen, then a time-out with a word typed ----------
      // The mock played again from here into the dud, then the taken letters, on one page; here each is a page of its own,
      // and their console errors are one line, as the mock's were.
      const endsErrs: string[] = [];
      {
        const { c, p, errs } = await open(browser, opts);
        await p.evaluate(startTrace);
        await p.evaluate(() => __core.rate(4));
        const read = async (t: number) => {
          await freeze(p, { phase: "ask", t });
          const r = await p.evaluate(() => {
            const { AW, AH, U } = __core.place(), f = __core.fuseBox!, st = __core.shake, d = __artImage(f.x0 + st.x, f.y0 + st.y, f.w, f.h).data, cord = new Set(["#d9a06a", "#8a4e3e"].map((h) => parseInt(h.slice(1), 16)));
            const isCord = (i: number) => { const c = f.cells[i], a = (c[1] * f.w + c[0]) * 4; return cord.has(d[a] << 16 | d[a + 1] << 8 | d[a + 2]); };
            let first = 0, light = 0; while (first < f.cells.length && !isCord(first)) first++;
            for (let i = first; i < f.cells.length; i++) if (isCord(i)) light++;
            const X0 = Math.max(0, f.x0 - 30), Y0 = Math.max(0, f.y0 - 30), W = Math.min(AW - X0, f.w + 60), H = Math.min(AH - Y0, f.h + 60), box = __artImage(X0, Y0, W, H).data, head = f.cells[Math.min(first, f.cells.length - 1)]; let bright = 0, away = 0;
            for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) {
              const v = box[i] << 16 | box[i + 1] << 8 | box[i + 2]; if (v !== 0xffe9a8 && v !== 0xfff7e0 && v !== 0xffc04d) continue;
              bright++; if (Math.hypot(X0 + x - f.x0 - head[0], Y0 + y - f.y0 - head[1]) > 40) away++;
            }
            return { burnt: first / f.cells.length, secs: +__part("secs").textContent!, size: __core.fuse!.size, flies: __core.fuse!.flies, bright, away, cord: light, T: f.T * U };
          });
          await p.screenshot({ path: path.join(dir, `${size}-fuse-${t}.png`) });
          await thaw(p);
          return r;
        };
        const shakeAt = (t0: number, t1: number) => p.evaluate(async ({ t0, t1 }) => { let max = 0; const a = __part("ask"); for (let i = 0; i < 400; i++) { const t = __core.t - __core.qStart; if (t > t1) break; if (t >= t0) { const m = new DOMMatrixReadOnly(getComputedStyle(a).transform); max = Math.max(max, Math.abs(m.e), Math.abs(m.f)); } await new Promise((f) => requestAnimationFrame(f)); } return max / __core.place().U; }, { t0, t1 });
        const a = await read(3), shakeEarly = await shakeAt(4, 6), b2 = await read(10), cc = await read(16), shakeLate = await shakeAt(17, 19), d = await read(19), reads = [a, b2, cc, d];
        say(size, "the fuse burns in step with the seconds on screen", reads.every((r) => Math.abs(r.burnt - (1 - r.secs / 20)) <= .06) && new Set(reads.map((r) => r.secs)).size === 4 && reads.every((r, i) => !i || r.secs < reads[i - 1].secs), reads.map((r) => `${r.secs} s showing: ${(r.burnt * 100).toFixed(1)}% burnt`).join("; "));
        say(size, "sparks grow near the end", d.size > a.size + 2 && d.flies > a.flies * 2 && d.bright > a.bright * 1.5, `head ${a.size} > ${d.size} art px, spray ${a.flies} > ${d.flies}, bright pixels ${a.bright} > ${d.bright}`);
        say(size, "a sparkler: a thick twisted cord spitting along its length", a.T >= 5.5 && a.cord > 100 && a.away >= 12, `cord ${a.T.toFixed(1)} CSS px thick, ${a.cord} px of it unburnt, ${a.away} bright pixels away from the head`);
        say(size, "the box shakes only near the end, in whole art pixels", shakeEarly === 0 && shakeLate >= 1 && Math.abs(shakeLate - Math.round(shakeLate)) < .001, `up to ${shakeEarly} art px early, ${shakeLate.toFixed(2)} late`);
        await p.fill(A, "still typing").catch(() => {});
        say(size, "input usable while it shakes", await p.inputValue(A).then((v) => v === "still typing").catch(() => false));
        const ended = await until(p, () => __core.phase !== "ask", 15000);
        await p.evaluate(`window.__band0 = null; window.__bandOk = true; (function f() { if (__core.phase === "timeup") { const h = (${bandHash})(); if (window.__band0 === null) window.__band0 = h; else if (h !== window.__band0) window.__bandOk = false; } requestAnimationFrame(f); })();`);
        await freeze(p, { phase: "timeup", t: .5 }, 2500).then(async (ok) => { if (ok) { await lookAt(p, "timeup-1", "typed timeup"); await thaw(p); } });
        const up = await buttonUp(p, 20000);
        await p.waitForTimeout(200);
        await lookAt(p, "timeup-2", "typed over");
        const lg = await phases(p), tr = (await p.evaluate(() => window.__trace)).filter((f) => f.ph === "timeup"), band = await p.evaluate(() => window.__bandOk), end = await p.textContent('[data-part="rTier"]'), btn = await p.textContent(R);
        const ys = tr.map((f) => f.y), xs = tr.map((f) => f.x), rangeY = ys.length ? Math.max(...ys) - Math.min(...ys) : -1, rangeX = xs.length ? Math.max(...xs) - Math.min(...xs) : -1;
        say(size, "time-out: the word never leaves the ground", ended && lg.includes("timeup") && !lg.includes("charge") && !lg.includes("climb") && !lg.includes("burst") && tr.length > 10 && rangeY === 0 && rangeX === 0 && band, `phases ${lg.join(" > ")}; word watched on ${tr.length} frames, moved ${rangeY} px; street still: ${band}`);
        // Rewritten (answer 21): the ending's button is See results, where the mock's was play again.
        say(size, "time-out: ends on the street with See results", up && lg.includes("over") && end === "Fuse out" && btn === "See results", `${end}, ${btn}`);
        await strip(dir, `${size}-strip-timeup.png`, [`${size}-fuse-16.png`, `${size}-fuse-19.png`, `${size}-timeup-1.png`, `${size}-timeup-2.png`], 560);
        endsErrs.push(...errs);
        await c.close();
      }
      // ---------- The dud: the mock played again; here a page of its own ----------
      {
        const { c, p, errs } = await open(browser, opts);
        await p.evaluate(startTrace);
        await typeIn(p, size, "towel");
        await until(p, () => __core.phase === "charge", 5000);
        const dudInk = await p.evaluate(() => [getComputedStyle(__part("word")).color, __core.WORD_INK.caught]);
        await p.evaluate(() => { window.__camMax = 0; const f = () => { window.__camMax = Math.max(window.__camMax, __core.camNow); requestAnimationFrame(f); }; f(); });
        const files: string[] = [];
        for (const [ph, t, n] of [["charge", .7, "dud-1"], ["dud", .3, "dud-2"], ["dud", .75, "dud-3"], ["dud", 1.4, "dud-4"]] as const) { if (await freeze(p, { phase: ph, t }, 4000)) { files.push((await lookAt(p, n, `dud ${ph}`)).f); await thaw(p); } }
        const dudUp = await buttonUp(p, 15000);
        await p.waitForTimeout(200);
        files.push((await lookAt(p, "dud-5", "dud over")).f);
        await strip(dir, `${size}-strip-dud.png`, files, 560);
        const dl = await phases(p), dm = await p.evaluate(() => ({ cam: window.__camMax, ih: innerHeight, AH: __core.place().AH, tier: __part("rTier").textContent, top: Math.min(...window.__trace.map((f) => f.y)) })), run2 = dl.slice(dl.lastIndexOf("ask", dl.lastIndexOf("charge")));
        // Rewritten (answer 16): the word waits for the reply before it charges, so "wait" comes between.
        say(size, "dud: charges, lifts a little, falls back, ends", dudUp && run2.join(" > ") === "ask > wait > charge > dud > over" && dm.tier === "Dud" && dm.cam > 0 && dm.cam < dm.AH * .2 && dm.top > dm.ih * .3, `${run2.join(" > ")}; view lifted ${dm.cam} art px of ${dm.AH}; word's highest top ${dm.top.toFixed(0)} of ${dm.ih}`);
        say(size, "a dud never reaches the sky", !run2.includes("climb") && !run2.includes("burst"));
        say(size, "a dud's word is ash, not a rarity", rgbOf(dudInk[0]).join() === [1, 3, 5].map((i) => parseInt(dudInk[1].slice(i, i + 2), 16)).join(), dudInk[0]);
        const dudRows = await p.evaluate(() => ({ shown: __part("rRecap").getClientRects().length > 0, rows: [...__part("rRecap").querySelectorAll("li")].map((li) => ({ ans: li.children[0].textContent, pts: li.children[1].textContent, ink: getComputedStyle(li).color })), results: __core.run.results.length, ash: __core.WORD_INK.caught }));
        say(size, "a dud's ending lists the run, its own row in ash with no points", dudRows.shown && dudRows.results > 0 && dudRows.rows.length === dudRows.results && dudRows.rows.at(-1)!.pts === "0" && dudRows.rows.at(-1)!.ink === rgbHexOf(dudRows.ash), dudRows.rows.map((r) => `${r.ans} ${r.pts}`).join("; "));
        const scr = await p.evaluate(() => { const r = __part("result").getBoundingClientRect(); return { b: r.bottom, ih: innerHeight }; });
        say(size, "end text on screen", scr.b <= scr.ih, `${scr.b.toFixed(0)} of ${scr.ih}`);
        endsErrs.push(...errs);
        await c.close();
      }
      // ---------- Taken letters: the mock skipped to Q2; here the page starts there ----------
      {
        const { c, p, errs } = await open(browser, opts, true, 2);
        await p.focus(A);
        const cdp = await c.newCDPSession(p);
        for (const text of ["l", "le", "lem", "lemp", "lempo", "lempon"]) await cdp.send("Input.imeSetComposition", { text, selectionStart: text.length, selectionEnd: text.length });
        await cdp.send("Input.insertText", { text: "lempon" });
        await p.waitForTimeout(100);
        const typed = await p.inputValue(A);
        say(size, "taken letter leaves a composition cleanly", typed === "lemon", typed);
        await p.fill(A, ""); await p.focus(A); await p.keyboard.type("pear");
        say(size, "taken letter refused on the keyboard", (await p.inputValue(A)) === "ear", await p.inputValue(A));
        // Added (answer 56): off-list text shakes the box as a refused taken letter does (answer 28), in the same steps. Every
        // step the box is set to, from Enter on: read per frame, a shake still running from the "pear" above blurred into it.
        await p.fill(A, "wolfe");
        await p.waitForTimeout(AFTERGLOW.REFUSE_STEP_MS * AFTERGLOW.REFUSE_STEPS.length);   // "pear"'s shake done
        await p.evaluate(() => { const a = __part("answer"), U = __core.place().U; window.__steps = []; new MutationObserver(() => window.__steps.push(+(new DOMMatrixReadOnly(a.style.transform).e / U).toFixed(3))).observe(a, { attributeFilter: ["style"] }); });
        await p.press(A, "Enter");
        const stepped = await p.waitForFunction((n) => window.__steps.length >= n, AFTERGLOW.REFUSE_STEPS.length, { timeout: 5000 }).then(() => true, () => false);
        const off = await p.evaluate(() => window.__steps), line = await p.textContent('[data-part="note"]');
        say(size, "off-list text shakes the box, in whole art pixels, as a taken letter does", stepped && off.join() === AFTERGLOW.REFUSE_STEPS.join() && line === `"wolfe" isn't in our list. Try another answer.` && (await p.inputValue(A)) === "wolfe", `steps ${off.join(",")}; ${line}`);
        endsErrs.push(...errs);
        say(size, "no console errors in the ends", !endsErrs.length, endsErrs.slice(0, 2).join(" | "));
        await c.close();
      }

      // ---------- A time-out with nothing typed ----------
      {
        const { c, p, errs } = await open(browser, opts);
        await p.evaluate(startTrace);
        await p.evaluate(() => __core.rate(5));
        await until(p, () => __core.phase !== "ask", 10000);
        await p.evaluate(() => __core.rate(1));
        const hidden = await p.evaluate(() => __part("word").hidden);
        await p.waitForTimeout(500);
        await lookAt(p, "timeup-empty-1", "empty timeup");
        const up = await buttonUp(p, 15000);
        await p.waitForTimeout(150);
        await lookAt(p, "timeup-empty-2", "empty over");
        const r = await p.evaluate(() => ({ phases: __core.log.map((e) => e.phase).join(" > "), tier: __part("rTier").textContent, note: __part("rAns").textContent, trace: window.__trace.length }));
        say(size, "time-out with an empty box: no word, the same ending", up && hidden && r.trace === 0 && r.phases === "ask > timeup > over" && r.tier === "Fuse out" && r.note === "Nothing lit" && !errs.length, `${r.phases}; ${r.note}; ${r.trace} word frames${errs.length ? "; " + errs[0] : ""}`);
        await c.close();
      }
      // Dropped (answer 46): "the skip link plays each lantern once" and "skipping all seven reaches the results"; the game has no skip link.

      // ---------- Idle motion: Q1, and Q5 on a page of its own (the mock skipped there) ----------
      {
        const moved = (p: Page) => p.evaluate(async () => {
          const { AW, AH } = __core.place(), view = __core.view, sc = __core.scene!;
          const grab = () => { const lo = __artImage(0, Math.floor(AH * .72), AW, AH - Math.floor(AH * .72)).data, hi = __artImage(0, 0, AW, view.hud.y + view.hud.h + 40).data; return [lo, hi]; };
          const v = view.prompt, L = sc.lights.filter((l) => l.r >= 2 && !(l.x > v.x - 12 && l.x < v.x + v.w + 12 && l.y > v.y - 12 && l.y < v.y + v.h + 12)), lamp = () => L.map((l) => { const d = __artImage(l.x, l.y, 1, 1).data; return d[0] << 16 | d[1] << 8 | d[2]; }), lamp0 = lamp(), flickered = new Set<number>();
          const a = grab(); let low = 0, top = 0;
          for (let n = 0; n < 12; n++) { await new Promise((f) => setTimeout(f, 200)); const b2 = grab(); for (let i = 0; i < a[0].length; i += 4) if (a[0][i] !== b2[0][i]) low++; for (let i = 0; i < a[1].length; i += 4) if (a[1][i] !== b2[1][i]) top++; lamp().forEach((v, i) => { if (v !== lamp0[i]) flickered.add(i); }); }
          return { low, top, lights: L.length, flickered: flickered.size };
        });
        const one = await open(browser, opts, false), q1 = await moved(one.p); await one.c.close();
        const five = await open(browser, opts, false, 5), q5 = await moved(five.p); await five.c.close();
        say(size, "idle: Q1's only motion is the clouds", q1.top > 0 && q1.low === 0 && q1.lights === 0, `Q1 sky ${q1.top} px changed, street ${q1.low}`);
        say(size, "idle: a lit stage's lanterns flicker", q5.lights > 0 && q5.flickered > q5.lights * .5, `Q5: ${q5.flickered} of ${q5.lights} lanterns changed in 2.4 s`);
      }

      // ---------- A new size mid-run ----------
      {
        const { c, p, errs } = await open(browser, opts, false);
        const other = { width: ih, height: iw };   // the phone turned, the desktop on end
        await p.evaluate(() => __core.rate(4));
        await p.setViewportSize(other);
        await p.waitForTimeout(400);
        await typeIn(p, size, "kite");
        await until(p, () => __core.phase === "climb", 20000);
        await p.setViewportSize(opts.viewport);
        await buttonUp(p, 20000);
        await p.setViewportSize(other);
        await p.waitForTimeout(300);
        await p.evaluate(() => __core.rate(1));   // at speed the descent can pass while the click is still returning
        await p.click(R);
        await until(p, () => __core.phase === "descent", 10000);
        await p.setViewportSize(opts.viewport);
        const lit = await until(p, () => __core.phase === "letter", 15000);
        await p.setViewportSize(other);
        await p.waitForTimeout(200);
        await p.setViewportSize(opts.viewport);
        await asking(p, 2, 20000);
        await p.waitForTimeout(300);
        const r = await p.evaluate(() => ({ aw: __core.place().AW, S: __core.place().S, cw: __core.screen.width, sw: document.documentElement.scrollWidth, iw: innerWidth }));
        say(size, "a new size mid-run, the lantern included, redraws and plays on", lit && !errs.length && r.aw * r.S === r.cw && r.sw <= r.iw, errs.slice(0, 2).join(" | ") || `art ${r.aw} wide`);
        await c.close();
      }

      // ---------- A dud after a safe answer ----------
      {
        const { c, p } = await open(browser, opts);
        await p.evaluate(() => __core.rate(4));
        await typeIn(p, size, RUN[0]);
        await buttonUp(p, 20000);
        await p.click(R);
        await asking(p, 2, 30000);
        await typeIn(p, size, DAY[1].host[0]);
        const up = await buttonUp(p, 20000);
        await p.waitForTimeout(150);
        const rows = await p.evaluate(() => { const panel = getComputedStyle(__part("screen").parentElement!).getPropertyValue("--panel").trim(); return [...__part("rRecap").querySelectorAll("li")].map((li, i) => { const s = getComputedStyle(li), r = __core.run.results[i], key = r.caught ? "caught" : r.tier; return { ink: s.color, line: s.textShadow, wantInk: __core.WORD_INK[key], wantLine: r.caught ? null : __core.RAMP[r.tier][0], panel }; }); });
        say(size, "a dud's recap keeps the run's colours and outlines", up && rows.length === 2 && rows.every((r) => r.ink === rgbHexOf(r.wantInk) && r.line.includes(rgbHexOf(r.wantLine ?? r.panel))), rows.map((r) => `${r.ink} on ${r.line.split(")")[0]})`).join("; "));
        // Dropped (answer 46): "a new size after New show plays on"; the game has one run a day and no New show.
        await c.close();
      }

      // ---------- No card, and the longest answer fits ----------
      {
        const { c, p } = await open(browser, opts, false);
        await p.evaluate(() => __core.rate(4));
        await typeIn(p, size, "sydney harbour bridge");
        await buttonUp(p, 20000);
        await p.waitForTimeout(100);
        await p.screenshot({ path: path.join(dir, `${size}-result-longest.png`) });
        const r = await p.evaluate(() => {
          const box = (el: Element) => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; }, res = __part("result"), word = __part("word");
          const flat = (e: Element) => { const s = getComputedStyle(e); return s.backgroundColor === "rgba(0, 0, 0, 0)" && s.borderTopStyle === "none" && s.boxShadow === "none" && s.backgroundImage === "none"; };
          return { cards: document.querySelectorAll(".card, #card").length, flat: [res, ...res.querySelectorAll("h2, p")].every(flat), res: box(res), kids: [...res.children].filter((e) => (e as HTMLElement).offsetParent).map(box), word: box(word), hud: box(__part("hud")), iw: innerWidth, ih: innerHeight };
        });
        const inside = (bx: { l: number; t: number; r: number; b: number }) => bx.l >= 0 && bx.t >= 0 && bx.r <= r.iw && bx.b <= r.ih;
        say(size, "no result card: text on the sky", r.cards === 0 && r.flat, `card elements ${r.cards}, panels behind the text: ${r.flat ? "none" : "some"}`);
        say(size, "result text and longest word fit", inside(r.res) && r.kids.every(inside) && inside(r.word) && r.word.b <= r.res.t + 1 && r.hud.b <= r.word.t, `word ${r.word.l.toFixed(0)}-${r.word.r.toFixed(0)}, text to ${r.res.b.toFixed(0)} of ${r.ih}`);
        await c.close();
      }

      // ---------- The glitter, over a real minute ----------
      {
        const { c, p, errs } = await open(browser, opts, false);
        const word = size === "wide" ? "kite" : "sunscreen";
        await typeIn(p, size, word);
        const up = await buttonUp(p, 30000);
        await p.waitForTimeout(3000);   // past the bloom: from here only glitter is left
        const frames: Mark[] = [], files: string[] = [], t0 = Date.now(); let n = 0;
        while (up && Date.now() - t0 < LINGER_S * 1000) {
          frames.push(await p.evaluate(burstLit));
          n++;
          await p.evaluate(() => { const { AW, AH } = __core.place(), d = __artImage(0, 0, AW, AH).data; if (window.__prevF) { let k = 0; const a = window.__prevF; for (let i = 0; i < d.length; i += 4) if (d[i] !== a[i] || d[i + 1] !== a[i + 1]) k++; (window.__ch ||= []).push(k); } window.__prevF = d; });
          if (n === 1 || n === 7 || n === 13) files.push((await lookAt(p, `linger-${n}`, "linger result", [size === "wide" ? "rare" : "common"])).f);
          await p.waitForTimeout(5000);
        }
        const secs = (Date.now() - t0) / 1000, ch = await p.evaluate(() => window.__ch || []), counts = frames.map((f) => f.n), reach = frames.map((f) => f.far), mn = Math.min(...counts), mx = Math.max(...counts);
        const meanOf = (l: Mark[]) => { const o = { tier: frames[0] && frames[0].tier, n: 0, centre: 0, up: 0, down: 0, sag: 0, far: 0 }; for (const k of ["n", "centre", "up", "down", "sag", "far"] as const) o[k] = l.reduce((a, f) => a + f[k], 0) / (l.length || 1); return o; }, held2 = meanOf(frames.slice(0, frames.length >> 1)), held3 = meanOf(frames.slice(frames.length >> 1));
        say(size, "the burst lingers: frames still change after a minute", up && secs >= 60 && ch.length >= 10 && ch.every((k) => k > 40), `${secs.toFixed(0)} s, ${frames.length} frames; pixels changed between them ${ch.length ? Math.min(...ch) + " to " + Math.max(...ch) : "none"}`);
        say(size, "the lingering burst holds its shape and size", frames.length >= 10 && mn > 80 && mx < mn * 1.5 && Math.max(...reach) < Math.min(...reach) * 1.35 && shapeOk(held2) && shapeOk({ ...held3 }), `lit ${mn} to ${mx} px, reach ${Math.min(...reach).toFixed(0)} to ${Math.max(...reach).toFixed(0)}; first half ${fmtM(held2)}; second half ${fmtM(held3)}`);
        // No repeat flash: a few seconds of every frame, none far above the rest.
        const dense: number[] = [];
        for (let i = 0; i < 30; i++) { dense.push((await p.evaluate(burstLit)).n); await p.waitForTimeout(100); }
        say(size, "the lingering burst never flashes again", Math.max(...dense) < Math.min(...dense) * 1.6, `lit ${Math.min(...dense)} to ${Math.max(...dense)} px over 3 s`);
        await strip(dir, `${size}-strip-linger.png`, files, 560);
        if (up) await p.click(R);
        say(size, "the button still works after the wait", up && (await until(p, () => __core.phase === "descent", 5000)) && !errs.length, errs.slice(0, 1).join(" | "));
        await c.close();
      }
    }

    // ---------- Colour and fonts, across everything looked at ----------
    // The CI set looks at the scripted run alone, so only the phases it plays are required of it.
    const needs = (ph: string[]) => ph.every((k) => byPhase[k]);
    say(size, "every frame is the family or exactly the ramp in play; ask, descent, dud and time-out have no ramp colour", rampLog.size === 0 && needs(full ? ["ask", "descent", "dud", "timeup", "letter"] : ["ask", "descent", "letter"]), rampLog.size ? [...rampLog].slice(0, 6).map(([k, v]) => `#${k} (${v})`).join("; ") + `, ${rampLog.size} in all` : `${Object.values(byPhase).reduce((a, q) => a + q.frames, 0)} canvas frames`);
    // Rewritten (answer 46): the mock's list of phases included play again's, which the game doesn't have.
    say(size, "on screen, outside the result text over a burst, every pixel plum to amber", colourLog.size === 0 && needs(full ? ["timeup", "over", "dud"] : ["over"]), colourLog.size ? [...colourLog].slice(0, 6).map(([k, v]) => `${k} (${v})`).join("; ") + ` and ${Math.max(0, colourLog.size - 6)} more` : `${Object.keys(byPhase).length} phases sampled; on screen with text edges, up to ${colourMax} colours`);
    const rampHex = new Set(RAMP_ALL), hues = [...allArt.keys()].filter((v) => !rampHex.has(v)).map(hueOfN), bad2 = [...allArt].filter(([v]) => !inFamily(hueOfN(v)) && v !== 0 && !rampHex.has(v)), rel = hues.filter((h) => h !== null).map((h) => (h! >= 300 ? h! - 360 : h!));
    fs.writeFileSync(path.join(dir, `${size}-colours.json`), JSON.stringify({ perPhase: byPhase, colours: [...allArt].map(([v, w]) => ({ hex: "#" + v.toString(16).padStart(6, "0"), hue: hueOfN(v) === null ? null : +hueOfN(v)!.toFixed(1), first: w })) }));
    say(size, "canvas colours listed: hue of each in game-colours.json, count per frame by phase, no limit applied", bad2.length === 0, `${allArt.size} colours across the run; background hue ${(Math.min(...rel) + 360).toFixed(1)} through 0 to ${Math.max(...rel).toFixed(1)}; per frame ${Object.entries(byPhase).map(([k, q]) => `${k} ${q.min}-${q.max}`).join(", ")}`);
    // Handjet by the family next/font gave it (src/afterglow/font.ts), as the page names it.
    const { c: fc, p: fp } = await open(browser, opts, false);
    const family = await fp.evaluate(() => getComputedStyle(__part("screen").parentElement!).getPropertyValue("--afterglow-font").split(",")[0].trim().replace(/^["']|["']$/g, ""));
    say(size, "one font, in every element and every phase, hidden ones too", fontsSeen.size === 1 && fontsSeen.has(`${family} 400`), [...fontsSeen].join("; "));
    say(size, "font loaded", await fp.evaluate((family) => [...document.fonts].some((f) => f.family.replace(/^["']|["']$/g, "") === family && f.status === "loaded"), family));
    say(size, "HUD opaque", /^rgb\(/.test(await fp.evaluate(() => getComputedStyle(__part("hud")).backgroundColor)));
    await fc.close();
  });
}
