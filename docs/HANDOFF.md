# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-24, by the session that reviewed the MVP, built M12 12f, drafted M13's ticket and fixed the zod advisory (M15 15b), on the Windows machine.

## Where things stand
- **M15 15b, the zod security advisory, is done**:
  - PR #69 from `m15-launch-readiness`; ticket `docs/milestones/M15-15b-zod-advisory.md`;
  - an npm override forces zod to `^4.6.6` (4.6.7 installed), because `@vercel/cli-config` pins 4.1.11.

  PR #69 merges itself by GitHub auto-merge once every required check passes (human, 2026-10-24: "Yes, merge PR #69 once every CI check is green"). If it hasn't merged, read its failing check. After the merge, check that Dependabot alert #1 closed: `gh api repos/jasonex64/plor/dependabot/alerts/1 --jq .state`.
- **Dependabot security updates are now on for the repo** (a repo setting, outside any diff; DECISIONS.md Log, 2026-10-24). Its PRs may arrive at any time. They run CI and merge only with the human's OK. They're the one exception to the lockfile rule.
- **M13's draft ticket and the new CLAUDE.md rule "Ask before designing"** are on `m13-answer-lists-and-content` in PR #61, not yet on `main`.
  - The human answered four rounds of guided questions on the answer database (2026-10-24). Claude proposed a design: things, aliases, facts and categories, frozen into each day at approval; misses auto-accepted by a share of players unless the facts contradict them; rarity pooled per category, with recent days weighted.
  - The human hasn't yet said whether to rewrite the M13 ticket around it. That's the next M13 step, and PR #61's handoff describes the rest.
- **The MVP (M00–M12) is done.** The order from here is M13, then M14, then M15 (ROADMAP, Focus on the M13 branch). plor.app needn't be playable before launch.

## Waiting on the human
- **M13:** go-ahead to rewrite its ticket around the database design, then its open numbers and sources:
  - the auto-accept share and minimum;
  - the recency weighting;
  - "about a month" as 30 days;
  - Wikidata and WordNet for SOURCES.md.
- The rest is in PR #61's handoff and ROADMAP "Next revision", For the human.

## Next step
1. Confirm PR #69 merged and alert #1 closed; delete `m15-launch-readiness` if auto-merge didn't (M15 continues later on a fresh branch from `main`).
2. Back to M13 on `m13-answer-lists-and-content`. Merge `main` into it first, since #69 touches ROADMAP's M15 row, which PR #61 also changes.

## Local state
- **The last session ran on the Windows checkout** (`C:/Users/jason/RIFF`), on `m15-launch-readiness`, committing as `jasonex64 <jasonex64@gmail.com>`. `m12-account` and `content-fill-gaps` are merged or closed and deleted. Its local stack runs in Docker Desktop, with every migration up to `20261024031547_comment_deletion_record.sql`; `.env.local` points at it. No dev server is left running, and no temporary test files are left.
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
