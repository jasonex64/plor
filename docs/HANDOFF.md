# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-23, by the session that built M12 12c (deleting your account), on `m12-account`.

## Where things stand
- **M08 to M11 are done** (tickets in `docs/milestones/`; M11's last PR was #56). Their branches are deleted.
- **M12, Account, is in progress** (`docs/milestones/M12-account.md`, branch `m12-account`). A1–A10 are answered (human, 2026-10-23).
  - **12a and 12b are merged** (PRs #58 and #59).
  - **12c is built and in review** (PR #60): `/account`'s Delete account (type your username, then the button), `POST /api/account/delete`, and migration `20261023200556_account_deletion.sql`: `private.delete_account` leaves each group first and then deletes the `auth.users` row (a security change: `plor_app` may execute it); run-key indexes on comments and reactions; `plor_app`'s profile insert narrowed to `(user_id, username)` (A10, a security change). The privacy page says you can delete your account yourself. The reviewer's two blocking findings (this handoff and the ROADMAP row) are fixed; its others are in ROADMAP "Next revision", For M12. It merges on all-green CI with the human's OK.
  - **12d** comes next: the three fixes the human decided on 2026-10-23 (ROADMAP "Next revision", "Decided by the human"). Its criteria and open details are settled with the human when it starts.
- **M16, Game 2 (the substring game),** has a draft ticket, merged in PR #42 (branch `m16-game-2` still exists), docs only, after launch. Don't build on it before the MVP is done.

## Waiting on the human
- **Merge PR #60 (12c)** once CI is green. It carries two security changes (DECISIONS.md Log, 2026-10-23) and one Source diff row to judge: a player who signed in but never picked a username can't delete themselves (they hold only Auth's user row).
- **New questions for the repeated categories** (human, 2026-10-23: "new categories"): 11-06 Q2 (car brand) and Q3 (a dessert you'd bring to a potluck), 11-10 Q4 (a US state capital), 11-16 Q4 (a kind of tea). The human types the new prompts on the admin page; a drafting session then follows DECISIONS.md, "Puzzle drafting", on a `content-<date>` branch.
- **Before plor.app gets M07 and later** (`db push`, M15 or when the human wants): check that `[[:alpha:]]` behaves the same there for display names and group names (M07 7a, M10 10b; *unverified*), and that the hosted `postgres` role may delete from `auth.users` inside `delete_account` (12c; *unverified*: it does locally). "Allow public access" is already off in the hosted Realtime settings (human, 2026-10-23).
- **The leftover `.claude/worktrees/m03-puzzle-insights` folder** isn't on the Mac; delete it on the machine that has it (human OK, 2026-10-23).
- ROADMAP "Next revision", For the human, has the rest.

## Next step
Once PR #60 is merged: start 12d on `m12-account`. Draft its criteria and ask the human the open details first (what the live board shows a friend before you finish; whether a member's join day counts on a group board; what the comment-deletion record stores and who reads it).

## Local state
- The Mac checkout (`/Users/jason/code/plor`) is on `m12-account`; its git uses the macOS keychain for GitHub. Its commit author is set in `.git/config` to `jasonex64 <jasonex64@gmail.com>`, as on the other machine. **Rule (human, 2026-10-23: "any of my accounts should be able to change it, whether its on here or my deskto"):** on every machine, commit as an email verified on one of the human's GitHub accounts, and that GitHub account must be connected to the Vercel team `sixfour`; otherwise Vercel blocks the deployment ("GitHub couldn't verify an account for commit", PR #60). Commits `4f17304` to `6aa3fa6` carry the Mac's unset default, `jason@jasons-MacBook-Air.local`, and were blocked; `f3736d5` deployed.
- The local Supabase stack is **left running** in Docker Desktop with every migration up to `20261023200556_account_deletion.sql`. It has no admin and no approved day yet. `.env.local` holds only the local stack's `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Playwright's Chromium is installed. No dev server is left running.
- Docker's CLI isn't on the shell's PATH: prefix commands with `export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"` (the db tests call `npx supabase status` and need it too). OrbStack is also installed and unused.
- A fresh checkout needs `npx next typegen` (or a build or dev run) before `npx tsc --noEmit -p .`, or `LayoutProps` is missing.
- npm skipped two install scripts not covered by `allowScripts` (`fsevents`, `unrs-resolver`); every suite passed without them.
- `npm run test:e2e` needs the stack running and `.env.local` pointing at it; Playwright starts the dev server. Right after `npm run build` the first e2e run can time out on a slow dev compile; a rerun passes.
- The dev server only serves `localhost:3000`; `127.0.0.1:3000` stays on "Loading…" (Next.js blocks other dev origins).
- To run it on another machine:
  1. `npm ci`, then `npx supabase start`, then `npx supabase migration up`, then `npm run dev`.
  2. Sign in with a code from Mailpit at `http://127.0.0.1:54324`.
  3. To make an account an admin, a session inserts its user ID into `private.admin` locally.
