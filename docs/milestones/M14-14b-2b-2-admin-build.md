# M14 14b-2b-2 — Building the admin pages

**Status:** 14b-2b-2a in progress (2026-10-26), on `m14-look-and-feel`; 14b-2b-2b after it. Built from round 10, approved by the human ("Round 10 looks good, build it: the shell change first, then the admin pages."), in two PRs, each merged on green CI.

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

## Evidence

## Review
