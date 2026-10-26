# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-26. The M14 section is the M14 session's (on the Mac, worktree `.claude/worktrees/m14-settings-900486`), written with 14b-1's PR and 14b-2's plan, plus 14c-1's draft from a naming session in the same worktree. The rest is as the M13 session wrote it on `m13-answer-lists-and-content`; for M13's latest, read the handoff on its branch.

## M14 (this branch, written by the M14 session)
### Done
| Sub-ticket | What | PR |
|---|---|---|
| 14a-1 | The shell: colour slots, fonts, the tab bar, the sidebar from 768px, the Admin link | #77 |
| 14a-2a | Today: Offbeat's banner, one leaderboard card, the locked feed, the clock bar | #79 |
| 14a-2b | The game screen `/offbeat`. **Security change:** yesterday's host answers to every signed-in player | #81 |
| 14a-2c | 14a-2b's review fixes | #82 |
| 14a-3a | Me: totals, this month's calendar, Offbeat's card, the 3 rarest answers; avatar slots; Friends' empty state | #83 |
| 14a-3b | The settings sheet (a `<dialog>` from the gear) with the account, Skip the game screen and Numbers on the calendar; the friends list on the Friends tab; caught answers out of the rarest; the calendar at 3:1. **Security change:** `plor_app` updates the two settings' columns | #85 |

