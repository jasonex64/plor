# M14 14b-19 — Controls, layout jumps, lost taps and stale state

**Status:** approved (human, 2026-10-31: "Approve, build it", to "Build 14b-19 as drafted, with names cut from 20em wide?"), in review (PR not opened yet). It was drafted from four rounds of guided questions and a sheet of candidates on the real Friends page (2026-10-31). It's the second of 14b-18's two player-screen PRs (14b-18, answer 13), and closes the four groups of 14b-18's answer 12. **It doesn't finish M14:** For M14 still holds about 20 items a player can see or hear that neither PR's groups covered. They include screen readers (skeletons, the Undo toast, the timer's name, the reactions' group name, focus after Delete or Report) and behaviour (a whitespace comment failing 5 s later, signing out with an Undo pending, Find a player's "Al"/"Alice", the result's scroll jump, the settings sheet's edge cases, Safari's invite share). My estimate of "about 20 items" in 14b-18's first question counted only the groups offered then. So whether M14 waits for these is the human's call (14b-18, answer 1).

## Goal
Controls look like what they are (disabled, pressed, dangerous), nothing on the game screen or a board jumps, nothing the player typed or tapped is lost, and the streak and Me stay current without a reload.

## Who uses it / what breaks without it
- Used by: every player, on Today, the game screen, Friends, Me and the reading pages.
- Breaks without it (ROADMAP For M14; the 14b-6 critique and reviews of 14b-6, 14b-8, 14b-14 and 14b-17):
  - **Disabled buttons:** they keep the ink border and drop shadow, and a disabled accent button stays blue. Create group, Answer and Approve day look pressable while they aren't.
  - **Dark-theme danger:** the red is a near-twin of the "caught" pink, so the strike through a stolen letter barely shows on its pink tile.
  - **Comment box and pickers:** they keep the browser's 13.33px, and iOS zooms into a field under 16px.
  - **Continue:** opening the game on a run already going flashes the stats and feed cards, then hides them.
  - **The countdown:** the question re-wraps once, at 10 → 9.
  - **Board rows:** on a 390px phone a long name with "(you)" pushes the points to a second line.
  - **Privacy's lists:** their items end on lone words.
  - **Start:** a comment being typed in the feed is lost.
  - **Mid-slide taps:** a tab tapped during a 200ms slide is lost.
  - **The streak:** a tab left open past midnight shows yesterday's.
  - **Me:** after a time-up away from the game, its calendar and totals stay old.

## What the human decided (2026-10-31, on the Windows PC, quoted)
Carried from 14b-18 (`docs/milestones/M14-14b-18-headings-today-invites-words.md`):
- **Answer 12:** all four groups of small fixes.
- **Answer 15:** "Screenshots, you pick" ("I show 2 or 3 candidates for each on the real screens and you choose, as with 14b-15. No colour gets invented").
- **Answer 16:** "At the daily reset" ("Reload the profile at midnight Pacific, when the day turns (the board already listens for this). Always right; one more listener.").

Round 1:

1. A tab tapped mid-slide: "Let taps through" ("Taps on the tab bar work even mid-slide; the bar stays pinned. Nothing is lost; a little extra code around the slide."). Replaced by answer 5.
2. The draft across Start: "Keep it, hidden" ("The feed stays loaded but hidden during the run; your draft and the day you were viewing are there when it ends. Slightly more memory during a run.").
3. Continue: "A skeleton of the question" ("A placeholder shaped like the question card until the run loads; no cards that vanish. Calm, matches the other loading states.").
4. A board row: "Cut the name with …" ("The name shortens with an ellipsis so the points stay on the row. Tidy; the full name is on the person's other rows."). Narrowed by answer 9.

Round 2 (answer 1 collided with the source: Next.js says "Hit-testing still skips named participants (like the anchored header) for the transition's duration"):

5. "Catch the tap ourselves" ("During the 200ms slide, a tap where a tab sits opens that tab anyway (our own code watches for it). Nothing is lost, but it's a workaround the guide doesn't describe, so more to maintain and test.").

Round 3, from the candidates sheet (each candidate on the real Friends page in Paper and Night):

6. Disabled buttons: "B: Flat, grey edge" ("No shadow, grey border, muted text, white fill. Clearly off, still a button shape.").
7. Your own reaction, pressed in the ⋯ menu: "C: Solid accent fill" ("The strongest: an accent square behind your emoji. Unmistakable, a bit loud for a small menu.").
8. The dark themes' danger red: "B: Deeper red #ff5c5c" ("A truer red, further from the pink; 4.75:1 or better on every dark background.").

Round 4:

