# Codebase audit, 2026-10-26

**Status:** findings recorded; every proposed fix below waits for the human's approval, except the three answered on 2026-10-26 ("Answered", below). The audit itself changed no code.

Asked by the human: "can you do an audit on the entire codebase for any bloat, and anticipate any future issues when implementing the whole thing/future games or the current offbeat game".

## Scope (the human's answers, 2026-10-26, two rounds of guided questions)
- Output: "Report + draft tickets". Tickets: "Fold into existing ones" (each proposal is listed under the milestone it belongs to, below; the milestone tickets get a pointer here, not the text).
- What counts as bloat: "Code, Database, Tests and scripts, Docs".
- Future work to plan for: "Everything on Later" (launch, games 2–6, currency and cosmetics, avatars, friend requests, PWA, automatic puzzles).
- Depth: "Thorough, every area".
- Code read: "main + both branches". `m14-look-and-feel` was one docs-only commit ahead of `main` (`git log origin/main..origin/m14-look-and-feel` → 1), so `main` at `e4c9f88` holds M14's code; M13's unmerged diff (`one_walk.sql`, `scripts/base.ts`, `scripts/draft.ts`) was read on `m13-answer-lists-and-content`.
- Rule docs: "Everything, CLAUDE.md too". Where to commit: "whichever is neatest and makes most sense" (this file, on the M13 branch).

## Method
Six read-only auditors (database, app layer, domain modules, scripts/e2e/CI, docs, future collisions), each told to skip anything already in ROADMAP "Next revision" and to mark what it didn't read or run *unverified*. The main session re-checked the highest-stakes claims itself (marked **re-checked**). No suite, dev server or `db reset` was run; one read-only database transaction read `realtime.send`'s definition.

Each finding: **ID** · *bloat now* or *risk later (what)* · evidence · why it matters. "Extends" names the ROADMAP item it builds on.

