# M14 14b-15 — Stats on the card, not tiles in a card

**Status:** approved (human, 2026-10-31: "ok sure build now", to building it and showing the screenshots before the PR; then "Looks good, go on" to the screenshots), in review (PR #145). It was drafted from two rounds of guided questions (2026-10-31), after the Impeccable audit of the same day found the stat tiles still read as cards inside cards. It closes 14b-10's last criterion.

## Goal
A stat ("400 best score") sits straight on its card, its number over its label, with thin grey lines between neighbours instead of a bordered tile of its own, on Me and on Updraft's game screen.

## Who uses it / what breaks without it
- Used by: every player on Me and on Updraft's game screen (and admins on a test run, which draws the same screen).
- Breaks without it: each tile's 2px ink border inside a card's 2px ink border reads as a card inside a card. Impeccable's detector found it at both audits (2026-10-29 and 2026-10-31, 48 hits each: Me's "All games", "Your Updraft" and the test run). 14b-10's criterion "its nested-cards finding is gone" stays unmet.

## What the human decided (2026-10-31, on the Windows PC, quoted)
Round 1:
1. The look: "Numbers on the card, thin dividers (Recommended)" ("No boxes: each big number and its label sit straight on the card, split by thin grey lines. The card stays the one container.").
2. Where: "Every stat tile (Recommended)" ("Me's four and Updraft's three (the test run included): the kit's one stat style changes, so there's still one way.").
3. Your tint: "The whole 'All games' card tinted (Recommended)" ("The kit's one tinted card (kit .soft) holds Me's numbers, so 'yours' still shows, as one block instead of four.").
4. Seeing it: "Quick before/after screenshots (Recommended)" ("I build it on the branch, then show Me and Updraft before and after at 390px and 1440px in Paper and Night, before the PR.").

Round 2:

5. Me's 2×2: "A cross: one line down, one across (Recommended)" ("Four quarters, like a window. Every number clearly has its own cell, the same rule as Updraft's row (lines between neighbours).").
6. Alignment: "Centred, as Updraft (Recommended)" ("Each number and its label centred in its cell").

While building, after Claude found that Me's Updraft card is already "the one tinted card on a screen" (`kit.module.css` `.soft`, `me.tsx`):

7. "All games tinted, Updraft card plain (Recommended)" ("Your headline numbers become the screen's one tinted card; the Updraft card below goes plain. Keeps the kit's 'one tinted card a screen' rule").

Earlier answers this ticket keeps: 14b-10's answer 3 (flat, nothing that can't be pressed has a shadow), answer 11 (your own things take the soft tint), answer 20 (Me's headline numbers are yours), and answers 22 to 24 (a number is 40px where it fits, else it shrinks to its cell).

## Source
- **Impeccable's audit and detector** (2026-10-31, `docs/milestones/M14-14b-10-calm-and-alive.md`, criterion "An Impeccable audit after 14b-10b…"): the `nested-cards` rule, its 48 hits on `kit.stat` inside `kit.card`.
- **DESIGN.md**, the kit: the card (`kit.module.css:7-15`), its tinted kind (`.soft`, `:18-20`), the stat tile (`:145-150`), and `--line`, the slot the site's thin dividers use (the leaderboard table's rows, the suggestions' rows).
- **14b-10** (`docs/milestones/M14-14b-10-calm-and-alive.md`), answers 3, 11, 20 and 22 to 24, as above.

## Acceptance criteria
- [x] No stat has a border, corners or its own fill: `kit.stat` is a cell, its number over its label, centred.
- [x] "Your Updraft" (the game screen and the test run): three cells in a row, a 1px `--line` between neighbours, the card the only box.
- [x] Me's "All games": four cells 2 by 2 with a 1px `--line` cross between them, no gap; the card itself in the soft tint (`kit.soft`), the cells not tinted; Me's Updraft card plain, so the screen still has one tinted card (answer 7).
- [x] Each number is still 40px where it fits and shrinks to its cell otherwise; `calm.e2e.ts`'s fit checks pass ("1,500" on a phone's Updraft, "999,999" on a 360px Me).
- [x] Impeccable's detector finds no `nested-cards` on Me, `/updraft` or the test run at 390×844 and 1440×900; 14b-10's audit criterion is then ticked.
- [x] The e2e checks that described the tiles (`look.e2e.ts`'s tile border and corners, `calm.e2e.ts`'s tinted tiles) describe the cells and the tinted card instead.
- [x] Screenshots of Me and Updraft before and after, at 390px and 1440px in Paper and Night, shown to the human before the PR (answer 4).
- [x] DESIGN.md's kit table and Me's line describe the cells; the `reviewer` agent has reviewed the diff.

