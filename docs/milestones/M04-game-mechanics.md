# M04 — Game mechanics: working and smooth

**Status:** done (closed 2026-10-21 at the human's request: "fix roadmap/scheudling so that we can get ready to clear out this milestone and start the next"). The play loop is merged (PRs #23 to #28). What was deferred moved to M06 (answer lists and content) or M11 (publishing); see the criteria below and ROADMAP.
*Trimmed 2026-10-21 (docs audit): measurements, superseded plans and per-sub-ticket evidence and reviews are in git at commit 0b5314f. Milestone numbers are the ones in use when it closed; ROADMAP.md has today's.*

## Goal
Offbeat can be played every day, its open rules are settled, its questions catch players at the rate the human sets, and one run feels smooth from the first question to the result.

## Who uses it / what breaks without it
- Used by: every player, on every run. The human uses it too, to tune the questions.
- Breaks without it:
  - No day is on the calendar (M02 2g), so nothing can be played today.
  - Two scoring and host rules are still open ideas (ROADMAP, M10 row).
  - The survey found that 14 of 21 questions caught nobody (M02 2g, Findings), and no target catch rate exists to tune them against.
  - The play screen has known rough spots: Enter does nothing on text that isn't in the list, a safe answer is one line of text above the next question, no points are shown during the run or on the result (it shows "Question n of 7" and survived counts only), and there's no warning before the midnight reset.

## Source
- `docs/DECISIONS.md`, Game 1: sudden death, a fixed sequence of 7 independent questions, rising difficulty, scoring (25 to 350 points per question since G1; k points for question k before), and the server as the only judge. Also its **Answer model**: entry IDs, the host bank is never sent to the client, nothing is guessed at runtime.
- `docs/milestones/M00-data-design.md`: the Pacific-midnight day (Q1), for the countdown, and abandoned runs (Q4).
- `docs/milestones/M02-sign-in-and-play.md`, Numbers: 7 questions per day, the "did you mean" rule, logged-text limits.
- `docs/milestones/M02-2g-survey.md`, Findings, and the M03 report (`docs/milestones/M03-puzzle-insights.md`), for tuning the questions.
- `docs/SOURCES.md`, Next.js (App Router), for the play screen's code.

No source sets a target catch rate. It's a human number (G3).

## Decisions
| # | Decision | Answer (origin) |
|---|---|---|
| G1 | Scoring: k points for question k, or the human's "exponential distance" idea? | 25, 50, 75, 100, 150, 250, 350; a perfect run is 1000 (human, 2026-10-21: "increasingly bigger jumps" for "a sense of excitement and urgency"; a round total so every game's perfect run is standardized) |
| G2 | Last question: does the Wind always "blow 3 answers" on Q7, or does the host-answer count keep varying? | Varies by question (human, 2026-10-21: keep the 3 answers "only if it doesn't limit design for removing prompts"; Claude's reading is that it does, since every host answer must stay typeable after Q7's vowel is stolen) |
| G3 | Target catch rate per question (a human number) | Open: "challenging", tuned together with the human (human, 2026-10-21: "we can adjust it together, but we want it to be challenging"). Moved to M13 (answer lists, numbered M06 when this ticket closed) |
| G4 | Picking an answer: pick then "Lock in", or one tap? | Superseded by free typing: Enter sends the typed text (human, 2026-10-21: "Yes, Enter sends") |
| G5 | After a safe answer: a reveal with "Next", or straight on? | Reveal, then "Next" (human, 2026-10-21) |
| G6 | Which days to play while building | Open (human, 2026-10-21: "not sure what u mean"). Claude's reading of "full fleshout of the app comes first": no days on a calendar for now; building uses the `content-rehearsal` day locally. Moved to M13 (answer lists, numbered M06 when this ticket closed) |
| G7 | How fast a locked-in answer must show its result (a human number) | No target for now (human, 2026-10-21) |
| G8 | Letter schedule | A (human, 2026-10-21) |
| G9 | Fewest familiar safe answers left after stolen letters and host answers (a human number) | Not needed yet: only an automatic letter picker needs it, and that waits for the answer database (human, 2026-10-21: "we can focus on the database and how to get answers later"). Today the validator requires at least one safe answer left. Moved to M13 (answer lists, numbered M06 when this ticket closed) |
| G10 | When the 20-second timer runs out | The run ends (human, 2026-10-21) |
| G11 | Typing a stolen letter | The key does nothing (human, 2026-10-21) |
| G12 | May a one-typo auto-correct land on a name that needs a stolen letter? | No (human, 2026-10-21) |
| G13 | A run whose 20 seconds would end after midnight | It goes on (human, 2026-10-21: "they get to play the puzzle but their score doesn't contribute to leaderboard"). The timer, not midnight, ends an unfinished run; M10 leaves such a run out of the leaderboard |

