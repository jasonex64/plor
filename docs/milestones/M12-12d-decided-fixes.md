# M12 12d — The decided fixes

**Status:** done (2026-10-24): merged in PR #63 on green CI, with the human's approval of its security change and the privacy page line (2026-10-24: "Yes, merge PR #63 once every CI check is SUCCESS; I approve its security change (the comment-deletion record function) and the privacy page line").

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
  - **Edge, accepted in the design:** if the viewer finishes at the same moment a friend answers, the friend's message can be judged against the viewer's unfinished state and skipped. The viewer's own refetch after finishing usually shows the friend as of that moment; if the friend's answer was their last, or commits after the refetch, the row stays stale until a reload or reconnect (corrected in the review; ROADMAP "Next revision", For M12). Nothing leaks either way.
- **The deletion record.** A new table `private.comment_deletion`, with the admin, the comment's ID, its author, its text, and the time (the decision's five; nothing reads a day or a thread). The admin's delete and its record happen in one statement, so neither can happen without the other. `/admin/reports` gets a "Deleted comments" list, newest first: when, which admin, the author, the text. The admin and author are shown by their current username.
- **Group boards.** In a group's boards (this week, last week and, with D3, yesterday's standings), a member's ledger rows count only on puzzle days from `private.day_of(joined_at)` on. A member who joined later is still listed, with what they scored since. The friends board is unchanged; it wasn't part of the decision.

## Decisions needed before any code
| # | Decision | Claude's suggestion | Answer (origin) |
|---|---|---|---|
| D1 | **How the record is written (security change).** (a) **A function with its owner's rights,** `private.delete_reported_comment(admin_id, comment_id)`, which checks the admin, deletes a reported comment and writes its record in one statement. `plor_app` may execute it and may only read the record table. (b) `plor_app` gets INSERT and SELECT on the record table, and the route writes both in one statement | (a). App code can't write a record without the deletion, or a false one, and it matches 12c and 12e (a function `plor_app` executes, nothing written directly). The admin check stays in the route too, so a non-admin learns nothing from the body (M08 8c) | **(a)** (human, 2026-10-24: "(a) Owner's-rights function"). Security change, recorded in DECISIONS.md when built |
| D2 | **The record when an account is deleted.** 12c deletes everything tied to an account (A5), and the privacy page says so. (a) **The record goes with the author's or the admin's account** (cascade). (b) It stays, with the author or admin shown as a deleted player: the privacy page would then say that admins keep the text of a comment they deleted | (a). It keeps the privacy page's promise as written, and the only admin today is the human. (b) keeps a fuller trail, but it keeps text from a deleted account | **(a)** (human, 2026-10-24: "(a) Record goes too") |
| D3 | **Yesterday's group standings** (the home page's game card, M11 H7) are a group board too. (a) **The same rule:** a member counts only if they joined on or before yesterday's puzzle day. (b) Weekly boards only | (a). Otherwise someone who joins today shows up in yesterday's standings with points they won outside the group | **(a)** (human, 2026-10-24: "(a) Same rule") |

