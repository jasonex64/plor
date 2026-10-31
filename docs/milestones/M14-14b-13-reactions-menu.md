# M14 14b-13 — Reactions behind a ⋯ menu

**Status:** approved (human, 2026-10-31: "Approve, build it", to "Approve 14b-13 with the proposed placement and ⋯ name?"), drafted from two rounds of guided questions and a source question; in progress. It follows 14b-10b (PR #142, merged) and comes before the leaderboard's graph view (14b-10's answer 4).

## Goal
Every comment and every friend's run on the board drops its row of five emoji chips. Instead it shows only the reactions people used, as small text, and a ⋯ at its top right opens a small popover with the five emoji and either Delete or Report.

## Who uses it / what breaks without it
- Used by: every player reading the feed, a group, or the Friends today board.
- Breaks without it: the human's note (2026-10-29): "emoji reactions should be from a ... menu on the top of each comment, not filling up the screen at all". Today five chips sit under every comment and every friend's run, even when nobody has reacted. With Delete or Report beside them, each comment gets a second line of controls.

## What the human decided (2026-10-31, on the Windows PC, quoted)
Round 1:
1. What the ⋯ holds: "Reactions + Delete/Report (Recommended)" ("One ⋯ per comment holds everything you can do to it. The comment has nothing under its words. Delete and Report take one more tap.").
2. At rest: "Only used emoji, small (Recommended)" ("e.g. '😂 3 ❤️ 1' in small text under the words, nothing at all if no one reacted.").
3. Friends' runs on the board: "Same ⋯ as comments (Recommended)" ("One way to react everywhere. The board's rows get as clean as the comments.").
4. What opens: "A small popover by the ⋯ (Recommended)" ("A little panel next to the button: the five emoji in a row, and Delete or Report under them. The same on phone and desktop.").

Round 2:

5. Where the ⋯ shows: "Always, top right (Recommended)" ("A faint ⋯ at the top right of every comment and run, on phone and desktop.").
6. Your own reaction at rest: "Yours tinted in the summary (Recommended)" ("Your emoji in the small summary gets the soft tint, like your own row on boards.").
7. After a pick: "It closes, toast with Undo (Recommended)" ("One tap reacts and the menu goes away; the existing '😂 added · Undo' toast confirms it, as reactions do now.").
8. Counts in the popover: "No, the summary has them (Recommended)" ("The popover is just five emoji and Delete or Report: small and quick. Counts live only in the summary under the comment.").

The source:

9. "WAI-ARIA APG Disclosure (Recommended)" ("the ⋯ opens a panel of ordinary buttons, Tab moves through them, Escape or a tap outside closes it. It works the same way as the admin phone menu already does, so the site keeps one way to do menus."). It's added to SOURCES.md by that answer.

Earlier answers this ticket keeps: 14b-10's answer 18 ("the ⋯ menu sub-ticket replaces them, with menu items at 44px"), answer 7 (every button 44px tall), answer 11 (your own things take the soft tint), and answer 12 (a new reaction pops).

## Source
- **WAI-ARIA APG, Disclosure pattern** (https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/), "Keyboard Interaction" and "WAI-ARIA Roles, States, and Properties":
  - the ⋯ is a `button`;
  - Enter or Space toggles the panel;
  - `aria-expanded` is true while the panel shows and false while it's hidden;
  - `aria-controls` names the panel (optional).
- **Its Disclosure Navigation Menu example** (`/examples/disclosure-navigation/`, "Page last updated: 20 January 2026"), "Keyboard Support" and "Accessibility Features" item 3:
  - Tab moves into and through the open panel;
  - Escape closes the panel and puts focus back on its button;
  - moving focus out closes it.

  Its arrow, Home and End keys are optional, and this ticket leaves them out (see Out of scope).
- **WCAG 2.2**: 2.5.8 target size (24px minimum; this ticket uses 44px, answer 18); 1.4.1 use of colour (your own reaction isn't shown by tint alone); 1.4.13 content on hover or focus (Escape closes it, as the APG example says).
- **M08 comments and reactions** (`docs/milestones/M08-comments-and-reactions.md`, 8b and its D3):
  - the five emoji;
  - one reaction per player per comment or run;
  - tapping your own reaction removes it;
  - tapping another replaces it.

  Unchanged.
- **14b-6b** (`docs/milestones/M14-14b-6-feel-and-polish.md`): a reaction shows at once and is held for Undo. Unchanged.
- **The admin phone menu** (`src/app/admin/admin-area.tsx`, `PhoneMenu`, 14b-2c-3): it closes on Escape (focus back to its button) or on a press outside. The ⋯ closes the same way, and both take it from one shared hook.

## Acceptance criteria
- [x] No comment and no friend's run shows an emoji button until its ⋯ is opened. At 390px and 1440px a comment nobody reacted to has no line under its words (the feed, a group, Today).
- [x] A comment or run with reactions shows them under its words in 13px text, each emoji with its count, in the set's order (`👍 2 ❤️ 1`). It shows nothing when there are none.
- [x] Your own reaction in that summary has the soft tint, plus a cue that isn't colour (proposed: an accent edge, as the pressed chip has now). A screen reader hears it as yours (proposed: "😂 3, yours").
- [x] Every comment (except one still held for Undo) and every friend's run has a ⋯ button at its top right, at least 44×44px. It has a name screen readers hear, and `aria-expanded` false.
- [x] Opening the ⋯ sets `aria-expanded` true and shows a popover next to it. The popover holds the five emoji as buttons, each at least 44×44px with yours pressed (`aria-pressed`), then Delete on your own comment or Report on someone else's. A run has no Delete or Report. No counts are shown.
- [x] Picking an emoji reacts as now (replace, or remove when it's yours), closes the popover, shows the "😂 added · Undo" toast, and the summary's emoji pops (14b-10b). Delete and Report behave as they do now.
- [x] Escape closes the popover and focus returns to its ⋯. A press outside it closes it. Tab past the last item closes it. Opening another ⋯ closes the first.
- [x] The admin phone menu still closes on Escape and on a press outside, through the same shared hook.
- [x] Under reduced motion nothing in the popover or summary animates.
- [x] The e2e tests that pressed chips (`feel`, `alive`, `live-board`) press the ⋯, then the emoji, and still check what they checked. `feel.e2e.ts`'s "a chip is as wide with its count as without" goes with the chips; the summary and popover have their own checks.
- [x] DESIGN.md describes the summary, the ⋯ and the popover, with file and line citations.

## Out of scope
- The APG example's optional arrow, Home and End keys. Tab and Escape cover the pattern, and the admin menu doesn't use them either.
- Who reacted (names). M08 doesn't show them and nothing stores them for display.
- The "Reactions on your run" line on your own board row. It's already this summary's text form and stays as it is (your own run has no ⋯).
- The leaderboard's graph view (next sub-ticket, its own questions).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 44×44px | The ⋯ button and each emoji, Delete and Report in the popover | 14b-10 answer 18 ("menu items at 44px") and answer 7 (every button 44px tall) |
| 13px | The summary's text | The reaction chips' size now (`reactions.module.css`, 14b-8b, mockup 3's `.reacts`); answer 2 says "small" |
| `--muted` | The ⋯'s colour at rest ("faint", answer 5), `--text` under the pointer or focus | Existing colour slots (globals.css) |
| `--soft` and `--accent` | Your own reaction's tint and edge in the summary | Answer 6; the pressed chip's look now (`reactions.module.css`) |
| 200ms, `--ease`, from 90% | The popover pops in (kit `.pop`), none under reduced motion | 14b-10 answers 12, 14 and 26 |
| The kit card's border and corners | The popover's panel | The admin phone menu's panel (`kit.card` + `.menu`) |
| Right edges aligned, directly under the ⋯ (0 gap) | Placing the popover | Claude's proposal, approved by the human, 2026-10-31 ("Approve, build it") |
| "Actions for <name>'s comment" / "React to <name>'s run" | The ⋯'s spoken name | Claude's proposal, approved by the human, 2026-10-31 ("Approve, build it") |

## Plan
1. Add the APG Disclosure pattern and its navigation example to SOURCES.md (answer 9).
2. Move `PhoneMenu`'s Escape and press-outside effect into one hook (`src/app/use-dismiss.ts`), also closing on focus leaving. Use it in `PhoneMenu` first and run `admin-area.e2e.ts`. Expected: it passes unchanged. Disproved if any admin menu test fails.
3. Red first: rewrite the reaction steps in `feel`, `alive` and `live-board` to open ⋯ and pick, and add checks for the summary, the tint, the ⋯'s size and `aria-expanded`, Escape, outside press and Tab. Expected: they fail on the current chips (no ⋯ button).
4. `Reactions` becomes the summary (text, yours tinted, pops kept) plus a `ReactMenu` (the ⋯ and its popover). `CommentItem` puts the ⋯ in its head row and drops the `kit.below` controls line. The board rows put the ⋯ at the top right.
5. Run the touched e2e files, then the ones that show comments (`live-board`, `groups`, `today`, `player-screens`, `offbeat`). Take screenshots at 390px and 1440px in two themes. Update DESIGN.md.
6. Review by the `reviewer` agent; fix blocking findings; ROADMAP row, Status and HANDOFF in the PR.

## Removes
- The five chips under every comment and run (`Reactions`' chip buttons) and their CSS: `.group .reaction`, its hover and active reset, `.none` (the count's held room) and `.count`.
- Delete and Report as links under each comment (the `kit.below` controls line in `CommentItem`).
- `PhoneMenu`'s own Escape and press-outside effect, which moves into the shared hook.
- `feel.e2e.ts`'s chip-width check: there are no chips to measure.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| APG Disclosure: `aria-controls` names the panel (optional) | Set only while the popover is open | The popover isn't in the page while closed, and an `aria-controls` naming nothing is a broken reference |
| APG navigation example: Escape closes the dropdown "if focus is inside the navigation region" | Escape closes the open menu wherever focus is, and puts focus back on its ⋯ | Unchanged from the admin phone menu (14b-2c-3), whose behaviour the shared hook keeps; only one menu is ever open |
| APG navigation example: nothing on a mouse press outside | A press outside closes it | The admin phone menu's behaviour (14b-2c-3) and answer 9's wording ("Escape or a tap outside closes it") |
| APG navigation example: arrow, Home and End keys (optional) | Not built | Out of scope: Tab and Escape cover the pattern, as in the admin menu |
| APG Disclosure: focus moving out closes the panel | Also now true of the admin phone menu, which before closed only on Escape or a press outside | One shared hook, one way (the ticket's "Removes"); `admin-area.e2e.ts` passes unchanged |
| 14b-10 answer 12: "a reaction pops" | The summary's emoji pops when its count grows, the summary kept mounted while empty so the first reaction pops too | Mounted only once there were reactions, it had no earlier count to grow from (the red run caught it) |
| Answer 4: the popover is "next to the button" | Right under it, right edges lined up | The placement the human approved (Numbers) |

## Evidence
- **Red first** (2026-10-31): `npx playwright test e2e/reactions-menu.e2e.ts` before building → 2 failed: `Expected: 0 Received: 2` at `for (const emoji of REACTIONS) await expect(page.getByRole("button", { name: emoji })).toHaveCount(0)` (the chips were there), and the reduced-motion test timed out finding `React to rc…'s run`.
- **The shared hook first** (hypothesis: `admin-area.e2e.ts` passes unchanged; disproved if a phone-menu step failed): `npx playwright test e2e/admin-area.e2e.ts` → `4 passed (24.6s)`.
- **Green**: `npx playwright test e2e/reactions-menu.e2e.ts` → `2 passed (36.2s)`. On the way:
  - an emoji measured 42.26px, mid-pop (96% of 44), so the test waits for the popover's animations to finish before measuring;
  - the ⋯ was measured before the click scrolled the page, so it is measured again after opening;
  - an open popover lies over the ⋯ of the row below it, so "another ⋯ closes the first" opens the lower row's first;
  - the summary's first reaction didn't pop (Source diff).
- **The e2e files that pressed chips, Delete or Report**: `npx playwright test e2e/feel.e2e.ts e2e/alive.e2e.ts e2e/live-board.e2e.ts e2e/player-screens.e2e.ts e2e/admin-area.e2e.ts` → `32 passed (3.7m)`.
- **The 44px check and the other screens that show comments**: `npx playwright test e2e/calm.e2e.ts e2e/groups.e2e.ts e2e/today.e2e.ts e2e/offbeat.e2e.ts e2e/look.e2e.ts` → `19 passed (2.0m)`. `calm.e2e.ts` no longer leaves the reactions out of "every button is 44px".
- **Unit tests**: `npm test` → `Test Files 48 passed (48)`, `Tests 477 passed (477)`. `npx tsc --noEmit` and `npx eslint src e2e`: no output.
- **Screens** (a throwaway spec, deleted after; images in the session's scratchpad, not committed): the feed and Friends today at 390px and 1440px in Paper and Night, closed and open.
  - Closed, a comment shows its words and, under them, `❤️ 1` tinted with an accent edge (the viewer's) or `😂 1` plain, and a muted ⋯ at the top right.
  - Open, the popover sits right under the ⋯ with five emoji, ❤️ pressed, and Report under a line, over the next row.
  - A friend's run with no reactions is one line with its ⋯.

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
