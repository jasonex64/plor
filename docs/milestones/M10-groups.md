# M10 — Groups

**Status:** in progress. 10a is merged (PR #49, on all-green CI with the human's OK; W1 answered by the human, 2026-10-22). G1–G11 and the numbers are answered (human, 2026-10-22: Claude's suggestions). 10b is merged (PR #50, on all-green CI with the human's OK). 10c is in review (a PR from `m10-groups`). 10d is next.

## Goal
Players make named groups that others join by invite link. Each group has a weekly leaderboard and one shared comment thread per day. First (10a), the friends leaderboard becomes weekly, and the code friends and groups will share is cleaned up.

## Who uses it / what breaks without it
- **Used by:**
  - players who play with a set of people, often a group chat, who aren't all friends with each other;
  - the home screen (M11), which shows a player's groups.
- **Breaks without it:**
  - Today the only circle is your friends, and the comment thread differs for each viewer: a friend's reply can answer a comment you can't see (Design review, 4). A group gives everyone in it the same thread and the same board.
  - The all-time friends board rewards whoever joined first; the human chose weekly boards (Design review, 2).
- **The human's words:**
  - "Groups: named circles joined by invite link, each with its own leaderboard and comments" (ROADMAP, Product; human, 2026-10-19; kept in the MVP, 2026-10-21: "Both, as planned");
  - "agree, not doing alltime lets do weekly" (2026-10-22, Design review, 2);
  - each group gets one shared thread per day, and misses leave M10 (2026-10-22, "can take your suggestion", Design review, 4);
  - "fix the stuff that has to be changed first" (2026-10-22): 10a.

## Claude's design (for the human to approve)
- **10a, changes first** (no new tables):
  - **Weekly friends board.** The leaderboard sums the ledger over the current week: Monday to Sunday by puzzle day (Design review, 2). Settling (M09 D3, D10) and the rule that a closed day stays out while the viewer's own run that day is going (M09 D5) are unchanged. What shows Sunday's points is W1. The all-time board and its copy go; the all-time total comes back on the account page (M12).
  - **One circle query.** "The viewer and their friends" is written three times (`src/friends/board.ts`, `src/friends/friends.ts`, `src/friends/leaderboard.ts`), and "a comment the viewer may see" three times (`getThread` and `reportComment` in `src/comments/comments.ts`, and `setReaction` in `src/reactions/reactions.ts`). Each becomes one shared piece, so 10b–10d add a group as one more circle instead of a fourth copy (ROADMAP "Next revision", For M10).
  - **`setReaction` fails loudly.** A `rollback` that throws no longer hides the original error: it's logged at error level, and the client is destroyed with `release(true)` instead of going back to the pool, so a connection in an unknown state isn't reused (node-postgres, Pool: "If you pass a truthy value in the `destroy` parameter … the pool will be instructed to disconnect and destroy this client"; ROADMAP "Next revision", For M10).
- **10b, groups and membership:** create a group with a name; its invite link; join, leave; the creator's powers (G1–G7).
- **10c, the group board:** the same weekly board as 10a, over the group's members.
- **10d, the group thread:** one thread per group per day, with M08's rules (hidden until your run is over, delete your own, report others, reactions), live like M08 8d (G4, G5).

## Decisions needed before any code
| # | Decision | Claude's suggestion | Answer (origin) |
|---|---|---|---|
| W1 | **Sunday's points.** A day's points reach the ledger only once it closes (M09 D9), so Sunday's arrive after Monday's reset, when "this week" has moved on. (a) Show this week, and below it last week's final standings, so Sunday counts and each week has a final result. (b) This week only: Sunday's points never show on a board. (c) A rolling 7 days, no reset | (a). It keeps Monday as the reset and gives every week a finished table | **(a)** (human, 2026-10-22: "W1 (a): show this week, and below it last week's final standings. Build 10a.") |
| G1 | **What a group is** | A name, a creator and members. Every member sees the group's invite link and can share it, like a group chat link. Only the creator renames the group, resets its link, removes members or deletes it | **Claude's suggestion** (human, 2026-10-22: "Accept all") |
| G2 | **Groups and friends** | Joining a group doesn't make you friends with its members; the friends board and thread stay friends-only | **Claude's suggestion** (human, 2026-10-22: "Accept all") |
| G3 | **What members who aren't friends see of each other** | Name (display name or username), weekly points, and comments and reactions in the group's thread. Not the live board, and not how a run ended (that stays with friends) | **Claude's suggestion** (human, 2026-10-22: "Accept all") |
| G4 | **The group thread** | One per group per day. Seen only by current members, and hidden until your own run that day is over (M08). A comment posted there is only there. Delete your own, report others (to the same admin page), reactions on comments; no reactions on runs (G3). Past days browsable read-only, like M08 D6 | **Claude's suggestion** (human, 2026-10-22: "Accept all") |
| G5 | **Live updates** | The group thread is live like the friends thread: a trigger sends `comments_changed` with the group's ID to each member's existing `board:<id>` topic, and the page refetches. No new topic or policy | **Claude's suggestion** (human, 2026-10-22: "Accept all") |
| G6 | **Leaving and removal** | A member can leave any time; the creator can remove members. A member who leaves or is removed loses the group's thread, and their comments in it are deleted (they cascade from the membership). When the creator leaves or deletes their account, the longest-standing member becomes creator; when the last member leaves, the group is deleted | **Claude's suggestion** (human, 2026-10-22: "Accept all") |
| G7 | **Where it shows** | A plain "Groups" section on the home page listing your groups, with Create; a page per group at `/groups/<id>` with its board and thread; the invite link at `/groups/join/<code>`, signed in first like M07's. M11 reworks the home screen | **Claude's suggestion** (human, 2026-10-22: "Accept all") |
| G8 | **Invite code** | 16 random bytes, 22 URL-safe characters, as M07 D3 (human, 2026-10-21), in a separate table from friend invites | **Claude's suggestion** (human, 2026-10-22: "Accept all") |
| G9 | **Data** | `private.player_group(id, name, creator_id, invite_code, created_at)`, `private.group_member(group_id, user_id, joined_at)`, and a nullable `group_id` on `private.comment` (null is the friends thread), so reactions and reports keep working unchanged. Not Hard to reverse beyond a normal migration | **Claude's suggestion** (human, 2026-10-22: "Accept all") |
| G10 | **Security change** | plor_app may read, insert, update (name, invite code and creator only) and delete groups, and read, insert and delete memberships, with one plor_app policy per command; the routes scope every change to the signed-in player and the creator's powers. Recorded in DECISIONS.md like M07–M09 | **Claude's suggestion** (human, 2026-10-22: "Accept all") |
| G11 | **The numbers** below | Claude's suggestions are marked as such; each is the human's call | **Claude's suggestions**: 50 members, 10 groups, the display name rule (human, 2026-10-22) |

## Source
- PostgreSQL 17 (SOURCES.md): aggregate `FILTER` for the two weekly sums (10a); constraints, cascades, row security (10b–10d). 10a computes the week's Monday in TypeScript, so `date_trunc` isn't used.
- node-postgres (SOURCES.md): `apis/pool` (`client.release(destroy?: boolean)`, read 2026-10-22) and `features/transactions` (the BEGIN, COMMIT, ROLLBACK pattern; it says nothing about a failed ROLLBACK).
- Supabase Realtime (SOURCES.md): broadcast and authorization, for G5, as M08 8d.
- Supabase keys and RLS (SOURCES.md): policies for plor_app only (DECISIONS.md, Row-level security in `private`).
- The human's decisions: ROADMAP "Design review"; M07, M08 and M09 tickets for the rules reused.

## Acceptance criteria
- [x] **10a** `GET /api/leaderboard` returns this week's and last week's totals (W1 (a)): a route db test with ledger rows two weeks back on Sunday, last Monday, last Sunday and this Monday shows only the right ones in each week, and the M09 D5 exclusion still holds.
- [x] **10a** The week starts on Monday: a unit test puts Sundays in the week before and Mondays in their own, across a year and a leap day (its fall time change case can't fail, since days are calendar dates); the route test above crosses last week's Sunday to this Monday.
- [x] **10a** The circle query and the comment-visibility predicate each exist once in TypeScript (`grep` for `private.friendship` in `src` finds only `src/friends/circle.ts` and the friendship writes), and the existing board, friends, leaderboard, comments and reactions tests pass unchanged.
- [x] **10a** A unit test where the rollback throws gets the original error, the rollback's is logged, and the client is destroyed (`release(true)`); with a working rollback it goes back to the pool. Both tests fail on the old code.
- [x] **10a** The page shows both weeks; the e2e test reads this week's list.
- [x] **10b** The database keeps the group rules (pgTAP, `supabase/tests/groups.test.sql`): a name follows the display name rule (G11); an invite code is 22 base64url characters and unique (G8); a group's creator is always one of its members; the 51st member and a player's 11th group are refused (G11); when the creator leaves, or their account is deleted, the longest-standing member becomes creator; when the last member leaves, the group is deleted; deleting a group deletes its memberships (G6).
- [x] **10b** `plor_app` holds exactly the new grants (G10): `supabase/tests/plor_app_role.test.sql` lists them, and `private_schema.test.sql` still passes (RLS on, plor_app-only policies).
- [x] **10b** The routes, against the local stack (`src/app/api/groups/route.db.test.ts`): create (the creator is the first member), list, a group's page data for members only (anyone else gets 404), preview and join by invite link, rename, reset the link (the old one stops working), remove, leave with the creator handover, and delete; a member who isn't the creator gets 403 for each creator power; a full group, an 11th group, an invalid name and joining twice get their errors; under concurrent requests, a creator and the next member leaving at once don't deadlock, and only one of three joins fills a group's last place.
- [x] **10b** Every group route refuses a signed-out player with 401 (`src/app/api/groups/route.test.ts`).
- [x] **10b** The pages (`e2e/groups.e2e.ts`): one player creates a group in the home page's Groups section and copies its link from the group page; a second player opens the link signed out, signs in, picks a username, joins, and sees both members on the group page.
- [x] **10c** `GET /api/groups/leaderboard?id=<id>` returns the group's weekly board, this week and last, in the same shape as `/api/leaderboard` (W1 (a)), over the group's current members, whether or not they are the viewer's friends (G2, G3): a route db test (`src/app/api/groups/leaderboard/route.db.test.ts`) shows a member who isn't the viewer's friend with their points, leaves out a friend of the viewer's who isn't a member, drops a member once removed, and gives a non-member and a malformed ID the group page's `404 group_not_found`; the viewer's friends board still shows the friend and not the member (G2).
- [x] **10c** The weekly board is computed once: the friends and group boards call the same function in `src/friends/leaderboard.ts` with a different set of players (from `src/friends/circle.ts`), so settling (M09 D3, D10), the Monday weeks and the D5 exclusion are the same code, and the existing leaderboard tests pass unchanged.
- [x] **10c** The route refuses a signed-out player with 401 (`src/app/api/groups/route.test.ts`).
- [x] **10c** The page (`e2e/groups.e2e.ts`): the group page shows the group's leaderboard, with both members in this week's list.
- [ ] **10d** Criteria written when it starts.

## Out of scope
- Seeing friends' and group members' misses (ROADMAP Later; Design review, 4).
- A live board for groups (G3, G5), group-wide rankings across groups, average-score boards.
- The all-time total on the account page (M12).
- The look (M14).

## Numbers
Every value this milestone needs, and where it comes from. A blank origin means stop and ask.
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| Week starts Monday, by puzzle day (Pacific) | 10a, 10c | human, 2026-10-22, Design review, 2 (Claude's suggestion of a Monday reset, accepted) |
| Invite code: 16 random bytes | 10b | M07 D3 (human, 2026-10-21); reused for groups (G8, human, 2026-10-22) |
| Group name: the display name rule, 1 to 24 characters (M07 D1) | 10b | human, 2026-10-22 (G11, Claude's suggestion) |
| Members per group: 50 | 10b | human, 2026-10-22 (G11, Claude's suggestion, so a comment's live fan-out stays small) |
| Groups per player: 10 | 10b | human, 2026-10-22 (G11, Claude's suggestion) |

## Plan
1. **10a** (after W1): weekly board, the two shared queries, `setReaction`. One PR from `m10-groups`.
2. **10b**: tables and grants (G9, G10), create, invite, join, leave, remove, rename, reset, the creator handover (G6), the Groups section and group page shell (G7).
3. **10c**: the group's weekly board on its page.
4. **10d**: the group thread, its reactions and reports, and live nudges (G4, G5).

## Removes
- **10a:** the all-time sum in `getLeaderboard`, its `leaderboard` response field and the "All-time points" copy (protocol 3 → 4, since the response changed shape: M00-data-design.md §2); the two extra copies of the friends list query and the four of the comment-visibility predicate (`getThread`, `reportComment`, `setReaction`'s comment target, reactions' `SEEN`) and `setReaction`'s friend-run check; the plain `release()` and the unguarded rollback in `setReaction`; ROADMAP "Next revision"'s three For M10 items.
- **10b:** the seven copies of `errorText` in the client components (`board`, `comments`, `game`, `home`, `leaderboard`, and the admin `insights`, `puzzles` and `reports` pages), now one in `src/app/messages.ts`, which `groups.tsx` would have made eight; the e2e sign-in helpers moved out of `live-board.e2e.ts` into `e2e/players.ts` rather than copied; `Home`'s `invite` prop (now `view`, which also carries a group's link and page) and `AcceptInvite`'s own clearing of the remembered invite (`Home` spends it for both kinds of link).
- **10c:** nothing; a new route over the 10a board, which takes its set of players instead of always reading the friends circle, and `Leaderboard`'s fixed friends path and heading, now props. No protocol bump: no existing response changes shape (M00-data-design.md §2).
- **10d:** nothing expected; new feature.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Ticket (Claude's draft): release with `release(err)` | `release(true)` when the rollback failed, `release(false)` otherwise | **10a.** node-postgres documents `release(destroy?: boolean)`; passing an Error isn't documented. A failed statement whose rollback worked leaves a clean connection, so only a failed rollback destroys it |
| Ticket: W1 (a) "last week's final standings" | Shown as "Last week", not "final" | **10a.** A run started last Sunday before midnight can still be finished and count for that day (M09 D1), so last week's totals can still grow. Rare, but "final" would be untrue |
| Ticket: one circle query | One in TypeScript (`src/friends/circle.ts`); the SQL that sends live updates to friends (`20261022073610_live_board.sql`, `20261022095828_live_comments.sql`) keeps its own | **10a.** Applied migrations are never edited (DECISIONS.md, Database migrations). 10d's group nudges will touch that SQL anyway |
| G10: plor_app may update a group's name, invite code and creator | Name and invite code only | **10b.** The creator changes only by handover, which a trigger running as its owner does (G6), so plor_app never needs it: least privilege |
| G9: a nullable `group_id` on `private.comment` | Not added yet | **10b.** Nothing reads or writes it until the group thread (10d), which adds it (CLAUDE.md, Build for today) |
| G6: the handover and the empty group's deletion | Database triggers with their owner's rights, and a deferred foreign key from the group to its creator's membership | **10b.** The rule holds on every path that removes a membership, deleting an account included, which no route sees; the handover sets `creator_id`, which plor_app may not (G10 row above), so the triggers run as their owner |
| G11: the display name rule for group names | `player_group_name_format` repeats `profile_display_name_format`'s check, with a pointer to it | **10b.** Applied migrations are never edited, so one shared check would mean replacing the profile's constraint as well, a second change with no other caller |
| M07 7b: an invite link opened signed out survives the Google round trip | Both kinds of invite link do; a group's page (`/groups/<id>`) opened signed out returns to `/` after Google | **10b.** Only links that need to be accepted were remembered in M07; a member reaches their group from the home page's Groups section |

## Evidence
**10a** (2026-10-22, a Thursday, on the local stack):
- **Weekly totals and D5** (criterion 1), and the week crossing last Sunday to this Monday (criterion 2): `npx vitest run src/app/api/leaderboard/route.db.test.ts --reporter=verbose`
  ```
  ✓ … signs in six players: A's friends are B and E, B's are A and D, C's is F
  ✓ … A plays today and survives question 1, which can't count before the day closes (D9)
  ✓ … shows A and A's friends, highest total first and ties by name, settling their closed days first (D3, D4)
  ✓ … shows each viewer their own friends: B sees A and D, not E; a friend with no points shows 0
  ✓ … leaves a closed day out of every total while the viewer's own run that day is still going (D5)
  ✓ … shows and orders by the display name when one is set
  ✓ … sums each week from its Monday, with Sunday's points under last week and older weeks left out (W1)
  ```
  The W1 test's 1, 10, 100 and 1000 points tell each day apart: this week 1000, last week 110. On a Monday, yesterday's runs fall in last week; that branch reads the same code and hasn't run yet (today is a Thursday).
- **Monday weeks** (criterion 2) and **the rollback** (criterion 4): `npx vitest run src/friends/leaderboard.test.ts src/reactions/reactions.test.ts` → `Test Files 2 passed (2)`, `Tests 8 passed (8)`. With `src/reactions/reactions.ts` stashed back to the old code, both rollback tests fail (`Tests 2 failed (2)`).
- **One copy** (criterion 3): `grep -rn "private.friendship" src --include=*.ts | grep -v "\.test\.ts"` finds `src/friends/circle.ts:8` and `:20` and the friendship writes `src/friends/friends.ts:61` (insert) and `:77` (delete), nothing else. The board, friends, comments and reactions tests weren't edited and pass (next line).
- **Everything else:** `npm test` → `Test Files 32 passed (32)`, `Tests 213 passed (213)`; `npm run lint` clean; `npx tsc --noEmit -p .` clean; `npm run test:db` → `Test Files 14 passed (14)`, `Tests 130 passed (130)`; `npm run test:sql` → `Files=12, Tests=172 … Result: PASS`.
- **The page** (criterion 5): `npm run test:e2e` → `3 passed (26.9s)`, reading this week's list inside the friends leaderboard. The run before it, straight after `supabase start`, failed once in "a reconnect refetches the board" and passed alone (`1 passed (15.2s)`): the known slow first compile (HANDOFF, Local state), in a test that doesn't read the leaderboard.

**10b** (2026-10-22, on the local stack, migration `20261023050925_groups.sql` applied):
- **Database rules** (criterion 1): `npx supabase test db supabase/tests/groups.test.sql` → `Files=1, Tests=25 … Result: PASS` (the name rule, the code's shape and uniqueness, the creator always a member, the 51st member and an 11th group refused, the handover on leaving and on account deletion, the last member deleting the group, a group's deletion removing its memberships).
- **Grants** (criterion 2): `npm run test:sql` → `Files=13, Tests=197 … Result: PASS`, with the eight new grants listed in `plor_app_role.test.sql` and `private_schema.test.sql` unchanged. As plor_app itself: `npx vitest run src/groups/groups.plor-app.db.test.ts` → `✓ creates, joins, renames, resets, removes, hands over and deletes as plor_app`, including `set constraints all immediate` (what a commit checks) after the handover.
- **Routes** (criterion 3): `npx vitest run src/app/api/groups/route.db.test.ts --reporter=verbose`
  ```
  ✓ … signs in four players, three of them with usernames
  ✓ … creates a group with its creator as the only member, and checks the name rule (G1, G11)
  ✓ … shows a group only to its members (G3)
  ✓ … joins by invite link, once, and only with a username (G1, G7)
  ✓ … refuses the creator's powers to other members (G1)
  ✓ … lets the creator rename the group and reset its link, which stops the old one working
  ✓ … lets the creator remove a member, who loses the group (G6)
  ✓ … hands the group to the longest-standing member when the creator leaves (G6)
  ✓ … refuses the 51st member and a player's 11th group (G11)
  ✓ … deletes a group for every member, and the last member leaving deletes it too (G1, G6)
  ✓ … groups under concurrent requests > lets the creator and the next member leave at once, ten times over, with no deadlock (G6)
  ✓ … groups under concurrent requests > lets only one of three joins into a group of 49 through (G11)
  ```
  The deadlock test fails on the code before the review fix (`error: deadlock detected`, the leave statement), and passed three runs in a row after it.
- **Signed out** (criterion 4): `npx vitest run src/app/api/groups/route.test.ts` → `Tests 10 passed (10)`.
- **The pages** (criterion 5): `npx playwright test e2e/groups.e2e.ts` → `ok 1 … a group is made on the home page and joined by its link`.
- **Everything else:** `npm test` → `Test Files 33 passed (33)`, `Tests 223 passed (223)`; `npm run lint` clean; `npx tsc --noEmit -p .` clean; `npm run test:db` → `Test Files 16 passed (16)`, `Tests 143 passed (143)`; `npm run test:e2e` → `4 passed (35.4s)` (all rerun after the review fix).

**10c** (2026-10-22, a Thursday, on the local stack; no migration):
- **Who the group board shows** (criterion 1) and **D5 on it** (criterion 2): `npx vitest run src/app/api/groups/leaderboard/route.db.test.ts --reporter=verbose`
  ```
  ✓ … signs in four players; A makes a group that B joins, and A and C are friends
  ✓ … shows the group's members, friends or not, and no one else (G2, G3)
  ✓ … leaves out a day while the viewer's own run that day is still going (M09 D5), as the friends board does
  ✓ … leaves the friends board friends-only: A's shows C and not B (G2)
  ✓ … refuses anyone who isn't a member, and an ID that isn't a group, with the group page's 404
  ✓ … drops a member once the creator removes them (G6)
  ```
  The D5 case wasn't planned: the first run expected B to see their own 1000, and got 0, because B's Monday run, written with no answers, is still in progress. That is D5 holding on the group board, so the test now says so.
- **One board** (criterion 2): `getLeaderboard` and `getGroupLeaderboard` both call `weeklyBoard` in `src/friends/leaderboard.ts`, with `circleSql` or `groupCircleSql` from `src/friends/circle.ts`; `src/app/api/leaderboard/route.db.test.ts` and `src/friends/leaderboard.test.ts` weren't edited and pass (`npm run test:db`, `npm test` below).
- **Signed out** (criterion 3): `npx vitest run src/app/api/groups/route.test.ts` → `Tests 11 passed (11)`.
- **The page** (criterion 4): `npm run test:e2e` → `4 passed (33.3s)`, with `e2e/groups.e2e.ts` reading `ga… : 0 points` and `gb… (you): 0 points` in the group leaderboard's This week.
- **Everything else:** `npm test` → `Test Files 33 passed (33)`, `Tests 224 passed (224)`; `npm run lint` clean; `npx tsc --noEmit -p .` clean; `npm run test:db` → `Test Files 17 passed (17)`, `Tests 149 passed (149)`. `npm run test:sql` not rerun: no SQL changed.

## Review
**10a** (reviewer, fresh context, 2026-10-22): no blocking finding in the code.
- Blocking findings and how each was fixed: the empty Evidence (filled above) and a handoff that still said 10a waited on W1 (rewritten).
- Not deferred, under "Keep only what someone will act on" (ROADMAP "Next revision"): the Monday branch of the route test hasn't run yet (CI on a Monday runs it); the week unit test's time-change case can't fail (the criterion now says so); `private.today()` and the sums are read in two queries, so a request across midnight could label the weeks from the old day (milliseconds, cosmetic); the week titles' "en-US" dates (the look, M14).

**10b** (reviewer, fresh context, 2026-10-22):
- Blocking findings and how each was fixed:
  - **A deadlock when the creator and the member they hand the group to leave at once** (reproduced by the reviewer with two connections). A delete locks its membership row before the guard trigger locks the group, and the creator's handover then waits at commit on that member's row. Fixed: the leave and remove statements lock the group first (`LOCK_GROUP` in `src/groups/groups.ts`), with a two-connection test that failed before the fix. Deleting an account still takes the locks the other way round: ROADMAP "Next revision", For M12.
  - **The handoff, ROADMAP row and this Status line were behind the work:** updated in this PR.
- Deferred to ROADMAP "Next revision": the account-deletion ordering (For M12) and a join racing the group's deletion, which gets a 500 instead of `invite_invalid` (Correctness).
- Not deferred, under "Keep only what someone will act on": the migration's stated reason for owner's rights was wrong (corrected: the handover sets `creator_id`); an invite code collision on create (16 random bytes); `Home` now spends a remembered invite once signed in rather than when the invite renders (nothing a player sees changes); the Google round trip through a group's link has no automated test, like M07's.

**10c** (reviewer, fresh context, 2026-10-22): no blocking finding in the code.
- Blocking findings and how each was fixed: the Status line, the ROADMAP row and the handoff were still at "10c next" (updated in this PR).
- Deferred to ROADMAP "Next revision", For the human: a member's whole week counts on a group's board, even days before they joined.
- Not deferred, under "Keep only what someone will act on": the page's reload of the board after a removal (its `key` is the member list) has no e2e test, and a stale row would last only until a reload; the members and the sums are read in two queries, so a removal between them shows the removed member once (milliseconds, like 10a's midnight case).
