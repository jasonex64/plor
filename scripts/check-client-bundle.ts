// Fails if anything secret, or any server-only value, reached the browser bundle (.next/static, written by
// `npm run build`). Two checks: (1) patterns that only server-side values have, so CI catches a leak without
// knowing any value; (2) the actual values of the server env vars when they are set here (e.g. from
// .env.local), so a value without a telltale pattern is caught too. Prints names, never values (CLAUDE.md:
// Secrets never leave their home). Run with `npm run check:client-bundle`.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = ".next/static";
// Prefixes from supabase.com/docs/guides/api/api-keys (sb_secret_, sb_publishable_), the Postgres URL schemes
// DECISIONS.md accepts, and a PEM header (DATABASE_CA_CERT).
const PATTERNS = ["sb_secret_", "sb_publishable_", "postgresql://", "postgres://", "-----BEGIN"];
const SERVER_ENV = ["DATABASE_URL", "DATABASE_CA_CERT", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"];

if (!existsSync(ROOT)) {
  console.error(`${ROOT} not found: run npm run build first`);
  process.exit(2);
}
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
}

const needles = [
  ...PATTERNS.map((p) => ({ label: `pattern ${p}`, value: p })),
  ...SERVER_ENV.filter((name) => process.env[name]).map((name) => ({ label: `value of ${name}`, value: process.env[name]!.trim() })),
];
const all = files(ROOT);
let leaks = 0;
for (const file of all) {
  const text = readFileSync(file, "latin1");
  for (const needle of needles) {
    if (text.includes(needle.value)) {
      console.error(`LEAK: ${needle.label} in ${file}`);
      leaks++;
    }
  }
}
const checkedValues = needles.length - PATTERNS.length;
console.log(
  leaks === 0
    ? `CLIENT BUNDLE OK: ${all.length} files, ${PATTERNS.length} patterns, ${checkedValues} env values (${SERVER_ENV.filter((n) => process.env[n]).join(", ") || "none set"})`
    : `CLIENT BUNDLE LEAKS: ${leaks}`,
);
process.exitCode = leaks === 0 ? 0 : 1;
