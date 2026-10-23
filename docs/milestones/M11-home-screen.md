# M11 — Home screen

**Status:** in progress. Drafted 2026-10-22; H1–H8 and the minimum answered by the human, 2026-10-22 (H1 changed by them after a mockup in chat). The ticket is merged (PR #53). 11a is merged (PR #54, on all-green CI with the human's OK). 11b is in review (PR #55).

## Goal
The home page becomes the place a player opens every day: today's game with their streak, how many players gave each of their answers, a feed of today's comments from friends and groups that stays blurred until they've played, and the boards, in one plain layout (the look is M14).

## Who uses it / what breaks without it
- **Used by:** every signed-in player, every day. The home page is the only page a player sees unless they open a group or an invite link.
- **Breaks without it:**
  - Today the home page is every feature stacked in build order: game, friends today, leaderboard, comments, groups, account. Group comments are only on each group's page, so a player in three groups has to open three pages to see what was said.
  - Nothing rewards coming back daily. The streak is the one habit feature the human kept for the MVP (Design review, 4).
  - The rarity bonus already counts how many players gave each answer (M09), but the player never sees those counts, only a bonus number.
  - Three known problems are filed for M11 (ROADMAP "Next revision", For M11): the intro copy is wrong, an open page keeps yesterday after midnight, and a broken live connection shows only in the browser console (against "fail loudly").
- **The human's words:**
  - "A welcoming but neutral home: the day's games, friends' scores, comments and reactions to browse before playing (answers stay hidden until you've played) … The concept is worked out in the ticket" (2026-10-19);
  - "a feed of friends' comments and reactions, blurred until you've played that game" (2026-10-20);
  - Design review, 4 (2026-10-22, "can take your suggestion"): "a streak of days **played** (not survived) on the home screen, without freezes until the beta shows a need"; "the result screen shows how many players gave each answer, from the counts the bonus uses, above a minimum the M11 ticket asks for";
  - "all working features first. home screen friends screen groups, account etc. nothing visual comes until after things are functijnal" (2026-10-21).

## Claude's design (for the human to approve)
- **11a, your day:** the streak, how many players gave each of your answers on the result screen, and yesterday's leaderboard for the game card (H7). Server reads only; no new table.
- **11b, the feed:** today's comments and reactions from the friends thread and each of your groups, in one list, blurred until your run is over. Live through the existing nudges (M08 8d, M10 G5).
- **11c, the layout:** the home page reordered around the day: the game card at the top (H1; built so a second game's card can sit beside it, with the swipe waiting for game 2, H8), then the feed and the rest; the intro copy, and the For M11 fixes chosen in H6.

## Decisions needed before any code
| # | Decision | Claude's suggestion | Answer (origin) |
|---|---|---|---|
| H1 | **The layout.** What the home page shows, in what order, before and after you play | One page, top to bottom: **Today** (the game or your result, your streak, the countdown); **Feed** (11b); **Friends today** (the live board); **This week** (the friends leaderboard; each group's board stays on its page); **Groups** (your groups, Create); **Account**. Before you play, Today is the Start button and the feed is blurred. No tabs or new pages: navigation is M14's ("Navigation tabs … later, by the human", M14 Out of scope) | **Changed by the human** (2026-10-22: "layout at the top should be like the game, where u can swipe right or left to pick a different one. it should also contain the leaderboard from the previous day as well (global? or frinds/groups?"): the top is a game card you swipe between games, holding yesterday's leaderboard. Whose leaderboard is H7; the swipe with one game is H8; a mockup is in review with the human |
| H2 | **The feed and the friends thread.** (a) The feed **replaces** the home page's Comments section: it lists today's friends-thread and group comments together, each labelled "Friends" or with its group's name. The post box posts to the friends thread, a group comment links to its group page, and "Earlier day" stays for the friends thread. (b) The feed is **added** above the Comments section, which stays as it is, so friends' comments show twice | (a). One list of what was said today, and nothing shown twice. Posting in a group stays on its page, where its members and board are | **(a)** (human, 2026-10-22: "i also agree") |
| H3 | **"Blurred until you've played".** The feed before your run today is over. (a) **Who and how many, no text:** "Sam, Lee and 3 others commented; 7 reactions", with the comment text never sent to the page, so it can't leak through the page source. M14 makes it look blurred. (b) **Nothing**, as the Comments section does today (M08). (c) **The text, blurred by CSS:** it would be in the page, and anyone can read it from there | (a). It's what "blurred" means without a spoiler path: the server sends no text, the same rule M08 8d's nudges follow. Who commented says only that they finished, which the live board already shows ("finished (you'll see how once you finish)") | **(a)** (human, 2026-10-22: "that seems fine for now?") |
| H4 | **The streak.** (a) **What counts:** a day you **started** a run (Design review, 4: "played (not survived)"), finished or not. (b) **When it breaks:** the current streak counts back from today if you've played today, else from yesterday, so it doesn't drop to 0 each morning before you play; a day with no run breaks it. (c) **Days with no puzzle:** a day with no approved puzzle can't be played, so it doesn't break the streak. (d) **What shows:** your current streak only, on Today; no best streak, no friends' streaks | All four as written. (c) matters because puzzles are approved by hand (M06), so a missed approval would otherwise break every player's streak | **As suggested** (human, 2026-10-22: "also fine") |
| H5 | **How many players gave your answers.** On the result screen, beside each of your answers: (a) a **share**, "12% gave this" (the ROADMAP's own example: "12% picked lion"), or (b) a **count**, "3 of 25 players". Either way from the counts the bonus uses: players who answered that question today before midnight (M09 D8). Below the minimum (the Numbers table) it says "Too few players yet" | (a). A share means the same on a small day and a big day. The counts grow through the day, so the screen shows them as of when it loads ("so far") | **(a), a share** (human, 2026-10-22: "also fine") |
| H6 | **Which "For M11" fixes come in** (ROADMAP "Next revision") | **In:** the intro copy ("daily word games" on the home page and both invite pages, "keep your results" on the home page; `src/app/page.tsx`, `src/app/invite/[code]/page.tsx`, `src/app/groups/join/[code]/page.tsx`); every section of an open page moves to the new day at the reset, as the game already does from the result screen's countdown (M04; today the board and threads keep the old day); a load that answers after a newer one is dropped, so the page never goes back to older data; a live connection that's down shows "Live updates paused, reconnecting…" on the page, and the token fetch's failure is shown instead of falling back to the cached token ("fail loudly"). **Left in Next revision:** a friend whose time ran out shows "on question k" until the next fetch, because nothing is written when time runs out; changing that is a change to the game's writes, not the home screen | **As suggested** (human, 2026-10-22: "take H6 as you suggested") |
| H7 | **Yesterday's leaderboard on the game card** (from H1): whose. (a) **Friends**, with a chip for each of your groups to switch to that group's yesterday. (b) Friends only. (c) **Global**, every player | (a). Yesterday is closed, so its points are final (M09 D9) and show no spoilers. Global is out of scope for now (human, 2026-10-19; ROADMAP "Wait for beta data": "a global leaderboard"), and a public board needs moderation of names that friends and groups don't | **(a)** (human, 2026-10-22: "agree with friend by default and the other one yes") |
| H8 | **Swiping with one game** (from H1). There is one game until M16. (a) Build the card now, and the swipe with game 2, when there's something to swipe to (CLAUDE.md, "Build for today"). (b) Build the swipe now, with one card in it | (a). A swipe with one card has nothing to do, and game 2's card decides what the swipe must carry; the card itself is built so a second sits beside it | **(a)** (human, 2026-10-22: "i also agree we can just do that wait for more games") |

## Source
- PostgreSQL 17 (SOURCES.md): window functions and date arithmetic for the streak (11a); the queries the feed reuses (11b).
- Supabase Realtime (SOURCES.md, `/broadcast`): the feed reuses the board topic's nudges (M08 8d, M10 G5); no new topic or policy.
- Next.js (SOURCES.md): client components and data fetching for the reordered page, read from `node_modules/next/dist/docs/` before code (AGENTS.md).
- The human's decisions: ROADMAP "Design review", 4; the M04 (countdown), M08 (thread rules, D5, D6), M09 (counts, D8, N4) and M10 (G4, G5) tickets for the rules reused.

## Acceptance criteria
- [x] **11a** `GET /api/run` returns the current streak in the run state (H4): a db test (`src/game/streak.db.test.ts`) with runs on chosen days shows played today, played yesterday but not yet today, a gap, an unfinished run counting, and a day with no puzzle not breaking it.
- [x] **11a** Yesterday's leaderboard (H7), `GET /api/leaderboard/yesterday[?group=<id>]`: the points of yesterday, a closed day, for the viewer and their friends, or for one of the viewer's groups, through the 10a/10c board code over that one day; a route db test shows friends by default, a group's members when asked, a non-member's 404, and the M09 D5 exclusion; a signed-out player gets 401.
- [x] **11a** The result screen's data has each answer's share (H5) from the day's counts before midnight, and "too few" below the minimum: a db test (`src/game/shares.db.test.ts`) with players above and below the minimum on a question, no share while the run goes on, and a late answer after midnight left out (M09 D8).
- [x] **11a** The page shows them, in plain UI until 11c places them (e2e: the streak above the game, "too few players yet" beside an answer, and yesterday's friends standings with the Friends chip pressed).
- [x] **11b** `GET /api/feed` returns today's comments from the friends thread and every group the viewer is in, each with its thread, oldest first, with reactions, through `seesCommentSql` (M10 10d): a route db test (`src/app/api/feed/route.db.test.ts`) shows a friend's comment, a group member's who isn't a friend, nothing from a group the viewer isn't in or from a stranger's friends thread, a reported comment left out, and, before the viewer's run is over, names and counts only with no comment text anywhere in the response (H3); a signed-out player gets 401.
- [x] **11b** The feed reloads on a nudge for the friends thread or any of the viewer's groups (`changesThread` in `src/app/board-channel.ts`, unit tested), and the e2e test sees a group member's comment arrive on the other member's open home page, labelled with the group, through a request made after the nudge.
- [ ] **11c** The home page follows H1 before and after playing (e2e: the game card first, with Start before and the result after, and yesterday's board with a chip per group), with the intro copy fixed.
- [ ] **11c** Each H6 fix has a test: the day moves at the reset (unit test with a fixed clock), an older response arriving last is dropped (unit test), and a channel that's down shows the message (e2e, restarting Realtime as the reconnect test does).

## Out of scope
- The look, blur effects, navigation tabs (M14).
- Friends' streaks, best streaks, streak freezes (Design review, 4: "without freezes until the beta shows a need"), reminders and pokes (ROADMAP "Wait for beta data").
- Misses (ROADMAP Later), a curated feed, following games (only matters from game 2).
- Average score on a profile, and the all-time total (M12).
- More than one game on the home page: there is one game today (CLAUDE.md, "Build for today"; M16 notes where `game_id` is already at hand).

## Numbers
Every value this milestone needs, and where it comes from. A blank origin means stop and ask.
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| Minimum players who answered a question before its share shows | H5 | **5** (human, 2026-10-22: "Use 5 players as the minimum before an answer's percentage shows"; Claude's suggestion, the same as the bonus's minimum, M09 N4 `RARITY_MIN_PLAYERS`, and the insights report's "too few", M03) |
| The day boundary: midnight `America/Los_Angeles` | The streak's days, the reset (H4, H6) | human, 2026-10-17 (DECISIONS.md, Day boundary) |
| Feed size | 11b | None needed under H2 (a): the feed is today's comments only, like a day's thread, which has no cap today. If the human wants a cap, it's a number for here |

## Plan
1. ~~The human answers H1–H8 and the minimum.~~ Done, 2026-10-22.
2. **11a** streak and answer shares; **11b** the feed; **11c** the layout and the H6 fixes. One PR per sub-ticket from `m11-home-screen`.

## Removes
- **11b** (under H2 (a)): the home page's friends Comments section for today, now the feed (earlier days are still the friends thread); `changesThread`'s friends-thread-only case, which had no caller left; the groups e2e check that a group comment stays out of the home page (H2 (a) puts it there).
- **11c:** the home page intro's wrong copy; the three For M11 items H6 takes in.
- **11a:** the day's count query inside `settleRuns`, now `dayCounts` in `src/game/ledger.ts`, which the shares share rather than copy; the copies of `FINISHED` in `src/comments/comments.ts` and `src/reactions/reactions.ts` (one, exported from `src/game/runs.ts`, which needed it too); `weeklyBoard`'s own sum query, now `totals` over date ranges, which yesterday's board shares.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| 11a criterion: the streak from `GET /api/profile` "or the route H1 settles on" | In the run state, `GET /api/run` | **11a.** H1 puts the streak on the game card, and starting a run reloads the run state, so the streak goes up at once; the profile loads once per page |
| H5: "12% gave this" | A share under 1% reads "under 1% gave this" | **11a.** On a big day, an answer under 0.5% (1 of 300) would round to "0%" though the player gave it. A late answer, after midnight, has a share of 0 and reads the same: ROADMAP "Next revision", For M11 |
| Criteria 1 and 3: "a route db test" | Db tests of `getStreak` and `todaysState`, the function `GET /api/run` returns, in rolled-back transactions; the route-level `runs.db.test.ts` checks the new fields' shape (`streak: 0`, `share: null`) | **11a.** The cases need runs and answers on chosen past days and times, which the routes can't make (the answer triggers refuse past times), so they're written directly, as the ledger test does (M09). Reworded when ticked; recorded here after the review |
| H3 (a): "Sam, Lee and 3 others commented" | Friends are named; group members who aren't friends are counted in "others" | **11b.** H3's reason was that a name says only that someone finished, "which the live board already shows"; the board shows friends, not group members who aren't friends (M10 G3), so naming them would tell more |
| Source: PostgreSQL window functions for the streak | A `max` over the days with a puzzle the player didn't play, then a `count` after it | **11a.** One aggregate does it; no window function was needed |

## Evidence
**11a** (2026-10-23, on the local stack; no migration):
- **Streak** (criterion 1): `npx vitest run src/game/streak.db.test.ts` → `Tests 1 passed (1)`: 6 for every day with a puzzle back from today, past the day with none; 5 before playing today; 2 after a missed day; 1 when yesterday was missed; 0 with no runs. Every run there is unanswered, so unfinished runs count.
- **Yesterday's board** (criterion 2): `npx vitest run src/app/api/leaderboard --reporter=verbose` → `Tests 14 passed (14)`, with `yesterday/route.db.test.ts`'s five (friends by default and yesterday only, a group's members, the 404s, the D5 exclusion) and the 401 case; the friends and group board tests weren't edited and pass.
- **Shares** (criterion 3): `npx vitest run src/game/shares.db.test.ts` → `Tests 2 passed (2)`: with 4 players on question 1, no share; with 5, 0.8 for the answer 4 gave and 0.2 for the host's; none for question 2 (1 player) or while a run goes on; an answer after the day's midnight not counted.
- **The page** (criterion 4): `npx playwright test e2e/live-board.e2e.ts -g "spoiler"` → `1 passed (17.5s)`.
- **Everything else:** `npm test` → `Test Files 34 passed (34)`, `Tests 229 passed (229)`; `npm run lint` clean; `npx tsc --noEmit -p .` clean; `npm run test:db` → `Test Files 21 passed (21)`, `Tests 166 passed (166)`; `npm run test:sql` → `Result: PASS`; `npm run test:e2e` → `4 passed (44.0s)`. `src/game/runs.db.test.ts` gained `streak: 0` and `share: null` in its two exact-shape expectations, and `share.test.ts` the same in its fixture: new fields, nothing loosened.

**11b** (2026-10-23, on the local stack; no migration):
- **The feed** (criterion 1): `npx vitest run src/app/api/feed --reporter=verbose` → `Tests 5 passed (5)`: before V finishes, `{ friends: [F], others: 1, reactions: 1 }` and no "words" anywhere in the response; after, F's friends-thread comment and G's in Club, labelled, oldest first, with O's reaction counted, and V's own post added; O's comments in Other and in O's friends thread absent; a reported comment gone; 401 signed out.
- **Live** (criterion 2): `npx vitest run src/app/board-channel.test.ts` → `Tests 4 passed (4)`. `npx playwright test e2e/groups.e2e.ts` → `1 passed`; with the home page reloading only for its own thread (`changesThread(message, { group: "none" })` in `board.tsx`), it fails (`page.waitForRequest: Test ended`). The first version of this check didn't fail that way: one of the page's start-up loads could land after the post. Its hypothesis was wrong, so the check now waits for a feed request made after the nudge arrives.
- **Everything else:** `npm test` → `Test Files 35 passed (35)`, `Tests 230 passed (230)`; `npm run lint` clean; `npx tsc --noEmit -p .` clean; `npm run test:db` → `Test Files 22 passed (22)`, `Tests 170 passed (170)`; `npm run test:sql` → `Result: PASS`; `npm run test:e2e` → `4 passed (43.6s)`, with `live-board.e2e.ts` reading the home page's "Feed" region instead of "Comments" (renamed by H1/H2).

## Review
**11a** (reviewer, fresh context, 2026-10-23): no correctness or privacy bug found in the code.
- Blocking findings and how each was fixed: the ROADMAP row and the handoff were behind (updated in this PR); criteria 1 and 3 were narrowed from route tests to function tests when ticked, without a record (a Source diff row now says why).
- Deferred to ROADMAP "Next revision": the share differencing (For the human); a late answer's "under 1%" and yesterday's chips racing and keeping an old error (For M11, which 11c's out-of-order fix covers); `dayCounts` on every finished player's run-state read (For M15, the load test).
- Not deferred, under "Keep only what someone will act on": `getStreak` adds one small query per run-state read (one puzzle row per day, by the run's primary key).

**11b** (reviewer, fresh context, 2026-10-23): no correctness or privacy bug found: no comment text and no non-friend's name before the viewer finishes, and nothing from a group the viewer isn't in or a stranger's friends thread.
- Blocking findings and how each was fixed: the handoff was behind, and the Status line said "planned" while the ROADMAP said "in progress" (both updated in this PR).
- Deferred to ROADMAP "Next revision", For M11: the preview's wording ("N players", "1 other", "1 reaction") has no test, which 11c's before-playing e2e can give it.
- Not deferred, under "Keep only what someone will act on": a past day's region is still labelled "Feed" under a "Friends' comments" heading (11c redoes the layout); the e2e nudge listener watches one socket, so a reconnect would fail the test, never pass it; "Earlier day" from the feed has no e2e, as before 11b.
