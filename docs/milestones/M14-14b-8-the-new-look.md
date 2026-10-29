# M14 14b-8 — The new look: hard ink shadows, nearly square corners, cards, rows and chips

**Status:** approved (human, 2026-10-29: "Approve 14b-8 as drafted, including adding mockup 3 to SOURCES.md"); 14b-8a, the kit and the shell, done (PR #130); 14b-8b, Today and the game, done; next 14b-8c. Comes after 14b-6 (done) and before 14b-7, the design clear-out: the look, then an Impeccable critique of it, then the clear-out.

## Goal
Plor's player and admin pages take the look the human chose on mockup 3 with its "Nearly square (5px)" setting: hard ink shadows and borders, nearly square corners, sections as bordered cards, lists as bordered rows, facts as chips and badges, in Baloo 2 and each theme's own colours.

## Who uses it / what breaks without it
- Used by: every player and the admin, on every page.
- Breaks without it: the look the human decided on 2026-10-28 isn't built; the critique that follows and 14b-7's `DESIGN.md` would describe the old look instead of the chosen one.

## What the human decided (quoted)
**2026-10-27 to 28, on the Mac and the Windows PC (from the handoff of that time, git `2b9d210^`):**
1. The inspiration, askmoonlit.com: "i just like the black shadow behind some of the boxes as well as the how the site feels very full".
2. Mockup 2: "can we just try taking the hard ink shadows, and the tile fill colors remain true to the small # of colors on each pallete? and try the chips and badges". The ink is each theme's text colour; every fill is a colour slot the theme already has.
3. Mockup 3: "only change is more square-like" (no texture); corners "Nearly square (5px)"; chips, pills and buttons "Square them too"; "Player and admin pages (Recommended)"; "After 14b-6 (Recommended)"; shadows "Keep 2px border, 4px shadow" (3px on small buttons).

**2026-10-29, on the Windows PC:**
4. The order, after a mix-up that had cancelled the look ("im confused, i wanted to go ahead with that shadowed look and square corners, THEN run impeccable"): "Look → critique → clear-out (Recommended)".
5. The look: "Yes, as decided (Recommended)", in Baloo 2, now the one font (14b-6d).
6. PR #129: "Merge it, fix the plan in the new ticket (Recommended)".
7. Depth on the drawn screens: "Match the mockup's layout (Recommended)".
8. The undrawn pages (Groups, a group, `/streak`, How to play, the settings sheet, the run's result, the admin pages): "The same kit by analogy (Recommended)".
9. Buttons press down when tapped: "Yes, press down (Recommended)", off under reduced motion.
10. Data: "add points all time and longest streak": Me already shows both (`me.totals.points`, `me.totals.longestStreak`), so no new data; they take the mockup's stat tiles.
11. The question's clock: "Mockup's clock, banner stays hidden (Recommended)".
12. Today's introduction for signed-in players: "Drop it, as drawn (Recommended)"; signed-out visitors keep it, in the served HTML (M02 2c).
13. Phone Today's invite card: "Show it on phones too, as drawn (Recommended)", when the player has no friends.

## Source
- **Mockup 3**, the human's approved drawing: the private claude.ai page "Plor hard-shadow mockup" (https://claude.ai/artifact/PuxmXXNxypRTz8uYGQLUK8), with its "Nearly square (5px)" card shape (`html[data-shape="sq5"]`), no texture, its toolkit CSS (`.tile`, `.btn`, `.chip`, `.badge`, `ul.list li`, `.seg`, `.stat`, `.cal`, `.letters`, `.tabs`, `.side`) and its five screens (Today, a question, Friends, Me, desktop Today). In SOURCES.md since this ticket's approval. It stays until 14b-7, which deletes it after the critique.
- **DECISIONS.md, Styling:** CSS Modules and CSS variables, one font, the colour slots; `globals.css` holds the slots and base element styles.
- **WCAG 2.2** (SOURCES.md): 2.3.3 (the press under reduced motion), 1.4.11 (borders and focus visible on every theme).

## Design
1. **The kit, in `globals.css` and one shared module:** the corner, border and shadow values below as CSS variables; `--ink` is each theme's `--text`. Base `button` and `input`, `textarea`, `select` take the mockup's borders and corners; buttons get the drop shadow and the press. A card (the mockup's `.tile`), a bordered row list, a chip and a badge as shared components or classes, one way each.
2. **The shell:** the tab bar's 2px ink top border and the active tab's soft fill with a 2px ink outline; on desktop the sidebar's active item with a soft fill, 2px ink border and 3px shadow, its right edge a 2px ink rule, as drawn.
3. **The drawn screens, matching the mockup's layout** (answer 7), with the app's real data only (answer 10):
   - Today: the Updraft banner with chips (the date, "7 stops", "Don't match the Wind"), the leaderboard card (the Yesterday/This week segmented control, numbered badges, rows), the feed card (avatar rows, reaction chips), the friends invite card on the theme's soft fill.
   - A question: one card on the soft fill with "Stop N of 7" (dark chip) and points as chips, the prompt (30px) and the seconds as a 64px number with "seconds left" under it (answer 11), the stolen letters as struck tiles, the answer box and Answer; the banner stays hidden (14b-6c).
   - Friends: Friends today as avatar rows with state chips, the leaderboard card, the friends list card with the invite buttons.
   - Me: the header card (big avatar, name, "Playing since" chip), All games as stat tiles (points all time, days played, day streak now, longest streak), the calendar, Your Updraft, the rarest answers as numbered rows with "1 of 27" chips.
   - Desktop: the sidebar, the content column and the right column as drawn.
4. **Every other page by analogy** (answer 8): Groups, a group's page, `/streak`, How to play, the settings sheet, the run's result and the admin pages take the same cards, rows, chips, corners and shadows; each PR's Evidence has their screenshots.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 5px | cards, big buttons, the question card | mockup 3 "Nearly square (5px)": `--r-tile`, `--r-btn` (human, 2026-10-28: "Nearly square (5px)") |
| 4px | small buttons, chips, list rows, inputs, stat tiles, stolen-letter tiles; skeleton lines, as the inputs they stand beside | mockup 3 sq5: `--r-btn-s`, `--r-chip`, `--r-li`, `--r-input`, `--r-stat`, `--r-letter` ("Square them too") |
| 10px 12px | the padding inside inputs, text boxes and pickers (14b-8a) | `globals.css`'s input padding, unchanged, now shared by all three (mockup 3's fields have 9px 12px; one value is kept, not two) |
| 2px | calendar cells | mockup 3 sq5: `--r-cell` |
| 2px, 1.5px | borders: cards, buttons, inputs, the tab bar; chips, rows, small links | mockup 2 and 3 (`.tile`, `.btn`, `.chip`, `ul.list li`); "Keep 2px border" |
| 4px 4px 0, 3px 3px 0 | card and stat-tile shadows | mockup 2 and 3 (`.tile`, `.stat`); "4px shadow" |
| 0 4px 0, 0 3px 0 | big and small button shadows | mockup 3 (`.btn`, `.btn.small`); "3px on small buttons" |
| 4px, 80 ms | a pressed button's drop and its timing | mockup 3 (`.btn:active`, `transition: transform .08s`); answer 9 |
| 64px, 30px | the question's seconds and prompt | mockup 3's question screen (`.clock`, `.prompt`); answer 11 |
| the theme's `--text` | the ink of borders and shadows | mockup 2 ("the ink is each theme's text colour") |
| 14px; 10px | a card's padding; the gap between its parts (14b-8b) | mockup 3's `.tile` |
| 8px; 8px 10px; 10px | rows' gap; a row's padding; the gap inside it | mockup 3's `ul.list`, `ul.list li` |
| 2px 9px, 12px; 4px; 8px | a chip's padding and text; the gap inside it; the gap between chips | mockup 3's `.chip`, `.row` |
| 24px, 12px | a badge's size and number | mockup 3's `.badge` |
| 10px 14px | a stat tile's padding | mockup 3's `.stat` |
| 10px 18px, 17px; 6px 12px, 14px; 4px 10px, 14px | the main, small and minor buttons' padding and text | mockup 3's `.btn`, `.btn.small`, `.link` |
| 1px 8px, 13px, 44px wide, 6px apart | reaction chips | mockup 3's `.reacts span` |
| 24px | a reaction chip's least height | WCAG 2.2, 2.5.8 (the 24px minimum target) |
| the card's corners + 2px | the Updraft banner's corners | mockup 3's `.banner` (`calc(var(--r-tile) + 2px)`) |
| 12% and 50% of `--on-offbeat` | the banner chips' fill and edge | mockup 3's `.banner .chip` (`#ffffff1f`, `#ffffff80`: its white at those strengths) |
| 34px by 38px, 18px, 3px; 6px apart; 13px label | the stolen-letter tiles, their letters and strike; the gap; "The Wind has taken" | mockup 3's `.letters span`, `.letters`, its label |
| 1.5px dashed, 10px 12px, 14px, 600 | a note under the answer box | mockup 3's `.lock` |
| 64px; 13px label | the comment box's least height; its label, straight above it | mockup 3's `textarea`, its label |
| 6px | above a comment's reactions; under "The Wind has taken" | mockup 3's reactions (`margin-top:6px`) and that label (`margin-bottom:6px`) |
| 13px | "seconds left" under the clock | mockup 3's `.muted` under `.clock` |

Every other size is read from mockup 3's CSS when built and recorded here, or the human is asked.

## Acceptance criteria
1. **The kit:** an e2e reads computed styles on Today in two themes (Paper and Night): a card has a 2px border and a `4px 4px 0` shadow in the theme's text colour and 5px corners; a chip 1.5px and 4px; the main button `0 4px 0` and 5px; under `prefers-reduced-motion: reduce` a pressed button doesn't move.
2. **The drawn screens:** screenshots at 390×844 and 1440×900 of Today, a question, Friends, Me and desktop Today beside mockup 3's, in the PR's Evidence; the human looks before merging each PR.
3. **The undrawn pages:** screenshots of each at both sizes in their PR's Evidence.
4. **No new data:** no migration, no new API field (`git diff` of `supabase/` and `src/app/api/` empty).
5. `npm run lint`, `npx tsc --noEmit -p .`, `npm test`, `npm run test:db`, `npm run test:e2e`, `npm run build` and CI pass; the existing 320px no-sideways-scroll checks pass.
6. **After the last PR, an Impeccable critique** of the player pages, its score recorded here (answer 4; no target score).

## Out of scope
- Textures, the other card shapes and other fonts on mockup 3's switches (answer 3; answer 5).
- New data or features (answer 10), and the critique's other findings, which wait for the fresh round after 14b-7 (human, 2026-10-29: "Everything waits (Recommended)").
- The mockup's device frames (the phone's 18px corners and 6px shadow, the desktop frame): drawing chrome, not part of the app.
- The game's world and art (14c).

## Plan
One PR each, in order; the human sees each PR's screenshots before it merges:
1. **14b-8a, the kit and the shell:** the variables, the base buttons, links drawn as buttons, inputs, text boxes and pickers, the tab bar, the sidebar, the streak pill, the clock bar, the Undo toast and the skeletons. Every page picks up the buttons and fields at once. The card, row, chip and badge come with 14b-8b, where they're first used, so nothing is added before it has a caller (CLAUDE.md, "Build for today").
2. **14b-8b, Today and the game:** Today, the question card and clock, the run's result, How to play. Its buttons with their own styles, which 14b-8a's base shadow and press now reach: `game.tsx`'s `.play` and the banner's `.offbeat` button-link (an ink shadow under a white button on navy), `.start` in `game.tsx` and `offbeat.tsx`, and the reaction buttons (to the mockup's chips).
3. **14b-8c, the other player pages:** Friends, Groups, a group, Me, `/streak`, the settings sheet. Its buttons as above: `settings.tsx`'s `.close` (a round button with an ink ring and shadow), `.secondary`, `.dangerButton` and `.inline` (still a 1.5px `--edge` border and 12px corners under the ink shadow).
4. **14b-8d, the admin pages.** Its buttons as above: `admin.button` (36px, 10px corners), `.primary`, `.dangerFill`, Puzzles' `.day`, the pill `.chip` and `.more`, all with the big `0 4px 0` shadow where the mockup's small button has `0 3px 0`, and `admin-area`'s `.menuButton`.
5. **The critique** (criterion 6), then 14b-7.

## Removes
- The corner values the kit replaces (`globals.css`'s 10px and 12px, the modules' 7px to 20px corners), and per-page styles a shared card, row, chip or badge replaces; each PR lists its own.
- **14b-8b:** the banner's `.line` and borderless white Play; the button-link's `offbeat` tone (Result is the banner's Play button now); `game.module.css`'s `.secondary` (How to play is a button-link); the leaderboard card's own card, title and date styles and its 1.5px `--edge` switch and picker; `offbeat.module.css`'s card, list and safe and caught pills (the kit's); `comments.module.css`'s `.locked` list (the kit's rows); the feed's, the board's and the result's plain lists.
- **14b-8a:** the base controls' 1.5px `--edge` border and their 10px and 12px corners; the button-link's, the Undo toast's and the skeleton line's 12px corners and the toast's `--edge` border; the tab bar's and sidebar's 1px `--line` rules; the streak pill's 999px pill shape and soft fill; the clock bar's 1.5px accent rule.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Mockup 3's buttons come in four kinds (`.btn` accent, `.btn.plain`, `.btn.small`, `.link`) | **14b-8a:** the base `button` and the button-link are the mockup's plain big button (2px ink, 5px, `0 4px 0`); the filled, small and link kinds come where the pages that use them are restyled (14b-8b to d) | The app's base buttons are its 44px and 48px controls, the size of the mockup's big button; a kind with no caller yet isn't added (CLAUDE.md, "Build for today") |
| Mockup 3 draws the gear as a round avatar with a 2px ink border | **14b-8a:** the gear keeps its borderless 44px icon, with no shadow or press | A 44px ink ring beside the streak chip is heavier than the mockup's 30px one, and the gear is an icon, not one of the kit's buttons; 14b-8b's screenshots show it beside the mockup's |
| Mockup 3's phone top bar has no rule; the clock bar isn't drawn | **14b-8a:** the top bar keeps its 1px `--line` rule; the clock bar's rule is 2px ink, like the tab bar's | The top bar's rule separates it from content scrolling under it, which the mockup's static phone doesn't show; the clock bar takes the tab bar's rule by analogy (answer 8) |
| Mockup 3's chips, rows and reaction chips have 1.5px edges | **14b-8b:** the CSS says 1.5px; Chromium computes and draws 1px | Chromium floors border widths to whole CSS pixels, at 1x and 2x alike (measured); it drew the mockup the same way. The e2e reads 1px |
| Mockup 3's segmented control (`.seg`) hides overflow at its corners | **14b-8b:** not clipped | Clipping hid each choice's 3px focus ring (WCAG 2.2, 2.4.7); the inner corners are 4px squarer |
| Mockup 3's feed steps days with "‹ Mon" and "Wed ›" | **14b-8b:** "Earlier day" and "Later day", as the minor buttons | Their names are what the buttons say (WCAG 2.2, 2.5.3), and the day shown is in the heading; only the look changed |
| Mockup 3's leaderboard picker has no visible label | **14b-8b:** "Board" stays its label, for screen readers only | The picker needs a name; the mockup shows none |
| Mockup 3's rank badges hold their number as text | **14b-8b:** the number is drawn by CSS from `data-place`, and a hidden ": " sits between a name and its points; a friend's row keeps a hidden ":" before its state | A list's own order says the place, and the rows still read "name: 3 points" and "name: hasn't played yet" to screen readers and in their text |
| Mockup 3's reduced-motion rule only drops the press's transition | **14b-8a:** under reduced motion a button doesn't move or lose its shadow | Answer 9: "Yes, press down (Recommended)", whose option said "off under reduced motion" (WCAG 2.2, 2.3.3) |

## Evidence
### 14b-8b (2026-10-29, the Windows PC's local stack)
- **Criterion 1, the kit's second part:** `e2e/look.e2e.ts` "a card and a chip take the kit's border, corners and shadow": Today's Leaderboard card reads a 2px ink border, 5px corners and a `4px 4px 0px 0px` ink shadow; its date chip 1px (Chromium's 1.5px, Source diff) ink, 4px, no shadow: passed. `feel.e2e.ts`'s clock test now reads the seconds at 64px beside a 30px prompt (answer 11).
- **Criterion 2, seen** (a throwaway e2e, deleted after; a seeded player, removed after), at 390x844 and 1440x900: Today before and after playing, a question, the result and How to play. Today starts with the banner (date chip, "7 stops" and "Don't match the Wind" chips, the accent Play); the leaderboard is a card with its date chip, the ink segmented control and badged rows; the feed a card of comment rows with reaction chips, Delete as a minor button and the full-width box with an accent Post; the question a tinted card with its stop and points chips, the prompt beside the 64px "20" and "seconds left", the accent Answer. Six were sent to the human. Noticed: headings inside cards keep the browser's margins, so the board's "Plor is better with friends" sits apart from its text (for 14b-8c).
- **Tests changed with the look:** the banner's one-line facts are chips now, so `today`, `settings`, `player-screens` and `groups` read each chip; the leaderboard's date moved into its heading, so `today` reads it on the card. Every other check stands: the leaderboard and friend rows still read "name (you): 0 points" and "name: hasn't played yet" (Source diff). The full run before these: 63 passed, 9 failed on exactly these lines and the rows' text; after: the seven files 33 passed, `groups` 2 passed.
- `npx tsc --noEmit -p .` and `npx eslint src e2e scripts` clean; `npm test` **470 passed**; `npm run test:db` **280 passed**; `npm run build` compiled, 73 of 73 pages. No test players or puzzles left.
- **After the review's fixes:** the full `npx playwright test` 72 passed and 2 failed: `feel.e2e.ts`'s chip width (50.27px before a count, 46.27px after: the kit chip's 4px gap opened between the emoji and the count's room, but not around a real count; fixed with no gap in a reaction) and the new look test (its file had no day for the banner's facts; it now adds the fixture day). Rerun, `feel.e2e.ts` caught a posted comment shown twice after Later day (its pending copy beside the loaded one: another load landed before the post's own reload); fixed, `changed` drops a pending post the loaded thread already has. Then `feel`, `look`, `today` and `live-board` 23 passed and 1 failed (`live-board.e2e.ts:169`, the watcher's feed not nudged within 5 s); `live-board.e2e.ts` repeated twice: 16 passed. `npm run build`: the built CSS holds `.banner .chip` (two classes) with the banner's white and tint, so it outranks the kit's chip whatever the load order. `npx tsc`, `npx eslint src e2e scripts`, `npm test` 470, `npm run test:db` 280: clean and passed. No test players or puzzles left.

### 14b-8a (2026-10-29, the Windows PC's local stack)
- **Criterion 1, the kit's first part:** `e2e/look.e2e.ts` (3 tests): in the light and dark colour schemes, the signed-out page's "Email me a sign-in code" button and "About Plor" button-link read a 2px border in the theme's text colour, 5px corners and a `0px 4px 0px 0px` shadow in that colour, and the Email field 2px, 4px and no shadow; pressing the button (mouse down) moves it to `matrix(1, 0, 0, 1, 0, 4)`, and under `reducedMotion: "reduce"` its transform stays `none`; signed in, the tab bar's top border is 2px ink at 390px, and at 1440px the sidebar's right edge is 2px ink and its current item 2px ink, 4px corners, a `3px 3px 0px 0px` ink shadow: passed.
- **Criterion 2, seen** (a throwaway e2e, deleted after; a seeded player who had played and commented, removed after): Today, Friends and Me at 390×844 and 1440×900. Buttons and button-links carry the ink border, corners and drop shadow; fields their ink border; the tab bar its ink rule, the sidebar's current item its bordered, shadowed box; the streak pill is the green ink-bordered chip. Still the old look until 14b-8b and c: the cards' rounded corners, the reactions as full buttons (heavy with the shadow; 14b-8b makes them the mockup's chips), and the pages' layouts. Four were sent to the human.
- `npx tsc --noEmit -p .` and `npx eslint src e2e scripts` clean; `npm test` **470 passed**; `npm run test:db` **280 passed**; `npm run build` compiled, 73 of 73 pages; the full `npx playwright test` **72 passed** (8.4 min). No test players or puzzles left.
- **After the review's fixes:** `look.e2e.ts` (the gear held down reads transform `none` and shadow `none`), `shell.e2e.ts`, `settings.e2e.ts`, `settings-sheet.e2e.ts` and `feel.e2e.ts`: **27 passed**; `npx tsc` and `npx eslint src e2e` clean.

## Review
### 14b-8b (the `reviewer` agent, fresh context, on the uncommitted diff over `23e5ecf`)
- Blocking findings and how each was fixed:
  1. **In the production build the kit's `.chip` loaded after the banner's chip rule and won**, so the banner's chips would have lost their navy tint and white text on plor.app (the dev server, which the tests and screenshots use, loaded them the other way); How to play's 14px spacing lost to the kit card's 10px the same way. Fixed: a page's own variant is scoped above the kit's one class (`.banner .chip`, `.banner .facts`, `section.how`, `.group .reaction`), and the kit's button kinds are written on `button` and `a` (`:is(button, a).primary`), so load order can't decide; a new e2e reads a banner chip's white text and non-ink edge.
  2. **Two modules still drew their own button kind and chip** (`game.module.css`'s `.play` repeating the kit's main button and a third copy of the press; `reactions.module.css`'s chip), against the Styling row this change adds. Fixed: Play, Continue and Result are the kit's `.primary` on a button-link or a button, `.play` keeps only their size; a reaction is the kit's chip plus what a reaction adds. `ButtonLink` takes a kit kind as its `className`; its `danger` tone moved into the kit (`.danger`), used by the admin's tomorrow warning.
  3. **The game screen's stat tiles kept 8px 2px**, not mockup 3's 10px 14px. Fixed: the override is gone.
  4. **Five values with no recorded origin.** Fixed: the chip's 4px gap, "seconds left"'s 13px and the 6px under "The Wind has taken" are mockup 3's and in Numbers; the comment's words now have no margin and its reactions sit 6px under them, and the comment label sits straight above its box, as mockup 3 has them. The Numbers table is whole again (a blank line had split it).
  5. **Answers 12 and 13 had no test.** Fixed: `look.e2e.ts` "signed-in Today: no introduction, the banner's own chips, and the invite card on phones" (the introduction hidden once signed in; the invite card at 390px with no friends, gone at 1440px where the board says it).
- Deferred to ROADMAP "Next revision" (For M14): phone Today's invite card fetches `/api/friends` twice (the card and its `InviteLink`); signed in, the introduction shows until the shell mounts, then goes (a flash and a shift on each load of `/`); a small button drops 4px onto its 3px shadow (the base press); the accent Play's fill and ink edge are about 1.6:1 on the navy banner (its white label identifies it; for the critique); the game screen's stat tiles are 4px apart with 3px shadows.

### 14b-8a (the `reviewer` agent, fresh context, on the uncommitted diff over `a84fa40`)
- Blocking findings and how each was fixed:
  1. **The gear and the sidebar's Settings still pressed down,** and under reduced motion gained a shadow while held: their `transform: none; box-shadow: none` (one class) lost to the base `button:active:not(:disabled)` (two classes and an element). Fixed: the base press rules are in `:where()`, so a button's own class wins; `look.e2e.ts` holds the gear down and reads `none`, `none`.
  2. **`textarea` and `select` had a 9px 12px padding with no recorded origin.** Fixed: inputs, text boxes and pickers share the inputs' existing 10px 12px, in Numbers; the skeleton line's 4px corners joined the 4px row.
- Moved into this ticket's Plan: the buttons with their own styles that the base shadow and press now reach, each under the sub-ticket that restyles it (14b-8b to d).
- Deferred to ROADMAP "Next revision" (For M14): disabled buttons keep the full ink border and shadow; the sidebar's items grew from 46px to 50px with the transparent border; `look.e2e.ts` doesn't close its contexts, its reduced-motion check doesn't assert the shadow stays, and nothing checks a `[data-theme]` element's own ink.
- Unverified by the reviewer: mockup 3 itself (no Artifact tool in its context; it checked against the Numbers, which quote it), the streak pill's safe colours (mockup 3's `.chip.streak`: `background: var(--safe-bg); color: var(--safe)`, read in this session), and the 80 ms on the shadow's transition (mockup 3's `.btn`: `transition: transform .08s, box-shadow .08s`).
