# M16 16d — Playing game 2

**Status:** draft, waiting on the human's approval.

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

## What Claude measured (2026-11-07)
**H4, the dictionary in Postgres.** In a temporary table on the local stack, with the 259,968 pairs. *Hypothesis:* 25 to 40 MB, and example words well under 100 ms. *Disproved by:* over 100 MB, or a lookup a player would notice. *Result:* `total: 26 MB`, `loadMs: 2431`, `lookupMs: 0.53`, `examplesMs: 14.05`. Held. The Free plan is 500 MB (ROADMAP). This local database is 379 MB, which isn't hosted's number, so what's left on plor.app is *unverified*, and the human asked to hear of it (ROADMAP, "Warn the human").

## Design (Claude, for approval)
**The record.** `src/platform/game.ts` gains game 2's name and address: `{ id: "substrings", name: "Game number 2", path: "/play2" }`.

**`private.dictionary_word`:** (`word_key`, `spelling`, `plain`, `everyday`), keyed on both of the first two. `plain` is the spelling with its accents off, for the shown spelling's steps. Only the loader writes it; `plor_app` reads none of it directly, as the judge and the example words go through functions. `npm run base -- load dictionary` replaces it from the snapshot in one transaction, so a day never sees half a dictionary (ROADMAP, For M16). A rebuild changes what counts on approved days (16b, answer 11). CI has no snapshot, so tests load a small list of their own.

**`private.round_word` and `private.round_reject`,** as 16b set them: one accepted word a round, no word twice in a run, and rejected tries' times with no word. RLS: each player reads and adds only their own.

**The round rules.**
- `check_question_open` and `private.run_status` choose by `game_id`, with game 1's branches unchanged (audit, DB-3, FUT-5).
- Round k+1 opens only once round k has a word or its 20 seconds have passed, never past round 7.
- A run ends after round 7's word or timeout.
- `run_status` keeps `FINISHED`'s meaning, so the social gates keep working.

**The judge,** `private.judge_word`, `security definer`, called by the try route with the typed text, its letters-only key and its cleaned text, computed in `src/game/substring-try.ts`. As 16b set: a row lock on the run first, so tries are judged one at a time. In order:
1. An empty key returns `empty`, with no lockout (answer 4).
2. A retry of the round's stored word returns it. A different word for a filled round is `already_answered`.
3. The round is open and within its 20 seconds, else `time_up`.
4. Within 0.5 s of the round's last rejection is `locked`, and isn't judged.
5. The key is in the dictionary, else `not_a_word`. It holds the round's letters, else `needs_letters`. It isn't used this run, else `already_used`. Each writes a rejection and locks (answer 4).
6. It stores the word with its shown spelling, by the four steps in DECISIONS.md, and returns it.

**The routes,** `/api/substrings`: `GET` today's state, `start`, `try`, `next`, each with what may be shown and no more: a round's letters are sent only once it's open (answer 6), and the word list never leaves the server. After the run, the state adds 3 everyday words for each missed round, shortest first (answer 5).

**The screen,** `/play2`, `src/app/substrings.tsx`, plain and using the kit, with no Moonbrew: the letters, the 20-second clock, the bonus letter, a text box that stays usable through the lockout, and the reason a try failed. Next between rounds. At the end, the plain results of answer 5, with no points (16e). A day with no game 2 puzzle says so. Signed out goes to sign-in, as `/play` does.

**PRs.** 16d-1: the record, `dictionary_word`, the load. 16d-2: the tables, the round rules and the judge. 16d-3: the routes and the screen.

## Acceptance criteria
16d-1:
- [ ] `npm run base -- load dictionary` loads 259,968 rows in one transaction, and a failed load leaves the old rows.
- [ ] `dictionary_word`'s size on the local stack is in the Evidence, and `plor_app` can't read or write it directly, by pgTAP.

16d-2:
- [ ] Round k+1 can't open before round k has a word or its 20 seconds have passed, nor past round 7, by pgTAP. Game 1's tests pass unchanged.
- [ ] The judge's every outcome is tested: `empty`, a stored retry, `already_answered`, `time_up`, `locked`, `not_a_word`, `needs_letters`, `already_used`, accepted.
- [ ] Parallel tries can't pass the lockout: a test sends tries at once.
- [ ] A player can't read or add another's words, by pgTAP.
- [ ] A timed-out round has no `round_word`, and the run still ends after round 7 (S7).
- [ ] The shown spelling's four steps are tested through the judge: `cafe`, `caf3e`, `well known`, `he's`.
- [ ] The letters-only key is tested: `app3le`, `well---known`, `well known`, `it´s`, a backtick, `123`.

16d-3:
- [ ] A round's letters aren't in any response before it opens, checked on the routes.
- [ ] Example words aren't in any response before the run ends.
- [ ] A whole day played at `/play2` in a browser: an accepted word, each reason shown, a lockout with the box still usable, a timeout, Next, the results.
- [ ] A signed-out visit to `/play2`, and a day with no puzzle, each behave, by e2e.
- [ ] Today, `/play` and game 1's run don't change: game 1's e2e passes unchanged.

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
2. 16d-1, then 16d-2, then 16d-3, each tests first, with a review and a PR.

## Removes
- `check_question_open` and `run_status` assuming every game is game 1's.
- From ROADMAP, H4 and the two 16b items this settles: the load's transaction, and what counts as a rejection.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
