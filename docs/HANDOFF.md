# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-22, by the session that finished M10 and drafted M11, on `m11-home-screen`.

## Where things stand
- **M08, M09 and M10 (Groups) are done** (tickets in `docs/milestones/`; M10's last PR was #52). Their branches are deleted.
  - M10 moved the board's Realtime channel into `useBoardChannel` (`src/app/board-channel.ts`), and `seesCommentSql` in `src/friends/circle.ts` decides who sees a comment, friends thread or group. M11's feed builds on both.
- **M11, Home screen, has a draft ticket** (`docs/milestones/M11-home-screen.md`) in a PR from `m11-home-screen`, docs only. No code until the human answers H1–H6 and the minimum.
- **M16, Game 2 (the substring game),** has a draft ticket in PR #42 from `m16-game-2`, docs only, after launch. The name (S1), the word list (S2) and S15–S19 wait on the human. Don't build on it before the MVP is done.

## Waiting on the human
- **M11: H6 and the minimum for answer shares.** H1–H5, H7 and H8 are answered (H1 changed by the human after a mockup shown in chat, 2026-10-22).
- **A group board counts a member's whole week,** even the days before they joined (ROADMAP "Next revision", For the human).
- **M12:** whether usernames can change, and how often (Claude suggested once a month).
- **Before plor.app gets M07 and later** (`db push`, M15 or when the human wants):
  - turn "Allow public access" off in the hosted project's Realtime settings (M07 D5);
  - check that `[[:alpha:]]` behaves the same there for display names and group names (M07 7a, M10 10b; *unverified*).
- **Before approving the later drafted days,** note:
  - three repeat 2026-10-22's categories: car brand (11-06), state capitals (11-10) and tea (11-16);
  - several had a host swapped under the host-name rule (M06 ticket, Evidence).
- ROADMAP "Next revision", For the human, has the rest.

## Next step
Once the human answers the M11 decisions: write their answers into the ticket (with origins), update the ROADMAP row, merge the draft PR on green CI with the human's OK, then build 11a on `m11-home-screen` (read `node_modules/next/dist/docs/` first, AGENTS.md).

## Local state
- The local Supabase stack is running, Realtime included, and holds:
  - every migration up to `20261023060640_group_thread.sql`;
  - `jasonex64` as an admin, who hasn't played 2026-10-22 locally;
  - the approved 2026-10-22 day.
- No dev server is left running.
- `npm run test:e2e` needs that stack running and `.env.local` pointing at it; Playwright starts the dev server. Chromium is installed with `npx playwright install chromium`. Right after `npm run build` the first e2e run can time out on a slow dev compile; a rerun passes.
- The dev server only serves `localhost:3000`; `127.0.0.1:3000` stays on "Loading…" (Next.js blocks other dev origins).
- To run it on another machine:
  1. `npm ci`, then `npx supabase start`, then `npx supabase migration up`, then `npm run dev`.
  2. Sign in with a code from Mailpit at `http://127.0.0.1:54324`.
  3. To make an account an admin, a session inserts its user ID into `private.admin` locally.
