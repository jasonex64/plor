# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-22, by the session that built M09 9a.

## Where things stand
- **M08, Comments and reactions, is done** (PRs #39, #40, #41 and #43; ticket `docs/milestones/M08-comments-and-reactions.md`). Its branch `m08-comments-and-reactions` is deleted, as CLAUDE.md says once a milestone is merged. The reviewers' deferred items are in ROADMAP "Next revision", From M08.
- **M09, Points and friends leaderboard,** is in progress on branch `m09-points-and-leaderboard` (`docs/milestones/M09-points-and-leaderboard.md`). Every decision (D1–D11) and number (N1–N5) is the human's, 2026-10-22, including the rarity bonus and its Hard-to-reverse ledger change, which DECISIONS.md and `M00-data-design.md` §6 hold.
  - **9a, the ledger and scoring** (`private.points_ledger`; `src/game/scoring.ts`; `settleRuns` in `src/game/ledger.ts`; the estimated bonus on the reveal and result screens), is reviewed and in its PR. Merging waits for the human's OK. The reviewer's two blocking findings are fixed; the rest is in ROADMAP "Next revision", From M09.
  - **9b, the leaderboard,** is next. Until it ships, no request writes ledger rows: `settleRuns` has no caller outside its tests.
- PR #42 (`m16-game-2`, "M16: draft game 2 ticket") is open from another session; this one didn't touch it.

## Waiting on the human
- **M12:** whether usernames can change, and how often (Claude suggested once a month).
- **Before plor.app gets M07 and M08** (`db push`, M15 or when the human wants):
  - turn "Allow public access" off in the hosted project's Realtime settings (M07 D5);
  - check that `[[:alpha:]]` behaves the same there for display names (M07 7a, *unverified*).
- **The live board shows which question caught a friend** before you've finished, through "on question 3" then "finished", though never the answer. It's in the approved design; ROADMAP "Next revision" has it for the human.
- **Before approving the later drafted days,** note:
  - three repeat 2026-10-22's categories: car brand (11-06), state capitals (11-10) and tea (11-16);
  - several had a host swapped under the host-name rule (M06 ticket, Evidence).
- **Superpowers:** the human asked about the plugin. Its install card was shown in chat; whether it was installed is unknown.

## Next step
Once 9a's PR is merged, build 9b on the same branch, tests first: a leaderboard route that settles the players it shows (`settleRuns`) and sums their ledger rows (you and your friends, highest first, ties by name, D4), and a "Friends leaderboard" section on the home page under "Friends today" (D6), with an e2e or browser check. Today's points can't appear before the day closes (D9), so D5 holds without extra code.

## Local state
- The local Supabase stack is running, Realtime included, and holds:
  - every migration up to `20261022105344_points_ledger.sql`;
  - `jasonex64` as an admin, who hasn't played 2026-10-22 locally (8b's checks didn't use that account);
  - the approved 2026-10-22 day.
- No dev server is left running.
- `npm run test:e2e` needs that stack running and `.env.local` pointing at it; Playwright starts the dev server. Chromium is installed with `npx playwright install chromium`. Right after `npm run build` the first e2e run can time out on a slow dev compile (ROADMAP, From M08).
- The dev server only serves `localhost:3000`; `127.0.0.1:3000` stays on "Loading…" (Next.js blocks other dev origins).
- To run it on another machine:
  1. `npm ci`, then `npx supabase start`, then `npx supabase migration up`, then `npm run dev`.
  2. Sign in with a code from Mailpit at `http://127.0.0.1:54324`.
  3. To make an account an admin, a session inserts its user ID into `private.admin` locally.
