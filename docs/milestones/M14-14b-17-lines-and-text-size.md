# M14 14b-17 — Readable lines, spaced headings, text that follows the browser's size

**Status:** approved (human, 2026-10-31: "Approve, build it", to "Build 14b-17 as drafted?"), done (PR #147, merged on green CI at the human's "Merge when green", 2026-10-31). It was drafted from two rounds of guided questions (2026-10-31) on the Impeccable audit's long lines, heading spacing and px font sizes.

## Goal
No paragraph runs wider than about 70 characters; on the reading pages each heading sits closer to the text it starts than to the text before it; and every font size grows with the player's browser text size, with the layouts still holding at 200%.

## Who uses it / what breaks without it
- Used by: every reader of Privacy, About, `/streak` and signed-out Today on a desktop, and any player who sets a bigger default text size in their browser.
- Breaks without it:
  - Lines run to about 135 characters at 1440px (signed-out Today), 130 (Privacy) and 114 (`/streak`), against Impeccable's 80.
  - On Privacy and signed-out Today the `h2`s have as much space above as below, so each reads as bound to the block before it.
  - Every font size is in px (89 declarations), so the browser's text-size setting changes nothing.

  These are the Impeccable audits of 2026-10-29 and 2026-10-31, in ROADMAP For M14.

## What the human decided (2026-10-31, on the Windows PC, quoted)
Round 1:
1. Line length: "About 70 characters (Recommended)" ("Paragraphs stop at 70ch (about 70 letters) however wide the screen; the column itself stays 960px, so cards and boards keep their width.").
2. Where: "Every paragraph, site-wide (Recommended)" ("One rule for all `p`").
3. Headings: "More above than below (Recommended)" ("Each h2 gets a bigger gap above it than below it, so it reads as the start of what follows. The gaps would be twice the paragraph gap above (40px) and half below (10px) unless you'd like other numbers.").
4. Font units: "All to rem (Recommended)" ("Every size becomes rem (16px = 1rem): identical at the default text size, and it grows when a player raises their browser's text size. Needs checking that layouts hold at a bigger size (tiles, tab bar, the graph).").

Round 2:

5. Check size: "200% (Recommended)" ("WCAG 1.4.4's 'resized up to 200 percent'. Screenshots of every tab at 390px and 1440px with the browser's text at 32px instead of 16px").
6. If something breaks: "Let it wrap or grow, fix only real breaks (Recommended)" ("only overlap, clipping or sideways scroll gets fixed (in this ticket, shown to you)").
7. Scope: "Only font sizes (Recommended)" ("Paddings, gaps, borders, the 44px controls and the 768/1200px breakpoints stay px").

While building, after measuring that Baloo 2's wide zero makes 70ch hold about 85 to 90 letters a line on Privacy, and that its lists aren't paragraphs:

8. "About 70 letters: 55ch (Recommended)" ("Measured on Privacy: Baloo 2 fits about 1.3 letters per ch, so 55ch holds about 70 letters a line. What answer 1 described, and under Impeccable's 80.").
9. "Yes, list items too (Recommended)" ("Every paragraph and list item gets the same limit: Privacy's lists are running text. Lists elsewhere (boards, menus) are short rows that never reach it.").

## Source
- **WCAG 2.2** (SOURCES.md): 1.4.4 Resize Text ("resized without assistive technology up to 200 percent without loss of content or functionality"); 1.4.10 Reflow (no sideways scroll).
- **Impeccable's audit** (2026-10-29 and 2026-10-31; ROADMAP For M14): the 80-character line, the heading rhythm and the px font sizes.
- **DESIGN.md** (Type; Spacing and layout): the 960px column, the font sizes as built.

## Acceptance criteria
- [x] Every `p`, and every list item on the reading pages, is at most 55ch wide, about 70 letters in Baloo 2 (answers 1, 8 and 9); at 1440px no paragraph or list item on Privacy, About, `/streak` or signed-out Today runs past Impeccable's 80 characters a line. Cards, boards and the column keep their widths.
- [x] On the reading pages (Privacy, About, signed-out Today), an `h2` has 40px above it and 10px below (answer 3); card headings are unchanged.
- [x] Every `font-size` in the CSS is in rem (16px = 1rem), the stat numbers' `min(40px, …cqi)` included, and the graph measures its labels at the size they're drawn; at the browser's default size every page looks as before (the e2e that measure sizes, such as `calm`, `look` and `leaderboard-graph`, pass unchanged).
- [x] At a 32px browser default (200%), every tab at 390px and 1440px, Privacy, About and the 404 have no overlap, clipping or sideways scroll; anything found is fixed by letting it wrap or grow (answer 6) and shown to the human with before and after screenshots. *(The fixes are shown after; their "before" is the measured widths in Evidence, as the first pass's full-page captures had dropped the text size.)*
- [x] Paddings, gaps, borders, the 44px controls and the breakpoints stay px (answer 7).
- [x] Impeccable's detector finds no `line-length` or `heading-rhythm` on Privacy, `/streak` or signed-out Today at 1440×900.
- [x] DESIGN.md's Type section says sizes are in rem and the paragraph measure; the For M14 long-lines and px-fonts items close; the `reviewer` agent has reviewed the diff.

## Out of scope
- Spacing in rem, the controls' 44px, the breakpoints (answer 7).
- The streak pill's 28px and the admin sub-tabs' 40px heights (their own For M14 item).
- Card headings' spacing.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 55ch | The widest a paragraph, or a list item on a reading page, gets (about 70 letters in Baloo 2) | Answers 1 and 8, measured on Privacy (70ch held 85 to 90 letters) |
| 40px above, 10px below | An `h2` on the reading pages | Answer 3 |
| 16px = 1rem | Converting each px font size (so 12px is 0.75rem) | Answer 4; the browser default |
| 200% (32px) | The bigger text size checked | Answer 5; WCAG 2.2 1.4.4 |

## Plan
1. Red first: an e2e (`e2e/text-size.e2e.ts`) for a 70ch paragraph on Privacy at 1440px, a reading page's `h2` spacing, and a font size that doubles when the browser's default text size doubles (a page's `h2` and a stat number). Expected: it fails (paragraphs 130 characters, px sizes don't move).
2. `p { max-width: 70ch }` in `globals.css`; the reading pages' `h2` spacing scoped to them, not card headings; every `font-size` to rem; the graph's measuring reads its labels' computed size.
3. Run the e2e that measure sizes (`calm`, `look`, `leaderboard-graph`, `reactions-menu`, `me`, `offbeat`) and the new one. Then a throwaway pass at a 32px default, every tab at 390px and 1440px plus Privacy, About and the 404: screenshots, sideways scroll and overlap checks; fix what breaks and show the human.
4. The detector on Privacy, `/streak` and signed-out Today at 1440px; DESIGN.md; the `reviewer` agent; the For M14 items, the ROADMAP row and HANDOFF in the PR.

## Removes
- Every px font size (89 declarations), for rem.
- The For M14 long-lines and px-fonts items.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Answer 1: "70ch (about 70 letters)" | 55ch | In Baloo 2, 70ch held 85 to 90 letters a line on Privacy (its zero is wide); the human chose about 70 letters (answer 8) |
| Answer 9: list items too | List items on the reading pages (`.reading li`) | A board's rows are list items; held to 55ch they'd narrow on a desktop. Privacy's lists, the audit's hit, are capped |
| Answer 7: only font sizes change unit | The badge and the avatar slots are sized in rem too | At 200% their letters outgrew their 24px and 30px circles, a clipping break answer 6 fixes by letting them grow; identical at the default |
| Answer 6: fix only overlap, clipping or sideways scroll | Card heads, chips, a week's head and a board's row wrap; Today's column is as wide as the screen; a too-long word breaks | Each pushed the page sideways or squeezed a name to a letter a line at 200% (Evidence) |
| WCAG 1.4.4 at 200% | Chips and buttons have px padding around bigger text, which the detector calls cramped on Me and the admin pages | Answer 7 keeps paddings px; nothing overlaps, clips or scrolls |

## Evidence
- **Red first** (2026-10-31): `npx playwright test e2e/text-size.e2e.ts` → `3 failed`: Privacy's first paragraph `Expected: <= 653.46875`, `Received: 928`; the reading h2's margins; the font sizes not doubling at a 32px browser default.
- **Plan step 3's hypothesis disproved:** 70ch didn't give about 70 letters. Measured on Privacy at 1440px (a throwaway spec): paragraphs at 70ch held 72 to 90 letters a line on average, its lists 75 to 112. Asked (answers 8 and 9).
- **Green:** `npx playwright test e2e/text-size.e2e.ts` → `3 passed`. All 89 `font-size` declarations converted (`converted 89`; `grep` finds none in px).
- **The default look unchanged:** `npx playwright test e2e/text-size.e2e.ts e2e/calm.e2e.ts e2e/look.e2e.ts e2e/feel.e2e.ts e2e/leaderboard-graph.e2e.ts e2e/reactions-menu.e2e.ts e2e/me.e2e.ts e2e/offbeat.e2e.ts e2e/not-found.e2e.ts e2e/shell.e2e.ts e2e/live-board.e2e.ts e2e/groups.e2e.ts e2e/today.e2e.ts e2e/player-screens.e2e.ts e2e/admin-area.e2e.ts --reporter=line` → `69 passed (8.4m)`, their measured sizes (13px, 24px, 40px, 12px labels) unchanged. `npm test` → `Tests 493 passed (493)`; `npx tsc --noEmit -p .` and `npx eslint src e2e`: no output.
- **The 200% pass** (a throwaway spec, deleted after): every tab at 390px and 1440px, Privacy, About and the 404, as an admin with friends, a group and points, at a 32px browser default set again before each page (the root read 32px in all 22 states), each checked for elements past the screen's edge and run through Impeccable's detector. Found and fixed:
  - Today at 390px scrolled to 522px: a card's head (heading and chip) and the auto-sized column; Friends' graph to 419px: a week's head; Me to 403px: the "Playing since" chip; at 1440px a long name past the right column. Fixed by letting heads, chips and a week's head wrap, Today's column `minmax(0, 1fr)` and `overflow-wrap: anywhere`.
  - Then the detector's `text-overflow` on Today's own leaderboard row (the name squeezed to a letter a line): a board's row now drops its points under the name. The badge's and avatars' letters outgrew their circles: sized in rem.
  - Last run: no element past the screen's edge in any state but the admin table's phone header, which is screen-reader-only (`.sr-only-on-phones`); the detector finds only `cramped-padding` on Me's and the admin's chips and buttons (Source diff) and `straggler` on Privacy's list items (advisory).
  - *Learned:* a full-page screenshot drops the browser's text size, so the first pass's captures and detector runs were at 16px; the pass then took viewport screenshots after its checks.
- **Impeccable's detector at the default size** (the same spec at 16px, 22 states): no `line-length` or `heading-rhythm` anywhere (2026-10-31's audit had them on Privacy, `/streak` and signed-out Today at 1440px); only Privacy's advisory `straggler`.
- **Screens** shown to the human: Privacy at 1440px before (2026-10-31's audit) and after; Today, Me and the Friends graph at 390px at 200%.

## Review
The `reviewer` agent, fresh context, 2026-10-31, on `d21d62e`.
- Blocking findings and how each was fixed:
  - The site-wide `p { max-width: 55ch }` also caught `<p>`s that are layout boxes: the question card's head (its points chip moved to mid-card at 1440px, 383px short), the admin Reports body box and the admin Puzzles approve column. Each now sets `max-width: none`; a new e2e checks the question card's head is as wide as its card, failing without the fix (`Expected: < 1`, `Received: 382.96875`) and passing with it (`npx playwright test e2e/text-size.e2e.ts` → `4 passed`).
  - The graph's text scaling (`k`) had no test: a unit case at twice the size checks the room for day names, the labels' spacing, the tick, the badge and the axis numbers (`race-layout.test.ts` → `17 passed`).
  - The ROADMAP row, the For M14 long-lines, px-fonts and two chip-`nowrap` items, and HANDOFF were not yet updated. Done in this PR; DESIGN.md's citations into `kit.module.css` were remapped again after the fix, and its graph line no longer says the text stays 12px.
- Deferred to ROADMAP "Next revision" (For M14): `overflow-wrap: anywhere` on `body`; a board's row at the default size; the graph's 0.75 in two places; no static guard against px font sizes; the badge and avatars in rem, for the human to confirm; Privacy's list items' lone last words.
