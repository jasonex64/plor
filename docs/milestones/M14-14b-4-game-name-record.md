# M14 14b-4 — The game's name record

**Status:** approved (human, 2026-10-26: "Approve the 14b-4 ticket as drafted and build it now"); built and reviewed, in review in PR #97. Built next, before 14b-3 (human, 2026-10-26, in this session: "Name record first (Recommended)").

## Goal
Offbeat's shown name and address live in one record, with its permanent ID, so 14c-1's rename (N1) changes one place, and screens shared by every game carry no game name.

## Who uses it / what breaks without it
- **Used by:** 14c-1, whose N1 renames the game; M16, whose game 2 needs a record of its own; every player, on the screens that name the game.
- **Breaks without it:** "Offbeat" is written out in 24 player-facing lines and `/offbeat` in 11 links (read 2026-10-26), so a rename touches each, and a missed one shows the old name. Shared screens name the game (`src/app/leaderboard.tsx:107-108`, `src/app/comments.tsx:177`, `src/comments/preview.ts:25`), against 14c-1 round 4's "Plain on shared screens". The codebase audit (`docs/audits/2026-10-26-codebase-audit.md` on `m13-answer-lists-and-content`; findings FUT-4, DB-11, DOM-1, DOM-9, APP-5) found the same.

## What the human decided
In the audit session's guided questions (human, 2026-10-26, relayed by that session's note `audit-2026-10-26-for-M14.md`, "Answered by the human"; recorded here as asked, "Notes until 14c-1 starts"):

| Question | The human's answer |
|---|---|
| 14c-1's N2: the internal ID `offbeat` after the rename | "Keep it (Recommended)" |
| The address after the rename | "The new name": plor.app/<new name>, no redirect |
| Games 2–6: a permanent ID apart from the shown name | "Neutral IDs (Recommended)" |
| Where a game's shown name lives | "One place, in 14c-1": one record per game, its ID, shown name and address |
| When the record is built, with N1 still open | "Build it now, as Offbeat" |
| What shared screens (Today, the shared feed, the overall leaderboard) say | "No game name", as in "Finish today's game to read comments" |
| Who builds it | "M14 session, next": M14's next small sub-ticket, after 14b-2c-4, before 14b-3 |

In this session: "Name record first (Recommended)" (human, 2026-10-26), confirming the order.

This sub-ticket's guided questions (human, 2026-10-26, in this session):

1. **Today's leaderboard card** ("Fri 23 Oct · Offbeat"): "Yes, drop the name (Recommended)": a shared screen, so it says only the date.
2. **Offbeat's banner on Today, and the home page's "Today's game: Offbeat"**: "Keep it, from the record (Recommended)": the game's own card and introduction name it, from the record.
3. **The address and the route folder**: "Rename by hand at N1": the record holds the address the links use; 14c-1's rename moves `src/app/offbeat/` with it, by hand, with no test tying them.
4. **Recording**: "In this ticket and DECISIONS (Recommended)": quoted here, DECISIONS.md's Game 1 row gains the permanent-ID rule, and 14c-1's N2 closes, pointing here.

## Source
- Next.js App Router (SOURCES.md; the bundled `dynamic-routes.md` and routing guides): a route is a folder, so the address can't come from a record alone.
- DECISIONS.md, Game 1 and Hard to reverse: `game_id` is stored on every run, run event, ledger row, comment and reaction.

