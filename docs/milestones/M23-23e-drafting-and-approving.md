# M23, 23e: drafting and approving a day on a clock

**Status:** designed 2026-11-25 from answers 50 to 57 in `M23-offbeat-on-a-clock.md`; **waits on the human's approval**. Nothing is built.

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
Written as `<step> → verify: <check>` when the human approves, 23e-1 first.

## Removes
23e-1: nothing (the old draft goes in 23f). 23e-2: making answers from players' texts, on a clock day only.

---
## Source diff
## Evidence
## Review
