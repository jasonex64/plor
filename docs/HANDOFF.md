# Handoff

Read this first; rewrite it last (CLAUDE.md, "Sessions are independent"). It holds only what isn't in ROADMAP.md or the tickets.

**Updated:** 2026-10-26, on `m14-look-and-feel` by the M14 session on the Mac (`/Users/jason/code/plor/.claude/worktrees/m14-settings-900486`): 14b-2c-1 merged (PR #93), 14b-2c-2 merged (PR #94), 14b-2c-3 merged (PR #95), 14b-2c-4 merged (PR #96); 14b-4 merged (PR #97); 14b-3 in review (PR_PENDING), its merge and plor.app's push waiting on the human; the M14 section is current. The rest came from `main` and was written by the M13 session on the Windows PC; for M13's latest, read the handoff on `m13-answer-lists-and-content`.

## M14 (this branch, written by the M14 session)
### Done
| Sub-ticket | What | PR |
|---|---|---|
| 14a-1 | The shell: colour slots, fonts, the tab bar, the sidebar, the Admin link | #77 |
| 14a-2a | Today: Offbeat's banner, one leaderboard card, the locked feed, the clock bar | #79 |
| 14a-2b | The game screen `/offbeat`. **Security change:** yesterday's host answers to every signed-in player | #81 |
| 14a-2c | 14a-2b's review fixes | #82 |
| 14a-3a | Me: totals, calendar, Offbeat's card, the 3 rarest answers; avatar slots | #83 |
| 14a-3b | The settings sheet, the friends list on Friends. **Security change:** `plor_app` updates two settings' columns | #85 |
| 14b-1 | Themes and `/about`. **Security change:** `plor_app` may update `private.profile.theme` | #86 |
| 14b-2a | The streak as six vector flower ranks in a pill, and `/streak` | #88 |
| 14b-2b-1 | The 280px sidebar, a right column from 1200px, About and Privacy in Settings, buttons for every control link, one Realtime socket per page | #89 |
| 14b-2b-2a | The admin pages in the shell, as round 10 draws them | #90 |
| 14b-2b-2b | Keep comment, blocked host answers marked in place, the audit's one-click link. **Security changes:** `private.keep_reported_comment` and `private.comment_keep` (a kept comment stays hidden for its reporters); `private.audit_near` | #91 |

### Done since 14b-2b-2b
- **14b-2c-1, the player screens** (PR #93, merged on green CI, 2026-10-26): 23 For M14 items, from `docs/milestones/M14-14b-2c-review-items.md` (14b-2c approved after four rounds of guided questions, answers 1–14).

- **14b-2c-4, the tests, comments and repeated code** (PR #96, merged on green CI, 2026-10-27 00:26 UTC): 13 of its 16 items closed, one by the human (answer 24); one `.sr-only` in `globals.css` (answer 21, DECISIONS.md); `e2e/players.test.ts` fails on a repeated player name (answer 22); ButtonLink's `offbeat` tone (answer 23). Three flaky tests (items 1, 24, 25) didn't reproduce in 20 repeats on the Mac and stay for the Windows PC. 29 For M14 items are open, all from the 14b-2c reviews but those three; the ticket sends the reviews' findings to 14c or later.
- **14b-2c-3, the admin pages** (PR #95, merged on green CI, 2026-10-26): items 36–39, 41, 51 and 53 built, 52 closed as accepted by the human (answer 15, "Leave it": no security change), the audit's one query per near-typo kept (answer 19). WAI-ARIA 1.2 joined SOURCES.md for the admin tables' explicit roles (answer 20).
- **14b-2c-2, Me, Friends, the settings sheet and themes** (PR #94, merged on green CI, 2026-10-26): items 19, 26, 27, 28, 29 and 33. Me reads its day once, first, and passes it to the settling and every read (`private.today()` is each statement's own); a signed-in player's theme is applied by the settings sheet alone. 41 For M14 items are open: 14b-2c-3's 8, 14b-2c-4's 16 and the 14b-2c reviews' 17.

### Approved, not built
- **14b-3, the invite button** (`docs/milestones/M14-14b-3-invite-button.md`, human, 2026-10-26): share buttons instead of shown links, 10-character codes on `/i/` (friends) and `/g/` (groups), every old link replaced. **Security change:** replacing the codes is proposed and recorded in DECISIONS.md before its migration. Built after 14b-2c, before 14c.
- **Username lookup with friend requests** is on ROADMAP's Later list as its own milestone after M13 and M14.

### Next step
1. **14b-4, the game's name record** is done (PR #97, merged on green CI, 2026-10-27): `src/platform/game.ts` holds the game's ID, shown name and address; shared screens name no game.
2. **14b-3, the invite button** (in review, PR_PENDING; `docs/milestones/M14-14b-3-invite-button.md`): approved with its security change (answer 11, DECISIONS.md Log). Its merge waits on the human: on yes, merge it and push its migration (`20261027004038_short_invite_codes.sql`) to plor.app straight after, from a clean checkout of `main`, then run the hosted tests (answer 12). Until it's pushed, making an invite link on plor.app fails. On this Mac's shared stack the migration was applied by its SQL, with its row in `supabase_migrations.schema_migrations`, since M13 13e-5's unmerged `one_walk` makes `migration up` refuse.
3. Then 14c-1 (ask its N1–N7). N3 holds the share symbols and N7 a stolen key's feedback.

### Catching up on another computer
1. `git fetch origin && git switch m14-look-and-feel && git pull && npm ci`.
2. `npx supabase start`, then `npx supabase migration up`. On the Mac, first `export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"`.
3. `npx next typegen` once before `npx tsc --noEmit -p .` (delete a stale `.next/dev` if tsc names a moved route). Then `npm run dev`; sign in with a code from Mailpit at `http://127.0.0.1:54324`.
4. The checks (2026-10-26, 14b-2c-4): `npm test` 390; `npm run test:db` 266; `npx supabase test db` 24 files; `npm run test:e2e` 60. On a stack holding M13 13e-5's `one_walk` migration before it merges, `answer_base.test.sql` fails (it imports a kind_of circle on purpose). Don't edit files while e2e runs: the dev server's Fast Refresh remounts pages mid-test. A new e2e file's player names must not repeat another file's.

### Local state (Windows)
- **The shared local stack** (Docker; the M13 session in `C:/Users/jason/RIFF` uses it and port 3000 too): the M13 session resets it from its branch (`db reset`, `load all`; the human approved), which drops M14's two new migrations (`keep_comment`, `audit_near`). Re-apply them after a reset (pending ones with `npx supabase migration up`; if the CLI refuses because of M13's unmerged migration, run the two files' SQL in one transaction and add their rows to `supabase_migrations.schema_migrations`). Message the M13 session before any suite or dev server.
- Canvas mockups, renders, the critique snapshot and screenshots are in the session's temp folder, outside the repo.

### Local state (Mac)
- The M14 worktree is `/Users/jason/code/plor/.claude/worktrees/m14-settings-900486`. The M13 session works in `/Users/jason/code/plor` itself, and both share the Mac's local stack and port 3000. On 2026-10-26 the M13 session's 13e-5 migration `20261026212300_one_walk.sql` (not on `main` yet) was applied to that stack. Message it before a `db reset`, a full suite run or a dev server; it held while 14b-2c-1's suites ran.
- In e2e, Playwright's fake clock moves only the browser's time: a test that needs the database to see a timeout backdates `private.run.started_at` (`e2e/player-screens.e2e.ts`). It also fires the Realtime client's own timers, whose rejoin reloads the board, so a board check after a time-up runs on the real clock.

**Left running:** nothing (no dev server, no background job).

## M15 (from main, written by the M15 and M13 sessions)
- **15a's P1–P5 are answered** (human, 2026-10-24, guided questions): drafts in the database, admin-only; P2 moot; the T1 day deleted with 15a; drafting paused until 15a ships. Its design and criteria are rewritten for format 3 before it's built. No new milestone starts while M13 and M14 are in progress (human: "Nothing new yet").
- **15c is closed, not built:** M14 14a-1 adds the Admin link (sidebar, and the Me tab on phones) with an `admin` flag on `GET /api/profile` (human, 2026-10-24; M14 ticket L49). 14a-1 landed in PR #77.
- **Storage** (DECISIONS.md Log): Free plan for now, the answer database grows freely, the human warned near 500 MB. Supabase's pricing page is in SOURCES.md (the human's OK, 2026-10-24).
- **plor.app admin is set up** (human, 2026-10-24): the hosted format-1 days are gone (no puzzles left there), M13's 3 migrations are pushed (the admin pages, which read the answer tables, load), and the human is in `private.admin`. The hosted answer database is empty by choice, so the puzzles page lists the T1 day's host answers as raw IDs; it stays unapproved there (its answers are public and its categories aren't loaded). `npx.cmd supabase test db --linked` passed after this push (human, 2026-10-24: "yes it passed"). **plor.app's database is even with `main`** (2026-10-25, the Mac, at the human's request: "can you do it for me", then "Push the two (Recommended)"): `npx supabase migration list --linked` showed every migration through `20261025053147_question_bank.sql` already applied (13c and 13d were pushed without a note here), and `npx supabase db push` applied the two left, `20261025074000_links.sql` and `20261025200806_settings.sql`. `npx supabase test db --linked` then passed (21 files, 345 tests). The Mac checkout is now linked to `plor-staging`. Then M14 14b-1's `20261026010745_theme.sql` (PR #86, merged at `64eeea6`) was pushed the same way from a clean checkout of `main` (a temporary worktree, removed after), the dry run listing it alone; `migration list --linked` shows every migration on both sides, and the hosted tests passed again (21 files, 345 tests). The hosted tests need Docker on PATH (below). Every migration merged to `main` deploys its code at once on Vercel, while the database waits for the next `db push`, so push after each migration merge. Run hosted commands from `RIFF-m15` (or any clean checkout of `main`), never a checkout with another session's uncommitted migrations.

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
  - **13e-3, knowledge and places, is done** (PR #84, `docs/milestones/M13-13e-3-knowledge-and-places.md`): 21 WordNet knowledge categories and 5 Wikidata place sets (world capitals, US state capitals, US cities, rivers, Canadian provinces), 60 categories and bank questions in all; Wikidata imports fall back to "mul" labels; rivers get short names; the draft moves a blocking question earlier (`fitOrder`). 40 of 40 simulated days draft. A fresh local load is 260 MB.
  - **13e, growing the categories to 210+, is approved** (human, 2026-10-24: "Approve, build 13e-1 (Recommended)"). **13e-1, the tooling, is done** (PR #78): categories live only in `data/categories.json`, defined by `npm run base -- load all` (20 s locally); `npm run base -- review <key>…` with a flag under 10 members; `content:validate` refuses a bank category not in the file and a host bank under 3. Then the batches, 13e-2 onward: 20–30 categories each, mostly WordNet branches, some Wikidata imports for places and pop culture, each with its bank questions and review output, one PR each, which the human approves by merging.
- **New Next revision items** (ROADMAP), including from 13c's review: the rare tier counting members at approval, and smaller gaps.
  - For M13: readers of the base that skip `removed_at`, counting cost per miss, reused error codes, and smaller gaps from the 13b review;
  - For M15: warn the human as the hosted database nears its plan's limit (the human asked for it).
- **M15 15b (zod) is merged,** and Dependabot alert #1 now shows `fixed` (checked 2026-10-24).
- **The order stays** M13, then M14, then M15. plor.app needn't be playable before launch.

## Waiting on the human
- **For the human, from 13d's review** (ROADMAP, For M13): should themed questions be held back on other dates?
- **The import review's flags** (ROADMAP, For M13): fruit products, country codes, an element alias.

## Next step
1. **13e-4a is done** (PR #87, `docs/milestones/M13-13e-4-subsets.md`), and **plor.app's database is even with main** (2026-10-26, at the human's request: "Push 13e-4a's 3 migrations to plor.app now, from a clean checkout of main, then run the hosted tests"): from a temporary worktree of `origin/main` at `6c4d5ee` (removed after), `db push --linked --dry-run` listed exactly the 3, the push applied them, `migration list --linked` matches on all 36, and `test db --linked` passed (22 files, 388 tests). The 3: `20261026050238_subsets.sql`, `20261026053032_number_fact_lookup.sql`, `20261026054153_subset_accept.sql`. plor.app's answer database is still empty by choice.
   **13e-4b and 13e-4c** are in PR #92: both reviewed, every review finding answered (ticket), the animal tree read by key and proven by fetches that agree, the local database rebuilt and every bank answer resolving on it. After the PR merges on green CI: mark both done; plor.app needs a `db push` for `20261026061619_subset_values.sql`, at the human's request; 13e-4b has no other migration.
2. **Then 13e-5, pop culture,** with the answers already recorded in 13e-4's ticket (animated films and anime, Nintendo plus genres, younger-leaning groups with K-pop, board games, superheroes), built as subsets where it can.
3. ROADMAP's From 13e-3 item that makes the simulator and the list checks `scripts/` commands: the simulator has been rewritten by hand three times. The re-fetch of the older sets for the mul fallback rides in 13e-4a.
4. **Any machine that loaded an older rivers snapshot** keeps its old short names and Pūkio Stream's dropped alias until `npx supabase db reset` and `npm run base -- load all` (loading only adds rows). The Windows stack was rebuilt this way; the Mac has no answer base loaded; plor.app's answer database is empty.

**Parallel sessions on this PC (2026-10-26):** the M14 session ("M14 14b-2a: the streak ranks") works in `C:/Users/jason/RIFF-m14` on `m14-look-and-feel`. Both share the local Supabase stack and port 3000, and Playwright reuses whatever dev server is on 3000: one dev server or e2e run at a time, and message the other session before a `db reset` or a full suite run.

**Shared local database:** on the Mac, the M14 session (worktree `/Users/jason/code/plor/.claude/worktrees/m14-settings-900486`, branch `m14-look-and-feel`) runs its db and e2e suites against the same local stack, with its uncommitted 14a-3b migration applied (human's OK to share, 2026-10-25). On the Windows PC the M14 worktree was `C:/Users/jason/RIFF-m14`. Message it before a `db reset` or a full suite run.

Until the human asks, there are no content days, staging or `db push`.

## Local state
- **The Windows checkout** (`C:/Users/jason/RIFF`, where 13e-3 was built), on `m13-answer-lists-and-content`, commits as `jasonex64 <jasonex64@gmail.com>`. `m12-account` and `content-fill-gaps` are merged or closed and deleted. Its local stack runs in Docker Desktop and was rebuilt on 2026-10-26 (`npx supabase db reset` with the human's OK, then `npm run base -- load all`): then 13e-4a's three migrations applied (through `20261026054153_subset_accept.sql`, local only) and every Wikidata set re-fetched with its facts and loaded: the answer database is 291 MB ( 13e-3's five place sets have snapshots on this machine only, so a machine without them runs `npm run base -- fetch <set>`). It holds no accounts, puzzles or runs beyond what the test suites leave and remove; the draft's db test leaves a small `dt_` base and two `dt_` categories, as the fixture base does. The draft simulator and the list checks are still scratch scripts (this session's was in its temp folder): ROADMAP, From 13e-3, asks for them as `scripts/` commands. On this PC the e2e suite is slow: a cold run times out about 9 files that pass on a rerun, and one account test fails every time (ROADMAP, For M14). A hung `supabase migration new question_bank` from 13d held the CLI binary and broke `npm ci`; it was stopped with the human's OK. A stale `.next/dev/types` from an old dev run broke `tsc` until removed. `.env.local` points at it. **The snapshots** (`data/snapshots/`, gitignored) are what `npm run base -- load` reads. A machine without them runs `npm run base -- fetch <set>` first; the committed manifests in `data/manifests/` record what each one was. `npm run base -- load all` loads every set in order (13b). The database tests need **today free** for the fixture day: a real day approved for today locally makes them refuse (`src/test/puzzles.ts`). No dev server is left running, and no temporary test files are left.
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
