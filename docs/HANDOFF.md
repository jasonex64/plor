# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-24, by the session that reviewed the MVP, built M12 12f and M15 15b, drafted M13 with the human's guided answers, and built M13 13a-1, on the Windows machine.

## Where things stand
- **The MVP (M00–M12) is done.** The order from here is M13, then M14, then M15 (ROADMAP, Focus). plor.app needn't be playable before launch, so no admin and no day are set up there.
- **M13 is in progress** on `m13-answer-lists-and-content`. The ticket is `docs/milestones/M13-answer-lists-and-content.md` ("the answer database"), with every decision, number and source answered by the human, 2026-10-24.
  - **13a-1, the base, is built and reviewed,** in PR #70 (`docs/milestones/M13-13a-the-base.md`). It holds:
    - the tables, guarded functions and pgTAP;
    - `npm run base -- fetch|load|review`;
    - `/admin/base`;
    - credits on the privacy page.

    The human approved its security change (DECISIONS.md Log, 2026-10-24), and PR #70 merges itself by GitHub auto-merge once every required check passes. If it hasn't merged, read its failing check.
  - **13a-2 is next:**
    - format 3, with frozen lists read from the base "as of" approval instead of copied per day (the human asked about database size; the 89.9 MB measurement and this design are in the ticket);
    - the game engine reading the frozen lists from indexed tables (pg_trgm and fuzzystrmatch are available locally);
    - the drafting script, and the T1 test day played end to end;
    - the matching items;
    - the two 13a-2 notes in the ticket's Review: display names after a merge, and a name on one tree line resolving to its highest member.
- **M15 15b (zod) is merged** (PR #69). Dependabot alert #1 was still `open` hours after the merge, though the dependency graph lists zod 4.6.7 (`gh api repos/jasonex64/plor/dependency-graph/sbom`). Why is *unverified*: check it, and if it stays open, dismiss it as fixed with that evidence.
- **Dependabot security updates are on** for the repo. Their PRs merge only with the human's OK.
- **M15 15a** (private drafts) and **M14's suggested split** are drafted (ROADMAP rows); **M16** waits for after launch.

## Waiting on the human
- **The import review's flags** (ROADMAP Next revision, For M13): the fruit tree's protected-origin products, country codes as aliases, and a Wikidata error on two elements. Curate, or accept.
- 15a's P1–P3 and P5, when M15 starts. The four replacement questions (11-06, 11-10, 11-16) go with M15's drafting.
- The leftover `.claude/worktrees/m03-puzzle-insights` folder isn't on the Mac; delete it on the machine that has it.

## Next step
1. Confirm PR #70 merged. The branch stays: M13 continues on it. Merge `main` into it first.
2. Then build 13a-2 on this branch as its own PR, starting from the ticket's criteria.

Ask guided questions first wherever the human's intent is needed (CLAUDE.md, "Ask before designing"). Until the human asks, there are no content days, staging or `db push`.

## Local state
- **The last session ran on the Windows checkout** (`C:/Users/jason/RIFF`), on `m13-answer-lists-and-content`, committing as `jasonex64 <jasonex64@gmail.com>`. `m12-account` and `content-fill-gaps` are merged or closed and deleted. Its local stack runs in Docker Desktop, with every migration up to `20261024095732_answer_base.sql`, and the answer database loaded from the snapshots. `.env.local` points at it. **The snapshots** (about 16 MB in `data/snapshots/`, gitignored) are what `npm run base -- load` reads. A machine without them runs `npm run base -- fetch <set>` first; the committed manifests in `data/manifests/` record what each one was. Load order: wikidata-animals, wikidata-dog-breeds, oewn-animals, the others, then usda-cheese after oewn-cheese. The animal load needs `node --max-old-space-size=4096` (run the script directly, as in the ticket's Evidence). No dev server is left running, and no temporary test files are left.
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
