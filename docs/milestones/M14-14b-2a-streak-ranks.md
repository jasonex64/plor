# M14 14b-2a — The streak ranks

**Status:** done (2026-10-26): merged in PR #88 on green CI (merge commit `9257f30`, 06:10 UTC; `check`, `db`, `e2e` and `secrets` passed on both runs), by auto-merge (human, 2026-10-25: "Merge on green CI (Recommended)"). Designed through the human's guided questions below; the drawings approved as previewed ("Good, build these (Recommended)").

## Goal
The streak shows on every page as a pill in the top bar and sidebar, with a flower for the player's streak rank, and a `/streak` page explains the ranks.

## Who uses it / what breaks without it
- **Used by:** every signed-in player, on every page; anyone who taps the pill to see what the ranks are.
- **Breaks without it:**
  - The streak is one plain text line on Today ("Streak: 4 days played in a row"), while L26 chose "Plor's own symbol", growing with the streak.
  - The sidebar has no avatar slot, which L37 put there ("Account and sidebar").
  - Ranks that change with the streak mean nothing to a player unless the site says what they are (human, below: "document that somewhere on the site").

## What the human decided
Before (M14 ticket and 14b-2's guided questions, `M14-14b-2-sprout-admin-polish.md`):
- **L26:** "Plor's own symbol"; stages "1–4 sprout, 5–14, 15–29, 30+" (2026-10-24).
- **Where it shows:** "Top bar and sidebar (Recommended)": the pill as round 7 draws it, on every page; Today's text line goes.
- **Motion:** "No motion yet".
- **The sidebar's slot:** "Yes, in 14b-2a (Recommended)".

This ticket's guided questions (human, 2026-10-26, on the Windows checkout), in the order asked:
1. **Where the shell reads the streak:** "Profile, refreshed on start (Recommended)": `GET /api/profile` carries it, starting a run reloads it, and `/api/run` drops it.
2. **The sprout's colours:** "i believe in another sesssion i had notes on pixel art maybe this is the time to test it out"; stage 1's leaves: "see previous answer"; the empty pot: "Stage 1's pot alone (Recommended)".
3. **How the pixel art is made:** "use pixelkit repo/code from the other session" (`jasonex64/pixelkit`, the human's pixel-art lint and workflow); the grid: "11×11 at 2px = 22px (Recommended)"; review: "Preview here, then build (Recommended)". The palette question: "not sure what this means".
4. **pixelkit's brief:** "Dark selout (Recommended)", "Round 3's, completed (Recommended)" (the palette), "Top-right (Recommended)" (light), "pixelkit .txt grids → SVG (Recommended)".
5. **The first sprouts:** "feel like theres not enough visual difference between third and 4th tiers"; the palette: "Lock this palette (Recommended)". Redrawn, then: "redo the entire sequence: i think we should just have different mature plants/flowers for each tier, and document that somewhere on the site. that way we can have fully fleshed out sprites for each tier, and they dont have to be too corellated (we can treat them like "Ranks")".
6. **The ranks:** "all different types of flowers"; names: "The plant's name (Recommended)"; where documented: "Own page, pill links to it (Recommended)"; detail: "Two sizes per rank". Then: "use tulip, sunflower, lily, birds of paradise, sakura blossom (3 months)"; the big size: "32×32, 3× phones / 4× desktop (Recommended)"; "Flowers on their own (Recommended)"; "Extend this palette, swatch first (Recommended)"; sakura: "90 days (Recommended)"; the ranges: "Yes, that's it (Recommended)".
7. **Pixel flowers didn't work.** "stop, i thnk we should just have the flower itself no stems/buds and day 0 can be a generic seed instead of a pot"; then "they all look pretty bad and not accurate, especially the sunflower, birds of paradise and sakura". Re-planned (CLAUDE.md, two failed attempts): "PixelLab, snapped by pixelkit" and "16×16 at 2px = 32px (Recommended)"; its 32×32 flowers were good ("Claude's picks (Recommended)"), its 16×16s weren't. Then: "stop process do u think flowers are too ambtious to be looking good at this many pixels we should rethink waht to do for the streaks"; "either something other than flowers or something other than pixel art, if u think pixel art is limimting factor"; "if svg dont look good then we try other symbols pixel art".
8. **Vector flowers:** "these aren't bad but lets also explore some options with pixel arrt"; after pixel gems, flames, stars and medals: "vector flowers, but generate more of them and i pick from the flower designs i like". From a gallery of 22: "in no order (beside seed) lotus, hibiscus, morning glory, sakura, daisy. each needs some work though". Refined, in Claude's order, asked "How do the refined ranks look, and is the order right?": "Good, build these (Recommended)".

So the design is:
- **Six ranks**, each a vector flower drawn as approved: **Seed** at 0 days, **Daisy** 1–4, **Morning glory** 5–14, **Hibiscus** 15–29, **Lotus** 30–89, **Sakura** 90 and up. L26's 1/5/15/30 stay; 90 is the human's sakura ("3 months", "90 days").
- **The pill** (round 7): the rank's flower and the number on the soft pill, in the top bar between the wordmark and the gear below 768px, and under the sidebar's wordmark beside the avatar slot from 768px. It links to `/streak`; screen readers hear "N day streak, Daisy" (question 6, "The plant's name").
- **`/streak`**: how the streak counts, then the six ranks, each flower large with its name and days, the player's own rank marked.
- **Vector, not pixel art.** Pixel art at the pill's size couldn't hold a flower (question 7); vector keeps one drawing per rank for every size, so "Two sizes per rank" became one drawing shown at 22px and on the page at 96px (128px from 768px), the sizes of the 32×32 at 3× and 4× the human picked. The pill stays at round 7's 22px: the 16×16 answer was for pixel art.
- **The colours are the drawings' own**, written as hex in `src/app/ranks.tsx`, the same in every theme. DECISIONS.md's Styling row named only "a game's own art" as an exception; the human chose fixed colours for Plor's drawn art throughout (questions 2–6: the locked palette, "pixelkit .txt grids → SVG", whose option said the Styling row would let drawn art keep its own palette), so the row now names Plor's drawn art too (DECISIONS.md, Log, 2026-10-26).

## Source
- **The human's approved drawings** (question 8), previewed in this session: their shapes and colours are what `src/app/ranks.tsx` draws.
- **Round 7** on the canvas "Plor shell layout" (https://claude.ai/artifact/9QkZKZZZsEpCJsDVv7VfGZ), approved ("Round 7 looks good", 2026-10-24): `.streak` (the pill), `.me` (the top bar's right side), `.av` and board 3's sidebar row.
- **WCAG 2.2** (SOURCES.md): 1.1.1 (the flower is decoration; the pill's name says the streak and the rank), 1.4.3 (the number on the soft pill, 4.5:1 in every theme, over the top bar's background and the sidebar's surface), 1.4.10 (the top bar at 320px), 2.5.8 (the pill's link is a target of at least 24px).
- **The streak's count:** `getStreak` (`src/game/streak.ts`, M11 H4), whose rules `/streak` states.

## Acceptance criteria
1. **The pill.** Below 768px the top bar shows the pill between the wordmark and the gear; from 768px the sidebar shows the avatar slot and the pill under the wordmark. Its accessible name is "N day streak, <Rank>", and it opens `/streak`. Checked in an e2e at 360px and 1440px.
2. **The ranks.** Seed at 0, Daisy 1–4, Morning glory 5–14, Hibiscus 15–29, Lotus 30–89, Sakura 90 and up. Checked by a unit test at every boundary, and an e2e of Seed at 0 and Daisy once the game screen's Start begins a run, without a reload.
3. **`/streak`.** It says how the streak counts and lists the six ranks, each with its flower, name and days, the player's rank marked. Checked in the e2e.
4. **Today's line goes.** "Streak: N days played in a row" is no longer on Today or the no-puzzle banner, and `/api/run` no longer sends the streak.
5. **Every theme.** The number on the soft pill passes 4.5:1 in all six themes, over the top bar's background and the sidebar's surface (`colors.test.ts`).
6. **Static.** Nothing moves (human: "No motion yet").
7. The usual checks and CI pass.

## Out of scope
- Motion for the ranks (14c, L8).
- Real avatars (L37's own ticket).
- 14c's game world, where pixel art has the room it needs.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Ranks from 0, 1, 5, 15, 30, 90 days | The rank | L26 (1–4, 5–14, 15–29, 30+), human, 2026-10-24; 90: human, 2026-10-26 ("sakura blossom (3 months)", "90 days (Recommended)") |
| The pill: Baloo 2 800 at 18px; padding 2px 10px 2px 6px; fully round; the soft colour; a 22px flower, 4px from the number | The pill | Round 7 (`.streak`) |
| The top bar's right side: the pill and the 44px gear, 6px apart | The phone's top bar | Round 7 (`.me`) |
| The sidebar: the 30px slot and the pill, 10px apart, padding 16px 12px 20px (20px above, 24px below, with its 4px gap) | The sidebar | Round 7, board 3 |
| `/streak`: spacing as Me's (16px between parts, cards 8px apart with 14px padding, 1px line border, 14px corners, 10px inside), the heading 26px, names 18px, days 14px; the player's rank a 3px border in the text colour | `/streak` | Round 7's Me, as `me.module.css` has it; the 3px border as the chosen theme's (L47, `settings.module.css`) |
| Each flower 96px on `/streak`, 128px from 768px | `/streak` | Human, 2026-10-26: "32×32, 3× phones / 4× desktop (Recommended)" (32 × 3, 32 × 4) |
| The drawings' shapes and colours | The flowers | The human's approved preview (question 8), copied into `src/app/ranks.tsx` |

## Plan
1. `src/app/ranks.tsx`: the six ranks (name, first day, drawing) and the rank for a streak; a unit test at each boundary.
2. `GET /api/profile` adds the streak; `/api/run` and the run state drop it; Today's line goes.
3. The shell: the pill in the top bar and the sidebar, the sidebar's avatar slot; Home reloads the profile when the game screen's Start begins a run.
4. `/streak`: a page through Home, like Me.
5. Tests: the rank boundaries, `colors.test.ts` over the top bar's background, an e2e at 360px and 1440px; the e2e files that read Today's streak line or the nav's links follow the change.

## Removes
- Today's "Streak: N days played in a row" line (`Streak` in `src/app/game.tsx`).
- The streak in the run state (`RunState.streak`, `buildState`'s argument and its `getStreak` call) and in `/api/run`'s no-puzzle answer, so the streak has one read (`GET /api/profile`).
- The "Open for the build session" notes in `M14-14b-2-sprout-admin-polish.md`, now answered here.

---

## Source diff
| Source says | We built | Why different |
|---|---|---|
| 14b-2's plan and round 3: a sprout growing in four stages, an empty pot at 0 | Six ranks, each a different flower, a seed at 0, and `/streak` | The human, in this ticket's guided questions (5–8): "different mature plants/flowers for each tier … (we can treat them like \"Ranks\")", "document that somewhere on the site", the flowers picked from a gallery |
| Question 3–4: pixel art, 11×11 then 16×16 at 2px, made with pixelkit (later PixelLab, snapped by pixelkit) | Vector SVG drawings at round 7's 22px | Pixel art couldn't hold a flower at the pill's size (question 7, the human: "they all look pretty bad and not accurate"); the human chose vector ("if svg dont look good then we try other symbols pixel art", then "vector flowers"). pixelkit checked every pixel attempt; nothing pixel shipped |
| Question 6: "Two sizes per rank", 32×32 at 3× and 4× | One drawing per rank, at 22px in the pill and 96px (128px from 768px) on `/streak` | A vector drawing has no native size, so one drawing serves both; the page's sizes are the 32×32's at 3× and 4× |
| Question 4: "pixelkit .txt grids → SVG" | JSX shapes in `src/app/ranks.tsx`, no grids | Vector, above |
| The locked pixel palette (question 5–6) | The vector drawings also use #3a55b8, #4a6ad6, #86a2f5, #c7d4fb and #d6d0e4 | They are in the drawings the human approved as previewed (question 8) |
| Round 7's pill: a `<span>` | A link to `/streak` | The human: "Own page, pill links to it (Recommended)" |
| Round 7: "4 day streak" for screen readers | "4 day streak, Daisy" | The human: "The plant's name (Recommended)" |
| Round 7, board 3: padding 16px 12px 20px round the slot and pill | Padding 0 12px 4px | The sidebar (14a-1) already spaces its children 20px apart, so the same 20px above and 24px below come from its gap |
| `/streak` has no mockup | Me's spacing and cards, the chosen theme's 3px border for the player's rank | Nothing new to approve: Plor's existing values (Numbers) |

## Evidence
On the Windows checkout, 2026-10-26, at `d56e9de` plus the shell e2e fix below; the local stack shared with the M13 session, which held off while these ran.
- **Criterion 1 (the pill)** and **3 (`/streak`)**: `npx playwright test e2e/shell.e2e.ts e2e/streak.e2e.ts e2e/live-board.e2e.ts`: `15 passed (1.6m)`, among them `streak.e2e.ts:38 › a phone's top bar shows the streak's rank beside the gear, and it grows when a run starts` (360px: the pill between the wordmark and the gear, named "0 day streak, Seed", opening `/streak` with its six ranks, days and the player's marked) and `streak.e2e.ts:78 › from 768px the sidebar shows the avatar slot and the streak's pill under the wordmark` (1440px). `shell.e2e.ts:178` walks the sidebar with Tab: the pill first, with the 3px accent focus ring.
- **Criterion 2 (the ranks)**: `npx vitest run src/app/ranks.test.ts`: `Tests 12 passed (12)`, each boundary 0/1/4/5/14/15/29/30/89/90 and the days /streak lists; and in `streak.e2e.ts:38`, Start on the game screen turns the pill to "1 day streak, Daisy" with no reload.
- **Criterion 4 (Today's line goes)**: `streak.e2e.ts:38` finds no "played in a row"; `live-board.e2e.ts` now reads the streak from the pill ("1 day streak, Daisy"); `src/game/runs.db.test.ts` checks the run state without a streak (`npm run test:db` below).
- **Criterion 5 (every theme)**: `npx vitest run src/app/colors.test.ts`: `Tests 108 passed (108)`, with "text on the soft pill over the background is at least 4.5:1" in Paper, Night, Sky, Moonlit and Ink (the device follows Paper or Night).
- **Criterion 6 (static)**: no `animation` or `transition` in `ranks.module.css`, `streak.module.css` or the pill's rules.
- **Criterion 7 (the checks)**:
  - `npx tsc --noEmit -p .`: no output; `npm run lint`: no output; `npm run build`: `○ /streak` among the routes, exit 0.
  - `npm test`: `Test Files 40 passed (40)`, `Tests 347 passed (347)`.
  - `npm run test:db`: `Test Files 40 passed (40)`, `Tests 260 passed (260)` (the profile route now returns `streak: 0` for a new player).
  - `npx supabase test db`: `Files=21, Tests=345`, 3 failed, all in `answer_base.test.sql` (1, 2, 12: `have: {... "numbers": 0}`, `want` without `numbers`). The shared local database has three M13 migrations not on this branch (`20261026050238_subsets.sql` and the two after it), which add `numbers` to `private.import_source`'s result. This change touches no SQL; CI, on a fresh stack of this branch's migrations, is the check.
  - `npx playwright test` (the full suite): `40 passed`, `1 failed`: `shell.e2e.ts:178`, whose Tab walk met the sidebar's new pill first. Its expected list now starts with the pill from 768px, and the three touched files passed after (`15 passed`, above).

## Review
By the `reviewer` agent on `ae4eda1` (fresh context, no edits).
- **Blocking, fixed:**
  1. ROADMAP's row and the handoff weren't updated: both updated in this PR.
  2. Reloading the profile after Start used Home's load error, which replaces the page, so a failed reload would have taken the game screen away mid-question: the reload has its own alert beside the page (`reloadStreak`, `src/app/home.tsx`).
  3. The sidebar's padding differed from round 7 and the Source diff was empty: now 20px above and 24px below as round 7, and the Source diff filled.
  4. `/streak`'s grid minimums (140px, 176px) had no origin: the cards now wrap at their own width, spaced with Me's values (Numbers).
- **Deferred to ROADMAP "Next revision" (For M14):** a fourth copy of the visually-hidden rule (`shell.module.css .hidden`); the e2e doesn't check each rank's flower is drawn; the e2e's last step reloads `/streak`, adding nothing to the no-reload check before it.
- **Checked and fine (the reviewer):** the Removes are complete; every number traces; the pill's name; target size; 1.4.1 on `/streak`; the shell e2e's narrowing to the tabs' list.
