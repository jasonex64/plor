# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-24, by the session that merged M12's last sub-tickets (12e and 12d) and added four sources, on the Windows machine.

## Where things stand
- **M08 to M12 are done**, so the MVP (M00–M12) is built. Tickets are in `docs/milestones/`. M12's sub-tickets went in PRs #58, #59, #60, #62 and #63, the last two merged on green CI with the human's approval, 2026-10-24.
  - Key 12e and 12d facts not in the code: L5 (code emails can still be used up from a few IPs) is accepted for the closed beta only, with a CAPTCHA to decide before launch (ROADMAP For M15). The board's `friend_status` payload is `v` 2 and the protocol 5.
  - `m12-account` is merged (PR #64) and deleted.
- **plor.app sign-in is broken** (found 2026-10-24): `POST /api/auth/email/verify` answers `500 internal`, from production at protocol 5 (`/api/health`). Since 12e (PR #62) the sign-in routes call `private.take_auth_attempt` before Auth, and the hosted database doesn't have that migration. It most likely has nothing from M07 on (the handoff and DECISIONS.md, Database migrations: `db push` is the human's, held until asked), so the board, feed, groups and account pages would fail for signed-in players too (*unverified*: the hosted migration list wasn't read; it needs the database password).
- **The repo is public** (human, 2026-10-23: "i intend to make it PUBLIC"). Its full history has no secrets (gitleaks, DECISIONS.md Log), and CI is safe for strangers' PRs. The settings it calls for and the public puzzle drafts wait on the human (ROADMAP "Next revision", For the human).
- **M13 13a** (puzzle drafts out of the public repo) is a draft ticket in PR #61 from `m13-answer-lists-and-content`, with P1–P5 for the human.
- **M16, Game 2 (the substring game),** has a draft ticket, merged in PR #42 (branch `m16-game-2` still exists), docs only, after launch.

## Waiting on the human
- **Fix plor.app:** `npx.cmd supabase migration list --linked` (on Windows PowerShell, `npx.cmd`: the execution policy blocks `npx.ps1`) to see what the hosted database has, the checks below ("Before plor.app gets M07 and later" and ROADMAP For M15's pending-migrations item), then `npx supabase db push` and `npx supabase test db --linked`. Each prompts for the database password, which stays with the human.
- **13a's** (P1–P5: `docs/milestones/M13-13a-private-drafts.md` on `m13-answer-lists-and-content`; drafting new days pauses until it ships, if P5 is (a)).
- **The public repo:** turn on the GitHub and Vercel settings listed in ROADMAP "Next revision", For the human, and decide about the public puzzle drafts.
- **New questions for the repeated categories** (human, 2026-10-23: "new categories"; Claude suggested replacements in the session, for the human to pick): 11-06 Q2 (car brand) and Q3 (a dessert you'd bring to a potluck), 11-10 Q4 (a US state capital), 11-16 Q4 (a kind of tea). The human types the new prompts on the admin page; a drafting session then follows DECISIONS.md, "Puzzle drafting", on a `content-<date>` branch.
- **Before plor.app gets M07 and later** (`db push`, M15 or when the human wants): check that `[[:alpha:]]` behaves the same there for display names and group names (M07 7a, M10 10b; *unverified*), and that the hosted `postgres` role may delete from `auth.users` inside `delete_account` (12c; *unverified*: it does locally). "Allow public access" is already off in the hosted Realtime settings (human, 2026-10-23).
- **The leftover `.claude/worktrees/m03-puzzle-insights` folder** isn't on the Mac; delete it on the machine that has it (human OK, 2026-10-23).
- ROADMAP "Next revision", For the human, has the rest.

## Next step
The MVP line is reached; what comes next is the human's call. Until the human asks, there are no content days, staging or `db push` (the human: build the app first). The candidates in ROADMAP order: M13 (answer lists and content), which starts with 13a's P1–P5 (PR #61); M14 (look and feel); M15 (launch readiness, which takes the pending migrations to the hosted database). Repo auto-merge is on (human, 2026-10-24), so a PR can be set to merge itself when its checks pass.

## Local state
- **This session ran on the Windows checkout** (`C:/Users/jason/RIFF`), on `m12-account` (switch to `main` once the branch is deleted), committing as `jasonex64 <jasonex64@gmail.com>`. Its local stack runs in Docker Desktop (started by this session) with every migration up to `20261024031547_comment_deletion_record.sql`; `.env.local` points at it. No dev server is left running.
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
