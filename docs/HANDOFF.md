# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-24, on `m14-look-and-feel`, by the session doing M14's layout while another session builds M13 13b on `m13-answer-lists-and-content` (human: "while the other session works on database and answer generating can we do the layout stuff here"). The M13 lines below are as main had them; for M13's latest, read the handoff on its branch.

## M14 (this branch)
- **14a and 14b are in guided questions and mockup review.** L3–L5, L9, L10 and L16–L43 are answered in `docs/milestones/M14-look-and-feel.md`; WCAG 2.2 is pinned in SOURCES.md.
- **The mockups** are the human's private canvas "Plor shell layout" (https://claude.ai/artifact/9QkZKZZZsEpCJsDVv7VfGZ): fonts, accents, themes, phone rounds 2 and 3, desktop round 4, and desktop round 5 (after an impeccable critique, 23/36, and audit, 14/20, of round 4). The human edits and moves boards there too, so read a board before republishing it.
- **Open from the audit:** The phone boards still need round 5's fixes (avatar slots, one board, the locked-comment look, focus rings).
- **Waiting on the human:** review of desktop round 5, then the sub-ticket split. Claude's proposal: 14a-1 colour slots, fonts and navigation (tab bar and sidebar, a page per tab); 14a-2 Today and the game screen; 14a-3 Friends, Groups, Account and the empty states; 14b-1 themes on the account (a migration and a grant: a security change); 14b-2 the sprout and the admin pages. The human answered "can we do desktop layout first" before choosing.
- **Next step:** after the split is chosen, write the first sub-ticket's file (copy `_TEMPLATE.md`) with its criteria, and record CSS Modules in DECISIONS.md with the first build PR (L33).
- **Wording** in the mockups is provisional (L32).
- **impeccable** (a design-review skill the human installed) is used only when the human asks (human, 2026-10-24: "Ad hoc only"); its files are kept local and ignored through `.git/info/exclude` on the Windows checkout ("Keep local, ignored").
- **Worktree:** this branch is checked out at `C:/Users/jason/RIFF-m14` so the M13 session's checkout at `C:/Users/jason/RIFF` isn't disturbed. Nothing is pushed yet.

## Where things stand
- **M13 is in progress** on `m13-answer-lists-and-content`. Tickets: `docs/milestones/M13-answer-lists-and-content.md` and `docs/milestones/M13-13a-the-base.md`.
  - **13a-1** (the base, imports, admin lookup, credits) is merged (PR #70).
  - **13a-2 is merged** (PR #71), with 13a-3 folded in and its security change approved by the human. It holds:
    - format 3: a day names categories and is resolved as of its approval;
    - the game engine on the base;
    - deterministic thing IDs;
    - `npm run draft` and the T1 day, `content/offbeat/2026-10-24.json`;
    - format 2 and its scripts and drafts retired.

  - **After 13a:**
    - 13b, learning from misses: auto-accept at 1% with 3 players, the facts check, the audit page;
    - 13c, rarity from play, levels, the dodging host, 3 familiar answers;
    - 13d, the question bank and tuning to Gentle, 3%→20%.
- **New Next revision items** (ROADMAP, For M13):
  - "dog" is in the base twice: WordNet's links Wikidata's concept, not the taxon;
  - "China" is missing as an alias;
  - the bonus is near its maximum in huge categories;
  - for the human before M15's push: the hosted format-1 days;
  - from the 13a-2 review: matching edge cases, approval against a moving base, the walks in more places, and smaller test gaps.
- **M15 15b (zod) is merged.** Dependabot alert #1 still showed `open` after the merge. Check it, and dismiss it as fixed if it stays.
- **The order stays** M13, then M14, then M15. plor.app needn't be playable before launch.

## Waiting on the human
- **13b's guided questions** (CLAUDE.md, "Ask before designing").
- **The import review's flags** (ROADMAP, For M13): fruit products, country codes, an element alias.
- 15a's P1–P3 and P5, when M15 starts.

## Next step
1. 13b, learning from misses: finish the guided questions, write its criteria in a sub-ticket, build on `m13-answer-lists-and-content` (the branch stays for M13).

Until the human asks, there are no content days, staging or `db push`.

## Local state
- **The last session ran on the Windows checkout** (`C:/Users/jason/RIFF`), on `m13-answer-lists-and-content`, committing as `jasonex64 <jasonex64@gmail.com>`. `m12-account` and `content-fill-gaps` are merged or closed and deleted. Its local stack runs in Docker Desktop, with every migration up to `20261024213853_answer_engine.sql`, and the answer database loaded from the snapshots (with computed IDs). `.env.local` points at it. **The snapshots** (about 16 MB in `data/snapshots/`, gitignored) are what `npm run base -- load` reads. A machine without them runs `npm run base -- fetch <set>` first; the committed manifests in `data/manifests/` record what each one was. Load order: wikidata-animals, wikidata-dog-breeds, oewn-animals, the others, then usda-cheese after oewn-cheese. The animal load needs `node --max-old-space-size=4096` (run the script directly, as in the ticket's Evidence). The database tests need **today free** for the fixture day: a real day approved for today locally makes them refuse (`src/test/puzzles.ts`). No dev server is left running, and no temporary test files are left.
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
