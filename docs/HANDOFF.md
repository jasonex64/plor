# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-25, on `m14-look-and-feel` (merged with main after M13 13c), by the session doing M14's layout while another session builds M13 on `m13-answer-lists-and-content`. The M13 lines below are as main had them; for M13's latest, read the handoff on its branch.

## M14 (this branch)
- **14a-1, the shell, is in review** (`docs/milestones/M14-14a-1-shell.md`): the colour slots, Baloo 2 and DM Sans, the tab bar and the sidebar from 768px, Today, Friends, Groups and Me pages, the Admin link (it replaces M15 15c, L49). The reviewer's blocking findings are fixed; its other findings are in ROADMAP, For M14. PR #77; waiting on green CI and the human.
- **Local e2e** passed 20 of 21. The one failure, approving a drafted day, is because the shared local database already holds M13 13d's migration, which drops a table this branch's admin page reads. After 13d merges, merge main into this branch.
- **Waiting on the human:** the PR, and an OK to put L18's clock (the bar back to a question left in play) in 14a-2.
- **Next step:** after 14a-1 merges, write 14a-2's file (Today and the game screen) from the split in the 14a-1 ticket.
- **Sharing the local stack:** the M13 session and this one take turns on port 3000 and the database, and message each other before e2e runs, db tests or a `db reset` (db tests and e2e collide).
- **Decisions** L3–L5, L9, L10 and L16–L49 are in `docs/milestones/M14-look-and-feel.md`. L48 (credits and an AI disclosure) is proposed for 14b-1.
- **The mockups** are the human's private canvas "Plor shell layout" (https://claude.ai/artifact/9QkZKZZZsEpCJsDVv7VfGZ), rounds 1 to 7. The human edits and moves boards there too, so read a board before republishing it. Their wording is provisional (L32).
- **impeccable** (a design-review skill the human installed) is used only when the human asks ("Ad hoc only"); its files are kept local and ignored through `.git/info/exclude` on the Windows checkout.
- **Worktree:** this branch is checked out at `C:/Users/jason/RIFF-m14` (its own `node_modules` and a copy of the local-stack `.env.local`), so the M13 session's checkout at `C:/Users/jason/RIFF` isn't disturbed.

