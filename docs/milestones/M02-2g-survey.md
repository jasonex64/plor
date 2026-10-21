# M02 2g — Content survey instead of the live playtest

**Status:** in review (scoring and findings, 2026-10-21; the human picks the content changes). Asked for by the human on 2026-10-20 ("draft a message i can copypaste as well as a spreadsheet template … adjust roadmaps accordingly … we can delay/postpone those [puzzles]").

## Goal
Measure how the questions play (catch rate, host bank share, missing answers) from emailed answers, so the live playtest can wait for the finished design.

## Who uses it / what breaks without it
- Used by: the human, to fix the puzzle lists and hosts before launch; M04, whose drafting reads the same numbers.
- Breaks without it: with the playtest moved to the MVP (human, 2026-10-20: "I don't want people to playtest the site when it's not done"), every catch rate stays an estimate (DECISIONS.md, Game 1) until launch. M04 and every content fix would be built on guesses.

## Decisions
| # | Question | Decision | By |
|---|---|---|---|
| D1 | Live playtest | Moved to the MVP: it becomes the M11 closed beta, and M12 (visual design) moves before M11 so testers see the finished design | human, 2026-10-20 |
| D2 | What replaces it now | An emailed survey of the prompts, framed as the game ("give an answer the host *didn't* pick"), so people answer the way they would in play | human, 2026-10-20 |
| D3 | The 28 published days (2026-10-26 to 11-22) | Taken off the calendar: the human deletes the not-yet-started rows from `private.puzzle` (plan step 2). The files stay in `content/offbeat/` with their dates until the live test's dates are known, then they're re-dated like M02 D2 and republished | human, 2026-10-20 |
| D4 | Response format | One row per person per set: `person,set,q1..q7` (`docs/survey/responses-template.csv`), where set 1, 2 and 3 are the puzzles of 2026-10-26, 10-27 and 10-28, as in the message. A set number instead of a date, because Sheets turns typed dates into date values. People are numbered, never named, and answers are copied exactly as written | Claude, 2026-10-20; set column after the human asked for a sheet they can fill in |

## Source
- DECISIONS.md, Game 1 and the answer model: difficulty is the share of players the host's answers catch; matching is by entry ID, after normalization.
- `docs/milestones/M03-puzzle-insights.md`: the report's measures and `buildInsights` (`src/insights/report.ts`), which takes answers and misses and has no user IDs.

## Acceptance criteria
- [x] A message the human can copy and paste, and a spreadsheet template (`docs/survey/message.md`, `docs/survey/responses-template.csv`).
- [x] ROADMAP: the playtest moves to the MVP (M11, now after M12); M02 and M03 close on the survey findings; items that waited on "the playtest" point to the survey or the live test.
- [x] The not-yet-started days are gone from the hosted `private.puzzle` (the human's query output from plan step 2: `0` rows after 2026-10-20). *Human, 2026-10-20: "deleted the puzzles" (query output not pasted).*
- [x] The responses come back, and a script scores them through `normalize`, `matchAnswer` and `buildInsights`: one report per surveyed day (catch rate, host bank share, top answers) plus the answers that matched no entry. Unit test on a small fixture. *`npm run survey:score -- docs/survey/responses.csv`; `scripts/survey-score.test.ts`.*
- [ ] The findings are recorded in M02 and M03, and the human picks the content changes.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 3 days (21 prompts) | Survey size | The human said "yes" to "the next 3–5 unplayed days" (2026-10-20); Claude took the low end to keep it to about 5 minutes. The human can add days |
| Who answers | Respondents | "The human plus a few friends" (M02 Numbers, human 2026-10-18) |
| `INSIGHTS_MIN_PLAYERS` | "Too few answers" flag | Already in `src/config/tunables.ts` (M03) |

## Plan
1. The human sends `docs/survey/message.md` and copies each reply into a copy of the template (Google Sheets or Excel, then **File → Download → CSV**).
2. **The human takes the scheduled days off the calendar** (Supabase dashboard → SQL Editor, which runs as `postgres`; `plor_publisher` has no delete grant). First see what would go:
   ```sql
   select puzzle_date from private.puzzle where game_id = 'offbeat' and puzzle_date > private.today() order by puzzle_date;
   ```
   Expected: 28 rows, 2026-10-26 to 2026-11-22. If you see anything else, stop. Then:
   ```sql
   delete from private.puzzle where game_id = 'offbeat' and puzzle_date > private.today();
   ```
   Expected: 28 rows deleted. `> private.today()` never touches a started day. No runs can exist for a future day, so the run foreign key can't block it. Run the first query again: expected 0 rows. The content stays in git; republishing restores it.
3. The human sends Claude the CSV (answers only, no names or emails). Claude writes the scoring script against it as its own PR, then records the findings.
4. The human decides the content fixes; the surveyed days are spoiled for the people who answered, so they get new prompts or the people are told before the live test.

## Removes
- The "playtest closes M02" checkpoint and the 2026-10-26 playtest dates (ROADMAP, M02 ticket), replaced here.
- The 28 published days in `private.puzzle` (plan step 2); the files stay.
- Part B of 2f no longer waits for a playtest.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| The game ends a run at the first match (DECISIONS.md, Game 1: sudden death) | The scorer counts everyone's answer to every question | The survey asked everyone to answer all 7 (`docs/survey/message.md`), so each question gets 7 answers instead of only the survivors'. Later questions therefore include people the game would have ended (e.g. 10-27: three people caught on Q4 or Q6 still count on Q7), which also affects the "breaks the shape" flags |
| In the game the player picks an entry, helped by suggestions (`suggest.ts`) | Only an exact match after normalization counts; the rest are listed with what the box would offer | The scorer can't know which suggestion a person would have tapped, and the game never guesses (DECISIONS.md, answer model). The 7 answers the box would fix are named in finding 2 |

## Evidence
**Responses (2026-10-21).** Read from the human's Google Sheet through the Drive connector (CSV export) and saved as `docs/survey/responses.csv`: 7 people × 3 sets, every prompt answered, no names.

**Scoring.** `scripts/survey-score.ts` (`npm run survey:score -- <csv>`): an answer counts only if it names an entry exactly after normalization, like Enter in the answer box. `matchAnswer` decides whether the host caught it, and `buildInsights` builds the insights page's report. Anything else is listed with what the answer box would have offered. To run under plain Node, `src/insights/report.ts` and `src/game/suggest.ts` now import their modules with relative `.ts` paths, like `puzzle.ts` and `db.ts` already did (B16's rule); the Next.js build still compiles. Checks: `tsc` and lint clean, `npm test` 139 passed (5 new), `npm run build` compiled.

