import { PageSkeleton } from "../skeleton";

// Shown inside the frame while a page's own part is on its way, and prefetched with the tab bar's links, so a tab
// switch shows it at once (docs/milestones/M14-14b-6-feel-and-polish.md, design 1; Next.js, loading.js: "The Fallback
// UI is prefetched, making navigation immediate unless prefetching hasn't completed"). Once a page renders, each of
// its sections shows its own skeleton until its data lands.
export default function Loading() {
  return <PageSkeleton />;
}
