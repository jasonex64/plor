# M14 14b-10 — Calm at rest, alive on touch

**Status:** approved (human, 2026-10-29: "Approve 14b-10 as drafted"), drafted from four rounds of guided questions; 14b-10a paused (human, 2026-10-29, relayed by the "Repeatable test puzzle" session: "RIGHT NOW, AND PAUSE 10A'S WORK"), so an admin-only replayable test run of any day is built first; 10a's code so far is in a `git stash` in `C:/Users/jason/RIFF-m14`, "M14 14b-10a WIP (paused 2026-10-29) …" (`git stash list`), with `e2e/look.e2e.ts` still to update. PR #136 (14b-9) merged first. 14b-10a, the still look, then 14b-10b, the motion and icons, each its own PR. The two features in the human's notes (reactions behind a ⋯ menu, a leaderboard graph) are later sub-tickets, each with its own questions.

## Goal
Plor reads simple when nothing is touched (strong type, a touch of colour, shadows only on what can be pressed, controls one height) and comes alive when touched or changed (hovers, an icon hop, pops, count-ups).

## Who uses it / what breaks without it
- Used by: every player, on every screen.
- Breaks without it: the human's notes (2026-10-29): the look "feels a little too plain"; the same hard shadow is on cards, rows, tiles and buttons, so nothing says what can be pressed (14b-8's critique, P1 "no visual hierarchy"; the audit's cards inside cards); a button beside a field is a different height ("renaming the group has a different button size from the actual textbox"); the round avatar beside the square streak pill "is off"; desktop tabs don't react to the pointer.

## What the human decided (2026-10-29, on the Windows PC, quoted)
**The notes**, as given: "overall, prioritize simplistic complexity. profile pic being a circle right next to the streak icon being a rectangle is off; hovering over tabs on desktop should highlight them, and the icon should have a little animation change; not everything needs a shadow, remove unnecessary ones; emoji reactions should be from a ... menu on the top of each comment, not filling up the screen at all; leaderboards should have a graph view as well as a list view; buttons being different sizes (for example, renaming the group has a different button size from the actual textbox of the group's name); overall feels a little too plain".

**Round 1, the long-term picture:**
1. Direction: "Calm at rest, alive on touch (Recommended)" ("Fewer borders and shadows at rest; the personality is in what moves: hovers, presses, small icon animations, reveals").
2. Where the extra life comes from: "Motion, Colour, Type, Drawing" (all four).
3. Shadows: "Only what can be pressed (Recommended)" ("Buttons and button-like links keep the hard shadow, so a shadow means 'you can press this'; cards, rows, chips and stat tiles go flat").
4. Order: "Look first, then features (Recommended)" ("One sub-ticket for the kit … then the reactions menu, then the leaderboard graph, each with its own PR").

**Round 2, the collision of calm with all four:**
5. At rest: "Type + a touch of colour (Recommended)" ("strong headings and big numbers, and the accent tint on a few key things … Motion only on touch. Drawing is kept to icons and ranks (the tab icons redrawn to match the flowers) … the game's world stays for 14c").
6. The avatar and the streak pill: "Both round (Recommended)" ("The streak becomes a fully round pill (capsule) next to the round avatar … The rest of the kit keeps its 5px corners").
7. Control sizes: "One height, 44px (Recommended)" ("Every button, field and select is 44px tall … a button beside a field always lines up … minor buttons (Report, Delete) get bigger").
8. Desktop tab hover: "Soft fill + icon lift (Recommended)" ("The tab takes the soft tint the current tab has, and its icon lifts and settles once (a small hop), in 200ms … no movement under reduced motion, only the tint").