### Also done
**14b-1**, themes and the About page (`docs/milestones/M14-14b-1-themes.md`), merged in PR #86 (`64eeea6`, 2026-10-26 01:26 UTC):
- Sky, Moonlit and Ink as round 8 drew them; every theme a `[data-theme]` block in `globals.css`, all five checked by `colors.test.ts`;
- the picker in the settings sheet, saved on the account (**security change**: `plor_app` may update `private.profile.theme`), painted before the profile loads from a `localStorage` copy by a `<head>` script, re-applied on every page by `KeepTheme`;
- `/about` (what Plor is, "Plor is made by Jason", Moonlit's credit, "Plor is built with help from AI."), linked from the sheet and the shared `Footer`.

**plor.app's database is even with main** through `20261026010745_theme.sql`: the M13 session pushed it from a clean checkout of main at `64eeea6`, at the human's request; it reported `migration list --linked` matching on both sides and `supabase test db --linked` 345/345 (2026-10-26; reported by that session, not re-run here).

### Drafted: 14c-1, the game's name and words
Written by a naming session on the Mac (2026-10-25), after 14b-1 merged; docs only, no code. `docs/milestones/M14-14c-1-name-and-words.md` holds the human's answers from five rounds of guided questions, quoted:
- **Words, decided:** a question is a **stop**; the answer is a **sign** ("Paint your sign" / "Plant it"); the Wind **whispered** its answers, narrated, never speaking itself; the get-past and caught lines escalate in three tiers (stops 1–2, 3–5, 6–7: "Shrugged it off!" / "Dug in!" / "Braved the storm!"; "tipped over" / "tumbled" / "sent flying at stop N"); "climbed" for survived; points stay points; screens mixing games stay plain.
- **Open, for the human (N1–N6 in the ticket):** the name (**Updraft** leads; Zephyr is crowded; Crosswind clashes with a Steam game of that name; no trademark search yet), keeping `game_id = 'offbeat'` (Claude recommends keeping it), the share line, timeouts' word, admin pages plain, How to play rewritten in the same PR.

### Next step
**14b-2** is planned (`docs/milestones/M14-14b-2-sprout-admin-polish.md`), its guided questions answered on the Mac (human, 2026-10-26), to be built at home on the Windows checkout, one PR each, merged on green CI:
1. **14b-2a, the sprout streak:** drafted in full in the ticket. Two choices are left for the build session, written there: where the shell reads the streak, and the sprout's colours under the Styling rule.
2. **14b-2b, the admin pages:** "Full redesign, mockups first", drawn "At home": draw the six pages on the canvas "Plor shell layout", get the human's review, then build.
3. **14b-2c, the review items:** "All 33" open For M14 items in ROADMAP; ask the "For the human" ones first (About's contact and wording among them).

Also waiting:
- **For the human** (ROADMAP, For M14): About's contact address and "What Plor is" wording (14b-2c asks it).
- **14c-1:** ask N1–N6 (the ticket's open questions) as guided questions, then build it as one PR from this branch, after 14b-2's PRs (one open PR at a time).

**On the Windows checkout** the local stack was last at `20261025074000_links.sql`: run `npx supabase migration up` for the settings and theme migrations before any test.

### Catching up on another computer
1. `git fetch origin && git switch m14-look-and-feel && git pull && npm ci`.
2. `npx supabase start`, then `npx supabase migration up` (through `20261026010745_theme.sql`). On the Mac, first `export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"`.
3. `npx next typegen` once, before `npx tsc --noEmit -p .`. Then `npm run dev`; sign in with a code from Mailpit at `http://127.0.0.1:54324`.
4. The checks: `npm test` 330; `npm run test:db` 260; `npx supabase test db` 345; `npm run test:e2e` 39. The db and e2e suites need today (and yesterday for some e2e files) free of a real approved day. A new e2e file's player names must not repeat another file's: every file in a run shares `RUN` (ROADMAP, For M14).
5. **On the Mac** the M13 session (`/Users/jason/code/plor`) shares the stack and port 3000. It said it won't run db, SQL or e2e tests locally for now, nor `db reset`, and will message first if that changes. Message it before a `db reset` anyway.

**Left running:** nothing of M14's (no dev server, no background job).

## M15 (from main, written by the M15 and M13 sessions)
- **15a's P1–P5 are answered** (human, 2026-10-24, guided questions): drafts in the database, admin-only; P2 moot; the T1 day deleted with 15a; drafting paused until 15a ships. Its design and criteria are rewritten for format 3 before it's built. No new milestone starts while M13 and M14 are in progress (human: "Nothing new yet").
- **15c is closed, not built:** M14 14a-1 adds the Admin link (sidebar, and the Me tab on phones) with an `admin` flag on `GET /api/profile` (human, 2026-10-24; M14 ticket L49). 14a-1 landed in PR #77.
- **Storage** (DECISIONS.md Log): Free plan for now, the answer database grows freely, the human warned near 500 MB. Supabase's pricing page is in SOURCES.md (the human's OK, 2026-10-24).
- **plor.app admin is set up** (human, 2026-10-24): the hosted format-1 days are gone (no puzzles left there), M13's 3 migrations are pushed (the admin pages, which read the answer tables, load), and the human is in `private.admin`. The hosted answer database is empty by choice, so the puzzles page lists the T1 day's host answers as raw IDs; it stays unapproved there (its answers are public and its categories aren't loaded). `npx.cmd supabase test db --linked` passed after this push (human, 2026-10-24: "yes it passed"). **13c's migration `20261025042950_rarity_and_the_host.sql` reached `main` right after, and 13d's `20261025053147_question_bank.sql` (dropping `private.save_questions` and `private.puzzle_questions`) reached `main` with PR #75,** so the hosted database is two migrations behind `main` (no `db push` since, as far as this repo records; not checked against the hosted database), and three once 13e-2's `20261025074000_links.sql` merges: every migration merged to `main` deploys its code at once on Vercel, while the database waits for the human's `db push`. Run hosted commands from `RIFF-m15` (or any clean checkout of `main`), never a checkout with another session's uncommitted migrations.

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
  - **13e-2, links and the first batch, is built and in its PR** (`docs/milestones/M13-13e-2-links-and-the-first-batch.md`): 77 links in `data/links.json` (tulip → flower, pie → dessert, water → beverage) loaded by `private.load_links` (migration `20261025074000_links.sql`, applied locally); 27 everyday WordNet categories and their bank questions (34 in all); the review's LDNOOBW flag; and **letters first** in the draft: the host draws among its bank answers it can still say (human, 2026-10-25), with 1, 1, 1, 1, 2, 2, 3 kept. Trial drafts for 10-26, 10-27, 10-28 and 11-24 succeed. The links migration is applied locally only.
  - **13e, growing the categories to 210+, is approved** (human, 2026-10-24: "Approve, build 13e-1 (Recommended)"). **13e-1, the tooling, is done** (PR #78): categories live only in `data/categories.json`, defined by `npm run base -- load all` (20 s locally); `npm run base -- review <key>…` with a flag under 10 members; `content:validate` refuses a bank category not in the file and a host bank under 3. Then the batches, 13e-2 onward: 20–30 categories each, mostly WordNet branches, some Wikidata imports for places and pop culture, each with its bank questions and review output, one PR each, which the human approves by merging.
- **New Next revision items** (ROADMAP), including from 13c's review: the rare tier counting members at approval, and smaller gaps.
  - For M13: readers of the base that skip `removed_at`, counting cost per miss, reused error codes, and smaller gaps from the 13b review;
  - For M15: warn the human as the hosted database nears its plan's limit (the human asked for it).
- **M15 15b (zod) is merged,** and Dependabot alert #1 now shows `fixed` (checked 2026-10-24).
- **The order stays** M13, then M14, then M15. plor.app needn't be playable before launch.

## Waiting on the human
- **13e-2's PR:** green CI, then the human's OK, and the LDNOOBW flags to decide per category (listed in the PR).
- **For the human, from 13d's review** (ROADMAP, For M13): should themed questions be held back on other dates?
- **The import review's flags** (ROADMAP, For M13): fruit products, country codes, an element alias.

## Next step
1. After 13e-2 merges: mark it done with its CI evidence, then write 13e-3 (the second batch of 20–30 categories, with places or pop culture from Wikidata if the human wants them) as its own sub-ticket file and PR, from `m13-answer-lists-and-content`. A new category needs the human's OK, given by merging the batch.

**Shared local database:** another session (M14 layout work, worktree `C:/Users/jason/RIFF-m14`) runs its e2e suite against the same local stack. Message it before a `db reset` or a full suite run.

Until the human asks, there are no content days, staging or `db push`.

## Local state
- **The last session ran on the Windows checkout** (`C:/Users/jason/RIFF`), on `m13-answer-lists-and-content`, committing as `jasonex64 <jasonex64@gmail.com>`. `m12-account` and `content-fill-gaps` are merged or closed and deleted. Its local stack runs in Docker Desktop, with every migration up to `20261025074000_links.sql` (13e-2, applied locally before its merge), and the answer database loaded from the snapshots, links and categories by `npm run base -- load all`, places and WordNet's nouns included (195 MB). `.env.local` points at it. **The snapshots** (`data/snapshots/`, gitignored) are what `npm run base -- load` reads. A machine without them runs `npm run base -- fetch <set>` first; the committed manifests in `data/manifests/` record what each one was. `npm run base -- load all` loads every set in order (13b). The database tests need **today free** for the fixture day: a real day approved for today locally makes them refuse (`src/test/puzzles.ts`). No dev server is left running, and no temporary test files are left.
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
