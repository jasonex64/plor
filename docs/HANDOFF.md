# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-24, by the session that merged 12e and built 12d (the decided fixes), on `m12-account`, on the Windows machine.

## Where things stand
- **M08 to M11 are done** (tickets in `docs/milestones/`; M11's last PR was #56). Their branches are deleted.
- **M12, Account, is in progress** (`docs/milestones/M12-account.md`, branch `m12-account`). A1–A10 are answered (human, 2026-10-23).
  - **12a and 12b are merged** (PRs #58 and #59).
  - **12c is merged** (PR #60, merged by the human 2026-10-24 while its `db` and `e2e` checks were still running; the same code passed both on the earlier commit).
  - **12e, sign-in code limits, is merged** (PR #62, on green CI with the human's approval, 2026-10-24). **L5** is accepted for the closed beta, with a CAPTCHA decided before launch (DECISIONS.md Log, ROADMAP For M15).
  - **12d, the decided fixes, is built and in review** (`docs/milestones/M12-12d-decided-fixes.md`; D1–D3 answered by the human, 2026-10-24): the live board shows only "started" until you've finished (protocol 5, `friend_status` v 2), a record of each admin's comment deletion (`private.comment_deletion` and `private.delete_reported_comment`, a security change) listed on `/admin/reports`, and group boards counting a member from the day they joined. Migrations `20261024031116_board_hides_progress.sql` and `20261024031547_comment_deletion_record.sql`. In review as PR #63; the reviewer's two blocking findings are fixed.
  - With 12d merged, M12 is done: its last steps are the M12 ticket's Status and the ROADMAP row.
- **The repo is public** (human, 2026-10-23: "i intend to make it PUBLIC"). Its full history has no secrets (gitleaks, DECISIONS.md Log), and CI is safe for strangers' PRs. The settings it calls for and the public puzzle drafts wait on the human (ROADMAP "Next revision", For the human).
- **M16, Game 2 (the substring game),** has a draft ticket, merged in PR #42 (branch `m16-game-2` still exists), docs only, after launch. Don't build on it before the MVP is done.

## Waiting on the human
- **12d:** review and merge PR #63 (a security change: a new table and a function `plor_app` may execute; DECISIONS.md Log, 2026-10-24), and check the privacy page's new "Deleted comments" line (12d Source diff).
- **12e:** in Supabase's dashboard, Authentication → Rate Limits: sign-ups and sign-ins 300, token verifications 300, token refreshes 1,500 per 5 minutes (N5, N6).
- **13a's** (P1–P5: `docs/milestones/M13-13a-private-drafts.md` on `m13-answer-lists-and-content`; drafting new days pauses until it ships, if P5 is (a)).
- **The public repo:** turn on the GitHub and Vercel settings listed in ROADMAP "Next revision", For the human, and decide about the public puzzle drafts.
- **OK four SOURCES.md rows** Claude drafted from the pages (2026-10-23, in the session, not yet in the repo): npm scripts (npm 11.19.1's bundled docs), Supabase database testing (`/guides/database/testing` and `/local-development/testing/overview` at `07e69b9`), Next.js error handling (bundled 16.4.2 `/app/getting-started/error-handling`, which covers UI error boundaries only, not the route-handler wrapper), and GitHub secret scanning availability (docs.github.com, accessed 2026-10-23). If the drafts are lost, re-read those pages; then point DECISIONS.md's Task runner, Test runner, Error handling and Secret scanning Source cells at them (ROADMAP "Next revision", For the human).
- **New questions for the repeated categories** (human, 2026-10-23: "new categories"; Claude suggested replacements in the session, for the human to pick): 11-06 Q2 (car brand) and Q3 (a dessert you'd bring to a potluck), 11-10 Q4 (a US state capital), 11-16 Q4 (a kind of tea). The human types the new prompts on the admin page; a drafting session then follows DECISIONS.md, "Puzzle drafting", on a `content-<date>` branch.
- **Before plor.app gets M07 and later** (`db push`, M15 or when the human wants): check that `[[:alpha:]]` behaves the same there for display names and group names (M07 7a, M10 10b; *unverified*), and that the hosted `postgres` role may delete from `auth.users` inside `delete_account` (12c; *unverified*: it does locally). "Allow public access" is already off in the hosted Realtime settings (human, 2026-10-23).
- **The leftover `.claude/worktrees/m03-puzzle-insights` folder** isn't on the Mac; delete it on the machine that has it (human OK, 2026-10-23).
- ROADMAP "Next revision", For the human, has the rest.

## Next step
Once 12d's PR is merged: mark M12 done (its ticket's Status, the ROADMAP row, delete `m12-account`). M12 is the last milestone before the MVP line; what comes after is the human's call (M13 waits on 13a's P1–P5). Repo auto-merge is on (human, 2026-10-24), so a PR can be set to merge itself when its checks pass.

## Local state
- **This session ran on the Windows checkout** (`C:/Users/jason/RIFF`), on `m12-account`, committing as `jasonex64 <jasonex64@gmail.com>`. Its local stack runs in Docker Desktop (started by this session) with every migration up to `20261024031547_comment_deletion_record.sql`; `.env.local` points at it. No dev server is left running.
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
