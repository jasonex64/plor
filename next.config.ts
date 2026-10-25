import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // In development, Next.js's indicator sits bottom-left by default, over the phone's tab bar and the sidebar, and
  // takes their clicks (docs/milestones/M14-14a-1-shell.md, Evidence). Top-right is clear of both
  // (next.config.js "devIndicators").
  devIndicators: { position: "top-right" },
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
