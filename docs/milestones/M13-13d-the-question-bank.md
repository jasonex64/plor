# M13 13d — The question bank

**Status:** done (2026-10-24), on PR #75's merge on green CI (human, 2026-10-24: "Merge PR #75 once every CI check is green, then start 13e with guided questions."). The human answered three rounds of guided questions and approved the design, its security change and 13e (human, 2026-10-24: "I approve 13d's design, its security change (dropping private.save_questions and its grant), and 13e as the next sub-ticket. Build 13d.").

## Goal
A bank of questions the draft picks each day's 7 from, never asking a category again within 30 days, preferring a date's theme and ordering the day easiest first, so a day can be drafted from a date alone and the human only vetoes.

## Who uses it / what breaks without it
- **Used by:**
  - the drafting session, which drafts a day from its date;
  - the human, who sets themes and vetoes days and questions;
  - later, the AI that drafts days (ROADMAP Later).
- **Breaks without it:**
  - **The human writes every day's 7 questions by hand** (the admin page's "Write a day's questions"). The human wanted the AI to draft and to only veto.
  - **Nothing stops a repeat.** A category can come back the next day, against the human's "at least 30 days" (M13 D7).
  - **Themes have nowhere to live** (M13: "Themed days: Yes, sometimes").

## What the human decided for 13d (guided questions, 2026-10-24)
Already decided in the M13 ticket: **at least 30 days** between uses, "the AI may wait longer" (D7); themes are tags (D7).

| Question | The human's answer |
|---|---|
| Who picks a day's questions | "Draft picks, you veto (Recommended)": the draft picks 7 not used in the last 30 days; the human approves or swaps |
| What counts as the same question for the gap | "Same category (Recommended)" |
| Themed days | "You set a theme for a date (Recommended)": questions carry theme tags; the draft prefers that theme's questions on that date |
| How the bank grows | "You and Claude add (Recommended)": a drafting session may propose questions from categories the database has, which the human approves into the bank; new categories still need the human's OK (13a) |
| The order of a day's 7 | "Easiest first (Recommended)": by expected catch rate |
| Overlapping categories (dog breed under animal) | "Separate (Recommended)": each category has its own gap |
| Too few questions outside the gap | "Stop and ask (Recommended)": the gap is never broken |
| What the bank shows | "Uses and catch rate (Recommended)": the days each question ran and the share of players caught each time |
| Where the bank lives | "A file, like drafts (Recommended)": `content/bank.json` next to the drafted days, changed in PRs, moving private with the drafts in M15 15a |
| Writing a day by hand | "Pick its 7 yourself (Recommended)": the draft takes 7 named bank questions for a date; the admin page's "Write a day's questions" box goes away |
| 7 a day with a 30-day gap per category needs 210+ categories; there are 7 | "Keep it; grow categories (Recommended)": growing the categories is its own sub-ticket (13e, below); until then the draft stops and asks |

## Source
- **The M13 ticket:** D7 (the gap, themes), "The question bank" in Claude's design, the Numbers.
- **13a–13c:** format 3, `npm run draft`, the soft guide's expected catch rates, `content:validate`.
- **DECISIONS.md:** Puzzle drafting, Puzzle approval, Puzzle content format.
- **M03 insights** (`src/insights/queries.ts`): the per-question catch shares the bank shows.

## Claude's design (for the human to approve)
**1. The bank file.** `content/bank.json` holds `format: 1`, `questions[]` and `themes`:
- **Each question** has an `id` (a slug), `prompt`, `category`, `host_bank` and `uncommon` (names, or "#<thing id>", as the spec is today), `themes` (tags), and `added_by` ("human" or "claude").
- **`themes`** maps a date to a theme tag: the human's "theme for a date".
- `npm run content:validate` checks its shape. The names are checked when a day is drafted, as now.
- Claude adds questions in a PR, and the human approves them by merging. The human adds by telling a session, or by editing the file.

**2. Drafting from a date.** `npm run draft -- <date>` replaces `npm run draft -- <spec.json>`:
- **Eligible:** a question whose category isn't on any drafted day (`content/offbeat/*.json`) within 30 days of the date, before or after it.
- **Picked:** questions tagged with the date's theme first, then the ones never used, then the least recently used. Ties are broken by a date-seeded random order, like the letters. If fewer than 7 are eligible, the draft stops and says how many are missing.
- **Ordered easiest first:** by the expected catch rate of one host answer drawn from the bank (the first guess blended with pooled past days, as the soft guide computes it). The same measure holds for every question before positions decide the host counts.
- Then, as in 13c: hosts drawn 1, 1, 1, 1, 2, 2, 3; letters; the familiar check; the soft guide.
- **By hand:** `npm run draft -- <date> --questions <id>,…` takes those 7 bank questions in that order.

