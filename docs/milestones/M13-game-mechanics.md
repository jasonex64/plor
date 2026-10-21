# M13 — Game mechanics: working and smooth

**Status:** in progress: 13c-1 (free typing), 13c-2 (the timer) and 13c-3 (stolen letters) merged (PRs #23 to #26); 13c-4 (reveal and Next, points, reset countdown) in review, 2026-10-21. Open: G1, G2, G3, G6, G7, G9; 13b, 13d and 13e.

## Goal
Offbeat can be played every day, its open rules are settled, its questions catch players at the rate the human sets, and one run feels smooth from the first question to the result.

## Who uses it / what breaks without it
- Used by: every player, on every run. The human uses it too, to tune the questions.
- Breaks without it:
  - No day is on the calendar (M02 2g), so nothing can be played today.
  - Two scoring and host rules are still open ideas (ROADMAP, M08 row).
  - The survey found that 14 of 21 questions caught nobody (M02 2g, Findings), and no target catch rate exists to tune them against.
  - The play screen has known rough spots: Enter does nothing on text that isn't in the list, a safe answer is one line of text above the next question, no points are shown during the run or on the result (it shows "Question n of 7" and survived counts only), and there's no warning before the midnight reset.

## Source
- `docs/DECISIONS.md`, Game 1: sudden death, a fixed sequence of 7 independent questions, rising difficulty, scoring (k points for surviving question k), and the server as the only judge. Also its **Answer model**: entry IDs, the host bank is never sent to the client, nothing is guessed at runtime.
- `docs/milestones/M00-data-design.md`: the Pacific-midnight day and abandoned runs (Q4), for the countdown.
- `docs/milestones/M02-sign-in-and-play.md`, Numbers: 7 questions per day, the "did you mean" rule, logged-text limits.
- `docs/milestones/M02-2g-survey.md`, Findings, and the M03 report (`docs/milestones/M03-puzzle-insights.md`), for tuning the questions.
- `docs/SOURCES.md`, Next.js (App Router), for the play screen's code.

No source sets a target catch rate. It's a human number (G3).

## Decisions needed before any code
| # | Decision | Answer (origin) |
|---|---|---|
| G1 | Scoring: keep k points for surviving question k (DECISIONS.md, human-accepted 2026-10-17), or the human's "exponential distance" idea (2026-10-20)? A change is a DECISIONS.md change | |
| G2 | Last question: does the Wind always "blow 3 answers" on question 7 (human idea, 2026-10-20), or does the host-answer count keep varying by question (DECISIONS.md, Game 1)? | |
| G3 | Target catch rate for each of the 7 questions, or a rule for how it rises (a human number) | |
| G4 | Picking an answer: keep today's two steps (pick, then "Lock in"), or one tap? | Superseded by free typing: Enter sends the typed text, with no list to pick from and no "Lock in" (Claude's reading of the human's 2026-10-21 decisions below; to confirm) |
| G5 | After a safe answer: a reveal moment with a "Next" tap, or straight on to the next question with the reveal above it? | Reveal, then "Next" (human, 2026-10-21) |
| G6 | Days while building: the `content-rehearsal` days locally and on staging, or put some of the 28 drafted days back on the calendar now (each one used now is one fewer for the closed beta)? | |
| G7 | How fast a locked-in answer must show its result (a human number, set after the first measurement in 13c) | |
| G8 | Letter schedule: on which questions the Wind steals a letter, and from which tier (draft A, B or C below, or another) | A (human, 2026-10-21) |
| G9 | Fewest familiar safe answers a question may have left after its stolen letters and its host answers (a human number; the daily letter picker enforces it) | Open; needed only for the picker, which waits for the answer database (human, 2026-10-21: "we can focus on the database and how to get answers later") |
| G10 | What happens when the 20-second timer runs out: the run ends, or the question scores 0 and the run goes on | The run ends (human, 2026-10-21) |
| G11 | Typing a stolen letter: the key does nothing (and the box shakes), or the answer is refused on submit | The key does nothing (human, 2026-10-21) |
| G13 | A run whose 20 seconds would end after midnight: the day ends it, or it goes on? | It goes on: "they get to play the puzzle but their score doesn't contribute to leaderboard" (human, 2026-10-21). The timer, not midnight, ends an unfinished run; M08 leaves such a run out of the leaderboard |
| G12 | One-typo auto-correct and stolen letters: may a typo land on a name that needs a stolen letter ("hors" → horse with E stolen)? | No: auto-correct lands only on names that avoid every stolen letter (human, 2026-10-21) |

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

## Design exploration (2026-10-21, not decided unless marked "human")
The human's problem statement: the game gives the player "too much leeway". Suggestions while typing act as hints, only listed answers can be submitted, and surviving all 7 is too easy because the answer space isn't restricted. Measured: the 2026-10-26 questions have 1 host answer out of 226 animals, 1 of 201 countries and 1 of 50 US states (2 of 12 on the last question).

The human's answers so far:
- **Typos:** "Auto-correct one typo" (human, 2026-10-21): text one typo away from an entry counts as that entry, using the existing typo rule (M02 Numbers), with no "did you mean" prompt.
- **Reveal:** "After each question" (human, 2026-10-21), worded for a board, which is no longer the lead design; then "Reveal, then 'Next'" (G5).
- **Ramp:** "make the mechanics more loose at the start, and then restrict more as time goes on to induce stress" (human, 2026-10-21).
- **Off-list answers:** "there should be a timer, so free retries are allowed as the timer provides a sense of urgency" (human, 2026-10-21). **The timer is 20 seconds** (human, 2026-10-21: "make sure that we have a timer of 20 seconds"). Per question, a fresh 20 seconds each time, never shrinking (confirmed by the human, 2026-10-21: "Yes, 20 s per question"). At time-out the run ends (G10).
- **The share model** (a board of the top answers covering cₖ, a host catching tₖ): "does define what we want idealistically", but estimating shares by survey or from play over time is "just not feasible" (human, 2026-10-21).
- **The goal:** "people feeling like they are in control/capable of putting 'quirky' answers to live so that they feel smart while simultaneously still feeling some sort of danger" (human, 2026-10-21).
- **Decided: the Wind steals letters** (human, 2026-10-21: "we are going to steal letters from the players. maybe not one every round, but enough to create a sense of urgency"). Stolen letters are visible and stay gone for the rest of the run, as in the lead idea the human chose ("i like the first idea", 2026-10-21). The built rules are in "Rules to build (13c)" above.

**Letter tiers** (measured 2026-10-21 on 15 WordNet categories; the median share of a category's answers that one stolen letter removes, as all answers / familiar answers; "familiar" means seen at least once in WordNet's tagged corpus, a rough measure; an answer survives while any of its names avoids the stolen letters). The tier cut-offs are Claude's grouping:
- **Heavy:** E 59%/44%, A 57%/44%, R 49%/34%, I 43%/34%, N 41%/28%, O 41%/28%, L 37%/27%, T 37%/33%, S 36%/22%. The schedules split it into *vowels* (E, A, I, O) and *heavy consonants* (R, N, L, T, S).
- **Medium:** C 30%/19%, P 22%/16%, H 22%/15%, U 21%/12%, B 20%/16%, D 19%/13%, M 18%/14%, G 17%/14%.
- **Light** (10% or less): F, Y, K, W, V, X, J, Z, Q. The simulation draws light letters only from F, Y, K, W and V, since X, J, Z and Q remove about 1%.

**Draft schedules** (simulated over 2,000 random days: 7 of the 15 categories drawn at random, ignoring difficulty order, with letters drawn at random within each tier as split above and no guard against impossible questions; "answers" are WordNet synsets; the real picker with G9 would give different numbers):

| Schedule | Letters gone by Q1–Q7 | Answers left, median | Familiar answers left, 10th percentile | Questions with no familiar answer |
|---|---|---|---|---|
| **A** (Claude's pick): medium at Q2, medium at Q4, heavy consonant at Q5, vowel at Q7; Q3 and Q6 are breathers | 0 1 1 2 3 3 4 | 100% 80% 80% 62% 36% 35% 18% | 14 12 11 9 6 6 3 | 0.0% |
| **B:** one every round from Q2: light, medium, medium, heavy consonant, heavy consonant, vowel | 0 1 2 3 4 5 6 | 100% 92% 73% 56% 32% 18% 9% | 14 13 11 9 6 3 2 | 0.4% |
| **C:** medium at Q3, heavy consonant at Q5, vowel at Q7 | 0 0 1 1 2 2 3 | 100% 100% 80% 80% 47% 47% 24% | 14 14 11 11 8 8 4 | 0.0% |

Why A: it starts loose, tightens in steps with two pauses so a theft feels like an event, and ends with the hardest steal (a vowel) on the last question. B's last two questions sometimes leave almost nothing a player would know.

**How each day's letters would be picked** (draft): a script, not a person, picks the letters for each tier the schedule names, the same for every player (DECISIONS.md: fixed sequence). The host's answers for each question are chosen from the obvious answers that still have a name avoiding the letters stolen by then, because a host answer the player can't type would add no danger. The picker keeps a letter only if every question from that point on still has at least G9 familiar *safe* answers, counted after removing the host's answers and their match groups. It waits for the answer database (G9).

Evidence so far (scratchpad runs, 2026-10-21):
- **Banning letters on today's hand lists, most common letter first:**
  - animals: 226 → 102 → 45 → 33 → 12;
  - US states: 50 → 14 → 3 → 0;
  - rainy-day activities: 53 → 16 → 7 → 2 → 0.
  
  So small or closed sets die fast; letters must be chosen per question, and a question must never reach 0.
- **Wikidata as a large answer source:** disproved twice.
  - *Taxon common names* (fame of 15 or more wiki languages): 1,975 animals, but only 14 of today's 226 entries, plus odd names ("split", "kihikihi").
  - *English labels and aliases:* 19 of 226, and dog, cat and lion are missing.
  
  Per CLAUDE.md this is a stop-and-re-plan point.
- **WordNet 3.0 as a large answer source** (the human approved the download, 2026-10-21: nltk 3.10.3 and the 10.8 MB `wordnet.zip`, kept in the session scratchpad). Hypothesis, written before running: it holds most of today's 226 animals, including dog, cat and lion, and keeps more answers than the hand list after every letter ban. **Confirmed.**
  - Coverage: 4,016 animal synsets; 223 of 226 hand entries found (missed: clouded leopard, koi, clownfish).
  - Letter ramp, all WordNet vs the hand list: no A 1,794 vs 102; no AE 671 vs 45; no AER 408 vs 33; no AERO 157 vs 12; no AEROL 104 vs 9; no AEROLI 38 vs 2.
  - Other categories (synsets; after banning E, then E A, then E A O): fruit 320 → 130/41/16; vegetable 175 → 66/20/6; musical instrument 163 → 85/25/8; sport 176 → 87/54/32; tool 347 → 96/33/16; country 227 → 145/28/14; occupation 283 → 91/42/15; dish 315 → 121/50/12; furniture 198 → 62/21/7; vehicle 527 → 250/67/35; emotion 129 → 58/27/15; body part 1,791 → 645/247/119; game 193 → 94/40/17; color 91 → 31/14/7.
  - Quality: WordNet includes odd senses and old words (homo, biddy, moo-cow, dun and buckskin as horses), which would be accepted as valid. It has no entries for abstract prompts such as "something to do on a rainy day".
- **Meaning-based checking with WordNet** ("semantic search", asked for by the human, 2026-10-21). Each typed word is checked for whether it means a kind of animal:
  - Accepted: narwhal, puppies (plurals handled), puma, cougar and mountain lion (one synonym group, so aliases come for free), tyrannosaurus, axolotl, cheetah.
  - Rejected: zoo, unicorn, teddy bear, mermaid.
  - Unknown: t rex, clownfish, koi, doggo (newer words and slang).
  - Quirks: "dragon" is accepted through its flying-lizard sense, "human" is accepted, and "painter" (an old name for the cougar) would match a cougar host.
  - WordNet's license and a SOURCES.md entry are *unverified* and need the human.
- **Other semantic options, not run:**
  - *Word embeddings*, with acceptance when a similarity score is close enough to the category: fuzzy, needs a downloaded model and a human-set threshold, and a weak signal for abstract prompts.
  - *An AI judge at answer time* (e.g. Claude: "is X a valid answer to this prompt?"): covers abstract prompts and slang. Its first verdict for each answer can be cached so every player gets the same one. But it costs money per new answer, adds delay, can be talked into a "yes" by typed instructions, needs an API key kept only in Vercel, and breaks DECISIONS.md's "nothing is guessed at runtime", which is a human decision.

## Acceptance criteria
Each criterion must be checkable with a command or other observable result. Criteria that depend on a decision get their final wording once it's answered.
- [ ] **13a** The G decisions each sub-ticket depends on are answered here before its code (G4, G5, G8, G10, G11 and G12 before 13c; G1 before points are shown; G3 and G6 before 13d), and each rule change is written in DECISIONS.md in the PR that builds it.
- [x] **13c-1 Free typing:** the client receives no answer list (checked in the served payload: `payload.test.ts` and a request from the browser; the criterion first said "by `check:client-bundle`", but that script only scans for secrets and server env values, so it can't see an answer list), and the server matches typed text in the order of "Rules to build", rule 2, without its stolen-letter parts (steps 2 and 4), which come with 13c-3. Unit tests cover: exact before typo (moose with a host mouse is safe), a match-group member is caught, and off-list text is a free retry that's logged as a miss.
- [x] **13c-2 Timer:** each question gives 20 seconds from Start or Next (human, 2026-10-21); until 13c-4 adds Next, from the previous answer. An answer after the deadline, or none, ends the run (G10), and a refresh keeps the same deadline. DB tests cover an answer just before and just after the deadline. They move the run's stored times back instead of fixing the clock: Postgres's clock can't be set, and the deadline is computed from those times.
- [x] **13c-3 Stolen letters:** schedule A's letters come from the day's content and show in the play screen, and a stolen letter's key does nothing (G11). The server refuses text with a stolen letter. The validator refuses a day that breaks rule 6, and each refusal has a fixture. A unit test shows a typo never lands on a name needing a stolen letter (G12; moved here from 13c-1, which has no letters yet).
- [ ] **13b** A day can be played from start to finish, both locally and on staging, using the days G6 chooses (evidence: the run's rows and a screenshot of the result).
- [x] **13c-4 The rest of the play loop** on `src/app/game.tsx` (except the answer-time measurement, which waits for G7):
  - [x] Enter on text that isn't in the list says so ("not in our list, try again") instead of doing nothing (ROADMAP item from the M02 2c review). *Done in 13c-1.*
  - [x] Every answer gets a reveal, then "Next" (G5): your answer next to the host's, safe or caught, and the next stolen letter.
  - [x] The points so far are shown during the run (G1), next to the "Question n of 7" that `game.tsx` already shows. Built with DECISIONS.md's existing k points for question k, since G1 (whether to change it) is still open.
  - [x] A countdown to the reset is shown on the result screen, from the next reset instant the server computes in SQL next to `private.today()` (`private.next_reset`; ROADMAP item from the M00 review). Since G13, the reset no longer ends a run.
  - [ ] Time from Enter to the result, measured on staging, is within G7, and a second Enter can't send the answer twice.
  - [x] The result screen shows the run's points (G1), and each question's.
- [ ] **13d** The questions on the days G6 schedules are tuned to G3: host answers and host banks adjusted using the survey findings and the M03 report. The human makes the content calls in ROADMAP "Next revision", Content. The M01 validator passes.
- [ ] **13e** Full runs on staging cover a full 7-of-7 run, a catch on every question number, a time-out, an off-list retry, and a refresh in the middle of a run that resumes it with the same deadline (evidence: `npm run status` plus the runs' rows). Tests cover every new rule from G1, G2, the timer, the letters and the countdown.

## Out of scope
After the MVP (human, 2026-10-20):
- The sign-in page.
- The look and pixel art (M12).
- Share (M05), friends and the live board (M06), comments (M07), the points ledger and leaderboard (M08), and launch (M11).
- "Semantic search" and an AI judge (the judge plan was stopped by the human, 2026-10-21). Free typing itself is in (rule 1).
- AI puzzle drafting (M04).

Later, by the human (2026-10-21: "we can focus on the database and how to get answers later"):
- Where answers come from (WordNet or another large source, its license and its SOURCES.md entry).
- The daily letter picker and G9.

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| Questions per day | Run length, progress | 7 (human, 2026-10-18; M02 Numbers) |
| Points per question | Score during the run and at the end | k for question k (DECISIONS.md, Game 1, human-accepted 2026-10-17), unless G1 changes it |
| Host answers per question | Difficulty | Varies by question (DECISIONS.md, Game 1), unless G2 changes question 7 |
| Target catch rate | Tuning (13d) | G3, open |
| Answer response time | Smoothness (13c) | G7, open |
| Time per question | The timer | 20 seconds (human, 2026-10-21) |
| Letter schedule | Stolen letters per question | Schedule A: one at Q2 (medium), Q4 (medium), Q5 (heavy consonant), Q7 (vowel) (G8, human, 2026-10-21) |
| Fewest familiar safe answers left | The daily letter picker (later) | G9, open |
| Typo auto-correct | Free typing | One typo, text of 4+ letters (M02 Numbers), never onto a name needing a stolen letter (G12) |

## Plan
One PR per sub-ticket, from the branch `m13-game-mechanics`.
1. **13a:** the human answers the G decisions each sub-ticket needs. Rule changes go into DECISIONS.md with the PR that builds them.
2. **13b:** get days playable, as G6 chooses. Until then, the `content-rehearsal` days on the local stack (the human's choice for local play, 2026-10-21).
3. **13c**, one PR each, in this order:
   - **13c-1** free typing;
   - **13c-2** the timer;
   - **13c-3** stolen letters (content field, validator, server check, input);
   - **13c-4** the rest of the play loop.
   
   Before measuring the answer time, write down the expected time, why, and what result would disprove it.
4. **13d:** tune the scheduled days to G3, and publish them with `content:publish` (the human runs it).
5. **13e:** full runs on staging, with evidence.

## Removes
- The one-line "Safe! You said …" (`LastResult` in `src/app/game.tsx`), replaced by the reveal.
- The answer list in the question payload (`src/game/payload.ts`), the suggestions and "did you mean" (`src/game/suggest.ts` and its use in `game.tsx`), the "Not in the list? Send" button and `/api/run/miss` (off-list text is logged by the answer route instead), and the "Lock in / Change it" step (13c-1).
- Entry IDs from the client in `/api/run/answer` (13c-1; DECISIONS.md, Answer model).
- The "For M12 (the play screens)" group in ROADMAP "Next revision": its play-screen items move here, and its sign-in items go after the MVP.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| G11's chosen option: the key does nothing, "the box shakes and the stolen letter flashes" | The key does nothing, and "The Wind took P. Try a word without it." shows under the box | A shake or flash needs a duration, a number nobody has set; the look is M12. The message gives the same feedback with no number |
| Rule 6: the validator refuses a day that breaks the rules; Claude picks letters for the test days | `npm run content:letters` picks them by searching each tier in a date-seeded order; 7 content days and the rehearsal 2026-10-19 day, which no letters fit, moved to `content-parked/` | The human chose to swap the failing questions, then said to "build the app first" (2026-10-21), so they're parked unchanged until that content work; nothing was deleted |
| (no source) | A day may not steal the same letter twice | A repeat would steal nothing; it follows from "one more letter" in the lead idea, but no source states it |
| DECISIONS.md, Puzzle content format: format 1 | Format 2: each question may carry `steals` (one letter), set on the questions schedule A names | Rule 6 puts the letters in each day's file; a new version so old and new files can't be confused (Hard to reverse) |
| Rule 3: a question starts on Start or Next | Built in 13c-4: question 1 on Start, the rest on Next (`private.question_open`) | 13c-2 briefly started it at the previous answer, before Next existed |
| (no source) | A run left at a reveal has no clock and stays in progress; an earlier day's such run doesn't hold back today's puzzle | Waiting at a reveal must not time out (rule 5), and a forgotten reveal must not block the next day. How such a run scores is for M08 (ROADMAP) |
| DECISIONS.md, Q4 (M00, human 2026-10-17): a run started just before the reset is abandoned and scores 0 | No run is abandoned. The timer ends unfinished runs, and a run started before midnight can be finished after it | The human's G13 answer, 2026-10-21. DECISIONS.md is updated, and the leaderboard part waits for M08 |
| The 13c-2 criterion: "DB tests use a fixed clock" | They move the run's stored times back | Postgres's clock can't be set for a test; the deadline is derived from the stored times, so moving them back is the same thing |
| DECISIONS.md Config: tunables live in `tunables.ts` | The 20 seconds lives in SQL (`private.question_deadline`) | The database is the judge of the deadline, and the client only shows the time left the server measured, so TypeScript never needs the number. One place, not two |
| Rules to build, rule 2: refuse text with a stolen letter (step 2), and typos only onto names that avoid stolen letters (step 4) | 13c-1 builds rule 2 without the stolen-letter parts | There are no stolen letters until 13c-3, which adds both parts and their tests |
| M02 2g survey ticket (lines 64, 69): the scorer counts only an exact match, "the game never guesses" | `survey:score` now reads text with `resolveTyped`, auto-correcting one typo | The scorer's purpose is to score "the way the game scores play", and the game now auto-corrects (human, 2026-10-21). Re-scoring changes the recorded numbers (e.g. "Texsa" becomes Texas, caught) |
| The 13c-1 criterion as merged in PR #22: "checked … by `check:client-bundle`" | Checked by `payload.test.ts` and a browser request | `check:client-bundle` scans only for secrets and server env values, so it can't detect an answer list |
| Rules to build, rule 2.4: two entries a typo away name none | Built that way | Claude's reading at first; confirmed by the human, 2026-10-21 |

## Evidence
**13c-4 reveal, Next, points, reset countdown** (branch `m13-game-mechanics`, 2026-10-21, local stack):
- `npm run test:db -- --exclude ".claude/**"`: 8 files, 64 tests passed. They include:
  - the reveal (no question, no clock, the next letter, +1 point);
  - an answer before Next refused with 409 `not_open`;
  - Next opening question 2 at about 20 seconds, and a second tap changing nothing;
  - a minute at the reveal still being in progress;
  - Next before the first answer refused (`no_reveal`) and after the run ended refused (`run_over`);
  - a full 7-of-7 run scoring 28 points, with the reset ahead and at most 25 hours away;
  - yesterday's run left at its reveal not holding back today's puzzle;
  - as plor_app: start, answer, Next, miss.
- `npx supabase test db`: 4 files, 82 tests, PASS. They include the deadline being null at a reveal, an answer before Next being OB006, Next opening only the question after the last answer, and plor_app's exact grants.
- `npm test -- --exclude ".claude/**"`: 19 files, 147 tests passed (the Next route refuses a signed-out player). `npx eslint .`: clean.
- **In the browser:**
  - "soccer" showed "Safe! You said soccer; the host said tennis. +1 point · 1 point so far. Next, the Wind steals P." and a Next button.
  - Next showed "20 seconds left", "Question 2 of 7 · 1 point so far" and "The Wind has taken: P".
  - "waffle" (the host) showed "Caught on question 2 / You survived 1 of 7 questions and scored 1 point", each question with its points, and "Next puzzle in 22:02:03" at 01:58 Pacific.
**13c-3 stolen letters** (branch `m13-game-mechanics`, 2026-10-21, local stack):
- `npm test -- --exclude ".claude/**"`: 19 files, 146 tests passed. They include:
  - one fixture per new validator rule (off schedule, missing, wrong tier, repeated, host untypeable, no safe answer);
  - the `steals` shape check;
  - `content:letters` being deterministic, valid, and null when nothing fits;
  - the payload carrying the stolen letters;
  - a typo never landing on a name that needs a stolen letter (G12).
- `npm run test:db -- --exclude ".claude/**"`: 8 files, 61 tests passed, including text with a stolen letter getting a 400 `stolen_letter`, with nothing logged and the same question. `npx supabase test db`: PASS. `npx eslint .`: clean.
- `npm run content:validate` (21 files) and `-- content-rehearsal` (1 file): CONTENT OK.
- **In the browser:**
  - Question 2 showed "The Wind has taken: P".
  - Typing "pancakes" left "ancakes", with "The Wind took P. Try a word without it."
  - A reload kept the countdown (6 seconds left).
  - A dev-server cache of a half-edited file gave a 500 until the dev server was restarted; the source was correct.
**13c-1 free typing** (branch `m13-game-mechanics`, 2026-10-21, Windows, local stack):
- `npx vitest run src/game/matching.test.ts src/game/payload.test.ts scripts/survey-score.test.ts src/app/api/run/routes.test.ts`: 4 files, 31 tests passed. They cover exact before typo ("moose" with a host "mouse" is moose and safe), one typo of 4+ letters, no typo under 4 letters or with spaces counted, two entries a typo away naming none, and the payload being only `{ index, prompt }`.
- `npm test -- --exclude ".claude/**"`: 18 files, 135 tests passed. `npx eslint .`: no output.
- `npm run test:db -- --exclude ".claude/**"`: 8 files, 55 tests passed, rerun after the review fixes with a different puzzle published locally for today. They include:
  - off-list text being a 200 `notInList: true` free retry, logged as one miss;
  - text over 40 characters being a 400 `text_invalid` with nothing logged;
  - off-list text for a later question being a 409 `not_current_question`.
- **In the browser** (`next dev` on the local stack, a local test account, the 2026-10-20 rehearsal questions loaded locally as 2026-10-21):
  - `GET /api/run` returned the question as `{"index":0,"prompt":"Name a sport"}`.
  - "quidditchball" + Enter showed "isn't in our list. Try another answer."
  - "socer" + Enter showed "Safe! You said soccer; the host said tennis." and question 2.
  - The local database then held the miss `0|quidditchball` and the answer `0|soccer|f`.

**13c-2 the timer** (branch `m13-game-mechanics`, 2026-10-21, local stack):
- `npm run test:db -- --exclude ".claude/**"`: 8 files, 60 tests passed, rerun after the review fixes. Besides the two midnight tests (yesterday's run goes on and is shown instead of today's puzzle; a retried answer to yesterday's timed-out run shows its ending), the five new timer tests:
  - 20 seconds from Start, and a refresh keeps the same deadline;
  - an answer 18 seconds in counts, and the next question gets its own 20 seconds;
  - an answer after 21 seconds ends the run as `timed_out`, with no answer stored;
  - no answer by the deadline shows `timed_out` without a write;
  - off-list text after the deadline shows the ending instead of a 409.
- `npx supabase test db`: 4 files, 77 tests passed, rerun after the review fixes. They include plor_app's exact grant list with execute on `private.question_deadline`; an answer to a run started before the reset living after it; and an answer 21 seconds in throwing OB005, with the run `timed_out`.
- `npm test -- --exclude ".claude/**"`: 18 files, 135 passed. `npx eslint .`: clean.
- **In the browser:** Start showed "18 seconds left" three seconds in. "socer" + Enter showed question 2 at "19 seconds left". After 20 seconds with no answer, the screen read "Time's up on question 2 / You survived 1 of 7 questions".

## Review
**13c-3** (reviewer agent, 2026-10-21):
- Blocking findings and how each was fixed:
  - The stolen-letter refusal used the question index the client sent, so a bypassed client could probe the letters of later questions (400 for a letter still to come, 409 otherwise), and ended runs answered 400 instead of their own errors. A db test input had been changed to dodge it. Now letters count only on the question in play, and the test sends a later question's own letters and expects 409.
  - A dev server was left running: it's kept on purpose, because the human is playing the game on `localhost:3000`; stopped when the human is done.
- Deferred to ROADMAP "Next revision": items under "M13 13c-3 review".

**13c-2** (reviewer agent, 2026-10-21; no way to beat the timer was found):
- Blocking findings and how each was fixed:
  - The plor_app grant was waiting for approval: the human approved it, and DECISIONS.md records that.
  - The countdown's 200 ms tick had no origin: it now wakes when the shown second changes, so no number is needed. "1 seconds" became "1 second" in the same line.
  - 'timed_out' ranked above 'abandoned' had made "abandoned runs score 0" nearly unreachable, with no rule for midnight: the human answered G13. The timer, not midnight, ends a run, 'abandoned' and OB001 are removed, and new SQL and db tests cover it.
  - The ticket still said 20 seconds per question was "to confirm": the human confirmed it.
- Deferred to ROADMAP "Next revision": items under "M13 13c-2 review".

**13c-1** (reviewer agent, 2026-10-21):
- Blocking findings and how each was fixed:
  - The deleted miss test's `not_current_question` case had no replacement: added to the free-retry db test.
  - The 13c-1 criterion was ticked while it named a stolen-letter test: that test moved to 13c-3's criterion, and the reason the check changed from `check:client-bundle` is recorded.
  - The Source diff was empty: four rows added.
  - DECISIONS.md stated the two-entries-a-typo-away rule as settled: marked unconfirmed.
  - A ROADMAP item named the deleted `suggest.test.ts`: closed.
  - Found while fixing: two db tests typed today's names into yesterday's run, which only worked while both days held the same puzzle. They now type from yesterday's puzzle.
- Deferred to ROADMAP "Next revision": six items under "M13 13c-1 review".
