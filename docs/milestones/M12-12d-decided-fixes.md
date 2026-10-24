# M12 12d — The decided fixes

**Status:** drafted for approval (2026-10-24). D1–D3 wait on the human; D1 is a security change.

## Goal
Three review findings from finished milestones are closed before the MVP line, as the human decided on 2026-10-23: the live board shows nothing about a friend's progress until you've finished, every admin deletion of a comment leaves a record, and a group's boards count a member only from the day they joined.

## Who uses it / what breaks without it
- **Used by:** every player with friends (the live board), every group member (its boards), and the human as admin (the record).
- **Breaks without it** (ROADMAP "Next revision", "Decided by the human, 2026-10-23"):
  - **The live board spoils the catch.** Before you finish, a friend goes from "on question 3" to "finished", which tells you which question caught them (M07 7c review). The human: "hide progress until you've finished".
  - **Nobody can tell which admin deleted which comment.** There is no log line or record (M08 8c review). The human: "add record of which admin does it".
  - **Joining a group brings your whole week with you.** Someone who joins on Saturday brings Monday to Friday's points (M10 10c review). The human: "only count after they join".
- **Settled already** (human, 2026-10-23: "Accept Claude's suggestions for all eight decisions"): before you finish, a friend shows only "not started" or "started", and the rest once you've finished; the record keeps which admin, which comment, its author, its text and when, and admins see it as a list on the existing admin page; a member counts from the puzzle day they joined, the join day included.

## Source
- **Supabase Realtime** (SOURCES.md): `/broadcast`, the server sends with `realtime.send` from a database function (M07 D6). Unchanged in kind: only who gets which message changes.
- **PostgreSQL 17** (SOURCES.md): `CREATE FUNCTION` (`SECURITY DEFINER`, a fixed `search_path`), `CREATE TRIGGER`, data-modifying statements in `WITH` ("Data-Modifying Statements in WITH", for a delete and its record in one statement), aggregate `FILTER`.
- **Next.js 16.4.2** (SOURCES.md): route handlers, read from the bundled docs before the admin route is written.
- **DECISIONS.md:** Real-time transport; Row-level security in `private`; the Log rows for M07 D5/D6, M08 D5 and M10 10b. **M00 data design §2:** a breaking API change bumps `x-protocol`; a payload the client doesn't know (`v`) is logged and refetched.

## Claude's design (for the human to approve)
- **The live board.**
  - **Server:** `GET /api/board`, for a viewer who hasn't finished today, gives each friend `not_started` or `started`, with no question. Once the viewer has finished, it gives today's full picture (`playing` on question n, or how the run ended), unchanged.
  - **Live messages:** today every start, answer and Next sends the friend's new state to each friend's topic. From 12d, a friend who hasn't finished gets **one** message, when the run starts (`started`). A message per answer would show the friend's progress by its count and timing. A friend who has finished gets every message, as now, and the player's own topic too. The page already refetches the whole board when the viewer's own run ends.
  - **Versions:** the board's answer gains a state an older page doesn't know, so `x-protocol` goes from 4 to 5 (M00 §2), and the message `v` from 1 to 2 (an old page logs it and refetches).
  - **Edge, accepted in the design:** if the viewer finishes at the same moment a friend answers, the friend's message can be judged against the viewer's unfinished state and skipped. The viewer's own refetch after finishing still shows the friend as of that moment, and the friend's next message brings the board up to date.
- **The deletion record.** A new table `private.comment_deletion`, with the admin, the comment's ID, its author, its day and thread (friends or a group), its text, and the time. The admin's delete and its record happen in one statement, so neither can happen without the other. `/admin/reports` gets a "Deleted comments" list, newest first: when, which admin, the author, the text. The admin and author are shown by their current username.
- **Group boards.** In a group's weekly boards (this week and last), a member's ledger rows count only on puzzle days from `private.day_of(joined_at)` on. The friends board is unchanged; it wasn't part of the decision.

