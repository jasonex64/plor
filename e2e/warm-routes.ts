// `next dev` compiles a route the first time it's asked for, so a test that was first to reach a route could spend its
// 5-second expect on the compiler: test-run.e2e.ts failed that way on PR #155 (docs/milestones/M16-16a-the-dictionary.md,
// "CI failures on PR #155"). Every route is asked for once before the tests, signed out. What it answers doesn't matter,
// only that it has compiled, so a 401 or a 404 is fine, and no test's limit had to grow.
import { readdirSync } from "node:fs";
import { join } from "node:path";

const APP_DIR = join("src", "app");
const BASE_URL = "http://localhost:3000";

// The address of a route file under src/app: route groups aren't in the address, and any value fills a [param].
export function routeUrl(file: string): string {
  const segments = file.split(/[\\/]/).slice(0, -1);
  const shown = segments.filter((s) => !s.startsWith("(")).map((s) => (s.startsWith("[") ? "warm" : s));
  return `/${shown.join("/")}`;
}

export function routeFiles(names: string[]): string[] {
  return names.filter((name) => /(^|[\\/])(page\.tsx|route\.ts)$/.test(name));
}

export default async function warmRoutes(): Promise<void> {
  const files = routeFiles(readdirSync(APP_DIR, { recursive: true, encoding: "utf8" }));
  const times: { url: string; ms: number; status: number }[] = [];
  for (const url of files.map(routeUrl)) {
    const start = Date.now();
    const response = await fetch(new URL(url, BASE_URL), { redirect: "manual" });
    times.push({ url, ms: Date.now() - start, status: response.status });
  }
  times.sort((a, b) => b.ms - a.ms);
  console.log(`warmed ${times.length} routes; the slowest: ${times.slice(0, 8).map((t) => `${t.url} ${t.ms} ms (${t.status})`).join(", ")}`);
}
