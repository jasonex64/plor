# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-24, by the session that built M13 13a and 13b with the human's guided answers, on the Windows machine.

## Where things stand
- **M13 is in progress** on `m13-answer-lists-and-content`. Tickets: `docs/milestones/M13-answer-lists-and-content.md`, `M13-13a-the-base.md` and `M13-13b-learning-from-misses.md`.
  - **13a is done** (PRs #70 and #71).
  - **13b, learning from misses, is merged** (PR #72), with the human's approval of its design and its security change. It holds:
    - misses counted per category and decided at 3 players and 1%: accepted, held (LDNOOBW), rejected (the facts) or near-typo;
    - answers fixed at the day's start;
    - `/admin/audit` with undo for every decision that made an answer, and "N to review" on the admin pages;
    - all of WordNet's nouns and Wikidata's places of 100,000+ people for the facts check (the base is 195 MB locally);
    - `npm run base -- load all`.
  - **Next: 13c,** pooled rarity, host answers 1, 1, 1, 1, 2, 2, 3 at random from the host bank, and 3 familiar answers typeable and safe (designed, waiting for approval). Then 13d, the question bank and themes.
- **New Next revision items** (ROADMAP):
  - For M13: readers of the base that skip `removed_at`, counting cost per miss, reused error codes, and smaller gaps from the 13b review;
  - For M15: warn the human as the hosted database nears its plan's limit (the human asked for it).
- **M15 15b (zod) is merged.** Dependabot alert #1 still showed `open` after the merge. Check it, and dismiss it as fixed if it stays.
- **The order stays** M13, then M14, then M15. plor.app needn't be playable before launch.

## Waiting on the human
- **13c's design** (`docs/milestones/M13-13c-rarity-and-the-host.md`): approve it.
- **The import review's flags** (ROADMAP, For M13): fruit products, country codes, an element alias.
- 15a's P1–P3 and P5, when M15 starts.

## Next step
1. 13c, rarity and the host: the guided questions are answered and the design is in its sub-ticket. On the human's approval, build on `m13-answer-lists-and-content` (the branch stays for M13) and open its PR.

Until the human asks, there are no content days, staging or `db push`.

## Local state
- **The last session ran on the Windows checkout** (`C:/Users/jason/RIFF`), on `m13-answer-lists-and-content`, committing as `jasonex64 <jasonex64@gmail.com>`. `m12-account` and `content-fill-gaps` are merged or closed and deleted. Its local stack runs in Docker Desktop, with every migration up to `20261025002908_learning_from_misses.sql`, and the answer database loaded from the snapshots by `npm run base -- load all`, places and WordNet's nouns included (195 MB). `.env.local` points at it. **The snapshots** (`data/snapshots/`, gitignored) are what `npm run base -- load` reads. A machine without them runs `npm run base -- fetch <set>` first; the committed manifests in `data/manifests/` record what each one was. `npm run base -- load all` loads every set in order (13b). The database tests need **today free** for the fixture day: a real day approved for today locally makes them refuse (`src/test/puzzles.ts`). No dev server is left running, and no temporary test files are left.
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