**Round 3:**
9. Flat cards: "Keep the 2px ink border (Recommended)" ("Cards keep their outline and lose only the shadow").
10. Type: "Bigger steps (Recommended)" ("Page headings 32px, card headings 24px, key numbers (points, streak, rank) 40px, body 16px as now").
11. Tinted at rest: "Your row on boards, Today's game, Your streak and points, Something new" (all four: your own row on every board and friends list; the Play / Result area; the streak pill and Me's headline numbers; "A comment, reaction or result that arrived since you last looked, until you've seen it").
12. Alive on touch or change: "Buttons on hover, Rows on hover, Numbers count up, Pops on add" (all four).

**Round 4:**
13. Where "seen" is kept: "This browser only (Recommended)" ("Kept in the browser's storage, no database change … each [device] marks things new separately").
14. Timings: "200ms, count-up 600ms (Recommended)" ("Hovers, the icon hop and pops all take the slide's 200ms; a button lifts 2px on hover; pops start at 90% size; a number counts up over at most 600ms").
15. Tab icons: "Filled, a little colour (Recommended)" ("Chunky filled shapes with a dark outline and one soft colour each, like the flowers but simpler; the current tab's icon takes the accent").
16. The split: "Two: kit, then motion (Recommended)" ("First the still look: shadows, 44px controls, round streak, type sizes, tints. Then the moving parts: hovers, the icon hop, pops, count-ups, the redrawn icons").

**Before 14b-10a, after the approval (the code checked against answers 7, 10 and 11):**
17. When something new counts as seen: "New since your last visit (Recommended)". Superseded by 19.
18. The reaction chips under answer 7: "Leave them until the menu (Recommended)" ("The reaction chips stay as they are in 14b-10a; the ⋯ menu sub-ticket replaces them, with menu items at 44px").
19. "Something new", after Claude rephrased it ("anything that appeared since your last visit to that page gets a light accent background for that visit … The next time you open the page, the highlight is gone"): "Drop it" ("No new highlights at all; the tint stays on your row, the game and your streak only").
20. The streak and Me: "Pill accent, Me's 4 tiles soft" ("The streak pill takes the soft accent tint instead of green, and all four of Me's headline tiles take the soft tint").
21. Today's game: "Nothing more" ("The banner and Play already stand out; the tint goes only to the other places").
22. Which numbers are 40px: "Stat tiles and /streak (Recommended)" ("The numbers in stat tiles (Me's four, the game screen's three) and the big number on /streak. List rows (leaderboards, friends) keep their size").

## Source
No entry in SOURCES.md covers the look. The sources are the answers above and 14b-8's answers 15 and 16 (`docs/milestones/M14-14b-8-the-new-look.md`). What exists today is `docs/DESIGN.md`, which each PR updates.

## Design
**14b-10a, the still look:**
- **Shadows:** only buttons and links drawn as buttons keep theirs (answer 3). Cards, rows, chips, stat tiles, the sidebar's current item and the streak pill go flat. Cards keep the 2px ink border (answer 9).
- **One control height:** every button, field and select is 44px tall, the kit's small and minor kinds included (answer 7). The small kind's and the minor kind's `min-height: 0` go. The reaction chips stay as they are until the ⋯ menu (answer 18).
- **The streak pill:** fully round (answer 6).
- **Type:** card headings 24px (answer 10); the numbers in stat tiles (Me's four, the game screen's three) and /streak's number 40px (answer 22). Page headings stay at 32px and body at 16px.
- **Tints at rest,** in the theme's soft accent (answers 11, 19 to 21):
  - your own row on every board and friends list;
  - the streak pill, in place of its green (answer 20);
  - Me's four headline tiles (answer 20).

**14b-10b, the motion and icons:**
- **Desktop tabs:** the soft tint on hover, and the icon hops once (answer 8).
- **Buttons:** lift 2px on hover (desktop), then press as now (answer 14).
- **Rows:** take the soft tint on hover (answer 12).
- **Numbers:** points, streak and rank count up when they change, over at most 600ms.
- **Pops:** a new reaction, comment or rank pops in from 90% size.
- **Reduced motion:** nothing moves; tints still show (answer 8).
- **Tab icons:** redrawn filled, with one soft colour each; the current tab's icon takes the accent (answer 15). The drawings are shown to the human before they ship.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 44px | Every button, field and select | Answer 7; `docs/DESIGN.md` (buttons, `globals.css:367-380`) |
| 2px ink border | Cards, flat | Answer 9; `kit.module.css:6-15` |
| 32px, 24px, 40px, 16px | Page headings, card headings, stat tiles' and /streak's numbers, body | Answers 10, 22 |
| Fully round | The streak pill | Answer 6 |
| The theme's `--soft` | Tints at rest and on hover | Answers 8, 11 (`globals.css`, each theme) |
| 200ms | Hovers, the icon hop, pops | Answers 8, 14 (the slide's timing, `globals.css:409-438`) |
| 2px | A button's lift on hover | Answer 14 |
| 90% | A pop's starting size | Answer 14 |
| 600ms at most | A count-up | Answer 14 |
| **Open** | How high the icon hops; the motion's easing | Ask before 14b-10b |

## Acceptance criteria
- [ ] **14b-10a:**
  - Only buttons and button links have a box shadow, on every page in each theme (an e2e reads computed styles, as `e2e/look.e2e.ts` does).
  - Every visible button, field and select, but the reaction chips, is at least 44px tall at 390px and 1440px.
  - The group name's box and Rename line up, top and bottom.
  - The streak pill is fully round beside the round avatar.
  - Card headings are 24px; the stat tiles' and /streak's numbers 40px.
  - Your row on a board and in the friends list, the streak pill and Me's four headline tiles take the soft tint.
- [ ] **14b-10b:**
  - A hovered desktop tab takes the tint and its icon moves once.
  - A hovered button lifts 2px; nothing moves under reduced motion.
  - A count-up ends at the right number within 600ms.
  - A new reaction pops.
  - The redrawn icons pass contrast in all five themes (`src/app/colors.test.ts`'s way).
- [ ] `docs/DESIGN.md` describes the new kit (each PR, CLAUDE.md, Docs).
- [ ] An Impeccable `audit` after 14b-10b scores no worse than 15/20, and its nested-cards finding is gone.
- [ ] The `reviewer` agent has reviewed each PR.

## Out of scope
- The reactions behind a ⋯ menu, and the leaderboard's graph view: later sub-tickets, each from its own guided questions (answer 4).
- 14c, the game's world (answer 5).
- The audit's other For M14 items unless this work closes them: the controls-under-44px items and the cards-inside-cards item close with 14b-10a; the 404, long lines and px font sizes stay.

## Plan
1. After PR #136 is resolved: 14b-10a on `m14-look-and-feel`. Steps: kit variables and `kit.module.css` first, then each page's overrides, then the tints, then the e2e.
2. 14b-10b: ask the open motion numbers. Draw the tab icons and show them to the human, then the hovers, pops and count-ups, then the e2e.
3. After 14b-10b: an Impeccable audit, compared with 2026-10-29's.

## Removes
- 14b-10a:
  - the shadow on cards, rows, chips, stat tiles, the sidebar's current item and the streak pill;
  - the small and minor kinds' `min-height: 0`;
  - the streak pill's small corners.
- 14b-10b: the current line tab icons (`src/app/shell.tsx`).
- ROADMAP For M14: the items these close (above).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
