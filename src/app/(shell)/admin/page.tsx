import { redirect } from "next/navigation";

// Admin opens on Puzzles, the most frequent job (human, 2026-10-26: "Drop it; Admin opens on Puzzles (Recommended)";
// docs/milestones/M14-14b-2b-2-admin-build.md, criterion 1). Insights is at /admin/insights.
export default function AdminPage() {
  redirect("/admin/puzzles");
}
