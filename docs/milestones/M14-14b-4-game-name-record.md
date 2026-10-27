# M14 14b-4 — The game's name record

**Status:** drafted (2026-10-26, on the Mac), its guided questions answered (below); waiting for the human's approval. Built next, before 14b-3 (human, 2026-10-26, in this session: "Name record first (Recommended)").

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
- [ ] One record holds the game's ID (`"offbeat"`), shown name (`"Offbeat"`) and address (`/offbeat`), in a platform module, and `GAME_ID` comes from it: `grep` finds no other definition of the ID, no "Offbeat" in a player-facing string outside the record, and no `"/offbeat` link outside it (output recorded).
- [ ] The shared screens name no game: the feed's locked line and preview say "today's game", and Today's leaderboard card shows only the date (e2e).
- [ ] The game's own screens, its Today banner, the home page and the share text show the record's name, and every link goes to its address (e2e and unit; the share text's test reads the record).
- [ ] DECISIONS.md's Game 1 row and Log gain the rule: a game's `game_id` is a permanent neutral ID; its shown name and address live in its record and change freely. 14c-1's N2 is closed, pointing here.
- [ ] `npm test`, `npm run test:db` and `npm run test:e2e` pass; CI passes before merge.

## Out of scope
- Picking the new name (14c-1, N1), and the rename itself.
- A list or registry of games (M16, with game 2).

## Numbers
None expected.

## Plan
1. Approval of this ticket.
2. Build, test, review, one PR from `m14-look-and-feel` after PR #96 merges.

## Removes
The scattered "Offbeat" and `/offbeat` literals, `GAME_ID`'s home in `src/content/puzzle.ts`, and N2 from 14c-1's open questions.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
