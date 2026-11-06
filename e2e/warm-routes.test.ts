// Which addresses the e2e run compiles first (warm-routes.ts). A missed route goes back to racing the compiler, unseen.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { routeFiles, routeUrl } from "./warm-routes";

describe("routeUrl", () => {
  it("drops route groups and the file name, and fills a param", () => {
    expect(routeUrl(join("(shell)", "admin", "test", "[date]", "page.tsx"))).toBe("/admin/test/warm");
  });

  it("reads an API route and the home page", () => {
    expect(routeUrl(join("api", "run", "answer", "route.ts"))).toBe("/api/run/answer");
    expect(routeUrl(join("(shell)", "page.tsx"))).toBe("/");
  });
});

describe("routeFiles", () => {
  it("takes pages and route handlers, in the real tree too", () => {
    const names = readdirSync(join("src", "app"), { recursive: true, encoding: "utf8" });
    expect(routeFiles(["a/page.tsx", "a/route.ts", "a/page.module.css", "a/route.test.ts", "a/mypage.tsx"])).toEqual(["a/page.tsx", "a/route.ts"]);
    expect(routeFiles(names).map(routeUrl)).toContain("/admin/test/warm");
  });
});
