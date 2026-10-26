# M14 14b-2b-2 — Building the admin pages

**Status:** 14b-2b-2a done (2026-10-26): merged in PR #90 on green CI (09:37 UTC), by auto-merge; the review's two Puzzles fixes then passed `approve-and-play.e2e.ts` and `admin-area.e2e.ts` locally (4 passed). 14b-2b-2b built and reviewed (2026-10-26), in review in PR #91, with auto-merge on green CI. Built from round 10, approved by the human ("Round 10 looks good, build it: the shell change first, then the admin pages.").

## Goal
The admin pages live in Plor's shell as one admin area, in round 10's look, with what needs the admin always in view; then the three changes round 10 drew that need the server.

## Who uses it / what breaks without it
- **Used by:** the admins (the human): approving days, reviewing answers and reports, reading insights, looking things up.
- **Breaks without it:** the admin pages stay outside the shell in M02's plain markup, joined by a footer line, with nothing showing what waits (`M14-14b-2b-admin-pages.md`, Who uses it).

## What the human decided
All in `M14-14b-2b-admin-pages.md`, "What the human decided", 1–22, quoted there; round 10 on the canvas "Plor shell layout" (boards Round10 and Round10Phone) is the approved drawing. And for 14b-2b-2b:
- **Keep comment's database change, a security change:** "Approve it (Recommended)" (human, 2026-10-26), to the question: "A new function private.keep_reported_comment(admin, comment), run as the owner like the existing delete function, removes that comment's reports and logs which admin kept it and when, in a new private.comment_keep table (RLS on). plor_app gets execute on the function and select on the log, nothing else; the route checks the admin first, as Delete's does."
- **What a kept comment's reporters see:** "Still hidden (Recommended)" (human, 2026-10-26), to: "Keep comment as approved removes a comment's reports. But a player's report is also what hides that comment from them (M08 D5). When an admin keeps a comment, what should the players who reported it see?", whose option said: "The reports stay in the database and the keep record marks them as handled, so the comment leaves the admins' list but stays hidden for its reporters. The function changes from deleting reports to recording the keep only; a later report by someone new lists it again." It replaces "removes that comment's reports" above; the grants are as approved.
- **How the audit learns a near-typo's near answer, a security change:** "New lookup function (Recommended)" (human, 2026-10-26), whose option said: "a new admin-only function, run as its owner like the audit's, takes the texts one typo from what was typed (worked out by the game's own typo code) and returns the category's answers with those names now. plor_app gets execute on it, nothing else. It works for reviews already waiting and touches none of M13's functions."

The split into two PRs is Claude's (CLAUDE.md, one PR per sub-ticket): 2a changes no server code; 2b holds the three changes that need it.

## Source
- Round 10 (approved, 2026-10-26): boards 1–6 (desktop) and 9–11 (phone).
- WCAG 2.2 (SOURCES.md): 1.4.1 (blocked answers and the dip not by colour alone), 1.4.3, 2.5.8, 4.1.2 (chips as checkboxes).
- What each page does today: M03 (insights), M06 and M13 13d (puzzles, bank), M08 and M12 12d (reports), M13 13a and 13b (database, audit).

## 14b-2b-2a — The admin area's look
### Acceptance criteria
1. **In the shell.** Every admin page renders through Home in the shell (sidebar from 768px, top bar and tabs on phones), with Admin as the current section; a page-named heading under a small "Admin". `/admin` opens Puzzles; Insights moves to `/admin/insights`. A signed-in non-admin sees the pages' existing refusals. Checked in the admin e2e files.
2. **Sub-tabs.** From 768px a row of sub-tabs in two groups split by a line, no labels: Puzzles, Audit, Reports (each with its count when non-zero), then Insights, Bank, Database; the current one marked (`aria-current`). On phones one dropdown in the same order, grouped by a line, with the counts, and a "Waiting" row of buttons for what's waiting. Checked at 1440px and 360px.
3. **What needs you.** From 1200px the right column shows days to approve (and the next), answers to review, reported comments (and the first reported), and days approved ahead (through which day), each a button to its page; counted from the existing admin APIs, again after an approval, a decision or a deletion. Checked in the e2e.
4. **Puzzles.** The days as a row of buttons (Live, Draft, Approved); the chosen day as a table: question, category, the letter the Wind steals, host answers as chips that are checkboxes (checked filled, with a tick), "+N more" to show the rest of the bank; problems under their question; Approve at the top, and the "approved" message after. Checked in approve-and-play.e2e.ts.
5. **Insights.** The day picker with previous and next; the chart of each question's catch rate (bar) against the Gentle target (`CATCH_TARGETS`, dashed), a question that breaks the day's shape in the caught colour and said in words; the table: caught of answered, rate, vs target in points, most typed, not in list. Checked in an e2e.
6. **Audit, Bank, Database, Reports** in round 10's tables and cards: the audit's actions full-width buttons stacked in their column, its reasons in words and "Dismiss is final"; the bank's filter box and "Scheduled" for a future run; the database's labels; Reports' Delete asking inline before it deletes. Checked in their e2e files.
7. **Colours mean one thing:** neutral tags for states, the accent's soft tint for "needs a decision", the danger colour for problems; the caught colour only for the chart's dip. Every pairing from `globals.css`'s slots (colors.test.ts).
8. The usual checks and CI pass.

### Out of scope (2b)
Keep comment; blocked host answers marked in place; the audit's one-click link to the near answer.

## 14b-2b-2b — The three server changes (after 2a)
### Acceptance criteria
1. **Keep comment:** `private.keep_reported_comment` and `private.comment_keep` as decided above: the keep is recorded, the reports stay (the comment stays hidden for its reporters), and the list shows only reports made after the last keep. `POST /api/admin/reports/keep`, admin first as Delete's. Reports' "Keep comment" beside "Delete…"; the decisions log lists keeps beside deletions. Checked by a pgTAP test of the function, `plor_app`'s exact grants, the route's db test, and live-board.e2e.ts.
2. **Blocked host answers:** the puzzles API says, for each bank answer, which letter stolen by its question its name has, by the approve route's own rule (`avoids` and `stolenLetters`, `src/content/puzzle.ts`). Such a chip is dashed with the letter struck and can't be ticked; a ticked one is in the danger colour with its problem in words; Approve waits ("Fix N questions first"). Checked in the puzzles route's db test and approve-and-play.e2e.ts.
3. **One-click link:** a waiting near-typo names the answers it's a typo of (`private.audit_near`), each a "Link to <answer>" button; "Different answer…" opens the existing search. Checked in the audit route's db test and audit.e2e.ts.
4. The usual checks and CI pass.

### Removes (2b)
- `listDeletions`, `DeletedComment` and the reports API's `deletions`: one `decisions` list (deleted or kept) replaces them.
- The near-typo's search as its only action: it stays, behind "Different answer…".
- The draft criterion 2's "the rule's one place in SQL": the rule already has one place, in `src/content/puzzle.ts`, which the approve route uses, so the API reuses it.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Sub-tabs 40px tall, 0 12px padding, 10px corners; counts 20px badges | Sub-tabs | Round 10 |
| Chips 30px tall (44px on phones), 0 10px padding, fully round | Host answers | Round 10 |
| Chart 220px tall; bars 56% of their column; the target dashed 2px | Insights | Round 10 |
| Table headers 12px muted; cells 10px 8px | Every admin table | Round 10 |
| The right column | What needs you | 14b-2b-1 (360px from 1200px) |
| Cards and spacing | Every admin page | Me's (`me.module.css`), as 14b-2a's /streak |

## Removes (2a)
- The admin pages' own `<main>`, `<h1>` and footer link line; `src/app/admin/audit-link.tsx` (its count moves to the sub-tabs); every "Plain on purpose; the look is M14's job" note.
- `/admin` as Insights (Insights moves to `/admin/insights`).

---

## Source diff
14b-2b-2a:
| Source says | We built | Why different |
|---|---|---|
| Round 10 starts each admin page at "Admin / Puzzles" | The page's own "Plor" heading above it on desktop, as on every page (hidden on phones by the top bar) | One page structure for every page in the shell (Home renders them all) |
| Round 10's phone menu, a listbox | A button that opens a list of links, grouped by a line | Each admin page is a page to go to: links, not options |
| Round 10 draws tables at 1440px only | Below 768px each table row stacks as a block | Round 10's phone boards draw cards; the tables reflow into them without a second layout |
| Round 10's chart axis to 25% | The axis reaches the highest rate or target, rounded up to the next 5% (round 10's step) | A day can catch more than 25% |
| Round 10's table on Insights | The same 7 columns, without "In bank" | As drawn (the critique found "In bank" undefined) |
| Round 10's phone boards mark Me in the tab bar on admin pages | The same on phones; on the sidebar only Admin is marked | Phones reach Admin from Me; the sidebar has Admin itself |

