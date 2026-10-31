# M14 14b-10 — Calm at rest, alive on touch

**Status:** approved (human, 2026-10-29: "Approve 14b-10 as drafted"), drafted from four rounds of guided questions. 14b-10a was paused for 14b-11, test runs (human, 2026-10-29: "RIGHT NOW, AND PAUSE 10A'S WORK"), and resumed once PR #137 merged (human, relayed: "Merge PR #137 once every CI check is green, then resume 14b-10a"); 14b-10a, the still look, done (PR #141, merged 2026-10-30 on green CI). Then 14b-10b, the motion and icons, each its own PR. The two features in the human's notes (reactions behind a ⋯ menu, a leaderboard graph) are later sub-tickets, each with its own questions.

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

**During 14b-10a, after the review measured the numbers (2026-10-29):**
23. At 40px, "0.0/7" is 96px where a game-screen tile on a 390px phone leaves about 74px, and "12,345" is 131px where Me's tiles at 360px leave about 111px. Asked how they should fit: "Shrink to fit the tile (Recommended)" ("40px wherever it fits, scaling down with the tile's width on narrow phones (CSS container units), so a number never spills").
24. After the second review asked where "999,999" came from: "999,999 (Recommended)" ("Fits any total under a million: years of daily play … A seven-digit total would spill until it's raised").

## Source
No entry in SOURCES.md covers the look. The sources are the answers above and 14b-8's answers 15 and 16 (`docs/milestones/M14-14b-8-the-new-look.md`). What exists today is `docs/DESIGN.md`, which each PR updates.

