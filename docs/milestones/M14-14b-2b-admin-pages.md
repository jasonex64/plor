# M14 14b-2b — The admin pages

**Status:** designing (2026-10-26): the guided questions answered (below); the mockups drawn as round 9 on the canvas "Plor shell layout" (boards Round9 and Round9Phone, sample data in Paper), waiting for the human's review, then this ticket's criteria and Numbers are written from what the human approves, then it's built as one PR from `m14-look-and-feel`, merged on green CI.

## Goal
The admin pages live inside Plor's shell as one admin area, with sub-tabs and an overview of what needs the admin, in Plor's look made denser for desk work.

## Who uses it / what breaks without it
- **Used by:** the admins (the human), approving days, reviewing answers and reports, reading insights.
- **Breaks without it:**
  - The six admin pages have no shell and M02's plain markup, while L19 put them in the look's "same pass" and 14b-2 chose a "Full redesign, mockups first".
  - The pages are joined by one footer line on `/admin` only; from any other admin page there's no way to the rest.
  - Nothing shows at a glance what waits for the admin: drafted days, answers to review, reported comments, or how many approved days are left.

## What the human decided
Before (M14 ticket and 14b-2's guided questions, `M14-14b-2-sprout-admin-polish.md`):
- **L19:** "Yes, same pass" (2026-10-24).
- **14b-2:** "Full redesign, mockups first": each page drawn on the canvas for the human's review, then built; drawn "At home" (2026-10-26).
- **L49:** the Admin link in the sidebar, and on phones on the Me tab (14a-1).

This ticket's guided questions (human, 2026-10-26, on the Windows checkout):
1. **Navigation:** "An admin area in the shell (Recommended)": the sidebar's Admin opens the admin pages inside the normal shell, with their own sub-tabs.
2. **Device:** "Mostly desktop (Recommended)": laid out for a wide screen first; on a phone they still work, stacked plainly.
3. **Look:** "Plor's look, denser (Recommended)": the same themes, fonts and colour slots, tighter (tables, smaller type, compact cards) for the data-heavy pages.
4. **Landing page:** "An overview (Recommended)": what needs the admin, each linking to its page.
5. **The overview shows:** "Days waiting for approval", "Answers to review", "Reported comments", "Days approved ahead".
6. **Sub-tabs on a phone:** "A dropdown".
7. **Insights:** "Chart against the targets (Recommended)": a bar per question for its catch rate beside the Gentle target (`CATCH_TARGETS`, M13 13c: "Show, never warn").
8. **Mockups:** "All 7 desktop + 2 phone (Recommended)": the overview and the six pages at 1440px, the overview and Puzzles at 360px.

## Source
- The canvas "Plor shell layout" (https://claude.ai/artifact/9QkZKZZZsEpCJsDVv7VfGZ): round 7's shell (approved, "Round 7 looks good", 2026-10-24), and the admin boards drawn for this ticket, once the human approves them.
- **WCAG 2.2** (SOURCES.md), as every M14 screen.
- What each page does today: M03 (insights), M06 and M13 13d (puzzles, bank), M08 and M12 12d (reports), M13 13a and 13b (database, audit).

## Acceptance criteria
Written from the approved mockups.

## Out of scope
- New admin features beyond the overview and the insights chart: each page keeps what it does now.
- 14b-2c's review items.

## Numbers
Written from the approved mockups; until then, none.

## Plan
1. Draw the nine boards on the canvas (round 9), from round 7's shell and slots.
2. The human's review; record the answers here, with the criteria and Numbers.
3. Build, review, one PR.

## Removes
Planned: the `/admin` footer's link line and every "Plain on purpose; the look is M14's job" note, once the pages have their look.

---

## Source diff

## Evidence

## Review
