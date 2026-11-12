import type { RunFamily } from "./run-routes";

// Whose run a result is: a signed-in player's, a guest's, or an admin's test run, which saves nothing
// (docs/milestones/M14-14b-11-test-runs.md, answer 6).
export type RunKind = RunFamily | "test";

// What sits with a finished run's result. A guest gets Share and the peek at what an account adds, and no answer
// searches, which need an account (docs/milestones/M18-guest-play.md, Design, "What a guest can reach"; answer 2); a
// signed-in player never sees the peek.
export function resultExtras(kind: RunKind) {
  return { share: kind !== "test", search: kind === "account", peek: kind === "guest" };
}
