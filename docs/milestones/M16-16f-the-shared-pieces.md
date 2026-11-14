# M16 16f — the shared pieces

**Status:** planned. Drafted 2026-11-13 from the human's answers 1 to 34 (`docs/milestones/M16-game-2-substrings.md`, "Answers for 16f"). **Not approved to build.**

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

**16f-1 — one shared streak; Me knows both games** (the split's answer 2; answers 2, 7).
- [ ] Starting either game today keeps the streak; a day with an approved day in only one game needs only that game; a day with none in either is skipped and breaks nothing (`src/game/streak.ts`, `src/game/me.ts:49-57`) → verify: db tests: Fragments alone yesterday and Offbeat today is a streak of 2; a day with no approved day in either game between two played days does not break it.
- [ ] Me's days played counts started runs in either game (answer 2; `src/game/me.ts:60`) → verify: a db test with one started, unfinished Fragments run counts 1.
- [ ] Me shows a Fragments card beside Offbeat's, and "All games" adds both (M14 L45; `src/app/me.tsx:87-112`) → verify: a db test of `/api/me` with runs in both games, and an e2e that finds both cards.

**16f-2 — Fragments' colour and Today's carousel** (answers 1, 5, 6, 16, 18, 25, 31).
- [ ] `--fragments: #5a2f5e` with white text, the same in every theme (answer 31) → verify: `src/app/colors.test.ts` checks white on it at 4.5:1 or more, and the focus ring at 3:1.
- [ ] Today shows one game card in front with a wide strip of the next, under a row "Today's games ‹ 1 of 2 ›" (answer 16, mock-up B); Offbeat is always card 1 and Fragments card 2 (answer 25); the unplayed game is in front on opening, Offbeat when both are played (answer 5) → verify: e2e: with Offbeat played and Fragments not, Today opens on "2 of 2"; the arrows and the keyboard move between cards (APG Carousel).
- [ ] Fragments' card mirrors Offbeat's (the day, the name, Play, Continue or the result) and adds "better than X% of players" after play once it is known (answer 18) → verify: e2e before and after a Fragments run.
- [ ] A day with an approved day in only one game shows that one card and no arrows (answer 7) → verify: e2e.
- **Stop and ask before the code:** how wide the peeking strip is (a number; mock-up B is in no repo), shown as pictures at phone and tablet widths.

**16f-3 — Fragments gets comments, reactions and Share** (the split's answer 3; answers 8, 21, 23, 34).
- [ ] Comments and reactions take the game: a Fragments day has its own thread, friends' and each group's, opened by finishing Fragments; reactions on a Fragments run and comment work as Offbeat's (`src/comments/comments.ts`, `src/reactions/reactions.ts`, their routes) → verify: db tests: a Fragments comment is not in Offbeat's thread; a player who has not finished Fragments cannot post to it.
- [ ] Fragments' result screen has the comment box and a Share button: "Fragments · date", the score, and one mark per round, found or missed, with no words or letters (answer 34; `src/game/share.ts`, `src/app/substrings.tsx`) → verify: a unit test of the share text on a hand-worked run; an e2e that posts a comment from the result.

**16f-4 — the feed's data** (the split's answer 4; answers 9 to 15, 21, 22, 30). Migration only if an index is needed for the pages; then the human's `db push`.
- [ ] `/api/feed` returns comments and friends' finished runs of both games, each tagged with its game, newest first, games mixed, 20 at a time (answer 30), from today back through earlier days (answers 10, 11, 15) → verify: db tests: 45 items come back as pages of 20, 20 and 5 with none repeated or missed when an item is added between pages; a page crosses from today into yesterday.
- [ ] For a game the viewer has not finished today, a friend's result today comes with its name and game and no result, score or words (answers 13, 22); a friend's comment comes whole (answer 21); earlier days come whole → verify: db tests that the hidden fields are absent from the reply, not only unshown, and appear once the viewer finishes that game.
- [ ] The viewer sees only what they may today: friends and fellow group members, never a blocked player either way → verify: db tests with a stranger, a blocked friend and a group-only member.

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
| The peek's width | Carousel | **Blank: ask at 16f-2, with pictures** |
| How near the end the next load starts | Feed | **Blank: ask at 16f-5** |

## Removes
Per step, listed in each pull request. Expected: the single-game `GAME_ID` in the streak, Me, comments, reactions, the feed and the board's reads; `broadcast_board`'s skip of game 2; the "waits for 16f" notes in `src/app/leaderboard.tsx`; the whole-day feed reply, replaced by pages.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
