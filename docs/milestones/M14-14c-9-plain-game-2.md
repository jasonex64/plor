# M14 14c-9 — Game 2, plain

**Status:** in review, PR open (approved by the human, 2026-11-10: "approve"; started 2026-11-11, after 14c-8 merged in PR #179)

## Goal
Game 2 plays in the app's own look, at game 1's level of finish, and the village is removed.

## Who uses it / what breaks without it
- Used by: every player of game 2; the closed beta's friends.
- Breaks without it: a phone downloads the village's 48 files (about 10.8 MB) and a 3D library to play a word game (14c-7's page; measured 2026-11-10 by the review session, not re-checked), the village's e2e keep failing on CI (ROADMAP, Next revision; M16 16g-3), and 16f waits.

## The human's answers (2026-11-10, guided questions, the planning session)
Answers 1 to 3 and 5 of `M14-14c-8-plain-game-1.md` apply. For game 2:
6. What the plain game keeps: "also add an how-to-play, just like the first one(and any other discrepancies u think we should add. both games should have similar level of polish),Running score all game,Timer bar,Full-screen play with a close button".
7. Claude's reading of "any other discrepancies", approved with the ticket ("approve"). So both games match:
   - (a) game 2 gets a How to play pop-up, in 14c-8's component, with its own steps;
   - (b) both games show the countdown the same way: the seconds number with the draining bar (so 14c-8's game 1 gains the bar here);
   - (c) both use 14c-8's play frame and ×;
   - (d) game 2's result sentence is a status message for screen readers, as game 1's is;
   - (e) no recap is added to game 2: its result cards already list "Your rounds".

### During the build (2026-11-11, the 14c-9 build session)
8. How to play's four steps, drafted from the rules (`M16-game-2-substrings.md`: S6, S7, S8, S10, S15; `tunables.ts`: `SUBSTRING_ROUNDS`, `SUBSTRING_BONUS_LETTER_POINTS`; `substrings.tsx`, `WHY`): "Use it as written (Recommended)". The steps:
   1. Each round gives you a few letters. Type a word that holds them together, in that order: for "cks", "rocks" or "backspace". 7 rounds, one run a day.
   2. You get 20 seconds a round. Not a word, missing the letters, or used already? Try again. The clock keeps going.
   3. Out of time? That round scores nothing, but your run goes on to the next.
   4. Longer words score more, and each word with the day's bonus letter earns 120 more. At the end, every different letter you've used adds to your bonus.
9. After round 7 the server's run is finished, so `7c94697^` went straight to the result cards and round 7's "You played X: N points" never showed: "Show it, then See results (Recommended)". Round 7's sentence shows as every round's does, with See results in place of Next, as game 1 pauses before its results.
10. Game 1's seconds sat beside the question; the shared countdown (`src/app/countdown-bar.tsx`) puts the number on a row under it with the bar beside: "Row under the question (Recommended)".
11. The bar's track, which the village drew in its own purple (`--track`, no app slot): "Faint accent (Recommended)", `--soft`, with the fill in `--accent`.
12. The first full checks failed 62 db tests, `load_sync.test.sql` (`puzzle_pkey`) and 44 e2e tests. Cause: 14c-8's third full e2e run crossed Pacific midnight, and `screen-readers.e2e.ts` (players `…-ql` to `…-qx`, 08:26 to 08:29 UTC on 2026-11-11) left today's game 1 fixture day and its 9 players, its `afterAll` never having run; `todayPuzzle` (`e2e/puzzle.ts`) then reused the fixture day and never removed it. "Delete them (Recommended)": deleted in the local stack only, in one transaction (9 players, their 8 runs, 1 day).

## Source
- `docs/DESIGN.md`: the app's look.
- The round at `7c94697^` (`src/app/substrings.tsx`, M16 16d): the plain round, its sentences ("You played X: N points, and B for the bonus letter", "Time's up.") and its result cards.
- `docs/milestones/M16-game-2-substrings.md` and `M16-16d-playing-it.md`: the rules and the round's words. How to play's steps come from these rules; their wording is the human's to approve (Plan, step 2).
- `src/brew/brew.tsx` at this ticket's start: the top bar's round and score, the timer bar, the letters-used panel, the `aria-label` "Your word".
- 14c-8: the play frame, the How to play pop-up. SOURCES.md: HTML `<dialog>`, APG Carousel, WCAG 2.2 (4.1.3 for the status message; 1.4.1, the bar never the only sign of time, the number stays).

## Acceptance criteria
- [x] `/play2` shows game 2 in the app's look, named "Game 2": round N of 7, the running score, the letters and bonus letter, the seconds number with its bar, the letters-used panel, the word box, Try.
- [x] After a word or a time-up the result sentence shows at once and Next is focused at once; no step waits on an animation.
- [x] Start is enabled as soon as the page is; nothing reads "Loading the village".
- [x] The play frame and × behave as game 1's; How to play opens as game 1's does, with game 2's steps.
- [x] Game 1 shows the same number-and-bar countdown.
- [x] No rule or scoring change: `npm test`, `npm run test:db`, `npx supabase test db` pass with no test of game 2's rules changed.
- [x] `git grep -il "brew\|village\|three" -- src e2e package.json` prints nothing (but for words unrelated to the village, listed in the Evidence); `public/brew/` is gone; `three` is out of `package.json`; `npm run build` and `npm run check:client-bundle` pass.
- [ ] `npm run test:e2e` passes twice in a row locally and on CI's first run, with game 2's e2e rewritten for the plain round.
- [x] `docs/DESIGN.md` describes the plain round.

## Out of scope
- The shared Today, streak, feed, Me and Share (16f). Any rule change. Any art.

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 7 rounds, the round's seconds, the points | play | unchanged (`M16-game-2-substrings.md`, Numbers) |
| About 10.8 MB in 48 files; three.js about 779 KB (about 200 KB gzip) | what the removal saves | the review session's measuring after `npm run build`, 2026-11-10; re-measured in this ticket's Evidence |

## Plan
1. Bring back `7c94697^`'s round on today's API, inside 14c-8's play frame. Expected: no change needed in game 2's server code; if one is, stop and report.
2. Add the top bar's score, the timer bar (moved to one shared component, used by game 1 too), the How to play steps (drafted from the rules, shown to the human before the PR).
3. Delete the village (Removes); rename the record to "Game 2".
4. Rewrite game 2's e2e; update DESIGN.md; re-measure the build.
5. The `reviewer` agent, then the PR.

## Removes
- `src/brew/` (the scene, the village, the CSS), `public/brew/` (48 files), the `three` dependency, the model credits that go with them.
- `e2e/brew.e2e.ts`'s village tests (the ones failing on CI) and `M16-16g-3`'s open question of how to fix them.
- The village's words ("Toss it in", "Casting the spell…", "Loading the village…") and its Reduce motion branch.
- ROADMAP's Next revision items that only concern the village's drawing (sorted in this PR, listed in the Evidence).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| `7c94697^`: the round plays on the page with the shell's bars | Inside 14c-8's play frame, the bars hidden, × "Back to Today" | Answer 6, "Full-screen play with a close button"; answer 7c |
| `7c94697^`: the round's sentence is a `role="status"` paragraph that Next names by `aria-describedby` | A visible sentence and 14c-8's `StatusMessage`; Next keeps its focus | Answer 7d, one status message as game 1's; read once, not twice |
| `7c94697^`: after round 7 the cards show at once | Round 7's sentence, then See results, then the cards, whose heading takes focus | Answer 9 |
| `7c94697^`: a seconds number only; `8309555`'s game 1: the seconds beside the prompt | One countdown for both games, the number on a row under the prompt with the bar beside it (`countdown-bar.tsx`) | Answers 7b and 10 |
| The village (`src/brew/brew.module.css` at `b4ac330`, `.clock`): the seconds inside the bar, the track in its own purple `--track` | The number beside the bar in `--text`; the track `--soft`, the fill `--accent` | The village's colours have no app slot, and the tokens over the accent fill lack contrast; answer 11 |
| `7c94697^`: no score during the round | The village's top bar: "Round N of 7" and Score, its values from `brew.module.css` at `b4ac330` (`.top`, `.score`) | Answer 6, "Running score all game" |
| 14c-6d / 14c-8: How to play has game 1's four steps only | `HowToPlay` takes its game's steps; game 2's four (answer 8), on its card and in the frame | Answers 7a and 8 |
| `7c94697^`: the lockout was stubbed in the village's e2e | The real lockout runs in `play2.e2e.ts`, as at `7c94697^` | The stub's reason, the village slowing CI, is gone |

## Evidence

### Criterion 7's grep (`git grep -il "brew\|village\|three" -- src e2e package.json`, after step 3)
Village leftovers removed from `src/`: comments naming the village, `brew.module.css`, `src/brew/brew.tsx` or Moonbrew in `src/app/countdown-bar.module.css`, `countdown-bar.tsx`, `substrings.module.css` and `substrings.tsx`; `reduceMotion` in `src/app/shown.ts` (exported for the village's change listener, now folded into `lessMotion`). `package.json` had only the two dependencies. Left for step 4: `e2e/brew.e2e.ts` and `e2e/play2.e2e.ts` (the village's tests and "Game number 2"), and `e2e/approve-and-play.e2e.ts`, `audit.e2e.ts`, `live-board.e2e.ts`, `overall-board.e2e.ts`, `screen-readers.e2e.ts`, `settings.e2e.ts` (to be read then; their matches look like the number "three").
Unrelated words in `src/` (the number three, not the village):
- `src/app/layout.tsx`: "three CI runs"
- `src/app/offbeat.module.css`: "Three stats side by side"
- `src/app/race-layout.ts`: "three-letter names"
- `src/app/reactions.tsx`: "Three dots"
- `src/app/settings.module.css`: "three to a row"
- `src/app/shell.tsx`: "The three turn point-down"
- `src/config/tunables.ts`: "all three" (the group-name checks)
- `src/lib/db.ts`: "all three" (the database's three runtimes)
- `src/game/ldnoobw-en.ts`: "threesome", "throating" lists' "three" substring
- tests: `src/app/api/admin/audit/route.db.test.ts` "Three typists", `board/route.db.test.ts` "three players", `comments/group.db.test.ts` "three players", `friends/route.db.test.ts` "three players", `groups/route.db.test.ts` "three of them", `const three`, "one of three joins", `leaderboard/overall.db.test.ts` "Three closed days", `leaderboard/substrings.db.test.ts` "the three others", `offbeat/route.db.test.ts` "three players", `profile/username/route.db.test.ts` "three players", `src/app/race-layout.test.ts` "Three players", `src/game/misses.db.test.ts` "three players"

### ROADMAP Next revision, sorted (Removes)
Judged item by item on its text, not run. Removed (13), each concerning only Midnight Brew's drawing, models, credits or its e2e:
- "16g-1's ticket: Midnight Brew's rim values (0.7, 0.26), the 12 hauling ants…" (`brew/scene.js`)
- "16g-1's credit line, "Models by Polyfork, CC BY 4.0"…" (the models and their credit are gone)
- "16g-1, *unverified*: whether polyfork's JSON re-bakes of the Quaternius clips stay CC0…" (no clips ship)
- "16g-1 revision 2's Midnight Brew: the pumpkin-costume kid's own GLB clip…" (was fixed)
- "16g-1 revision 2's Midnight Brew: round 4's step (moon, moonlight, fog and bats)…"
- "16g-1 revision 3's Midnight Brew: at huge the second shockwave…"
- "16g-1 revision 4's Midnight Brew: the finale's light column…"
- "16g-2a: an animal or the hearse failing to load stops the whole village…"
- "16g-2a: a village left while loading… `forceContextLoss()`…"
- "16g-2a's `joinStill` keys only on what today's polyfork materials vary in…"
- "16g-2a: `brew.tsx`'s `load` and `first` are two copies of one GET; `tierOf`…; `play2.e2e.ts`'s 15 s wait…" (the village's, with the software drawing)
- "The village's e2e fails on CI most runs…" (the village's tests are removed; 16g-3's open question is moot)
- "16g-2b's calm look: the brew's "glows once"…" (the village's Reduce motion branch)

Reworded (3), because they also concern the app:
- "The local e2e suite is flaky on the Windows PC…": "game 2's village steps" dropped from the list of failing steps.
- "Local e2e runs on the Windows PC: the page under test reloads itself…": the sentence on CI's villages left open now says that cause went with the village; whether it explains these stays *unverified*.
- "16g-3's review, not blocking…": only (1), the videos uploading only when the e2e job fails, kept (it concerns the e2e job); (2) `show()` in `src/brew/scene.ts` and (3) the CPU sampler's Numbers row removed.

Kept though they name the village's mocks or models, as not about the village's drawing and unsure: "16g-1's ticket, Source diff row 2…" (the ticket's wording about polyfork and three.js), "16g-1 revision 2, phone cost…" and "small mock items…" (they list the other mocks, Office Tower and the garden), and the 16g-1 mock-page items.

Also: M16's ROADMAP row says 16g-3's retries are moot now; M16-16g-3's Status and HANDOFF's "Waits on the human" and "Next" lines no longer ask for the human's call on the village's e2e.

### Checks (2026-11-11, this PC, the local stack, at `f8e14b1`)
- First full checks (`a6e884a` to `3a54bed`): 62 db tests, `load_sync.test.sql` and 44 e2e failed, on a leftover fixture day (answer 12). Hypothesis: with it deleted, the db suites pass and e2e falls to the PC's usual flakiness or none; disproved by a db test still failing or a game 2 test failing. Held:
- `npm test`: 56 files, 640 passed. `npm run test:db`: 50 files, 343 passed. `npx supabase test db`: 36 files, 616 tests, PASS. No test of game 2's rules changed (`git diff b4ac330 HEAD --stat -- src/game supabase` prints nothing).
- `npm run build`: passes. `npm run check:client-bundle`: "CLIENT BUNDLE OK: 151 files, 5 patterns, 3 env values". `ls public/brew`: no such directory; `three` is not in `package.json`.
- `npx playwright test --project=chromium`: run 1, 171 passed, 1 failed (`themes.e2e.ts:28`, a 30 s timeout with its trace's teardown failing, "file data stream has unexpected number of bytes"; not this change's files); run 2, 172 passed; run 3 (15:11 to 15:27 UTC), 172 passed, exit 0. Runs 2 and 3 are criterion 8's two in a row locally; CI's first run is pending on the PR.
- Criteria 1 to 5: `play2.e2e.ts`, `how-to-play.e2e.ts`, `controls-and-state.e2e.ts` and `play.e2e.ts` passed in both runs (Step 4a, below, lists what each checks).

### Step 4a: game 2's e2e (commit e35dd14)
`e2e/brew.e2e.ts` deleted (the village's three tests: full screen with the village, the way out, Reduce motion). Carried into `e2e/play2.e2e.ts`: the play frame at 390x844 and 1440x900 (the shell's bars hidden from Start, the × showing, the way out leading to Today, the run waiting at its sentence when the page is opened again), Start enabled as soon as the page is with nothing still loading (criterion 3), the box focused at Start, Next focused at once after a word or a time-up with no wait (criterion 2). New there: the running score (0 at Start, the server's total after a word, 255 at round 7's sentence), round 7's sentence with See results, the frame staying up and the cards' "Your score" heading taking focus, a page opened on a finished run going straight to the cards. `e2e/how-to-play.e2e.ts` gained game 2's How to play (from its card and from the frame, its four steps checked against the source's numbers, Previous/Next/Close/×/Escape). Criterion 5: `e2e/game.ts`'s `expectCountdown` (a timer role with "NN seconds left", an aria-hidden bar with a scaleX fill) runs for game 2 in `play2.e2e.ts` and for game 1 in `controls-and-state.e2e.ts`, whose "seconds sit beside the prompt" check became: the row sits under the prompt, and the prompt, the number and the bar don't move from two digits to one, the fill shrinking. Removed from `play2.e2e.ts`: the village's 15 s waits and 120 s timeouts, the stubbed "locked" answer (a village workaround; the real lockout runs again as at `7c94697^`), "Game number 2".

Targeted run, `npx playwright test --project=chromium e2e/play2.e2e.ts e2e/how-to-play.e2e.ts e2e/controls-and-state.e2e.ts e2e/play.e2e.ts`: first run 35 passed, 2 failed (both my own regex typos, "\d" written as "d", fixed); second run 37 passed (2.8 min). After 4b's CSS fix, `e2e/play2.e2e.ts` alone: 8 passed, twice.

A bug in step 2b's own CSS, found while writing 4b's DESIGN.md: the top row's score and the cards' score list were both `.score` in `substrings.module.css`, so the top row's label and number sat side by side in the list's grid, right-aligned at line-height 1 (no test saw it). The top row's is now `.topScore`, and the frame test checks the label stands over the number.

"three" in the e2e files, all the number three, none the village: `approve-and-play.e2e.ts:113` "Three host answers on question 7", `audit.e2e.ts:4` "Three typists miss", `live-board.e2e.ts:47` "three times the default", `:334` "Three parts of the page read the run", `overall-board.e2e.ts:6` "over three", `screen-readers.e2e.ts:128, 143` "Three." (a comment body), `settings.e2e.ts:46` "the three ways to close it". `git grep -il "brew|village|game number 2" -- src e2e package.json` prints nothing.

### Step 4b: what the village was, measured (Numbers)
- `public/brew`: `git ls-tree -r -l ad3b4b0^ public/brew | awk '{n++; s+=$4} END {print n" files, "s" bytes"}'` printed `48 files, 10806808 bytes` (10.8 MB, as the Numbers row had it).
- three.js: `npm run build` at `b4ac330` (before step 1, when `/play2` still loaded the village; `ad3b4b0^` already doesn't, step 1 having taken it out) and at this branch, each time summing `.next/static/**/*.js`: before 16 files, 1620066 bytes, 453167 bytes gzip -9; after 15 files, 838748 bytes, 252522 bytes gzip -9. The difference is the one chunk `.next/static/chunks/3wvosh7zt8eu-.js` of 778848 bytes before (the Numbers row's "about 779 KB"); gzip saves 200645 bytes (about 200 KB). `/play2`'s first-load JS (`.next/diagnostics/route-bundle-stats.json`) went 705915 -> 703445 bytes: three was a lazy chunk, loaded when the village started, not in the first load.
- `npm run check:client-bundle`: `CLIENT BUNDLE OK: 151 files, 5 patterns, 3 env values (DATABASE_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)`.

## Review
The `reviewer` agent, on `git diff b4ac330 HEAD`.
- Blocking findings and how each was fixed:
  - The CSS comments credited the bar's and the top row's values to answers 6, 7, 10 and 11, which give no numbers; they now cite the village's `src/brew/brew.module.css` at `b4ac330` (`.clock` 196-202, `.score` 121-138, `.top` 106-111).
  - DESIGN.md cited the prompt at `game.module.css:91-94` (now `:93-96`) and read as if the 12px were between the score's label and number (it is `.top`'s gap); both fixed.
  - The Source diff, the criteria and the handoff were unfilled; filled with the PR.
- Deferred to ROADMAP "Next revision":
