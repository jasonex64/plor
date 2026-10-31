# M14 14b-15 — Stats on the card, not tiles in a card

**Status:** drafted, waiting for the human's approval. It was drafted from two rounds of guided questions (2026-10-31), after the Impeccable audit of the same day found the stat tiles still read as cards inside cards. It closes 14b-10's last criterion.

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

Earlier answers this ticket keeps: 14b-10's answer 3 (flat, nothing that can't be pressed has a shadow), answer 11 (your own things take the soft tint), answer 20 (Me's headline numbers are yours), and answers 22 to 24 (a number is 40px where it fits, else it shrinks to its cell).

## Source
- **Impeccable's audit and detector** (2026-10-31, `docs/milestones/M14-14b-10-calm-and-alive.md`, criterion "An Impeccable audit after 14b-10b…"): the `nested-cards` rule, its 48 hits on `kit.stat` inside `kit.card`.
- **DESIGN.md**, the kit: the card (`kit.module.css:7-15`), its tinted kind (`.soft`, `:18-20`), the stat tile (`:145-150`), and `--line`, the slot the site's thin dividers use (the leaderboard table's rows, the suggestions' rows).
- **14b-10** (`docs/milestones/M14-14b-10-calm-and-alive.md`), answers 3, 11, 20 and 22 to 24, as above.

## Acceptance criteria
- [ ] No stat has a border, corners or its own fill: `kit.stat` is a cell, its number over its label, centred.
- [ ] "Your Updraft" (the game screen and the test run): three cells in a row, a 1px `--line` between neighbours, the card the only box.
- [ ] Me's "All games": four cells 2 by 2 with a 1px `--line` cross between them, no gap; the card itself in the soft tint (`kit.soft`), the cells not tinted.
- [ ] Each number is still 40px where it fits and shrinks to its cell otherwise; `calm.e2e.ts`'s fit checks pass ("1,500" on a phone's Updraft, "999,999" on a 360px Me).
- [ ] Impeccable's detector finds no `nested-cards` on Me, `/updraft` or the test run at 390×844 and 1440×900; 14b-10's audit criterion is then ticked.
- [ ] The e2e checks that described the tiles (`look.e2e.ts`'s tile border and corners, `calm.e2e.ts`'s tinted tiles) describe the cells and the tinted card instead.
- [ ] Screenshots of Me and Updraft before and after, at 390px and 1440px in Paper and Night, shown to the human before the PR (answer 4).
- [ ] DESIGN.md's kit table and Me's line describe the cells; the `reviewer` agent has reviewed the diff.

## Out of scope
- Me's per-game cards, whose numbers are chips ("17 best score"): not stat tiles.
- The calendar's day cells and the 7-day bars.
- The audit's other For M14 items (the 404, long lines, px font sizes, the 28px streak pill, the 40px admin sub-tabs).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 1px `--line` | The lines between cells | Answer 1 ("thin grey lines"); the kit's thin dividers (the leaderboard table, the suggestions) |
| 0 between cells | Me's grid and Updraft's row, so the lines meet as a cross or a row | Answer 5 ("one line down, one across") |
| 10px 14px | A cell's room inside its lines | The tile's padding now (`kit.module.css:147`) |
| 40px, else 24% (Me) or 35% (Updraft) of the cell | The numbers | 14b-10 answers 22 to 24, unchanged (`me.module.css`, `offbeat.module.css`) |

## Plan
1. Red first: change `look.e2e.ts`'s and `calm.e2e.ts`'s tile checks to the cells (no border, centred, the lines, the tinted card). Expected: they fail on the tiles.
2. `kit.stat` loses its border and corners and centres; Me's `.totals` and Updraft's `.stats` lose their gaps and draw the lines; Me's "All games" card takes `kit.soft` and its cells lose theirs.
3. Run `calm`, `look`, `me`, `offbeat` and `test-run`; the detector on Me, `/updraft` and the test run at both widths; screenshots before and after for the human.
4. DESIGN.md; the `reviewer` agent; the ROADMAP row, the For M14 cards-in-cards item, 14b-10's criterion and HANDOFF in the PR.

## Removes
- The stat tile's border and corners (`kit.module.css`, `.stat`) and the 10px and 4px gaps between tiles (`me.module.css .totals`, `offbeat.module.css .stats`).
- Each of Me's four tiles' own tint (`me.tsx`, `Total`), which moves to the card.
- The ROADMAP For M14 cards-in-cards item, once the detector finds none.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
