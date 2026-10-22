# M08 — Comments and reactions

**Status:** planned: ticket drafted 2026-10-22, D1, D2, D3 and D8 answered (human, 2026-10-22); D4–D7 wait for the human. No code until they're answered.

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
  - the thread is hidden until your own run today is over, because comments talk about answers;
  - you can post only after that, for the same reason.
- **Comments:**
  - plain text, one level (no replies);
  - shown with the display name (M07 7a) and the time, oldest first.
- **Delete your own:**
  - removes it for everyone, for good.
  - Removing it is the point of the button, so nothing is kept (D4).
- **Report others:**
  - stores a report (who, which comment, when), and the comment disappears for the reporter at once;
  - an admin sees open reports on a new section of the admin pages and can delete the comment (D5).
- **Reactions:** what they attach to is D2. Either way:
  - one reaction per player per thing, from a small fixed set (D3);
  - changing it replaces the old one, and tapping it again removes it.
- **Live:**
  - new comments and reactions arrive like board updates, over the existing `board:<viewer_id>` topic, as a nudge to refetch the thread;
  - the payload holds no comment text, so a viewer who hasn't played never receives one.
  - No new security change is needed for this part: the own-board policy already covers it.
- **Data, as tables in `private` with plor_app-only policies (DECISIONS.md: Row-level security in `private`):**
  - `comment(id, user_id, game_id, puzzle_date, body, created_at)`;
  - `reaction(...)`, its shape set by D2;
  - `comment_report(comment_id, reporter_id, created_at)`.
  - They are written through route handlers that check the session and that the player has finished the day. Account deletion cascades.

## Decisions needed before any code
| # | Decision | Claude's suggestion | Answer (origin) |
|---|---|---|---|
| D1 | **Comment length** (a human number) | 280 characters || **280 characters** (human, 2026-10-22: "take reccomendation for now") |
| D2 | **What reactions attach to.** (a) Comments, like a chat. (b) A friend's run on the board, like a "nice!" on "survived". (c) Both. | (a). It's the one people expect from "comments and reactions". (b) could come with the home screen feed (M11) || **(c) Both**: on comments and on friends' runs (human, 2026-10-22) |
| D3 | **The reaction set** (fixed, small) | 👍 😂 😮 😢 ❤️ || **👍 😂 😮 😢 ❤️** for now; custom or different reactions later (human, 2026-10-22: "take reccomendation for now but add custom/different reactions down the line"); ROADMAP Later |
| D4 | **Deleting your own comment** | Gone for everyone, and not kept. Its reactions and reports go with it | |
| D5 | **What a report does** | Stored, and hidden for the reporter at once. Admins see open reports on the admin pages and can delete the comment. Nothing is hidden automatically, since that would need a threshold (a human number) | |
| D6 | **Days other than today** | Only today's thread is shown in M08. Older threads stay stored for later (home screen, M11) | |
| D7 | **Rate limit on posting** (a human number, or none) | None in M08: only friends see comments, and they can report. Revisit with beta data (M15) | |
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
*(To be finished once D1–D8 are answered.)*
- [ ] Posting is refused before your run today is over, and so is reading today's thread. Route tests check that no comment text reaches a player who hasn't finished.
- [ ] A player sees their own comments and their friends' for today, and no one else's. Route tests use three players: a friend, a non-friend, and a friend of a friend.
- [ ] Comments over D1's length, or empty, are refused with 400.
- [ ] Delete works only on your own comment; on anyone else's it's refused. Report works only on someone else's, and the comment disappears for the reporter.
- [ ] Reactions follow D2 and D3: one per player per thing, replaced or removed by tapping.
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
1. The human answers D1–D8. Claude records the answers and finishes the acceptance criteria.
2. 8a: comments (post, read, delete), with the finished-first rule.
3. 8b: reactions.
4. 8c: reports, and the admin section.
5. 8d: live updates over the board topic, and the e2e test.
6. Each sub-ticket gets its own PR, tests first, and a reviewer pass.

## Removes
Nothing, because this adds a new feature. If D6 is "today only", nothing older is shown, so there's no archive view to remove later.

---
*Fill in the sections below at the end.*

## Source diff
| Source (or ticket) says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
