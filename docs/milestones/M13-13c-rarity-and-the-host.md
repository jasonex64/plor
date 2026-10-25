# M13 13c — Rarity and the host

**Status:** planned (2026-10-24). The human answered three rounds of guided questions; the design below waits for the human's approval.

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

**Security:** none expected. `plor_app` already reads `private.run_event` and `private.puzzle`, which the pooled counts need (*unverified* until built; any new grant would come back to the human first).

## Acceptance criteria
- [ ] **The expected share** (unit tests, hand-worked): the 40/40/20 split on a question with known levels and members; the blend with pooled counts above and below the minimum.
- [ ] **Pooling** (db test): an answer given on one day lowers its bonus on a later day of the same category; the provisional bonus ignores today's answers, and the final bonus counts them.
- [ ] **Host counts** (unit tests): the validator refuses a day whose host counts aren't 1, 1, 1, 1, 2, 2, 3; the draft's random pick is the same for the same date and comes from the host bank.
- [ ] **Familiar answers** (unit and pgTAP): the picker refuses letters leaving fewer than 3 familiar safe answers; approval refuses such a day with OB009.
- [ ] **The soft guide** (unit test): the summary's expected catch and finish rates for a hand-worked day.
- [ ] **T1** redrafted with `npm run draft` and approved and played on the local stack.
- [ ] `npm test`, `npm run lint`, `npx tsc --noEmit -p .`, `npm run test:db`, `npm run test:sql`, `npm run test:e2e` and CI pass.

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

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
