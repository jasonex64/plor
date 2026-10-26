# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-25, on `m13-answer-lists-and-content` by the M13 session on the Mac (`/Users/jason/code/plor`), mid-13e-3, waiting for the Windows PC. The M14 section is the M14 session's (on the Mac, worktree `.claude/worktrees/m14-settings-900486`), from main with 14a-3b's PR; for M14's latest, read the handoff on `m14-look-and-feel`.

## M14 (this branch, written by the M14 session)
### Done
| Sub-ticket | What | PR |
|---|---|---|
| 14a-1 | The shell: colour slots, fonts, the tab bar, the sidebar from 768px, the Admin link | #77 |
| 14a-2a | Today: Offbeat's banner, one leaderboard card, the locked feed, the clock bar | #79 |
| 14a-2b | The game screen `/offbeat`. **Security change:** yesterday's host answers to every signed-in player | #81 |
| 14a-2c | 14a-2b's review fixes | #82 |
| 14a-3a | Me: totals, this month's calendar, Offbeat's card, the 3 rarest answers; avatar slots; Friends' empty state | #83 |

### In review
**14a-3b**, settings (`docs/milestones/M14-14a-3b-settings.md`), in PR #85 with auto-merge on green CI:
- the gear (top bar on phones, the sidebar's foot from 768px) opens a modal `<dialog>`, sheet or 440px panel, holding the username, display name, the two switches (Skip the game screen, Numbers on the calendar), Privacy policy, Sign out and Delete account;
- the friends list and the invite link with Reset moved to the Friends tab, with avatar slots;
- the rarest answers leave caught ones out; the calendar's shades reach 3:1, with a text alternative naming each day;
- `GET /api/account` is gone (the profile carries it all);
- MDN `<dialog>` is in SOURCES.md.

**Migration `20261025200806_settings.sql`** (and the **security change**: `plor_app` may update the two settings' columns, DECISIONS.md Log). It's on main (PR #85) and **pushed to plor.app** (2026-10-25, below). It's applied to the Mac's local stack.

### Waiting on the human
**14b-1, themes and the About page.** The human's answers of 2026-10-25 (this session's second round):
- **The three new themes' colours:** "Mock them up first". The derived sets (Sky, Moonlit, Ink: outline, Moonlit's divider, shades and their number colours, Safe, Caught and Delete) are to be drawn on the canvas "Plor shell layout" (Me, the sheet, Today) for the human to review before they're built. The values Claude proposed are in this session's question: control outline Sky #858C9B, Moonlit #737185, Ink #606060; Moonlit's divider #3E3C50; shades Sky a7/c4/e2/ff, Moonlit 72/a1/d0/ff, Ink 65/98/cc/ff; Safe, Caught and Delete from Paper (Sky) or Night (Moonlit, Ink).
- **No flash:** "Add it, copy in localStorage (Recommended)": add Next.js's bundled guide "Preventing flash before hydration" (`01-app/02-guides/preventing-flash-before-hydration.md`) to SOURCES.md's Next.js row, and apply a localStorage copy of the account's theme from an inline script in `<head>`; the account stays the truth.
- **About:** "be way more broad but yes credits should be on". About is more than credits; ask what else it holds (a guided round) before drafting it.
- **The AI note:** "Code only, as worded (Recommended)": "Plor's code is written with help from Claude, an AI model by Anthropic."
- Already decided: the presets Follow device, Paper, Night, Sky, Moonlit, Ink (L21); the chosen one outlined (L47); the theme a column on the account, its security change approved ("Approve it (Recommended)").

### Next step
1. After 14a-3b merges: mark it done with its CI run in the ticket and ROADMAP, from this branch.
2. Draw the three themes on the canvas, and ask the About round; then write 14b-1's ticket from the answers and build it, one PR, merged on green CI.

### Catching up on another computer
1. `git fetch origin && git switch m14-look-and-feel && git pull && npm ci`.
2. `npx supabase start`, then `npx supabase migration up` (through `20261025200806_settings.sql`). On the Mac, first `export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"`.
3. `npx next typegen` once, before `npx tsc --noEmit -p .`. Then `npm run dev`; sign in with a code from Mailpit at `http://127.0.0.1:54324`.
4. The checks: `npm test` 269; `npm run test:db` 258; `npx supabase test db` 345; `npm run test:e2e` 37. The db and e2e suites need today (and yesterday for some e2e files) free of a real approved day.
5. **On the Mac** the M13 session (`/Users/jason/code/plor`) shares the stack and port 3000. It said it won't run db, SQL or e2e tests locally for now, nor `db reset`, and will message first if that changes. Message it before a `db reset` anyway.

**Left running:** nothing of M14's (no dev server, no background job).

## M15 (from main, written by the M15 and M13 sessions)
- **15a's P1–P5 are answered** (human, 2026-10-24, guided questions): drafts in the database, admin-only; P2 moot; the T1 day deleted with 15a; drafting paused until 15a ships. Its design and criteria are rewritten for format 3 before it's built. No new milestone starts while M13 and M14 are in progress (human: "Nothing new yet").
- **15c is closed, not built:** M14 14a-1 adds the Admin link (sidebar, and the Me tab on phones) with an `admin` flag on `GET /api/profile` (human, 2026-10-24; M14 ticket L49). 14a-1 landed in PR #77.
- **Storage** (DECISIONS.md Log): Free plan for now, the answer database grows freely, the human warned near 500 MB. Supabase's pricing page is in SOURCES.md (the human's OK, 2026-10-24).
- **plor.app admin is set up** (human, 2026-10-24): the hosted format-1 days are gone (no puzzles left there), M13's 3 migrations are pushed (the admin pages, which read the answer tables, load), and the human is in `private.admin`. The hosted answer database is empty by choice, so the puzzles page lists the T1 day's host answers as raw IDs; it stays unapproved there (its answers are public and its categories aren't loaded). `npx.cmd supabase test db --linked` passed after this push (human, 2026-10-24: "yes it passed"). **plor.app's database is even with `main`** (2026-10-25, the Mac, at the human's request: "can you do it for me", then "Push the two (Recommended)"): `npx supabase migration list --linked` showed every migration through `20261025053147_question_bank.sql` already applied (13c and 13d were pushed without a note here), and `npx supabase db push` applied the two left, `20261025074000_links.sql` and `20261025200806_settings.sql`. `npx supabase test db --linked` then passed (21 files, 345 tests). The Mac checkout is now linked to `plor-staging`. Every migration merged to `main` deploys its code at once on Vercel, while the database waits for the next `db push`, so push after each migration merge. Run hosted commands from `RIFF-m15` (or any clean checkout of `main`), never a checkout with another session's uncommitted migrations.

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
  - **13e-2, links and the first batch, is done** (PR #80) (`docs/milestones/M13-13e-2-links-and-the-first-batch.md`): 88 links in `data/links.json` (tulip → flower, apple pie → dessert, water → beverage) loaded by `private.load_links` (migration `20261025074000_links.sql`, applied locally); 27 everyday WordNet categories and their bank questions (34 in all); the review's LDNOOBW flag; and **letters first** in the draft: the host draws among its bank answers it can still say (human, 2026-10-25), with 1, 1, 1, 1, 2, 2, 3 kept. Trial drafts for 10-26, 10-27, 10-28 and 11-24 succeed. The links migration is applied locally only.
  - **13e-3, knowledge and places, is built, reviewed and committed, not yet in a PR** (`docs/milestones/M13-13e-3-knowledge-and-places.md`): 21 WordNet knowledge categories and 5 Wikidata place sets (world capitals, US state capitals, US cities, rivers, Canadian provinces), 60 categories and bank questions in all; Wikidata imports fall back to "mul" labels; rivers get short names; the draft moves a blocking question earlier. 36 of 40 simulated days draft. The local database is about 287 MB.
  - **13e, growing the categories to 210+, is approved** (human, 2026-10-24: "Approve, build 13e-1 (Recommended)"). **13e-1, the tooling, is done** (PR #78): categories live only in `data/categories.json`, defined by `npm run base -- load all` (20 s locally); `npm run base -- review <key>…` with a flag under 10 members; `content:validate` refuses a bank category not in the file and a host bank under 3. Then the batches, 13e-2 onward: 20–30 categories each, mostly WordNet branches, some Wikidata imports for places and pop culture, each with its bank questions and review output, one PR each, which the human approves by merging.
- **New Next revision items** (ROADMAP), including from 13c's review: the rare tier counting members at approval, and smaller gaps.
  - For M13: readers of the base that skip `removed_at`, counting cost per miss, reused error codes, and smaller gaps from the 13b review;
  - For M15: warn the human as the hosted database nears its plan's limit (the human asked for it).
- **M15 15b (zod) is merged,** and Dependabot alert #1 now shows `fixed` (checked 2026-10-24).
- **The order stays** M13, then M14, then M15. plor.app needn't be playable before launch.

## Waiting on the human
- **13e-3's last checks wait for the Windows PC** (human, 2026-10-25: "i dont have access to that device right now … record any decisions for that comptuer when i go back home"). The snapshots (`data/snapshots/`, gitignored) are there only. Every decision is already made and applied; only the runs below are left.
- **13e-3's PR** merges on green CI (human, 2026-10-25: "Merge on green CI (Recommended)"). The river short names and LDNOOBW flags are answered and applied (ticket, Review).
- **For the human, from 13d's review** (ROADMAP, For M13): should themed questions be held back on other dates?
- **The import review's flags** (ROADMAP, For M13): fruit products, country codes, an element alias.

## Next step
1. **On the Windows PC** (`C:/Users/jason/RIFF`), finish 13e-3:
   1. `git switch m13-answer-lists-and-content && git pull && npm ci`. Its local stack still has 13e-3's hand deletions (time unit, iron, graphite); `npx supabase migration up` applies nothing new from M13.
   2. `npm run base -- fetch wikidata-rivers`: its old rivers snapshot has the same file name as the Mac's and the old checksum, so `load` refuses it until re-fetched. Commit the new manifest; re-measure the short names as the ticket's Review does (generic words, the famous rivers, `name-a-river`'s 11 answers).
   3. `npm run base -- load all`, the trial drafts (`npm run draft -- <date>` for 2026-10-26 on; delete the files after) and the simulator (a scratch script, gone: rewrite it, or do ROADMAP's From 13e-3 item first). Fill the Evidence.
   4. Draft PR #84 (opened from the Mac, so CI runs the db, SQL and e2e suites early) goes ready for review, with auto-merge on (human, 2026-10-25: "Merge on green CI (Recommended)").
   After it merges: mark it done, then 13e-4's guided questions (pop culture, with card and board games: freshness and which titles count), in its own PR from `m13-answer-lists-and-content`. A new category needs the human's OK, given by merging the batch.

**Shared local database:** on the Mac, the M14 session (worktree `/Users/jason/code/plor/.claude/worktrees/m14-settings-900486`, branch `m14-look-and-feel`) runs its db and e2e suites against the same local stack, with its uncommitted 14a-3b migration applied (human's OK to share, 2026-10-25). On the Windows PC the M14 worktree was `C:/Users/jason/RIFF-m14`. Message it before a `db reset` or a full suite run.

Until the human asks, there are no content days, staging or `db push`.

## Local state
- **The Windows checkout** (`C:/Users/jason/RIFF`, where 13e-3 was built), on `m13-answer-lists-and-content`, commits as `jasonex64 <jasonex64@gmail.com>`. `m12-account` and `content-fill-gaps` are merged or closed and deleted. Its local stack runs in Docker Desktop, with every migration up to `20261025074000_links.sql` (13e-2), and the answer database loaded from the snapshots, links and categories by `npm run base -- load all` (about 287 MB with 13e-3's five place sets, whose snapshots are on this machine only; a machine without them runs `npm run base -- fetch <set>`). 13e-3's too-broad time unit, iron and graphite links were deleted from this database by hand. The draft simulator and the list checks were scratch scripts in the last session's temp folder and are gone: ROADMAP, From 13e-3, asks for them as `scripts/` commands, places and WordNet's nouns included (195 MB). `.env.local` points at it. **The snapshots** (`data/snapshots/`, gitignored) are what `npm run base -- load` reads. A machine without them runs `npm run base -- fetch <set>` first; the committed manifests in `data/manifests/` record what each one was. `npm run base -- load all` loads every set in order (13b). The database tests need **today free** for the fixture day: a real day approved for today locally makes them refuse (`src/test/puzzles.ts`). No dev server is left running, and no temporary test files are left.
- The Mac checkout (`/Users/jason/code/plor`) is on `m13-answer-lists-and-content`, where this session last worked; its `data/snapshots/` holds only `wikidata-rivers` (re-fetched 2026-10-25), so no answer base is loaded there; its git uses the macOS keychain for GitHub. Its commit author is set in `.git/config` to the human's GitHub username and email, as on the other machine. **Rule (human, 2026-10-23: "any of my accounts should be able to change it, whether its on here or my deskto"):** on every machine, commit as an email verified on one of the human's GitHub accounts, and that GitHub account must be connected to the Vercel team `sixfour`; otherwise Vercel blocks the deployment ("GitHub couldn't verify an account for commit", PR #60). Commits `4f17304` to `6aa3fa6` carry the Mac's unset default, `jason@jasons-MacBook-Air.local`, and were blocked; `f3736d5` deployed. They stay as they are (human, 2026-10-23: no rewrite).
- The Mac's local Supabase stack is **left running** in Docker Desktop with every migration on `main` up to `20261025074000_links.sql`, plus whatever the M14 session applied from its worktree. It has no admin and no approved day yet. `.env.local` holds only the local stack's `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Playwright's Chromium is installed. No dev server is left running.
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
