# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-22, by the session that closed M06 and built M07.

## Where things stand
- **M07, Friends and live board, is done:**
  - 7a display name (PR #35), 7b invite links and friends (#36) and 7c live board (#37) are merged;
  - 7d, where everyone ended, is the last PR, and it merges on green CI.
  - Once it's merged, delete the branch `m07-friends-and-live-board` (CLAUDE.md, Branches and PRs).
- **Next milestone: M08, Comments and reactions** (ROADMAP). It has no ticket yet.

## Waiting on the human
- **M12:** whether usernames can change, and how often (Claude suggested once a month).
- **Before plor.app gets M07** (`db push`, M15 or when the human wants):
  - turn "Allow public access" off in the hosted project's Realtime settings (M07 D5);
  - check that `[[:alpha:]]` behaves the same there for display names (M07 7a, *unverified*).
- **The live board shows which question caught a friend** before you've finished, through "on question 3" then "finished", though never the answer. It's in the approved design; ROADMAP "Next revision" has it for the human.
- **Before approving the later drafted days,** note:
  - three repeat 2026-10-22's categories: car brand (11-06), state capitals (11-10) and tea (11-16);
  - several had a host swapped under the host-name rule (M06 ticket, Evidence).
- **Superpowers:** the human asked about the plugin. Its install card was shown in chat; whether it was installed is unknown.

## Next step
Draft the M08 ticket (comments and reactions: friends only, visible after you've played, delete your own, report others) for the human's approval, on a new `m08-…` branch.

## Local state
- The local Supabase stack (stopped, data kept), Realtime included, holds:
  - every migration up to `20261022073610_live_board.sql`;
  - `jasonex64` as an admin;
  - the approved 2026-10-22 day.
- `npm run test:e2e` needs that stack running and `.env.local` pointing at it; Playwright starts the dev server. Chromium is installed with `npx playwright install chromium`.
- To run it on another machine:
  1. `npm ci`, then `npx supabase start`, then `npx supabase migration up`, then `npm run dev`.
  2. Sign in with a code from Mailpit at `http://127.0.0.1:54324`.
  3. To make an account an admin, a session inserts its user ID into `private.admin` locally.
