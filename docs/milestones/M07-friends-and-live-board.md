| **Yes, in M07** (human, 2026-10-21) |
| **3** (human, 2026-10-21) |
| **1 to 24 characters: letters (accents OK), digits, spaces and ' - . _; no emoji** (human, 2026-10-21, chose Claude's suggestion) |
# M07 — Friends and live board

**Status:** planned: ticket drafted 2026-10-21, D1, D2 and D4 answered; waiting for the human on D3, D5, D6 and D7. No code until they're answered.

## Goal
Players add friends by an invite link, set an optional display name, and see their friends' runs for today update live, with "where everyone ended" once they've finished.

## Who uses it / what breaks without it
- **Used by:**
  - players, to add friends, follow their runs today and compare where everyone was caught;
  - comments and reactions (M08), which are friends-only;
  - points (M09), whose leaderboard is among friends.
- **Breaks without it:**
  - Offbeat has no social side. The share text (M05) is the only link between players, and its link opens the game, not a friendship.
  - M08 and M09 have no "friends" to scope to.
- **The human's words:**
  - display name: "there should alao be a display name (doesnt have to be unique unlike username)" (2026-10-21). Chosen from Claude's options: "Optional, change any time", built "With friends, M07".
  - the "where everyone ended" picture: the rule accepted on 2026-10-20 (closed draft D28). You are always shown, then a few named friends per place, then a count. Tapping a place shows the list, and a plain list sits underneath.

## Claude's design (for the human to approve)
Built as four sub-tickets, one PR each, in this order:

**7a Display name.**
- `private.profile` gets `display_name text null`.
- The player sets or clears it on the home page. Everywhere a player is shown to others, the display name appears, or the username if there is none. The username stays the unique handle.
- Its length and characters are D1.

**7b Invite link and friends.**
- **The link.** Each player has one personal invite link, `/invite/<code>`. The code is random, not the username, so a rename never breaks it. It can be used any number of times, and the player can reset it, which stops the old link working.
- **Accepting.** Opening a link signed in, then pressing Add, makes the two players friends both ways at once, with no separate request to approve. Opening it signed out goes through sign-in first.
- **Tables.**
  - `private.friend_invite(user_id pk, code unique, created_at)`.
  - `private.friendship(user_a, user_b, created_at)` holds one row per pair, with `user_a < user_b`. That makes friendship mutual by construction and stops duplicates.
- **Grants and RLS** follow DECISIONS.md, "Row-level security in `private`": `plor_app` gets only the grants these routes need, and pgTAP checks them.

**7c Live board.**
- **What it shows.** Before you play, and while you play, each friend's status today: not started, on question k, or finished. Once you've finished, it also shows where each finished friend ended: the question they were caught on and what they typed, or survived, or ran out of time.
- **No spoilers.** The server builds each viewer's payload and leaves out how a friend's run ended until that viewer's own run is over (DECISIONS.md, Game 1: the client never receives host answers before answering).
- **Live updates.** The DECISIONS.md transport is unchanged: Supabase Realtime Broadcast on a private topic per viewer, `board:<viewer_id>`. When a player starts, answers or taps Next, the server sends that player's new status to the board topic of each of their friends. Message format: `{ v: 1, type: "friend_status", ... }` (M00 data design §2).
- **Recovering after a disconnect.** Delivery while disconnected is not documented (only Broadcast Replay is), so the client refetches the board over HTTP each time it re-subscribes after an error. That refetch carries `reason=reconnect`, and the server logs it through the one logger, so reconnects are logged and counted in the runtime logs with no new endpoint.
- **Reconnect timing.** Uses realtime-js's defaults: 1 s, 2 s, 5 s, then every 10 s, with a 25 s heartbeat (installed `@supabase/realtime-js` 2.118.0, `RealtimeClient.ts`). Nothing is tuned.

**7d Where everyone ended.**
- After your run, one row per place: each question, plus "survived" and "ran out of time".
- Each row shows you if you ended there, then up to N named friends (D2), then "+ k more". Tapping a row lists everyone in it, and a plain list of all friends sits underneath.
- Plain UI only; the look is M14.

## Decisions needed before any code
| # | Decision | Claude's suggestion | Answer (origin) |
|---|---|---|---|
| D1 | **Display name:** maximum length, and which characters are allowed (a human number) | 1 to 24 characters, any letters (including accents), digits, spaces and `' - . _`; trimmed, and no leading, trailing or double spaces; no emoji for now | |
| D2 | **How many named friends per place** in "where everyone ended", before "+ k more" (a human number) | 3 | |
| D3 | **Invite code length** (a security number) | 16 random bytes (128 bits), written as 22 URL-safe characters | |
| D4 | **Removing a friend:** in M07, or later? | In M07: a Remove button on the friends list. Without it, an add by mistake or an unwanted friend can't be undone, and the board shows them forever | |
| D5 | **Browser connection to Supabase (security change).** The board needs the browser to join Realtime with the player's own session. Today there is no browser Supabase client, and the project URL and publishable key are server-only (DECISIONS.md: Sign-in). | Create a browser client used **only for Realtime**. The URL and publishable key become public (they're designed to be). The browser gets the player's access token from a new route and passes it with `setAuth`. A `realtime.messages` SELECT policy lets a user join only `board:<their own id>`, and there is no INSERT policy, so browsers can't send. "Allow public access" is turned off in the Supabase Realtime settings, locally and on the hosted project (the human does the hosted one). | |
| D6 | **How the server sends board updates (security change).** (a) A guarded database function calls `realtime.send()` once per friend inside the answer's transaction; no new secret is needed. (b) The REST batch endpoint, with one call for all friends; it needs a Supabase secret key in Vercel. | (a). It adds no secret and keeps everything in the one database connection. Whether it sends only on commit is *unverified*; step 1 of the plan tests it, and if it sends before commit, stop and re-plan | |
| D7 | **The two-client test tool** (DECISIONS.md, Test runner: "M07 needs two real clients") | Playwright, run against the local stack: two players sign in, become friends, and one sees the other's answer arrive live. Needs a DECISIONS row and a SOURCES entry (the human's OK) | |

