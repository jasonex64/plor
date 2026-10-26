# M14 14b-2b-1 — The wider shell, the right column, and buttons for links

**Status:** done (2026-10-26): merged in PR #89 on green CI (08:20 UTC; `check`, `db`, `e2e` and `secrets` passed on both runs), by auto-merge. Built from round 10, approved by the human ("Round 10 looks good, build it: the shell change first, then the admin pages.").

## Goal
Every desktop page gets the 280px sidebar and, from 1200px, a right column behind a line; About and Privacy move into the settings sheet; and every control on the site is a button or a menu item, not a text link.

## Who uses it / what breaks without it
- **Used by:** every player on a desktop; every player who opens Settings; the admin pages next (14b-2b-2), which use the right column for what needs the admin.
- **Breaks without it (the human, on round 9):** "the sidebar on the left should be wider and the middle area takes up too much sapce, and there's no line dividing the right side as well. also the privacy policy keeps like not being in a fixed place (should be in settings)"; and "nothing on the screwen should bje like the blue underlined text link".

## What the human decided
All in `M14-14b-2b-admin-pages.md`, "What the human decided", 9–12, 17, 18 and 22, quoted there:
- **Whole desktop site**; the sidebar **280px**; **a right column with a divider** from **1200px** (L42), holding **the friends feed** on every player page (Today keeps its own right column: the circle; the game screen keeps its feed).
- **Privacy and About:** "make it a little bubble thing like thedelete account": a bordered box in the settings sheet. The signed-out pages keep their footer, which Google's sign-in verification needs on the home page (M02 2c).
- **No text links:** "All controls site-wide (Recommended)": every action or way to another page is a button or a menu item; links stay only inside running text on the About and privacy pages.

## Source
- Round 10 on the canvas "Plor shell layout" (boards 7 and 8: the player page with the feed column; Settings with About and Privacy), approved 2026-10-26.
- WCAG 2.2 (SOURCES.md): 2.5.8 (targets), 1.4.10 (no sideways scroll at 320px), 2.4.4 (each button-styled link says where it goes).

## Acceptance criteria
1. **The sidebar** is 280px from 768px, and the content beside it starts at 280px. Checked in the shell e2e at 768px and 1440px.
2. **The right column.** From 1200px a 360px column stands on the right behind a 1px line, the full height, with Today's circle on Today, the feed on the game screen, and the friends feed on every other player page (Friends, Groups, a group's page, Me, /streak, How to play). Below 1200px Today and the game screen keep them in their single column, and the other pages show no feed. Checked in an e2e at 1440px and 1100px.
3. **Settings' box.** The settings sheet holds a bordered box with About Plor and Privacy policy as buttons; signed in, no page shows the footer; signed out, the footer stays. Checked in an e2e.
4. **No text links.** Every control that was a text link on the player pages, Settings, the clock bar, the footer and the About and privacy pages' "Back to Plor" looks like a button (`ButtonLink`); links remain only inside running text on About and the privacy page. The feed's group name becomes plain text (groups are on the Groups tab). Checked by the e2e and a review of the diff.
5. **Every theme and 320px.** The usual: colors.test.ts unchanged and passing; no sideways scroll at 320px (the shell e2e).
6. The usual checks and CI pass.

## Out of scope
- The admin pages (14b-2b-2).
- New content for the right column beyond the feed and what Today and the game screen already show.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Sidebar 280px | The shell from 768px | Human, 2026-10-26: "280px" |
| Right column 360px, from 1200px | The right column | L42 (1200px), and Today's and the game screen's 360px column (14a-2a, 14a-2b) |
| Right column padding 28px 24px, a 1px line on its left | The right column | Round 10, approved |
| A button-styled link: at least 48px tall, 1.5px control outline, 12px corners, the surface colour | `ButtonLink` | The game screen's secondary button (`game.module.css .secondary`, round 5) |

