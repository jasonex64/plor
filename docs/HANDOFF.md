# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-24, by the session that reviewed the MVP, built M12 12f and 15b (the zod advisory, PR #69), and rewrote M13's ticket, on the Windows machine.

## Where things stand
- **The MVP (M00–M12) is done,** with 12f's review fixes merged (PR #67).
- **The order from here is M13, then M14, then M15** (ROADMAP, Focus, human 2026-10-23). plor.app needn't be playable before launch, so:
  - no admin is set up and no day is approved there;
  - PR #68 (copied days to fill empty dates) was closed unmerged.
- **M13's ticket is a draft** (`docs/milestones/M13-answer-lists-and-content.md`), on branch `m13-answer-lists-and-content` in PR #61.
  - It was rewritten 2026-10-24 around "the answer database": things, aliases, facts, categories as recipes, a frozen copy per day, auto-accepted misses with an audit page, pooled rarity, and a question bank. The human's answers to four rounds of guided questions are quoted in it.
  - Every decision, number and source is answered (human, 2026-10-24). The sources are Wikidata, Open English WordNet, Catalogue of Life and USDA FoodData Central, now in SOURCES.md. Nicknames come from the AI and players; traits are AI-filed and audited; sources come in as reviewed snapshots.
  - No code before then.
- **The private-drafts ticket moved to M15** as `docs/milestones/M15-15a-private-drafts.md` (its P4 answered (b)). M15 also takes the beta's days, which days to play and the parked days.
- **M14:** Claude suggested a split for its ticket: 14a structure and UX (navigation tabs, flows), 14b the visual system, 14c the art. It's in the ROADMAP row, not yet a ticket.
- **The repo is public.** Its protections are on (DECISIONS.md Log, 2026-10-24). The drafts in `content/` stay public until 15a.
- **M16, Game 2,** has a draft ticket (branch `m16-game-2`), for after launch.

## Waiting on the human
- **PR #69** (M15 15b, zod) merges itself on green CI. Then confirm Dependabot alert #1 closed, and merge `main` into this branch: #69 changes ROADMAP's M15 row, which this branch changes too.
- **15a's P1–P3 and P5** (when M15 starts).
- **New questions for the repeated categories** (11-06 Q2 and Q3, 11-10 Q4, 11-16 Q4): with M15's drafting now.
- **The leftover `.claude/worktrees/m03-puzzle-insights` folder** isn't on the Mac; delete it on the machine that has it.
- ROADMAP "Next revision", For the human, has the rest.

## Next step
1. Merge `main` into this branch once PR #69 has merged.
2. Write 13a's criteria (ask guided questions first where the human's intent is needed, CLAUDE.md), then build it and build it on this branch, starting with animals (the ticket's Plan).

Until the human asks, there are no content days, staging or `db push`.

## Local state
- **The last session ran on the Windows checkout** (`C:/Users/jason/RIFF`), on `m13-answer-lists-and-content`, committing as `jasonex64 <jasonex64@gmail.com>`. `m12-account` and `content-fill-gaps` are merged or closed and deleted. Its local stack runs in Docker Desktop, with every migration up to `20261024031547_comment_deletion_record.sql`; `.env.local` points at it. No dev server is left running, and no temporary test files are left.
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
