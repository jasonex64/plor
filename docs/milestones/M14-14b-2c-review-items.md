# M14 14b-2c — The review items

**Status:** drafted (2026-10-26, on the Mac), waiting for the human's approval. Its guided questions are answered (below).

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
| **14b-2c-1** | Player screens: Today, the game, the result, boards, the shell and the right column | 3, 4 (answers 6, 7, 8, 10), 5, 6, 10, 12, 13, 14, 15, 17, 18, 20, 21, 43, 44, 45, 46, 47 |
| **14b-2c-2** | Me, Friends, the settings sheet, themes | 19, 26, 27, 28, 29, 33 |
| **14b-2c-3** | The admin pages | 36, 37, 38, 39, 41, 51, 52, 53 |
| **14b-2c-4** | Tests, comments and repeated code | 1, 7, 8, 9, 16, 22, 23, 24, 25, 30, 31, 32, 35, 40, 42, 48, 49, 50 |
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
| ButtonLink's 6px gap and 0 16px padding; the footer's 24px margin | Item 47: recorded, not changed | *To read from round 10.* If round 10 doesn't draw them, ask the human; no value is picked here |

No other new number is expected. If a fix needs one, stop and ask.

## Plan
1. Merge `main` into `m14-look-and-feel` (done, `f9e9158`), so the branch matches plor.app's code.
2. After approval: 14b-2c-1, then 14b-2c-2, 14b-2c-3 (item 52's proposal first), 14b-2c-4. One PR each from `m14-look-and-feel`, merged on green CI (14b-2 ticket: "Merge on green CI (Recommended)"), and each reviewed by the `reviewer` agent first.
3. Each PR updates this ticket's Status, ROADMAP's M14 row and the ticked items.

## Removes
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
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
