# M10 — Groups

**Status:** in progress. 10a is merged (PR #49, on all-green CI with the human's OK; W1 answered by the human, 2026-10-22). The group decisions (G1–G11) and numbers wait on the human before 10b.

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
| G1 | **What a group is** | A name, a creator and members. Every member sees the group's invite link and can share it, like a group chat link. Only the creator renames the group, resets its link, removes members or deletes it | *open* |
| G2 | **Groups and friends** | Joining a group doesn't make you friends with its members; the friends board and thread stay friends-only | *open* |
| G3 | **What members who aren't friends see of each other** | Name (display name or username), weekly points, and comments and reactions in the group's thread. Not the live board, and not how a run ended (that stays with friends) | *open* |
| G4 | **The group thread** | One per group per day. Seen only by current members, and hidden until your own run that day is over (M08). A comment posted there is only there. Delete your own, report others (to the same admin page), reactions on comments; no reactions on runs (G3). Past days browsable read-only, like M08 D6 | *open* |
| G5 | **Live updates** | The group thread is live like the friends thread: a trigger sends `comments_changed` with the group's ID to each member's existing `board:<id>` topic, and the page refetches. No new topic or policy | *open* |
| G6 | **Leaving and removal** | A member can leave any time; the creator can remove members. A member who leaves or is removed loses the group's thread, and their comments in it are deleted (they cascade from the membership). When the creator leaves or deletes their account, the longest-standing member becomes creator; when the last member leaves, the group is deleted | *open* |
| G7 | **Where it shows** | A plain "Groups" section on the home page listing your groups, with Create; a page per group at `/groups/<id>` with its board and thread; the invite link at `/groups/join/<code>`, signed in first like M07's. M11 reworks the home screen | *open* |
| G8 | **Invite code** | 16 random bytes, 22 URL-safe characters, as M07 D3 (human, 2026-10-21), in a separate table from friend invites | *open* |
| G9 | **Data** | `private.player_group(id, name, creator_id, invite_code, created_at)`, `private.group_member(group_id, user_id, joined_at)`, and a nullable `group_id` on `private.comment` (null is the friends thread), so reactions and reports keep working unchanged. Not Hard to reverse beyond a normal migration | *open* |
| G10 | **Security change** | plor_app may read, insert, update (name, invite code and creator only) and delete groups, and read, insert and delete memberships, with one plor_app policy per command; the routes scope every change to the signed-in player and the creator's powers. Recorded in DECISIONS.md like M07–M09 | *open* |
| G11 | **The numbers** below | Claude's suggestions are marked as such; each is the human's call | *open* |

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
- [ ] **10b–10d** Criteria written once G1–G11 are answered.

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
| Invite code: 16 random bytes | 10b | M07 D3 (human, 2026-10-21); reuse for groups is G8, open |
| Group name: length and characters | 10b | *open*; Claude suggests the display name rule, 1 to 24 characters (M07 D1) |
| Members per group | 10b | *open*; Claude suggests 50, so a comment's live fan-out stays small |
| Groups per player | 10b | *open*; Claude suggests 10 |

## Plan
1. **10a** (after W1): weekly board, the two shared queries, `setReaction`. One PR from `m10-groups`.
2. **10b**: tables and grants (G9, G10), create, invite, join, leave, remove, rename, reset, the creator handover (G6), the Groups section and group page shell (G7).
3. **10c**: the group's weekly board on its page.
4. **10d**: the group thread, its reactions and reports, and live nudges (G4, G5).

## Removes
- **10a:** the all-time sum in `getLeaderboard`, its `leaderboard` response field and the "All-time points" copy (protocol 3 → 4, since the response changed shape: M00-data-design.md §2); the two extra copies of the friends list query and the four of the comment-visibility predicate (`getThread`, `reportComment`, `setReaction`'s comment target, reactions' `SEEN`) and `setReaction`'s friend-run check; the plain `release()` and the unguarded rollback in `setReaction`; ROADMAP "Next revision"'s three For M10 items.
- **10b–10d:** nothing expected; new feature.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Ticket (Claude's draft): release with `release(err)` | `release(true)` when the rollback failed, `release(false)` otherwise | **10a.** node-postgres documents `release(destroy?: boolean)`; passing an Error isn't documented. A failed statement whose rollback worked leaves a clean connection, so only a failed rollback destroys it |
| Ticket: W1 (a) "last week's final standings" | Shown as "Last week", not "final" | **10a.** A run started last Sunday before midnight can still be finished and count for that day (M09 D1), so last week's totals can still grow. Rare, but "final" would be untrue |
| Ticket: one circle query | One in TypeScript (`src/friends/circle.ts`); the SQL that sends live updates to friends (`20261022073610_live_board.sql`, `20261022095828_live_comments.sql`) keeps its own | **10a.** Applied migrations are never edited (DECISIONS.md, Database migrations). 10d's group nudges will touch that SQL anyway |

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

## Review
**10a** (reviewer, fresh context, 2026-10-22): no blocking finding in the code.
- Blocking findings and how each was fixed: the empty Evidence (filled above) and a handoff that still said 10a waited on W1 (rewritten).
- Not deferred, under "Keep only what someone will act on" (ROADMAP "Next revision"): the Monday branch of the route test hasn't run yet (CI on a Monday runs it); the week unit test's time-change case can't fail (the criterion now says so); `private.today()` and the sums are read in two queries, so a request across midnight could label the weeks from the old day (milliseconds, cosmetic); the week titles' "en-US" dates (the look, M14).