## Decisions needed before any code
| # | Decision | Claude's suggestion | Answer (origin) |
|---|---|---|---|
| D1 | **How the record is written (security change).** (a) **A function with its owner's rights,** `private.delete_reported_comment(admin_id, comment_id)`, which checks the admin, deletes a reported comment and writes its record in one statement. `plor_app` may execute it and may only read the record table. (b) `plor_app` gets INSERT and SELECT on the record table, and the route writes both in one statement | (a). App code can't write a record without the deletion, or a false one, and it matches 12c and 12e (a function `plor_app` executes, nothing written directly). The admin check stays in the route too, so a non-admin learns nothing from the body (M08 8c) | |
| D2 | **The record when an account is deleted.** 12c deletes everything tied to an account (A5), and the privacy page says so. (a) **The record goes with the author's or the admin's account** (cascade). (b) It stays, with the author or admin shown as a deleted player: the privacy page would then say that admins keep the text of a comment they deleted | (a). It keeps the privacy page's promise as written, and the only admin today is the human. (b) keeps a fuller trail, but it keeps text from a deleted account | |
| D3 | **Yesterday's group standings** (the home page's game card, M11 H7) are a group board too. (a) **The same rule:** a member counts only if they joined on or before yesterday's puzzle day. (b) Weekly boards only | (a). Otherwise someone who joins today shows up in yesterday's standings with points they won outside the group | |

## Acceptance criteria
Each is checked by a test that fails without the change.
1. **Board, before you finish:** `GET /api/board` for a viewer with no finished run today shows a friend who is playing, and one who was caught, both as `started` with no question and nothing about how the run ended; a friend with no run as `not_started`. After the viewer finishes, the same friends show `playing` on their question and how the run ended (db route test).
2. **Live messages:** a friend's start reaches an unfinished player's topic once, as `started` with no question; the friend's answers and Next reach it no more; a finished player's topic and the friend's own get every change, as before; nothing reaches a stranger; no message names an answer or a catch (pgTAP, `live_board.test.sql`).
3. **The page:** in two browsers, player B sees friend A as "started" while both play, never "on question n" or "finished"; once B finishes, B sees how A's run ended (e2e, `live-board.e2e.ts`).
4. **Versions:** `PROTOCOL_VERSION` is 5 and the board message `v` is 2; a v1 message to a page that knows v2 is logged and refetched (unit test).
5. **The record:** an admin's deletion of a reported comment leaves one record with that admin, the comment's ID, its author, day, thread, text and time; a non-reported or missing comment is a 404 and leaves none; a non-admin is a 403 and leaves none (db route test). With D1 (a): `plor_app` can't insert into or change the record table, and the grant list shows only the function's execute and the table's select (pgTAP, `plor_app_role.test.sql`).
6. **The list:** `/admin/reports` shows the deleted comment under "Deleted comments" with the admin's and the author's usernames and the text; the API refuses a non-admin with 403 (route test, e2e or db as cheapest).
7. **Account deletion:** per D2. With (a), deleting the author's account, or the admin's, removes the record (pgTAP, `account_deletion.test.sql`).
8. **Group boards:** a member who joined on Saturday has only Saturday's and Sunday's points in the group's this-week board, and none of last week's; the friends board still counts their whole week (db test). With D3 (a), yesterday's group standings leave out a member who joined today.
9. **Everything else:** `npm test`, `npm run lint`, `npx tsc --noEmit -p .`, `npm run test:db`, `npm run test:sql` and `npm run test:e2e` pass.

## Out of scope
- The friends board counting a new friend's whole week (not part of the decision).
- Hiding a friend's start time; "started" still hints by timing, as the human accepted.
- A log line for the deletion: the record replaces it.

## Numbers
None new. The list shows every record (no limit): the beta is small, and a page size would be a human number.

## Plan
1. The human answers D1–D3. The DECISIONS.md Log gets the board change (it changes M07's approved design) and, with D1, the security change.
2. **Board:** a migration replaces `private.broadcast_board` (recipients split by whether they've finished today); `getBoard` hides progress before the viewer finishes; `board.tsx` shows "started"; protocol 5, payload v 2. Hypothesis: `live_board.test.sql`'s "answering sends again" check fails for an unfinished friend after the change, and passes once rewritten for a finished one; if the unfinished friend still gets messages after the start, the split is wrong.
3. **Record:** the migration adds the table, the function (D1) and its grants; `deleteReportedComment` calls it; `GET /api/admin/reports` returns the records too; the page lists them.
4. **Group boards:** the group's sums filter by `day_of(joined_at)`.
5. Evidence, Source diff, the reviewer, ROADMAP rows, handoff.

## Removes
- `broadcast_board`'s per-answer messages to friends who haven't finished, and the board's `on question n` and `finished` before the viewer finishes.
- ROADMAP "Next revision", "Decided by the human": all three items.
- `circleOf`'s comment that a member's whole week counts, for groups.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