## Plan
1. `SideColumn`: from 1200px a fixed right column (a portal beside `<main>`, as the shell's nav), below it in place or nothing; Today's circle, the game screen's feed and the friends feed use it.
2. The sidebar's width; the body's room for the column.
3. `ButtonLink` for every control link; Settings' box; the footer hidden when signed in.
4. Tests: the shell e2e (sidebar, column, no links), settings e2e (the box, the footer).

## Removes
- One Realtime socket per listening part: `useBoardChannel` now shares one connection per page (the friends feed would otherwise have opened a second beside the board), which closes ROADMAP's "two sockets" item from 14a-2a.
- `useMinWidth`'s copy in `home.tsx` (moved to `min-width.ts` for the right column).
- The 1200px grid columns in `today.module.css` and `offbeat.module.css`, and their `main` max-width overrides: the right column is the shell's now.
- The settings sheet's link row (`.links`, `.link`), Me's text link style, the feed's group link, the offbeat back links' text style.
- The text-link look of every control listed in criterion 4.

---

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Round 10 draws the right column on the admin and Me boards only | Every player page has it from 1200px: Today's circle, the game screen's feed, and the friends feed elsewhere (a group's page, How to play, /streak too) | The human's answers 9, 11 and 17 ("Whole desktop site", "The friends feed everywhere") |
| Round 10 draws Settings' Change and Set as small 36px buttons | 44px, the sheet's existing size for them | WCAG 2.2 2.5.8 and the sheet's earlier target size (14a-3b) |
| Round 10 draws the About and privacy box like Delete account's | The same, in the control outline instead of the danger colour | It isn't a danger |
| One Realtime socket per listening part (14a-2a) | One shared socket per page | The feed column beside the board would have doubled the sockets and the traffic (found by `live-board.e2e.ts`, which counts the frames) |

## Evidence
On the Windows checkout, 2026-10-26; the local stack shared with the M13 session, which held off while these ran.
- **Criteria 1, 2 and 4:** `npx playwright test e2e/shell.e2e.ts` includes "the sidebar is 280px, the right column holds the feed from 1200px, and no control is a text link": the nav 280px wide; on Me the "Friends feed" column at `{ x: 1080, y: 0, width: 360, height: 900 }` with a 1px left border and the page's main ending by 1080; no visible footer; on every tab no visible underlined link; at 1100px no feed column. The keyboard walk (`shell.e2e.ts:178`) and the existing Today and game-screen column tests pass with the column moved to the shell.
- **Criterion 3:** `settings.e2e.ts` and `themes.e2e.ts` find Privacy policy and About Plor in the sheet; `themes.e2e.ts` follows About from a signed-out page's footer.
- **Criterion 5 and the checks:** `npx tsc --noEmit -p .` and `npm run lint`: no output. `npm test`: `Tests 360 passed (360)` (colors.test.ts unchanged). The full e2e suite, `npx playwright test`: `42 passed (5.2m)`.
- **Seen in a browser** (Playwright screenshots at 1440px, signed in): Today with the circle in the right column, Me with the friends feed, and the settings sheet with the About and privacy box.
- **Along the way:** an earlier run had 4 failures. Two were real and fixed: the doubled socket (`live-board.e2e.ts`), and the groups test's unscoped Post click, now scoped to the group's Comments (the friends feed beside it has a Post too). The others were the dev server compiling mid-run (Fast Refresh while I edited files, and a cold first compile slower than a 5-second wait on this PC); the same files passed 20 of 20 on a warm server, with nothing being edited.

## Review
By the `reviewer` agent on `5bce599` (fresh context, no edits, no test runs).
- **Blocking, fixed:**
  1. A part that started listening after the shared Realtime connection failed to open never heard of the failure and looked live: a failed connection is now dropped, so the next part opens a fresh one (`board-channel.ts`), as each part retried on its own before.
  2. The handoff was stale: rewritten in this PR.
- **Deferred to ROADMAP "Next revision" (For M14):** a hidden page's column keeps the body's padding (and its nav hides the footer after an in-place sign-out); `paused` read at render can miss a change before the listener is added; crossing 1200px remounts the column's contents (a comment draft is lost); the friends feed stays locked if the run ends while it's open; the feed also shows on the invite and join pages; ButtonLink's gap and padding and the footer's margin have no recorded origin; the game banner's Result button is styled by hand; leftover blank lines in two CSS files; the Status line's wording; the e2e's underline check covers the four tabs only.
- **Checked and fine (the reviewer):** StrictMode double mount, the last listener closing, a late listener on a healthy channel, hidden pages dropping their listeners, z-index and the clock bar, the aside labels and focus ring, the e2e changes, the Removes, the numbers.
