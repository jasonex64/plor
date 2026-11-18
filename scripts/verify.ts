// Reruns one formal-verification check (docs/milestones/PROCESS-formal-verification.md). Usage:
//   npm run verify -- <name>
// for the model in .claude/skills/verify-<name>/: every rule in <Model>.cfg must hold, and every rule in
// <Model>.findings.cfg (rules the code breaks today, recorded in ROADMAP) must still break. Exits 1 otherwise.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// The TLC and Java that pstack's statechart pins (.claude/skills/statechart/scripts/run.ts:68-69), so a check and its
// chart run the same checker.
const TLC_TOOL =
  "http:tla2tools[url=https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar,checksum=sha256:936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88]@1.7.4";
const JAVA_TOOL = "java@temurin-25";
// TLC 1.7.4's exit codes for "no error" and "an invariant is violated", read from its runs on 2026-11-17 (the ticket,
// Evidence).
const HOLDS = 0;
const BREAKS = 12;

const name = process.argv[2];
if (!name) throw new Error("Usage: npm run verify -- <name>, for .claude/skills/verify-<name>/");
const dir = path.resolve(import.meta.dirname, "..", ".claude", "skills", `verify-${name}`);
const specs = fs.readdirSync(dir).filter((f) => f.endsWith(".tla"));
if (specs.length !== 1) throw new Error(`${dir} must hold exactly one .tla file, found ${specs.length}`);
const model = specs[0].slice(0, -".tla".length);

// mise reads no config from the repo (MISE_CEILING_PATHS), as statechart's run.ts does.
const mise = (...args: string[]) => {
  const r = spawnSync("mise", args, {
    cwd: os.tmpdir(),
    encoding: "utf8",
    env: { ...process.env, MISE_CEILING_PATHS: os.tmpdir() },
  });
  if (r.error) throw new Error(`mise not found (${r.error.message}); install it: the ticket, plan step 3`);
  if (r.status !== 0) throw new Error(`mise ${args.join(" ")} failed:\n${r.stderr}`);
  return r.stdout.trim();
};
mise("install", JAVA_TOOL, TLC_TOOL);
const jar = path.join(mise("where", TLC_TOOL), "tla2tools.jar");
const java = mise("which", "java", "--tool", JAVA_TOOL);

const tlc = (cfgText: string) => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "verify-"));
  try {
    const cfg = path.join(work, `${model}.cfg`);
    fs.writeFileSync(cfg, cfgText);
    const started = Date.now();
    const r = spawnSync(
      java,
      ["-XX:+UseParallelGC", "-cp", jar, "tlc2.TLC", "-config", cfg, "-workers", "1", "-metadir", path.join(work, "states"), `${model}.tla`],
      { cwd: dir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    if (r.error) throw r.error;
    // The last count is the final one; progress lines print counts before it.
    const states = [...r.stdout.matchAll(/([\d,]+) distinct states found/g)].at(-1)?.[1] ?? "?";
    return { status: r.status, output: r.stdout + r.stderr, states, seconds: ((Date.now() - started) / 1000).toFixed(1) };
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
};

// A findings file names its rules in one INVARIANTS block; each is checked alone, because TLC stops at the first rule
// that breaks.
const rulesIn = (cfgText: string) => {
  const lines = cfgText.split(/\r?\n/);
  const start = lines.findIndex((l) => /^INVARIANTS?\b/.test(l));
  if (start === -1) throw new Error("the findings file has no INVARIANTS block");
  const rules: string[] = [];
  let end = start + 1;
  for (; end < lines.length && /^\s+\w+\s*$/.test(lines[end]); end++) rules.push(lines[end].trim());
  return { rules, without: [...lines.slice(0, start), ...lines.slice(end)].join("\n") };
};

let failed = false;
const main = tlc(fs.readFileSync(path.join(dir, `${model}.cfg`), "utf8"));
if (main.status === HOLDS) console.log(`${model}.cfg: every rule holds (${main.states} distinct states, ${main.seconds} s)`);
else {
  failed = true;
  console.log(`${model}.cfg: a rule breaks or TLC stopped (exit ${main.status}). Read it with /statechart. TLC printed:\n${main.output}`);
}

const findingsFile = path.join(dir, `${model}.findings.cfg`);
if (fs.existsSync(findingsFile)) {
  const { rules, without } = rulesIn(fs.readFileSync(findingsFile, "utf8"));
  for (const rule of rules) {
    const r = tlc(`${without}\nINVARIANT ${rule}\n`);
    if (r.status === BREAKS) console.log(`finding ${rule}: still breaks, as recorded (${r.seconds} s)`);
    else {
      failed = true;
      console.log(
        r.status === HOLDS
          ? `finding ${rule}: now HOLDS. The code was fixed: move ${rule} to ${model}.cfg and close its ROADMAP item.`
          : `finding ${rule}: TLC stopped (exit ${r.status}). TLC printed:\n${r.output}`,
      );
    }
  }
}
process.exit(failed ? 1 : 0);
