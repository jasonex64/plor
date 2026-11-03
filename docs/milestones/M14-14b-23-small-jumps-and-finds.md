# M14 14b-23 — Small jumps and finds

**Status:** approved (human, 2026-11-02: "Approve, build it", to "Build 14b-23 as drafted?"), built and reviewed, in review (PR not opened yet). It was drafted from two rounds of guided questions (2026-11-02, Pacific). It's the last of the four groups M14 waits for (14b-20, answers 1, 2 and 4); 14c-2 follows it.

## Goal
Nothing on the page moves by itself, and nothing a player looks for is out of reach:
- the result scrolls into view only when Result is tapped;
- Undo puts focus back without scrolling;
- a time-up reloads only the board;
- Find a player still lists Alice after "Al";
- the board's rows are easy to tap;
- your run's reactions read once.

## Who uses it / what breaks without it
- **Used by:** every player who finishes a run, looks at the Friends tab or a friend's line on the graph, or taps Undo.
- **Breaks without it** (ROADMAP For M14, from the reviews of 14b-2c-1, 14b-13, 14b-14 and 14b-21, and the 2026-10-29 audit):
  - **The result jump:** the game page scrolls to the result whenever the address ends in `#result`, including each time a hidden game page is shown again, so it can jump back to the result unasked (`src/app/game.tsx:568-573`).
  - **The Friends tab at a time-up:** the whole tab is keyed to the time-ups (`src/app/home.tsx:612`). The friends list, the leaderboard and the invite link remount and fetch again, and on a phone the board's live socket closes and reopens. Only the board changes.
  - **Find a player:** a name typed in full is picked at once and the list empties, so with friends "Al" and "Alice", typing "Al" can't reach Alice from the list (`src/app/find-player.tsx:39-46`).
  - **The board's rows:** "Where everyone ended"'s rows open by their `<summary>`, which is 25px tall on phones, under the 44px DESIGN.md gives controls.
  - **Undo's focus:** `.focus()` scrolls (`src/app/undo.tsx:52-53`), so when the place you were is gone, the main heading's fallback jumps the page to the top.
  - **Your run's line, read aloud:** a screen reader says "Reactions on your run: Reactions, 😂 1", because the visible label and the group's name both say Reactions (`src/app/board.tsx:128`, `src/app/reactions.tsx:23`).
  - **Your run's line, its look:** it took the friends' rows' summary look in 14b-13, where 14b-13's ticket says it "stays as it is". The ticket is what's wrong.

## What the human decided (2026-11-02, on the Windows PC, quoted)
Round 1:

1. Scope: "All seven (Recommended)" ("The five plus the two later ones. Both touch the same places (the run's line, page jumps), so they're cheap now. A slightly bigger PR.").
2. The result jump: "Only when Result is tapped (Recommended)" ("Tapping Result (the banner's or the clock bar's) scrolls to it once, then #result leaves the address. Coming back later leaves the page where you were.").
3. Find a player: "Pick Al, keep listing (Recommended)" ("\"Al\" is picked as now, and the list still offers Al and Alice. One tap to switch, nothing extra for the common case.").
4. The board's rows: "44px rows (Recommended)" ("Each row grows to 44px, like the buttons. Easy to tap; the board gets about 19px taller per row.").

Round 2:

5. Your run's line, its look: "Keep the summary look (Recommended)" ("Same as friends' rows, so reactions look the same everywhere on the board. The ticket's wording gets corrected; no code change to the look.").
6. Read aloud: "\"Reactions on your run, 😂 1\" (Recommended)" ("The visible label names the group, so it's said once. Friends' rows keep \"Reactions, 😂 1\".").
7. A time-up: "The board alone (Recommended)" ("The board reloads to show how runs ended. The leaderboard, friends list and invite link stay as they are: no flash, fewer fetches.").
8. Undo's focus: "Move focus, don't scroll (Recommended)" ("The page stays where you were and focus moves quietly. A screen reader still lands in the right place. The keyboard may still rise on iPhone (unverified).").

## Source
- **Next.js, the native History API** (SOURCES.md, Next.js; the bundled `01-app/01-getting-started/04-linking-and-navigating.md`, "Native History API"): `window.history.replaceState` "integrate[s] into the Next.js Router". That's how `#result` leaves the address (answer 2).
- **WAI-ARIA APG Combobox pattern** (SOURCES.md, M14 14b-14): list autocomplete with automatic selection. The list shows the suggestions that match what's typed; nothing in the pattern empties it on an exact match (answer 3).
- **WCAG 2.2** (SOURCES.md, M14 L10), 2.5.8 target size; and DESIGN.md's 44px controls (`docs/DESIGN.md:38-39`) (answer 4).
- **WAI-ARIA APG Disclosure pattern** (SOURCES.md, M14 14b-13): the rows are native `<details>`.
- **MDN `HTMLElement.focus()`** (SOURCES.md, M14 14b-23, added with the approval): by default focusing scrolls the element into view, and `preventScroll: true` stops it (answer 8). Chrome Android is listed as not supporting the option, so there focus still scrolls, as before.
- **14b-13's ticket** (`docs/milestones/M14-14b-13-reactions-menu.md:71`), corrected here (answer 5); **14b-21's** group names (`docs/milestones/M14-14b-21-screen-readers.md`).

