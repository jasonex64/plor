# M13 — Game mechanics: working and smooth

**Status:** planned (draft ticket for the human's approval, 2026-10-20). Since the human's decision of 2026-10-20 this is the only MVP milestone: "only things that are about making the game mechanics work, and are smooth, should be on the MVP right now. everything else comes after".

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
| G4 | Picking an answer: keep today's two steps (pick, then "Lock in"), or one tap? | |
| G5 | After a safe answer: a reveal moment with a "Next" tap, or straight on to the next question with the reveal above it? | |
| G6 | Days while building: the `content-rehearsal` days locally and on staging, or put some of the 28 drafted days back on the calendar now (each one used now is one fewer for the closed beta)? | |
| G7 | How fast a locked-in answer must show its result (a human number, set after the first measurement in 13c) | |

## Design exploration (2026-10-21, not decided unless marked "human")
The human's problem statement: the game gives the player "too much leeway". Suggestions while typing act as hints, only listed answers can be submitted, and surviving all 7 is too easy because the answer space isn't restricted. Measured: the 2026-10-26 questions have 1 host answer out of 226 animals, 1 of 201 countries and 1 of 50 US states (2 of 12 on the last question).

The human's answers so far:
- **Typos:** "Auto-correct one typo" (human, 2026-10-21): text one typo away from an entry counts as that entry, using the existing typo rule (M02 Numbers), with no "did you mean" prompt.
- **Reveal:** "After each question" (human, 2026-10-21), worded for a board, which is no longer the lead design.
- **Ramp:** "make the mechanics more loose at the start, and then restrict more as time goes on to induce stress" (human, 2026-10-21).
- **Off-list answers:** "there should be a timer, so free retries are allowed as the timer provides a sense of urgency" (human, 2026-10-21). What happens at time-out, and whether the timer shrinks, are open (the human had no preference).
- **The share model** (a board of the top answers covering cₖ, a host catching tₖ): "does define what we want idealistically", but estimating shares by survey or from play over time is "just not feasible" (human, 2026-10-21).
- **The goal:** "people feeling like they are in control/capable of putting 'quirky' answers to live so that they feel smart while simultaneously still feeling some sort of danger" (human, 2026-10-21).
- **Lead idea:** the Wind steals letters. Each question bans one more visible letter; any valid answer without those letters is allowed; the host still catches the obvious answers; free typing with a timer. The human: "i like the first idea and would like to explore it more, but i need some real showing of … how we are able to properly take a large wordspace of answers" (2026-10-21).

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

## Acceptance criteria
Each criterion must be checkable with a command or other observable result. Criteria that depend on a decision get their final wording once it's answered.
- [ ] **13a** G1–G7 are answered here, and any rule change is written in DECISIONS.md.
- [ ] **13b** A day can be played from start to finish, both locally and on staging, using the days G6 chooses (evidence: the run's rows and a screenshot of the result).
- [ ] **13c** The play loop on `src/app/game.tsx`:
  - [ ] Enter on text that names no entry shows a hint instead of doing nothing (ROADMAP item from the M02 2c review).
  - [ ] Every answer gets a reveal: your answer next to the host's, safe or caught, in the G5 flow.
  - [ ] The points so far are shown during the run (G1), next to the "Question n of 7" that `game.tsx` already shows.
  - [ ] The picking flow follows G4.
  - [ ] A countdown to the reset is shown, from the next reset instant the server computes in SQL next to `private.today()` (ROADMAP item from the M00 review). A run still open at the reset ends as abandoned with a clear message.
  - [ ] Time from "Lock in" to the result, measured on staging, is within G7, and a second tap can't send the answer twice.
  - [ ] The result screen shows the run's points (G1).
- [ ] **13d** The questions on the days G6 schedules are tuned to G3: host answers and host banks adjusted using the survey findings and the M03 report. The human makes the content calls in ROADMAP "Next revision", Content. The M01 validator passes.
- [ ] **13e** Full runs on staging cover a full 7-of-7 run, a catch on every question number, a miss sent to "not in our list", and a refresh in the middle of a run that resumes it (evidence: `npm run status` plus the runs' rows). Tests cover every new rule from G1, G2 and the countdown.

## Out of scope
After the MVP (human, 2026-10-20):
- The sign-in page.
- The look and pixel art (M12).
- Share (M05), friends and the live board (M06), comments (M07), the points ledger and leaderboard (M08), and launch (M11).
- Free-text answers and "semantic search".
- AI puzzle drafting (M04).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| Questions per day | Run length, progress | 7 (human, 2026-10-18; M02 Numbers) |
| Points per question | Score during the run and at the end | k for question k (DECISIONS.md, Game 1, human-accepted 2026-10-17), unless G1 changes it |
| Host answers per question | Difficulty | Varies by question (DECISIONS.md, Game 1), unless G2 changes question 7 |
| Target catch rate | Tuning (13d) | G3, open |
| Answer response time | Smoothness (13c) | G7, open |

## Plan
One PR per sub-ticket, from the branch `m13-game-mechanics`.
1. **13a:** the human answers G1–G7. Rule changes go into DECISIONS.md.
2. **13b:** get days playable, as G6 chooses.
3. **13c:** the play-loop changes, one by one, each with a test where it's logic (the countdown and the scoring). Before measuring the answer time, write down the expected time, why, and what result would disprove it.
4. **13d:** tune the scheduled days to G3, and publish them with `content:publish` (the human runs it).
5. **13e:** full runs on staging, with evidence.

## Removes
- The one-line "Safe! You said …" (`LastResult` in `src/app/game.tsx`), replaced by the reveal.
- The "Lock in" step, if G4 picks one tap.
- The "For M12 (the play screens)" group in ROADMAP "Next revision": its play-screen items move here, and its sign-in items go after the MVP.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
