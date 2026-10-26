# M14 14b-2c — The review items

**Status:** approved (human, 2026-10-26: "Approve the 14b-2c ticket as drafted"); 14b-2c-1, the player screens, done (2026-10-26): merged in PR #93 on green CI (21:58 UTC, as `1662837`), by auto-merge. 14b-2c-2, Me, Friends, the settings sheet and themes, built and reviewed, in review in PR #94; then 14b-2c-3. Its guided questions are answered (below).

## Goal
Every open For M14 item in ROADMAP Next revision is fixed, moved with the human's answer, or closed with a reason, so M14's look work ends with an empty list before 14c (`M14-14b-2-sprout-admin-polish.md`, answer 7: "All 33").

## Who uses it / what breaks without it
- **Used by:** every player (Today, the game screen, the result, boards, Me, Friends, the settings sheet) and the admins (Puzzles, Bank, Audit, Reports).
- **Breaks without it:** the 53 findings stay open. Among those players can hit:
  - a lost comment draft when the window crosses 1200px;
  - a lost settings draft when a text selection ends on the dimmed page;
  - the friends feed staying locked after a run ends;
  - stale leaderboard rows under a new label;
  - a typo clearing the whole answer.

## What the human decided
Guided questions (human, 2026-10-26, on the Mac):

**Round 1:**
1. **Which list:** "All 53 (Recommended)": every open item when 14b-2c starts (33 when 14b-2 was planned; 20 more came from the 14b-2a and 14b-2b reviews).
2. **The split:** "By area, 3-4 PRs (Recommended)".
3. **The share symbols** (item 2): "Move to 14c (Recommended)", with the game's world.
4. **The flaky tests** (items 1, 24, 25): "Try here, else Windows (Recommended)". Each is reproduced on the Mac against a written hypothesis first. One that doesn't reproduce stays open, marked for the Windows PC, and isn't closed without evidence.

**Round 2:**

