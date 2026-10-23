# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-23, by the session that finished M10 and M11 and built M12 12a and 12b, on `m12-account`.

## Where things stand
- **M08 to M11 are done** (tickets in `docs/milestones/`; M11's last PR was #56). Their branches are deleted.
  - M11 made the home page the Offbeat card (streak, game, yesterday's standings), the feed (`src/comments/feed.ts`), friends today, the friends leaderboard, groups and account. `latestOnly` (`src/lib/latest.ts`) guards overlapping loads, and the page moves to the new day at midnight except a game in play.
- **M12, Account, is in progress** (`docs/milestones/M12-account.md`, branch `m12-account`). The ticket is merged (PR #57); A1–A8 and the 30-day username interval are answered (human, 2026-10-23).
  - **12a is merged** (PR #58): `/account` (`src/app/account.tsx`) with the username, all-time points (`allTimePoints` in `src/game/ledger.ts`, `GET /api/account`), display name, friends and invite link, and Sign out; the home page's Account section is a link and Sign out.
  - **12b is merged** (PR #59): sign out of this device only; "Use a different email" and spaced codes; a username change once every 30 days (migration `20261023083041_username_change.sql`, a security change in DECISIONS.md: plor_app may update `username`, and a trigger with the caller's rights keeps the rule).
  - **12c** (deleting your account) waits on a SOURCES.md entry the human adds.
- **M16, Game 2 (the substring game),** has a draft ticket in PR #42 from `m16-game-2`, docs only, after launch. The name (S1), the word list (S2) and S15–S19 wait on the human. Don't build on it before the MVP is done.

## Waiting on the human
- **M12: add the Supabase Auth "managing users" source** to SOURCES.md before 12c (A7).
- **`plor_app`'s INSERT on `private.profile` covers `username_changed_at`** (ROADMAP "Next revision", For the human).
- **Shares can sometimes be differenced** to learn one friend's answer (ROADMAP "Next revision", For the human).
- **A group board counts a member's whole week,** even the days before they joined (ROADMAP "Next revision", For the human).
- **Before plor.app gets M07 and later** (`db push`, M15 or when the human wants):
  - turn "Allow public access" off in the hosted project's Realtime settings (M07 D5);
  - check that `[[:alpha:]]` behaves the same there for display names and group names (M07 7a, M10 10b; *unverified*).
- **Before approving the later drafted days,** note:
  - three repeat 2026-10-22's categories: car brand (11-06), state capitals (11-10) and tea (11-16);
  - several had a host swapped under the host-name rule (M06 ticket, Evidence).
- ROADMAP "Next revision", For the human, has the rest.

## Next step
Once the human has added the Supabase Auth source: write 12c's acceptance criteria (A4, A5, A7, A8, and ROADMAP "Next revision", For M12: leave each group first, the comment and reaction indexes) and build it on `m12-account`. Without the source, stop and ask (CLAUDE.md).

## Local state
- The local Supabase stack is running, Realtime included, and holds:
  - every migration up to `20261023083041_username_change.sql`;
  - `jasonex64` as an admin, who hasn't played 2026-10-22 locally;
  - the approved 2026-10-22 day.
- No dev server is left running.
- `npm run test:e2e` needs that stack running and `.env.local` pointing at it; Playwright starts the dev server. Chromium is installed with `npx playwright install chromium`. Right after `npm run build` the first e2e run can time out on a slow dev compile; a rerun passes.
- The dev server only serves `localhost:3000`; `127.0.0.1:3000` stays on "Loading…" (Next.js blocks other dev origins).
- To run it on another machine:
  1. `npm ci`, then `npx supabase start`, then `npx supabase migration up`, then `npm run dev`.
  2. Sign in with a code from Mailpit at `http://127.0.0.1:54324`.
  3. To make an account an admin, a session inserts its user ID into `private.admin` locally.
