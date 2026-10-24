# M13 — Answer lists and content

**Status:** planned: draft ticket for the human's approval, 2026-10-23 (human, 2026-10-23: "u can close and start the ticket"). A1–A6 and the numbers wait on the human. No code before they're answered, and none before the answer source is in SOURCES.md (A2).

## Goal
A fair answer is accepted, a clever dodge isn't always safe, and each day is drafted from lists that improve once and help every later day.

## Who uses it / what breaks without it
- **Used by:**
  - every player, on every question;
  - the human and the drafting session, who build each day (DECISIONS.md, "Puzzle drafting").
- **Breaks without it:**
  - **Fair answers are refused.** Each day's accepted bank is typed by hand for that day. Free typing (M04) and stolen letters push players toward unusual answers, and a missing one is "not in our list". WordNet held 223 of one day's 226 animals (M04), but it isn't a source yet.
  - **The game is too easy, and in the wrong way.** In the M02 2g survey, 14 of 21 questions caught nobody, and only 10 of 110 answers were caught (`M02-2g-survey.md`, Findings). Obscure answers are always safe, and the rarity bonus (M09) pays extra for them. The human chose for the host to anticipate the dodge on later questions (ROADMAP, Design review, 1).
  - **The provisional bonus can't tell a popular dodge from a rare answer.** Today every answer outside the host bank is "uncommon" (M09 D11 (b)).
  - **Every day is drafted from scratch.** A missing answer found on one day stays missing on the next day with the same kind of question.