9. Big text: "Cut at normal size only" ("At normal size the name cuts with …; once text is big enough to need it, the points drop under the full name as 14b-17 does. Nothing is ever hidden from someone who needs big text.").

## Source
- **WCAG 2.2** (SOURCES.md):
  - 1.4.3 Contrast (Minimum): `#ff5c5c` text on every dark background, 4.75:1 at the least (Moonlit's `#2a273f`), computed with WCAG's formula.
  - 1.4.4 Resize Text: answer 9.
  - 1.4.11 Non-text Contrast: the pressed reaction, the disabled edge.
- **Next.js view transitions guide** (bundled, `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`, "Keeping the page interactive"): `::view-transition { pointer-events: none }` is already in `globals.css`. Named participants still skip hit-testing, which is why answer 5's own handling is needed.
- **MDN View Transition API** (SOURCES.md): `document.startViewTransition`, a transition's `finished` promise.
- **MDN CSS `text-wrap`** (SOURCES.md): `pretty` for Privacy's list items.
- **The 20-second question** (`supabase/migrations/20261028140000_baseline.sql:924-927`, "The one place the 20 seconds lives"): the countdown is never more than two digits.
- **DESIGN.md:** the kit's buttons and shadows, the reactions' popover, the board's rows, the colour slots per theme.

## Acceptance criteria
- [ ] **Disabled buttons (answer 6):** every disabled button, the accent and small kinds included, has no shadow, a `--edge` border, a `--surface` fill and `--muted` text, in every theme. A disabled accent button is no longer blue, and the state no longer depends on load order (ROADMAP's tie between `:is(button, a).primary` and `button:disabled`).
- [ ] **Pressed reaction (answer 7):** in the ⋯ menu, your own reaction has an `--accent` fill and no inset edge, in every theme, and still carries `aria-pressed="true"`.
- [ ] **Danger red (answer 8):** `--danger` is `#ff5c5c` in Night, Moonlit, Ink and device-dark. Paper and Sky are unchanged.
- [ ] **16px fields:** the comment box, the pickers (`select`) and every `textarea` compute 16px at the default text size, and follow the browser's text size.
- [ ] **Continue (answer 3):** opening the game screen on a run in progress shows a skeleton of the question until the run loads. The stats and feed cards never show during it.
- [ ] **The countdown:** the number holds the width of two digits, so the prompt keeps its lines from 20 to 1.
- [ ] **Board rows (answers 4, 9):**
  - At the default text size on a 390px phone, a long name with "(you)" is cut with "…" and the points stay on its row.
  - At 200% text the full name shows and the points drop under it, as 14b-17 built.
- [ ] **Privacy:** its list items avoid a lone last word (`text-wrap: pretty`).
- [ ] **The draft across Start (answer 2):** a comment typed in the game screen's feed, then Start, then the run's end: the draft and the day shown are still there.
- [ ] **Mid-slide taps (answer 5):** a tab tapped while a slide runs opens that tab once the slide ends. A tap elsewhere during a slide does nothing new.
- [ ] **The streak (answer 16):** with a tab left open, the streak pill reloads at midnight Pacific, from the server's time to the reset.
- [ ] **Me:** after a time-up away from the game screen, Me's calendar and totals reload.
- [ ] **Checks:**
  - The e2e files these touch pass.
  - Impeccable's detector finds nothing new on Today, the game screen, Friends, Me and Privacy at 390×844 and 1440×900.
  - DESIGN.md describes the disabled and pressed states, the danger colour and the cut names.
  - The `reviewer` agent has reviewed the diff.

## Out of scope
- **Admin, test and data items** in For M14 (14b-18, answer 1).
- **The tab bar's pinning:** it stays, and answer 5 works with it.
- **New colours** beyond the three picked.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| No shadow, `--edge` border, `--surface` fill, `--muted` text | Disabled buttons | Answer 6 (candidate B) |
| `--accent` fill, no inset edge | Your pressed reaction | Answer 7 (candidate C) |
| `#ff5c5c` | `--danger` in the dark themes | Answer 8 (candidate B); its contrast from WCAG's formula |
| 16px (1rem) | Fields' text | `globals.css`'s inputs ("so iOS doesn't zoom into them") |
| Two digits' width (`2ch` with tabular digits) | The countdown | The 20-second question (migration above) |
| From a viewport 20em wide | Where a board name is cut | Approved with the ticket ("with names cut from 20em wide?"): 320px, the narrowest width the site is checked at (14b-3, criterion 7), at the default 16px. At 200% a 390px phone is 12.2em wide, so the name isn't cut there (answer 9) |
| 200ms | The slide a tap is caught in | Unchanged (DESIGN.md, Motion) |
| Midnight Pacific | The streak's reload | Answer 16; the server's time to the reset |

## Plan
1. **Red first:** an e2e (`e2e/controls-and-state.e2e.ts`) for each criterion. Expected: each fails on the code as it is. If one passes, the item was already fixed, and I'll say so instead of building it.
2. **Disabled, pressed, danger:**
   - One `button:disabled` rule in `globals.css` that wins over the kit's kinds.
   - `.pick[aria-pressed="true"]`'s fill.
   - `--danger` in the four dark blocks.
3. **Fields:** `textarea` and `select` at 1rem beside the inputs' rule.
4. **Continue:** `offbeat.tsx` shows the question's skeleton until the run is known, not the cards.
5. **Countdown:** `.clock`'s two-digit `min-width`, right-aligned.
6. **Board rows:** under a 20em media query, `.entry .name` cuts with `text-overflow: ellipsis`; below it, 14b-17's wrap.
7. **Privacy:** `.reading li { text-wrap: pretty }`.
8. **Draft:** `Comments` stays mounted and hidden during the run.
9. **Mid-slide taps.** Hypothesis: while a slide's transition runs, a click lands on the live page under the overlay (`pointer-events: none`) but not on the named tab bar, so a document-level click listener can match its point against the tabs' rectangles and open that tab once `finished` settles. Expected: an e2e tap during a slide reaches the tab. Disproved if the click never reaches the document during a transition; then I stop and ask.
10. **Streak:** the frame reads the time to the reset, as the feed column does from `/api/run`, and reloads the profile then.
11. **Me:** `MeStats` reloads on the frame's `timeUps`.
12. **Check:** the touched e2e files (`alive.e2e.ts` included this time), the detector, screenshots, DESIGN.md, the `reviewer` agent, ROADMAP and HANDOFF.

## Removes
- The disabled buttons' shadow and the disabled accent fill.
- The tie that made the disabled look depend on load order.
- The pressed reaction's inset edge.
- The dark themes' `#ff8a8a`.
- The browser's 13.33px in fields.
- The Continue flash.
- The 10 → 9 re-wrap.
- The lost draft and the lost mid-slide tap.
- The ROADMAP For M14 items each criterion closes.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| The comment box and pickers at 16px (ROADMAP's 14b-6d item) | One `textarea, select` rule at 1rem in `globals.css`; the comment box's and the board picker's own 1rem removed | Those two were already 16px (14b-17 converted their sizes), so the red run first passed; a bare field still got the browser's 13.33px (Insights' day picker is one). The test now checks a bare `textarea` and `select` too |
| Continue shows a skeleton of the question (answer 3) | The question's skeleton when the page is opened by Continue, Play with Skip the game screen or Start climbing; the banner's when opened from its address. Either way, no cards until the day is known | Until the run loads, the page itself can't know a run is in play; the three ways in do, and say so (`game.tsx`, `toPlay`) |
| A tab tapped mid-slide opens once the slide ends (criterion) | It opens at once: the tap starts the tab's navigation, which replaces the slide | Next.js runs the new navigation; nothing waits on `finished`. The e2e lands on the tab |
| The tap is caught while a slide runs (answer 5) | `:active-view-transition` on the root says a slide is running | MDN's page for it, added to SOURCES.md's MDN View Transition API row. A browser without it loses the tap as before (Baseline 2025) |
| The frame reads the time to the reset as the feed column does, from `/api/run` (Plan 10) | `/api/profile` returns `msToReset` beside the streak | One request, the one the streak already comes from; no second read of the run on every page |
| Disabled buttons: `button:disabled` | `:root button:disabled` | The kit's kinds (`:is(button, a).primary`, `.small`, `button.link`) tied with `button:disabled`, so the look depended on load order; `:root` lifts it over them |

## Evidence
All on the Windows PC against the local stack, `next dev` on :3000, 2026-10-31 and 2026-11-01.

- **Red first** (`npx playwright test e2e/controls-and-state.e2e.ts` on the unchanged code): 10 failed, 2 passed.
  - **Disabled:** `- Expected - 3` (shadow, edge, fill).
  - **Danger:** `Expected: "rgb(255, 92, 92)" Received: "rgb(255, 138, 138)"`.
  - **Pressed reaction:** the fill and edge differ.
  - **Continue:** "Loading your question" not found.
  - **The countdown:** `Received: 9.25` px narrower at one digit.
  - **The board row:** not cut.
  - **Privacy:** `Received: "auto"`.
  - **The feed's day:** lost across Start.
  - **The mid-slide tap:** `Received string: ".../streak"`.
  - **Me after a time-up:** `Received: 0` reads.
- **The two first passes:**
  - The 16px test passed because the comment box and the picker were already 16px; with a bare `textarea` and `select` added, it failed (`- Expected - 2`).
  - The streak test counted the dev server's double load; requiring a read 0.9 s after the faked reset, it failed (`Received: 0`).
- **Green:** `controls-and-state.e2e.ts`, 12 passed.
  - **The board row:** the 390px screenshot then showed "0 points" broken over two lines beside the cut name. The points were made not to shrink, and the test now checks they're on one line.
  - **The mid-slide tap:** it passing confirmed Plan 9's hypothesis.
- **The full suite, first run** (`npx playwright test`): 116 passed, 4 failed.
  - **`offbeat.e2e.ts`:** the stats loaded after the run's state, against 14a-2c's criterion 3. The cards now stay mounted and hidden instead of waiting.
  - **`calm.e2e.ts`:** Insights at 1440px has only disabled buttons, so the check's own `pressable > 0` failed. That check is fixed in its own commit: disabled buttons count as measured, and as strays if shadowed.
  - **`alive.e2e.ts` and the Continue test:** timeouts under load; both passed alone (`20 passed (2.0m)`, with offbeat).
- **The full suite, again:** 119 passed, 1 failed.
  - `look.e2e.ts`'s board chip, in a run that crossed midnight Pacific. It passed alone twice (`2 passed (9.7s)`).
  - No fixture day was left behind.
- **Unit and database tests:**
  - `npm test`: `Test Files 49 passed (49)`, `Tests 494 passed (494)`.
  - `npm run test:db`: the profile route's two exact-shape checks failed on the new `msToReset`. They now expect it (a positive number), and the file gives `12 passed`.
- **Impeccable's detector** (`impeccable detect --cdp 9335`, signed in after a run, with a 24-letter display name): 0 findings on `/`, `/updraft`, `/friends`, `/me` and `/privacy`, at 390×844 and at 1440×900.
- **After the review's fixes:**
  - The full suite gave `122 passed`, 2 failed. My setting-saved test's fake answered 0 once the reset passed, so the page read in a loop until the test ended; it now answers the next day's reset. `shell.e2e.ts`'s clock-bar time-up passed alone (`1 passed`).
  - `controls-and-state.e2e.ts`: `16 passed (49.8s)`.
  - `npm test`: 494 passed.
  - The profile route's db test: 12 passed.
  - `tsc` and `eslint --max-warnings 0`: clean.
- **Candidates sheet:** each look on the real Friends page in Paper and Night, before the build (answers 6 to 8).

## Review
- **Reviewer** (`reviewer` agent, fresh context, 2026-11-01): six blocking findings, all fixed here.
  1. **The streak's reset timer** restarted for the full old delay whenever the profile object changed (a setting saved), so it could fire hours after midnight. It now counts to a moment fixed when each profile is read (`home.tsx`, `resetAt`). An e2e saves a setting 1.5 s before a 3 s reset and expects the read before 4 s.
  2. **A keyboard click during a slide** (no count, at 0, 0) was sent to `/streak`: the sidebar's pill, hidden on phones, has an empty box there. Now only a real press on a shown link counts, and not a modified click or one in a dialog or popover. An e2e dispatches such a click during a slide. With the two guards removed it went to `.../streak`; with them it stays.
  3. **The feed's column at 1200px and up** went while the run loaded and came back, moving the page. The screen now starts from what the way in expects (`src/app/to-play.ts`) instead of "unknown". An e2e watches `body[data-column]` from Play to the game screen and sees it never go.
  4. **The clock bar's Back** opened a run in play on the banner's skeleton. It now says so too. An e2e loads `/friends` from its address, presses Back and sees "Loading your question".
  5. **Your own reaction** lost its fill under the pointer, where the hover tint outranked it. It keeps it now, and the e2e hovers it.
  6. **Scraps:** an unused constant in the e2e, and HANDOFF's wording. Both fixed.
- **Non-blocking**, recorded in ROADMAP For M14:
  - **Fixed here:**
    - modified clicks;
    - `share.module.css`'s third 1rem;
    - this ticket's Numbers row for the approved 20em.
  - **Deferred:**
    - the draft e2e checks the day shown, not a typed draft;
    - the 200% board-row check is weak;
    - the Me e2e counts reads;
    - browser zoom still cuts names;
    - `toPlay` can be left set;
    - timers pause in sleep;
    - `look.e2e.ts`'s chip across midnight.
- **Confirmed by the reviewer:**
  - `calm.e2e.ts`'s change is a correct fix, stricter than before.
  - The contrast figures are right.
  - 14a-2c criterion 3 holds.
  - TestScreen is unaffected.
  - The DESIGN.md citations it spot-checked are right.