## Draft design (for this sub-ticket's guided questions)
- One record for the one game, in a platform module (not Offbeat's format module, audit DOM-1): its ID `"offbeat"` (permanent), its shown name `"Offbeat"` until N1, and its address `/offbeat`. `GAME_ID` comes from it, so there's still one game ID. No list of games until game 2 (build for today).
- The game's own screens, its banner on Today, the home page's introduction and the share text read the shown name; every link to the game reads the address. The route stays the folder `src/app/offbeat/`, which N1 renames by hand (answer 3).
- Shared screens drop the name: `src/comments/preview.ts:25` and `src/app/comments.tsx:177` become "today's game", and Today's leaderboard card says only the date (answer 1).
- e2e selectors that read "Offbeat" are updated, not loosened.
- Internal names that follow the ID stay: `content/offbeat/`, `next.config.ts`'s paths, component names such as `OffbeatScreen`.
- DECISIONS.md, Game 1 / Hard to reverse: a game's `game_id` is a permanent neutral ID; its shown name and address live in its record and change freely.

## Acceptance criteria
- [x] One record holds the game's ID (`"offbeat"`), shown name (`"Offbeat"`) and address (`/offbeat`), in a platform module, and `GAME_ID` comes from it: `grep` finds no other definition of the ID, no "Offbeat" in a player-facing string outside the record, and no `"/offbeat` link outside it (output recorded).
- [x] The shared screens name no game: the feed's locked line and preview say "today's game", and Today's leaderboard card shows only the date (e2e).
- [x] The game's own screens, its Today banner, the home page and the share text show the record's name, and every link goes to its address (e2e and unit; the share text's test reads the record).
- [x] DECISIONS.md's Game 1 row and Log gain the rule: a game's `game_id` is a permanent neutral ID; its shown name and address live in its record and change freely. 14c-1's N2 is closed, pointing here.
- [x] `npm test`, `npm run test:db` and `npm run test:e2e` pass; CI passes before merge.

## Out of scope
- Picking the new name (14c-1, N1), and the rename itself.
- A list or registry of games (M16, with game 2).

## Numbers
None expected.

## Plan
1. Approval of this ticket.
2. Build, test, review, one PR from `m14-look-and-feel` after PR #96 merges.

## Removes
24 player-facing "Offbeat" literals and 11 `/offbeat` links (now the record's), `GAME_ID`'s definition in `src/content/puzzle.ts` (moved to `src/platform/game.ts`), `src/content/bank.ts`'s own `"offbeat"`, the shared screens' game name, and N2 from 14c-1's open questions.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| The audit's draft: a test ties the route folder to the record's address | No test; the folder is renamed by hand at N1 | Answer 3, "Rename by hand at N1" |
| Shared screens name no game | The feed's "Finish today's game to read N comments" still links to the game's address | One game: the link is the record's `path`; with game 2 it needs a target of its own (M16) |
| The record holds the ID, the name and the address | Internal identifiers that follow the ID stay as they are: the view kind `"offbeat"`, ButtonLink's `tone`, section `id`s, `content/offbeat/`, component names | They name the game's code, not what players see, and the ID is permanent (answer, "Keep it (Recommended)") |

## Evidence
On the Mac, 2026-10-26, against the shared local stack:

- Criterion 1, the record (`src/platform/game.ts`) as the one place:
  - Definitions of the ID, `grep -rnE "GAME_ID\s*=|\bid: \"offbeat\"" src scripts`: `src/platform/game.ts:7` (`GAME`) and `:10` (`GAME_ID = GAME.id`) only. Test fixtures still write `game_id: "offbeat"` in five files (`src/test/answer-fixture.ts`, the puzzle, bank, insights and validator tests; none outside tests) and in `supabase/tests/*.sql`: they're stored rows written out as test data, not a definition the app reads.
  - Player-facing "Offbeat" outside the record (code lines, not comments or component names): `0`. Links written as `"/offbeat`, `` `/offbeat `` or `/offbeat#` outside it: `0`.
  - `npm run content:validate` → `CONTENT OK content: 1 file(s)`: the scripts load the record through their relative `.ts` imports.
- `npx tsc --noEmit -p .` and `npx eslint .` clean; `npm test` → `Tests  390 passed (390)`; `npm run test:db` → `Tests  266 passed (266)`; `npx playwright test` → `60 passed (2.1m)`.
- Criteria 2 and 3: `today.e2e.ts` checks the leaderboard card is dated and names no game (`not.toContainText(GAME.name)`), and its feed link reads "Finish today's game to read 1 comment" and goes to the record's address; `groups.e2e.ts` and `player-screens.e2e.ts` check "Finish today's game to join in."; `player-screens.e2e.ts`'s card checks are anchored to the date alone; `share.test.ts` builds its expected text from `GAME.name`. After the review's fixes: `today.e2e.ts` → `4 passed (8.9s)`, `share.test.ts` → `5 passed (5)`.
- Criterion 4: DECISIONS.md's Game 1 "Name and ID" and its Log row; 14c-1's N2 closed, pointing here.

## Review
By the `reviewer` agent in a fresh context, 2026-10-26.

- Blocking findings and how each was fixed: none in the code. The Evidence and the criteria weren't filled in yet: done above, with the fixtures' `"offbeat"` explained.
- Fixed as well, small defects of this change's own: `today.e2e.ts` checked the literal "Offbeat", which would pass without testing anything once the game is renamed (it reads `GAME.name` now); a double blank line left in `src/content/puzzle.ts`; `src/comments/feed.ts`'s 162-character comment line, rewrapped; `share.ts` and its test importing the record by a relative path where the app uses `@/`.
- Deferred to ROADMAP "Next revision": none.
