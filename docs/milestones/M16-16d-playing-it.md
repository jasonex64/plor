# M16 16d — Playing game 2

**Status:** in progress: approved ("Approve, build it", 2026-11-07). 16d-1, the database, is done (PR #162, merged on green CI, 2026-11-07); 16d-2, the record, the routes and the screen, is in review.

## Goal
Make a stored day of game 2 playable from start to end at `/play2`, on a plain screen, with every try judged by the database.

## Who uses it / what breaks without it
- Used by: every game 2 player, and 16e, which scores `round_word`.
- Breaks without it: 16c stores days nobody can play, and the beta can't test game 2.

## Source
- `docs/DECISIONS.md`, Game 2, and Run events.
- `docs/milestones/M16-16b-run-model-and-format.md`, "Run model": what's built here, and its security row.
- `docs/milestones/M16-game-2-substrings.md`, S5 to S7, S10, S19, S20, S21.
- `docs/milestones/M16-16c-a-day-of-game-2.md`: the stored day.
- The audit, `docs/audits/2026-10-26-codebase-audit.md`: DB-3, FUT-5, on the shared run rules.

## The human's answers (2026-11-07)
1. Name and address: "Game number 2, /play2 (Recommended)". Both are working ones, as for game 1.
2. Reaching it: "Address only, for now (Recommended)". Today doesn't change until 16f.
3. A rejected try: "Say why (Recommended)": not in the dictionary, needs the letters, or already used.
4. What locks: "Only real tries (Recommended)". An empty box, or one with no letters, does nothing. A wrong word or a used word locks for 0.5 seconds.
5. The end of a run: "Your words, plus examples (Recommended)". Each round's letters and the player's word, and 3 everyday words for a round they missed, sent only after the run.
6. Between rounds: "Hidden until Next (Recommended)". The letters appear with the clock.
7. **Security,** the three things beyond 16b's tables: "Yes, approved (Recommended)". (1) `plor_app` may run the judge. (2) Each player sees and adds only their own words. (3) `check_question_open` learns game 2's rule, game 1's unchanged.
8. This ticket: "Approve, build it".

**A correction to answer 7, part (2):** Claude's question called these database rules. The app connects as one role, `plor_app`, as in game 1, so the database can't tell players apart: it's the routes, using the signed-in player's ID, that keep each to their own words. Built tighter than asked in one way: `plor_app` can read `round_word` but write neither it nor `round_reject`, so a word can only be added through the judge. Told to the human in the report on this PR.

## What Claude measured (2026-11-07)
**H4, the dictionary in Postgres.** In a temporary table on the local stack, with the 259,968 pairs. *Hypothesis:* 25 to 40 MB, and example words well under 100 ms. *Disproved by:* over 100 MB, or a lookup a player would notice. *Result:* `total: 26 MB`, `loadMs: 2431`, `lookupMs: 0.53`, `examplesMs: 14.05`. Held. The Free plan is 500 MB (ROADMAP). This local database is 379 MB, which isn't hosted's number, so what's left on plor.app is *unverified*, and the human asked to hear of it (ROADMAP, "Warn the human").

## Design (Claude, for approval)
**`private.dictionary_word`:** (`word_key`, `spelling`, `plain`, `everyday`), keyed on both of the first two. `plain` is the spelling with its accents off, for the shown spelling's steps. Only the loader writes it; `plor_app` reads none of it directly, as the judge and the example words go through functions. `npm run base -- load dictionary` replaces it from the snapshot in one transaction, so a day never sees half a dictionary (ROADMAP, For M16). A rebuild changes what counts on approved days (16b, answer 11). CI has no snapshot, so tests load a small list of their own.

**`private.round_word` and `private.round_reject`,** as 16b set them: one accepted word a round, no word twice in a run, and rejected tries' times with no word. `plor_app` reads `round_word`, as the status view needs it, and writes neither.

**The round rules.**
- `check_question_open` and `private.run_status` choose by `game_id`, with game 1's branches unchanged (audit, DB-3, FUT-5).
- Round k+1 opens only once round k has a word or its 20 seconds have passed, never past round 7.
- A run ends after round 7's word or timeout.
- `run_status` keeps `FINISHED`'s meaning, so the social gates keep working: a finished game 2 run is `survived`.
- A game 2 run sends no live-board message: friends' boards show game 1's state and would read it as playing that (Claude, found building it). Game 2's board comes with 16f.

**The judge,** `private.judge_word`, `security definer`, called by the try route with the typed text, its letters-only key and its cleaned text, computed in `src/game/substring-try.ts`. As 16b set: a row lock on the run first, so tries are judged one at a time. In order:
1. An empty key returns `empty`, with no lockout (answer 4).
2. A retry of the round's stored word returns it. A different word for a filled round is `already_answered`.
3. The round is open and within its 20 seconds, else `time_up`.
4. Within 0.5 s of the round's last rejection is `locked`, and isn't judged.
5. The key is in the dictionary, else `not_a_word`. It holds the round's letters, else `needs_letters`. It isn't used this run, else `already_used`. Each writes a rejection and locks (answer 4).
6. It stores the word with its shown spelling, by the four steps in DECISIONS.md, and returns it.

**The record.** `src/platform/game.ts` gains game 2's name and address: `{ id: "substrings", name: "Game number 2", path: "/play2" }`.

**The routes,** `/api/substrings`: `GET` today's state, `start`, `try`, `next`, each with what may be shown and no more: a round's letters are sent only once it's open (answer 6), and the word list never leaves the server. After the run, the state adds 3 everyday words for each missed round, shortest first (answer 5).

**A run belongs to its day** (Claude, found building it; the human can overrule): a run left unfinished at midnight stops there, unlike game 1's. Game 1's clock ends a left run, but a game 2 run left between rounds has none, so it would otherwise block the next day.

**The feed:** `/play2` shows no feed column, as `/play` doesn't (`feedBeside`, `src/app/home.tsx`), since the feed is game 1's until 16f. Game 1's clock bar stays, so a question left in play keeps its clock (M14 L18).

**The screen,** `/play2`, `src/app/substrings.tsx`, plain and using the kit, with no Moonbrew: the letters, the 20-second clock, the bonus letter, a text box that stays usable through the lockout, and the reason a try failed. Next between rounds. At the end, the plain results of answer 5, with no points (16e). A day with no game 2 puzzle says so. Signed out goes to sign-in, as `/play` does.

**PRs.** 16d-1: `dictionary_word`, the load, the tables, the round rules and the judge. 16d-2: the record, the routes and the screen. The first plan's three became two, as the table's first caller is the judge.

## Acceptance criteria
16d-1:
- [x] `npm run base -- load dictionary` loads 259,968 rows in one transaction, and a failed load leaves the old rows.
- [x] `dictionary_word`'s size on the local stack is in the Evidence, and `plor_app` can't read or write it directly, by pgTAP.
- [x] Round k+1 can't open before round k has a word or its 20 seconds have passed, nor past round 7, by pgTAP. Game 1's tests pass unchanged.
- [x] The judge's every outcome is tested: `empty`, a stored retry, `already_answered`, `time_up`, `locked`, `not_a_word`, `needs_letters`, `already_used`, accepted.
- [x] Parallel tries can't pass the lockout: a test sends tries at once.
- [x] `plor_app` can't write a word or a rejection, by pgTAP; a word goes through the judge alone. Each player's own words are the routes' to hold to (16d-2).
- [x] A game 2 run sends no live-board message, by pgTAP.
- [x] A timed-out round has no `round_word`, and the run still ends after round 7 (S7).
- [x] The shown spelling's four steps are tested through the judge: `cafe`, `caf3e`, `well known`, `he's`.
- [x] The letters-only key is tested: `app3le`, `well---known`, `well known`, `it´s`, a backtick, `123`.

16d-2:
- [x] Each route uses only the signed-in player's ID, so no player reaches another's run or words.
- [x] A round's letters aren't in any response before it opens, checked on the routes.
- [x] Example words aren't in any response before the run ends.
- [x] A whole day played at `/play2` in a browser: an accepted word, each reason shown, a lockout with the box still usable, a timeout, Next, the results.
- [x] A signed-out visit to `/play2`, and a day with no puzzle, each behave, by e2e.
- [x] Today, `/play` and game 1's run don't change: game 1's e2e passes unchanged, by CI's whole suite on the PR, with `offbeat`, `approve-and-play` and `shell` run here.

## Out of scope
- Points, the bonus letter's effect, boards and the ledger: 16e, with S15 and S17.
- Today, Me, comments, the feed and the shared streak: 16f.
- Moonbrew and the shown name: 16g.
- Pushing anything to plor.app, or committing real days.

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 7 rounds | The run | Human, 2026-11-06, "Always 7" |
| 20 seconds a round | The clock | Human, 2026-10-22, S6: "for now" |
| 0.5 s lockout | The judge | Human, 2026-11-06: "0.5 seconds" |
| 3 example words | The end of a run | Human, 2026-11-07: "Your words, plus examples (Recommended)", whose option said 3 |

## Plan
1. The human approves this ticket.
2. 16d-1, then 16d-2, each tests first, with a review and a PR.

## Removes
- `check_question_open` and `run_status` assuming every game is game 1's.
- From ROADMAP, H4 and the two 16b items this settles: the load's transaction, and what counts as a rejection.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| 16b: `plor_app` reads and inserts `round_word` and `round_reject`, and reads `dictionary_word` | It reads `round_word` and nothing else there | Narrower: the judge and `round_examples` are the only ways in |
| 16d's Design: `dictionary_word (word_key, spelling)` in 16b | With `plain` and `everyday` | The shown spelling's steps and answer 5's examples need them. In the approved Design |
| DECISIONS.md, Game 1: a run started before midnight can be finished after it | A game 2 run stops at midnight | No clock ends a run left between rounds, so it would block the next day |
| 16b's outcomes | With `no_run`, and `empty` | A try on no run, and answer 4 |
| 16b's judge takes "the try as typed and its `normalize` form" | The letters-only key, the cleaned text and that text with accents off | DECISIONS.md, Game 2, as 16a-2 changed it |

## Evidence
### 16d-2
**Tests:** the first route and e2e tests were written alongside the routes, not before them, so they weren't seen to fail first; the review's were added after, and it showed by mutation what they had missed. `npx vitest run src/app/api/substrings --no-file-parallelism`: 20 passed. `npx playwright test e2e/play2.e2e.ts`: 5 passed: signed out, no puzzle, a whole day with each reason and both ways a clock ends, a tab left between rounds, and Today showing no second game. `npx playwright test e2e/play2.e2e.ts e2e/offbeat.e2e.ts e2e/approve-and-play.e2e.ts e2e/shell.e2e.ts`: 21 passed. `npm test`: 603 passed. `npx supabase test db`: `Files=36, Tests=616`, PASS. `npm run build` and `check:client-bundle` pass, and the build lists `/play2`.

**Seen on screen,** with the real dictionary, at 1280 and 390 wide, from throwaway tests: `Plant` accepted and shown `plant`; `well---` refused with "Needs the letters nt."; a missed round offering `viola, savior, violas`. They showed two top-level headings, now one.

### 16d-1
**Tests:** written first, and they failed (`relation "private.dictionary_word" does not exist`; `Cannot find module './substring-try'`). `npx supabase test db`: `Files=36, Tests=616`, `Result: PASS`, with game 1's test files unchanged but one: `plor_app_role.test.sql`'s exact grant list gains the three approved grants, which is that test's purpose. `npx vitest run src/game/substring-try.test.ts src/game/substring-judge.db.test.ts --no-file-parallelism`: 22 passed. `npm test`: `Test Files 53 passed (53)`, `Tests 603 passed (603)`. `npx eslint` and `npx tsc --noEmit -p .` are clean.

**Parallel tries:** 8 at once gave `not_a_word` once and `locked` 7 times, with 1 rejection stored.

**The load:** `npm run base -- load dictionary`: `LOADED dictionary: 259968 spellings`, and the table holds `259968|254477|40111|26 MB` (rows, keys, everyday rows, size). A forced failure leaves the old rows, by test.

**The board check can fail:** with the early return taken out, in a rolled-back transaction, a game 2 run writes 1 message.


## Review
- Blocking findings and how each was fixed (16d-2, the `reviewer` agent, 2026-11-07):
  1. A tab left between rounds past midnight stranded the player: a refusal meaning the screen is behind reads the day again, and any other error is shown, both by e2e. The first fix reloaded on every error, which hid real ones: found on the re-check.
  2. A double submit hid why a word failed behind "Too quick": one try at a time, by e2e.
  3. Focus was lost between rounds, so Enter did nothing and a screen reader heard nothing: Next takes the focus and is described by how the round ended, by e2e.
  4. "Each reason shown ... a timeout" was ticked but not met: "Already used.", a try past the clock, and the clock reaching zero with no reload are all in the e2e now.
  5. Mutations showed paths untested: each player's words are told apart, and Next during round 1, `no_run`, `no_puzzle_today`, `client_outdated`, `already_answered`, `already_used` and a run left yesterday all have tests.
  6. Two exclusions in `home.tsx` weren't in the ticket, and one changed M14 L18: game 1's clock bar is back, and the feed's is in the Design.
- Blocking findings and how each was fixed (16d-1, the `reviewer` agent, 2026-11-07):
  1. A player with a word or a rejection couldn't delete their account: the foreign keys now cascade, as every other child of `run` does, tested through deleting the account.
  2. A second tap on Next raised `OB002`: the trigger lets it through to the route's `on conflict`, tested as a repeat.
  3. A phone's curly apostrophe made "he’s" show `hes`: `cleanedTry` reads it as an apostrophe.
  4. Mutations showed the "four steps" criterion and several rules weren't really tested: `private.shown_spelling` is its own function with each step tested alone, including code-point order; both other rejections are checked to lock; a stored retry past the clock, a word ending round 7 and a run as `plor_app` itself are tested.
  5. `SUBSTRING_LOCKOUT_MS` gave the number a second home with no real caller: removed, with its origin in the SQL.
  6. HANDOFF still said the grants waited on the human: removed.
  The re-check (same agent, same day) found nothing blocking.
- Deferred to ROADMAP "Next revision": the items under "For M16" marked "Found in M16 16d-1 (review)".
