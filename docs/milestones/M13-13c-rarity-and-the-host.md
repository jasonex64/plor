# M13 13c — Rarity and the host

**Status:** done (2026-10-24), on PR #73's merge on green CI (human, 2026-10-24: "Merge PR #73 once every CI check is green, then start 13d with guided questions."). The human answered three rounds of guided questions and approved the design (human, 2026-10-24: "I approve 13c's design. Build it.").

## Goal
The rarity bonus comes from what players really answer, pooled across every day a category is asked; the host names a fixed number of answers per question, drawn at random from its bank; and a player who knows the category always has 3 familiar answers that survive.

## Who uses it / what breaks without it
- **Used by:**
  - every player: the bonus and the host decide each run's points and ending;
  - the human, who approves drafted days in under a minute.
- **Breaks without it:**
  - **The bonus is a guess forever.** The expected share comes from the host bank alone (M09 D11, N5: "host bank = common"), the same every day, so play never teaches it which answers are popular.
  - **A day can corner a player who knows the category.** Nothing keeps familiar answers typeable and safe once letters are stolen (M04 G9).
  - **Host answers vary by hand** (format 3: "1 or more, the count varying by question"), with no rule for how many.

## What the human decided for 13c (guided questions, 2026-10-24)
Already decided in the M13 ticket: rarity pooled per category with **all history equal** (D5); the AI's first guesses **40% / 40% / 20%** of players giving some common / uncommon / rare answer (D5); **3** familiar answers (M04 G9).

| Question | The human's answer |
|---|---|
| What an answer nobody has given yet is worth | "Full bonus, as now": the rare 20% is split across every rare member, so a never-given answer earns nearly the maximum until players give it |
| The bonus shown before the day closes | "Past days only (Recommended)": the provisional bonus uses past days; today's answers count in the final bonus, at the day's close |
| How dodges get onto a day | First "Draft adds it, you veto (Recommended)". Then, asked how many: "not sure what u mean each question should have a fixed number of host answers, and if we happen to have really easy or really tough days, thats just part of variance adn what will drive engagment". **This replaces D5's dodges tied to difficulty** |
| How many host answers | "1 1 1 1 2 2 3" for Q1 to Q7 |
| Which answers the host picks | "Random from the host bank" |
| The catch targets ("Gentle", 3% → 20% caught, about 45% finish) | "Keep as a soft guide", then "Show, never warn (Recommended)": the draft's summary shows each question's expected catch rate next to its target, and the expected finish rate next to 45% |
| The 3 familiar answers | "Typeable and safe (Recommended)": typeable past the stolen letters **and** not caught by the host |

## Source
- **The M13 ticket:** D5 (pooling, all history equal, 40/40/20), the Numbers (targets, 3 familiar), "How rarity works (D5)". This ticket replaces D5's dodge rule with the human's fixed host counts.
- **M09** (`M09-points-and-leaderboard.md`): the blend (N1, W = 10 players), the minimum (N4, 5 players), the bonus formula (N2) and the caps (N3). Only where the expectation comes from changes; N5 goes.
- **M04** G9 (familiar answers) and schedule A (the letter picker, `scripts/draft.ts`).
- **13a and 13b:** format 3, `levels`, answers fixed at the day's start, thing IDs shared across days.