## Out of scope
- Me's per-game cards, whose numbers are chips ("17 best score"): not stat tiles.
- The calendar's day cells and the 7-day bars.
- The audit's other For M14 items (the 404, long lines, px font sizes, the 28px streak pill, the 40px admin sub-tabs).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 1px `--line` | The lines between cells | Answer 1 ("thin grey lines"); the kit's thin dividers (the leaderboard table, the suggestions) |
| 0 between cells | Me's grid and Updraft's row, so the lines meet as a cross or a row | Answer 5 ("one line down, one across") |
| 10px 14px | A cell's room inside its lines | The tile's padding (`kit.module.css:149`) |
| 40px, else 24% (Me) or 35% (Updraft) of the cell | The numbers | 14b-10 answers 22 to 24, unchanged (`me.module.css`, `offbeat.module.css`) |

## Plan
1. Red first: change `look.e2e.ts`'s and `calm.e2e.ts`'s tile checks to the cells (no border, centred, the lines, the tinted card). Expected: they fail on the tiles.
2. `kit.stat` loses its border and corners and centres; Me's `.totals` and Updraft's `.stats` lose their gaps and draw the lines; Me's "All games" card takes `kit.soft` and its cells lose theirs.
3. Run `calm`, `look`, `me`, `offbeat` and `test-run`; the detector on Me, `/updraft` and the test run at both widths; screenshots before and after for the human.
4. DESIGN.md; the `reviewer` agent; the ROADMAP row, the For M14 cards-in-cards item, 14b-10's criterion and HANDOFF in the PR.

## Removes
- The stat tile's border and corners (`kit.module.css`, `.stat`) and the 10px and 4px gaps between tiles (`me.module.css .totals`, `offbeat.module.css .stats`).
- Each of Me's four tiles' own tint (`me.tsx`, `Total`), which moves to the card, and the tint on Me's Updraft card (answer 7).
- The ROADMAP For M14 cards-in-cards item, once the detector finds none.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Answer 3: the whole "All games" card tinted, as "the kit's one tinted card" | It is, and Me's Updraft card goes plain | Me's Updraft card was already the screen's one tinted card; the human chose which keeps it (answer 7) |

## Evidence
- **Red first** (2026-10-31): `look.e2e.ts`'s and `calm.e2e.ts`'s checks rewritten for cells, run against the tiles: `npx playwright test e2e/calm.e2e.ts -g "streak pill"` → `1 failed` at `expect(edges.map(…)).toEqual([["0px", "0px"], ["0px", "1px"], ["0px", "1px"]])` (the tiles' 2px borders); `npx playwright test e2e/look.e2e.ts -g "Me's header"` → `1 failed` at `expect(await sides(0)).toEqual({ left: none, top: none, corners: "0px", fill: "rgba(0, 0, 0, 0)", align: "center" })`.
- **Green:** `npx playwright test e2e/calm.e2e.ts e2e/look.e2e.ts e2e/me.e2e.ts e2e/offbeat.e2e.ts e2e/test-run.e2e.ts --reporter=line` → `20 passed (3.1m)`; the reviewer reran calm and look → `9 passed (1.1m)`. `npm test` → `Tests 493 passed (493)`; `npx tsc --noEmit -p .` and `npx eslint` on the changed files: no output.
- **Impeccable's detector** over a DevTools port on Me, `/updraft` and the test run at 390×844 and 1440×900 in Paper (a throwaway spec, deleted after), the same spec run with the change stashed and then restored: before, `nested-cards` 4 on Me, 3 on `/updraft` and 3 on the test run at each width (20); after, `[]` on all six.
- **Screens** (the same spec; images in the session's scratchpad, not committed): Me and Updraft before and after at 390px and 1440px in Paper and Night, shown to the human: "Looks good, go on". Updraft's three numbers sit centred on the card between two thin lines; Me's four sit behind a thin cross on the tinted "All games" card, with the Updraft card plain below.

## Review
The `reviewer` agent, fresh context, 2026-10-31, on `24e4da1`.
- Blocking findings and how each was fixed:
  - DESIGN.md's `kit.module.css` citations below the stat block were one line off (the block grew by a line): the badge, the buttons, `.primary`, `.small`, `.link`, `.danger`, the hover and the pops. Each moved by one and checked against the file.
  - The ROADMAP row and HANDOFF still said "waiting for approval"; the Evidence, Source diff, Review and ticks were empty; the For M14 cards-in-cards item and 14b-10's audit criterion were open. All done in this PR.
- Deferred to ROADMAP "Next revision" (For M14): "tile" left in comments and two measured widths now out of date; the look test's hard-coded zero-border colour and copied probes; Updraft's cells' corners and fill asserted only through Me's.