- **The human's words:**
  - "we want it to be challenging" (2026-10-21, M04 G3);
  - "lets go for host anticipating dodges later. with less letters available it will be harder for them to come up with crazy ideas anyway" (2026-10-22, Design review, 1);
  - order: M13 first, then M14, then M15, with content drafted right before the beta (2026-10-23, accepting Claude's revised order).

## Source
- **SOURCES.md has no answer source.** That's the gap A2 asks the human to close. Until it's added, no list is built from one (CLAUDE.md: "If no source covers the work, stop and ask").
- **Used as they are today:**
  - **DECISIONS.md, Game 1 and its Answer model:** one level of detail, match groups, normalization and plural aliases at authoring, and the typed-text rule.
  - **Puzzle content format** (Hard to reverse): format 2 today. A3 makes format 3.
  - **Unicode normalization** (UAX #15, UAX #44) and **pluralize** 8.0.0, for authoring.
  - **M09:** the bonus and its expectation (D11, N5).
  - **M04:** G3 and G9, the letter tiers, `scripts/content-letters.ts`.

## Claude's design (for the human to approve)
Sub-tickets, in this order:
- **13a, categories from a source:**
  - one reviewed list per kind of question (a "category"), built from the A2 source where one exists, curated where none can (abstract questions such as "something you'd bring to a potluck");
  - drafting picks a day's entries from its category (A1);
  - logged misses grow the category, not one day.

  It also takes the Next revision items for M13 on matching: plural aliases, digits, zero-width characters.
- **13b, popularity tiers and the dodging host** (A3, content format 3):
  - each entry carries a tier;
  - the host bank may include popular dodges on later questions;
  - the provisional bonus uses the tiers instead of "host bank = common";
  - the admin page shows and edits tiers. It also takes the match-group bug from Next revision.
- **13c, the letter picker** (A4): `content:letters` also keeps enough familiar answers safe (G9), counting by tier.
- **13d, tuning** (A5): host answers and banks aimed at the target catch rate, with the human, on a sample of days, measured against the survey and the M03 report.

**Moved out of M13:**
- To **M15**, right before the beta:
  - which days to play (M04 G6);
  - the 9 parked days;
  - drafting and approving the beta's stock;
  - moving drafts out of the public repo (`M15-15a-private-drafts.md`).

  Days drafted now would be in format 2 and public for weeks (human, 2026-10-23).
- **No content days and no `db push`** until the human asks.

## Decisions needed before any code
| # | Decision | Claude's suggestion | Answer (origin) |
|---|---|---|---|
| A1 | **Where the big lists live, and how a typed answer is checked.** (a) **Day files only:** a script copies a category's entries into each day's file at drafting; runtime matching is unchanged; a fix to a list helps only days drafted after it. (b) **Categories in the database:** each question points at a category, and the typed text is checked against the category's current list. A list fix then reaches days already approved, which breaks "an approved day can't change once its day has started" (DECISIONS.md, Puzzle content format) unless categories are versioned. (c) **Category files in the repo, copied into the day at approval:** categories are reviewed files, one per category; drafting picks from them; approval stores the full entries in the day's `private.puzzle` row as today | (c). Matching, the started-day rule and the admin page stay as they are. A category fixed once helps every later day. A category file holds no host answers, so it's safe in the public repo. Its tiers (A3) hint at what's common, but common answers are common to anyone. Cost: bigger puzzle rows (a few thousand entries at most; *unverified* until 13a measures one) | |
| A2 | **The answer source** (the human adds it to SOURCES.md; only a human can). (a) **WordNet** for concrete categories: noun hyponym trees (animals, foods, plants, objects). M04 measured it, but its license and version aren't recorded (*unverified*). (b) WordNet, plus a structured source for list-like categories it handles poorly (countries, elements, US states and capitals, national parks, NFL teams). Which one is the human's pick; candidates aren't read yet (*unverified*). (c) No source: keep curating by hand, and grow lists from misses only | (b), starting with (a). Most concrete questions are covered by WordNet; the rest are short closed lists a reference page settles. Each added source names its license, version and the categories it's for. Abstract questions stay curated either way | |
| A3 | **Popularity tiers** (content format 3, Hard to reverse; M09 D11 (c)). (a) **Three tiers per entry:** common, uncommon and rare, plus a "dodge" mark for the clever answers players reach for to avoid the obvious one; the host bank is common entries plus, from a given question on, dodges. (b) Two tiers (common, other) and a dodge mark. (c) A measured share per entry instead of tiers, once there's data | (a). It gives the bonus three steps, and the dodge mark is what Design review 1 needs. Tiers are set when a category is built, reviewed on the admin page, and can be replaced by measured shares from M03's counts later (c). Each tier's expected share replaces N5, and those are human numbers | |
| A4 | **The letter picker.** (a) **Keep it an authoring script** (`content:letters`): letters live in the day's file, the same for every player (fixed sequence), and the picker also keeps G9 familiar (common or uncommon) answers safe on each question. (b) A runtime picker that chooses each day's letters on the server | (a). Letters stay reviewable in the diff, and nothing new runs at midnight. The script already follows schedule A and refuses impossible questions | |
| A5 | **Tuning target** (M04 G3, "challenging"). (a) **A catch-rate curve** from Q1 to Q7 that host answers are picked to hit: the numbers are the human's. (b) A single target for the whole day. (c) No target: tune by feel, playing days together | (a), with the survey's measured rates as the starting point. The curve then also says which question the host may first pick a dodge on (A3) | |
| A6 | **What the M04 G9 minimum counts:** "familiar" means common or uncommon, so rare entries don't count toward the safe answers left | As written | |

## Acceptance criteria
Written once A1–A6 are answered. They will cover:
- **13a:**
  - a category built from the source, with its review in the diff;
  - drafting from it;
  - a day approved with its entries copied in;
  - the matching fixes, with tests.
- **13b:**
  - format 3 in the validator, the admin page and the bonus (unit and db tests);
  - format 2 days still readable or converted, decided in 13b.
- **13c:** the picker refuses a day that leaves fewer than G9 familiar answers safe (unit test).
- **13d:** the sample days meet the A5 curve on the survey's and the human's answers (recorded table).

## Out of scope
- The days for the beta, the parked days, and private drafts: M15 (above).
- Seeing friends' misses (ROADMAP Later).
- AI drafting from data (ROADMAP Later).
- Game 2's dictionary (M16): it may share A2's source, decided there.

## Numbers
Every one is the human's. None is set, so each is asked for with its decision.

| Value | Used for | Origin |
|---|---|---|
| Expected share per tier (common, uncommon, rare) | The provisional bonus (replaces N5, 50% for the host bank) | A3, for the human |
| First question where the host may pick a dodge | The host bank (A3) | A3/A5, for the human |
| Target catch rate per question (Q1–Q7) | Tuning (13d) | M04 G3, A5, for the human |
| Fewest familiar safe answers left after stolen letters and host answers | The letter picker (13c) | M04 G9, for the human |
| Host bank size guideline | Drafting | ROADMAP Next revision (M01), for the human |

## Plan
1. The human answers A1–A6 and adds the A2 source(s) to SOURCES.md.
2. **13a:** one category end to end (animals, the one M04 measured).
   - *Hypothesis:* the source covers at least the 223 of 226 animals M04 counted, with its version pinned.
   - *Disproved* if the pinned version's count is lower, which would mean M04 measured something else.
   - Then the remaining categories the drafted days use.
3. **13b**, **13c** and **13d** in order, each its own PR on this branch, with its criteria written before its code.

## Removes
- `M13-13a-private-drafts.md` from M13: it's now `M15-15a-private-drafts.md`, moved by its P4 (b).
- Once 13a–13b ship:
  - hand-typed per-day accepted banks, which become picks from categories;
  - the "host bank = common" expectation (M09 D11 (b)), replaced by tiers.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
