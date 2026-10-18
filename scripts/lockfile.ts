// The one way to update or check package-lock.json: `npm run lockfile -- update|check`.
// Both run npm inside a Linux container with CI's Node major, because npm on this Windows machine
// (11.6.1) strips Linux-only optional deps (@emnapi/*) that CI's npm (11.19.1) requires, making
// `npm ci` fail in CI (M00). Needs Docker. Exits with npm's own exit code.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Match the Node major in package.json `engines` (DECISIONS.md: Runtime).
const IMAGE = "node:24";
const COMMANDS: Record<string, string> = {
  check: "npm ci --ignore-scripts --no-audit --no-fund",
  update: "npm install --package-lock-only --ignore-scripts --no-audit --no-fund",
};

const mode = process.argv[2] ?? "";
if (!(mode in COMMANDS)) {
  console.error("usage: npm run lockfile -- check|update");
  process.exit(2);
}

const dir = mkdtempSync(join(tmpdir(), "riff-lockfile-"));
try {
  for (const f of ["package.json", "package-lock.json"]) copyFileSync(f, join(dir, f));
  // Work on a copy inside the container; for `update`, write only the lockfile back.
  const script = `mkdir /w && cp /src/package.json /src/package-lock.json /w/ && cd /w && ${COMMANDS[mode]}` +
    (mode === "update" ? " && cp /w/package-lock.json /src/package-lock.json" : "");
  const result = spawnSync("docker", ["run", "--rm", "-v", `${dir}:/src`, IMAGE, "sh", "-c", script], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status === 0 && mode === "update") copyFileSync(join(dir, "package-lock.json"), "package-lock.json");
  console.log(result.status === 0 ? `LOCKFILE ${mode.toUpperCase()} OK (Linux, ${IMAGE})` : `LOCKFILE ${mode.toUpperCase()} FAILED (npm exit ${result.status})`);
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
