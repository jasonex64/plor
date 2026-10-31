# M14 14b-17 — Readable lines, spaced headings, text that follows the browser's size

**Status:** drafted, waiting for the human's approval. It was drafted from two rounds of guided questions (2026-10-31) on the Impeccable audit's long lines, heading spacing and px font sizes.

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

## Source
- **WCAG 2.2** (SOURCES.md): 1.4.4 Resize Text ("resized without assistive technology up to 200 percent without loss of content or functionality"); 1.4.10 Reflow (no sideways scroll).
- **Impeccable's audit** (2026-10-29 and 2026-10-31; ROADMAP For M14): the 80-character line, the heading rhythm and the px font sizes.
- **DESIGN.md** (Type; Spacing and layout): the 960px column, the font sizes as built.

## Acceptance criteria
- [ ] Every `p` is at most 70ch wide (answer 1); at 1440px no paragraph on Privacy, About, `/streak` or signed-out Today runs past 70 characters a line. Cards, boards and the column keep their widths.
- [ ] On the reading pages (Privacy, About, signed-out Today), an `h2` has 40px above it and 10px below (answer 3); card headings are unchanged.
- [ ] Every `font-size` in the CSS is in rem (16px = 1rem), the stat numbers' `min(40px, …cqi)` included, and the graph measures its labels at the size they're drawn; at the browser's default size every page looks as before (the e2e that measure sizes, such as `calm`, `look` and `leaderboard-graph`, pass unchanged).
- [ ] At a 32px browser default (200%), every tab at 390px and 1440px, Privacy, About and the 404 have no overlap, clipping or sideways scroll; anything found is fixed by letting it wrap or grow (answer 6) and shown to the human with before and after screenshots.
- [ ] Paddings, gaps, borders, the 44px controls and the breakpoints stay px (answer 7).
- [ ] Impeccable's detector finds no `line-length` or `heading-rhythm` on Privacy, `/streak` or signed-out Today at 1440×900.
- [ ] DESIGN.md's Type section says sizes are in rem and the paragraph measure; the For M14 long-lines and px-fonts items close; the `reviewer` agent has reviewed the diff.

## Out of scope
- Spacing in rem, the controls' 44px, the breakpoints (answer 7).
- The streak pill's 28px and the admin sub-tabs' 40px heights (their own For M14 item).
- Card headings' spacing.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 70ch | The widest a paragraph gets | Answer 1 |
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

## Evidence

## Review
