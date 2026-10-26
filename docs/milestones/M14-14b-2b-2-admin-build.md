# M14 14b-2b-2 — Building the admin pages

**Status:** 14b-2b-2a done (2026-10-26): merged in PR #90 on green CI (09:37 UTC), by auto-merge; the review's two Puzzles fixes then passed `approve-and-play.e2e.ts` and `admin-area.e2e.ts` locally (4 passed). 14b-2b-2b in progress. Built from round 10, approved by the human ("Round 10 looks good, build it: the shell change first, then the admin pages.").

## Goal
The admin pages live in Plor's shell as one admin area, in round 10's look, with what needs the admin always in view; then the three changes round 10 drew that need the server.

## Who uses it / what breaks without it
- **Used by:** the admins (the human): approving days, reviewing answers and reports, reading insights, looking things up.
- **Breaks without it:** the admin pages stay outside the shell in M02's plain markup, joined by a footer line, with nothing showing what waits (`M14-14b-2b-admin-pages.md`, Who uses it).

## What the human decided
All in `M14-14b-2b-admin-pages.md`, "What the human decided", 1–22, quoted there; round 10 on the canvas "Plor shell layout" (boards Round10 and Round10Phone) is the approved drawing. And for 14b-2b-2b:
- **Keep comment's database change, a security change:** "Approve it (Recommended)" (human, 2026-10-26), to the question: "A new function private.keep_reported_comment(admin, comment), run as the owner like the existing delete function, removes that comment's reports and logs which admin kept it and when, in a new private.comment_keep table (RLS on). plor_app gets execute on the function and select on the log, nothing else; the route checks the admin first, as Delete's does."

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
### Acceptance criteria (draft)
1. **Keep comment:** `private.keep_reported_comment` and `private.comment_keep` as approved; `POST /api/admin/reports/keep`; the reports log lists keeps beside deletions; a db test of the function and of `plor_app`'s exact grants.
2. **Blocked host answers:** the puzzles API says, for each bank answer, whether players can still type it past the letters stolen so far (the rule's one place in SQL); the chip is dashed with the letter struck, and a checked blocked one is in the danger colour with its problem; Approve waits ("Fix N questions first").
3. **One-click link:** a near-typo's review names its near answer, and "Link to <answer>" links it in one click; "Different answer…" opens the existing search.

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


## Evidence
14b-2b-2a, on the Windows checkout, 2026-10-26, with the M13 session holding off the shared stack:
- `npx tsc --noEmit -p .` and `npm run lint`: no output. `npm test`: `Tests 385 passed (385)` (colors.test.ts adds on-accent on danger, the chart's bars and target at 3:1 and the dip's words at 4.5:1, in every theme).
- The admin e2e files, `npx playwright test e2e/admin-area.e2e.ts e2e/approve-and-play.e2e.ts e2e/audit.e2e.ts e2e/bank.e2e.ts e2e/admin-base.e2e.ts e2e/live-board.e2e.ts`: `13 passed (1.5m)` (criteria 1–6: /admin opening Puzzles in the shell with Admin current, the two groups of sub-tabs and the Audit count, What needs you at 1440px, the insights chart's description, the phone menu at 360px with no sideways scroll, approving a day from its row and section, the audit's rows and Undo, the bank's rows and days, the database's labelled values, and the inline Delete confirm with the decisions log).
- The full suite, `npx playwright test`: `44 passed (5.6m)`. After it, the sidebar stopped marking Me on admin pages (phones only): `admin-area` and `shell` again, 9 passed and 1 failed on the first run after the edit (a recompile), which then passed alone.
- Seen at 1440px and 360px (Playwright screenshots of every admin page): as round 10, with the right column, the grouped sub-tabs and the stacked rows on phones.


## Review
14b-2b-2a, by the `reviewer` agent on `1c2e154` (fresh context, no edits; tsc, lint and `npm test` re-run, 385 passed):
- **Blocking, fixed:**
  1. After approving the day shown by default, the page moved to the next waiting day and the approved message went with it: approving now keeps the view on that day.
  2. A day with both a draft and an approved puzzle showed the approved questions while Approve saves the draft: an editable day now shows its draft, the approved host answers only seeding the choice (as the old page did).
  3. The handoff and ROADMAP didn't say where 14b-2b-2a stood: both updated.
- **Deferred to ROADMAP "Next revision" (For M14):** the host-answer chips reorder when ticked (focus can be lost); `hostBankShare` has no caller now; phone tables lose their column labels; the bank's "Scheduled" for a started day with no answers; repeated formatting (a second `when`, `dayText` beside the leaderboard's, another visually-hidden class); focus isn't moved into Delete's confirm; the phone menu has no Escape; Me flashes current on desktop before hydration; "Show fewer" with nothing to hide. And an e2e step that approves the default day without clicking its row (the shared database was being reset when this was fixed).
- **Checked and fine (the reviewer):** the counts, every audit action per outcome kept, Insights' previous and next and the chart's scale, the inline confirm, focus on the hidden checkboxes and inputs, aria-current, no leftovers, no text links, the e2e changes.
