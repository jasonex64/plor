import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The admin puzzle routes read the drafted days from content/offbeat at request time (docs/milestones/
  // M06-puzzle-entry.md), so the files must be in those routes' server traces (next.config.js "output",
  // outputFileTracingIncludes).
  outputFileTracingIncludes: {
    "/api/admin/puzzles": ["./content/offbeat/*.json"],
    "/api/admin/puzzles/approve": ["./content/offbeat/*.json"],
    // The question bank page reads the bank and the drafted days it ran on (M13 13d).
    "/api/admin/bank": ["./content/bank.json", "./content/offbeat/*.json"],
  },
};

export default nextConfig;
