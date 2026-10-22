# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-22, by the session that built M08 8a.

## Where things stand
- **M08, Comments and reactions,** is in progress on branch `m08-comments-and-reactions` (`docs/milestones/M08-comments-and-reactions.md`).
  - **8a, comments** (post, read, delete your own; hidden until your run that day is over; past days browsable read-only), is merged (PR #39, on all-green CI, with the human's OK). The branch stays for 8b–8d.
  - 8b (reactions), 8c (reports and the admin list) and 8d (live updates and e2e) are not started.

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
Build 8b (reactions on comments and on friends' runs, D2 and D3) on the same branch, tests first. Its migration adds the reaction table and its grants, approved under D8; add a DECISIONS.md Log row like 8a's. Reacting on a past day is refused (D6), and so is reacting while your run that day is still going (8a's Source diff).

## Local state
- The local Supabase stack (stopped, data kept), Realtime included, holds:
  - every migration up to `20261022083943_comments.sql`;
  - `jasonex64` as an admin, who hasn't played 2026-10-22 locally;
  - the approved 2026-10-22 day.
- `npm run test:e2e` needs that stack running and `.env.local` pointing at it; Playwright starts the dev server. Chromium is installed with `npx playwright install chromium`. Right after `npm run build` the first e2e run can time out on a slow dev compile (ROADMAP, From M08).
- To run it on another machine:
  1. `npm ci`, then `npx supabase start`, then `npx supabase migration up`, then `npm run dev`.
  2. Sign in with a code from Mailpit at `http://127.0.0.1:54324`.
  3. To make an account an admin, a session inserts its user ID into `private.admin` locally.
