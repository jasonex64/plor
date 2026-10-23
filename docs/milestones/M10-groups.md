# M10 — Groups

**Status:** planned (draft ticket, 2026-10-22). 10a's decision (W1) and the group decisions (G1–G11) and numbers wait on the human.

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
  - **`setReaction` fails loudly.** A `rollback` that throws no longer hides the original error, and the client goes back to the pool with `release(err)` when something failed, so a broken connection isn't reused (node-postgres, Pool: `release(err)`; ROADMAP "Next revision", For M10).
- **10b, groups and membership:** create a group with a name; its invite link; join, leave; the creator's powers (G1–G7).
- **10c, the group board:** the same weekly board as 10a, over the group's members.
- **10d, the group thread:** one thread per group per day, with M08's rules (hidden until your run is over, delete your own, report others, reactions), live like M08 8d (G4, G5).

## Decisions needed before any code
| # | Decision | Claude's suggestion | Answer (origin) |
|---|---|---|---|
| W1 | **Sunday's points.** A day's points reach the ledger only once it closes (M09 D9), so Sunday's arrive after Monday's reset, when "this week" has moved on. (a) Show this week, and below it last week's final standings, so Sunday counts and each week has a final result. (b) This week only: Sunday's points never show on a board. (c) A rolling 7 days, no reset | (a). It keeps Monday as the reset and gives every week a finished table | *open* |
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
- PostgreSQL 17 (SOURCES.md): `date_trunc('week', …)` for the Monday week (Date/Time Functions; *unverified* until 10a reads the section and checks it on the local stack), constraints, cascades, row security.
- node-postgres (SOURCES.md): `apis/pool`, releasing a client with an error.
- Supabase Realtime (SOURCES.md): broadcast and authorization, for G5, as M08 8d.
- Supabase keys and RLS (SOURCES.md): policies for plor_app only (DECISIONS.md, Row-level security in `private`).
- The human's decisions: ROADMAP "Design review"; M07, M08 and M09 tickets for the rules reused.

## Acceptance criteria
- [ ] **10a** `GET /api/leaderboard` returns this week's totals (and W1's last week, if chosen): a route db test with ledger rows this week, last week and earlier shows only the right ones in each, and the M09 D5 exclusion still holds.
- [ ] **10a** The week starts on Monday: a db test across a Sunday-to-Monday boundary in Pacific days.
- [ ] **10a** The circle query and the comment-visibility predicate each exist once (`grep` shows no other copy), and the existing board, friends, leaderboard, comments and reactions tests pass unchanged.
- [ ] **10a** A unit test where the rollback throws gets the original error, and the client is released with that error.
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
- **10a:** the all-time sum in `getLeaderboard` and the "All-time points" copy; the two extra copies of the friends query and of the comment-visibility predicate; the `release()` that ignores errors in `setReaction`; ROADMAP "Next revision" For M10 items once done.
- **10b–10d:** nothing expected; new feature.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
