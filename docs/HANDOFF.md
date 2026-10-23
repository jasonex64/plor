# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-22, by the session that built M10 10c on `m10-groups`.

## Where things stand
- **M08, Comments and reactions, and M09, Points and friends leaderboard, are done** (tickets in `docs/milestones/`). Their branches are deleted.
- **M10, Groups, is in progress** (`docs/milestones/M10-groups.md`, branch `m10-groups`).
  - **10a is merged** (PR #49): the weekly friends board.
  - **G1–G11 and the numbers are answered** (human, 2026-10-22: Claude's suggestions; 50 members, 10 groups, the display name rule).
  - **10b is merged** (PR #50): groups with invite links, the creator's powers and handover, the Groups section, `/groups/<id>` and `/groups/join/<code>`. It's a security change, recorded in DECISIONS.md.
  - **10c is in review** (PR #51): each group's weekly board on `/groups/<id>`, from `GET /api/groups/leaderboard?id=`, the same code as the friends board (`weeklyBoard` in `src/friends/leaderboard.ts`). The reviewer found nothing blocking in the code. It merges on all-green CI with the human's OK.
- **M16, Game 2 (the substring game),** has a draft ticket in PR #42 from `m16-game-2`, docs only, after launch. The name (S1), the word list (S2) and S15–S19 wait on the human. Don't build on it before the MVP is done.

## Waiting on the human
- **Merge PR #51 (10c)** once CI is green.
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
Once 10c is merged: write 10d's acceptance criteria in the ticket (the group thread: one per group per day, M08's rules, live nudges; G4, G5, and G9's `group_id` on `private.comment`) and build it on `m10-groups`. `seesAuthorSql` in `src/friends/circle.ts` and the live comments migration (`20261022095828_live_comments.sql`) are where it starts.

## Local state
- The local Supabase stack is running, Realtime included, and holds:
  - every migration up to `20261023050925_groups.sql`. Its comments were corrected after it was applied locally; the SQL is unchanged, so no reset is needed;
  - `jasonex64` as an admin, who hasn't played 2026-10-22 locally;
  - the approved 2026-10-22 day.
- No dev server is left running.
- `npm run test:e2e` needs that stack running and `.env.local` pointing at it; Playwright starts the dev server. Chromium is installed with `npx playwright install chromium`. Right after `npm run build` the first e2e run can time out on a slow dev compile; a rerun passes.
- The dev server only serves `localhost:3000`; `127.0.0.1:3000` stays on "Loading…" (Next.js blocks other dev origins).
- To run it on another machine:
  1. `npm ci`, then `npx supabase start`, then `npx supabase migration up`, then `npm run dev`.
  2. Sign in with a code from Mailpit at `http://127.0.0.1:54324`.
  3. To make an account an admin, a session inserts its user ID into `private.admin` locally.
