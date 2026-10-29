# M14 14b-8 — The new look: hard ink shadows, nearly square corners, cards, rows and chips

**Status:** drafted (guided questions answered by the human, 2026-10-28 and 2026-10-29), waiting for approval. Comes after 14b-6 (done) and before 14b-7, the design clear-out: the look, then an Impeccable critique of it, then the clear-out.

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

## Source
- **Mockup 3**, the human's approved drawing: the private claude.ai page "Plor hard-shadow mockup" (https://claude.ai/artifact/PuxmXXNxypRTz8uYGQLUK8), with its "Nearly square (5px)" card shape (`html[data-shape="sq5"]`), no texture, its toolkit CSS (`.tile`, `.btn`, `.chip`, `.badge`, `ul.list li`, `.seg`, `.stat`, `.cal`, `.letters`, `.tabs`, `.side`) and its five screens (Today, a question, Friends, Me, desktop Today). Not yet in SOURCES.md: **to add with this ticket's approval.** It stays until 14b-7, which deletes it after the critique.
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
| 4px | small buttons, chips, list rows, inputs, stat tiles, stolen-letter tiles | mockup 3 sq5: `--r-btn-s`, `--r-chip`, `--r-li`, `--r-input`, `--r-stat`, `--r-letter` ("Square them too") |
| 2px | calendar cells | mockup 3 sq5: `--r-cell` |
| 2px, 1.5px | borders: cards, buttons, inputs, the tab bar; chips, rows, small links | mockup 2 and 3 (`.tile`, `.btn`, `.chip`, `ul.list li`); "Keep 2px border" |
| 4px 4px 0, 3px 3px 0 | card and stat-tile shadows | mockup 2 and 3 (`.tile`, `.stat`); "4px shadow" |
| 0 4px 0, 0 3px 0 | big and small button shadows | mockup 3 (`.btn`, `.btn.small`); "3px on small buttons" |
| 4px, 80 ms | a pressed button's drop and its timing | mockup 3 (`.btn:active`, `transition: transform .08s`); answer 9 |
| 64px, 30px | the question's seconds and prompt | mockup 3's question screen (`.clock`, `.prompt`); answer 11 |
| the theme's `--text` | the ink of borders and shadows | mockup 2 ("the ink is each theme's text colour") |

Every other size (paddings, gaps, font sizes) is read from mockup 3's CSS when built and recorded here, or the human is asked.

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
1. **14b-8a, the kit and the shell:** the variables, buttons, inputs, card, rows, chips, badges, the tab bar and sidebar. Every page picks up the corners, borders and buttons at once.
2. **14b-8b, Today and the game:** Today, the question card and clock, the run's result, How to play.
3. **14b-8c, the other player pages:** Friends, Groups, a group, Me, `/streak`, the settings sheet.
4. **14b-8d, the admin pages.**
5. **The critique** (criterion 6), then 14b-7.

## Removes
- The corner values the kit replaces (`globals.css`'s 10px and 12px, the modules' 7px to 20px corners), and per-page styles a shared card, row, chip or badge replaces; each PR lists its own.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
