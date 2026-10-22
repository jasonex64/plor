# M07 — Friends and live board

**Status:** in progress. Every decision is answered (D1–D7, human, 2026-10-21). Plan step 1 is done, and both hypotheses held. 7a (PR #35) and 7b (PR #36) are merged. 7c, the live board, is built and in its PR. 7d, where everyone ended, is next.

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
| D1 | **Display name:** maximum length, and which characters are allowed (a human number) | 1 to 24 characters, any letters (including accents), digits, spaces and `' - . _`; trimmed, and no leading, trailing or double spaces; no emoji for now | **As suggested** (human, 2026-10-21) |
| D2 | **How many named friends per place** in "where everyone ended", before "+ k more" (a human number) | 3 | **3** (human, 2026-10-21) |
| D3 | **Invite code length** (a security number) | 16 random bytes (128 bits), written as 22 URL-safe characters | **22 characters for M07** (human, 2026-10-21: "otherwise looks ok"). The human wants shorter links eventually ("22 is hella long"), and players choosing their own in settings, after the MVP: ROADMAP Later |
| D4 | **Removing a friend:** in M07, or later? | In M07: a Remove button on the friends list. Without it, an add by mistake or an unwanted friend can't be undone, and the board shows them forever | **Yes, in M07** (human, 2026-10-21) |
| D5 | **Browser connection to Supabase (security change).** The board needs the browser to join Realtime with the player's own session. Today there is no browser Supabase client, and the project URL and publishable key are server-only (DECISIONS.md: Sign-in). | Create a browser client used **only for Realtime**. The URL and publishable key become public (they're designed to be). The browser gets the player's access token from a new route and passes it with `setAuth`. A `realtime.messages` SELECT policy lets a user join only `board:<their own id>`, and there is no INSERT policy, so browsers can't send. "Allow public access" is turned off in the Supabase Realtime settings, locally and on the hosted project (the human does the hosted one). | **As suggested** (human, 2026-10-21: "otherwise looks ok"). Security change, recorded in DECISIONS.md |
| D6 | **How the server sends board updates (security change).** (a) A guarded database function calls `realtime.send()` once per friend inside the answer's transaction; no new secret is needed. (b) The REST batch endpoint, with one call for all friends; it needs a Supabase secret key in Vercel. | (a). It adds no secret and keeps everything in the one database connection. Whether it sends only on commit is *unverified*; step 1 of the plan tests it, and if it sends before commit, stop and re-plan | **(a), as suggested** (human, 2026-10-21: "otherwise looks ok"), if plan step 1 confirms send-on-commit. Security change, recorded in DECISIONS.md |
| D7 | **The two-client test tool** (DECISIONS.md, Test runner: "M07 needs two real clients") | Playwright, run against the local stack: two players sign in, become friends, and one sees the other's answer arrive live. Needs a DECISIONS row and a SOURCES entry (the human's OK) | **Playwright** (human, 2026-10-21: "install plawright"). It's installed with 7c, its first test (CLAUDE.md: build for today), and the SOURCES entry gets the installed version then |

## Source
- `docs/DECISIONS.md`: Real-time transport, Row-level security in `private`, App database role, Sign-in, Game 1 (server is authoritative), Test runner, Logging.
- `docs/milestones/M00-data-design.md`: §2 (realtime payloads `{ v, type }`, refetch over HTTP on an unknown `v`), §3 (profile), §5 (`private.run_status`, which the board reads).
- `docs/SOURCES.md`, Supabase Realtime (pinned): `/authorization` (RLS on `realtime.messages`, `realtime.topic()`, private channels, the "Allow public access" setting, policies cached per connection), `/broadcast` (`realtime.send()`, the REST batch endpoint, Broadcast Replay), `/limits` (Free: 200 connections, 100 messages/s; Pro: 500 and 500). Read 2026-10-21 through a summarizing fetch, so quotes go into the ticket only after they're checked on the live page.
- Installed `@supabase/realtime-js` 2.118.0 (`node_modules`): the reconnect and heartbeat defaults. It's not in SOURCES.md; adding it is the human's call.