14b-2b-2b:
| Source says | We built | Why different |
|---|---|---|
| Round 10: "Keep clears a comment's reports and leaves it", and the approved function "removes that comment's reports" | The keep is recorded and the reports stay; the list shows reports made after the last keep | M08 D5: a report hides the comment for its reporter. The human chose "Still hidden (Recommended)" when asked |
| Round 10's note: "Keep comment leaves it…" | "Keep comment leaves it for everyone but the players who reported it; Delete removes it for everyone. Both are logged below." | Says what Keep now does |
| Round 10 blocks a chip by its question's own letter (carrot ticked at question 4 with C gone at question 2) | Blocked by every letter stolen at or before the question | The approve route's rule (`checkHostNames`); the drawing was a sketch |
| Round 10's Approve, `aria-disabled` and focusable | `disabled`, with "Fix N questions first" beside it and each problem under its question | The reason is in words next to it; a disabled button needs no click guard |
| Draft criterion 2: "the rule's one place in SQL" | The rule stays in `src/content/puzzle.ts`, run by the puzzles API | It already had one place there (CLAUDE.md, one way to do each thing) |


## Evidence
14b-2b-2a, on the Windows checkout, 2026-10-26, with the M13 session holding off the shared stack:
- `npx tsc --noEmit -p .` and `npm run lint`: no output. `npm test`: `Tests 385 passed (385)` (colors.test.ts adds on-accent on danger, the chart's bars and target at 3:1 and the dip's words at 4.5:1, in every theme).
- The admin e2e files, `npx playwright test e2e/admin-area.e2e.ts e2e/approve-and-play.e2e.ts e2e/audit.e2e.ts e2e/bank.e2e.ts e2e/admin-base.e2e.ts e2e/live-board.e2e.ts`: `13 passed (1.5m)` (criteria 1–6: /admin opening Puzzles in the shell with Admin current, the two groups of sub-tabs and the Audit count, What needs you at 1440px, the insights chart's description, the phone menu at 360px with no sideways scroll, approving a day from its row and section, the audit's rows and Undo, the bank's rows and days, the database's labelled values, and the inline Delete confirm with the decisions log).
- The full suite, `npx playwright test`: `44 passed (5.6m)`. After it, the sidebar stopped marking Me on admin pages (phones only): `admin-area` and `shell` again, 9 passed and 1 failed on the first run after the edit (a recompile), which then passed alone.
- Seen at 1440px and 360px (Playwright screenshots of every admin page): as round 10, with the right column, the grouped sub-tabs and the stacked rows on phones.