5. **A stolen letter's key:** "Wait for 14c (Recommended)": its feedback comes with 14c's motion (L8's timings).
6. **The answer box after off-list text:** "Keep the text (Recommended)": the text stays, selected.
7. **The bonus line:** "Hide when nothing (Recommended)": no line when there's no bonus to earn. A late run says "Answers after midnight earn no bonus" (M09 D8).
8. **Your own invite link:** "Say it's yours (Recommended)": "This is your invite link", with the link to copy or share, and no add button.

**Round 3:**

9. **About's text and address** (item 34): "Keep both (Recommended)": confirmed as they are.
10. **"Where everyone ended":** "By how far they got (Recommended)": places ordered by question number, the furthest first, caught and ran-out-of-time at one question together.
11. **Avatar slots on the board's full lists** (item 18): "Yes, add them (Recommended)".
12. **The friends feed on the invite and join-group pages** (item 47): "Hide it there (Recommended)".

**Round 4** (asked while building 14b-2c-1):

13. **ButtonLink's 6px gap and 0 16px padding, the footer's 24px margin** (item 47): "Keep as shipped (Recommended)". Neither round 5's `.secondary` nor round 10 draws them, so this answer is their origin.
14. **A live channel that couldn't be opened** (item 44): "A 'Try again' button". The player reopens it; nothing retries by itself, so no timing number is needed.

## Source
- WCAG 2.2 (SOURCES.md): 1.3.1 Info and Relationships (items 20, 38); 2.4.3 Focus Order and 2.4.7 Focus Visible (items 30, 33, 36, 41, 53); 2.5.8 Target Size (item 10).
- Next.js (SOURCES.md, the bundled docs in `node_modules/next/dist/docs/`): how the App Router keeps a visited page hidden (items 12, 43). To read before 14b-2c-1.
- HTML `<dialog>` (SOURCES.md, MDN): the settings sheet's close (items 26, 27).
- Supabase Realtime (SOURCES.md): the board channel (items 7, 35, 44).
- PostgreSQL 17 (SOURCES.md), transactions: one read per request (item 19); the Keep race (item 52).
- Playwright (SOURCES.md): the e2e items.

## The items, by PR
Numbers are the item's place in ROADMAP's For M14 list on 2026-10-26.

| PR | Area | Items |
|---|---|---|
| **14b-2c-1** | Player screens: Today, the game, the result, boards, the shell and the right column | 3, 4 (answers 6, 7, 8, 10), 5, 6, 10, 12, 13, 14, 15, 17, 18, 20, 21, 43, 44, 45, 46, 47; and 8 and 16 from 14b-2c-4, closed by the same changes |
| **14b-2c-2** | Me, Friends, the settings sheet, themes | 19, 26, 27, 28, 29, 33 |
| **14b-2c-3** | The admin pages | 36, 37, 38, 39, 41, 51, 52, 53 |
| **14b-2c-4** | Tests, comments and repeated code | 1, 7, 9, 22, 23, 24, 25, 30, 31, 32, 35, 40, 42, 48, 49, 50 (8 and 16 closed in 14b-2c-1) |
| Closed without code | | 2 (to 14c, answer 3); 4's stolen key (to 14c, answer 5); 11 (done: the admin pages got the shell in 14b-2b-2a, PR #90); 34 (confirmed, answer 9) |

**Needs the human before it's built:**
- **Item 52**, Keep's open-report rule, changes `private.keep_reported_comment`, a security change (CLAUDE.md, "Security changes need a human"). The fix is proposed first and recorded in DECISIONS.md before 14b-2c-3 builds it.
- **Item 6**, a timeout nobody outside Today learns of. ROADMAP's Correctness list kept the board's version of this out of M11 because it changes the game's writes (H6). 14b-2c-1 proposes a read-side fix first; if it needs a write, it comes back to the human.

## Acceptance criteria
- [ ] Every item above is fixed in its PR, or closed with the reason given here, and its ROADMAP line is ticked with the PR number.
- [ ] Each fix that can break (branching logic, the e2e flows, races) has the cheapest test that catches it, run red before the fix where it can be (CLAUDE.md, Testing).
- [ ] The flaky items (1, 24, 25) each have a written hypothesis and the run that confirms or disproves it; any that won't reproduce on the Mac stays open, marked for the Windows PC (answer 4).
- [ ] `npm test`, `npm run test:db`, `npx supabase test db` and `npm run test:e2e` pass locally on each PR, and CI passes before merge.
- [ ] ROADMAP's For M14 list has no open items once 14b-2c-4 merges, other than those answer 4 leaves for the Windows PC.

## Out of scope
- The share symbols and a stolen key's feedback (14c, answers 3 and 5).
- New review findings from 14b-2c's own reviews: they go to ROADMAP as usual, for 14c or later.

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| The blocked chip's 2px strike, the Approve column's 6px gap, its 13px note | Item 53: recorded, not changed | Round 10 on the canvas "Plor shell layout", approved by the human 2026-10-26 (the 14b-2b-2b review found them missing from that ticket's Numbers) |
| ButtonLink's 6px gap and 0 16px padding; the footer's 24px margin | Item 47: recorded, not changed | The human, 2026-10-26: "Keep as shipped (Recommended)" (answer 13); round 5's `.secondary` and round 10 don't draw them (read 2026-10-26) |
| The phone's 56px top bar as the scroll margin for a jump to `#result` | Item 14: the result stops below the top bar | M14 14a-3b's top bar, 56px (`shell.module.css .top`) |

No other new number is expected. If a fix needs one, stop and ask.

## Plan
1. Merge `main` into `m14-look-and-feel` (done, `f9e9158`), so the branch matches plor.app's code.
2. After approval: 14b-2c-1, then 14b-2c-2, 14b-2c-3 (item 52's proposal first), 14b-2c-4. One PR each from `m14-look-and-feel`, merged on green CI (14b-2 ticket: "Merge on green CI (Recommended)"), and each reviewed by the `reviewer` agent first.
3. Each PR updates this ticket's Status, ROADMAP's M14 row and the ticked items.

## Removes
14b-2c-2 removed: Me's copy of the `finished` CTE (one `FINISHED_RUNS` in `src/game/offbeat.ts`), the second settle per `GET /api/me`, the sheet's `event.target === event.currentTarget` close and `Preferences`' `busy` disabling, Home's re-applying of the account's theme, and the hex values that repeated `--text` and `--on-accent` in the `--on-shade-*` slots.

Planned, confirmed per PR:
- the second survived count (item 3);
- `NOTHING`'s second copy (16);
- `hostBankShare`, which has no caller (37);
- the extra visually-hidden classes, down to one (40, 49);
- the Result button's hand-copied ButtonLink look (48);
- the stale "home page" and "account page" wording (9, 51).

---
*Fill in the sections below at the end.*

## Source diff
14b-2c-1:

| Source says | We built | Why different |
|---|---|---|
| Next.js "Preserving UI state", The `:has` selector: for global state, a `data-*` attribute that React renders (`<html data-modal-open>`) | `useBodyFlag` sets `data-shell`, `data-clock` and `data-column` on `<body>` in a layout effect whose cleanup removes it, counted per flag | React doesn't render `<body>` here (the shell, the clock bar and the column portal into it). The same page's "Global styles" section uses exactly this effect-and-cleanup to switch a hidden page's styles off; the count keeps a flag when a page is shown before the one it replaces is hidden (order *unverified*) |
| The ticket: item 47's sizes from round 10 | Kept as shipped | Round 10 doesn't draw them; the human chose "Keep as shipped (Recommended)" (answer 13) |
| The ticket: item 6, a read-side fix first | Read side only: the clock bar's zero has the pages read the run again, and `private.run_status` decides `timed_out` at that read | No write was needed, so it didn't come back to the human |
| Item 10: check board rows with reactions at 320px | The reaction buttons fit; the check found the invite link's `<code>` (398px) pushing the Friends tab sideways, now `overflow-wrap: anywhere` | A real overflow the old 320px check missed: it ran before any invite link was made |
| Item 14: the jump to `#result` | Also a 56px scroll margin on phones | Without it the result would land under the fixed top bar |
| Items 8 and 16 were planned for 14b-2c-4 | Closed here | The same changes removed them (the body rules left `shell.module.css`; the clock bar's `NOTHING` went with its new time-up) |

14b-2c-2:

| Source says | We built | Why different |
|---|---|---|
| Item 19, and this ticket's Source (PostgreSQL 17, transactions): read `GET /api/me` in one transaction so a request at midnight can't mix two days | No transaction: the day is read once, first, and passed to the settling (`settleRuns`) and every read (`readStats`, `getStreak`, getMe's query, `rarestAnswers`); `getStats` reads its day first the same way | `private.today()` is `day_of(statement_timestamp())` (`supabase/migrations/20261021044659_today_uses_statement_time.sql`; PostgreSQL 17, "Current Date/Time": each statement's own start), so statements in one transaction can still see two days. A day passed as a parameter is one for every statement |
| Item 26 suggests comparing the click with the sheet's box, or `pointerdown` | Both: a press must start (`pointerdown`) and end (`click`) outside the dialog's own box | The dialog's box, not the sheet's: from 768px the 1px left border is the dialog's, and a tap on it is on the panel |
| Item 33 names the theme picker and 14a-3b's switches | Both show their change at once, stay enabled, and save one after another; the settings sheet alone applies a signed-in player's theme | Home re-applied the account's theme on every profile change, putting the page back mid-save (the 14b-2c-2 review) |

## Evidence
14b-2c-1, on the Mac, 2026-10-26, against the shared local stack (which also holds M13 13e-5's unmerged `20261026212300_one_walk.sql`):

- `npx tsc --noEmit -p .` and `npx eslint .`: clean.
- `npm test`: `Test Files  41 passed (41)`, `Tests  390 passed (390)`. It includes `src/friends/ended.test.ts` (the new order; 2 of its 5 tests failed against the old `ended.ts`) and `src/app/bonus.test.ts` (4, the bonus line's branches).
- `npm run test:db`: `Test Files  40 passed (40)`, `Tests  264 passed (264)`. `runs.db.test.ts` now checks an answer to yesterday's run after midnight as `inDay: false, bonus: 0`.
- `npx supabase test db`: 23 of 24 files pass; `answer_base.test.sql` fails at its line 24 with `import_source: a kind_of circle`. It imports a circle on purpose, and M13 13e-5's `one_walk` migration, applied to the shared stack by the M13 session, makes `import_source` refuse one. This PR changes no SQL; CI runs pgTAP on a fresh database.
- `e2e/player-screens.e2e.ts`: 9 tests, all passing. With `src/` set aside (a stash, restored after), the 8 run then all failed against the old code. The ninth, Today's board on a time-up, failed with only its board key reverted. A first version of that test passed without the fix, because Playwright's fake clock also fires the Realtime client's timers and the rejoin reloads the board; it now runs on the real clock.
- The full e2e suite, after the fixes: `npx playwright test` → `53 passed (1.9m)`.
- CI on PR #93 (run 40407721823, `b543dce`), on a fresh database: `npm run test:sql` → `Files=24, Tests=406`, `Result: PASS` (so the local `answer_base` failure was the shared stack's); `npm run test:e2e` → `53 passed (4.1m)`; `check`, `db`, `e2e` and `secrets` passed on the push and pull-request runs.
- The first full run (48 passed, 4 failed) failed only on old text these answers change: "0 points + about 0 bonus" (groups, today), ", plus a rarity bonus of about 0." (live-board) and "catName" (me, item 20's run-together text). Those four checks now expect the new text, and their files pass (15 passed).

14b-2c-2, on the Mac, 2026-10-26, against the same shared stack:

- After the review's fixes: `npx tsc --noEmit -p .` and `npx eslint .` clean; `npm test` → `Tests  390 passed (390)`; `npm run test:db` → `Tests  266 passed (266)`; `npx playwright test` → `57 passed (1.9m)`.
- `e2e/settings-sheet.e2e.ts`: 4 tests. The first three failed against the old `settings.tsx` (all three, run with only that file swapped back) and pass on the new one. The fourth, a switch's reply landing mid-theme-save, failed with only Home's theme effect put back.
- `src/app/api/offbeat/route.db.test.ts`: `readStats` as of T-3 gives the streak and chart of T-3 (streak 3), not today's (5); `settleRuns` as of T-2 settles nothing for T-2, and as of T-1 settles it.
- `src/app/colors.test.ts`: 133 passed, reading `var(--text)` and `var(--on-accent)` through their slots, so the shades' numbers keep their 4.5:1 checks.
- Item 29, the `setMe` updater, has no test: it's a race between two answers, checked by reading.
- `npx supabase test db`: as in 14b-2c-1, 23 of 24 files pass locally and `answer_base.test.sql` fails on M13 13e-5's `one_walk` migration in the shared stack (the M13 session confirmed it's expected until 13e-5 merges); CI checks it on a fresh database.

## Review
14b-2c-1, by the `reviewer` agent in a fresh context, 2026-10-26.

- Blocking findings and how each was fixed:
  - The bonus line counted any survived answer as earning a bonus, but an answer after midnight earns none (`src/game/scoring.ts`). Fixed: `src/app/bonus.ts` names a bonus only when an answer survived before midnight, with `bonus.test.ts` and the db check of `inDay: false`.
  - Today's own board (from 768px) wasn't reloaded on a time-up. Fixed: it's re-keyed on Home's `timeUps`, with its e2e test (red without the fix).
  - The handoff, this ticket's Status, Evidence, Source diff and Review, and the ROADMAP row: brought up to date in this PR.
- Deferred to ROADMAP "Next revision" (For M14, "14b-2c-1 review"): the Friends tab's whole-page re-key on a time-up; Me's stats after a time-up; a failed channel's client never closed; a token error that outlives a later success; two LiveStatus alerts on one page; the Try again test's weak join check; focus lost when the column moves; the result's repeated scroll; no tests for the `{ ms }` reset fix or the 768px body room; double blank lines.

14b-2c-2, by the `reviewer` agent in a fresh context, 2026-10-26.

- Blocking findings and how each was fixed:
  - Item 19 still mixed two days: the settling read its own `private.today()` before the day was read. Fixed: the day is read first and passed to `settleRuns` (and `allTimePoints`), in `getMe` and `getStats`, with the settle-by-day db test.
  - Item 33: Home re-applied the account's theme whenever the profile changed, so another setting's reply, or a profile reload, put the page back while a picked theme was still saving. Fixed: signed in, the settings sheet alone applies the theme; Home only clears it when there's no account theme. With its e2e test (red without the fix).
  - The ticket, ROADMAP and handoff: brought up to date in this PR.
- Deferred to ROADMAP "Next revision" (For M14, "14b-2c-2 review"): the sheet CSS's stale comment; a pointercancel leaving `pressedOutside` set; clearing a pending setting by value; an in-flight account save's refusal lost when the sheet closes; two ways to give `getStreak` and `settleRuns` their day; Me's `days_played` and `average` read in two statements; the settings e2e's unclosed contexts.
