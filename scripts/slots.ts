// `npm run slots`: the three folders sessions work in at once (docs/milestones/PROCESS-parallel-sessions.md; CLAUDE.md,
// Slots). `npm run slots` lists them; `-- take <branch>` puts a branch in the first free slot and resets that slot's
// database; `-- free <n>` returns a merged slot to origin/main and stops its stack. There are three and no more.
import { execFileSync, execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { localStack, mainCheckout, portHolder, samePath, slotsOf, supabaseEnv, type Holder, type Slot } from "./slot.ts";

type State = { exists: boolean; branch: string | null; dirty: boolean; devHolder: Holder | null };

function git(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

// Runs a fixed command line in a folder; a failure stops the script (npx is a .cmd on Windows, so a shell). `hideOutput`
// drops its standard output and keeps its errors: `supabase start` prints the stack's keys there (CLAUDE.md, Secrets).
function run(commandLine: string, cwd: string, hideOutput = false): void {
  const result = spawnSync(commandLine, { cwd, stdio: ["inherit", hideOutput ? "ignore" : "inherit", "inherit"], shell: true });
  if (result.status !== 0) throw new Error(`${commandLine} failed in ${cwd} (exit ${result.status})`);
}

function stateOf(slot: Slot): State {
  if (!existsSync(slot.dir)) return { exists: false, branch: null, dirty: false, devHolder: null };
  const branch = git(["branch", "--show-current"], slot.dir) || null;
  return { exists: true, branch, dirty: git(["status", "--porcelain"], slot.dir) !== "", devHolder: portHolder(slot.devPort) };
}

// A slot is free when it is missing, or clean, on main or detached, with nothing on its dev port.
export function isFree(state: State): boolean {
  return !state.exists || (!state.dirty && (state.branch === null || state.branch === "main") && state.devHolder === null);
}

function stackState(slot: Slot): string {
  const out = execFileSync("docker", ["ps", "-a", "--filter", `name=^supabase_db_${slot.projectId}$`, "--format", "{{.Status}}"], { encoding: "utf8" }).trim();
  return out === "" ? "none" : out.startsWith("Up") ? "running" : "stopped";
}

function openPr(branch: string, cwd: string): string {
  const out = execFileSync("gh", ["pr", "list", "--head", branch, "--state", "open", "--json", "number,url", "--jq", ".[] | \"#\\(.number) \\(.url)\""], { cwd, encoding: "utf8" }).trim();
  return out || "none";
}

function describe(slot: Slot, state: State): string {
  if (!state.exists) return `slot ${slot.number}  ${slot.dir}  (not made yet; free)  port ${slot.devPort}`;
  const branch = state.branch ?? `detached at ${git(["rev-parse", "--short", "HEAD"], slot.dir)}`;
  return [
    `slot ${slot.number}  ${slot.dir}  ${isFree(state) ? "FREE" : "BUSY"}`,
    `  branch ${branch}${state.dirty ? " (uncommitted changes)" : ""}`,
    `  port ${slot.devPort}: ${state.devHolder ? `held by process ${state.devHolder.pid}` : "free"}`,
    `  stack ${slot.projectId}: ${stackState(slot)}`,
    `  pull request: ${state.branch && state.branch !== "main" ? openPr(state.branch, slot.dir) : "none"}`,
  ].join("\n");
}

function list(main: string): void {
  const slots = slotsOf(main);
  for (const slot of slots) console.log(describe(slot, stateOf(slot)));
  // Any other worktree breaks the rule that work happens only in the slots.
  const others = git(["worktree", "list", "--porcelain"], main)
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length))
    .filter((dir) => !slots.some((s) => samePath(s.dir, dir)));
  for (const dir of others) console.log(`NOT A SLOT: ${dir} is a worktree of this repository`);
}