## M15 (from main, written by the M15 and M13 sessions)
- **15a's P1–P5 are answered** (human, 2026-10-24, guided questions): drafts in the database, admin-only; P2 moot; the T1 day deleted with 15a; drafting paused until 15a ships. Its design and criteria are rewritten for format 3 before it's built. No new milestone starts while M13 and M14 are in progress (human: "Nothing new yet").
- **15c is closed, not built:** M14 14a-1 adds the Admin link (sidebar, and the Me tab on phones) with an `admin` flag on `GET /api/profile` (human, 2026-10-24; M14 ticket L49). Until 14a-1 lands, an admin types `plor.app/admin`.
- **Storage** (DECISIONS.md Log): Free plan for now, the answer database grows freely, the human warned near 500 MB. Supabase's pricing page (read 2026-10-24) waits on the human's OK to go into SOURCES.md.
- **plor.app admin is set up** (human, 2026-10-24): the hosted format-1 days are gone (no puzzles left there), M13's 3 migrations are pushed (the admin pages, which read the answer tables, load), and the human is in `private.admin`. The hosted answer database is empty by choice, so the puzzles page lists the T1 day's host answers as raw IDs; it stays unapproved there (its answers are public and its categories aren't loaded). `npx.cmd supabase test db --linked` passed after this push (human, 2026-10-24: "yes it passed"). **13c's migration `20261025042950_rarity_and_the_host.sql` reached `main` right after, and 13d's `20261025053147_question_bank.sql` (dropping `private.save_questions` and `private.puzzle_questions`) follows on PR #75's merge,** so the hosted database is behind again: every migration merged to `main` deploys its code at once on Vercel, while the database waits for the human's `db push`. Run hosted commands from `RIFF-m15` (or any clean checkout of `main`), never a checkout with another session's uncommitted migrations.

## Where things stand
- **M13 is in progress** on `m13-answer-lists-and-content`. Tickets: `docs/milestones/M13-answer-lists-and-content.md`, `M13-13a-the-base.md` and `M13-13b-learning-from-misses.md`.
  - **13a is done** (PRs #70 and #71).
  - **13b, learning from misses, is merged** (PR #72), with the human's approval of its design and its security change. It holds:
    - misses counted per category and decided at 3 players and 1%: accepted, held (LDNOOBW), rejected (the facts) or near-typo;
    - answers fixed at the day's start;
    - `/admin/audit` with undo for every decision that made an answer, and "N to review" on the admin pages;
    - all of WordNet's nouns and Wikidata's places of 100,000+ people for the facts check (the base is 195 MB locally);
    - `npm run base -- load all`.
  - **13c, rarity and the host, is merged** (PR #73) (`docs/milestones/M13-13c-rarity-and-the-host.md`): the bonus's first guess 40/40/20 blended with counts pooled per category (provisional on past days only); host answers 1, 1, 1, 1, 2, 2, 3 drawn at random from the bank; 3 familiar answers typeable and safe in the draft and at approval; the soft guide in the draft's summary. T1 is redrafted (letters U, P, T, E).
  - **13d, the question bank, is merged** (PR #75) (`docs/milestones/M13-13d-the-question-bank.md`): `content/bank.json`, `npm run draft -- <date>` picking 7 by the 30-day category gap, the date's theme and easiest first, `--questions` for a hand-picked day, the gap in `content:validate`, `/admin/bank`; the admin questions box and `private.save_questions` are gone. The first bank is T1's 7 questions, so no new day can be drafted until 30 days after T1.
  - **Next: 13e,** growing the categories to the 210+ a 30-day gap per category needs for daily days.
- **New Next revision items** (ROADMAP), including from 13c's review: the rare tier counting members at approval, and smaller gaps.
  - For M13: readers of the base that skip `removed_at`, counting cost per miss, reused error codes, and smaller gaps from the 13b review;
  - For M15: warn the human as the hosted database nears its plan's limit (the human asked for it).
- **M15 15b (zod) is merged.** Dependabot alert #1 still showed `open` after the merge. Check it, and dismiss it as fixed if it stays.
- **The order stays** M13, then M14, then M15. plor.app needn't be playable before launch.

## Waiting on the human
- **13e's guided questions** (CLAUDE.md, "Ask before designing").
- **For the human, from 13d's review** (ROADMAP, For M13): should themed questions be held back on other dates?
- **The import review's flags** (ROADMAP, For M13): fruit products, country codes, an element alias.

## Next step
1. 13e, growing the categories: finish the guided questions, write its sub-ticket, build on `m13-answer-lists-and-content` (the branch stays for M13).

**Shared local database:** another session (M14 layout work, worktree `C:/Users/jason/RIFF-m14`) runs its e2e suite against the same local stack. Message it before a `db reset` or a full suite run.

Until the human asks, there are no content days, staging or `db push`.

## Local state
- **The last session ran on the Windows checkout** (`C:/Users/jason/RIFF`), on `m13-answer-lists-and-content`, committing as `jasonex64 <jasonex64@gmail.com>`. `m12-account` and `content-fill-gaps` are merged or closed and deleted. Its local stack runs in Docker Desktop, with every migration up to `20261025053147_question_bank.sql`, and the answer database loaded from the snapshots by `npm run base -- load all`, places and WordNet's nouns included (195 MB). `.env.local` points at it. **The snapshots** (`data/snapshots/`, gitignored) are what `npm run base -- load` reads. A machine without them runs `npm run base -- fetch <set>` first; the committed manifests in `data/manifests/` record what each one was. `npm run base -- load all` loads every set in order (13b). The database tests need **today free** for the fixture day: a real day approved for today locally makes them refuse (`src/test/puzzles.ts`). No dev server is left running, and no temporary test files are left.
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