**Findings** (7 people, so every rate is rough; `INSIGHTS_MIN_PLAYERS` is 5 and several questions fall under it once off-list answers are removed):

| | Set 1 (10-26) | Set 2 (10-27) | Set 3 (10-28) | All |
|---|---|---|---|---|
| Answers that named an entry | 35 of 49 | 39 of 49 | 36 of 49 | 110 of 147 (75%) |
| Caught by the host | 3 | 3 | 4 | 10 of 110 (9%) |
| Questions that caught nobody | 5 of 7 | 5 of 7 | 4 of 7 | 14 of 21 |

1. **Most questions caught nobody: 14 of 21, and 10 of 110 entry answers overall.** DECISIONS.md (Game 1) sets no target rate: it says difficulty "rises gently through the day", "most players should usually finish", and catch rates are estimates. Its one worked figure is "1 of 12 zodiac signs catches about 1 player in 12"; by that reasoning, 10-26 Q7 (2 hosts of 12 signs) would catch about 1 in 6, and it caught 2 of 5. No other question has a stated estimate to compare with. The catches: Q7 zodiac 2 of 5, Q6 card rank 2 of 7, Q7 Chinese zodiac 2 of 6, and one each on Greek letter, reason for being late, pizza topping and colony. The report flags two questions as breaking the rising shape: 10-27 Q7 (months, 0 of 6 after 2 of 7) and 10-28 Q5 (Scrabble letters, 0 of 7 after 1 of 5). Both flags compare everyone's answers, including people the game would already have ended (Source diff). On every question, the most common answer was given by at most 3 people (New Hampshire).
2. **A quarter of answers aren't in the lists (37 of 147).** The answer box would offer the right entry for 7 of them: "scrambled" and "poached"/"Poach" (the "... eggs" entries; "scrambled eggs" is the host, so that player would have been caught), "kwanza" (Kwanzaa), "Kakiguri" (kakigōri), "table cloth" (tablecloth), "Ispy" (I spy). The rest are candidates for the lists:
   - 10-26 animal: bearded dragon, liger, grizzly bear. Rainy day: swim in the rain, dance in the rain, build a fort, cook BBQ, "drink" (too vague; the box offers "drink hot cocoa").
   - 10-27 ocean: sunken treasure, cephalopod, "animal pee". Holiday: none beyond Kwanzaa's spelling. Late: car won't start, daylight saving started, bathroom. Country: "dijabouti" (Djibouti, two typos, so the box offers nothing).
   - 10-28 potluck: sourdough bread. Pizza: Italian seasoning, "M&m". Indoor game: King's Cup, League of Legends, Minecraft, Mario Party, Munchkin (video, card and drinking games). Indoor games and 10-26's rainy-day activities are the two biggest gaps: 1 of 7 answers was in the list for each. Card: "4diamonds" (four of diamonds, written oddly).
3. **Answers to the wrong question:** "rat" and "hare" for a Western zodiac sign, "aries" for a month, "maine" for the 13 colonies (correctly not in the list; Maine was part of Massachusetts). "hare" for the Chinese zodiac may deserve an alias of rabbit.
4. **Host bank share:** among questions with at least 5 entry answers, outside the 12-item closed sets, it ranges from 14% to 86% (Scrabble letters 86%, pizza 60%, card rank 57%). The 12-item closed sets (zodiac, months, Chinese zodiac) are 100% because every entry is in their host bank. Questions with too few entry answers range from 0% to 100% (rainy day: 100% from a single answer). Where the share is high and the catch rate low, people named a typical answer that wasn't the host's pick.

*Interpretation, for the human (not a finding):* the survey framing ("give an answer the host *didn't* pick") is the game's own, so the many zero-catch questions may mean the host answers are easy to avoid when people know the rule. With 7 people this is a hint, not a measurement.
- Plan step 2: the human reported "deleted the puzzles" (2026-10-20) and merged PR #18. The query output wasn't pasted, so the row count is *unverified* beyond that report.

## Review
Reviewer agent on `9eeb82e`, 2026-10-21.
- Blocking findings and how each was fixed:
  1. Finding 4's host-bank range left out rainy day's 100% (from one answer): restated by answer count.
  2. "Indoor games, the biggest gap" ignored rainy day's equal gap: now named as a tie.
  3. "The host catches far fewer than intended" stated a target no source gives: restated against what DECISIONS.md says, with its one worked figure (zodiac) compared.
  4. The Source diff was empty although the scorer drops sudden death and counts only exact matches: both rows added.
  5. The M03 Status line wasn't updated with its ROADMAP row: updated.
- Deferred to ROADMAP "Next revision": misplaced line numbers in the scorer's errors after blank rows; duplicate (person, set) rows not refused; short rows accepted; a bare `"` in an unquoted field; no test for the "ends inside a quoted field" error.