## Claude's design (for the human to approve)
**1. The expected share, pooled.** For an answer X to a question in category K:
- **First guess** (from the day's `levels`): 40% split evenly among the question's common members, 40% among its uncommon ones, 20% among the rest of the category's members, the rare ones.
- **Pooled counts:** *c* is the number of answers X across every question of category K; *n* is the number of answers to those questions. Today's answers are left out of the provisional bonus and counted in the final one, at the day's close.
- **Blended:** (10 × first guess + *c*) / (10 + *n*) once *n* is at least 5, else the first guess (N1 and N4, unchanged). N2's bonus and N3's caps apply as now.
- An answer players added in 13b has no level, so it's rare.

**2. The host's answers.** `npm run draft` picks the host answers at random from the host bank, seeded by the date like the letters:
- the counts are **1, 1, 1, 1, 2, 2, 3** for Q1 to Q7;
- the validator (`src/content/puzzle.ts`) refuses a day whose counts differ, so a hand-written day follows the same rule and still names its own host answers ("a way for me to manually write a puzzle ... as well as the host's specific answer").

**3. Three familiar answers, typeable and safe.**
- The letter picker refuses letters that leave a question with fewer than 3 members that are common or uncommon, have a name avoiding every stolen letter so far, and aren't caught by the day's host answers.
- The host answers are picked first, then the letters.
- `private.approve_puzzle` checks the same rule (OB009), replacing its "at least one answer the host doesn't catch" check.

**4. The soft guide.** The draft's summary shows each question's expected catch rate next to its target (3, 5, 7, 10, 13, 16 and 20%), and the expected finish rate next to 45%:
- the expected catch rate is the blended share of the host answers and everything under them;
- the expected finish rate is the product of (1 − catch rate) over the 7 questions.

It never warns or changes the day.

**5. The T1 day** is redrafted under the new rules (its hosts today don't follow 1, 1, 1, 1, 2, 2, 3).

**Security:** none. `plor_app` already reads `private.run_event` and `private.puzzle`, which the pooled counts need: `ledger.db.test.ts` reads them as `plor_app`. `private.approve_puzzle` keeps its signature and grant.

## Acceptance criteria
- [x] **The expected share** (unit tests, hand-worked): the 40/40/20 split on a question with known levels and members; the blend with pooled counts above and below the minimum.
- [x] **Pooling** (db test): an answer given on one day lowers its bonus on a later day of the same category; the provisional bonus ignores today's answers, and the final bonus counts them.
- [x] **Host counts** (unit tests): the validator refuses a day whose host counts aren't 1, 1, 1, 1, 2, 2, 3; the draft's random pick is the same for the same date and comes from the host bank.
- [x] **Familiar answers** (db test and pgTAP): the picker refuses letters leaving fewer than 3 familiar safe answers; approval refuses such a day with OB009.
- [x] **The soft guide** (unit test): the summary's expected catch and finish rates for a hand-worked day.
- [x] **T1** redrafted with `npm run draft` and approved and played on the local stack.
- [x] `npm test`, `npm run lint`, `npx tsc --noEmit -p .`, `npm run test:db`, `npm run test:sql`, `npm run test:e2e` and CI pass. CI on PR #73 at `ae4703f`: check, db, e2e, secrets and Vercel all pass (runs 40164459206 and 40164475180).

## Out of scope
- The question bank, themes and the repeat gap (13d).
- Warnings or automatic tuning toward the targets (the human: "Show, never warn").
- Dodges as their own rule (replaced by random picks from the host bank).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| **40% / 40% / 20%** of players give some common / uncommon / rare answer | The first guess | Human, 2026-10-24 (M13 D5): "40 / 40 / 20" |
| All history counted equally | Pooling | Human, 2026-10-24 (M13 D5): "All history equal" |
| W = **10** players; minimum **5** players | The blend | M09 N1 and N4 (human, 2026-10-22) |
| Host answers per question, Q1–Q7: **1, 1, 1, 1, 2, 2, 3** | The draft and the validator | Human, 2026-10-24: "1 1 1 1 2 2 3" |
| **3** familiar answers, typeable and safe | The letter picker and approval | Human, 2026-10-24 (M13 Numbers: "3"; here: "Typeable and safe (Recommended)") |
| Targets **3, 5, 7, 10, 13, 16, 20%** caught; about **45%** finish | Shown in the draft's summary only | Human, 2026-10-24 (M13 Numbers: "Gentle: 3→20%, ~45% finish"; here: "Show, never warn (Recommended)") |

## Plan
1. The human approves this design.
2. The expected share and pooling, with tests; then host counts and the familiar check in the draft, validator and approval; then the summary; then T1.
3. Review, fixes, PR on `m13-answer-lists-and-content`.

## Removes
- N5 (`HOST_BANK_EXPECTED_SHARE`) and the "host bank = common" expectation (M09 D11 b).
- The day-only counts in the bonus, replaced by pooled counts.
- D5's dodges tied to difficulty, and format 3's freedom over how many host answers a question has.
- `private.approve_puzzle`'s "at least one answer the host doesn't catch" check, replaced by the 3 familiar safe answers.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Design 1: a tier's share split among its members | The same, and a tier with no members passes its share to the others in proportion | Claude's reading, as M09's "every member in the host bank"; no number involved (`firstGuess`) |
| Design 2: the draft draws the hosts | It does; when the drawn hosts block every letter (T1's Q7: Texas, California and Ohio held every vowel the Wind could steal there), the drafting session changes the bank | The host counts and random draw are the human's; DECISIONS.md, Puzzle drafting, says to change the bank or the uncommon answers |
| (not in the design) | `src/game/scoring.ts` and `ledger.ts` import relatively, with extensions; `Db` takes a script's own client | `npm run draft` runs them on plain Node for the soft guide, as `src/content/puzzle.ts` already is |
| (not in the design) | The fixture gains members (Mali, Togo, tungsten, titanium, eye, skin) and uncommon levels, and sports replace months | Under C, P, R and O, the months and countries couldn't keep 3 familiar answers typeable and safe |

## Evidence
**13c's build (2026-10-24, local stack):**
- `npm test` → 36 files, 209 tests passed, including:
  - `scoring.test.ts`: the first guess (dog 0.4/2, cat 0.4/3, horde 0.2/6; an empty tier's share passed on); pooled blending at 20 answers (horde 3 of 20 → 5) and below 5 (→ 10);
  - `draft.test.ts`: `pickHosts` gives 1, 1, 1, 1, 2, 2, 3 from the bank, the same for a date, and refuses a small bank; the soft guide for seven 10% questions → finish 48% (the targets': 45%);
  - `content-validate.test.ts`: a host count off the schedule is refused.
- `npm run test:db` → 35 files, 232 tests passed, including `ledger.db.test.ts`, reworked by hand:
  - A 150 + 0; A's second day 25 + 7 (aardvark 2 of 17 pooled over both days; that day's answers alone would give 10); B 1000 + 163; C 75 + 9; E 75 + 6;
  - the provisional pooling leaves the day out (16 answers, aardvark 1) and the final one counts it (17, 2), read as `plor_app`.
- `npm run test:sql` → `Result: PASS`, including `puzzle_entry.test.sql`: exactly 3 familiar answers typeable and safe pass; 2 are refused with OB009; after the review, a level on a thing outside the category is refused too.
- After the review, `scripts/draft.db.test.ts` (4 tests) runs the draft's own familiar check on the fixture. Local, after the review fixes: `npm test` 36 files and 209 tests, `npm run test:db` 36 files and 236 tests, `npm run test:sql` PASS, 14 e2e passed.
- `npx playwright test` → 14 passed; `approve-and-play.e2e.ts` plays the fixture past C, P, R and O with cat, kiwi, green, Kenya, lead, boxing and knee, and the reveal reads "the host said hand, head, leg".
- `npx tsc --noEmit -p .`, `npx eslint src e2e scripts` and `npm run content:validate` clean.
- **T1, redrafted:** `npm run draft` first refused it: "no letters fit schedule A". A diagnosis script (deleted after) found Q7's drawn hosts, Texas, California and Ohio, held every vowel the Wind could steal there.
  - The US-state bank became states with no E: California, Florida, Ohio, Iowa, Idaho, Utah. Uncommon answers were added to each question.
  - The draft then wrote letters U, P, T, E; hosts Lion, Germany, grape, Labrador Retriever, Swiss cheese and cheddar, iron and hydrogen, California, Idaho and Florida.
  - The soft guide: expected catch 7%, 7%, 8%, 7%, 18%, 13%, 20% against 3–20%; expected finish 42% against the targets' 45%.
- **T1 approved and played** on the local stack by a temporary Playwright script (deleted after, with its day and players): member counts 56,787, 193, 2,999, 928, 48, 118 and 50. Zebra, Kenya, banana, Beagle, Brie, neon and Hawaii survived all 7: 1000 points and a provisional bonus of about 321 (about 479 before 13c, when every unleveled answer was split from half the players).

## Review
**13c:** the `reviewer` agent reviewed the diff in a fresh context, 2026-10-24. It recomputed every hand-worked number and found them right, approved T1 through `private.approve_puzzle` in a rolled-back transaction, and found `pickHosts` reproduces T1's hosts and draws close to evenly over 365 dates.
- **Blocking findings and how each was fixed:**
  - *HANDOFF.md still asked the human to approve 13c's design.* Rewritten.
  - *The draft's familiar check had no test* (only approval's copy did). `scripts/draft.db.test.ts` runs `familiarLeft` on the fixture: three familiar answers pass and two don't; a stolen letter, a member under a host answer and a member left out of the levels are each left out; an answer typeable only by its scientific name counts.
  - *Levels were never checked against the category,* though `firstGuess` now divides by the members left after them. A stray level could make a rare share infinite, so 0 bonus, or negative, so a bonus above N2's half. `private.approve_puzzle` now refuses a level on a thing outside the category (OB009; pgTAP).
- **Deferred to ROADMAP "Next revision"** (For M13): the rare tier counting members at approval; `expectedCatches` untested; two stale lines in DECISIONS.md, Game 1; the 3 in SQL tied to `FAMILIAR_SAFE_MIN` by comments only; more familiar-rule cases in pgTAP; `pooledCounts` on every state read; `pickHosts`'s generator constants unexplained; ROADMAP items naming `safeAnswerLeft`.