## Acceptance criteria
- [x] **7a** A player sets, changes and clears a display name within D1's rules; anything else gets 400. Others see it instead of the username wherever a player is shown (from 7b, the first place others see players). Route and database tests.
- [x] **7b** Friends see each other's display name, or the username if there is none (carried from 7a). Opening a valid invite link and pressing Add makes both players friends. Adding yourself, an existing friend, or a reset or unknown code is refused clearly. Resetting stops the old code. pgTAP checks `plor_app`'s exact grants on the new tables. A player can remove a friend, which removes the friendship both ways (D4).
- [x] **7c** The board lists each friend's status. A friend's answer reaches the viewer's open page without a reload. Before the viewer finishes, the payload never holds how a friend's run ended (a route test inspects it). A user can't join another user's board topic (a policy test). A reconnect refetches over HTTP and logs `reason=reconnect`. Evidence: the Playwright two-client test, and a log line from a forced disconnect.
- [ ] **7d** After your run: rows per place, you shown, up to D2 named friends, "+ k more", a full list on tap, and a plain list underneath (unit tests on the grouping).
- [x] **Hypothesis checks recorded** (plan step 1): send-on-commit, and the topic policy. See Evidence.

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
| Invite code: 16 random bytes, 22 URL-safe characters | 7b | D3, human, 2026-10-21 |
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
| 7c: "a browser Supabase client used only for Realtime" (D5) | `@supabase/realtime-js` alone, not supabase-js. Its URL, publishable key and token come at runtime from `/api/realtime/session`, not from public env vars | It's only Realtime. Nothing new goes into the bundle, and `check:client-bundle` stays as it was |
| 7c: friends' updates go to friends' boards | Each update also goes to the player's own board | That's how the page learns the player's own run has ended, which is when friends' outcomes may be shown |
| 7c: "a friend's answer reaches the viewer's open page" | Starting, answering and Next are sent live. Running out of time isn't: nothing is written when time runs out (the database judges it on read), so that friend shows "on question k" until the board is next fetched | Nothing to trigger on. Flagged in ROADMAP "Next revision" |
| D5: "Allow public access" off locally and on the hosted project | Off only on the hosted project (the human). Locally it stays on | The CLI's `supabase/config.toml` `[realtime]` has no such setting (CLI 2.121.0). Locally, a signed-out public subscriber to `board:<A>` received only a public control message, never the private board send (2026-10-22). Every board send is private |
| D6: a send inside the answer's transaction | A failed send is a Postgres WARNING, and the row stays stale until the next load or reconnect | `realtime.send` catches its own errors. The human chose a stale row over failing the answer (2026-10-22) |
| 7c evidence: "a log line from a forced disconnect" | The disconnect is a restart of the local Realtime container | Browser offline emulation left the Realtime socket open, in two clean tries. A restart is what a Realtime deploy does to players |
| D1: "trimmed" | The route trims and composes NFC; the database refuses any name not in NFC | `[[:alpha:]]` refuses a combining accent, so the route's NFC step is what lets an accent typed as two code points through at all. The database's NFC check refuses look-alike compatibility forms that `[[:alpha:]]` accepts, such as the Angstrom sign U+212B (NFC makes it Å), so one name has one stored spelling |
| 7a: clear the name | `null` clears it; an empty string is refused (400) | One way to clear, so an empty Save is a mistake that gets reported, not a silent clear |

## Evidence
**Plan step 1, both hypotheses held** (2026-10-21, local stack, supabase-js 2.118.0). A scratch script made two throwaway users, A and B, and a temporary SELECT policy `realtime.topic() = 'board:' || auth.uid()::text` on broadcast. It sent with `realtime.send(payload, event, topic, true)` over psql, then dropped the policy and deleted the users (0 left afterwards). Output:
- **Send on commit:**
  - A probe sent inside a transaction: 0 messages arrived during the 3 s before COMMIT. The probe arrived 0.01 s after COMMIT (9.44 s, then 9.45 s).
  - A probe followed by ROLLBACK never arrived (checked for 4 s after).
- **Topic policy:**
  - A and B each got `SUBSCRIBED` on their own board.
  - B joining `board:<A>` got `CHANNEL_ERROR Unauthorized: You do not have permissions to read from this Channel topic`, and received 0 messages.
  - A message to `board:<B>` reached B and not A.
- **Also seen:**
  - `realtime.send` adds an `id` field to the payload.
  - A refused join is retried about every 6 s, forever. So the client must only ever join its own board.

**7a Display name** (2026-10-21, local stack; migration `20261022064011_display_name.sql` applied with `supabase migration up`):
- **Database:** `npm run test:sql`: 5 files, 101 tests, `Result: PASS`.
  - `profile.test.sql` covers the D1 rules:
    - accepted: accents, apostrophe and hyphen; other scripts, a dot and an underscore; 24 characters; two players with the same name;
    - refused: 25 characters, empty, a leading space, a double space, an emoji, and text not in NFC ("Ångström" spelled with the Angstrom sign U+212B, next to the composed Å it should be, which is accepted).
  - `plor_app_role.test.sql`'s exact grant list now includes column grants, and shows the one new grant, `private.profile.display_name update`.