14b-2b-2b, on the Windows checkout, 2026-10-26, with the two migrations applied to the shared local database (M13 holding off):
- `npx tsc --noEmit -p .` and `npm run lint`: no output. `npm test`: `Tests 386 passed (386)` (the keep route's signed-out 401).
- `npx supabase test db supabase/tests/audit_near.test.sql supabase/tests/comment_keep.test.sql supabase/tests/plor_app_role.test.sql supabase/tests/comment_deletion.test.sql supabase/tests/misses.test.sql`: `Files=5, Tests=73 … Result: PASS` (criterion 1: a keep by a non-admin or of an unreported comment records nothing, one record with its fields, its reports stay, a second keep records nothing, a later report reopens it, both cascades; criterion 3: `audit_near` refuses a non-admin with OB007, names a waiting near-typo's members each once, nothing for a decided one, another kind, no match or a removed name; `plor_app`'s exact grants with `comment_keep select`, `keep_reported_comment` and `audit_near` execute).
- The changed db tests, `npx vitest run src/app/api/admin/reports/route.db.test.ts src/app/api/admin/audit/route.db.test.ts src/app/api/admin/puzzles/route.db.test.ts --no-file-parallelism`: `Tests 25 passed (25)` (Keep refuses a non-admin with 403, a kept comment leaves the list, stays hidden for its reporter and is logged "kept"; the puzzles API marks cherry with "c" at question 2 and no suggested host answer; a near-typo's `near` is `[bear]`, linked in one click, then empty).
- The e2e files, `npx playwright test e2e/admin-area.e2e.ts e2e/approve-and-play.e2e.ts e2e/audit.e2e.ts e2e/live-board.e2e.ts`: `11 passed (57.0s)` (a kept comment stays for its author, hidden for its reporter, "Kept" in the log; a ticked cherry is said in words, Approve waits with "Fix 1 question first", unticked it's a dashed chip, approving with apple; "Link to bear" beside "Different answer…", linked in one click). The first run failed 2: the tests unchecked a chip that stops being a checkbox, and a link from an earlier db run had left "bearz" as a name of bear. Both tests now click the chip and clear the link's name before and after.


## Review
14b-2b-2a, by the `reviewer` agent on `1c2e154` (fresh context, no edits; tsc, lint and `npm test` re-run, 385 passed):
- **Blocking, fixed:**
  1. After approving the day shown by default, the page moved to the next waiting day and the approved message went with it: approving now keeps the view on that day.
  2. A day with both a draft and an approved puzzle showed the approved questions while Approve saves the draft: an editable day now shows its draft, the approved host answers only seeding the choice (as the old page did).
  3. The handoff and ROADMAP didn't say where 14b-2b-2a stood: both updated.
- **Deferred to ROADMAP "Next revision" (For M14):** the host-answer chips reorder when ticked (focus can be lost); `hostBankShare` has no caller now; phone tables lose their column labels; the bank's "Scheduled" for a started day with no answers; repeated formatting (a second `when`, `dayText` beside the leaderboard's, another visually-hidden class); focus isn't moved into Delete's confirm; the phone menu has no Escape; Me flashes current on desktop before hydration; "Show fewer" with nothing to hide. And an e2e step that approves the default day without clicking its row (the shared database was being reset when this was fixed).
- **Checked and fine (the reviewer):** the counts, every audit action per outcome kept, Insights' previous and next and the chart's scale, the inline confirm, focus on the hidden checkboxes and inputs, aria-current, no leftovers, no text links, the e2e changes.

14b-2b-2b, by the `reviewer` agent on `8aa7677` (fresh context, no edits; tsc, lint, `npm test` 386 and seven pgTAP files, 102 tests, re-run):
- **Blocking, fixed:**
  1. `private.audit_near`'s own admin check and its "waiting near-typo only" filter had no test (the route checks the admin first, and the code skips decided reviews before calling it): `supabase/tests/audit_near.test.sql`.
  2. The handoff didn't say where 14b-2b-2b stood, and still said the blocked-answer rule would be in SQL: rewritten.
- **Deferred to ROADMAP "Next revision" (For M14):** two comments with stale wording; Keep's open-report rule with milliseconds' timing (a report committed across a keep, two admins keeping at once); focus lost when a blocked chip is unticked, one `audit_near` query per near-typo, and three CSS sizes not in Numbers.
- **Checked and fine (the reviewer):** one open-report rule in the function and the list; both functions' `search_path`, admin checks and grants; `comment_keep`'s RLS and cascades; the exact-grants list; the DECISIONS.md rows; `withinTypo` on stored normalized text and `in_category_now` as the link requires; the blocked rule matching `checkHostNames`; the blocked chips' accessible names and Approve's `aria-describedby`.
