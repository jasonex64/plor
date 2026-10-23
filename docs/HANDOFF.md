# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-23, by the session that added the Supabase user management source and recorded the human's answers to the open decisions, on `m12-account`.

## Where things stand
- **M08 to M11 are done** (tickets in `docs/milestones/`; M11's last PR was #56). Their branches are deleted.
  - M11 made the home page the Offbeat card (streak, game, yesterday's standings), the feed (`src/comments/feed.ts`), friends today, the friends leaderboard, groups and account. `latestOnly` (`src/lib/latest.ts`) guards overlapping loads, and the page moves to the new day at midnight except a game in play.
- **M12, Account, is in progress** (`docs/milestones/M12-account.md`, branch `m12-account`). A1–A10 and the 30-day username interval are answered (human, 2026-10-23).
  - **12a is merged** (PR #58): `/account` (`src/app/account.tsx`) with the username, all-time points (`allTimePoints` in `src/game/ledger.ts`, `GET /api/account`), display name, friends and invite link, and Sign out.
  - **12b is merged** (PR #59): sign out of this device only; "Use a different email" and spaced codes; a username change once every 30 days (migration `20261023083041_username_change.sql`).
  - **12c** (deleting your account) is ready to start: its source is in SOURCES.md (Supabase user management, commit `07e69b9`), A9 is (a) (sign out on that device, let the access token expire, and test that a deleted player's token can't write) and A10 is (a) (narrow `plor_app`'s profile INSERT to `(user_id, username)` in 12c's migration). No 12c code yet. The docs commits since PR #59 ride in 12c's PR.
- **Three fixes the human decided on 2026-10-23** sit in ROADMAP "Next revision", "Decided by the human": the live board hides a friend's progress until you've finished, a record of which admin deleted which comment, and group weekly boards counting only days after joining. They are M12 12d, after 12c (human, 2026-10-23).
- **M16, Game 2 (the substring game),** has a draft ticket, merged in PR #42 (branch `m16-game-2` still exists), docs only, after launch. The name (S1), the word list (S2) and S15–S19 wait on the human. Don't build on it before the MVP is done.

## Waiting on the human
- **New questions for the repeated categories** (human, 2026-10-23: "new categories"). Each repeats a 2026-10-22 question: 11-06 Q2 (car brand) and Q3 (a dessert you'd bring to a potluck; 10-22 Q2 is a dessert), 11-10 Q4 (a US state capital), 11-16 Q4 (a kind of tea). The human types the new prompts on the admin page; a drafting session then follows DECISIONS.md, "Puzzle drafting", on a `content-<date>` branch.
- **Before plor.app gets M07 and later** (`db push`, M15 or when the human wants): check that `[[:alpha:]]` behaves the same there for display names and group names (M07 7a, M10 10b; *unverified*). "Allow public access" is already off in the hosted Realtime settings (human, 2026-10-23: "done").
- **The leftover `.claude/worktrees/m03-puzzle-insights` folder** isn't on the Mac checkout; delete it on the machine that has it (human OK, 2026-10-23).
- ROADMAP "Next revision", For the human, has the rest.

## Next step
Write 12c's acceptance criteria (A4, A5, A7–A10, and ROADMAP "Next revision", For M12: leave each group first, the comment and reaction indexes) and build it on `m12-account`.

## Local state
- The Mac checkout (`/Users/jason/code/plor`) is on `m12-account`. Its git uses the macOS keychain for GitHub (the human allowed it, 2026-10-23).
- **The Mac is set up** (2026-10-23): `npm ci` done; Docker Desktop is running; the local Supabase stack is **left running** with every migration up to `20261023083041_username_change.sql`; `.env.local` holds only the local stack's `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Evidence on a fresh stack: `npm test` 236 passed, `supabase test db` 220 PASS, `npm run test:db` 180 passed.
  - Docker's CLI isn't on the shell's PATH: prefix commands with `export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"`. OrbStack is also installed and unused.
  - This stack is fresh: no admin and no approved day yet (the earlier machine's held `jasonex64` as an admin and the approved 2026-10-22 day). Playwright's Chromium isn't installed here yet (`npx playwright install chromium`).
  - npm skipped two install scripts not covered by `allowScripts` (`fsevents`, `unrs-resolver`); every suite above passed without them.
- `npm run test:e2e` needs that stack running and `.env.local` pointing at it; Playwright starts the dev server. Chromium is installed with `npx playwright install chromium`. Right after `npm run build` the first e2e run can time out on a slow dev compile; a rerun passes.
- The dev server only serves `localhost:3000`; `127.0.0.1:3000` stays on "Loading…" (Next.js blocks other dev origins).
- To run it on another machine:
  1. `npm ci`, then `npx supabase start`, then `npx supabase migration up`, then `npm run dev`.
  2. Sign in with a code from Mailpit at `http://127.0.0.1:54324`.
  3. To make an account an admin, a session inserts its user ID into `private.admin` locally.
