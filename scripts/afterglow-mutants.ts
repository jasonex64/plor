// Runs Afterglow's mutants (docs/milestones/M14-14c-6-afterglow-in-play.md, 14c-6b-2b): each through the full look
// check against a broken copy of the game's compiled code, then says which the check caught.
//   npm run check:afterglow-mutants [pattern for names]
// Its own `next dev` on port 3001, no database (answers 63, 65); first, every chosen mutant's breaks are matched against
// what the test page loads, so a compiler update stops it at the start (answer 48). Then four at a time, each the whole
// check at both sizes without the fps test (answers 48, 62; mutants.mjs's --no-fps), and the fps mutants alone with it
// (answer 66). A run that ends early (a wait ran out) is STALLED: a check bug to fix, then re-run (answer 64). Before any
// mutant, the unbroken game through the same check, alone and with the fps test; a line failing there stops the run (answer 69).
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { rmSync } from "node:fs";
import { chromium } from "@playwright/test";
import { BASELINE, breakChunk, misses, MUTANTS, MUTANT_POOL, MUTANT_PORT, type Mutant } from "../e2e/afterglow-mutants.ts";

const BASE = `http://localhost:${MUTANT_PORT}`;
// Playwright's own wait for a web server to start (its types: "Defaults to 60000").
const SERVER_START_MS = 60_000;
// The check's own fail messages come from its one soft assertion, `say` in e2e/afterglow-look.e2e.ts; any other error
// ended the run early. The JSON report keeps the terminal's colour codes in its messages, so they're taken out first.
const LINE_FAILED = "expect(received).toBe(expected)";
const plain = (s = "") => s.replace(/\x1b\[[0-9;]*m/g, "");

type Result = { name: string; verdict: "caught" | "MISSED" | "STALLED"; own: string[]; ownPassed: string[]; fails: string[]; other: string[]; s: number };

function startServer(): Promise<ChildProcess> {
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", String(MUTANT_PORT)], { stdio: ["ignore", "pipe", "pipe"], detached: process.platform !== "win32" });
  let log = "";
  return new Promise((ready, fail) => {
    const timer = setTimeout(() => { stopServer(server); fail(new Error(`next dev didn't say Ready on ${MUTANT_PORT} in ${SERVER_START_MS} ms:\n${log}`)); }, SERVER_START_MS);
    const read = (d: Buffer) => { log += d; if (/Ready in/.test(log)) { clearTimeout(timer); ready(server); } };
    server.stdout!.on("data", read); server.stderr!.on("data", read);
    server.on("exit", (code) => { clearTimeout(timer); fail(new Error(`next dev exited (${code}):\n${log}`)); });
  });
}

function stopServer(server: ChildProcess) {
  if (server.exitCode !== null) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"]);
  else process.kill(-server.pid!, "SIGTERM");
}

// Every chunk the test page loads, as the check's pages get them.
async function chunks() {
  const browser = await chromium.launch({ channel: "chrome" }), page = await browser.newPage(), texts: Promise<string>[] = [];
  page.on("response", (r) => { if (new URL(r.url()).pathname.startsWith("/_next/static/chunks/")) texts.push(r.text()); });
  await page.goto(`${BASE}/check/afterglow`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => "__core" in window);
  const all = await Promise.all(texts);
  await browser.close();
  return all;
}

type Report = { suites?: Report[]; specs?: { title: string; tests: { results: { status: string; errors: { message?: string; location?: { file: string; line: number } }[]; stdout: { text?: string }[] }[] }[] }[]; errors?: { message?: string }[] };

function runOne(name: string, m: Mutant, i: number | string): Promise<Result> {
  const out = `test-results/mutants/${i}`, t0 = Date.now();
  // No trace: the output is removed after each mutant, and writing one under four runs at once failed ("file data stream
  // has unexpected number of bytes", the first trial).
  const args = ["node_modules/@playwright/test/cli.js", "test", "--project=afterglow-full", "--reporter=json", "--trace=off", `--output=${out}`, ...(m.withFps ? [] : ["--grep-invert", "at 60 fps"])];
  const child = spawn(process.execPath, args, { env: { ...process.env, AFTERGLOW_MUTANT: name }, stdio: ["ignore", "pipe", "pipe"] });
  let json = "", err = "";
  child.stdout.on("data", (d) => { json += d; }); child.stderr.on("data", (d) => { err += d; });
  return new Promise((done, fail) => child.on("close", () => {
    rmSync(out, { recursive: true, force: true });
    let report: Report;
    try { report = JSON.parse(json); } catch { return fail(new Error(`mutant ${JSON.stringify(name)}: Playwright gave no report:\n${err}\n${json.slice(0, 2000)}`)); }
    const lines: string[] = [], other: string[] = (report.errors ?? []).map((e) => e.message ?? "");
    const walk = (s: Report) => {
      for (const spec of s.specs ?? []) for (const t of spec.tests) for (const r of t.results) {
        for (const o of r.stdout) lines.push(...(o.text ?? "").split("\n"));
        // Where it ended, and in which test, so the stall's cause can be found (answer 64).
        const at = (e: { location?: { file: string; line: number } }) => `${spec.title}${e.location ? `, ${e.location.file.split(/[\\/]/).pop()}:${e.location.line}` : ""}`;
        for (const e of r.errors) if (!plain(e.message).includes(LINE_FAILED)) other.push(`${at(e)}: ${plain(e.message) || r.status}`);
        if (r.status === "timedOut" || r.status === "interrupted") other.push(`${spec.title}: ${r.status}`);
      }
      for (const c of s.suites ?? []) walk(c);
    };
    walk(report);
    const fails = lines.filter((l) => l.startsWith("FAIL ")), own = fails.filter((l) => m.want.test(l)), ownPassed = lines.filter((l) => l.startsWith("pass ") && m.want.test(l));
    const verdict = other.length ? "STALLED" : own.length >= (m.need ?? 1) ? "caught" : "MISSED";
    done({ name, verdict, own, ownPassed, fails, other, s: Math.round((Date.now() - t0) / 1000) });
  }));
}

function say(r: Result) {
  console.log(`${r.verdict}: ${r.name} (${r.own.length} of its own lines failed, ${r.fails.length} FAIL lines in all, ${r.s} s)`);
  for (const l of r.own) console.log("   " + l);
  // Every other line that failed, in full, so a line that fails under any mutant, not from its break, shows across the
  // run with its reason (the first full run's "Q3 and Q6 are major", ticket 14c-6b-2b, Evidence).
  for (const l of r.fails.filter((l) => !r.own.includes(l))) console.log("   also " + l);
  for (const e of r.other) console.log("   ended early: " + e.split("\n")[0]);
  // A miss shows its own lines as they passed, so how near they came is in the log (the fourth full run's two misses).
  if (r.verdict === "MISSED") for (const l of r.ownPassed) console.log("   passed " + l);
}

async function main() {
  const only = process.argv[2], list = Object.entries(MUTANTS).filter(([n]) => !only || new RegExp(only).test(n));
  if (!list.length) throw new Error(`no mutant matches ${only}`);
  const held = await fetch(BASE).then(() => true, () => false);
  if (held) throw new Error(`port ${MUTANT_PORT} is in use; the mutants start their own server there`);

  const t0 = Date.now(), server = await startServer();
  const stop = () => stopServer(server);
  process.on("SIGINT", () => { stop(); process.exit(1); });
  try {
    const loaded = await chunks(), wrong: string[] = [];
    for (const [name, m] of list) {
      const hits = m.breaks.map(() => 0), errors: string[] = [];
      for (const text of loaded) breakChunk(text, m.breaks, hits, errors);
      for (const w of misses(m.breaks, hits, errors)) wrong.push(`${name}: ${w}`);
    }
    if (wrong.length) throw new Error(`breaks that no longer match the compiled code:\n${wrong.join("\n")}`);
    console.log(`${list.length} mutants, every break matched; ${MUTANT_POOL} at a time on ${BASE}`);

    const base = await runOne(BASELINE, { breaks: [], want: /^$/, withFps: true }, "baseline");
    console.log(`baseline, ${BASELINE}: ${base.fails.length} FAIL lines, ${base.other.length} ended early (${base.s} s)`);
    for (const l of base.fails) console.log("   " + l);
    for (const e of base.other) console.log("   ended early: " + e.split("\n")[0]);
    if (base.fails.length || base.other.length) throw new Error("the unbroken game fails the check, so no mutant can be judged against it");

    const results: Result[] = [], batch = list.filter(([, m]) => !m.withFps), alone = list.filter(([, m]) => m.withFps);
    let at = 0;
    await Promise.all(Array.from({ length: MUTANT_POOL }, async () => {
      while (at < batch.length) { const i = at++, [name, m] = batch[i]; const r = await runOne(name, m, i); say(r); results.push(r); }
    }));
    for (const [i, [name, m]] of alone.entries()) { const r = await runOne(name, m, batch.length + i); say(r); results.push(r); }

    const bad = results.filter((r) => r.verdict !== "caught"), mins = Math.round((Date.now() - t0) / 60_000);
    console.log(bad.length ? `${bad.length} of ${results.length} not caught (${bad.map((r) => `${r.verdict} ${r.name}`).join("; ")}), ${mins} min` : `all ${results.length} caught, ${mins} min`);
    process.exitCode = bad.length ? 1 : 0;
  } finally {
    stop();
    rmSync("test-results/mutants", { recursive: true, force: true });
  }
}

await main();