## Design
**14b-10a, the still look:**
- **Shadows:** only buttons and links drawn as buttons keep theirs (answer 3). Cards, rows, chips, stat tiles, the sidebar's current item and the streak pill go flat. Cards keep the 2px ink border (answer 9).
- **One control height:** every button, field and select is 44px tall, the kit's small and minor kinds included (answer 7). The small kind's and the minor kind's `min-height: 0` go. The reaction chips stay as they are until the ⋯ menu (answer 18).
- **The streak pill:** fully round (answer 6).
- **Type:** card headings 24px (answer 10); the numbers in stat tiles (Me's four, the game screen's three) and /streak's number 40px (answer 22). A tile's number shrinks with the tile where 40px won't fit (answer 23). Page headings stay at 32px and body at 16px.
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
| 44px | Every button, field and select | Answer 7; `docs/DESIGN.md` (buttons, `globals.css:372-385`) |
| 2px ink border | Cards, flat | Answer 9; `kit.module.css:7-15` |
| 32px, 24px, 40px, 16px | Page headings, card headings, stat tiles' and /streak's numbers, body | Answers 10, 22 |
| 35% and 24% of the tile's width | The game screen's and Me's stat numbers where 40px won't fit | Answer 23; measured in Baloo 2 at 800 with tabular digits: "1,500" (the best score's most: 1,000 for seven stops plus the 500 bonus cap, `src/config/tunables.ts`) is 2.675 times its size, "999,999" points, the widest Me's total must fit (answer 24; a perfect day is at most 1,500), 3.875 times. Each allows half a pixel a glyph where Chromium rounds glyphs to whole pixels (CI's Linux), down to a 320px phone: (60 − 2.5) / 2.675 ≈ 21.5px of a 60px tile, (91 − 3.5) / 3.875 ≈ 22.6px of a 91px tile |
| Fully round | The streak pill | Answer 6 |
| The theme's `--soft` | Tints at rest and on hover | Answers 8, 11 (`globals.css`, each theme) |
| 200ms | Hovers, the icon hop, pops | Answers 8, 14 (the slide's timing, `globals.css:414-443`) |
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
  - Card headings are 24px; the stat tiles' and /streak's numbers 40px where they fit, and the widest a tile can show fits it on a phone (answer 23).
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
| Answer 7: every button, field and select 44px | Buttons, links drawn as buttons, text fields and selects at 44px; the theme tiles (48px), the host-answer checkboxes, the admin sub-tabs and menu rows, and the board's disclosure rows keep their sizes | They are choice tiles, chips, links and rows, not buttons, fields or selects; the ones under 44px stay on ROADMAP's For M14 item |
| Answer 3: cards, rows, chips, stat tiles, the current tab and the streak pill go flat | The Undo toast went flat too | It held a card's shadow and can't be pressed (only its Undo can) |
| Answer 7 names buttons, fields and selects | The leaderboard's Yesterday / This week strip is 44px too (its choices 40px inside a 2px border) | It's a two-choice control that sits above the board's select, so it takes the same height |

## Evidence
### 14b-10a, 2026-10-29 and 30 (Pacific), the Windows PC (`C:/Users/jason/RIFF-m14`)
- **First version of the e2e:** `npx playwright test e2e/calm.e2e.ts e2e/look.e2e.ts` → 9 passed (2.8m). Then, on the old code (10a's `src` changes held in a stash), `calm.e2e.ts` → 2 failed. Your row's background was `rgb(255, 255, 255)` where the soft tint `rgba(36, 87, 214, 0.1)` was expected, and the streak pill wasn't round.
- **The review found that run proved less than it claimed.** The red run stopped at the tint, before the shadow and height loop, and the loop asserted only empty lists, so it could have passed on a page still loading. The test now:
  - runs the loop first, after every section has loaded (no "Loading…" status left);
  - checks that each page's small controls are on screen (Post, Report, Delete and Earlier day on Today; Remove on Friends; Create group on Groups; Rename on the group);
  - requires at least one shadowed button and one measured control per page.
- **Red, then green (2026-10-30, after 14b-11b, 14b-11c and 14b-12 merged and the stash was popped onto `d2d393b`):**
  - On the old code (10a's `src` in a stash), the first run failed at the Rename check, which came before the loop: 11px apart. The check now runs after the loop. The second red run failed in the loop at its first page, Today at 390px, listing the game banner, the Leaderboard card and the Feed card as non-buttons with a shadow. Both tests failed.
  - On the 10a code: `calm`, `look`, `me`, `streak`, `offbeat`, `player-screens`, `groups`, `settings-sheet`, `settings`, `today`, `admin-area`, `shell` and `test-run` gave **55 passed, 3 failed** (8.3m). The three timed out on a navigation (`player-screens.e2e.ts:77`, `shell.e2e.ts:278`, `test-run.e2e.ts:44`), the first-run timeouts HANDOFF records for this PC. `npx playwright test --last-failed` → **3 passed** (38.1s).
  - `npx tsc --noEmit -p .`, `npx eslint e2e src/app` and `npm test` (47 files, 473) → clean.
- **The fit checks, red then green (after the second review):** with the game screen's number forced to a flat 40px, `fits("1,500")` failed (`calm.e2e.ts:178`); with Me's forced to 40px, `fits("999,999")` failed (`calm.e2e.ts:197`). Each was restored, and `npx playwright test e2e/calm.e2e.ts` → **2 passed** (1.2m).
- **CI on PR #141 (Linux):** `calm.e2e.ts:178` failed: "1,500" didn't fit the game screen's phone tile at 37%, which fits on Windows with 0.7px to spare. Hypothesis: Linux Chromium rounds glyph advances to whole pixels, up to half a pixel a glyph. The shares now allow for that down to a 320px phone: 35% and 24%.
- **Seen** (a throwaway capture, deleted after): Today, `/updraft` after a run, Me, Friends, a group and `/streak` at 390×844 and 1440×900, two friends who played and commented.
  - Cards are flat; buttons keep their shadow.
  - The streak pill is round and tinted beside the round avatar.
  - Your row is tinted on the leaderboard and on the group's boards, and Me's four tiles are tinted with 40px numbers.
  - Rename sits level with the group's name box.
  - "0.0/7" fits its tile at 40px on a desktop.
  - The minor buttons (Report, Delete, Earlier day, Leave group) are visibly bigger at 44px, as answer 7 chose.
- **The 40px numbers, measured:** the review computed that they overflow phone tiles. A Playwright page with Baloo 2 at 800 and tabular digits measured "0.0/7" at 96px, "1,500" at 107px and "999,999" at 155px, against about 74px in a game-screen tile at 390px. The human chose to shrink to fit (answer 23). The e2e writes the widest number into a tile on a phone and checks that it fits, and checks for 40px on a desktop.
- **What the new e2e covers:**
  - No shadow on anything but a button or a link (also checked by a grep of the CSS: `box-shadow` is set only on buttons and links drawn as buttons), on nine pages (Today, Friends, Groups, a group, Me, `/streak`, `/updraft`, admin Puzzles and Insights) at 390×844 and 1440×900, and on Today in all five themes.
  - Every visible button, link drawn as a button, text field and select is at least 44px tall on the same pages and sizes. The reaction chips are left out (answer 18). The two players are friends, share a group, and have played and commented, so Remove, Rename, Report, Delete and Post are on screen.
  - The group's name and Rename line up within 0.5px, top and bottom.
  - The streak pill is round and in the soft tint.
  - Your row is in the soft tint, on the leaderboard and in "Where everyone ended".
  - A card's heading is 24px. The game screen's stat numbers, Me's four totals and `/streak`'s number are 40px, and Me's four tiles are in the soft tint.
- **`e2e/look.e2e.ts`:** its six shadow expectations (a card, Me's header card, a stat tile, the sidebar's current tab, the admin's current sub-tab, the Insights card) now expect `none`, as answer 3 sets. That's the spec changing, not a weaker check.
- `npm test` → 47 files, 473 passed. `npx tsc --noEmit -p .` and `npx eslint e2e/calm.e2e.ts e2e/look.e2e.ts src/app` → clean.
- **`docs/DESIGN.md`:** updated, with each new citation read at its line.

## Review
### 14b-10a: the `reviewer` agent, twice, fresh context each time
- **First review, blocking findings and how each was fixed:**
  1. The 40px numbers would overflow phone tiles (computed). Measured, confirmed, and fixed by answer 23: they shrink to fit.
  2. `calm.e2e.ts` could pass without measuring. It now waits for the sections, checks the small controls are visible, counts what it measured, and runs its loop first. Shown red on the old code.
  3. ROADMAP's M14 row and HANDOFF were stale. Both rewritten.
  4. The red run's `test-results/` was left behind. Deleted.
- **Second review, blocking findings and how each was fixed:**
  1. The game screen's fit check measured the number against itself, since its `dd` shrinks to its text. It now measures the text against the room inside the tile.
  2. "999,999" had no origin. The human chose it (answer 24).
  3. HANDOFF's list of what's left and its 14c step were stale. Both rewritten.
- **Fixed with them** (slips in this diff):
  - DESIGN.md's sidebar citation, one line off since the streak pill's comment grew;
  - this ticket's Numbers citations;
  - a double blank line in `calm.e2e.ts`.
- **Left as they are:** the unapproved 14c-2 draft rides in this PR as a docs file, so the repo holds it while 14c is postponed.
- **Deferred to ROADMAP "Next revision" (For M14):**
  - the admin field's inner input ties on specificity with the global 44px input rule;
  - the streak pill's comment says 26px where For M14 measured 28px.