## Source
- `docs/DECISIONS.md`: Real-time transport, Row-level security in `private`, App database role, Sign-in, Game 1 (server is authoritative), Test runner, Logging.
- `docs/milestones/M00-data-design.md`: §2 (realtime payloads `{ v, type }`, refetch over HTTP on an unknown `v`), §3 (profile), §5 (`private.run_status`, which the board reads).
- `docs/SOURCES.md`, Supabase Realtime (pinned): `/authorization` (RLS on `realtime.messages`, `realtime.topic()`, private channels, the "Allow public access" setting, policies cached per connection), `/broadcast` (`realtime.send()`, the REST batch endpoint, Broadcast Replay), `/limits` (Free: 200 connections, 100 messages/s; Pro: 500 and 500). Read 2026-10-21 through a summarizing fetch, so quotes go into the ticket only after they're checked on the live page.
- Installed `@supabase/realtime-js` 2.118.0 (`node_modules`): the reconnect and heartbeat defaults. It's not in SOURCES.md; adding it is the human's call.

## Acceptance criteria
- [ ] **7a** A player sets, changes and clears a display name within D1's rules; anything else gets 400. Others see it instead of the username wherever a player is shown. Route and database tests.
- [ ] **7b** Opening a valid invite link and pressing Add makes both players friends. Adding yourself, an existing friend, or a reset or unknown code is refused clearly. Resetting stops the old code. pgTAP checks `plor_app`'s exact grants on the new tables. A player can remove a friend, which removes the friendship both ways (D4).
- [ ] **7c** The board lists each friend's status. A friend's answer reaches the viewer's open page without a reload. Before the viewer finishes, the payload never holds how a friend's run ended (a route test inspects it). A user can't join another user's board topic (a policy test). A reconnect refetches over HTTP and logs `reason=reconnect`. Evidence: the Playwright two-client test, and a log line from a forced disconnect.
- [ ] **7d** After your run: rows per place, you shown, up to D2 named friends, "+ k more", a full list on tap, and a plain list underneath (unit tests on the grouping).
- [ ] **Hypothesis checks recorded** (plan step 1): send-on-commit, and the topic policy.

## Out of scope
- Groups (M10), comments and reactions (M08), points and the leaderboard (M09).
- The look of the board and the picture (M14).
- Load testing the reset-time spike with live connections (M15).
- Friend requests that need approving, friend search by username, and blocking. Nobody needs them yet: the invite link is the only way in.
- Changing usernames (M12).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Display name: 1 to 24 characters; letters, digits, spaces and ' - . _ | 7a | D1, human, 2026-10-21 |
| Named friends per place: 3 | 7d | D2, human, 2026-10-21 |
| Invite code length | 7b | D3, *open* |
| Reconnect 1, 2, 5, then 10 s; heartbeat 25 s; join timeout 10 s | 7c | realtime-js 2.118.0 defaults, not changed (installed source, read 2026-10-21) |
| Realtime plan limits | Fan-out sizing | Supabase Realtime `/limits` (read 2026-10-21) |

## Plan
1. **Experiments first,** on the local stack, after D5 and D6 are answered:
   - **Send on commit.** Hypothesis: a `realtime.send()` inside a transaction reaches a subscribed client only after COMMIT, and never after ROLLBACK, because Realtime reads `realtime.messages` from the WAL, which only holds committed rows. Disproved if the client receives the message before COMMIT, or after a ROLLBACK.
   - **The topic policy.** Hypothesis: a SELECT policy of `realtime.topic() = 'board:' || auth.uid()::text` lets a user join only their own board. Disproved if user B can join `board:<A>`, or A can't join their own.
2. 7a, then 7b, then 7c, then 7d, each on this branch, with its own PR, and its tests written first.
3. The reviewer agent reviews each PR, and each PR updates this Status line, the ROADMAP row and `docs/HANDOFF.md`.

## Removes
- `docs/milestones/M00-data-design.md` §2's "*(Not built yet: it comes with the live board, M07.)*" note.
- The two ROADMAP "Next revision" items under "For M07 (friends)", which this milestone settles.
- With D5: the "there is no browser Supabase client" clause of DECISIONS.md's Sign-in row, replaced by the Realtime-only browser client.
- Otherwise it removes nothing, because it adds a new feature.

---
*Fill in the sections below at the end.*

## Source diff
| Source (or ticket) says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