- **Before the rule, an experiment.** `[[:alpha:]]` accepted Zoë, José, Łukasz, 名前 and fullwidth Ａ and refused 😀 (local database: ICU, en_US.UTF-8). Whether the hosted database behaves the same is *unverified*.
- **Routes and plor_app:** `npm run test:db`: 7 files, 79 passed. Covered:
  - set (trimmed), change, clear, and the profile showing the name;
  - 400 `display_name_invalid` for empty, emoji, 25 characters, a double space, and a number;
  - 409 `no_profile` before a username exists;
  - plor_app can change only that column;
  - the 24/25 limit matches `DISPLAY_NAME_MAX_LENGTH`.
- **Unit:** `npm test`: 21 files, 164 passed. Covered: `readDisplayName` (trim, NFC, refusals) and 401 signed out.
- **Build:** `npm run build` lists `/api/profile/display-name`. `npm run check:client-bundle`: OK, 54 files. `npx tsc --noEmit` and `npm run lint`: clean.
- **In the browser** (dev server, local stack): the account section shows the Display name field and Save, with no Clear while no name is set. Saving wasn't tried there, because the signed-in account was the human's own; the route tests cover it.

**7b Invite links and friends** (2026-10-22, local stack; migration `20261022070948_friends.sql` applied):
- **Database:** `npm run test:sql`: 6 files, 113 tests, `Result: PASS`.
  - `friends.test.sql` checks:
    - codes: the format (22 base64url characters), one per player, and none shared;
    - pairs: stored smaller ID first, once, never with yourself, and only for existing users;
    - both cascades on account deletion.
  - `plor_app_role.test.sql`'s exact list gains the six new grants: invite select, insert and update of `code` only; friendship select, insert and delete.
- **Routes, two real players:** `npx vitest run src/app/api/friends/route.db.test.ts`: 8 passed. Covered:
  - a code is made once and then returned the same;
  - the preview shows the inviter's display name (7a's check);
  - adding makes both players friends, each seeing the other's display name, or the username when there is none;
  - refused: a second add with 409 `already_friends`, your own link with 409 `invite_own`, and no username with 409 `no_profile`;
  - after a reset, the old code gets 404 `invite_invalid`, and so does a malformed one;
  - remove works both ways, then 404 `not_friends`.
  - `npm run test:db`: 8 files, 87 passed.
- **Unit:** `npm test`: 23 files, 178 passed. Covered:
  - codes are 22 base64url characters and differ each time;
  - malformed codes get 404;
  - all five routes give 401 when signed out.
