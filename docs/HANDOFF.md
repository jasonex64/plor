# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-22, by the session that closed M06, built M07 and drafted M08.

## Where things stand
- **M07, Friends and live board, is done and merged** (PRs #35–#38); its branch is deleted.
- **M08, Comments and reactions:** the ticket is drafted on branch `m08-comments-and-reactions` (`docs/milestones/M08-comments-and-reactions.md`). No code and no PR yet.

## Waiting on the human
- **M08 D1–D8** in the ticket: comment length, what reactions attach to, the reaction set, delete, reports, which days, rate limit, and the security change for the new tables.
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
Once D1–D8 are answered, record them in the M08 ticket, finish its acceptance criteria, then build 8a (comments) on `m08-comments-and-reactions`.

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