## Acceptance criteria
- [x] **The result (answer 2):**
  - Tapping Result, the banner's or the clock bar's, brings the result into view once the run has loaded, and `#result` then leaves the address.
  - Hiding the game page and showing it again, after scrolling away, leaves the scroll where it was.
- [x] **A time-up (answer 7):** only the board fetches again. The leaderboard, the friends list and the invite link make no new request, and keep their nodes.
- [x] **Find a player (answer 3):**
  - With friends "Al" and "Alice", typing "Al" picks Al and lists Al and Alice.
  - Down then Enter, or a tap, takes Alice.
- [x] **The board's rows (answer 4):** every "Where everyone ended" row's `<summary>` is at least 44px tall, at 390px and at 1440px.
- [x] **Undo (answer 8):** when the place you were is gone, Undo moves focus to the main heading and the page doesn't scroll. When it's still there, focus goes to it, with no scroll either.
- [x] **Your run's line (answers 5 and 6):**
  - Its accessible text is "Reactions on your run", then the counts, with "Reactions" said once.
  - Friends' rows still read "Reactions, 😂 1".
  - Its look is unchanged.
  - 14b-13's ticket says the line took the summary's look.
- [x] **Checks:**
  - The e2e files these touch pass.
  - DESIGN.md describes the result's jump, the 44px rows and the run's line.
  - The `reviewer` agent has reviewed the diff.

## Out of scope
- **The iPhone keyboard rising when Undo refocuses the comment box** (answer 8's "unverified"). It stays in ROADMAP until it's seen.
- **The admin sub-tabs' 40px** (the 44px item): admin pages aren't player-facing.
- **14c-2, the game's world:** next, from its own questions.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 44px | The board rows' `<summary>` height | DESIGN.md's control height (`docs/DESIGN.md:38-39`; 14b-10a); answer 4 |
| 8px | Under an open row's list | The row's own 8px padding (`kit.module.css`, `.row`), moved: not a new value |

## Plan
1. **Red first:** a new `e2e/jumps-and-finds.e2e.ts`, with its players' names under a new prefix that `players.test.ts` checks, gets one test per criterion, run against the unchanged code.
   - **Expected:** each test fails for its reason:
     - the scroll comes back to the result;
     - the leaderboard and friends list fetch again;
     - no Alice in the list;
     - a 25px summary;
     - `scrollY` changes after Undo;
     - "Reactions" said twice.
   - **What would prove it wrong:** a test that passes, meaning the item is already fixed or the test misses it.
2. **The result:** `Result`'s effect scrolls to the result when the address says `#result`, then takes the hash out with `history.replaceState`. A hidden page shown again finds no hash. A tap on Result while it's already drawn gets the same handling.
3. **A time-up:** `Friends`' fragment keys on the day alone, and the board takes `${day}-${timeUps}`, as Today's board already does (`src/app/home.tsx:530`).
4. **Find a player:** `matches` no longer drops when the text equals the picked name, only once a pick has been taken from the list (or by Enter) and the field hasn't changed since. `type` still picks an exact name.
5. **The board's rows:** the rows' `<summary>` gets `min-height: 44px`, laid out to centre its text.
6. **Undo:** `focus({ preventScroll: true })`, both places, once the MDN row is added.
7. **Your run's line:** `Reactions` takes the group's name from its caller: friends' rows keep "Reactions"; your line's group is named by its visible label, so the label is read once.
8. **Docs:**
   - DESIGN.md;
   - 14b-13's ticket line 71;
   - the ROADMAP items, marked fixed;
   - the M14 row: M14's player-facing work is done, and 14c-2 is next;
   - HANDOFF.

## Removes
- The whole-tab key on `Friends`' time-ups (now the board's alone).
- The `text !== pickedName` rule that empties Find a player's list.
- The leftover `#result` in the address after the jump.
- The doubled "Reactions" on your run's line.
- 14b-13's wrong "stays as it is".

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Answer 4: rows grow to 44px, "about 19px taller per row" (the draft's estimate) | The summary is the whole row, 44px for one line, with the row's own 8px padding moved into it; a row grows about 3px (44px + its border), and the whole row is the tap target | The same 44px target for less height; the 19px was the draft's estimate of `min-height` on the summary alone (the reviewer: no need to ask) |
| Plan 5: `min-height: 44px`, laid out to centre the text | `padding-block: calc((44px - 1lh) / 2)` | `display: flex` would drop the `<summary>`'s ▶ marker in Chrome; the padding keeps it and centres one line |
| Plan 1: one new e2e file | `e2e/jumps-and-finds.e2e.ts` for the result and the time-up; Find a player, the rows, the run's line and Undo in `leaderboard-graph`, `live-board` and `screen-readers`, which already build those scenes | No second copy of each scene's setup |
| Plan 1: a faked clock, as `shell.e2e.ts` uses | The two time-up tests wait out the real 20 seconds | A faked 21 s showed "Stop 1 · 15s left" (the server reads the real clock): the time-up flake in ROADMAP |
| Plan 2: "a tap on Result while it's already drawn gets the same handling" | The game screen's own Result scrolls to the drawn result and stops the link adding `#result` (`Score`'s `toDrawn`) | Found missing in review: a same-page link adds the hash without remounting `Result` |
| `today.e2e.ts` expected `/updraft#result` after Today's Result (14a-2a) | It expects the result in view, then `/updraft` | Answer 2: `#result` leaves the address once the result is in view |
| Plan 7: the group named by its visible label | The group's `aria-label` is "Reactions on your run"; the visible label is `aria-hidden` | Read once (answer 6); WCAG 2.5.3 holds, as the name is the visible text |

