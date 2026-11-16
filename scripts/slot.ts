// Which slot a folder is, and its ports (docs/milestones/PROCESS-parallel-sessions.md). Slot 1 is the repository's main
// checkout, so CI's checkout is slot 1 and keeps supabase/config.toml's ports; slots 2 and 3 are worktrees beside it
// named plor-2 and plor-3 (answer 1). Any other folder is not a slot, and what needs a port refuses to run there.
import { execFileSync } from "node:child_process";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SLOTS } from "../src/config/tunables.ts";

// The checkout this file is in: its slot is the one in use, whatever the working directory (a test may mock process.cwd).
const CHECKOUT = fileURLToPath(new URL("..", import.meta.url));

export type Slot = { number: number; dir: string; projectId: string; devPort: number; stackBase: number; inspectorPort: number };

// Each stack port's place in its block of ten: supabase/config.toml's slot 1 values less 54320 (shadow_port 54320,
// [api] 54321, [db] 54322, [studio] 54323, [local_smtp] 54324, [analytics] 54327, [db.pooler] 54329).
const OFFSET = { shadow: 0, api: 1, db: 2, studio: 3, mail: 4, analytics: 7, pooler: 9 } as const;

function git(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

// Windows paths compare without case; git prints them with forward slashes.
export function samePath(a: string, b: string): boolean {
  const norm = (p: string) => (process.platform === "win32" ? resolve(p).toLowerCase() : resolve(p));
  return norm(a) === norm(b);
}

export function slotsOf(mainCheckout: string): Slot[] {
  return SLOTS.map((ports, i) => ({
    number: i + 1,
    dir: i === 0 ? resolve(mainCheckout) : resolve(dirname(mainCheckout), `plor-${i + 1}`),
    projectId: i === 0 ? "plor" : `plor-${i + 1}`,
    ...ports,
  }));
}

export function slotFor(topLevel: string, mainCheckout: string): Slot {
  const all = slotsOf(mainCheckout);
  const slot = all.find((s) => samePath(s.dir, topLevel));
  if (!slot) throw new Error(`${topLevel} is not a slot. Work happens in ${all.map((s) => s.dir).join(", ")} (npm run slots; CLAUDE.md, Slots).`);
  return slot;
}

// The main checkout is the parent of the common .git directory, from the main checkout and from any worktree.
export function mainCheckout(cwd = CHECKOUT): string {
  return dirname(resolve(cwd, git(["rev-parse", "--git-common-dir"], cwd)));
}

export function currentSlot(cwd = CHECKOUT): Slot {
  return slotFor(git(["rev-parse", "--show-toplevel"], cwd), mainCheckout(cwd));
}

// The slot's local stack, as the tests reach it. The users and passwords are the local stack's documented defaults.
export function localStack(slot: Slot = currentSlot()) {
  const port = (o: number) => slot.stackBase + o;
  return {
    appUrl: `http://localhost:${slot.devPort}`,
    apiUrl: `http://127.0.0.1:${port(OFFSET.api)}`,
    databaseUrl: `postgresql://postgres:postgres@127.0.0.1:${port(OFFSET.db)}/postgres`,
    adminDatabaseUrl: `postgresql://supabase_admin:postgres@127.0.0.1:${port(OFFSET.db)}/postgres`,
    mailpitUrl: `http://127.0.0.1:${port(OFFSET.mail)}`,
  };
}

// supabase/.env for slots 2 and 3: the CLI reads SUPABASE_-prefixed overrides of config.toml from it (tested 2026-11-16,
// the ticket's answer 3). Slot 1 has none and runs on config.toml as written. Its two auth URLs mirror config.toml's.
export function supabaseEnv(slot: Slot): string {
  const port = (o: number) => slot.stackBase + o;
  return [
    `SUPABASE_PROJECT_ID=${slot.projectId}`,
    `SUPABASE_DB_SHADOW_PORT=${port(OFFSET.shadow)}`,
    `SUPABASE_API_PORT=${port(OFFSET.api)}`,
    `SUPABASE_DB_PORT=${port(OFFSET.db)}`,
    `SUPABASE_STUDIO_PORT=${port(OFFSET.studio)}`,
    `SUPABASE_LOCAL_SMTP_PORT=${port(OFFSET.mail)}`,
    `SUPABASE_ANALYTICS_PORT=${port(OFFSET.analytics)}`,
    `SUPABASE_DB_POOLER_PORT=${port(OFFSET.pooler)}`,
    `SUPABASE_EDGE_RUNTIME_INSPECTOR_PORT=${slot.inspectorPort}`,
    `SUPABASE_AUTH_SITE_URL=http://127.0.0.1:${slot.devPort}`,
    `SUPABASE_AUTH_ADDITIONAL_REDIRECT_URLS=https://127.0.0.1:${slot.devPort}`,
    "",
  ].join("\n");
}

// Whether a server could listen on the port now: the same unnamed-host listen next dev makes.
export function portFree(port: number): Promise<boolean> {
  return new Promise((done, fail) => {
    const server = createServer();
    server.once("error", (err: NodeJS.ErrnoException) => (err.code === "EADDRINUSE" ? done(false) : fail(err)));
    server.listen(port, () => server.close(() => done(true)));
  });
}

// The process listening on the port, or null. `where` names the folder it was started from: on Windows its command line
// (which names node_modules' path), elsewhere its working directory, since next dev retitles its process there.
export type Holder = { pid: number; command: string; where: string };

export function portHolder(port: number): Holder | null {
  if (process.platform === "win32") {
    const script =
      // Filtering every listener, not -LocalPort, which errors when nothing listens there.
      `$c = Get-NetTCPConnection -State Listen | Where-Object LocalPort -eq ${port} | Select-Object -First 1; ` +
      `if ($c) { $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)"; "$($c.OwningProcess)\`t$($p.Name) $($p.CommandLine)" }`;
    const out = execFileSync("powershell.exe", ["-NoProfile", "-Command", script], { encoding: "utf8" }).trim();
    if (!out) return null;
    const [pid, command] = out.split("\t");
    return { pid: Number(pid), command, where: command };
  }
  let pid: string;
  try {
    pid = execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], { encoding: "utf8" }).trim().split("\n")[0];
  } catch (err) {
    // lsof exits 1 when nothing listens; anything else is a real failure.
    if ((err as { status?: number }).status === 1) return null;
    throw err;
  }
  const command = execFileSync("ps", ["-o", "command=", "-p", pid], { encoding: "utf8" }).trim();
  // lsof -Fn prints the working directory as a line starting "n".
  const cwd = execFileSync("lsof", ["-a", "-p", pid, "-d", "cwd", "-Fn"], { encoding: "utf8" }).split("\n").find((l) => l.startsWith("n"));
  if (!cwd) throw new Error(`lsof named no working directory for process ${pid}`);
  return { pid: Number(pid), command, where: cwd.slice(1) + "/" };
}

// Whether the listener on the port was started from the slot's folder.
export function heldBySlot(holder: Holder, slot: Slot): boolean {
  const norm = (p: string) => p.replaceAll("\\", "/").toLowerCase();
  return norm(holder.where).includes(norm(slot.dir) + "/");
}
