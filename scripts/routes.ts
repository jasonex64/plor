// Lists every API route: `npm run routes`. One line per method, `<METHOD> <URL path> <file>`, and the tests that must reach every
// route (src/app/api/guest-cookie.test.ts) read the same list, so a new route cannot be left out (docs/milestones/M18-guest-play.md,
// acceptance: a guest cookie sent to each account route).
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

export type ApiRoute = { method: "GET" | "POST"; path: string; file: string };

const API_DIR = join(import.meta.dirname, "..", "src", "app", "api");

// route.ts under src/app/api, each exported GET or POST with its URL path. A route exports its methods as
// `export const GET = handle(...)`, the one way this app writes one (DECISIONS.md, Error handling); another form is not listed,
// so the test that counts the files fails instead of skipping it.
export function listRoutes(dir: string = API_DIR): ApiRoute[] {
  const routes: ApiRoute[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "route.ts") {
        const path = "/api/" + relative(dir, current).split(sep).join("/");
        const source = readFileSync(full, "utf8");
        for (const method of ["GET", "POST"] as const) {
          if (new RegExp(`export const ${method}\\b`).test(source)) routes.push({ method, path: path.replace(/\/$/, ""), file: full });
        }
      }
    }
  };
  walk(dir);
  return routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  for (const route of listRoutes()) console.log(`${route.method} ${route.path} ${relative(process.cwd(), route.file)}`);
}
