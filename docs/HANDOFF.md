# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-23 (Pacific), by the session that reviewed the MVP and built M12 12f, on the Windows machine.

## Where things stand
- **M12 is done again, with 12f, the MVP review fixes** (`docs/milestones/M12-12f-review-fixes.md`). PR #67 merges itself by GitHub auto-merge once every required check passes (human, 2026-10-23: "Yes, merge PR #67 once every CI check is green"), and that deletes `m12-account`. If it hasn't merged, read its failing check. The human asked Claude to review plor.app against the MVP, then said "draft and execute" (2026-10-23). 12f:
  - puts the invite link on the home page's board, without Reset;
  - makes a day with no puzzle show the streak and a countdown, and move on at midnight (protocol 6);
  - asks before Leave group, Remove member and Remove friend;
  - fixes the username copy and lower-casing, labels the feed's box "Comment to your friends", and adds groups to the privacy page.

- **M00 to M11 and M12 12a to 12e are done.** The hosted database has every migration to 12d, and its pgTAP run passed (`Files=17, Tests=269`, human, 2026-10-24).
- **plor.app can't be played yet.** It has no admin and no approved day. No day is drafted for 2026-10-23 to 10-25, and 9 days are parked (ROADMAP, "From the MVP review" and For M13). Until 12f deploys, a signed-in player on a day with no puzzle sees only "There's no puzzle today yet" and the page doesn't move on at midnight.
- **The repo is public.** Its protections are on (DECISIONS.md Log, 2026-10-24). The public puzzle drafts wait on 13a.
- **M13 13a** (puzzle drafts out of the public repo) is a draft ticket in PR #61 from `m13-answer-lists-and-content`, with P1–P5 for the human.
- **M16, Game 2,** has a draft ticket (branch `m16-game-2`), docs only, for after launch.

## Waiting on the human
- **Making plor.app playable:**
  1. make your account an admin: insert its user ID into `private.admin` in the hosted SQL editor;
  2. approve the drafted days on `/admin/puzzles`;
  3. decide what fills the days with no puzzle.
- **13a's P1–P5** (`docs/milestones/M13-13a-private-drafts.md` on `m13-answer-lists-and-content`).
- **New questions for the repeated categories:** 11-06 Q2 and Q3, 11-10 Q4, 11-16 Q4. The human types the new prompts on the admin page; a drafting session follows DECISIONS.md, "Puzzle drafting".
- **The leftover `.claude/worktrees/m03-puzzle-insights` folder** isn't on the Mac; delete it on the machine that has it.
- ROADMAP "Next revision", For the human, has the rest.

## Next step
1. Check that PR #67 merged; on this machine, switch to `main` and pull.
2. The rest is the human's call. In ROADMAP order: M13 (answer lists and content, starting with 13a's P1–P5, PR #61), M14 (look and feel), M15 (launch readiness).

Until the human asks, there are no content days, staging or `db push`.

## Local state
- **The last session ran on the Windows checkout** (`C:/Users/jason/RIFF`), on `m12-account`, committing as `jasonex64 <jasonex64@gmail.com>`. Switch to `main` once PR #67 has merged. Its local stack runs in Docker Desktop, with every migration up to `20261024031547_comment_deletion_record.sql`; `.env.local` points at it. No dev server is left running, and no temporary test files are left.
- The Mac checkout (`/Users/jason/code/plor`) is on `m12-account`; its git uses the macOS keychain for GitHub. Its commit author is set in `.git/config` to the human's GitHub username and email, as on the other machine. **Rule (human, 2026-10-23: "any of my accounts should be able to change it, whether its on here or my deskto"):** on every machine, commit as an email verified on one of the human's GitHub accounts, and that GitHub account must be connected to the Vercel team `sixfour`; otherwise Vercel blocks the deployment ("GitHub couldn't verify an account for commit", PR #60). Commits `4f17304` to `6aa3fa6` carry the Mac's unset default, `jason@jasons-MacBook-Air.local`, and were blocked; `f3736d5` deployed. They stay as they are (human, 2026-10-23: no rewrite).
- The Mac's local Supabase stack was **left running** in Docker Desktop with every migration up to `20261024001501_auth_attempt_give_back.sql` (12d's two aren't applied there yet: `npx supabase migration up`). It has no admin and no approved day yet. `.env.local` holds only the local stack's `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Playwright's Chromium is installed. No dev server is left running.
- On the Mac, Docker's CLI isn't on the shell's PATH: prefix commands with `export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"` (the db tests call `npx supabase status` and need it too). OrbStack is also installed and unused.
- A fresh checkout needs `npx next typegen` (or a build or dev run) before `npx tsc --noEmit -p .`, or `LayoutProps` is missing.
- npm skipped two install scripts not covered by `allowScripts` (`fsevents`, `unrs-resolver`); every suite passed without them.
- `npm run test:e2e` needs the stack running and `.env.local` pointing at it; Playwright starts the dev server. Right after `npm run build` the first e2e run can time out on a slow dev compile; a rerun passes.
- Sign-in on the local dev server is limited like production: without a forwarded IP, `next dev` keys every request by the connection (`::1`), so 5 code emails an hour from this Mac. To clear the counts: `delete from private.auth_attempt;` on the local database.
- The dev server only serves `localhost:3000`; `127.0.0.1:3000` stays on "Loading…" (Next.js blocks other dev origins).
- To run it on another machine:
  1. `npm ci`, then `npx supabase start`, then `npx supabase migration up`, then `npm run dev`.
  2. Sign in with a code from Mailpit at `http://127.0.0.1:54324`.
  3. To make an account an admin, a session inserts its user ID into `private.admin` locally.