## Rules to build (13c), from the human's decisions of 2026-10-21
The answer lists stay the hand-made content lists for now. Where answers come from (WordNet or another source, the answer database) comes later (human, 2026-10-21).
1. **Free typing.** The client receives no answer list and shows no suggestions, no "did you mean" and no "Not in the list" button. It sends the typed text, and the server matches it. This pulls the closed draft's D15 into the MVP (human, 2026-10-21: "it autosuggests and it restricts the answers that are able to be submitted … we need to solve these problems"). It changes DECISIONS.md's Answer model ("the client submits the entry ID, never raw text"), and the 13c PR that builds it writes that change.
2. **Matching, on the server, in this order** (exact before typo, so "moose" can never be caught as a typo of a host "mouse", a case in today's content):
   1. Normalize the typed text as content is normalized (DECISIONS.md).
   2. Text containing a stolen letter is refused with no penalty. The client can't type one (rule 4), so this only catches a bypassed client.
   3. An exact match with an entry's name or alias gives that entry.
   4. Otherwise, text of 4 or more letters that is one typo from a name that avoids every stolen letter (M02 Numbers; G12) gives that entry, but only when exactly one entry is that close. When two are ("mose" is one letter from both moose and mouse), the text names no entry, because picking one would be the server guessing (confirmed by the human, 2026-10-21: "The two-entries typo rule is fine as built").
   5. Otherwise, the reply is "not in our list, try again", with no penalty: free retries against the timer (human, 2026-10-21). The text is logged as a miss for the human, as today (human, 2026-10-18).

   The entry is caught if it is a host answer or in a host answer's match group (DECISIONS.md, match groups), and safe otherwise.
3. **The 20-second timer** (human, 2026-10-21). The server records when each question starts, which is when the player taps Start or Next. An answer after the 20 seconds, or no answer by then, ends the run (G10). The client counts down from the deadline the server sends. A refresh doesn't restart the clock, and network delay counts against the player, since a grace period would be a number no one has set. Midnight doesn't end a run (G13): a run started before it can be finished after it.
4. **Stolen letters, schedule A** (G8): the Wind steals one letter at Q2 (medium tier), Q4 (medium), Q5 (heavy consonant: R, N, L, T or S) and Q7 (vowel: E, A, I or O). Stolen letters are shown and stay gone for the rest of the run (the lead idea the human chose). In the answer box, a stolen letter's key does nothing, and the box shakes (G11).
5. **Reveal, then "Next"** (G5): after each answer, show your answer next to the host's, safe or caught, and the letter the Wind steals for the next question, if any. The next question and its 20 seconds start on "Next".
6. **Letters live in each day's content file**, the same for every player (DECISIONS.md: fixed sequence). Until the picker exists, Claude picks them for the test days and the human reviews them. The validator refuses a day that:
   - breaks schedule A's tiers;
   - has a host answer with no name that avoids the letters stolen by its question (it would add no danger);
   - has a question with no non-host entry left to type (it would be impossible).

**Letter tiers** (the origin of `LETTER_TIERS` in `src/config/tunables.ts`; measured 2026-10-21 on 15 WordNet categories as the median share of a category's answers one stolen letter removes, all answers / familiar answers; the cut-offs are Claude's grouping):
- **Heavy:** E 59%/44%, A 57%/44%, R 49%/34%, I 43%/34%, N 41%/28%, O 41%/28%, L 37%/27%, T 37%/33%, S 36%/22%. Split into *vowels* (E, A, I, O) and *heavy consonants* (R, N, L, T, S).
- **Medium:** C 30%/19%, P 22%/16%, H 22%/15%, U 21%/12%, B 20%/16%, D 19%/13%, M 18%/14%, G 17%/14%.
- **Light** (10% or less): F, Y, K, W, V, X, J, Z, Q.

Why schedule A: it starts loose, tightens in steps with two pauses (Q3, Q6) so a theft feels like an event, and ends with the hardest steal (a vowel) on the last question.

## Acceptance criteria
- [x] **13a** *(G3 and G6 moved to M06 with the content; G9 waits for M06's letter picker.)* The G decisions each sub-ticket depends on are answered here before its code (G4, G5, G8, G10, G11 and G12 before 13c; G3 and G6 before 13d), and each rule change is written in DECISIONS.md in the PR that builds it.
- [x] **13c-1 Free typing:** the client receives no answer list (checked by `payload.test.ts` and a browser request), and the server matches typed text in the order of rule 2, without its stolen-letter parts (steps 2 and 4), which come with 13c-3. Unit tests cover: exact before typo (moose with a host mouse is safe), a match-group member is caught, and off-list text is a free retry that's logged as a miss.
- [x] **13c-2 Timer:** each question gives 20 seconds from Start or Next (human, 2026-10-21). An answer after the deadline, or none, ends the run (G10), and a refresh keeps the same deadline. DB tests cover an answer just before and just after the deadline, by moving the run's stored times back.
- [x] **13c-3 Stolen letters:** schedule A's letters come from the day's content and show in the play screen, and a stolen letter's key does nothing (G11). The server refuses text with a stolen letter. The validator refuses a day that breaks rule 6, and each refusal has a fixture. A unit test shows a typo never lands on a name needing a stolen letter (G12).
- [x] **13b** *(Locally done; staging moved to M11, human 2026-10-21.)* A day can be played from start to finish, both locally and on staging, using the days G6 chooses (evidence: the run's rows and a screenshot of the result).
- [x] **13c-4 The rest of the play loop** on `src/app/game.tsx` (except the answer-time measurement, which waits for G7):
  - [x] Enter on text that isn't in the list says so ("not in our list, try again") instead of doing nothing (ROADMAP item from the M02 2c review). *Done in 13c-1.*
  - [x] Every answer gets a reveal, then "Next" (G5): your answer next to the host's, safe or caught, and the next stolen letter.
  - [x] The points so far are shown during the run (G1), next to the "Question n of 7" that `game.tsx` already shows.
  - [x] A countdown to the reset is shown on the result screen, from the next reset instant the server computes in SQL next to `private.today()` (`private.next_reset`; ROADMAP item from the M00 review).
  - [x] *(Speed part dropped, G7; double-send part holds: `busy` blocks a second Enter, and the db retry and concurrency tests pass.)* Time from Enter to the result, measured on staging, is within G7, and a second Enter can't send the answer twice.
  - [x] The result screen shows the run's points (G1), and each question's.
- [ ] **13d** *(Moved to M06, human 2026-10-21.)* The questions on the days G6 schedules are tuned to G3: host answers and host banks adjusted using the survey findings and the M03 report. The human makes the content calls in ROADMAP "Next revision", Content. The M01 validator passes.
- [x] **13e** *(Locally; four cases rest on db tests the human accepted, 2026-10-21: "Accept the tests"; staging moved to M11.)* Full runs cover a full 7-of-7 run, a catch on every question number, a time-out, an off-list retry, and a refresh in the middle of a run that resumes it with the same deadline (evidence: `npm run status` plus the runs' rows). Tests cover every new rule from G1, G2, the timer, the letters and the countdown.

## Out of scope
After the MVP (human, 2026-10-20):
- The sign-in page.
- The look and pixel art (M07).
- Share (M05), friends and the live board (M08), comments (M09), the points ledger and leaderboard (M10), and launch (M11).
- "Semantic search" and an AI judge (the judge plan was stopped by the human, 2026-10-21). Free typing itself is in (rule 1).
- AI puzzle drafting (Later, unnumbered).

Later, by the human (2026-10-21: "we can focus on the database and how to get answers later"):
- Where answers come from (WordNet or another large source, its license and its SOURCES.md entry).
- The daily letter picker and G9.

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| Questions per day | Run length, progress | 7 (human, 2026-10-18; M02 Numbers) |
| Points per question | Score during the run and at the end | 25, 50, 75, 100, 150, 250, 350, perfect run 1000 (G1, human, 2026-10-21) |
| Host answers per question | Difficulty | Varies by question (DECISIONS.md, Game 1; G2, human, 2026-10-21) |
| Target catch rate | Tuning (13d) | G3: "challenging", tuned together in M06 |
| Answer response time | Smoothness (13c) | No target for now (G7, human, 2026-10-21) |
| Time per question | The timer | 20 seconds (human, 2026-10-21) |
| Letter schedule | Stolen letters per question | Schedule A: one at Q2 (medium), Q4 (medium), Q5 (heavy consonant), Q7 (vowel) (G8, human, 2026-10-21) |
| Fewest familiar safe answers left | The daily letter picker (later) | G9: not needed until the picker exists |
| Typo auto-correct | Free typing | One typo, text of 4+ letters (M02 Numbers), never onto a name needing a stolen letter (G12) |

## Removes
- The one-line "Safe! You said …" (`LastResult` in `src/app/game.tsx`), replaced by the reveal.
- The answer list in the question payload (`src/game/payload.ts`), the suggestions and "did you mean" (`src/game/suggest.ts` and its use in `game.tsx`), the "Not in the list? Send" button and `/api/run/miss` (off-list text is logged by the answer route instead), and the "Lock in / Change it" step (13c-1).
- Entry IDs from the client in `/api/run/answer` (13c-1; DECISIONS.md, Answer model).
- The "For M12 (the play screens)" group (as it was named then) in ROADMAP "Next revision": its play-screen items move here, and its sign-in items go after the MVP.

## Source diff
| Source says | We built | Why different |
|---|---|---|
| G11's chosen option: the key does nothing, "the box shakes and the stolen letter flashes" | The key does nothing, and "The Wind took P. Try a word without it." shows under the box | A shake or flash needs a duration, a number nobody has set; the look is M07. The message gives the same feedback with no number |
| Rule 5: after each answer, show your answer next to the host's, "safe or caught" | Only a safe answer gets the reveal; a catch or time-out goes straight to the result screen, which lists "you said X, the host said Y (caught)" (`src/app/game.tsx`, Result) | Not recorded at the time; found in the 2026-10-21 docs audit |
| Rule 6: the validator refuses a day that breaks the rules; Claude picks letters for the test days | `npm run content:letters` picks them by searching each tier in a date-seeded order; 7 content days and the rehearsal 2026-10-19 day, which no letters fit, moved to `content-parked/` | The human chose to swap the failing questions, then said to "build the app first" (2026-10-21), so they're parked unchanged until that content work; nothing was deleted |
| (no source) | A day may not steal the same letter twice | A repeat would steal nothing; it follows from "one more letter" in the lead idea, but no source states it |
| DECISIONS.md, Puzzle content format: format 1 | Format 2: each question may carry `steals` (one letter), set on the questions schedule A names | Rule 6 puts the letters in each day's file; a new version so old and new files can't be confused (Hard to reverse) |
| Rule 5 (reveal, then Next) with G13 (a run started before midnight can be finished) | A run left at a reveal has no clock and stays in progress; a reload shows it, even on a later day, until it's finished | Waiting at a reveal must not time out; the human chose "Resume yesterday's run" (2026-10-21). How such a run scores is for M10 (ROADMAP) |
| DECISIONS.md, Q4 (M00, human 2026-10-17): a run started just before the reset is abandoned and scores 0 | No run is abandoned. A run ends with a catch, its last question or a timed-out question; one left at a reveal stays in progress; a run started before midnight can be finished after it | The human's G13 answer, 2026-10-21. DECISIONS.md is updated, and the leaderboard part waits for M10 |
| 13e: evidence is `npm run status` plus the runs' rows | The 7-of-7 run has both; the other four cases rest on the db tests, which call the real routes against the real database but not a running server | The human accepted the tests for those four (2026-10-21: "Accept the tests") |
| The 13c-2 criterion: "DB tests use a fixed clock" | They move the run's stored times back | Postgres's clock can't be set for a test; the deadline is derived from the stored times, so moving them back is the same thing |
| DECISIONS.md Config: tunables live in `tunables.ts` | The 20 seconds lives in SQL (`private.question_deadline`) | The database is the judge of the deadline, and the client only shows the time left the server measured, so TypeScript never needs the number. One place, not two |
| M02 2g survey ticket (lines 64, 69): the scorer counts only an exact match, "the game never guesses" | `survey:score` now reads text with `resolveTyped`, auto-correcting one typo | The scorer's purpose is to score "the way the game scores play", and the game now auto-corrects (human, 2026-10-21). Re-scoring changes the recorded numbers (e.g. "Texsa" becomes Texas, caught) |
| The 13c-1 criterion as merged in PR #22: "checked … by `check:client-bundle`" | Checked by `payload.test.ts` and a browser request | `check:client-bundle` scans only for secrets and server env values, so it can't detect an answer list |
| Rules to build, rule 2.4: two entries a typo away name none | Built that way | Claude's reading at first; confirmed by the human, 2026-10-21 |

## Evidence
Per-sub-ticket evidence (13c-1 to 13c-4, G1) is in PRs #23–#28.

**Full local runs** (13b, 13e; 2026-10-21, `next dev` and the local stack):
- `npm run status -- http://localhost:3000`: `UP http://localhost:3000 (protocol 3)`.
- **The human's own run** (local account jason@example.test, today's local test day, the 2026-11-08 questions) survived 7 of 7. Its rows (`private.run_event` joined to `private.question_open`; times Pacific):
  - q1 pickleball, answered 02:39:24 (started by Start);
  - q2 bacon, opened 02:39:27, answered 02:39:32;
  - q3 delaware, opened 02:39:35, answered 02:39:45;
  - q4 fedora, opened 02:39:47, answered 02:39:49;
  - q5 rosemary, opened 02:39:50, answered 02:39:59;
  - q6 mirror, opened 02:40:00, answered 02:40:04;
  - q7 high-heels, opened 02:40:06, answered 02:40:23.

  Each answer came within its question's 20 seconds of Next, and all were safe.
- **The same answers on the browser pane's test account**, through the running server's routes: points went 25, 75, 150, 250, 400, 650, then 1000; each Next gave `msLeft` 19996; the status ended `survived`. The result screen (screenshot taken in the browser pane) read "You survived all 7! / You survived 7 of 7 questions and scored 1000 points", with each question and its points, and "Next puzzle in 21:14:18".
- `npm run test:db -- --exclude ".claude/**" src/game/runs.db.test.ts`: 8 files, 71 tests passed (the path argument and `test:db`'s own `.db.test` filter combine, so all db files run). They cover, through the routes against the local database:
  - a full 7-of-7 run scoring 1000;
  - a catch on every question number, each ending the run there with the points before it (7 tests, added to close M04);
  - a time-out with and without an answer;
  - an off-list retry;
  - a refresh keeping the same deadline;
  - a second identical answer, sequential or concurrent, returning the stored result.

## Review
Reviewer agent, 2026-10-21, one round per sub-ticket:
- 13c-1: 5 blocking findings fixed; deferrals in ROADMAP Next revision.
- 13c-2: 4 blocking findings fixed; deferrals in ROADMAP Next revision.
- 13c-3: 2 blocking findings fixed; deferrals in ROADMAP Next revision.
- 13c-4: 5 blocking findings fixed; deferrals in ROADMAP Next revision.
- G1 and the human's answers: 5 blocking findings fixed; deferrals in ROADMAP Next revision.
- M04 close-out: 7 blocking findings fixed; deferrals in ROADMAP Next revision (none new).
