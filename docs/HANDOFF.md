# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-22, by the session that ran the design review (PR #48, merged) and drafted the M10 ticket on `m10-groups`.

## Where things stand
- **M08, Comments and reactions, and M09, Points and friends leaderboard, are done** (tickets in `docs/milestones/`). Their branches are deleted.
- **The design review is merged** (PR #48): ROADMAP "Design review" has the human's decisions, and "Next revision" holds only what someone will act on (the old list is in git at `c9d2733`).
- **M10, Groups, has a draft ticket** (`docs/milestones/M10-groups.md`) on branch `m10-groups`, pushed, no PR yet. 10a (the weekly friends board, the shared circle query and comment-visibility predicate, `setReaction`'s error handling) waits only on W1; 10b–10d wait on G1–G11 and the numbers.
- **M16, Game 2 (the substring game),** has a draft ticket in PR #42 from `m16-game-2`, docs only, after launch. The name (S1), the word list (S2) and S15–S19 wait on the human. Don't build on it before the MVP is done.

## Waiting on the human
- **M10:** W1 (Sunday's points on the weekly board) before 10a; G1–G11 and the numbers before 10b.
- **M12:** whether usernames can change, and how often (Claude suggested once a month).
- **Before plor.app gets M07 and M08** (`db push`, M15 or when the human wants):
  - turn "Allow public access" off in the hosted project's Realtime settings (M07 D5);
  - check that `[[:alpha:]]` behaves the same there for display names (M07 7a, *unverified*).
- **Before approving the later drafted days,** note:
  - three repeat 2026-10-22's categories: car brand (11-06), state capitals (11-10) and tea (11-16);
  - several had a host swapped under the host-name rule (M06 ticket, Evidence).
- ROADMAP "Next revision", For the human, has the rest.

## Next step
Once the human answers W1: build 10a on `m10-groups` (ticket, Plan 1), open its PR with the ticket, and get the reviewer's pass. Then 10b once G1–G11 are answered.

## Local state
- The local Supabase stack is running, Realtime included, and holds:
  - every migration up to `20261022105344_points_ledger.sql`;
  - `jasonex64` as an admin, who hasn't played 2026-10-22 locally;
  - the approved 2026-10-22 day.
- No dev server is left running.
- `npm run test:e2e` needs that stack running and `.env.local` pointing at it; Playwright starts the dev server. Chromium is installed with `npx playwright install chromium`. Right after `npm run build` the first e2e run can time out on a slow dev compile; a rerun passes.
- The dev server only serves `localhost:3000`; `127.0.0.1:3000` stays on "Loading…" (Next.js blocks other dev origins).
- To run it on another machine:
  1. `npm ci`, then `npx supabase start`, then `npx supabase migration up`, then `npm run dev`.
  2. Sign in with a code from Mailpit at `http://127.0.0.1:54324`.
  3. To make an account an admin, a session inserts its user ID into `private.admin` locally.