- **Build:** `npm run build` lists the five `/api/friends` routes and `/invite/[code]`. The first build failed: `params` read outside Suspense is runtime data under Cache Components. Fixed by reading it inside the boundary (bundled `08-caching.md`). `npm run check:client-bundle`: OK, 59 files. `npx tsc --noEmit` and `npm run lint`: clean.
- **In the browser** (dev server, signed in as the human's own local account, read-only):
  - the home page shows Friends: "No friends yet…" and "Make my invite link";
  - `/invite/<unknown code>` shows "That invite link doesn't work…";
  - a throwaway local player's link shows "Add Zoë Check as a friend?", the display name only, after the review fix below.
  - Add wasn't pressed on the human's account. The throwaway player was deleted afterwards, leaving 0 friendships.

**7c Live board** (2026-10-22, local stack with Realtime; migration `20261022073610_live_board.sql` applied):
- **Database:** `npm run test:sql`: 7 files, 124 tests, `Result: PASS`. `live_board.test.sql` (11 tests) checks:
  - start, answer and Next each send to the friend's board and the player's own board, never a stranger's;
  - every message is private;
  - the payload is `{v: 1, type, username, gameId, puzzleDate, state, question}`;
  - a caught run is sent as `finished`, with nothing naming the answer or the catch;
  - the only policy on `realtime.messages` is the own-board read policy.
  - Also read: `realtime.send` turns its own failures into a WARNING (its source on the local stack). A failed send never fails the answer, and the row stays stale until the next load or reconnect (accepted by the human, 2026-10-22).
  - **The policy itself:** acting as `authenticated` with friend f's JWT claims, as Realtime checks a join, f reads 0 of the player's board messages and 4 of their own. With the policy loosened to `using (true)`, `npm run test:sql` gave `Result: FAIL`. It was restored, and the run passed.
- **Routes:** `npx vitest run src/app/api/board`: 8 passed. Covered:
  - board states: not started; playing on question 1; finished with nothing about how, and no host answer anywhere in the response while the viewer hasn't finished;
  - once the viewer has finished: `{result: "caught", question: 1, answer}`;
  - `reason=reconnect` logs exactly one `board refetch after reconnect` line;
  - the session route gives the URL, a publishable key, the player's own ID and a live token;
  - 401 when signed out.
  - `npm run test:db`: 9 files, 93 passed (the run fixtures moved to `src/test/puzzles.ts`).
- **Two browsers:** `npm run test:e2e`: 2 passed (21 s).
  - Two players sign in with emailed codes and become friends through the invite page. The watcher's page goes from "hasn't played yet" to "on question 1" to "finished (you'll see how once you finish)" with no reload, and never shows the host answer.
  - A restart of Realtime makes the page refetch with `reason=reconnect`. The dev server logged `{"level":"info","msg":"board refetch after reconnect",…}`.
- **A bug the test found:**
  - the first join went out before the token was set, so the own-board policy refused it as Unauthorized until the rejoin;
  - `board.tsx` now sets the token before joining, and the next run had no Unauthorized lines.
- **Two experiments failed, then a re-plan:** browser offline emulation, twice, didn't drop the socket. Hypothesis for the re-plan: restarting Realtime drops it and the page reconnects. It held. A restart takes about 2 s locally.
- **Unit and build:**
  - `npm test`: 24 files, 180 passed;
  - `npm run build` lists `/api/board` and `/api/realtime/session`;
  - `npm run check:client-bundle`: OK, 60 files, with no key or URL in the bundle;
  - `npx tsc --noEmit` and `npm run lint`: clean.
- **CI:** the `db` job now starts Realtime, and a new `e2e` job runs Playwright. Both are first shown working in this PR's CI.

## Review
**7a** (reviewer agent, 2026-10-21):
- Blocking findings and how each was fixed:
  - **The NFC test didn't test NFC.** Its value held a control character, and a combining accent is refused by `[[:alpha:]]` before NFC anyway. It now uses the Angstrom sign U+212B, which passes the character rule and fails only NFC, next to the composed Å as a control.
  - **The Source diff gave the wrong reason for NFC.** Corrected.
  - **The new column grant and update policy had no recorded human approval.** The human approved them on 2026-10-22, recorded in the DECISIONS.md Log.
  - **The ROADMAP row and HANDOFF were stale.** Updated.
- Also fixed, because it was small and in this change: a test title claimed more than the test checked.
- Deferred to ROADMAP "Next revision": non-ASCII digits and letters such as ª pass the D1 rule.

**7c** (reviewer agent, 2026-10-22):
- Blocking findings and how each was fixed:
  - **Nothing tested what the own-board policy does,** only its name. `live_board.test.sql` now reads as `authenticated` with a user's claims and topic: 0 rows from another's board, 4 from their own. It fails when the policy is loosened.
  - **A change between the first load and the join was lost.** The first SUBSCRIBED now refetches the board too.
  - **A failed send was silent,** and the comment claimed a refetch covered it. The human accepted a stale row over failing the answer (2026-10-22), and the comment and Evidence now say so.
  - **"Allow public access" wasn't off locally,** although DECISIONS said it was. The CLI has no setting for it. A local experiment showed a public subscriber gets no private board send. DECISIONS and the Source diff now say so.
  - **`HEARTBEAT_MS` was a number outside `tunables.ts`.** It's gone: the page reads the client's own `heartbeatIntervalMs`.
- Also fixed, because they were small and in this change: the first e2e test's title, and a spurious console error on unmount.
- Deferred to ROADMAP "Next revision": seven items under "From M07".

**7b** (reviewer agent, 2026-10-22):
- Blocking findings and how each was fixed:
  - **Friends were shown as "name (username)",** against the display name being "shown instead of the username". They're now shown by name only. The API still returns the username, which identifies a friend for Remove.
  - **The privacy text said friends see the display name or the username.** In fact friends, and anyone signed in who opens the invite link, receive both. The text now says so.
  - **A remembered invite could send "/" back to it.** That happened when a Google sign-in was cancelled and the invite was then accepted by email. The invite page now clears the remembered code when it handles the invite.
  - **The invite code's size lived outside `tunables.ts`,** and its 22-character pattern was written out twice in TypeScript. `INVITE_CODE_BYTES` is now in `tunables.ts`, and one shared pattern (`src/friends/invite-code.ts`) is derived from it.
- Also fixed: three stray table rows at the top of this ticket, left by an earlier edit.
- Deferred to ROADMAP "Next revision": three items under "From M07".
