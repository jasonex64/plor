# M25 — Less on the page: simple by default, tap for more

**Status:** in progress: approved 2026-11-28 (the human: "Approve M25"), from the thirteen answers below. 25a, Friends today's rows, is built and reviewed, in its PR. Next: 25b, the leaderboard's switches, once 25a's PR is merged.

## Goal
The Friends and Groups tabs show the least a player needs before a tap (a name and points, the boards, two switches), and everything else opens on a tap and is closed again on the next visit.

## Who uses it / what breaks without it
- Used by: every signed-in player who opens the Friends or Groups tab. Inbox #267 (the human, 2026-11-17).
- Breaks without it: the tabs show everything at once. The human: "I think there's a little too much information overload. Like the page shows too much information overload. Like, for example, on the friends tab, like where everyone ended. Some people don't really care about where people ended. They only want to see the points and their status on the leaderboard. So maybe just like ways to toggle or show these things, but not necessarily just have it default on everything."

## The human's answers (2026-11-28, three rounds and one question after approval; the long-term picture is M24's answer 8, 2026-11-25: "Simple by default, tap for more")
| # | Question | Answer (quoted) |
|---|---|---|
| 1 | Which screens become simpler in this milestone? | "Friends and Groups tabs" |
| 2 | Which parts of the Friends tab feel like too much? | all four: "Where everyone ended", "Friends today's details", "Leaderboard switches", "Friend lists and requests" |
| 3 | What happens to an opened detail on the next visit? | "Closed again each visit": nothing is stored |
| 4 | How is a hidden detail opened? | "Tap the row" |
| 5 | What does a Friends today row show before it is tapped? | "Name and points" (or "Not yet") |
| 6 | The name is a link to the profile today: what happens to it? | "Whole row opens details": a "Profile" link sits inside them |
| 7 | Which leaderboard switches show before a tap? | "Game and Period only": Count and View go behind "More" |
| 8 | Where do Find a player, Friend requests and Your friends go? | "Closed cards on the same tab": each a heading with its count; the card with a request waiting opens by itself |
| 9 | Where everyone ended, once M23 switches Offbeat to the clock | "Leave it, M23 retires it": nothing is built for it here |
| 10 | Which parts of the Groups tab are closed until tapped? | "Members", "Group thread", "Rename and 'Started' line"; the name's dropdown and the leaderboard stay open |
| 11 | Do leaderboard rows open on a tap too? | "No, leave them" |
| 12 | What does an opened Friends today row show? | "How the run stands", "Reactions and react", "Profile link", "Their place today" |
| 13 | You open a row, go to Today and come back without reloading: is it still open? (asked after approval, when the plan's step 1 found the page is kept) | "Closed again": leaving the tab closes everything opened |

## Assumptions (Claude's, not asked; say so if one is wrong)
- **Closed means closed on every load of the page**, as the leaderboard's switches already go back to Offbeat and Today on every load (M20 answer 27, M22 answer 3). Switching tabs inside one visit: read first, as planned. The app has `cacheComponents: true` (`next.config.ts:5`), under which Next.js hides the page a player leaves and keeps its state (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md`, "Navigation with Activity"), so an opened part would still be open on the way back. The hypothesis in the plan was wrong; the human was asked (answer 13) and each part is closed as its page is hidden (`src/app/open.ts`, the guide's own pattern: `02-guides/preserving-ui-state.md`, "Expandable UI").
- **A row with no points yet shows the short word it has now**: "Not yet", or "Started" for a friend who has begun while the player hasn't finished a Fragments day (today's longer "started (you'll see how it's going once you finish)" moves into the opened row).
- **"Their place today" is today's leaderboard's place**: among the player and their friends who have finished that game today, read "2nd of 5", counting as Today's place strip does (M20 answers 91 to 93). It shows once the player and the friend have both finished, as that leaderboard opens (M22), and never earlier. As drafted this line said "wherever the friend's points are shown", which on a clock day is before the player has played; built stricter, see the Source diff.
- **Where everyone ended is only drawn on Offbeat's old seven-question days**: `src/app/board.tsx:162` draws it from `mine`, which `src/friends/board.ts:129` leaves null on a clock day. Read from the code, not checked with the M23 session. This milestone leaves the section as it is (answer 9).
- **The profile's own page is unchanged**, and so is every other place a name is a link (the leaderboards, comments, the feed, a group's members, request rows): only Friends today's rows change (answers 6 and 11).
- **Today's tab and the Me tab are not touched** (answer 1), nor is Today's leaderboard card.

