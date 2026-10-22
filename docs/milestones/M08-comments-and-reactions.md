# M08 — Comments and reactions

**Status:** planned: ticket drafted 2026-10-22, every decision answered (D1–D8, human, 2026-10-22); D6's read-only reading is Claude's and open to change. 8a next.

## Goal
After playing the day's game, players can comment on it and react, seen only by their friends. They can delete their own comments and report anyone else's.

## Who uses it / what breaks without it
- **Used by:**
  - players, to talk about the day's puzzle with friends after playing;
  - the home screen (M11), whose feed shows friends' comments and reactions, blurred until you've played;
  - groups (M10), which get their own comments built on this.
- **Breaks without it:**
  - The social loop stops at the live board: friends see each other's runs but can't say anything about them.
  - M10 and M11 have nothing to show.
- **The human's words:**
  - "comment and react on the day's game" (ROADMAP, Product);
  - ROADMAP M08 row: "On the day's game, friends only, visible after you've played, delete your own, report others".

## Claude's design (for the human to approve)
- **Where:**
  - one comment thread per day's game, under the live board on the home page;
  - you see your own comments and your friends';
  - friends are mutual, but two of your friends who aren't friends with each other don't see each other's comments.
- **When:**
  - today's thread is hidden until your own run today is over, because comments talk about answers;
  - you can post and react only after that, for the same reason;
  - past days can be browsed read-only (D6).
- **Comments:**
  - plain text, one level (no replies);
  - shown with the display name (M07 7a) and the time, oldest first.
- **Delete your own:**
  - removes it for everyone, for good.
  - Removing it is the point of the button, so nothing is kept (D4).
- **Report others:**
  - stores a report (who, which comment, when), and the comment disappears for the reporter at once;
  - an admin sees open reports on a new section of the admin pages and can delete the comment (D5).
- **Reactions** go on comments and on friends' runs (D2). For each:
  - one reaction per player per thing, from a small fixed set (D3);
  - changing it replaces the old one, and tapping it again removes it.
- **Live:**
  - new comments and reactions arrive like board updates, over the existing `board:<viewer_id>` topic, as a nudge to refetch the thread;
  - the payload holds no comment text, so a viewer who hasn't played never receives one.
  - No new security change is needed for this part: the own-board policy already covers it.
- **Data, as tables in `private` with plor_app-only policies (DECISIONS.md: Row-level security in `private`):**
  - `comment(id, user_id, game_id, puzzle_date, body, created_at)`;
  - `reaction(user_id, game_id, puzzle_date, target, emoji, created_at)`, where the target is either a comment or a friend's run that day (D2), with one reaction per player per target;
  - `comment_report(comment_id, reporter_id, created_at)`.
  - They are written through route handlers that check the session and that the player has finished the day. Account deletion cascades.

## Decisions needed before any code
| # | Decision | Claude's suggestion | Answer (origin) |
|---|---|---|---|
| D1 | **Comment length** (a human number) | 280 characters || **280 characters** (human, 2026-10-22: "take reccomendation for now") |
| D2 | **What reactions attach to.** (a) Comments, like a chat. (b) A friend's run on the board, like a "nice!" on "survived". (c) Both. | (a). It's the one people expect from "comments and reactions". (b) could come with the home screen feed (M11) || **(c) Both**: on comments and on friends' runs (human, 2026-10-22) |
| D3 | **The reaction set** (fixed, small) | 👍 😂 😮 😢 ❤️ || **👍 😂 😮 😢 ❤️** for now; custom or different reactions later (human, 2026-10-22: "take reccomendation for now but add custom/different reactions down the line"); ROADMAP Later |
| D4 | **Deleting your own comment** | Gone for everyone, and not kept. Its reactions and reports go with it || **As suggested:** gone for everyone, not kept (human, 2026-10-22) |
| D5 | **What a report does** | Stored, and hidden for the reporter at once. Admins see open reports on the admin pages and can delete the comment. Nothing is hidden automatically, since that would need a threshold (a human number) || **As suggested:** hidden for the reporter, listed for admins to delete, no automatic hiding (human, 2026-10-22) |
| D6 | **Days other than today** | Only today's thread is shown in M08. Older threads stay stored for later (home screen, M11) || **Browse back** (human, 2026-10-22: "Let them browse back"). Claude's reading, for the human to change: past days are read-only (no new comments or reactions), and a past day's thread shows whether or not you played it, since a day that's over can't be spoiled |
| D7 | **Rate limit on posting** (a human number, or none) | None in M08: only friends see comments, and they can report. Revisit with beta data (M15) || **No limit for now** (human, 2026-10-22) |
| D8 | **Security change:** three new tables, and plor_app may: read and insert comments and delete its own (the route checks the owner); read, insert and delete reactions; insert reports; and, for admins only through the routes, read reports | Approve, recorded in DECISIONS.md like M07's || **Approved** (human, 2026-10-22). Recorded in DECISIONS.md when 8a's migration lands |

## Source
- `docs/ROADMAP.md`: the Product section and the M08 row.
- `docs/DECISIONS.md`:
  - Row-level security in `private`, App database role, Real-time transport (the own-board topic);
  - Game 1 (server is authoritative: no spoilers before you've played);
  - Error handling, Logging, Config and tunables.
- `docs/milestones/M07-friends-and-live-board.md`: friendships, display names, the board topic and its policy.
- `docs/milestones/M03-puzzle-insights.md` D1: how admins are recognised (401 signed out, 403 not admin).
- `docs/SOURCES.md`: PostgreSQL 17 (constraints, cascades), Supabase Realtime (pinned).

## Acceptance criteria
- [ ] Posting is refused before your run today is over, and so is reading today's thread. Route tests check that no comment text reaches a player who hasn't finished.
- [ ] A player sees their own comments and their friends' for today, and no one else's. Route tests use three players: a friend, a non-friend, and a friend of a friend.
- [ ] Comments over 280 characters (D1), or empty, are refused with 400.
- [ ] Delete works only on your own comment; on anyone else's it's refused. Report works only on someone else's, and the comment disappears for the reporter.
- [ ] Reactions go on comments and on friends' runs (D2), from 👍 😂 😮 😢 ❤️ (D3): one per player per target, replaced or removed by tapping. You can't react to a run before your own run is over.
- [ ] Past days' threads can be browsed by date, read-only: posting or reacting on a past day is refused (D6).
- [ ] Admins see open reports and can delete the comment. Non-admins get 403.
- [ ] New comments and reactions reach friends' open pages without a reload, with no comment text in the Realtime payload (an e2e test with two browsers).
- [ ] pgTAP checks plor_app's exact grants on the new tables, and the account-deletion cascades.

## Out of scope
- Replies, editing, mentions, images and links shown as previews.
- Group threads (M10) and the home screen feed (M11).
- Automatic moderation or word filters.
- Notifications.
- The look (M14).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Comment length: 280 characters | Posting | D1, human, 2026-10-22 |
| Reaction set: 👍 😂 😮 😢 ❤️ | Reactions | D3, human, 2026-10-22 |

## Plan
1. ~~The human answers D1–D8.~~ Done, 2026-10-22.
2. 8a: comments (post, read, delete) with the finished-first rule, and browsing past days (D6).
3. 8b: reactions on comments and on runs.
4. 8c: reports, and the admin section.
5. 8d: live updates over the board topic, and the e2e test.
6. Each sub-ticket gets its own PR, tests first, and a reviewer pass.

## Removes
Nothing, because this adds a new feature.

---
*Fill in the sections below at the end.*

## Source diff
| Source (or ticket) says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
