# M23, 23e: drafting and approving a day on a clock

**Status:** designed 2026-11-25 from answers 50 to 57 in `M23-offbeat-on-a-clock.md`; **approved 2026-11-25 (the human: "Approve 23e"), security changes included**. 23e-1 (draft and approve) is built, reviewed and merged 2026-11-26 (#321, on green checks and the human's "Merge when green"); its migration reaches plor.app by the human's own `npx supabase db push`. 23e-2 not started.

## Goal
The human can draft a day on a clock (format 4) from the researched lists, change it while approving, and approve it; and a text players type that is on no list waits for the human instead of joining a list by itself.

## Who uses it / what breaks without it
- Used by: the human, drafting and approving each day; every player, who plays what was approved.
- Breaks without it: no day on a clock can exist outside tests, so 23f (the switch) has nothing to switch to. `checkClockPuzzle` has no caller, so a day without `rare` and `size` would break the result (ROADMAP, For M23). On a clock day a text typed by three players still becomes an answer by itself (`private.record_miss`), against "only researched answers count".

## Source
- `docs/SOURCES.md`: the human's answers are the source for M23. Here: answers 50 to 57; answers 48 and 49 (`rare`, `size`); 23a's "Tiers ... The draft takes them from the list file (23e)"; inbox #251 (the human, 2026-11-17, quoted there); DECISIONS.md, "Puzzle drafting".
- The code as read 2026-11-25 (a search agent's report, each line *unverified* by this session until the build reads it): `scripts/draft.ts`, `src/content/puzzle.ts`, `src/content/bank.ts`, `src/admin/puzzles.ts`, `src/admin/lists.ts`, `private.build_puzzle`, `private.record_miss`.

## What was found (2026-11-25)
- Each of the 21 lists has exactly one question in `content/bank.json`, which holds its wording (checked by this session). A list file holds no wording.
- A list file gives every answer its tier; no table holds a tier. A day's `levels` is where the game reads tiers, written at drafting.
- The approval page reads drafted days from the files in `content/offbeat/`, on the PC and on plor.app (where they are the files as of the last deploy), so the page cannot save a change to a file on plor.app.
- `private.build_puzzle` refuses any day that is not format 3, and `parsePuzzle` does too.
- The draft knows a list's last use only from the drafted files on disk, not from approved days in the database.
- **The Lists page cannot change an answer's tier today** (it has Strike, Add and Seen). Answer 52's option said a wrong tier "is fixed by you on the Lists page": that button is new work, proposed below in 23e-2.

## Design
Two PRs.

**23e-1, draft and approve.**
1. **One function builds a day.** From a date and, per question, a list, an optional wording and a re-roll count, it gives the format 4 day: the wording (the bank's unless one is given), `levels` (the list file's common and uncommon answers), `rare` (six of the list's rare answers, drawn at random from the date, the question and the re-roll count, so the same every time), and `size` (the list's count). Answers struck on the Lists page are left out and added ones count as rare, as the lists load treats them. The draft and the approval page both use it, so a day never holds anything the page made up.
2. **The draft.** `npm run draft -- clock <date>` picks the three lists used longest ago, at random among ties (answer 50), reading both approved days in the database and drafted files; prints for each how many days ago it last appeared, or "never" (answer 54); and writes `content/offbeat/<date>.json`. The word `clock` goes in 23f, when the old draft is removed and this is the only one.
3. **The approval page** shows a clock day's three questions, each with its wording, its counts by tier and its six rare examples. On each question: **Swap** opens a menu of the other lists, longest unused first, with when each last appeared (answer 55); **Edit** changes the wording, for that day only (answer 56); **Up** and **Down** move it; **Re-roll** draws another six (answer 57). **Redraft** replaces all three. Changes stay on the page until **Approve**; leaving the page loses them, and the page says so.
4. **Approve** sends the date and, per question, the list, the wording if edited, and the re-roll count. The server builds the day again with the same function, checks it (`checkClockPuzzle`, plus: three different researched lists, a wording that is not empty), and stores it. The database's approval accepts a format 4 day (a migration to `private.build_puzzle`; the format 3 path is unchanged until 23f).
5. A day on a clock still shows to players only once it is approved and its date comes; nothing here approves one for plor.app. That is the human's own step on plor.app's Admin page after 23f.

**23e-2, texts on no list, and tiers.**
6. On a clock day `private.record_miss` only logs the text; it no longer makes an answer of it (answer 53). A format 3 day is unchanged until 23f.
7. The Lists page, on a list, shows the texts typed on its clock days that are on no list, most players first, each with **Add** (the existing Add) and **Dismiss** (it stops showing).
8. The Lists page lets the human change an answer's tier (answer 52: "research decides", and the human corrects). The change is kept as a list edit, like Strike and Add, and the next draft uses it.

## Security changes proposed (need the human's approval; recorded in DECISIONS.md when built)
- `private.build_puzzle` accepts a format 4 day from an admin. No new grant; the admin check is unchanged.
- `private.record_miss` does less on a clock day (logs only).
- Two new admin-only list edits, Dismiss and a tier change, through the existing admin-checked functions' pattern. No new grant to `plor_app` beyond running them, as Strike and Add have.

## Assumptions
- A list is used at most once a day, and a day never holds two questions from one list.
- The old format 3 drafts on disk (2026-11-24 to 30) stay until 23f; the page shows both kinds until then.
- The approval page is used by the human alone, so two people editing one day at once is not handled.
- "Most players first" for the texts needs no cut-off number: all are listed.

## Acceptance criteria
- [ ] `npm run draft -- clock <date>` writes a day whose three lists are the least recently used, and prints each one's last use → unit tests of the pick, a db test of last use read from approved days.
- [ ] The built day's `levels`, `rare` and `size` match the list file and its edits; the same date, list and re-roll count give the same six → unit tests.
- [ ] On the approval page: swap, edit, move, re-roll, redraft, then approve; the stored day holds exactly what the page showed → `e2e/` test, `@visual`.
- [ ] Approve refuses a day with a list that is not researched, a repeated list, or an empty wording → route db test, failing first.
- [ ] A format 3 day still approves as before → the existing tests, unchanged.
- [ ] A text typed by three players on a clock day is logged and makes no answer; on a format 3 day it still does → `npm run test:sql`, failing first.
- [ ] The Lists page shows such texts; Add makes it an answer, Dismiss hides it; a tier change shows in the next drafted day's `levels` → db tests and one `e2e/` test, `@visual`.

## Out of scope
- The switch, removing the old draft, the old game and its drafted days (23f).
- Researching more lists (the `research-list` skill; the human's call when).
- Tiers from play, and counting guests' clock answers (answer 52: no).
- Keeping an edited wording for later days (answer 56: that day only).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 3 | questions in a day on a clock | M23 ticket, Goal: three questions (existing) |
| 6 | rare examples per question | answer 49 (`RARE_PER_CLOCK_QUESTION`) |

No new number.

## Plan
**23e-1, as checks** (each check is run and must be able to fail; a new test is seen failing first):
1. `parsePuzzle`'s clock twin reads a format 4 day file and refuses a bad one; the day check covers three different lists and a wording that is not empty → verify: `npx vitest run src/content/puzzle.test.ts`.
2. The function that builds a day (wording, `levels`, `rare` by date, question and re-roll count, `size`; struck answers out, added ones rare) → verify: its unit tests, the same inputs giving the same six, another re-roll count giving a different six.
3. The pick: least recently used, random among ties, last use from approved days and drafted files → verify: unit tests of the pick; a db test of last use.
4. `npm run draft -- clock <date>` writes the file and prints each list's last use → verify: `npx vitest run scripts/draft.test.ts scripts/draft.db.test.ts --no-file-parallelism`.
5. The migration: `private.build_puzzle` accepts a format 4 day from an admin, format 3 unchanged → verify: `npm run test:sql` (a new test, failing before the migration is applied).
6. The routes: the page's read gives what it needs for a clock day and the swap menu; approve builds the day again on the server and refuses a list that is not researched, a repeated list, an empty wording → verify: the routes' db tests.
7. The page: swap, edit, move, re-roll, redraft, approve, and the warning on leaving → verify: `npx playwright test e2e/<the new file>`, `@visual`, the stored day equal to what the page showed.
8. Nothing else moved → verify: `npm test`, `npx tsc --noEmit`, `npx eslint src e2e scripts --quiet`, `npx playwright test e2e/admin*.e2e.ts` (whichever cover the approval page today).

23e-2's steps are written when 23e-1 is merged.

## Removes
23e-1: nothing (the old draft goes in 23f). 23e-2: making answers from players' texts, on a clock day only.

---
## Source diff
| Source says | We built | Why different |
|---|---|---|
| 23e-1 | | |
| Design 1: added answers "count as rare" | An answer added on the Lists page and not yet in the list's file counts in `size` and is never one of the six rare examples | Its thing ID is replaced when the file holds it, so a day cannot name it ahead of the next lists load |
| Numbers: 3 questions, "existing" | A new constant, `QUESTIONS_PER_CLOCK_DAY = 3` | No constant held it; its origin is the M23 Goal |
| Redraft "replaces all three" | Each press leaves out every list the page has shown so far and picks the three used longest ago among the rest; with fewer than three left it answers "no lists left" | The design did not say how a second press differs from the first |
| Not designed | A day on a clock is outside the 30-day gap in `content:validate` and the old draft | Answer 54: lists repeat within 7 days |
| Not designed | The old approve and test-run routes refuse a clock draft (400); a clock day has no Play test | The test run is the old game's; ROADMAP, For M23 |
| Not designed | The bank page counts only format 3 days | Its insights are the old game's |
| Not designed | The drafted file holds no re-roll count or edited wording; the page starts from re-roll 0 | Changes live on the page until Approve (design 3) |
| The six keyed on "the date, the question and the re-roll count" | Keyed on the date, the list and the re-roll count | Moving a question up or down must not change its six |

## Evidence
**23e-1** (commands run 2026-11-25 on the local stack; the orchestrator's own runs unless said):
- Swap, edit, move, re-roll, redraft, approve, the stored day equal to what the page showed, and the warning on leaving: `CI=1 npx playwright test e2e/clock-approval.e2e.ts` → `4 passed (43.4s)` (2 tests at 390 × 844 and 1280 × 720).
- The day builder, the pick, the day's check: `npm test` → `80 files, 995 passed`.
- Last use from approved days and drafted files; the routes refusing a list that is not researched, a repeated list, an empty wording: `npx vitest run src/app/api/admin scripts/draft.db.test.ts scripts/lists.db.test.ts --no-file-parallelism` → `16 files, 127 passed`.
- The database's approval of a format 4 day, format 3 unchanged, `plor_app` unable to run `private.build_clock_day`: `npm run test:sql` → `Result: PASS` (the builder's run: `Files=46, Tests=979`).
- `npx tsc --noEmit`, `npx eslint src e2e scripts --quiet`: exit 0.
- The builder's runs, not repeated: `npm run draft -- clock 2026-12-01` printed three questions (candy, color, dance), each "last appeared never", and its file was deleted; the old approval, admin, test-run and lists e2e files, 17 passed with the new one.
- Videos of the approval page at both sizes sent to the human in the app; CI's are in the PR run's `e2e-videos`.
- **Not verified:** the route db tests and the draft db test were written after the code (the builder removed the day check and saw two fail, then restored it); the draft against list edits that exist in the database, beyond a unit test; the migration against a database loaded with the real lists; a real phone; the browser's Back button with unsaved changes.

## Review
**23e-1 (the `reviewer` agent, fresh context, 2026-11-25):**
- Blocking: none in the code. One on process, the ticket, ROADMAP and handoff not yet written when it read the tree: written in this commit.
- Checked and found sound: the new `private.build_puzzle` differs from the earlier one only in the format 4 branch, its definer settings, admin check and grant unchanged; `private.build_clock_day` is revoked from every role; both routes check the admin first and take only a list, a wording and a re-roll count from the page, the server building levels, rare answers and size itself; thing IDs equal the lists load's; the six are exact, rare only, and do not depend on a question's place; the pick and its "days ago".
- Deferred to ROADMAP "Next revision", For M23: the rest.
