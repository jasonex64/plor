# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-22, by the session that built M08 8b, 8c and 8d; then, on branch `m16-game-2`, by the session that drafted M16 and merged `main` into it. That merge brought in PR #43 already merged (`main` at `c98e1d7`), so the M08 lines below that say merging waits are behind: marking M08 done is still to do. For M08, the handoff on `main` or `m08-comments-and-reactions` wins if it is newer.

## Where things stand
- **M16, Game 2 (the substring game),** has a draft ticket (`docs/milestones/M16-game-2-substrings.md`) in draft PR #42 from `m16-game-2`. It is docs only and comes after launch. The human answered S1–S14 on 2026-10-22; the name (S1), the word list (S2) and S15–S19 wait on the human. Don't build on it before the MVP is done.
- **M08, Comments and reactions,** is in review on branch `m08-comments-and-reactions` (`docs/milestones/M08-comments-and-reactions.md`).
  - **8a, comments,** is merged (PR #39), and **8b, reactions,** too (PR #40).
  - **8c, reports** (report a friend's comment, hidden for you at once; admins list reported comments on `/admin/reports` and delete them), is merged (PR #41, on all-green CI). The human allowed that merge without them, that one time (2026-10-22); from 8d on, merging waits for the human's OK again. The reviewer's two blocking findings are fixed; the rest is in ROADMAP "Next revision", From M08.
  - **8d, live updates** (comment and reaction changes nudge the actor's and friends' `board:<id>` topics with no text; the page refetches), is reviewed (no blocking findings) and in PR #43, the milestone's last. Merging waits for the human's OK. After it merges, mark M08 done (ticket Status, ROADMAP row) and delete the branch (CLAUDE.md, Branches and PRs).

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
Once 8d is merged and M08 marked done, start M09 (Points and friends leaderboard; ROADMAP) on a new branch: read its row and DECISIONS.md, Points ledger and `M00-data-design.md` §6, and draft its ticket from `docs/milestones/_TEMPLATE.md` for the human, since it has none yet. ROADMAP "Next revision", From M08, has the deferred items, including one about reaction buttons after a live "started" update.

## Local state
- The local Supabase stack is running, Realtime included, and holds:
  - every migration up to `20261022095828_live_comments.sql`;
  - `jasonex64` as an admin, who hasn't played 2026-10-22 locally (8b's checks didn't use that account);
  - the approved 2026-10-22 day.
- No dev server is left running.
- `npm run test:e2e` needs that stack running and `.env.local` pointing at it; Playwright starts the dev server. Chromium is installed with `npx playwright install chromium`. Right after `npm run build` the first e2e run can time out on a slow dev compile (ROADMAP, From M08).
- The dev server only serves `localhost:3000`; `127.0.0.1:3000` stays on "Loading…" (Next.js blocks other dev origins).
- To run it on another machine:
  1. `npm ci`, then `npx supabase start`, then `npx supabase migration up`, then `npm run dev`.
  2. Sign in with a code from Mailpit at `http://127.0.0.1:54324`.
  3. To make an account an admin, a session inserts its user ID into `private.admin` locally.