## Acceptance criteria
Each is checked by a test that fails without the change.
1. **Board, before you finish:** `GET /api/board` for a viewer with no finished run today shows a friend who is playing, and one who was caught, both as `started` with no question and nothing about how the run ended; a friend with no run as `not_started`. After the viewer finishes, the same friends show `playing` on their question and how the run ended (db route test).
2. **Live messages:** a friend's start reaches an unfinished player's topic once, as `started` with no question; the friend's answers and Next reach it no more; a finished player's topic and the friend's own get every change, as before; nothing reaches a stranger; no message names an answer or a catch (pgTAP, `live_board.test.sql`).
3. **The page:** in two browsers, player B sees friend A as "started" while both play, never "on question n" or "finished"; once B finishes, B sees how A's run ended (e2e, `live-board.e2e.ts`).
4. **Versions:** `PROTOCOL_VERSION` is 5 and the `friend_status` message `v` is 2 (the payloads in criterion 2's checks). An unknown `v` is logged and refetched by code 12d doesn't change, so it gets no new test (CLAUDE.md: don't test constants).
5. **The record:** an admin's deletion of a reported comment leaves one record with that admin, the comment's ID, its author, day, thread, text and time; a non-reported or missing comment is a 404 and leaves none; a non-admin is a 403 and leaves none (db route test). With D1 (a): `plor_app` can't insert into or change the record table, and the grant list shows only the function's execute and the table's select (pgTAP, `plor_app_role.test.sql`).
6. **The list:** `GET /api/admin/reports` returns the record (db route test, where a non-admin's 403 is checked already), and `/admin/reports` shows it under "Deleted comments" with the admin's and the author's usernames (e2e, `live-board.e2e.ts`).
7. **Account deletion:** with D2 (a), deleting the author's account, or the admin's, removes the record; a non-admin or an unreported comment deletes and records nothing (pgTAP, `comment_deletion.test.sql`).
8. **Group boards:** a member who joined on this week's Monday has Monday's points in the group's this-week board (the join day counts) and none of last week's; the friends board still counts last week's (db test). With D3 (a), a member who joined today has 0 of yesterday's points in the group's standings, and still has them in the friends standings (db test).
9. **Everything else:** `npm test`, `npm run lint`, `npx tsc --noEmit -p .`, `npm run test:db`, `npm run test:sql` and `npm run test:e2e` pass.

## Out of scope
- The friends board counting a new friend's whole week (not part of the decision).
- Hiding a friend's start time; "started" still hints by timing, as the human accepted.
- A log line for the deletion: the record replaces it.

## Numbers
None new. The list shows every record (no limit): the beta is small, and a page size would be a human number.

## Plan
1. ~~The human answers D1–D3~~ (done, 2026-10-24). The DECISIONS.md Log gets the board change (it changes M07's approved design) and, with D1, the security change.
2. **Board:** a migration replaces `private.broadcast_board` (recipients split by whether they've finished today); `getBoard` hides progress before the viewer finishes; `board.tsx` shows "started"; protocol 5, payload v 2. Hypothesis: `live_board.test.sql`'s "answering sends again" check fails for an unfinished friend after the change, and passes once rewritten for a finished one; if the unfinished friend still gets messages after the start, the split is wrong.
3. **Record:** the migration adds the table, the function (D1) and its grants; `deleteReportedComment` calls it; `GET /api/admin/reports` returns the records too; the page lists them.
4. **Group boards:** the group's sums filter by `day_of(joined_at)`.
5. Evidence, Source diff, the reviewer, ROADMAP rows, handoff.

## Removes
- `broadcast_board`'s per-answer messages to friends who haven't finished, and the board's `on question n` and `finished` before the viewer finishes, with its text "finished (you'll see how once you finish)".
- `deleteReportedComment`'s direct delete as `plor_app` (now the guarded function).
- ROADMAP "Next revision", "Decided by the human": all three items, and the heading.
- `circleOf`'s comment that a player's whole week counts however recently they joined.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| M00 data design §2: payloads are `{ v, type, ... }`, one version | `friend_status` is `v` 2 (`STATUS_VERSION`); the comment and reaction nudges stay `v` 1 (`PAYLOAD_VERSION`) | Only `friend_status` changed shape. Bumping every payload would have changed the live-comments triggers for nothing; `type` already tells them apart. M00 §2 now says so |
| Settled decision: "admins see it as a list on the existing admin page" | The list is on `/admin/reports`, under the reported comments | The admin area has three pages (`/admin`, `/admin/puzzles`, `/admin/reports`); the reports page is where an admin deletes, so the record sits next to the action |
| D3 (a): "a member counts in yesterday's group standings only if they joined on or before yesterday's puzzle day" | A member who joined today is still listed, with 0 of yesterday's points | The weekly boards list a later member with what they scored since, and the decision is about the points (the reason given: "points they won outside the group"); one rule for all three boards |
| The ticket's design: no change to the privacy page | The privacy page says an admin-deleted comment's text, and which admin deleted it, is kept until you delete your account | The record is new data kept about a player, and the page lists what is kept (M02, M12 A8). Approved by the human (2026-10-24, with the merge) |
| M07 7c's board text "finished (you'll see how once you finish)" | Removed | A friend's `finished` now reaches only a player who has finished, whose page refetches how it ended, so the text can't show |

## Evidence
2026-10-24, on the Windows checkout's local stack, with both migrations applied.
- **Board, live messages** (criterion 2): hypothesis written first (Plan step 2): the rewritten `live_board.test.sql` fails before `20261024031116_board_hides_progress.sql` is applied. `npx supabase test db supabase/tests/live_board.test.sql` before: `Failed 6/14 subtests` (1–2, 8–10, 14), `Result: FAIL`; after `npx supabase migration up --local`: `Tests=14`, `Result: PASS` (an unfinished friend gets one `started` message with no question and nothing after; a finished friend and the player's own board get every change; no stranger; all private; no answer or catch named).
- **Board, HTTP** (criterion 1): `npx vitest run src/app/api/board/route.db.test.ts` → `Tests 7 passed (7)`: a friend playing and then caught is `{ state: "started", question: null, ended: null, reactions: null }` while the viewer hasn't finished; after, how it ended, and a third friend playing shows `playing` on question 1. With `src/friends/board.ts` stashed: `Tests 3 failed | 4 passed (7)`, first at the started check.
- **The page** (criterion 3): `npx playwright test e2e/live-board.e2e.ts` → `5 passed (36.5s)`: the watcher's row reads "started (you'll see how it's going once you finish)" after the player starts, and still after the player is caught and the board is reloaded; the watcher's Realtime frames hold exactly one `friend_status` about the player, `"state": "started"`. The first run failed on that last check, which looked for `"state":"started"` with no space; the frame is `"state": "started"` (jsonb's text form), so the check now allows either.
- **Versions** (criterion 4): the payloads in criterion 2's checks are `v` 2; `src/lib/protocol.ts` is 5, and the existing `src/app/api/profile/route.test.ts` 409 check passes in `npm test`.
- **The record** (criteria 5, 6): `npx vitest run src/app/api/admin/reports` → `Tests 11 passed (11)`: a non-admin's 403 leaves no record; an unreported or missing comment is a 404 with none; the admin's deletion leaves one record and `GET /api/admin/reports` lists `{ id, deletedAt, admin, author, body }`; a second delete is a 404 with still one. Before the migration: `Tests 3 failed | 6 passed (9)` (500s: no function). The e2e above checks "Deleted comments" shows `<time>: <admin> deleted <author>'s comment`. `npx supabase test db supabase/tests/plor_app_role.test.sql` passes with exactly `private.comment_deletion select` and `private.delete_reported_comment(uuid,bigint) execute` added.
- **Account deletion and the function** (criterion 7): `npx supabase test db supabase/tests/comment_deletion.test.sql supabase/tests/plor_app_role.test.sql supabase/tests/account_deletion.test.sql` → `Files=3, Tests=48`, `Result: PASS` (9 new: a non-admin and an unreported comment delete and record nothing; one record with admin, comment, author, text and time; deleting the author's account removes that record and no other, then the admin's removes theirs).
- **Group boards** (criterion 8): `npx vitest run src/app/api/groups/leaderboard src/app/api/leaderboard` → `Tests 22 passed (22)`: C, joining on this Monday at noon Pacific, has 10 (Monday's) this week and 0 last week in the group, and 5 last week on the friends board; F, joining today, has 0 of yesterday's 300 in the group's standings and 300 in the friends standings. With `src/friends/leaderboard.ts` stashed: `Tests 2 failed | 20 passed (22)`, the two new tests. The two existing tests whose members joined today but scored earlier now set `joined_at` before the days they test: their premise ("a member's whole week counts") is what 12d changes.
- **Everything else** (criterion 9): `npm test` → `Test Files 37 passed (37)`, `Tests 236 passed (236)`; `npm run lint` clean; `npx tsc --noEmit -p .` clean; `npm run test:db` → `Test Files 30 passed (30)`, `Tests 204 passed (204)`; `npm run test:sql` → `Files=17, Tests=269`, `Result: PASS`; `npm run test:e2e` → `8 passed`, 1 failed (the frame check above), then that file `5 passed`.
- **After the review fixes:** `npx vitest run src/app/api/admin/reports` → `Tests 12 passed (12)` (with `src/admin/reports.ts` stashed: `Tests 2 failed | 8 passed (10)`); `npm run lint` and `npx tsc --noEmit -p .` clean; `npx playwright test e2e/live-board.e2e.ts` → `4 passed (1.0m)` with "the reset reloads every section of the home page" failing, then `5 passed (34.7s)` on a rerun. That test passed in both earlier full runs and 12d doesn't touch the reset; the slow run fits the first dev compile after a change (handoff, Local state), but the cause is *unverified*.

## Review
**12d** (reviewer, fresh context, 2026-10-24): the recipient split can't leak to an unfinished viewer (a friend counts as finished only once their finish has committed); no other path shows a friend's progress early; the function's admin check, grants and cascades, and the join-day SQL, are right; the two tests that now set `joined_at` keep their old assertions, and the new rule has its own tests. It re-ran the targeted pgTAP (`Files=4, Tests=62`, PASS), db tests (40 passed) and the live board e2e (5 passed).
- Blocking findings and how each was fixed:
  1. **The deletion list silently left out a deletion by an admin with no profile** (an inner join; admins are added by user ID and need none). The list now left-joins the admin's profile and always returns `adminId`; the page shows the ID when there's no username. New test in `src/app/api/admin/reports/route.db.test.ts`; with the old query it fails.
  2. **The M12 ticket's Status line was stale.** Updated.
- Deferred to ROADMAP "Next revision", For M12: the stale-row race (and the ticket's edge sentence, corrected); the e2e's frame count after a reload; `plor_app`'s remaining direct delete; React's duplicate-key warnings.
