# M14 14b-12 — Search a question's answers after your run

**Status:** approved (human, 2026-10-30: "Approve 14b-11c and 14b-12 as drafted, including their security changes (report_test_miss and search_answers, which plor_app may execute). Build 14b-11c first."); in review (PR #PR, waiting for CI and the human's word to merge). Built after 14b-11c, before 14b-10a (human, 2026-10-30: "Both test-run tickets first").

## Goal
Once a player's own run is over, each question on their result card has a small search box over every answer that question accepted. Each match shows how common it was and, from 5 players up, how many players gave it.

## Who uses it / what breaks without it
- Used by: every player who has finished the day's run, and the human testing days.
- Breaks without it: after a run there's no way to check whether a word would have counted, or what else did. The human asked to "click an answer and view a dropdown menu of all the possible answers by typing it in a small search bar" (2026-10-30).

## What the human decided (2026-10-30, on the Windows PC, quoted)
1. Who: "Players, after the day ends", then, asked when a list opens: "Once you finish your run" ("Right after your own run, the same day. More satisfying, but you could pass full lists to a friend who hasn't played yet").
2. What: "Search, with how common each was" ("each result shows whether it was common, uncommon or rare and how many players said it").
3. Counts: first "Exact counts always". Asked again after the collision with the 5-player minimum (M11 H5, `ANSWER_SHARE_MIN_PLAYERS`): "Keep the 5-player minimum (Recommended)" ("The list shows exact counts from 5 players up, and the tier below that. No privacy change").
4. Matches shown at once: "10".
5. Where: "On your result card (Recommended)" ("Each question in your result gets a small search box; yesterday's card gets the same after midnight").

## Source
- DECISIONS.md, Game 1: "Server is authoritative" (nothing of a question before it's answered) and the 2026-10-25 Log row (yesterday's host answers to every signed-in player, hidden from a player whose run that day is still going).
- `docs/milestones/M11-home-screen.md`, H5 (the shares and their minimum).
- DECISIONS.md, Answer model (a day's members as of its fixed time; `private.resolve_answer`'s reading of them).
- SOURCES.md, Next.js (route handlers) and PostgreSQL 17 (functions).

## Design (proposed)
- **When a list opens.** A question's list opens to a player once their own run of that day is over, for the questions their result card shows. Those are the questions they answered, the one that caught them included. The same lists open on yesterday's card from midnight, for all 7 questions, to every signed-in player except one whose own run that day is still going (the 2026-10-25 rule).
- **The search.** A box under each question: the matching answers, at most 10, by main name. Names starting with the text come first, then names containing it, and the most-given come first within each. An empty box shows the 10 most-given. Each match shows its tier (common or uncommon from the day's levels, otherwise rare), and the number of players who gave it once that question has 5 answers (`ANSWER_SHARE_MIN_PLAYERS`, as the result card's shares). It matches the day's members as of the day's fixed time, the same set `resolve_answer` accepts, including any alias a player could type.
- **Your own answer and the host's** show as they already do on the card. The list adds the rest.

**Security change** (CLAUDE.md, "Security changes need a human"; recorded in DECISIONS.md Log once approved):
- A new rule: a finished player may read a question's full answer list, which until now no player could (DECISIONS.md, Game 1).
- `plor_app` may execute one new function, `private.search_answers(p_user, p_game, p_date, p_index, p_text, p_limit)`. It is security definer with an empty `search_path`. It refuses a player whose run of that day isn't over, and a question their result card doesn't show, unless the day is over and their run isn't in progress. It returns names, tiers and counts, never thing IDs or anything about a day that hasn't been played.
- No table, table-grant, RLS or role changes.

## Acceptance criteria
- [x] A db test, as `plor_app`: a player whose run is in progress, or hasn't started, gets nothing. A finished player gets at most 10 matches for an answered question and is refused for one they didn't reach. After midnight every question opens to a player with no run, and stays shut to a player whose run is still going.
- [x] A db test: counts show from the 5th player of a question and not before, the tier comes from the day's levels, and a typed alias finds its thing.
- [x] A db test: the list holds exactly what `resolve_answer` accepts for the day (no member added after the day's fixed time).
- [x] An e2e: a finished player types in a question's box and sees matches with tiers; a player mid-run sees no box.
- [x] `docs/DESIGN.md` describes the box, cited to its file and line.

## Out of scope
- Showing lists before a run is over, or for days not yet played.
- Exact counts under 5 players (answer 3).
- The admin's test run's own result card (it isn't a saved run). The test run's searchable view can follow if wanted.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 10 | Matches shown at once, and for an empty box | Human, 2026-10-30 ("10") |
| 5 | Players a question needs before counts show | `ANSWER_SHARE_MIN_PLAYERS` (M11 H5); human, 2026-10-30 ("Keep the 5-player minimum (Recommended)") |

## Plan
1. Migration: `private.search_answers`, reading members the way `private.resolve_in` does, as of the day's fixed time. Hypothesis: on the fixture day its full list equals what `resolve_answer` accepts for each fixture member's names; a difference disproves it.
2. `GET /api/answers?date&index&q`, the box on the result card and on yesterday's card.
3. Tests, DESIGN.md, the `reviewer`, the PR.

## Removes
Nothing is removed: no part of the game lists a question's answers today. The search reads members through the same SQL as `resolve_in`, not a second copy.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Ticket: `private.search_answers(p_user, p_game, p_date, p_index, p_text, p_limit)` | A seventh parameter, `p_min_players`, which the caller passes as `ANSWER_SHARE_MIN_PLAYERS` | The minimum stays in `tunables.ts`, its one home, as the result card's shares use it (DECISIONS.md, config) |
| Ticket design: each match shows its main name | Its main name and, when another of its names matched, that name ("polar bear (ursus maritimus)") | The first build ordered by main name, so "s" listed "24-spot ladybird" first; the matched name explains each match and orders the list |
| Ticket design: an empty box shows the 10 most given | An empty box lists only answers players gave, the most given first, so it can be shorter than 10, or say none matches | Listing every member to fill 10 would walk categories of 74,092 things on each opening |
| Ticket design: reading members the way `private.resolve_in` does | Candidates come from the one downward walk (`descendants_now`) from the frozen root, and from every thing whose kind_of link ended after the day's fixed time, with names and acceptances valid then; each candidate is checked by `private.resolve_in` with all its matching names | The review found that candidates from the base as it is now could miss what the day accepted, and that checking one name per thing could drop a thing whose other name passes a letter question. A second, as-of downward walk would break "One tree-walk function" (DECISIONS.md, M13 13e-5) |

## Evidence
Run on the Windows PC's local stack, 2026-10-30 (Pacific).

**Hypothesis** (Plan step 1): the list equals what `resolve_answer` accepts. Checked as: every result is accepted by `resolve_in` (each one is), and nothing accepted is missing. The second half failed review twice (current-base candidates; one name per thing) and was fixed. It isn't compared name by name over a whole category; that's under ROADMAP For M14.

1. **Who may search** (pgTAP `supabase/tests/answer_search.test.sql`, 15 tests): mid-run, not played, an unreached question, a day with no puzzle and mid-run on a past day all get OB013. After midnight a player who never played searches. The route test (`src/app/api/answers/route.db.test.ts`, `Tests  3 passed (3)`) adds 401 signed out, 403 `answers_closed` mid-run and for question 2, and 400 for a bad index.
2. **Counts, tiers, names:** counts are hidden under 5 players and shown with a minimum of 1 (`as cat|as cat|common|1`). The tier comes from the day's levels. "hound" finds `as dog|as hound`. Contains-matches are found. The limit holds, and an empty box lists only answers given.
3. **Only what the day accepted:** a member added a day after the fixed time isn't listed, and one whose link ended after it still is (the review's case).
4. **The e2e:**
   - `npx playwright test e2e/answer-search.e2e.ts e2e/offbeat.e2e.ts` → `6 passed (28.3s)`. A finished player finds "polar bear … rare" and "polar bear (ursus maritimus) rare" from the result card; a player mid-run has no Search answers. On yesterday's card, a player who didn't play yesterday finds polar bear.
   - `offbeat.e2e.ts`'s yesterday row now reads "…The Wind: bearSearch answers", because the button is in the row.
5. **`docs/DESIGN.md`:** "Answer search".

**Speed** (realistic: the loaded base, a day per category, `	iming`; CLAUDE.md, Testing):

| Search | Before the fixes | After |
|---|---|---|
| "a" in animal (56,169 members) | 0.9 s | 1.45 s |
| "a" in `animal_w`, a letter subset of a 74,092-thing root | not measured | 1.38 s |
| "a" in `endangered_animal`, a fact filter on the same root | 7.9 s (filter on every candidate) | 1.38 s |
| "zz" in `endangered_animal` | not measured | 0.58 s |
| "v" in `river_k` (40,923) | not measured | 0.63 s |
| An empty box | 0.7 s | 2 ms |

**The suites:**
- `npm test`: `Tests  473 passed (473)`.
- `npx supabase test db`: before the review fixes `Files=34, Tests=549`; after them `Files=34, Tests=551`, `Result: PASS`.
- `npm run test:e2e`: `82 passed (8.8m)`, `1 failed`. The failure was `live-board.e2e.ts` "a friend's run shows up live", whose `getByText(/· too few players yet$/)` no longer matched, because the result row's sentence ran on into "Search answers". Fixed in the markup: the sentence is its own `<span>`, and the test is unchanged. Then `npx playwright test e2e/live-board.e2e.ts e2e/answer-search.e2e.ts e2e/offbeat.e2e.ts e2e/player-screens.e2e.ts` → `23 passed (2.8m)`.
- The route tests after the fixes: `npx vitest run src/app/api/answers src/app/api/admin/test --no-file-parallelism` → `Tests  16 passed (16)`.
- `npm run test:db`: `Test Files  44 passed (44)`, `Tests  297 passed (297)`.
- `npx tsc --noEmit -p .` and eslint: clean.

## Review
The `reviewer` agent, 2026-10-30.
- **Blocking findings and how each was fixed** (Source diff and Evidence):
  - Candidates from the current base could miss what the day accepted. Fixed: candidates come from the base as of the day's fixed time.
  - One name per thing was checked. Fixed: all of its matching names are checked.
  - The cost wasn't bounded on narrow questions. Fixed: the letter is applied to the names, and the filter runs inside the loop. Measured above.
- **Deferred to ROADMAP "Next revision"** (For M14, "Found in 14b-12's review"):
  - a negative index and the format and `approved_at` checks in the function;
  - an out-of-range index answering 500;
  - a request per keystroke and the list key;
  - the db test's one-question day, and no full-list comparison.