## Evidence
All on the Windows PC against the local stack, 2026-11-02 (Pacific).

- **Red first:** on the unchanged code, each new check failed for its reason:
  - the result test: `Received string: "http://localhost:3000/updraft#result"`;
  - the time-up test: `/api/leaderboard` and `/api/friends` asked again (`+ Received + 6`), and with the time-up confirmed first, `data-kept` gone from both parts;
  - Find a player: `+ Array []`, no options after "Be";
  - the board's rows: `Expected: >= 44, Received: 25`;
  - Undo's fallback: `Expected: 469, Received: 0`.
- **Red without each fix, after the review:**
  - with the run's-line fix taken out, the aria snapshot failed (`- Expected - 1, + Received + 2`);
  - without `toDrawn`, the game screen's own Result left `/updraft#result`;
  - without `preventScroll` on a place still there, Undo scrolled (`Expected: 0, Received: 486`);
  - without `toDrawn`'s visibility check, Today's Result did nothing (`viewport ratio 0`).
- **One hypothesis disproved:** the time-up test first passed on the unchanged code. The board's request had come before the time-up. Waiting for "Dozed off at stop 1" first made it fail every time (`2 failed` of 2).
- **A faked clock:** it showed "Stop 1 · 15s left" after 21 s, so the two time-up tests wait out the real 20 s (Source diff).
- **Green:** the touched files gave `31 passed` and 3 failed:
  - Undo's bottom scroll, clamped by the shorter feed; fixed in the test;
  - two `shell.e2e.ts` sidebar tests, which then gave `6 passed` alone.
- **The full suite,** after the review's fixes: `144 passed (31.8m)`, 4 failed.
  - **`today.e2e.ts`'s Result was a real bug:** a game screen visited before stays in the document, hidden, so `toDrawn` cancelled Today's link. It's fixed with `checkVisibility()`, and the test fails without it.
  - **The other three** were clicks that didn't navigate, or a board slow to load, under a run twice as slow as usual: `account.e2e.ts`'s Me, `shell.e2e.ts`'s Play, and `me.e2e.ts`'s board.
  - **Re-run alone,** the four failures and the result test gave `5 passed (1.3m)`.
- **Unit tests:** `npm test` gave `Tests 504 passed (504)`. `players.test.ts` passes, with "zr" and "zt" passed straight to `signInAndPick`.
- **Types and lint:** `tsc` and `eslint . --max-warnings 0`, clean.

## Review
- **Reviewer** (`reviewer` agent, fresh context, medium effort): four blocking findings, all fixed.
  - **Player names "ya" and "yb"** were already `settings-sheet.e2e.ts`'s, and `players.test.ts` couldn't see them through the helper. Now "zr" and "zt", passed straight to `signInAndPick`, so the check reads them.
  - **The game screen's own Result** still put `#result` in the address when the result was already drawn. `Score` now scrolls to it and stops the link, with a test.
  - **Undo's "still there" half** had no scroll check. The test now starts at the top with Post off-screen and checks `scrollY` stays 0.
  - **The status lines** of the ticket, ROADMAP and HANDOFF disagreed. They now say the same.
- **Found after the review, by the full suite:** the second fix's `toDrawn` cancelled Today's Result whenever a hidden game screen held a result. It now acts only on a result that's shown (`checkVisibility()`), with `today.e2e.ts` as its test (Evidence).
- **Confirmed by the reviewer:**
  - `replaceState(null, …)` is the Next docs' usage.
  - The board key resets only the board.
  - A picked player's list stays closed on mount.
  - The aria-hidden label meets WCAG 2.5.3.
  - The DESIGN.md citations it spot-checked.
  - The 14b-13 correction and the SOURCES row.
- **Deferred to ROADMAP "Next revision":**
  - the `1lh` fallback;
  - the live-board width check without a poll;
  - Find a player relying on the caller's sort;
  - screen readers saying a group's name, for the human's phone check;
  - DESIGN.md's "no Share button" sentence.