// The slot's .env.local: slot 1's, with the three values that name its stack replaced (slot 1's turnstile test keys are
// Cloudflare's published test values). The publishable key comes from the slot's running stack and is never printed.
function writeEnvLocal(slot: Slot, main: string): void {
  const source = join(main, ".env.local");
  if (!existsSync(source)) throw new Error(`${source} is missing: slot 1's .env.local is the template for the other slots`);
  const status = execSync("npx supabase status -o env", { cwd: slot.dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const key = /^PUBLISHABLE_KEY="?([^"\n]+)/m.exec(status)?.[1];
  if (!key) throw new Error(`slot ${slot.number}'s stack reported no publishable key (is it running?)`);
  const stack = localStack(slot);
  const replaced = { DATABASE_URL: stack.databaseUrl, SUPABASE_URL: stack.apiUrl, SUPABASE_PUBLISHABLE_KEY: key };
  const lines = readFileSync(source, "utf8").split(/\r?\n/).map((line) => {
    const name = line.split("=")[0] as keyof typeof replaced;
    return name in replaced ? `${name}=${replaced[name]}` : line;
  });
  for (const name of Object.keys(replaced)) {
    if (!lines.some((line) => line.startsWith(`${name}=`))) throw new Error(`${source} has no ${name} line`);
  }
  writeFileSync(join(slot.dir, ".env.local"), lines.join("\n"));
}

function take(main: string, branch: string): void {
  // The branch name is the human's or a session's input: git's own rule for branch names checks it.
  git(["check-ref-format", "--branch", branch], main);
  const slots = slotsOf(main);
  const states = slots.map(stateOf);
  const holding = slots.find((_, i) => states[i].branch === branch);
  if (holding) throw new Error(`${branch} is already in slot ${holding.number} (${holding.dir})`);
  const index = states.findIndex(isFree);
  if (index === -1) {
    const busy = slots.map((s, i) => `slot ${s.number} ${s.dir}: ${states[i].branch ?? "detached"}${states[i].dirty ? ", uncommitted changes" : ""}${states[i].devHolder ? `, port ${s.devPort} in use` : ""}`);
    throw new Error(`REFUSED: all ${slots.length} slots are busy; there is no fourth.\n${busy.join("\n")}`);
  }
  const slot = slots[index];
  git(["fetch", "origin", "--prune"], main);
  if (!states[index].exists) {
    git(["worktree", "add", "--detach", slot.dir, "origin/main"], main);
    run("npm ci", slot.dir);
  }
  const local = spawnSync("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`], { cwd: slot.dir }).status === 0;
  const remote = spawnSync("git", ["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${branch}`], { cwd: slot.dir }).status === 0;
  if (local) git(["switch", branch], slot.dir);
  else if (remote) git(["switch", "--track", `origin/${branch}`], slot.dir);
  else git(["switch", "-c", branch, "origin/main"], slot.dir);
  if (slot.number !== 1) writeFileSync(join(slot.dir, "supabase", ".env"), supabaseEnv(slot));
  if (stackState(slot) !== "running") run("npx supabase start", slot.dir, true);
  // The slot's database, and only it: supabase/.env names this slot's stack (answer 3).
  run("npx supabase db reset", slot.dir);
  if (slot.number !== 1) writeEnvLocal(slot, main);
  console.log(`TAKEN: slot ${slot.number}, ${slot.dir}, on ${branch}; its database is reset to the branch's migrations. npm run dev serves ${localStack(slot).appUrl}.`);
}

function free(main: string, number: number): void {
  const slot = slotsOf(main).find((s) => s.number === number);
  if (!slot) throw new Error(`there is no slot ${number}; the slots are 1 to ${slotsOf(main).length}`);
  const state = stateOf(slot);
  if (!state.exists) throw new Error(`slot ${number} (${slot.dir}) isn't made yet`);
  if (state.dirty) throw new Error(`REFUSED: slot ${number} has uncommitted changes; commit or hand them over first`);
  if (state.devHolder) throw new Error(`REFUSED: slot ${number}'s port ${slot.devPort} is held by process ${state.devHolder.pid}: ${state.devHolder.command}`);
  git(["fetch", "origin", "--prune"], main);
  git(["switch", "--detach", "origin/main"], slot.dir);
  if (stackState(slot) === "running") run("npx supabase stop", slot.dir);
  console.log(`FREED: slot ${number}, ${slot.dir}, detached at origin/main; its stack is stopped.`);
}

function main(): void {
  const [command, arg] = process.argv.slice(2);
  const root = mainCheckout();
  if (command === undefined) return list(root);
  if (command === "take" && arg) return take(root, arg);
  if (command === "free" && arg && /^\d+$/.test(arg)) return free(root, Number(arg));
  console.error("usage: npm run slots [-- take <branch> | -- free <slot number>]");
  process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (err) {
    console.error((err as Error).message);
    process.exitCode = 1;
  }
}