**3. The gap in CI.** `npm run content:validate` refuses two drafted days that ask the same category less than 30 days apart. Approval reads the drafted file, so a day that passed CI holds the gap.

**4. The bank page.** `/admin/bank` (admins only) lists each question with its category, themes, the days it ran (drafted days) and, for days that have been played, the share of players caught (the insights the admin page already computes). It also lists the themes by date. It's read-only: changes go through the file.

**5. Removes the old way in.**
- The admin page's "Write a day's questions" box and "Copy for Claude", and their route.
- `private.puzzle_questions` and `private.save_questions`, with `plor_app`'s execute grant on it. **Removing a grant is a security change:** proposed here, and recorded in DECISIONS.md when built.

**6. The first bank.** The 7 questions of T1, with the banks and uncommon answers its draft used, so the bank starts with what's drafted. With 7 categories, a new day can only be drafted 30 days after T1, until 13e.

**13e (new, proposed): growing the categories.** Reaching the 210+ categories daily days need, through more reviewed imports and recipes that combine traits ("African animal"). It gets its own guided questions after 13d, before M15 needs daily days.

## Acceptance criteria
- [x] **Picking** (unit tests on a bank and drafted days in temp folders): the gap leaves out a category used 29 days before or after, and keeps one used 30 days away; a theme's questions come first; never-used before least recently used; the same pick for a date every time; too few eligible stops with the count.
- [x] **Order** (unit test): easiest first by the expected catch of one host answer.
- [x] **By hand** (unit test): `--questions` takes the 7 named questions in that order, and refuses an unknown ID or a category inside the gap.
- [x] **The gap in CI** (unit test): `content:validate` refuses two days asking a category 29 days apart, and passes 30.
- [x] **The bank page** (e2e): an admin sees T1's questions with the day they ran; a player gets 403.
- [x] **Removed:** `private.puzzle_questions` and `private.save_questions` dropped (pgTAP: `plor_app`'s grants without them); the admin page has no questions box.
- [x] **The first bank** holds T1's 7 questions, and `npm run draft -- 2026-10-24 --questions <T1's ids>` reproduces T1's file.
- [x] `npm test`, `npm run lint`, `npx tsc --noEmit -p .`, `npm run test:db`, `npm run test:sql`, `npm run test:e2e` and CI pass. CI on PR #75 at `cb22ace`: check, db, e2e, secrets and Vercel all pass (runs 40167848914 and 40167872213).

## Out of scope
- Growing the categories (13e).
- Editing the bank or themes on the admin page (the bank is a file: "A file, like drafts").
- Moving the bank and drafts out of the public repo (M15 15a).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| **30** days at least between uses of a category | The pick and `content:validate` | Human, 2026-10-24 (M13 D7: "not saying it should be EXACTLY 30 days just at least 30 days"; here: "Same category (Recommended)") |
| **7** questions a day | The pick | `QUESTIONS_PER_DAY` (M01) |
| 210 categories | Only the arithmetic behind 13e (7 × 30), not a limit | Claude's multiplication, shown to the human |

## Plan
1. The human approves this design, its security change (removing `private.save_questions` and its grant) and 13e as the next sub-ticket.
2. The bank file and validator; the picker and order; `--questions`; the CI gap; the bank page; the removals; the first bank.
3. Review, fixes, PR on `m13-answer-lists-and-content`.

## Removes
- `npm run draft -- <spec.json>` and the spec format, replaced by the bank and a date.
- The admin page's "Write a day's questions", "Copy for Claude", their route, `private.puzzle_questions`, `private.save_questions` and its grant.
- DECISIONS.md, Puzzle drafting's step (1), "Take the date and the 7 questions from the admin page's 'Copy for Claude' text".

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Design 4: the days a question ran | Matched by the question's prompt and category in the drafted days | A drafted day doesn't name its bank question, and adding a field would change format 3 (Hard to reverse); prompt and category identify it |
| Design 2: each category once | Also within one day: the gap counts the same category twice on a date | A 30-day gap can't allow two uses on one day |
| (not in the design) | When no letters fit, the draft names the question where it blocks, with its drawn hosts | DECISIONS.md, Puzzle drafting, said to tell the human which question; the first pick for 2026-11-30 showed the plain "no letters fit" said nothing |
| (not in the design) | `isObject`, `checkKeys` and `isText` are exported from `src/content/puzzle.ts` | The bank's checks reuse them rather than copying them |

## Evidence
**13d's build (2026-10-24, local stack):**
- `npm test` → 37 files, 217 tests passed, including:
  - `src/content/bank.test.ts` (9 tests): the shape; the gap at 29 and 30 days; the pick: the gap before and after, the theme first, never used before least recently used, the same for a date, and "only 5 … 2 more needed"; `--questions` in order, refusing an unknown ID and a category inside the gap; easiest first;
  - `content-validate.test.ts`: two days asking a category 29 days apart are refused and 30 pass; `bank.json` is checked and not counted as a puzzle.
- **The first bank reproduces T1:** `npm run draft -- 2026-10-24 --questions name-an-animal,…,name-a-us-state` rewrote `content/offbeat/2026-10-24.json` byte for byte (`diff` empty), with letters U, P, T, E.
- **Picking by date** (the trial file deleted after; no content days without the human's ask):
  - `npm run draft -- 2026-11-01` → "only 0 bank questions ask a category not used within 30 days; 7 more needed";
  - `npm run draft -- 2026-11-30` picked and ordered all 7, then stopped: "questions 1 to 6 hold; the block is at question 7 ("Name a fruit", hosts drawn grape, apple, orange)".
- `npm run test:db` → 36 files, 232 tests passed (the admin puzzles route test without its saving tests: 7 passed).
- `npm run test:sql` → `Result: PASS`, with `plor_app`'s exact grants no longer holding `private.save_questions` or `private.puzzle_questions`.
- `npx playwright test` → 14 passed, including `bank.e2e.ts`: an admin opens "Question bank" from `/admin`, sees 7 questions and "Name an animal" in category animal with 2026-10-24; a player sees "This page is for admins only.".
  - The first full run had 2 failures: `bank.e2e.ts`, where the refusal text also appeared in the footer's audit count (fixed with an exact match), and `live-board.e2e.ts`'s reconnect test in a slow run. The latter passed alone and in the next full run; it's in ROADMAP as flaky.
- `npx tsc --noEmit -p .`, `npx eslint src e2e scripts` and `npm run content:validate` clean.
- **After the review fixes:** `npm test` 37 files, 217 tests; `npm run test:db` 37 files, 234 tests, with `bank.db.test.ts` (a played day, 25% caught) and `draft.db.test.ts`'s `oneHostCatch`. The leaderboard and comment-report files failed in the first run while the M14 session's e2e added and removed today's fixture day on the shared database, and passed alone (17 tests). `npm run test:sql` PASS; `bank.e2e.ts`, `audit.e2e.ts` and `approve-and-play.e2e.ts` passed (4 tests). `npm run draft -- 2026-10-5` now prints its usage and stops.

## Review
**13d:** the `reviewer` agent reviewed the diff in a fresh context, 2026-10-24. It checked the gap's boundary both ways, the ranking, the removals (nothing left outside old migrations and DECISIONS.md's historical Log row) and the grants, and ran the unit tests and pgTAP.
- **Blocking findings and how each was fixed:**
  - *A malformed date switched the gap off:* `daysApart` gave NaN, so "2026-10-5" or "garbage" picked categories inside the gap. `npm run draft` now refuses anything but a calendar date.
  - *HANDOFF, the ROADMAP row and the M13 ticket's Status still said "waiting for approval".* Updated.
  - *DECISIONS.md, Game 1 still said "most players should usually finish"*, which M13 said 13d would record as replaced. It now gives the host counts, the easiest-first order, variance, and the Gentle targets as a soft guide, with the human's words. The M13 ticket's stale 13d criterion is updated too.
  - *The bank page computed its own catch rate,* a second copy of the insights measure, with no test of a played day. It now takes each started day's `dayInsights`; `src/admin/bank.db.test.ts` checks a played day (4 answers, 1 caught: 25%, matched through question 2) and an unplayed one.
  - *The easiest-first measure had no test.* `scripts/draft.db.test.ts` checks `oneHostCatch` on the fixture against a hand-worked 0.2167, ignoring the question's host answers.
- **Taken now, though not blocking:** the "no letters fit" message says "no question holds" when none does.
- **Deferred to ROADMAP "Next revision"** (For M13): the bank's prompt-and-category identity unchecked, a theme with no tagged question, themed questions on other dates (for the human), no 401 test for the bank route, and M15 15a's and M16's tickets citing the dropped objects.
