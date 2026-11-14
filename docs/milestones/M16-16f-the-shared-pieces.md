# M16 16f — the shared pieces

**Status:** in progress. Drafted 2026-11-13 from the human's answers 1 to 34 (`docs/milestones/M16-game-2-substrings.md`, "Answers for 16f"). **Approved by the human (2026-11-13: "Approve 16f").** 16f-1 is merged (PR #205, 2026-11-14; the hosted `db push` is the human's). 16f-2 is merged (PR #206, 2026-11-14). 16f-3 is merged (PR #207, 2026-11-14). The human on 2026-11-14: "database is pushed" (19d's and 16f-1's migrations; not checked by any agent). 16f-4 is built, in its pull request, not merged (server only; no database change).

## Goal
Make the screens around the games work for two games: Today shows both, one streak counts either, and the feed, comments, reactions, boards, Me and Share know Fragments as well as Offbeat.

## Who uses it / what breaks without it
- **Used by:** every signed-in player, from the day Fragments has approved days.
- **Breaks without it:** Fragments can be played only from its own address: Today has no card or link for it (`src/app/home.tsx:591-625`). A day played in Fragments alone breaks the streak (`src/game/streak.ts:10-23`, game 1 only). Friends see nothing of a Fragments run: no board, no feed item, no comment, no share (`src/friends/board.ts`, `src/comments/feed.ts:31`, `src/game/share.ts`). The human wants both games in the beta (M16, Answers, 1).

## Source
- **The human's answers**, quoted in the M16 ticket: the split's 1 to 6 (2026-11-06) and 16f's 1 to 34 (2026-11-11 and 2026-11-13). Each step below names the answers it follows.
- `docs/DECISIONS.md`: Game 2 (lines 79-91: one shared streak, one feed tagged by game, comments per game); Log 2026-11-07 (`broadcast_board` skips game 2 until 16f; Today's card stays game 1's until 16f); Hard to reverse (run events, points ledger, day boundary), which 16f does not change.
- `docs/SOURCES.md`: Next.js (the bundled docs in `node_modules/next/dist/docs/`, read before any Next.js code, AGENTS.md); Supabase Realtime (`/broadcast`, `/authorization`) for the Fragments board; PostgreSQL 17 (queries, `LIMIT` and row comparisons) for the feed's pages; WCAG 2.2 AA (1.4.3, 1.4.11, 2.5.8) for the new colour and controls; WAI-ARIA APG Carousel ("WAI-ARIA Roles, States, and Properties", "Keyboard Interaction") for Today's carousel.
- **No source covers an endlessly scrolling list** (how a screen reader and a keyboard move through it). Step 16f-5 stops and asks for one before its code (CLAUDE.md, "Anchor to the source").

## Assumptions (say if any is wrong)
1. A friend's finished run becomes a feed item. Today the feed holds comments only (`src/comments/feed.ts`); answers 13, 14 and 22 speak of results in the feed, so results are new items. *Claude's reading.*
2. The feed keeps what it lists today (the friends thread and each of the viewer's groups, labelled by group) and adds the game's name to each item.
3. Earlier days' items are never blurred: those days are over (M16 ticket, Claude's reading under answer 15).
4. The feed and the carousel are for signed-in players. A guest's Today is unchanged.
5. From 768px the live board on Today follows the card in front (answer 4: "In a game you see friends playing that same game"); the Friends tab's board gets the same game switch as the leaderboard (answer 20). *Claude's reading, open to change.*
6. No step changes game 1's or game 2's rules, scoring, or the hard-to-reverse tables.

## Acceptance criteria and plan
One pull request per step, from `m16-game-2`, in this order. Each fix starts with a failing test. Steps 16f-4 and 16f-6 carry a database migration: **the hosted `db push` is the human's, after that step's merge.** Every merge publishes to plor.app.

**16f-1 — one shared streak; Me knows both games** (the split's answer 2; answers 2, 7, 35 to 39). Migration: drops `private.profile.calendar_numbers`; the human's `db push` after the merge.
- [x] Starting either game today keeps the streak; a day with an approved day in only one game needs only that game; a day with none in either is skipped and breaks nothing (`src/game/streak.ts`, `src/game/me.ts:49-57`) → verify: db tests: Fragments alone yesterday and Offbeat today is a streak of 2; a day with no approved day in either game between two played days does not break it.
- [x] Me's days played counts started runs in either game (answer 2; `src/game/me.ts:60`) → verify: a db test with one started, unfinished Fragments run counts 1.
- [x] Me shows a Fragments card beside Offbeat's with best score, average score and days played and a link to the game, no chart (answer 37; M14 L45; `src/app/me.tsx:87-112`) → verify: a db test of `/api/me` with runs in both games, and an e2e that finds both cards.
- [x] "points all time" adds Offbeat's points and Fragments' scores (answer 35) → verify: a db test on a hand-worked pair of days.
- [x] Me's calendar shades a day if either game was started, and no longer by questions survived (answer 36) → verify: a db test marks a Fragments-only day as played.
- [x] The "Numbers on the calendar" setting is gone: its switch, its saved value and its column (answer 39) → verify: a db test that the settings route refuses `calendarNumbers` as any unknown field and the profile's settings no longer carry it; pgTAP's grant list.
- [x] A profile's "All games" numbers count both games; a profile has no Fragments card (answer 38).

**16f-2 — Fragments' colour and Today's carousel** (answers 1, 5, 6, 16, 18, 25, 31, 40 to 42).
- [x] The games are shown as "Offbeat" and "Fragments" everywhere a name shows (answer 41; `src/platform/game.ts`); ids and addresses unchanged → verify: unit and e2e tests read the names from `src/platform/game.ts`; a grep finds no shown "Game 1" or "Game 2" left in `src`.
- [x] `--fragments: #5a2f5e` with white text, the same in every theme (answer 31) → verify: `src/app/colors.test.ts` checks white on it at 4.5:1 or more, and the focus ring at 3:1.
- [x] On phones Today shows one game card in front, 82% of the row (answer 40), with a strip of the next, under a row "Today's games ‹ 1 of 2 ›" (answer 16, mock-up B); Offbeat is always card 1 and Fragments card 2 (answer 25); the unplayed game is in front on opening, Offbeat when both are played (answer 5) → verify: e2e: with Offbeat played and Fragments not, Today opens on "2 of 2"; the arrows and the keyboard move between cards (APG Carousel).
- [x] Fragments' card mirrors Offbeat's (the day, the name, Play, Continue or the result) and adds "better than X% of players" after play once it is known (answer 18) → verify: e2e before and after a Fragments run.
- [x] A day with an approved day in only one game shows that one card and no arrows (answer 7) → verify: e2e.
- [x] Once the cards' own row is 768px wide the two sit side by side with no arrows; a tablet, where the sidebar leaves less, keeps the carousel (answers 42 and 43) → verify: e2e: at a 768px window the carousel and an unbroken name; at 1100px both cards visible and no arrows.

**16f-3 — Fragments gets comments, reactions and Share** (the split's answer 3; answers 8, 21, 23, 34).
- [x] Comments and reactions take the game: a Fragments day has its own thread, friends' and each group's, opened by finishing Fragments; reactions on a Fragments run and comment work as Offbeat's (`src/comments/comments.ts`, `src/reactions/reactions.ts`, their routes) → verify: db tests: a Fragments comment is not in Offbeat's thread; a player who has not finished Fragments cannot post to it.
- [x] Fragments' result screen has the comment box and a Share button: "Fragments · date", the score, and one mark per round, found or missed, with no words or letters (answer 34; `src/game/share.ts`, `src/app/substrings.tsx`) → verify: a unit test of the share text on a hand-worked run; an e2e that posts a comment from the result.

**16f-4 — the feed's data** (the split's answer 4; answers 9 to 15, 21, 22, 30, 44, 45). Finished runs in the feed are the viewer's friends' and the viewer's own (answers 44, 45); comments are the friends thread's and each of the viewer's groups', as today. No migration: no index was added (the cost on a long history is in ROADMAP, Next revision).
- [x] `/api/feed/items` (new, beside the old `/api/feed`, which 16f-5 removes with its screen) returns comments and friends' finished runs of both games, each tagged with its game, newest first, games mixed, 20 at a time (answer 30), from today back through earlier days (answers 10, 11, 15) → verify: db tests: 45 items come back as pages of 20, 20 and 5 with none repeated or missed when an item is added between pages; a page crosses from today into yesterday.
- [x] For a game the viewer has not finished today, a friend's result today comes with its name and game and no result, score or words (answers 13, 22); a friend's comment comes whole (answer 21); earlier days come whole → verify: db tests that the hidden fields are absent from the reply, not only unshown, and appear once the viewer finishes that game.
- [x] The viewer sees only what they may today: friends and fellow group members, never a blocked player either way → verify: db tests with a stranger, a blocked friend and a group-only member.

**16f-5 — the feed on Today** (answers 9, 12, 14, 19, 23, 26, 27, 29). **Stop first:** ask the human for a source on endless lists for keyboards and screen readers.
- [ ] The feed sits under the carousel and loads the next 20 as the player nears its end (answers 9, 12) → verify: e2e with 45 seeded items reaches the last.
- [ ] A blurred item shows the name, the game and a "Play to see" prompt, and opens that game (answers 14, 26); it clears when the player finishes that game (answer 22) → verify: e2e.
- [ ] Every item, result or comment, has the reaction menu (answer 27); a date line marks where each earlier day begins (answer 29) → verify: e2e reacts to a result item; a date line stands between today's and yesterday's items.
- [ ] A comment box at the top of the feed posts to a game the writer has finished, chosen in the box (answer 23) → verify: e2e; a db test refuses an unfinished game.
- [ ] On phones the leaderboard card is off Today (answer 19); from 768px it stays → verify: e2e at 375px and 768px.
- **Ask at this step:** the exact words on a blurred item and on the date line.

**16f-6 — the boards** (answers 4, 20, 24, 33). Migration: `broadcast_board` stops skipping game 2. A change to what is broadcast is recorded in DECISIONS.md and **proposed to the human before the migration is written** (CLAUDE.md, Security).
- [ ] Fragments has its own friends' live board: a friend shows "on round k of 7" while playing and their score once they and the viewer have finished (answer 33); nothing of a friend's words or running score is sent before then → verify: db tests of the board's reply and of the broadcast's payload for a Fragments run; pgTAP for the trigger.
- [ ] From 768px Today's board is the front card's game; the Friends tab's board and Today's leaderboard card have the game switch, Offbeat, Fragments, Overall for the leaderboard (answer 20; `src/app/leaderboard.tsx:125-160`, `/api/leaderboard/yesterday`) → verify: db test of yesterday's board for Fragments; e2e of the switch on the card.
- [ ] On phones the live board stays as it is (answer 24) → verify: the existing e2e pass unchanged.

**After every step:** game 1's existing unit, database and e2e tests pass unchanged, or the step says which changed and why.

## Out of scope
- **Replies to a comment** (answers 28 and 32: "Leave replies out"): after the beta; recorded in ROADMAP, Next revision.
- A fix for the late live board (M19, answer 19: "Leave it for the beta").
- A guest's Today, and Fragments on another player's profile (DECISIONS.md, Log 2026-11-12, E4: "Game 1 only for now").
- Game 2's look (16g) and rules; games 3 and later; a third card in the carousel.
- Group boards: they already offer Fragments and Overall (`src/app/groups.tsx:277`).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 20 | Feed items per load | Human, 2026-11-13, answer 30: "20" |
| `#5a2f5e`, white text | Fragments' card | Human, 2026-11-13, answer 31: "A. Plum" |
| 4.5:1 and 3:1 | Text and focus ring on the card | WCAG 2.2, 1.4.3 and 1.4.11 |
| 7 | Rounds in "on round k of 7" | The game's rounds as built (M16 16b), read from the day, not typed in |
| Players before a percent shows | Fragments' card after play | As the result screen's today (`src/config/tunables.ts`, S17); no new value |
| 280 | A comment's longest length | As built (`private.comment`, M08); unchanged |
| 82% | The front card's share of the row on phones | Human, 2026-11-14, answer 40: "B. Medium, front card 82%" |
| 768px | The cards' row width from which they sit side by side | The app's tablet width as built (`src/app/min-width`, M14), measured on the row, not the window; answers 42 and 43 ("Side by side only with room") |
| How near the end the next load starts | Feed | **Blank: ask at 16f-5** |

## Removes
Per step, listed in each pull request. **16f-4:** nothing: a new reply beside the old one, whose removal is 16f-5's. **16f-3:** the single game in comments' and reactions' reads and writes (`getThread`, `postComment`, `setReaction`, `runReactions` take the game); requests to `/api/comments` and `/api/reactions` without `game` (protocol 7); game 1's private `Share` in `game.tsx` (now `ShareResult` in `share.tsx`, for both games). **16f-2:** the shown names "Game 1" and "Game 2", and the strings that hard-coded them on the About page, the admin puzzles pages and in three e2e files; Today's lone banner (`TodayBanner` now sits in `TodayCards`). **16f-1:** the game-1-only days in the streak and Me (two copies, now one `playedDays`); days played as finished runs; the calendar's four-step shading, its legend and `.shade1` to `.shade3`; the "Numbers on the calendar" setting: its switch and words, `calendarNumbers` in the profile's settings, the `numbers` props, the `--on-shade-*` slots and their colour check, its e2e test, the Privacy page's mention, and the column `private.profile.calendar_numbers` with its grants. Expected: the single-game `GAME_ID` in the streak, Me, comments, reactions, the feed and the board's reads; `broadcast_board`'s skip of game 2; the "waits for 16f" notes in `src/app/leaderboard.tsx`; the whole-day feed reply, replaced by pages.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| CLAUDE.md, Build for today: nothing without a current caller | `GET /api/feed/items` has no screen calling it until 16f-5 | The approved ticket splits the feed's data (16f-4) from its screen (16f-5); the old `/api/feed` stays until then, and 16f-5 removes it |
| Answers 13 and 22: a friend's result for a game the viewer hasn't finished is blurred | A blurred item still says the friend finished, and when; the live board says only "started" to such a viewer | The item is the human's intended blur ("Name and game show, result blurred"); the time is the run's end, which names no question |

## Evidence
**16f-4** (2026-11-14).
- Failed first: with the new module and route moved aside, `npm run test:db -- -t "the feed's pages"`: "Cannot find module '/src/app/api/feed/items/route'". With them back: 10 of 10. As a check that the tests bite, the block filter and the blur were taken out of the SQL: 3 tests failed (paging, visibility, blur); put back.
- After: the whole `npm run test:db`: "Test Files  62 passed (62)", "Tests  467 passed (467)" (run again by the lead after the builder's last lint fix). `npm test`: 765 passed. `npx tsc --noEmit -p .` and `npm run lint`: clean. No existing test changed. No migration, no grant; the protocol stays 8 (a new route; no existing request or reply changed).
- The reply, `GET /api/feed/items?cursor=`: `{ ok, feed: { items, next } }`, `next` null at the end. A comment item: `kind, game, date, at, username, name, mine, id, body, group, reactions`. A result item: `kind, game, date, at, username, name, mine, userId, blurred: false`, with `ended` (the board's own, Offbeat) or `score` (Fragments), and `reactions`. A blurred one: `kind, game, date, at, username, name, mine, userId, blurred: true` and nothing else (a test asserts the exact keys). A malformed cursor: 400 `bad_request`; signed out: 401.
- Who: results are the viewer's own and their current friends' finished runs (`circleSql`), never a player on either side of a block, a stranger or a group-only member; comments are `seesCommentSql` and the reports filter, unchanged, for both games, with the group's label; comment bodies always come (answer 21); today's results of a game the viewer hasn't finished are blurred, earlier days never. "Finished today" is read per game from `private.run_status` and `private.today()`, nothing from the client.
- Order: newest first by a time and a tiebreak, paged by a cursor of both (20 a page, `FEED_PAGE_SIZE`, answer 30). A comment's time is when it was posted; a caught or survived Offbeat run's, its last answer's; a timed-out one's, the deadline the status view computes (`private.question_deadline`); a Fragments run's, its last word's, or that round's deadline.
- **Known limits:** a run that times out is given a past time when it is first read as over, so it can appear above a page already read (as M19 19f found, nothing is written when time runs out). Each page sorts all the viewer's visible comments and circle runs, with no time index: not measured on a long history.
- **No test:** an item whose time falls on a later day than its puzzle day; a hand-made cursor pointing at hidden data; a comment item of a group-only member carrying no `userId` (true by reading). **Not verified:** the query's plan; anything on a screen (none in this step).
**16f-3** (2026-11-14).
- Failed first: the new `src/app/api/comments/substrings.db.test.ts` ("Fragments' comments and reactions"): 8 of 9 failed (a Fragments comment showed in Offbeat's thread; a post to a game the player hadn't finished got 201; a request with no `game` got 200). `src/game/share.test.ts` (`substringShareText`): 3 of 8 failed, "not a function".
- After: that file 9 of 9. The whole `npm run test:db`: 61 files, 457 passed. `npm test`: 67 files, 764 passed. `npx tsc --noEmit -p .` and `npm run lint`: clean. No migration: `private.comment`, `private.reaction` and `private.run_status` already carry the game.
- In a browser, locally: `e2e/play2.e2e.ts` 9 of 9, twice in a row (after a whole run: the comment box, a posted comment in Fragments' thread, Share's copied text); `e2e/comments-and-undo.e2e.ts`, `reactions-menu.e2e.ts`, `today.e2e.ts`: 10 of 10; `groups.e2e.ts`: 2 of 2.
- The protocol is 8 (`src/lib/protocol.ts`): `/api/comments` (GET, POST) and `/api/reactions` (POST) take `game`, `offbeat` or `substrings`, and refuse another or none with 400 `unknown_game`, read by the leaderboard's own reader (`readGame`, `src/friends/leaderboard.ts`). Delete and report key by the comment's id and need none. A page left open across the publish is told to reload (409 `client_outdated`), as at every protocol change.
- Share's text for a hand-worked run (words in rounds 1 and 2, five missed, 255 points): "Fragments · Nov 14", a line break, "🟩🟩⬜⬜⬜⬜⬜ 255", then the link line. A timed-out round and a refused word are both a missed round.
- Words added: "Fragments comments", the thread's heading. Share and Copied are game 1's.
- Changed expectations: every comment and reaction request in the db tests now sends `game` (comments, groups, feed, block, reactions, admin reports); none loosened.
- **Not live:** Fragments' thread shows a friend's new comment or reaction on load or when the run ends, not as it happens (the broadcast is 16f-6's). **No screen yet:** a group's Fragments thread (server and db tests only; Groups shows Offbeat's) and a reaction on a friend's Fragments run (db test only; its button comes with 16f-6's board). **A guest's Fragments result has no Share**, as before (`e2e/guest-play.e2e.ts`). **Not verified:** the page by eye.
**16f-2** (2026-11-14).
- Failed first: `npm test -- src/app/colors.test.ts src/app/today-games.test.ts`: four failures in `colors.test.ts` (no `--fragments` yet) and `today-games.test.ts` could not import its rule.
- After: `npm test`: 67 files, 761 passed. The whole `npm run test:db`: 60 files, 448 passed. `npx tsc --noEmit -p .` and `npm run lint`: clean. No migration; no new or changed reply (Today reads the player's own `/api/run` and `/api/substrings`).
- In a browser, locally: `npm run test:e2e -- e2e/today-games.e2e.ts`: "4 passed" twice in a row (the phone carousel at 82%, opening on the game left to play, the arrows and keyboard; side by side at 768px with no arrows; one card on a one-game day; Fragments' card before, during and after a run). `e2e/today.e2e.ts e2e/shell.e2e.ts e2e/me.e2e.ts`: 16 passed, 1 failed: `today.e2e.ts:105` timed out at 30s mid-`befriend` and passed alone (26.3s); cause not found, treated as flaky.
- Found by running the e2e, and fixed in the test: its tests left a Fragments run behind, so the next could not remove its day (now an `afterEach` closes the pages and deletes this file's players' runs); `noArrows` counted every "N of M" on the page. The server logged "Cannot read properties of undefined (reading 'total')" once: by reading, `standingToday` (`src/game/substring-places.ts`) when the viewer's run row is deleted between two reads, which only the test did; not reproduced, no source changed.
- Looked at in screenshots (phone 390px, tablet 768px, 1100px), sent to the human. The first tablet shot showed "Fragments" broken across two lines side by side: answer 43, test first ("expect(locator).toBeVisible() failed … getByText('1 of 2')" at 768px), then `npm run test:e2e -- e2e/today-games.e2e.ts`: "4 passed" three times.
- Words added (the builder's, for the human to confirm): on Fragments' card, "7 rounds" (the count read from the day), "20 seconds each" (as `/play2`'s own sentence), "Your run is still going", "N points", "better than X% of players"; the row "Today's games", the arrows "Previous game" and "Next game", "1 of 2".
- **Not verified:** the cards after a run, by eye; the Privacy page and admin words for a name that now reads wrong in its sentence; whether any test of the share text expects the old name (the suites pass).
**16f-1** (2026-11-13).
- Failed first: `npm run test:db -- -t "the streak of days played"`: "AssertionError: expected 1 to be 2" (Fragments alone yesterday, Offbeat today). `-t "the Me tab with both games"` (new, `src/app/api/me/fragments.db.test.ts`): totals came back `{points:125, daysPlayed:0, streak:1, longestStreak:1}` against `{315, 4, 4, 4}`. `-t "the player's settings"`: 10 failed, the first on the profile still carrying `calendarNumbers` (the other nine on that first test's sign-in).
- After: the whole `npm run test:db`: 60 files, 448 tests passed. `npx supabase test db`: PASS, 791 tests. `npm test`: 752 passed. `npx tsc --noEmit -p .` and `npm run lint`: clean.
- The migration `20261114071510_drop_calendar_numbers.sql` (`alter table private.profile drop column calendar_numbers;`) is applied to the local database. `plor_app`'s column grants on `private.profile` after it: the same list less `calendar_numbers`' SELECT and UPDATE.
- Changed expectations: `daysPlayed` 5 → 6 in `src/app/api/me/route.db.test.ts` (today's started, unfinished run counts now); `month.days` gains `played`; the e2e's played-day colour is the strongest shade. Deleted with the setting: the `--on-shade-*` colour check and the e2e "Numbers on the calendar shows each played day's questions survived"; two e2e that used its switch use "Skip the game screen".
- Words added: on Fragments' card, the game's shown name (today "Game 2", `src/platform/game.ts:17`), "best score", "avg. score", "days played", and the link "Game 2's game screen". The card has no colour block until 16f-2 adds `--fragments`. Fragments' best and average come from its ledger, so a day's score shows once the day is closed, as Offbeat's best does.
- **Not run:** the e2e (CI). **Not verified:** Me and a profile in a browser. **No test:** a stranger's or a friend's totals counting Fragments.

## Review
- Blocking findings and how each was fixed: 16f-4 (the `reviewer`, 2026-11-14, one pass, by reading, on what leaves the server): none. 16f-3 (the `reviewer`, 2026-11-14, one pass, by reading, on who may read and write what): none. 16f-2 (the `reviewer`, 2026-11-14, one pass, by reading): the strip's `gap: 16px` had no stated origin; it is the gap between Today's sections (`today.module.css`), now said in a comment; not re-reviewed. 16f-1 (the `reviewer`, 2026-11-13, two passes, by reading: the streak and Me, then the setting's removal): none. The first pass asked for the human's word on a profile's totals counting Fragments: answer 38.
- Deferred to ROADMAP "Next revision": 16f-4: four items (For M16). 16f-3: three items (For M16); the reviewer's fourth, a cross-game reaction test, is already there (`substrings.db.test.ts:206`: 404 `comment_not_found`). 16f-2: seven items (For M16). 16f-1: six items (For M16).