## The ten that matter most
1. **TOOL-5:** the scripts' local-only database guard checks a different host than pg connects to (re-checked). A security-adjacent gap in the one place that writes the answer base.
2. **DOM-7:** M15 15a, as written, leaves `content/bank.json` (every question's host bank) public, and drops the history the 30-day gap rule reads (re-checked).
3. **DOC-9:** drafting's pause is in HANDOFF and the 15a ticket but not in DECISIONS; CLAUDE.md sends a drafting session to DECISIONS, which still says to commit days to the public repo (re-checked).
4. **FUT-2 / APP-4 / DB-10:** at midnight every open page refetches at the same instant, and the leaderboard read is what settles the day, so every client redoes the heaviest query (re-checked). None of it is in the M15 load-test items.
5. **FUT-1 / APP-7:** anonymous play: 45 routes accept any auth user, starting a run needs a `not null` username (re-checked), and a guest run can't be merged into an existing account.
6. **FUT-5 / DB-3 / FUT-6:** the shared run model (`run_status`, two triggers) and approval apply Offbeat's sudden death, 20 s and format 3 to every `game_id`. Run events are hard to reverse, so M16 has to decide this before code.
7. **DOM-1 / FUT-8 / APP-5 / DB-12:** M16's platform/game inventory lists 7 touch points; the real count is 15–16 non-test `GAME_ID` importers plus the whole app layer, the validator, CI and several triggers.
8. **DB-1:** about 1,200 of 3,500 migration lines are function bodies a later migration replaces (`approve_puzzle` ×6, re-checked). A baseline is cheapest before players exist.
9. **DOC-1..7:** the process docs cost more than they save: two handoffs ~70% identical and contradicting each other, a 2,734-character ROADMAP status cell, ~2 docs-only commits per PR, 34 closed items still in Next revision.
10. **TOOL-1:** CI runs every job twice for each PR commit (re-checked).

---

## Findings

### Database (`supabase/`)
- **DB-1** *bloat now; risk later (launch)*. Superseded function bodies: ≥1,227 of 3,495 migration lines; `approve_puzzle` 6 definitions, `import_source` 4, `audit_decide` 4, `record_miss` 3 (re-checked by grep). `supabase/roles.sql:13-33` still creates `riff_app` and `plor_publisher` only so old migrations can rename/drop them, and `plor_app_role.test.sql` tests that history. Every change re-copies 60–80 lines and a reader must find the live copy; squashing gets harder once plor.app has players.
- **DB-2** *bloat now*. Category membership is spelled out in `category_members` (one_walk.sql:133-146), `in_category_now` (subsets.sql:209-222) and `resolve_answer` (subsets.sql:246-283); the "live at a moment" test appears 10 times. Extends ROADMAP M13 "membership walk written three times" (13e-5 merged only the walk). A missed copy makes approval, audit and play disagree.
- **DB-3** *bloat now; risk later (M16)*. Run progress (`count(*)`, `bool_or(matched)`, question count) is computed in `check_question_open`, `check_run_event` and `run_status` (reveal_next_and_reset.sql:31-124), each with "matched = over". Game 2 has no elimination (M16 S7).
- **DB-4** *bloat now*. The reset time zone is in `day_of`, `next_reset`, `answers_as_of`; `next_reset`'s comment (reveal_next_and_reset.sql:127) says there are two. "Counts if given on its day" is retyped in `src/game/runs.ts:76`, `ledger.ts:35,73,95`, `me.ts:83`.
- **DB-5** *bloat now*. Admin permission three ways: route `isAdmin`; OB007 raised in SQL; `delete_reported_comment` / `keep_reported_comment` return false for a non-admin (keep_comment.sql, the `exists (select from private.admin …)` in the update; re-checked), which `src/admin/reports.ts:54,62` reports as 404.
- **DB-6** *bloat now*. `record_miss` silently returns when a day's question has no category (subset_values.sql:124-126), a state approval can no longer produce. `missed_answer.normalized` stays nullable for retired formats (0 null rows locally; hosted *unverified*).
- **DB-7** *bloat now*. `private.base_log` is written by 12 functions and read by nothing but test cleanup; its miss rows copy `miss_review`. `miss_review.decided_by`, `category_extra.added_by` have no reader. Whether the human reads it in the SQL editor is *unverified*.
- **DB-8** *risk later (admin account deletion)*. `category_extra.added_by`, `miss_review.decided_by` (no FK) and `base_log.actor` (text) keep an admin's ID after account deletion, unlike `comment_deletion`'s cascade (M12 A5). No test checks that user-referencing columns cascade, so future tables (coins, avatars, blocks) have no guard.
- **DB-9** *risk later (M15 anonymous purge)*. Deleting accounts cascades `run_event`, shrinking `pooledCounts`, `dayCounts` and miss thresholds for past days; unsettled runs then get a different bonus. Whether the beta purges anonymous users is *unverified*.
- **DB-10** *risk later (M15 load)*. `broadcast_board` fires on every run/answer/Next insert, reads `run_status` per friend and calls `realtime.send` (an `INSERT INTO realtime.messages`, read locally) per recipient, inside the answer's transaction. Cost *unverified*.
- **DB-11** *risk later (14c-1 N2)*. Migrating `game_id` hits 8–9 tables, composite FKs with no `on update cascade` (0 hits), the OB004 started-day freeze and the content-matches-key check. `game_id` has no registry, so a typo'd game 2 ID is accepted.
- **DB-12** *risk later (M16)*. M16's inventory (M16-game-2-substrings.md:72-80, still "format 2") misses the shared triggers, `approve_puzzle`'s format-3 refusal, `points_ledger.bonus` being Offbeat's rarity bonus, the missing per-day ledger index for S17 percentiles, and platform errors using Offbeat's "OB" prefix. Extends ROADMAP "Smaller gaps from the 13d review".
- **DB-13** *bloat now*. pgTAP repeats the grant list and RLS checks in 6 files (e.g. `account_deletion.test.sql:69-72`, `game.test.sql:146-149`) and tests declarations (`has_index`, citext type). The `search_path=''` check covers 2 of the ~12 security-definer functions, so a new one without it passes.
- **DB-14** *risk later (blocking)*. "My friends" is computed in `src/friends/circle.ts:40` and in both broadcast functions; "open report" is copied between `keep_reported_comment` and `src/admin/reports.ts:20-21`.

### App layer (`src/app`, `src/lib`, `src/proxy.ts`; read against `node_modules/next/dist/docs/`)
Clean: one route wrapper, one fetch client, one error mapper, one body reader; `connection()`, proxy, `params` in Suspense and `LayoutProps` match the bundled docs; no client file imports a server module; no dead routes.
- **APP-1** *bloat now; risk later (every new screen, M16)*. 16 `page.tsx` files render the same client `Home` (re-checked: 16), a 10-kind `View` union and 10-branch ternary (`home.tsx:52-62,152-178`); the only layout is the root. With `cacheComponents: true` (`next.config.ts:5`), "Effects run on every hide-to-visible transition" (`02-guides/preserving-ui-state.md:520`, re-checked), so each tab return refetches `/api/profile` and its page's data (*unverified* at runtime).
- **APP-2** *risk later (M15 Realtime cap)*. The board socket closes when a page's last listener hides and reopens on the next (`board-channel.ts:182-199`); at midnight the Friends tab is re-keyed (`home.tsx:431`), so every phone viewer reconnects at once. *Unverified* in a browser.
- **APP-3** *bloat now; risk later (M15)*. `GET /api/run` is fetched by 6 components with 5 inline response types (`game.tsx:54`, `shell.tsx:196`, `offbeat.tsx:180`, `home.tsx:374,417`): 2–3 reads per page view. Extends ROADMAP "Every run-state read … tallies the day's answers".
- **APP-4** *risk later (M15)*. All reset timers use the server's exact `msToReset` (`game.tsx:65`, `home.tsx:384,424`, `groups.tsx:131`); Today then fires 5 endpoints at once, including `/api/leaderboard/yesterday`, which settles the closed day.
- **APP-5** *risk later (14c-1, M16)*. Offbeat is hardcoded in 34 code lines in 23 files, plus 71 e2e references and `next.config.ts:16-19`; shared screens name it (`leaderboard.tsx:106-107`, `comments.tsx:177`, `src/comments/preview.ts:25`), against 14c-1 round 4's "Plain on shared screens". M16's inventory names no `src/app` file.
- **APP-6** *risk later (M16, needs the human)*. The feed unlock, the shell's streak and Me's card all mean "Offbeat's run" (`home.tsx:374-376`, `comments.ts:94`, `streak.ts:14-16`, `me.ts:20`). With two games these have no defined meaning.
- **APP-7** *risk later (M15)*. Sign-in gate renders SignIn/PickUsername before any screen (`home.tsx:41-44,132-136`); 6 routes refuse `no_profile`; `src/lib/auth-limits.ts:1-4` notes Auth's per-IP limit sees Vercel's address, so a server-side anonymous sign-in could share one site-wide bucket (limit *unverified*).
- **APP-8** *risk later (avatars, frames, blocking)*. `coalesce(display_name, username)` 12 times in 7 files; 6 separate `{username, name}` types; `Avatar` takes only `name` at 11 call sites.
- **APP-9** *bloat now; risk later*. The admin guard line is copied into 10 routes; `isAdmin` lives in `src/insights/queries.ts:9-12`. Admin *reads* (e.g. `listReports`, comment bodies with names) have no database-side check, so one route that forgets the line serves admin data to any player.
- **APP-10** *bloat now*. `useAction` exists only in `groups.tsx:23-38`; 18 other places hand-roll busy/error.
- **APP-11** *bloat now*. Date labels formatted 7 times in two locales (`en-GB` ×5, `en-US` in `settings.tsx:191` and `share.ts:18`). Extends ROADMAP "Repeated formatting".
- **APP-12** *bloat now*. The unknown-payload-version log is copied 5 times though `board-channel.ts:36-39` already checks.
- **APP-13** *risk later*. `cacheComponents` and `partialPrefetching` (from the M00 scaffold, `c66b680`) have no DECISIONS row, though they cause APP-1, APP-2 and three ROADMAP items.
- **APP-14** *risk later (M15)*. `src/lib/api-client.ts:22` parses JSON before checking `ok`; a non-JSON platform error shows "SyntaxError" to players (platform body *unverified*).
- **APP-15** *bloat now*. The approve route builds its own 422 (`api/admin/puzzles/approve/route.ts:29`) beside `handle()`.

### Domain modules (`src/game`, `content`, `friends`, `groups`, `comments`, `reactions`, `insights`, `admin`, `config`)
Clean: every one of the 41 tunables has a reader; no tests of constants or mocks of the code under test; no catch-and-continue; ladder, letter schedule, host counts and `withinTypo` each have one home.
- **DOM-1** *risk later (M16)*. `GAME_ID` is defined in Offbeat's format module (`src/content/puzzle.ts:9`) and imported by 15 non-test files (re-checked), including comments, feed, reactions, board, leaderboard, streak, ledger, Me. `board.ts:16`'s `Ended` type is Offbeat's sudden death inside the friends module.
- **DOM-2** *risk later (M16)*. M16 still says format 2 (`:77`) and that the offensive-word list is "still to be chosen" (`:56`), though LDNOOBW is in SOURCES.md:56 and `src/game/ldnoobw-en.ts`.
- **DOM-3** *bloat now*. The streak's played-day CTE is written in `streak.ts:12-17` and again in `me.ts:44-49`; Me runs both.
- **DOM-4** *risk later (M16)*. Me's "All games" totals are Offbeat-only by query (`me.ts:1-3`); `Stats.average` (questions survived) and ROADMAP Later's "average score" are different numbers with one word.
- **DOM-5** *risk later (any format bump)*. `private.category_questions` (learning_from_misses.sql:225) and `pooledCounts` (`ledger.ts:73`, re-checked) silently skip non-format-3 days, while other readers raise. A format 4 would drop out of bonuses and miss counts with no error.
- **DOM-6** *risk later (M16 16a)*. `normalize` and LDNOOBW sit in Offbeat modules; M16 plans its own list and punctuation rule (S19) and hasn't decided dictionary-vs-answer-base, so game 2 could grow a second of each.
- **DOM-7** *risk later (M15 15a)*. `content/bank.json` holds all 82 questions' host banks in git. M13-13d:31 says it moves private "with the drafts in M15 15a"; 15a never mentions `bank.json` (0 hits, re-checked). 15a's "empty `content`" check would remove the bank with no new home for `readBank`, `npm run draft` or `content:validate`, and the 30-day gap check (`scripts/draft.ts:306`) and bank page's "uses" (`src/admin/bank.ts:25-44`) read past days from the folder 15a removes. Extends ROADMAP "The puzzle drafts are public".
- **DOM-8** *bloat now*. "20 seconds" is UI copy in `game.tsx:114,170` and `offbeat.tsx:198`; its one home is `private.question_deadline`, and the client never receives the duration.
- **DOM-9** *bloat now*. `NAMED = 3` (`src/comments/preview.ts:6`, re-checked) sits outside `tunables.ts`. "Offbeat" has no display-name constant (~15 UI strings, `share.ts:20`).
- **DOM-10** *bloat now (small)*. Ladder points recomputed in `runs.ts:117` beside `scoreRun`'s `ladder`; `FINISHED` re-typed as an SQL literal in `ledger.ts:21`; "survived" counted in three places.
- **DOM-11** *risk later*. `isAdmin` in the insights module, imported by the profile route (see APP-9).

### Scripts, e2e, CI
- **TOOL-1** *bloat now*. `.github/workflows/ci.yml:5-7` is `on: push:` + `pull_request:` unfiltered (re-checked); each PR commit runs `check`, `db`, `e2e`, `secrets` twice. The file's comment justifies `push` only for the secret scan.
- **TOOL-2** *bloat now*. No `typecheck` script; docs give `npx next typegen` then `npx tsc` 77 times in 35 files, with a stale-`.next/dev` trap. `next build` already type-checks the project (`05-config/02-typescript.md:39`; coverage of `scripts/`, `e2e/` *unverified*).
- **TOOL-3** *bloat now*. `npm run test:sql` and `npx supabase test db` both documented (51 vs 23 doc hits).
- **TOOL-4** *bloat now*. Hand chores in HANDOFF: stack catch-up, `.env.local` (CI writes it by `sed`; `src/test/local-stack.ts:18-19` parses the same output by regex), clearing `private.auth_attempt`, making an admin (also inlined 10 times in e2e), and hand-inserting `schema_migrations` rows.
- **TOOL-5** *risk later (any non-local load)*. `scripts/base.ts:705-712` (`localClient`, used by `draft.ts`) checks `new URL(url).hostname` then passes the whole URL as `connectionString`. Re-checked: for `postgresql://u:p@127.0.0.1:54322/postgres?host=db.example.com` the guard sees `127.0.0.1`, pg's parser gives `db.example.com`. DECISIONS.md:32 forbids exactly this ("never a `connectionString`", any query parameter rejected) and the app follows it via `src/config/env.ts`.
- **TOOL-6** *risk later (M15)*. The 2026-10-26 decision says the hosted base loads everything, but the only loader refuses non-local hosts and no M15 ticket says how it's loaded: a write to plor.app from a laptop nobody has designed.
- **TOOL-7** *risk later*. Reviewed snapshots (`data/snapshots/`, gitignored) exist only on the Windows PC; `fetch` rewrites manifests and `load` needs an exact checksum, so a lost disk means re-reviewing every set. The human's hand copying stays; this asks only where a durable copy lives.
- **TOOL-8** *bloat now*. Every e2e file builds its own pool with the literal URL (all 17; 35 files repo-wide vs the exported `LOCAL_DATABASE_URL`), its own `afterAll`, and 13 files define their own `player()`; `e2e/players.ts` duplicates `src/test/local-stack.ts`'s Mailpit and IP helpers with different behaviour. Extends ROADMAP "Two e2e files can pick the same player name".
- **TOOL-9** *risk later (CI cost)*. All 78 e2e sign-ins go through the email form and Mailpit; no `storageState` reuse. Extends the flaky-sign-in item.
- **TOOL-10** *risk later*. e2e runs on `next dev` (`playwright.config.ts:14`), not the build that ships; the recorded flakes (Fast Refresh, cold compile, 6.5 s RSC) fit, cause *unverified*.
- **TOOL-11** *risk later (M16)*. `content-validate.ts:22-31` treats every JSON under `content/` as Offbeat format 3; `draft.ts:309-311` and `next.config.ts` name `content/offbeat`; the first game-2 file fails CI.
- **TOOL-12** *risk later (M15 15a)*. 15a's flow (`M15-15a-private-drafts.md:21`) runs `content:plurals` and `content:letters`, retired in 13a-2.

### Docs and process (CLAUDE.md, DECISIONS, ROADMAP, SOURCES, HANDOFF, tickets)
Sizes (`wc -w`): CLAUDE.md 1,415; HANDOFF 3,121 (main) / 3,185 (M13); ROADMAP 13,044, of which Next revision 9,004; DECISIONS 12,263, of which the Log 6,072; milestones/ 145,371. A session starting with M13 and M14 open reads ~7,800 words before ROADMAP.
- **DOC-1** *bloat now*. The two handoffs share 68 identical lines (2,152 words, ~70%); the M13 branch's file heads a section "M14 (this branch…)".
- **DOC-2** *bloat now*. HANDOFF contradicts itself and the repo: M13 HANDOFF says in one paragraph that the Mac stack holds `one_walk` and "exactly main's migrations"; main HANDOFF calls 14a-3b's migration "uncommitted" (merged, PR #85) and says `m12-account` was deleted (it exists).
- **DOC-3** *bloat now*. HANDOFF repeats ROADMAP and ticket history (main :60-73 lists 13a–13e-3 with PRs; :58 is a 1,911-character log of past pushes).
- **DOC-4** *bloat now*. ROADMAP status cells: M00–M11 6–41 characters, M13 1,301, M14 2,734; the row CLAUDE.md asks every session to report has no readable "what's next".
- **DOC-5** *bloat now*. Parent tickets drift: `M14-14b-2-sprout-admin-polish.md:3` says "planned" with most sub-tickets merged; `M14-14b-2b-admin-pages.md:3` says "designing" though built in #89–#91; 14c-1 says N1–N4 open while the handoffs say ask N1–N7 and N1–N6.
- **DOC-6** *bloat now*. CLAUDE.md requires Status and the ROADMAP row updated "before it is merged", but tickets record "merged on green CI", which can only be written after. 60 "PR number / marked done" commits since 10-20; 83 of 133 non-merge commits on main since 10-24 touch only `docs/`.
- **DOC-7** *bloat now*. Next revision is 69% of ROADMAP: 121 open and 34 closed `[x]` items still listed; 38 open items have no owning milestone (19 under "For M12", which is done).
- **DOC-8** *bloat now*. Duplicates (friend requests ROADMAP:83/:98; live-board reconnect flake :120/:130; duplicate-key warning :119/:128) and stale items (:113 `/account`, :274 `account.tsx`, `api/account/route.ts`, :350 retired 10-26..10-28 drafts).
- **DOC-9** *risk later (the next "draft a day")*. The pause on drafting is in HANDOFF (main :55) and `M15-15a-private-drafts.md:33` (P5 (a)), but not in DECISIONS.md:16, which CLAUDE.md's drafting exception points to, describes committing days to `content/offbeat` with no pause (`grep paus` finds only the Supabase Free-plan line; re-checked). A session told to draft would publish a day's host answers.
- **DOC-10** *bloat now; risk later (launch)*. The hosted push sequence (worktree of `origin/main`, dry run, push, `migration list`, `test db --linked`) has been hand-run at least five times; HANDOFF tells sessions to hand-insert `schema_migrations` rows. Extends ROADMAP "From 13e-3".
- **DOC-11** *risk later (every parallel stream)*. CLAUDE.md has no rule for parallel sessions, two machines or the shared stack; "message the other session" appears 7 times across the handoffs, and "most recently updated wins" fails because each handoff defers to the other.
- **DOC-12** *bloat now*. Five fully merged branches still exist (re-checked, 0 commits ahead of main each): `origin/m12-account`, `origin/m15-launch-readiness`, `origin/m16-game-2`, local `claude/m14-settings-900486`, local `m12-account`. They make CLAUDE.md's first `git branch -a` check read as "M15 and M16 are open".
- **DOC-13** *bloat now*. DECISIONS rows carry provenance and 26 "(Recommended)" quotes; six rows are 1,897–3,341 characters, so the rule is buried in how it was chosen.
- **DOC-14** *bloat now*. `docs/survey/` has no reader; `M02-2g-survey.md` cites deleted `scripts/survey-score.ts` and `src/game/suggest.ts`.
- **DOC-15** *risk later (games 2–6)*. Each sub-ticket today touches its ticket, the parent, ROADMAP, HANDOFF and Next revision; M14 alone has 16 ticket files. A stream per game multiplies the edits and the cross-branch conflicts (projection, *unverified*).

### Future collisions (cross-cutting; ranked by cost × how soon)
Grep sizes: 15–16 non-test `GAME_ID` importers (M16 lists 7); 42 non-test files touch an Offbeat-shaped name; 17 of 39 migrations carry `game_id`; 15 of 24 pgTAP files and 14 e2e files mention offbeat.
- **FUT-1** *M15 anonymous play (hard to reverse)*. 45 routes use `requireUserId`, which accepts any verified `sub` (`src/lib/auth.ts:30-40`), so guests would get friends, comments and groups unless gated. A guest run can't merge into an account that already played: run PK `(user_id, game_id, puzzle_date)`, 7 FKs with no `on update cascade`, `plor_app` can't update append-only tables, and `check_run_event` refuses re-inserted past events. Supabase's `is_anonymous` behaviour *unverified*.
- **FUT-2** *M15 load*. Settle-on-read: `src/friends/leaderboard.ts:98` calls `settleRuns` on every read (re-checked), which runs the unindexed `pooledCounts` scan; at 00:00 every client settles overlapping circles and `on conflict do nothing` discards the duplicates. Extends the deferred `pooledCounts`/index items.
- **FUT-3** *M15 load*. Each answer's transaction fans out to every friend (DB-10); latency inside the 20 s window grows with friend count, which friend requests will raise.
- **FUT-4** *14c-1 N2*. Keeping `game_id` is a strings-only change; migrating it is a trigger-bypassing rewrite of every started day (DB-11). Either way the display name needs one home before game 2 brings a second.
- **FUT-5** *M16 16b (hard to reverse)*. `run_status`, `check_run_event`, `check_question_open` enforce sudden death, strict order and 20 s for every `game_id`; every social feature gates on `FINISHED` (`src/game/status.ts:9`, used by comments, feed, reactions, board, leaderboard, ledger, stats, the broadcast trigger and `record_miss`).
- **FUT-6** *M16; M15 15a*. `approve_puzzle` raises OB009 for anything but format 3, for every game (subsets.sql:307); `format = '3'` stands in for "is Offbeat" in `resolve_answer`, `category_questions`, `pooledCounts`; `Puzzle` is typed `{format: 3; game_id: typeof GAME_ID}`. 15a's planned `save_draft` would copy the single-validator shape unless it dispatches on `game_id`.
- **FUT-7** *M16 16e; average score*. The ledger is per game, but only Offbeat's scorer settles it and only for players someone's board shows, so per-day percentiles (M16 S17) can't come from it; `bonus` is Offbeat's rarity bonus; a run left at a reveal is never settled.
- **FUT-8** *M16 sizing*. The ticket's inventory is from 2026-10-22: 7 importers vs 15–16 today, plus `/api/offbeat`, `src/game/offbeat.ts`, `src/app/offbeat.tsx`, `/offbeat/how-to-play`.
- **FUT-9** *games 3–6*. One `run_event` per index with a single `matched` (no multi-guess); strict order and per-question 20 s (no "one timer, many words"); no sequence dependence (word chain); stolen letters are the inverse of bonus letters; no abandoned state for untimed runs; the leaderboard hides a day while the viewer is `in_progress` (`leaderboard.ts:114`).
- **FUT-10** *M16 16a*. The base is a graph of things; the dictionary is a flat word list. Without a decision, 16a adds a second import path, normalizer and offensive list, and a second large dataset on the Free plan's 500 MB.
- **FUT-11** *M16; 14c-1*. Comments and reactions must belong to the author's run of that game (FKs to `private.run`); the thread is per `(game_id, puzzle_date)`; a "shared feed" across games has no owner run or unlock rule; the streak counts only Offbeat days.
- **FUT-12** *friend requests + blocking*. Who-sees-whom is in `circle.ts` and both plpgsql broadcasts (DB-14); group threads show every member, so a block has no defined effect in a group.
- **FUT-13** *automatic puzzles*. No scheduler (`vercel.json` has no crons; ledger designed around "no scheduler"); `approve_puzzle` needs a human admin row; drafting and imports are local-only. Each is a DECISIONS change.
- **FUT-14** *smaller Later items, no blocker*. Avatars need a profile column and a payload/`PROTOCOL_VERSION` bump; coins need their own append-only ledger (the points ledger is per run per day); the reaction set is in a CHECK and `tunables.ts`; invite-code shape is in SQL and a regex; `src/proxy.ts:41`'s matcher doesn't exclude a manifest or service worker (*unverified* effect); friends' typed misses aren't LDNOOBW-checked before display.

---

## Answered (human, 2026-10-26, guided questions on the urgent three)
- **13-α (TOOL-5):** built as M13 13e-5 item 7 ("fold into 13e-5"); the hosted load waits for M15, connecting as `postgres` ("Hosted too, guarded", "Guard now, hosted in M15", "postgres, recorded").
- **DOM-7 (the bank):** the bank stays public ("Stay public") and the 82 banks in history are accepted for the beta ("Accept for the beta"); 15a is deferred to M15 ("Defer to M15").
- **DOC-9 (the pause):** lifted rather than recorded ("Lift the pause"), so DECISIONS' drafting row is right as it stands. All in the DECISIONS.md Log, 2026-10-26.

## Proposed sub-tickets, by milestone (for the human's approval)
Each needs its own guided-questions round before design (CLAUDE.md, "Ask before designing"). **Security** marks a change CLAUDE.md requires to be proposed and recorded in DECISIONS.md first. Numbers in brackets are findings.

### M13 (this branch)
- **13-α The scripts connect like the app** [TOOL-5]. **Security.** `localClient` builds its client from `src/config/env.ts`'s parsed fields. Who uses it: every `npm run base` / `npm run draft`. Breaks without it: a `?host=` URL writes the answer base to a remote host without verified TLS. Removes: `localClient`'s own URL parsing.
- **13-β One membership predicate** [DB-2, DOM-5 for `category_questions`]. Like 13e-5's one walk. Fits 13e-5 or 13e-6. Removes: two copies of the predicate.
- **13-γ The base's bookkeeping** [DB-6, DB-7]. `record_miss` raises instead of returning; `base_log` either surfaced on the audit page or cut to rows nothing else holds. Question for the human: do you read `base_log`?

### M14 (owned by the M14 session; list left for it in the shared notes, not edited here)
- **Into 14c-1** [FUT-4, DB-11, DOM-9, APP-5, DOM-8]: the evidence for N2 (favours keeping `game_id`); one display-name and route constant beside `GAME_ID`; the shared screens that still say "Offbeat" (`leaderboard.tsx:106-107`, `comments.tsx:177`, `preview.ts:25`); How to play's "20 seconds" sent from the server or tied by a test. Also fix the N1–N4 vs N1–N7 status (DOC-5).
- **Into 14b-2c-4, "tests, comments and repeated code"** [TOOL-8, DOM-3, DOM-10, APP-10, APP-11, APP-12, APP-15, DB-4's TS copies, DB-13, APP-3]: one e2e fixture module; the streak CTE once; `useAction` shared; one date-label module; the version log once; `AppError.problems`; one SQL "answered in its day" function; the redundant pgTAP grant copies and one generic `search_path` check; one run-state source per page.

### M15 (launch)
- **Into 15a, private drafts** [DOM-7, TOOL-12, DOC-9, FUT-6]: give `bank.json` and the drafting history a private home; replace the retired scripts with `npm run draft`; record the drafting pause in DECISIONS' "Puzzle drafting" row now (a docs change, so the next drafting session doesn't publish answers); have `save_draft` dispatch on `game_id`.
- **The load test's shape** [FUT-2, FUT-3, DB-10, APP-2, APP-3, APP-4, APP-14]: model every open page firing at the reset, overlapping circles settling at once, large friend circles, tab-switch reconnects and the midnight Friends re-key; check non-JSON errors. Any spreading of the reload needs a human number.
- **Anonymous play** [FUT-1, APP-7, DB-9]. **Security.** Decide "link only" vs "merge" first; one `requirePlayer`-style gate in `src/lib/auth.ts`; read Supabase's anonymous rate limits; decide whether aggregate counts survive deletion.
- **The hosted database before players** [DB-1, DOC-10, TOOL-6, TOOL-7]. **Security** for the base load. One migration baseline (needs a DECISIONS entry and `migration repair` on plor.app); one npm script for the hosted push; a designed path for loading the hosted base; a durable home for the snapshots.
- **Admin checks in one place** [APP-9, DB-5, DB-8, DOM-11]. **Security.** `requireAdmin` beside `requireUserId`; guarded functions all raise OB007; decide whether admin audit records cascade with the admin's account, and add a pgTAP check that user columns cascade.

### M16 (game 2)
- **Before 16b's design round: refresh the boundary inventory** [DOM-1, DOM-2, FUT-8, DB-12, APP-5, TOOL-11]: from a fresh grep; format 3; LDNOOBW already chosen.
- **New open decisions for the M16 ticket** (the human's, before code): the per-game "finished" contract and run model [FUT-5, DB-3, FUT-9]; format numbers per game and approval dispatch [FUT-6, DOM-5]; percentiles from runs or a daily settle [FUT-7]; dictionary beside the base, reusing `normalize` and LDNOOBW [FUT-10, DOM-6]; streak and feed per game or per Plor, and which run unlocks the shared feed [FUT-11, APP-6, DOM-4]; a signed-in route-group layout and a DECISIONS row for `cacheComponents` [APP-1, APP-13]; a `game_id` registry [DB-11].

### Later tickets (a note each, for when they're drafted)
- Friend requests and blocking: one audience function used by `circle.ts` and both broadcasts; what a block means in a group [DB-14, FUT-12].
- Profile pictures and frames: one "player as shown" view and type [APP-8, FUT-14].
- Automatic puzzles: a scheduler, a non-human approver and the hosted base are three DECISIONS changes [FUT-13].
- Coins, reactions, invite links, PWA, friends' misses: their touch points [FUT-14].

### Process (no milestone; the human's call, since most touch CLAUDE.md)
- **Handoff** [DOC-1, DOC-2, DOC-3, DOC-11]: one section per branch holding only open state; shared facts (hosted DB, machines) once; a CLAUDE.md rule for parallel sessions and the shared stack, and fixed "most recent wins" wording.
- **Status in one place** [DOC-4, DOC-5, DOC-6, DOC-15]: ROADMAP one short line per milestone; sub-ticket lists only in the milestone ticket; the merge itself recorded by git, so the "before it is merged" rule stops costing a follow-up commit.
- **Next revision pruning** [DOC-7, DOC-8]: delete `[x]` rows on close; re-home or close "For M12" and the ownerless groups; merge the three duplicate pairs and close the three stale items.
- **DECISIONS rows state the rule, with a ticket link** [DOC-13].
- **Scripts for the repeated chores** [TOOL-2, TOOL-3, TOOL-4]: `npm run typecheck`; docs use `npm run test:sql` only; local setup/env, make-admin and clear-limits commands.
- **CI once per commit** [TOOL-1]; **e2e cost** [TOOL-9 session reuse, TOOL-10 dev vs build]: both need the human's call on what e2e must cover.
- **Delete the five merged branches** [DOC-12] and **`docs/survey/`** [DOC-14].

## Review
The `reviewer` agent checked about 25 citations and counts against `main` and the checkout (2026-10-26). Blocking, fixed: DOC-9 said the pause was only in HANDOFF; it is also in the 15a ticket. Also fixed: HANDOFF pointed to the side-session notes, outside the repo, for M14's share; it now points to this file's "M14" section. Not fixed (accuracy notes on this report): `origin/main` moved to `db7f736` after the read, a merge with an identical tree to `e4c9f88`; DB-1's 40 migrations count `one_walk`, FUT's 39 don't; APP-8's `coalesce` lines span 8 files by the reviewer's grep, not 7; DOM-10's "survived" copies extend ROADMAP's "worked out twice" item, which itself looks stale (`survivedCount` is already shared); DOC-2's `m12-account` line may describe only the Windows checkout. Not checked by the reviewer: TOOL-2, TOOL-8, TOOL-9, DOC-1, DOC-4, DOC-6, DOC-7, DB-13, APP-3, APP-5, FUT-9 counts.

## Removes
Nothing: an audit report with no code. Its proposals list what each would remove. This file can be deleted once its proposals are approved or closed (git keeps it).