## Source
- `docs/milestones/M07-friends-and-live-board.md`: 7c (the live board, what a friend's row may say before the player has finished), 7d (Where everyone ended).
- `docs/milestones/M12-12d-decided-fixes.md` (no spoilers before the player's own run is over) and `docs/milestones/M23-23d-the-screens.md`, "The live board" (a clock day's points from the start, answer 47).
- `docs/milestones/M20-design-rules-and-clean-up.md`: answers 5 and 9 (the status chip's short words), 27 (the leaderboard's switches), 79 to 82 (a name opens its profile: this milestone changes it on Friends today's rows only), 91 to 93 (the place strip's count).
- `docs/milestones/M17-profiles-and-friend-requests.md`: 17a and 17b (requests, Find a player) and `docs/milestones/M10-groups.md`, G7 (what the group's screen shows).
- `docs/DESIGN.md`: the kit (Board row, rows, cards, the hover rule), "A friend's row", "A name opens its profile", "The leaderboard graph"; each sub-ticket updates what it changes.
- `docs/DECISIONS.md`: Network messages (a changed response shape), Error handling, Tests.
- `docs/SOURCES.md`: Next.js 16.4 (read `node_modules/next/dist/docs/` before changing a page), WCAG 2.2 (2.5.8 target size, 4.1.2 name, role, value: a closed part says it is closed), WAI-ARIA 1.2 (the disclosure pattern's `aria-expanded`, where native `<details>` isn't used), Playwright, Vitest.

## Sub-tickets (one PR each, from `m25-less-on-the-page`, slot 3)
No sub-ticket has a migration or a security change; none needs a database push.
- **25a, Friends today's rows.** A row is the avatar, the name and the points (or the short word); the whole row is one control that opens the rest under it: how the run stands, the place today, the reactions with the react buttons, and a "Profile" link. The server adds each friend's place to the board it already sends, under the points' rule.
- **25b, the leaderboard's switches.** On the Friends and group leaderboards Game and Period stay; Count and View go behind a "More" button on the card, closed on every load.
- **25c, the Friends tab's lists.** Find a player, Friend requests and Your friends are each a heading with its count that opens on a tap; Friend requests is open by itself while a request waits for the player's answer.
- **25d, the Groups tab.** Members (with Share group link and Leave) and the group's thread are each a heading with its count that opens on a tap; the creator's rename form and the "Started" line go behind "Group details".

## Acceptance criteria
- [x] **25a** On a day with a friend's run, the friend's row on Friends today shows the name and the points and nothing else; a tap or Enter on the row opens how the run stands, "nth of m", the reactions and a "Profile" link that goes to `/u/<username>`; after a reload the row is closed. Playwright, `@visual`.
- [x] **25a** A friend's place is not in the board's response before the viewer has finished: db tests through the board's route (which connects as `plor_app`) on a Fragments day, a clock day and an old Offbeat day. (As drafted: "wherever their points are not"; built stricter, see the Source diff.)
- [x] **25a** Each row's control is at least 44px tall and says whether it is open (WCAG 2.5.8, 4.1.2). Playwright measures the height; "says whether it is open" rests on the native `<details>` and is not asserted by a test.
- [ ] **25b** The Friends leaderboard shows Game and Period and no Count or View until "More" is pressed; the group leaderboard the same; after a reload they are hidden again. Playwright, `@visual`.
- [ ] **25c** With no request waiting, the Friends tab shows three closed headings with their counts and the boards; with one waiting, Friend requests is open and the other two closed. Playwright, `@visual`.
- [ ] **25d** A group's screen shows the dropdown, the leaderboard and three closed headings (Group details, the thread with its count, Members with its count); each opens on a tap and is closed after a reload. Playwright, `@visual`.
- [ ] Every e2e test that reads a part now closed opens it first, and none is skipped or weakened: `npm run test:e2e` green in CI on each PR.
- [ ] `docs/DESIGN.md` says what each sub-ticket built, with its file and line.

## Out of scope
- Today's tab, the Me tab, Today's leaderboard card and the feed (answer 1).
- Where everyone ended: left as it is until M23 ends the old days (answer 9).
- Leaderboard rows (answer 11).
- Remembering what a player opened, on the device or the account (answer 3).
- Inbox #311 ("more playful"), which is M20's.

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 44px | the smallest height of a row's control, a heading that opens a card, and "More" | DESIGN.md, the kit's controls; WCAG 2.2, 2.5.8 |
| none stored | what is remembered between visits | the human, 2026-11-28, answer 3 |

## Plan
Each sub-ticket starts with its failing Playwright test, then the screen, then `npm run lint`, the type check, the targeted e2e (one e2e run at a time on this PC) and DESIGN.md.
1. 25a: read `src/app/home.tsx` for whether a tab's screen is kept between tab switches → verify: the answer is written into this ticket with its file and line.
2. 25a: the failing e2e test for the closed row → verify: `npm run test:e2e -- live-board -g "opens on a tap"` fails on the row's text.
3. 25a: the failing db test for the place's rule → verify: `npx vitest run src/friends/board` fails on `place`.
4. 25a: the server's place, then the row → verify: both tests pass; `npm run test:e2e -- live-board boards feel` passes.
5. 25b, 25c, 25d: the same order, each from the branch after the last PR is merged → verify: its criterion's test fails first, then passes.
6. Each PR: the `reviewer` agent, the wider e2e files that open the changed tab, the ticket's Status and the ROADMAP row.

Hypothesis for step 1: the Friends tab's screen is drawn again each time the tab is chosen, because its lists load in a `useEffect` with no cache; if `home.tsx` keeps the screen mounted, "closed again each visit" needs a question to the human about tab switches before 25a is built.

## Removes
- 25a: the name's link to the profile on Friends today's rows (the link moves into the opened row), the row's always-shown reactions line and ⋯ with the ⋯'s hide-until-hover there (`board.module.css`'s `.menu` and `.reactions`), and `describe` in `board.tsx`, replaced by `brief` and `stands`: the texts "Question 2 of 3 · 40 points", "on round k of n" and "started (you'll see how it's going once you finish)" on a closed row.
- 25b, 25c, 25d: nothing is deleted; parts that were always shown are shown on a tap.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| This ticket as drafted: a friend's place shows wherever their points show (a clock day: from their first answer, before the viewer has played) | 25a: the place is today's leaderboard's, sent only once the viewer has finished, and only for a friend who has finished | One way to rank: `getTodayBoard` already ranks today for the leaderboard and the place strip, and opens only then (M22). A place among runs still going would change under the reader and differ from the leaderboard beside it |
| M20 answers 81 and 82: on the live board's friend rows the name is a link to the profile | 25a: on Friends today the row is the control and a Profile link is inside it; every other place keeps the name link | The human, 2026-11-28, answer 6: "Whole row opens details" |
| M20 answers 5 and 9, M23 answer 47: the chip reads "Question 2 of 3 · 180 points" mid-run | 25a: the chip is the points; the question is in the opened row | The human, answer 5: "Name and points" |
| Inbox #270: a run's ⋯ is hidden until its row is hovered | 25a: in an opened row the ⋯ always shows | The row was opened to reach it; a closed row has no ⋯ at all |
| DECISIONS.md, Network messages: a changed response shape raises the protocol | 25a: `GET /api/board` gains `place` on each friend and the protocol stays | An older page ignores a field it does not read; nothing it reads changed (as M24's row for its added fields) |
| This ticket's plan, step 1's hypothesis: a tab's screen is drawn again each time | Disproved: the page is kept hidden with its state (`cacheComponents`) | The human was asked (answer 13) and `src/app/open.ts` closes a part as its page is hidden |

## Evidence
**25a** (slot 3, 2026-11-28; the dev server Playwright starts, slot 3's local stack):
- Plan step 1: `next.config.ts:5` has `cacheComponents: true`; the bundled docs say a left page is hidden with its state. Hypothesis disproved, the human asked (answer 13).
- Failing first, the db test: `npx vitest run src/app/api/board/clock.db.test.ts`: `2 failed | 1 passed` (no `place` on a friend).
- Failing first, the e2e test, against the old row with the server's change in: `npm run test:e2e -- clock --project=chromium -g "opens on a tap"`: `expect(row.getByRole("link")).toHaveCount(0)`, received 1 (the name was a link).
- Then: the same command, `1 passed`; and at both sizes inside the run below. The test: closed, the row reads "name: 35 points" with no link and no button, its summary 44px or more and under 70px, no sideways scroll; a tap shows "Finished" and Profile (`/u/<name>`) and no place before the watcher has played; Enter closes and opens it; closed after a reload; once the watcher has finished, "1st of 2" and the ⋯ to react; closed after going to Today and back by the tab links; Profile opens the friend's page.
- `npx vitest run src/app/api/board src/friends --no-file-parallelism`: `Test Files 8 passed`, `Tests 48 passed`: no place before the viewer has finished on a clock day, a Fragments day and an old Offbeat day; none for a friend still playing; on a clock day 35 points is "1 of 2" and 10 points "2 of 2" from either side; on a Fragments day two tied players are 1 and 2 of 2.
- `npm test`: `Test Files 81 passed`, `Tests 1007 passed`. `npx tsc --noEmit -p .` and `npm run lint`: clean.
- The e2e files that open the board, `npm run test:e2e -- live-board clock reactions-menu profile player-screens today.e2e boards friend-requests me.e2e account look.e2e feel calm shell`: `101 passed`, `3 failed (23.7m)`: `clock.e2e.ts:158` (a guest's run: "Name an animal" not found after Start), `friend-requests.e2e.ts:150` at desktop size (the starred friend's order on Friends today) and `me.e2e.ts:62` (30 s). Run again alone, `3 passed (35.7s)`. The guest test failed the same way in one earlier long run and passed alone then too; it opens no board. Taken as this PC's long-run flakiness, *unverified*; CI's run on the PR decides.
- Found by those runs and fixed before the review: the chip wrapped to two lines on a 320px row (its column was the stretching one; `boards.e2e.ts`, "a long name is cut…", 141px against 65px), and the ⋯'s picker opened past the card's left edge, under the side bar, when the ⋯ sat at the opened row's left (`live-board.e2e.ts`'s reaction picks could not be clicked). The ⋯ is at the opened row's right edge.
- Eleven older tests read the old row (the long chip texts, the name link, the ⋯ on a closed row); each now reads the closed row and opens it for the rest. None skipped. The checks that the ⋯ hides until hover and sits between the name and the chip on a phone are gone with that layout, replaced by: no ⋯ on a closed row, the ⋯ showing in an opened one, inside the row at 390px with no sideways scroll.
- Not looked at by eye by the agent: the row was measured by the tests. CI's `e2e-videos` show it.
- `verify-offbeat-run`, `verify-fragments-run`: not rerun; 25a reads runs and changes nothing about how one starts, is judged or ends.

## Review
- **25a** (the `reviewer` agent, 2026-11-28, read the working tree's diff; ran lint and the type check, no e2e and no db test): one blocking finding, fixed before the PR: no db test covered the place on a Fragments day, whose scores come by another path (`runTotals`). `substrings.db.test.ts` now asserts no place before the viewer has finished, none for a friend still playing, none for a viewer who hasn't finished, and 1 and 2 of 2 for two finished players from either side. Checked with no problem found: the place cannot reach a viewer who hasn't finished on any of the three kinds of day; `onStatus`'s reload; `open.ts` against the guide; no test weakened; no orphaned export or class; DESIGN.md's new line references. One stale comment at the top of `board.tsx` was corrected.
- Deferred to ROADMAP "Next revision" (For M25): the four non-blocking findings.
