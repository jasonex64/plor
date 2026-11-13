# M17 — Player profiles and friend requests

**Status:** approved to build, with its privacy text and its proposed security changes (human, 2026-11-11: "Approve M17", asked "Approve the M17 ticket and its privacy text to build?"); 17a's exact security design ("17a design" below: tables, grants, policies, and seven decisions D1 to D7) is approved as proposed (human, 2026-11-12: "Yes, build as proposed", answer 30); **17a, friend requests and blocking, is done: PR #193 merged 2026-11-12 on green checks, after the human's hosted `db push`** (their words, relayed by the planning session: "it is pushed"; *not checked by Claude*). **17b's exact design ("17b design", below; seven decisions, E1 to E7, two of them security) is approved as proposed (human, 2026-11-12: "Yes, build as proposed", answer 31; one by one, answer 32). **17b, search, profiles, the held name and the lookup limit, is built (2026-11-13) and in review: its PR, #195, is open and not merged** (Evidence, 17b; merging it before the hosted database has its migration would break sending a friend request on plor.app). 17c is not started. Its design round ran 2026-11-05 and 2026-11-11 (answers 1 to 29). It ships before the closed beta and after M16's game 2 ("Profiles after Game 2", "Before the beta (Recommended)").

## Goal
A signed-in player can find another player by their exact username, open their profile, and send a friend request that the other player accepts, declines or blocks.

## Who uses it / what breaks without it
- Used by: every signed-in player.
- Breaks without it: nobody can open another player's profile today, and there is no search (read 2026-11-05: `src/app/(shell)/` has `me` for your own page and no page for anyone else). Once friend invite links go, this is the only way to add a friend.

## Source
This ticket follows the three OWASP pages added to `docs/SOURCES.md` on 2026-11-11 (human, answer 19), for the search route's limit and its replies: the Authentication Cheat Sheet ("Authentication and Error Messages", "Error Codes and URLs", "Protect Against Automated Attacks", "Login Throttling"), WSTG-IDNT-04 ("Summary", "Remediation") and the REST Security Cheat Sheet ("API Keys", "HTTP Return Code" for 429). None of them gives a number, so the limit's number is still the human's (answer 15). It also follows:
- This ticket's answers, below.
- The two friend-request items this ticket replaces in `docs/ROADMAP.md`, Later (human, 2026-10-23 and 2026-10-26), in git.
- `docs/milestones/M14-14b-3-invite-button.md`, answers 3 and 4.
- `docs/DECISIONS.md`: Player identity (Hard to reverse), and the security rules in CLAUDE.md.

## The human's brief, quoted
> the main feature i want to add is to expand on the ability to look at someone's profile by searching them up (this can be tied into friend requests by username)

## Answers (human, 2026-11-05)
1. Who can look: "Strangers less, friends more (Recommended)". Signed-in players see a short profile, friends the full one. Nobody signed out sees a profile.
2. The full profile: "Totals and streak,Calendar of days played,Rarest answers,Recent results".
3. Search: "Exact username (Recommended)". The full username gives one result. This reverses the 2026-10-23 note asking for a search that doesn't reveal which usernames exist: any search reveals that.
4. What strangers see: "Totals and streak (Recommended)".
5. An unwanted request: "Decline and block (Recommended)". Blocking stops requests and hides your profile from that player.
6. Friend invite links: first "tbh idk if we even need invite links anymore but it feels like a waste to get rid of them since we already developed them...", then, told that a friend with no account has no username to search: "Remove friend invites". Group invite links stay.
7. Order: "Profiles after Game 2".
8. When: "Before the beta (Recommended)".

## Answers (human, 2026-11-11, the design round's first three rounds)
9. A profile's address: "The username".
10. An old link after a rename: "Hold the old name a while". For how long: "30 days (Recommended)", the same 30 days as between username changes (M12 12b).
11. Streak and totals with two games: "Same as your Me page (Recommended)": the all-games summary and a card for each game.
12. How far a block reaches: "Also comments and reactions". Neither player sees the other's comments or reactions anywhere; results on a shared group's boards still show.
13. Whether the blocked player is told: "Silent (Recommended)". Their request looks unanswered and the profile looks as if it doesn't exist.
14. Learning of a new request: "A count on the Friends tab (Recommended)", shown when the page next loads; no live nudge.
15. Searches allowed: "60 an hour", for one player.
16. A cap on requests waiting for an answer: "No separate cap (Recommended)". A request needs a search first, so the search limit bounds them.
17. Asking again after a decline: "Right away; block stops it (Recommended)".

## Answers (human, 2026-11-11, the gaps the rewrite found)
18. The search limit per internet address: "No address limit".
19. OWASP pages as sources: "Yes, add all three (Recommended)".
20. Blocking someone who is already a friend: "Block ends the friendship (Recommended)". They leave the blocker's friends, feed and live board at once.
21. Whether a block can be undone: "Yes, from a blocked list (Recommended)". A small list in settings with an Unblock button.
22. During the 30-day hold, whether the player who gave the name up can take it back: "take it back option only if it's not a significantly more work to build. if it's less work to build than "held from everyone' then do that one for sure".
    - *Reading, Claude's, for the human to confirm:* "held from everyone" is the less to build, and it costs the previous owner nothing. M12 12b lets a username change once every 30 days, stamped when it changes (`username_changed_at`, trigger in `supabase/migrations/20261028140000_baseline.sql` lines 1098 to 1111; M12 A2), and the hold lasts 30 days from that same change. So the previous owner can't change name again, back to the old one included, until the hold has ended anyway. Design: held from everyone, freed after 30 days.
23. What the sender sees after sending: "See pending, can cancel (Recommended)". A sent list with a cancel; a decline isn't shown, the request just leaves the sent list; two players who request each other become friends automatically.
24. A blocked player searching for the blocker's username: "Finds nobody (Recommended)".
25. A friend's full profile with two games (calendar, rarest answers, recent results): "Same as the Me page (Recommended)".
26. The privacy text: "Claude drafts, I approve (Recommended)". The draft is under "Privacy page draft", below.

## Answers (human, 2026-11-11, the last round)
27. A player renames, then deletes their account within 30 days; the held old username: "Freed at once (Recommended)". Deleting the account removes the held name too; an old link may then land on whoever takes the name next.
28. A declined request leaves the sender's sent list, while a blocked sender's request stays pending forever, like one being ignored: "Yes, keep it (Recommended)". A blocked sender can't tell a block from no answer.
29. Can the blocker send a request to someone they've blocked: "No, unblock first (Recommended)". No friendship either way while a block is on; so mutual requests never make friends while either has blocked the other, and a request that was already waiting from the now-blocked player is not delivered or counted.

## Answer (human, 2026-11-12, 17a's security design)
30. Asked whether PR #190's merge means D1 to D7 are accepted and 17a can be built: "Yes, build as proposed". So each of D1 to D7 is settled as its recommended option (a), and 17a's tables, grants, triggers and block rule are approved as written in "17a design" (CLAUDE.md, "Security changes need a human"; DECISIONS.md, log, 2026-11-12).

## Answer (human, 2026-11-12, 17b's design)
31. Asked "Accept all seven recommended options (E1 to E7) and build 17b?", after PR #194 listed them: "Yes, build as proposed". So each of E1 to E7 is settled as its recommended option (a), and 17b's held-name table, its definer trigger and the limiter's new `lookup` kind are approved as written in "17b design" (CLAUDE.md, "Security changes need a human"; DECISIONS.md, log, 2026-11-12).
32. The same, one by one, in the planning session's multiple-choice questions (2026-11-12/13, relayed by that session). E1, search and profile, one thing or two: "One (Recommended)"; E2, what counts toward the 60 an hour: "Lookups + requests (Recommended)"; E3, what "Recent results" is: "Existing 7-day chart (Recommended)"; E4, game 2 on a profile: "Game 1 only for now (Recommended)"; E5, how the old name is held: "Read-only for the app (Recommended)"; E6, where things go: "/u/name + Friends page (Recommended)"; E7, what a stranger sees beside the numbers: "Names only (Recommended)"; and, asked "the search limit would reuse the existing sign-in limiter with one new kind ("lookup"), adding no new table or permission. Approve?": "Approve (Recommended)".

*Reading, Claude's, not an answer:* the Friends tab's count (answer 14) counts requests waiting for the viewer only, not ones the viewer sent and not ones from a player the viewer has blocked.

## Design (proposed)
Each line cites the answer, source or DECISIONS.md row it follows. "Reading" marks a line that reads an answer one way where it could be read another; the human confirms it. Nothing here is approved.

**Finding and opening a profile**
- **Search by exact username.** The full username gives one result, anything else gives nobody; a signed-out visitor can't search (answers 1, 3). Only current usernames match: an old name held after a rename (below) finds nobody (reading of 3, "Exact username"). A player who has blocked the searcher also finds nobody (24).
- **A profile's address holds the username** (9). Its exact path is chosen when it is built; no answer gives it.
- **Searches are limited to 60 an hour per player** (15). Every search counts, found or not (reading of 15). A refused search is answered the way 12e answers a refused sign-in code, 429 `too_many_attempts`, logged with its kind and a hashed key, and counted in a table by a guarded function with no secret key (DECISIONS.md, 2026-10-24 sign-in code limits; `milestones/M12-12e-sign-in-limits.md`, L1 (a) and L2). That is the one way limits are done here, so it is reused, not a second one. There is no per-address limit (18).
- **What a signed-in stranger sees:** totals and streak, nothing else (1, 4). They are the same as the player's own Me page: the all-games summary and a card for each game (11).
- **What a friend sees:** the same, plus the calendar of days played, rarest answers and recent results, shown as on the player's own Me page: the all-games summary and a card for each game, each with its parts (1, 2, 25). Rarest answers and recent results never spoil a day the viewer hasn't played (a rule carried from the first draft; it follows DECISIONS.md, "Beside game 1": a game the viewer hasn't played stays blurred).
- **Nobody signed out sees a profile** (1).

**Renaming**
- **A renamed player's old name is held 30 days** (10), the same 30 as between username changes (M12 12b). During the hold the old address still opens that player's profile under the same viewing rules as any profile, so an old link never reaches a stranger (10, Numbers). After the hold the name is free. If the player deletes the account inside the hold, the held name is freed at once and another player can take it; an old link may then land on whoever takes it next (27).
- **The held name is held from everyone, the previous owner included, for the 30 days** (22, reading). The owner can't change name before the hold ends anyway (12b's trigger refuses a second change within 30 days of the last, the same stamp the hold counts from), so no "take it back" path is built.
- This replaces M12 A2's "the old one free for anyone at once" (DECISIONS.md, 2026-10-23, usernames can change once every 30 days), except on account deletion, where the name is freed at once (27).

**Friend requests**
- **Send, accept, decline, plus a list of pending ones** (5). A request needs a search first (16), so the search limit is what bounds how many can be sent.
- **A sent list with a cancel** (23): the sender sees their pending requests and can cancel one. A declined request isn't shown as declined; it just leaves the sent list.
- **Two players who request each other become friends automatically** (23): the second send accepts the first. Not while either has blocked the other (29, below).
- **A request to someone who is already a friend** isn't created. *Reading: no answer says; the send is refused. Unverified.*
- **A new request shows as a count on the Friends tab, when the page next loads; no live nudge** (14).
- **No separate cap on pending requests** (16).
- **After a decline a new request can be sent right away; no wait** (17). A block is what stops it.
- **Friend invite links end in the same release that search ships**, so there is always a way to add a friend (6, 8; "Removes"). Group invite links stay (6).

**Blocking**
- **Decline and block** is one choice on an unwanted request (5). A block stops the blocked player's requests reaching the blocker and hides the blocker's profile from them (5).
- **It also hides comments and reactions:** neither player sees the other's comments or reactions anywhere. Results on a shared group's boards still show (12).
- **It is silent** (13): the blocked player's request looks unanswered, and the blocker's profile looks to them as if it doesn't exist (the same answer as a username nobody has). The blocker's count and pending list don't show that request. The blocked player's request stays in their own sent list as pending, forever, like one being ignored, and is never delivered; a declined request leaves the sender's sent list, and a blocked sender can't tell a block from no answer (13, 23, 28).
- **A block ends an existing friendship** (20): the pair leave each other's friends, feed and live board at once.
- **A block can be undone from a blocked list in settings, with an Unblock button** (21). Unblocking restores nothing the block removed: no friendship, no request.
- **A blocked player's search for the blocker finds nobody** (24).
- **The blocker can't send a request to someone they've blocked; they unblock first** (29). There is no friendship either way while a block is on, so mutual requests never make friends while either player has blocked the other. A request that was already waiting from the now-blocked player is not delivered or counted.

**Deleting an account** removes its requests and blocks (kept from the first draft's criterion). It should follow from M12 12c, where deleting the `auth.users` row cascades (DECISIONS.md, 2026-10-23); *unverified* until a test shows the new tables cascade.

## Security changes proposed
For the human to approve, change or reject; none is decided here. CLAUDE.md, Security: changes to auth, roles, grants, RLS or what one player can read of another are proposed first and recorded in DECISIONS.md.
1. **New tables for requests and blocks** (an unblock needs a delete grant on blocks, a cancel one on requests), with `plor_app` grants that let it read, add and delete only what the routes need, one policy per command, in the pattern of `private.friendship` (DECISIONS.md, 2026-10-22, invite links and friends). Routes scope every change to the signed-in player.
2. **A stranger can read another player's totals and streak, a friend a fuller profile.** This is a new way for one player to read another's data, and the profile route is its only door. Proposal: the server decides the view (stranger, friend, or nothing) and returns only that view's fields; the database is not opened to wider reads.
3. **Blocking changes what existing routes return:** comments, reactions and the feed drop a blocked pair's items (12); group boards don't. Proposal: one shared check used by each of those reads, so no route has its own copy. A block also deletes the pair's friendship (20), and the search route returns nobody for a blocked searcher (24).
4. **The held old name:** a new table of held names with a release date, and the 12b username trigger refusing a held name to anyone else. This changes the 12b trigger and its grants.
5. **The search counter:** a table and a guarded function like `private.take_auth_attempt`, keyed by the player instead of the IP. Proposal: reuse that table and function if it can hold a per-player key, rather than a second pair. There is no per-address key (18).
6. **Account deletion:** `private.delete_account` must leave none of the player's requests, blocks or held names behind. A name held on behalf of a deleted player is freed at once (27).

## 17a design (proposed 2026-11-12, Claude's overnight draft; approved by the human 2026-11-12, answer 30)
Friend requests and blocking only (Plan 1); search, profiles and the held name are 17b, invite removal 17c. This makes Security changes proposed 1, 3 (requests, blocks and their reach) and 6 (deletion, for these two tables) exact. **Approved as proposed, D1 to D7 each as its recommended option (answer 30); the words "proposed", "waits" and "none is settled" below are the draft's, kept as written.** Where an answer doesn't settle a point, the design is written for the recommended option of "Decisions for the human", below, and marked **[D*n*]**. Every line about PostgreSQL's locking and trigger behaviour is *unverified*: from memory, not read this session; Plan step 1 reads the manual (SOURCES.md, PostgreSQL 17) before any SQL.

**What exists (read 2026-11-12, `supabase/migrations/20261028140000_baseline.sql` unless named).** `private.friendship`: one row per pair, `user_a < user_b`, both `references auth.users (id) on delete cascade`, RLS on (lines 559-571); `plor_app` has select, insert, delete (line 2889) with one policy each (3042-3046). Nothing fires on a friendship change: the triggers are on `run`, `run_event`, `question_open`, `group_member`, `comment`, `reaction` and `profile` (2963-2997). The live board's sends read the friendship at send time (`broadcast_board`, 2651-2653); comment nudges go to the actor's friends or, for a group comment, to every member (`broadcast_comments`, 2727-2733). In the app, who sees what is written once in `src/friends/circle.ts`: `friendsSql` (7-9), `seesAuthorSql` (12-14), `seesCommentSql` (24-27), `seesCommentReactionSql` (31-34), `circleSql` (37-41). `private.delete_account` deletes the `auth.users` row and lets its cascades remove the rest (1115-1138, the delete at 1135); `supabase/tests/account_deletion.test.sql:55-63` counts a deleted player's rows table by table. The highest error code in the migrations is OB015 (grep, 2026-11-12).

**Tables** (new migration; RLS on each, no policy for any role but `plor_app`, as DECISIONS.md "Row-level security in `private`").
- `private.friend_request (sender uuid not null references auth.users (id) on delete cascade, receiver uuid not null references auth.users (id) on delete cascade, created_at timestamptz not null default now(), primary key (sender, receiver), check (sender <> receiver))`, a unique index on `(least(sender, receiver), greatest(sender, receiver))` (one request per pair, either way), and an index on `receiver` ("requests to me"). A request is a pending one; accepting, declining or cancelling deletes it. No status column: a declined request is shown nowhere (23).
- `private.block (blocker uuid not null references auth.users (id) on delete cascade, blocked uuid not null references auth.users (id) on delete cascade, created_at timestamptz not null default now(), primary key (blocker, blocked), check (blocker <> blocked))` and an index on `blocked` (the check reads both ways).
- **Account deletion needs no change to `private.delete_account`:** both tables cascade from `auth.users` as `friendship` does (lines 561-562, tested at `account_deletion.test.sql:61`), and the function deletes that row (line 1135). Neither table has a trigger on delete, so the cascade takes no lock of ours (the reason `delete_account` handles groups first, 1128-1130, doesn't apply). `account_deletion.test.sql`'s `rows_of` gains the two tables. Security change 6's held names are 17b's.

**Grants and policies** (`plor_app` only; `plor_app_role.test.sql`'s exact list gains each).
- `friend_request`: `select, insert, delete`; policies `friend_request_plor_app_select ... using (true)`, `_insert ... with check (true)`, `_delete ... using (true)`. No update: accept, decline and cancel each delete the row (Security change 1: "a cancel one on requests").
- `block`: `select, insert`; policies `block_plor_app_select ... using (true)`, `block_plor_app_insert ... with check (true)`. **No delete grant [D4]:** unblocking goes through `private.unblock(p_blocker uuid, p_blocked uuid) returns boolean`, `security definer`, `set search_path = ''`, execute granted to `plor_app` only, which deletes the one row `(p_blocker, p_blocked)` and, if it deleted one, the blocked player's hidden request to the blocker **[D2]**; it returns whether a block was there. Why, as M18 chose functions over delete grants: with a table delete grant, one route bug or one statement run as `plor_app` (`delete from private.block`) lifts every block at once and silently re-exposes every blocked player; the function lifts one named pair a call. It is not a wall: `plor_app` can read every block, so it could name any pair (the same caveat as `end_guest_run`, DECISIONS.md, Guest play). Rejected: the delete grant Security change 1 proposed, simpler (one policy, no function) but with that mass-delete reach. Block insert stays a grant: a wrong insert hides content and ends friendships, which `plor_app` can already do with its friendship delete (line 2889).
- Two trigger functions, `security invoker`, `set search_path = ''`, as `profile_username_change` (1099-1100, the least-privilege precedent), so they need no grant and run with `plor_app`'s own privileges: `private.block_ends_friendship()` **after insert on `block`** deletes the pair's friendship and the blocker's own pending request to the blocked **[D3]** (needs `plor_app`'s delete on `friendship` and `friend_request`, both held); `private.friendship_unblocked()` **before insert on `friendship`** raises **OB016** (new, unused) when a block exists either way. Together they make "no friendship while a block is on" (29) a database rule, whatever route writes. OB016 is mapped where a friendship is inserted: in accept it is unreachable after the pair lock (below); in the invite-link `addFriend` (`src/friends/friends.ts:60-75`, removed in 17c) it is 404 `invite_invalid`, as if the link had gone, so a blocked player learns nothing.
- No trigger, and no Realtime send, on `friend_request` (14). pgTAP checks `friend_request` has no trigger.

**Where each rule is enforced.** "Route" means `src/friends/requests.ts`, one module, inside one transaction that first locks the pair (Races). Targets are named by username, as `removeFriend` does (`friends.ts:78-85`); an unknown username is 404 `player_not_found` **[D1]**; a signed-in player with no profile gets 409 `no_profile`, as `add` does (`src/app/api/friends/add/route.ts:14`).

| Rule (answer) | Where | How |
|---|---|---|
| Self-request (5) | DB + route | `check (sender <> receiver)`; the route answers 409 `request_own` first (as `invite_own`, `report_own`) |
| One request per pair, either way | DB | the unique pair index |
| Send (5) | route | insert `(me, them) on conflict do nothing`; a repeat send is the same 200 `{ok: true, state: "sent"}` |
| Request to an existing friend (reading, Design) | route | 409 `already_friends` (reused, same meaning as `friends.ts:70`) |
| Mutual auto-accept (23) | route | before inserting, delete `(them, me)` if present and not hidden; if one was deleted, insert the friendship and answer `{ok: true, state: "friends"}` |
| Blocker can't send (29) | route | a block `(me, them)` answers 409 `unblock_first`; the blocker knows they blocked, so nothing leaks |
| Send to a player who blocked me (13, 28) | route | the same insert and the same `state: "sent"` as any send; the row sits hidden from the blocker |
| Received list and the Friends count (14) | route | `receiver = me and not blockedSql(me, sender)`; the count is that list's length, received only (the ticket's reading under answer 29) |
| Sent list (23, 28) | route | `sender = me`, no block filter, so a blocked sender's request shows pending for ever; no time condition, so nothing expires it |
| Accept (5) | route + DB | delete `(them, me)` where not hidden, returning; none is 404 `request_not_found`; then insert the friendship (OB016 backstop) |
| Decline (5, 17) | route | delete `(them, me)` where not hidden; none is 404 `request_not_found`. A hidden request can't be declined, or it would leave the blocked sender's sent list (28). Sending again at once is allowed: no row remains (17) |
| Cancel (23) | route | delete `(me, them)`; none is 404 `request_not_found` |
| Block (5, 13, 20) | DB + route | route: 409 `block_own` on self, then insert `(me, them) on conflict do nothing`; the trigger ends the friendship and deletes my request to them **[D3]**; their request to me stays, hidden. "Decline and block" (5) is this call alone: a decline would remove the request from the sender's sent list, which 28 forbids |
| Block is silent (13) | route | no B-facing response depends on a block: B's send, sent list and cancel read the same; B's received list loses A's request as if A cancelled it. B can still see A leave their friends list, as after an unfriend: the friendship is one row (lines 559-566), so answer 20's "leave the blocker's friends" ends it for both |
| Unblock (21) | DB function | `private.unblock`; 404 `not_blocked` if there was none; restores no friendship and no request **[D2]** |
| A blocked pair's comments and reactions hidden, group boards still shown (12) | route, one check | below |

**The one shared check.** `blockedSql(a, b)` in `src/friends/circle.ts`: `exists (select from private.block k where k.blocker = a and k.blocked = b or k.blocker = b and k.blocked = a)`. It is added once, as `and not blockedSql(viewer, author)`, to `seesCommentSql` (author `comment.user_id`) and to `seesCommentReactionSql` (author the reactor), and used by the received-request reads. So every read built on them drops the pair's items, with no copy in any route:
- `getThread`, `src/comments/comments.ts:63`, and `reportComment`, `:132` (a hidden comment can't be reported: the same 404 as a missing one);
- `getFeed`'s `VISIBLE`, `src/comments/feed.ts:31`, both before the run is over (the preview's names and counts) and after;
- `setReaction`'s comment target, `src/reactions/reactions.ts:65` (a hidden comment can't be reacted to: 404 `comment_not_found`), and `commentReactions`, `:122` (thread, feed and preview counts).
- Friend-gated reads need no check: a block ends the friendship and OB016 stops a new one, so `friendsSql` (`feed.ts:45`, `reactions.ts:70`), `seesAuthorSql` in `runReactions` (`reactions.ts:134`), and `circleSql` in the board (`src/friends/board.ts:46`), the friends list (`friends.ts:90`), the friends leaderboard (`src/friends/leaderboard.ts:88, 103`) and game 2's friend rank (`src/game/substring-places.ts:56`) already drop the pair. Only a group thread shows a non-friend's comment or reaction, which is what the check is for.
- **Group boards keep both:** `groupCircleSql` (`circle.ts:45-47`, `leaderboard.ts:93, 104`) is not changed (12).
- Consequences, both following answer 12: in a shared group, the two players see different reaction counts on the same comment, where M10 G4 had every member see the same (`circle.ts:30`); and a group comment by B still sends A's page a `comments_changed` nudge (line 2733), which carries no author or text, so A's refetch simply shows nothing new.

**Races** (all *unverified* until the db tests in Plan step 4 run them).
- Every send, accept and block transaction first runs `select from private.profile where user_id in ($me, $them) order by user_id for no key update` (the lock `group_member_guard` takes on a profile, line 2573; in user ID order so two transactions can't deadlock on the pair). `plor_app` may lock those rows only if it holds an update privilege on a profile column and an update policy: it has both (lines 2879, 2918, 2941, 2943; policy line 3012). *Unverified* that this suffices: PostgreSQL 17's SELECT page states the rule; Plan step 1 reads it, and if `plor_app` can't, the lock becomes a `security definer` function, a further security change for the human.
- **Two mutual sends at once:** the second waits on the pair lock, then sees the first's committed request (READ COMMITTED gives each statement a new snapshot) and accepts it. Without the lock, the unique pair index would still refuse the second request (23505), so two crossing requests can never both sit pending.
- **Block racing accept (or a mutual send that accepts):** both take the pair lock first. Block first: its trigger deletes the request, so the accept finds none (404 `request_not_found`, as if cancelled) or the send stores a plain request. Accept first: the block, once it gets the lock, deletes the new friendship. Either way no friendship survives with a block, and OB016 backstops any path that skips the lock (only `addFriend`, until 17c).
- Account deletion racing a request to that player can deadlock (the request holds the profile lock and needs `auth.users` for its foreign key; the deletion holds `auth.users` and needs the profile); PostgreSQL aborts one, a 500 on a rare collision. Recorded, not designed around (ROADMAP's "Concurrent or malformed requests that get a 500" item already lists cases like it).

**Routes** (each wrapped by `handle` and `checkProtocol`, the player from `requireUserId`, never the body, as `src/app/api/friends/remove/route.ts`; body `{ username }`):
- `GET /api/friends` gains `requests` (received, visible) and `sent`, each `Friend[]` (`friends.ts:13`). Fields added, none changed, so the protocol stays at 6 (M00 data design §2: bumped only for breaking changes; reading).
- `GET /api/friends/requests/count` → `{ ok: true, count }`, for the Friends tab on every page **[D6]**.
- `POST /api/friends/requests` (send) → `{ ok: true, state: "sent" | "friends" }`; 404 `player_not_found`, 409 `request_own`, `already_friends`, `unblock_first`, `no_profile`.
- `POST /api/friends/requests/accept`, `/decline`, `/cancel` → `{ ok: true }`; 404 `request_not_found`.
- `POST /api/friends/block` → `{ ok: true }`; 404 `player_not_found`, 409 `block_own`. `POST /api/friends/unblock` → `{ ok: true }`; 404 `not_blocked`. `GET /api/friends/blocked` → `{ ok: true, blocked: Friend[] }`.
- Error codes: new ones are new names, never a reused meaning; the database code is OB016, the next unused one, not a reuse (ROADMAP "Next revision": "error codes reused: OB009 ... OB010 ..."). Each new route joins `npm run routes` and `src/app/api/guest-cookie.test.ts`'s account routes (401 to a guest cookie).
- **Realtime:** nothing is sent on a request, an accept or a block (14). **The live board when a block ends a friendship (20, "at once") [D5]:** every read after the block, the board's included, leaves the pair out at once, and no further board message passes between them, since `broadcast_board` reads the friendship at send time (2651-2653). The blocker's page reloads its board after the block. A page already open elsewhere (the blocked player's, or the blocker's other tab) keeps the stale row, which gets no more updates, until it next loads (`src/app/board.tsx:83-105` only updates friends it already lists).

**Acceptance criteria 17a covers** (route db tests in `src/app/api/friends/requests/route.db.test.ts` and `src/app/api/friends/block/route.db.test.ts`, pgTAP in a new `supabase/tests/friend_requests.test.sql`; names may change when built):
- Requests (5): requests route test. Sent list and cancel (23): requests route test. Mutual requests (23, 29): requests route test, both orders, each block direction. Blocker can't send (29): block route test. Re-request after decline (17): requests route test. No cap on pending (16): requests route test, 25 sends all succeed (its "only refusal reachable is the search limit" is 17b's, with [D1]). Count on the Friends tab (14): requests route test, with `realtime.messages` for the receiver's `board:` topic counted before and after (as `supabase/tests/live_board.test.sql:40` reads them).
- Block's reach (5, 12): block route test, two players in a shared group with comments and reactions in its thread and the friends thread, read through the thread, feed (before and after the run ends) and reaction reads, both ways; the group leaderboard still holds both. Its profile part is 17b's.
- Block ends the friendship (20): block route test, friends list, feed, board and friends leaderboard before and after. Unblock (21): block route test; its profile and search parts are 17b's. Block is silent (13, 28): block route test comparing B's responses, blocked and unblocked, as JSON; the request's `created_at` set back 31 days (as the owner in the test) and still pending.
- Security (17a's part): pgTAP, `has_table_privilege` per command on both tables, no delete on `block`, `private.unblock` executable and `security definer` with an empty `search_path`, the two triggers invoker, no trigger on `friend_request`, RLS on with `plor_app` policies only (`private_schema.test.sql` already fails otherwise); a block makes a friendship insert fail with OB016; a block deletes the friendship; `plor_app_role.test.sql`'s list. Account deletion (27, requests and blocks): `account_deletion.test.sql`'s `rows_of` with both tables.

**Plan as checks** (test first; every command against the local stack only):
1. Read PostgreSQL 17's SELECT locking clause, Explicit Locking (row-level locks), Transaction Isolation (Read Committed), CREATE TRIGGER and the foreign-key referential actions, and record each fact used above with its section → verify: `grep -c "PostgreSQL 17, " docs/milestones/M17-profiles-and-friend-requests.md` counts one cite per fact, and any fact the manual contradicts is changed here before step 2.
2. pgTAP first: `friend_requests.test.sql`, plus the `plor_app_role.test.sql` list and `account_deletion.test.sql` → verify: `npx supabase test db` fails on exactly those three files. Hypothesis: nothing else changes; disproved if another file fails.
3. Migration (`npx supabase migration new friend_requests_and_blocks`) → verify: `npx supabase migration up`, then `npx supabase test db` gives PASS, every other file's count unchanged.
4. Requests and block route db tests, then `src/friends/requests.ts` and the routes → verify: `npm run test:db -- -t "friend requests|blocking"` fails before (routes missing), passes after; `npm run test:db -- -t "invite links and friends"` still passes.
5. `blockedSql` and its two uses → verify: the block-reach tests fail with the two lines removed and pass with them; `npm run test:db -- -t "comment|reaction|feed|board|leaderboard"` unchanged.
6. The screens of [D7] → verify: `npm test`, and an e2e that sends, accepts and blocks between two browsers (`npm run test:e2e -- friend`), failing before.
7. Whole → verify: `npm test`, `npm run test:db`, `npx supabase test db`, `npx next typegen` then `npx tsc --noEmit -p .`, `npm run lint`, `npm test -- src/app/api/guest-cookie`.

**The manual, read (Plan step 1, 2026-11-12).** Each fact the design leans on, with where PostgreSQL 17 states it; the pages were fetched and quoted by a subagent, and what the manual leaves unsaid was run instead (Evidence). No fact contradicted the design.
- Locking the two profiles needs an update privilege: PostgreSQL 17, SELECT, Description: "The use of FOR NO KEY UPDATE, FOR UPDATE, FOR SHARE or FOR KEY SHARE requires UPDATE privilege as well (for at least one column of each table so selected)." `plor_app` holds column update grants on `private.profile`.
- Under row-level security the locked rows pass the table's SELECT and UPDATE policies: PostgreSQL 17, CREATE POLICY, "Policies Applied by Command Type", the row "SELECT FOR UPDATE/SHARE". The page doesn't name FOR NO KEY UPDATE; `src/friends/requests.plor-app.db.test.ts` takes the lock as `plor_app` and passes.
- Two pair locks wait for each other: PostgreSQL 17, 13.3.2 Row-Level Locks: under FOR UPDATE, another transaction's "SELECT FOR NO KEY UPDATE" of the row "will be blocked until the current transaction ends", and FOR NO KEY UPDATE "will not block SELECT FOR KEY SHARE commands".
- The waiter then sees what the first committed: PostgreSQL 17, 13.3.2 Row-Level Locks: it "will then lock and return the updated row", and PostgreSQL 17, 13.2.1 Read Committed Isolation Level: "Read Committed mode starts each command with a new snapshot that includes all transactions committed up to that instant".
- A trigger's error undoes the statement that fired it: PostgreSQL 17, 37.1 Overview of Trigger Behavior: "if either the statement or the trigger causes an error, the effects of both will be rolled back." So OB016 leaves no friendship.
- The two trigger functions run as the caller: PostgreSQL 17, CREATE FUNCTION: "SECURITY INVOKER indicates that the function is to be executed with the privileges of the user that calls it. That is the default."
- `private.unblock`'s empty `search_path`: PostgreSQL 17, CREATE FUNCTION, Writing SECURITY DEFINER Functions Safely: "search_path should be set to exclude any schemas writable by untrusted users."
- Deleting a user deletes their requests and blocks: PostgreSQL 17, 5.5.5 Foreign Keys: "CASCADE specifies that when a referenced row is deleted, row(s) referencing it should be automatically deleted as well."
- A foreign key's own checks ignore the policies: PostgreSQL 17, 5.9 Row Security Policies: "Referential integrity checks, such as unique or primary key constraints and foreign key references, always bypass row security". It doesn't name cascades; `account_deletion.test.sql` and `friend_requests.test.sql` show them deleting the rows.
- A repeat send or block changes nothing: PostgreSQL 17, INSERT, ON CONFLICT Clause: "For ON CONFLICT DO NOTHING, it is optional to specify a conflict_target; when omitted, conflicts with all usable constraints (and unique indexes) are handled."
- **Not in the manual, and not relied on:** which lock a foreign-key check takes on `auth.users` (so the deadlock with account deletion, under Races, stays *unverified*), and whether an AFTER INSERT row trigger fires for a row ON CONFLICT DO NOTHING skipped (blocking twice is harmless either way: the trigger's deletes find nothing the second time).

**Decisions for the human** (17a's design above follows each recommendation, marked [D*n*]; none is settled until the human answers):
1. **[D1] A send names a username, so the send route tells whether a username exists, and nothing makes a search come first** (answer 16 assumes it). A client could list usernames through sends without touching the 60-an-hour search limit (15). (a) *Recommended:* a send counts against the same per-player counter as a search (the 60 of answer 15, now "60 lookups an hour"), built with 17b's counter; 17a ships with 17b in one release anyway (Plan 3). No new number, but answer 15's number gains a use. (b) Leave sends uncounted: simplest, and the limit stops nobody who skips the search box. (c) A send must follow a search of that name within some time: needs a new number and a record of searches; rejected. The same question will meet 17b's profile route, which also answers by username.
2. **[D2] What unblocking does to the blocked player's hidden request** (21 "restores nothing ... no request" against 28 "stays pending forever"). (a) *Recommended:* `private.unblock` deletes it, so it never reappears in the blocker's list; the sender sees it leave their sent list, as after a decline, and can send again (21's criterion: "a new request from B reaches A"). (b) Keep it: after the unblock it shows in the blocker's list again; simplest, but it restores a request the blocker hid, and a new send by B is then a repeat.
3. **[D3] What a block does to the blocker's own pending request to the blocked player.** (a) *Recommended:* the block deletes it; the blocked player sees it leave their list, as if cancelled. (b) Keep it: the blocked player could accept it, and the database would refuse the friendship (OB016), telling them they were blocked.
4. **[D4] Unblock by grant or by function.** (a) *Recommended:* no delete grant on `block`; `private.unblock` deletes one pair. Narrower than the approved Security change 1, so it needs the human's OK as a tightening (as M18's round 2 required). (b) The delete grant as approved: one policy and no function, but one statement can lift every block.
5. **[D5] "At once" on a live board already open** (20). (a) *Recommended:* every read is at once and the blocker's page reloads; another open page keeps a stale row with no updates until it loads. No new Realtime message (Network messages are Hard to reverse in DECISIONS.md). (b) A trigger on friendship delete sends a new `friends_changed` nudge to both players' board topics, so open pages refetch at once: a new payload type and sending function, and every unfriend would send one too.
6. **[D6] Where the Friends tab's count comes from on other pages** (14: "shown when the page next loads"). (a) *Recommended:* a small `GET /api/friends/requests/count` the shell calls on each page load. (b) Only from `GET /api/friends`: the count then shows only once the Friends page is opened, which defeats the tab's count.
7. **[D7] Whether 17a builds the screens.** Plan 1 names tables, grants and routes only. (a) *Recommended:* 17a also builds the Friends page's received and sent lists with Accept, Decline, Decline and block, and Cancel, the tab's count, a Block on each friend, and Settings' blocked list with Unblock, so the routes have callers (CLAUDE.md, "Build for today"); DESIGN.md updated with them. Send stays without a screen until 17b's search. (b) Routes only; the screens go with 17b.

**Numbers:** none needed beyond the ticket's; [D1] (a) reuses answer 15's 60 for sends, which is the human's to allow.

## 17b design (proposed 2026-11-12 by Claude; approved by the human 2026-11-12, answer 31)
Search, the profile page, the 30-day hold and the lookup limit (Plan 2). This makes Security changes proposed 2, 4, 5 and 6 (held names) exact, as "17a design" did for 1 and 3. The ticket's approval (2026-11-11) covers those four in outline; their exact tables, grants and trigger are below for the human to approve, change or reject (CLAUDE.md, "Security changes need a human"). **Approved as proposed, E1 to E7 each as its recommended option (answer 31); the words "proposed", "recommended" and "none is settled" below are the draft's, kept as written.** Where no answer settles a point, the design is written for the recommended option of "Decisions for the human", below, marked **[E*n*]**. Every line about PostgreSQL's locks and snapshots is *unverified*, from memory; Plan step 1 reads the manual first.

**What exists (read 2026-11-12).**
- **The Me page has one game and no "recent results".** `getMe` (`src/game/me.ts:17-24`) returns the username, `since`, totals (points, days played, streak, longest streak), this month's calendar, game 1's card (best, average, full runs) and the 3 rarest answers from closed days. Game 2's card on Me is 16f's, not built. Nothing on any page is called "recent results"; the nearest is the game screen's chart of questions survived over today and the 6 days before (`readStats`, `src/game/offbeat.ts:54-65`; `STATS_CHART_DAYS = 7`, human, 2026-10-24, "Last 7 days chart").
- **Usernames:** `private.profile.username` is `citext`, unique, `^[a-z0-9_]{3,20}$` (baseline 50-57). The 12b trigger `private.profile_username_change()` is `security invoker`, fires `before update of username`, refuses a change within 30 days of the last (OB011) and stamps `username_changed_at` (1099-1111, 2963-2964). Sign-up is a plain insert (`createProfile`, `src/lib/profile.ts:63-69`); nothing fires on it.
- **The one limiter:** `private.auth_attempt (kind, key, at)` with `kind in ('send_ip', 'send_email', 'check_ip', 'check_email')` and a hashed key (baseline 111-117); `private.take_auth_attempt(p_kind, p_key, p_limit, p_window)`, `security definer`, the only way `plor_app` reaches the table (1049-1065); `takeAttempt` in `src/lib/auth-limits.ts:36-48` hashes the value, refuses with 429 `too_many_attempts` and logs the kind and 8 characters of the hash; the numbers are `AUTH_LIMITS` in `src/config/tunables.ts:140-149`.
- **Account deletion** deletes the `auth.users` row and its cascades do the rest (1119-1138). The highest database error code in use is OB016 (grep, 2026-11-12).
- **Pages** live under `src/app/(shell)/`: `friends`, `g/[code]`, `groups`, `i/[code]`, `me`, `play`, `play2`, `streak`, `admin`. `src/app/find-player.tsx` is the leaderboard graph's picker, not a search.

**One route for search and profile [E1].** `GET /api/players/[username]` (wrapped by `handle` and `checkProtocol`, the viewer from `requireUserId`; 401 signed out, 409 `no_profile` without a username). A search is opening the profile of the name typed; there is no second route that tells whether a name exists.
- It resolves the name: a current username first; else a held name whose hold hasn't ended (below). A name that is malformed, unknown, or whose owner has blocked the viewer is one and the same answer: 404 `player_not_found`, body `{ ok: false, error: "player_not_found" }` (answers 13, 24; the "Old link and blocks" criterion). A display name or a prefix never matches (3).
- The server picks the view and returns only its fields (Security change 2); no grant changes, since `plor_app` already reads every table it needs:
  - `relation`: `"self"`, `"friend"`, `"sent"` (the viewer's request waits), `"received"` (theirs waits, visible), `"blocked"` (the viewer blocked them) or `"none"`. A request hidden by the other player's block never shows: the viewer who is blocked gets 404 before this.
  - **Stranger's view** (every relation but friend and self): `username`, `name` (the display name or username, as `Friend`), `totals` and game 1's card, as `Me` has them (answers 4, 11).
  - **Friend's view:** that plus `since`, `month`, `rarest` and `recent` **[E3]** (answers 2, 25). The viewer's own name gets the friend's view with `relation: "self"`; the page offers the Me tab.
  - **Game 2 [E4]:** the profile shows what Me shows. Me has no game 2 card until 16f, so the profile has none; both read through the same code so 16f adds it to both.
- **Spoilers:** nothing in either view names an answer of an open day. `rarest` reads closed days only (`me.ts:86-88`); `month` and `recent` are counts of questions survived, which the live board already shows a friend who hasn't played (`src/friends/board.ts`). So no blur is needed. *Reading of "never spoil a day the viewer hasn't played"; unverified that a closed day can't still be played, Plan step 2 checks.*
- Reading another player's stats runs `allTimePoints`, which settles closed runs for everyone (`src/game/ledger.ts:138-139`): a write the viewer triggers, the same one any Me or leaderboard load already makes.

**The lookup limit (15, 18, D1) [E2].** One count per player per hour, limit 60, for: every `GET /api/players/[username]`, found or not, except when the name is the viewer's own or a current friend's (a name the viewer already knows exists); and every `POST /api/friends/requests` (D1 (a), approved). Over the limit: 429 `too_many_attempts`, logged with its kind and hash prefix, no username (L2).
- **Security change 5, exact:** no new table or function. `auth_attempt_kind`'s list gains `'lookup'` (the check is dropped and re-added in the migration); the key is `hashKey(viewer's user ID)`; `AUTH_LIMITS` gains `lookup: { limit: 60, windowSeconds: 60 * 60 }` (answer 15). `plor_app` gains no grant: it already executes `take_auth_attempt`. `takeAttempt`'s log text "sign-in attempt refused" becomes "attempt refused", as it now counts lookups too. A deleted player's count rows stay until their hour passes: they hold a hash, not an ID (as the sign-in counts do).
- The friend exception needs the name resolved before counting, so a refused lookup is decided after one read of `private.profile`; nothing of that read is returned.

**The held name (10, 22, 27) [E5].** Security changes 4 and 6, exact:
- `private.held_username (username extensions.citext primary key, user_id uuid not null references auth.users (id) on delete cascade, held_until timestamptz not null)`, an index on `user_id`, RLS on. `plor_app`: `select` only, policy `held_username_plor_app_select ... using (true)` (the profile route resolves an old name). **No insert, update or delete grant.**
- `private.hold_username()`, a trigger function, **`security definer`**, `set search_path = ''`, execute revoked from every role, fired `before insert or update of username on private.profile`. It (1) takes `pg_advisory_xact_lock` on the new name and, on a rename, the old one, in name order (the lock `take_auth_attempt` uses, 1053), so a rename and someone taking the freed name can't cross; (2) deletes held rows whose `held_until` has passed; (3) raises **OB017** (new) if the new name is still held, by anyone, the previous owner included (22); (4) on a rename, inserts `(old name, user, statement_timestamp() + interval '30 days')` (answer 10's 30, written as the 12b trigger writes its own). OB017 maps to 409 `username_taken` in `profileError` (the same meaning to the player: the name can't be had; a held name is not told apart from a taken one).
- The 12b trigger `profile_username_change` is not changed; it fires first (triggers on one event fire in name order; *unverified*, Plan step 1), so a too-soon change is still OB011.
- **Why definer:** with table grants the trigger could stay invoker, as 17a's two are, but `plor_app` would then hold insert and delete on held names: one statement could free every held name (old links reach strangers) or hold any name against everyone. As D4: the narrow function, not the grant.
- **Account deletion (27):** the row cascades from `auth.users`, so the name is free the moment the account goes; `private.delete_account` is not changed. `account_deletion.test.sql`'s `rows_of` gains the table.
- A held name opens the holder's profile under the viewing rules (10); the response carries the current `username`, and the page shows it. A search for a held name therefore finds the renamed player. **This reverses the ticket's reading "an old name held after a rename finds nobody" and the "Rename hold" criterion's last clause**, because search and the address are one route [E1]; with two routes the reading stands.

**Screens [E6]** (words are Claude's, listed for the human when built, as 17a's were):
- **Friends page:** a card "Find a player" above the requests: one field for a username and a Find button; it opens `/u/<name>`.
- **`/u/[username]`** (`src/app/(shell)/u/[username]/page.tsx`, signed-in only through `Signed`): the header, All games, game 1's card; for a friend also the calendar, rarest answers and recent results, drawn by the Me page's own components (`src/app/me.tsx`, split so both use them). One action row by `relation`: none: "Add friend"; sent: "Request sent" and Cancel; received: Accept, Decline, Decline and block; friend: Remove, Block; blocked: Unblock; self: a link to Me. Each calls 17a's routes. A name nobody has, or one hidden by a block: "There's no player with that username."
- Friends' names on the Friends list link to their profile. DESIGN.md gains both screens.

**Acceptance criteria 17b covers:** Search; Blocked search finds nobody (24); Search limit (15); Stranger's view; Friend's view and spoilers; No cap on pending's last clause (the 61st send in an hour is the only refusal); Block's reach, Unblock, Security and Account deletion's 17b parts; Rename hold (10) (its last clause as [E1] decides); Old link and blocks. Route tests in `src/app/api/players/[username]/route.db.test.ts`, pgTAP in a new `supabase/tests/held_username.test.sql` plus `auth_attempt.test.sql`, `plor_app_role.test.sql` and `account_deletion.test.sql`.

**Plan as checks** (test first; local stack only):
1. Read PostgreSQL 17 on advisory locks (13.3.5), trigger firing order (CREATE TRIGGER, Notes), and the snapshot a volatile function's statements see (38.7 / 13.2.1) → verify: each fact used above is cited in the ticket with its section; a contradicted fact changes the design before step 2.
2. Hypothesis: a signed-in player can't start a run for a closed day, so closed-day answers spoil nothing → verify: read the run-start route and its test; disproved if a past date is accepted, and then the spoiler rule goes back to the human.
3. pgTAP first: `held_username.test.sql` (grants, definer, empty `search_path`, OB017 at day 29 and free at day 30 by a back-dated `held_until`, the previous owner refused, sign-up as a held name refused, cascade on delete) and the three changed files → verify: `npx supabase test db` fails on exactly those four.
4. Migration `held_username_and_lookup_limit` → verify: `npx supabase migration up`, then `npx supabase test db` PASS with every other file's count unchanged.
5. Route db tests, then `src/friends/players.ts` and the route; `takeAttempt("lookup")` in it and in the send route → verify: `npm run test:db -- -t "players|lookup"` fails before, passes after; 60 pass and the 61st is 429; `-t "friend requests|blocking|sign-in"` unchanged.
6. A rename racing a sign-up for the freed name, 10 rounds as `plor_app` (the test's size) → verify: the name is never both held and taken.
7. The screens → verify: `npm test`, and an e2e that finds a player, sends a request from the profile, is accepted and sees the friend's view (`npm run test:e2e -- profile`), failing before.
8. Whole → verify: `npm test`, `npm run test:db`, `npx supabase test db`, `npx next typegen` then `npx tsc --noEmit -p .`, `npm run lint`, `npm run routes`.

**The manual, read (Plan step 1, 2026-11-13).** Fetched and quoted by a Haiku subagent, whose tool extracts quotes with a small model, so the wording is *not re-read by Claude*; no fact contradicted the design.
- A name's lock lasts to the end of the transaction, and a second taker waits: PostgreSQL 17, 13.3.5 Advisory Locks: transaction-level requests "are automatically released at the end of the transaction, and there is no explicit unlock operation"; PostgreSQL 17, 9.28.10 Advisory Lock Functions, `pg_advisory_xact_lock`: "Obtains an exclusive transaction-level advisory lock, waiting if necessary."
- The hold's trigger fires after the 30-day rule's: PostgreSQL 17, 37.1 Overview of Trigger Behavior: "If more than one trigger is defined for the same event on the same relation, the triggers will be fired in alphabetical order by trigger name."
- A sign-up that waited for a rename then sees its hold: PostgreSQL 17, 36.7 Function Volatility Categories: "VOLATILE functions obtain a fresh snapshot at the start of each query they execute."
- The trigger writes the table the app's role can't: PostgreSQL 17, CREATE FUNCTION: "SECURITY DEFINER specifies that the function is to be executed with the privileges of the user that owns it."
- **Not in the manual, and not relied on:** whether a BEFORE INSERT trigger fires before the unique index is checked; the name's lock makes the order not matter.

**Decisions for the human** (the design above follows each recommendation; none is settled until answered):
1. **[E1] Search and the profile: one door or two.** (a) *Recommended:* one route; searching a name is opening its profile. Fewer places that tell whether a name exists, one count per lookup, and less to build. An old held name then finds the renamed player through the search box too, where the ticket's reading had search find nobody. (b) Two routes: a search that matches current names only, and a profile address that also follows held names; a search and the profile it leads to each count against the 60.
2. **[E2] What counts against the 60 an hour.** (a) *Recommended:* each profile lookup of a name that isn't your own or a friend's, and each request sent (D1). Looking at friends' profiles is free. (b) Every lookup, friends' included: simpler, and a player who opens friends' profiles 60 times in an hour is stopped. (c) Searches only: a profile address typed by hand is then an unlimited way to list names; rejected.
3. **[E3] What "Recent results" is** (answer 2 names it; no page has it). (a) *Recommended:* the game screen's own chart, questions survived on each of the last 7 days (the "Last 7 days chart" you already chose): no new number and nothing to spoil. (b) A list of recent days with points and the answers given: needs a number of days from you, and a rule for blurring days the viewer hasn't played. (c) Leave it out: the calendar already shows each day's count.
4. **[E4] Game 2 on a profile.** (a) *Recommended:* the profile shows what the Me page shows. Me has only game 1's card until 16f, so a profile has only game 1's until then. (b) Build game 2's card for both now: that is part of 16f, which isn't approved.
5. **[E5] How the old name is held (a security choice).** (a) *Recommended:* the app's database role can only read held names; one guarded trigger writes and frees them. (b) Give the role insert and delete on the table and keep the trigger unprivileged, as 17a's are: no privileged function, but one bad statement could free or hold any name.
6. **[E6] Where things go.** (a) *Recommended:* the profile at `/u/<username>` (short, beside `/g/` and `/i/`); the search box as a card at the top of the Friends page. (b) `/player/<username>`. (c) Your own choice of address or place.
7. **[E7] What a stranger sees beside the numbers.** (a) *Recommended:* the display name and username; "Playing since" for friends only (answer 4 says totals and streak). (b) "Playing since" for strangers too, as the Me header shows it.

**Numbers:** 60 an hour (answer 15) and 30 days (answer 10), both the human's; 7 days for [E3] (a) (human, 2026-10-24, M14 L35), reused. The tests' 10 rounds and day 29 / day 30 are sizes and edges, not limits. Nothing else is needed; if a decision above goes another way and needs a number, it is asked.

## Open
What truly remains; nothing above is designed around an unanswered question.
- Nothing of 17b's waits: E1 to E7 and its security changes are approved (answer 31).
- The lines marked *unverified* in Design (a request to someone who is already a friend; the new tables cascading on account deletion) stay unverified.
- Nothing of 17a's waits: D1 to D7 and its security changes are approved (answer 30).

## Privacy page draft
**Approved by the human, 2026-11-11 ("Approve M17"; answer 26). `src/app/privacy/page.tsx` is not changed until 17c.** Added under "What we keep", in the page's tone; "Last updated" would change with it:
- **Your profile and who can find it:** any signed-in player can search for you by your exact username (not by display name or part of a username) and open your profile. A signed-in player who isn't your friend sees your totals and streak, and a card for each game. Your friends also see your calendar of days played, your rarest answers and your recent results. Nobody who is signed out can see a profile. If you change your username, the old one still opens your profile for 30 days and no one else can take it; if you delete your account in that time, the old username is freed at once.
- **Friend requests and blocks:** we keep the friend requests you send and receive, and the players you block. Blocking someone ends any friendship with them, stops their requests reaching you, and makes your profile and username show nothing to them. You and they stop seeing each other's comments and reactions, though results on a shared group's board still show. They are not told. You can unblock someone from a list in Settings.
- **Search counts:** to stop anyone listing usernames, we count how many searches each signed-in player makes in an hour.

Also: "your invite link" leaves the "Your friends" line when friend invite links end (17c), and "Keeping and deleting" would add requests and blocks.

## Acceptance criteria
Each is a check that can fail. "Route test" is a `route.db.test.ts` run the way DECISIONS.md says; "pgTAP" is `supabase test db`. File names are set when built.
- [x] **Search.** Route test: an exact username returns that player; a prefix, a display name, an empty string and a missing name each return nobody; with no session the route answers 401.
- [x] **Blocked search finds nobody (24).** Route test: after A blocks B, B's search for A's exact username returns the same status and body as a search for a username nobody has; A's search for B still finds B.
- [x] **Search limit (15).** Route test: as one player, searches 1 to 60 inside an hour succeed (found or not) and the 61st answers 429 `too_many_attempts`; a second player's first search still succeeds; the refusal is logged with its kind and no username or email in the line.
- [x] **Stranger's view (1, 4, 11).** Route test: the profile response for a non-friend holds the all-games summary and a card for each game and no calendar, rarest answers or recent results, checked on the JSON, not the screen; a signed-out request answers 401.
- [x] **Friend's view and spoilers (1, 2, 25).** Route test: with two games played, a friend's response holds the all-games summary and, for each game, a card with its calendar, rarest answers and recent results, as the Me page does; for a day the viewer has not played, no rarest answer or recent result of that day appears in it.
- [x] **Requests (5).** Route test: send creates a pending request; the receiver's list shows it; accept makes both friends; decline removes it and no friendship exists; a request to oneself is refused.
- [x] **Sent list and cancel (23).** Route test: after A sends to B, A's sent list holds the request; A cancels it and both A's sent list and B's list are empty; after B declines instead, A's sent list no longer holds it and shows no "declined" state.
- [x] **Mutual requests (23, 29).** Route test: A sends to B, then B sends to A: A and B are friends, no pending request remains in either list, and neither send is refused. With A having blocked B (or B having blocked A) the same two sends make no friendship, whichever order they come in.
- [x] **Blocker can't send (29).** Route test: after A blocks B, A's send to B is refused and no request exists; A unblocks B, and the same send now succeeds and B's list shows it. A request B sent to A before the block is not in A's list or A's Friends count after the block, and stays pending in B's sent list.
- [x] **Re-request after decline (17).** Route test: decline, then send again straight away, succeeds; repeated three times in a row, still succeeds. After a block, the same send does not put a request in the blocker's list.
- [x] **No cap on pending (16).** Route test: one player sends a request to each of 25 different players (25 is the test's size, not a limit); every send succeeds, and the only refusal reachable is the search limit.
- [x] **Count on the Friends tab (14).** Route test: with 3 requests waiting the Friends page data shows 3, after one is declined 2; a request from a player the viewer has blocked is not counted; no Realtime message is sent when a request arrives (the viewer's board topic is compared before and after).
- [x] **Block's reach (5, 12).** Route test and pgTAP: after A blocks B, B's request does not reach A; B opening A's profile gets the same status and body as a username nobody has; A's comments and reactions are absent from B's comment, reaction and feed responses, and B's from A's; on a shared group's leaderboard both players' results are still present.
- [x] **Block ends the friendship (20).** Route test: A and B are friends and appear in each other's feed and on a shared live board; A blocks B; each is absent from the other's friends, feed and live board data, read before and after.
- [x] **Unblock (21).** Route test: A's blocked list holds B; A unblocks B; the list is empty, B's profile opens for B as a stranger's (not a friend's), B's search finds A, and a new request from B reaches A.
- [x] **Block is silent (13, 28).** Route test: B's response to sending a request, and B's list of their own requests, are the same as when A simply hasn't answered; no B-facing response names the block. B's request stays in B's sent list as pending, still there after the test clock is advanced past the 30-day hold, so nothing expires it (23, 28).
- [x] **Rename hold (10).** Route test with the clock set: after A renames from `old` to `new`, the address for `old` opens A's profile under the viewing rules; another player renaming or signing up as `old` is refused at day 29 and succeeds at day 30; A renaming back to `old` inside the 30 days is refused (22); a search for `old` finds nobody.
- [x] **Old link and blocks (10, 13).** Route test: B, blocked by A, opens A's old address and gets the same response as a username nobody has.
- [x] **Security (proposals above, once approved).** pgTAP: `plor_app` has on each new table only the grants the approved proposal lists; a direct read of another player's requests or blocks returns no rows.
- [ ] **Invite links removed (6).** `GET /i/<any code>` answers 404; a search of the repo for `friend_invite` finds only the migration that drops it; group invite links pass their existing route tests.
- [x] **Account deletion (27).** pgTAP: A renames from `old` to `new` and then `private.delete_account` runs for A inside the 30 days; no row of A remains in requests, blocks or held names; right after, another player renames or signs up as `old` and it succeeds, with no wait.

## Out of scope
- Search by display name or partial name (answer 3).
- Profile pictures (ROADMAP, Later).
- Signed-out profiles (answer 1).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 60 searches an hour per player | Stops listing usernames | Human, 2026-11-11 (answer 15); no source gives a number |
| Searches allowed per address | Stops listing usernames | None, human, 2026-11-11 (answer 18: "No address limit") |
| 30 days a freed username is held | An old profile link doesn't reach a stranger | Human, 2026-11-11 (answer 10); the same 30 as M12 12b's wait between changes |
| No cap on pending requests | Requests | Human, 2026-11-11 (answer 16) |
| No wait after a decline | Requests | Human, 2026-11-11 (answer 17) |

## Plan
Draft sub-tickets, for the human to reorder after the design round:
1. **17a, friend requests and blocking:** tables, grants and routes (send, accept, decline, sent list, cancel, mutual auto-accept, blocked list and unblock), and blocking's reach into the comment, reaction and feed reads and its ending of a friendship (answers 12, 20, 21, 23). A security change, proposed first and recorded in DECISIONS.md.
2. **17b, search and the profile page:** the search limit, the profile views, and the 30-day hold on an old name held from everyone, with its trigger change (answers 9, 10, 15, 22), and a blocked searcher finding nobody (24), as the address needs the hold.
3. **17c, friend invites out and the privacy policy:** the same release as 17a and 17b.

## Removes
Friend invite links (answer 6), to be confirmed by a fresh search in 17c: `/i/[code]`, `/api/friends/invite`, `/api/friends/add`, `/api/friends/preview`, the `private.friend_invite` table, and the friend side of `src/app/invite-link.tsx`. Group invites share some of that code, so what is left must keep working. Also the two friend-request items in ROADMAP Later.

---
*Fill in the sections below at the end.*

## Source diff
### 17a (the source is "17a design", above, approved by answer 30)
| Source says | We built | Why different |
|---|---|---|
| The pair lock is its own statement, `select from private.profile where user_id in ($me, $them) order by user_id for no key update` | One statement finds the other player by username and locks both rows: `where user_id = $1 or username = $2 order by user_id for no key update` (`src/friends/requests.ts`, `withPair`) | The same two rows, the same order and lock, one read fewer; the username has to be looked up anyway |
| "Every send, accept and block transaction" takes the lock; decline and cancel are single deletes | Every change takes it: decline, cancel and unblock too | One helper for the six changes; the extra lock costs a decline nothing and keeps one way to write a change |
| Accept: "then insert the friendship (OB016 backstop)" | The insert is `on conflict do nothing`, in accept and in a mutual send | An invite link can make the pair friends while a request waits (until 17c); the accept then only clears the request, where a plain insert would be a 500 |
| Accept, decline, cancel: 404 `request_not_found`; unblock: 404 `not_blocked`; nothing said for a username nobody has, or one's own, on those four | Both get the route's same 404 | The design lists no other code for those routes, and a different one would tell a request that isn't there from a player who isn't |
| 409 `no_profile` "as `add` does", said once for the route module | Every change answers it for a player with no username | Read as covering all six; none can do anything without a profile |
| The lists are `Friend[]`; no order given | The friends list's order: by shown name, then username | The one order a list of players already has (`listFriends`) |
| D1 (a): a send counts against the search counter, "built with 17b's counter" | Sends are not counted in 17a | The counter is 17b's. Until 17b, the send route tells whether a username exists with no limit, so 17a must not reach players without 17b (Plan 3: one release) |
| Plan step 4: the route tests "fail before (routes missing), pass after" | The requests tests were written after `requests.ts`; only blocking's two reach tests were seen failing first, before `blockedSql` was used (Evidence) | Claude wrote the module before its test file; the tests were not weakened to fit |
| Tests: two route test files and pgTAP | Also `src/friends/requests.plor-app.db.test.ts`, with the two races run 10 times each (the test's size, not a limit) | Locally the routes connect as postgres, so the lock, the grants and the invoker triggers as `plor_app` need their own file, as groups and runs have |
| Count on the Friends tab: "with 3 requests waiting" | Two sent through the route, the third written to the table by the test | Three signed-in senders would need a fifth emailed sign-in; the count reads the same rows |
| D7: the screens are named (the lists, Accept, Decline, Decline and block, Cancel, Block, the count, the blocked list with Unblock); no words or looks given | The words are Claude's, listed under "Words on the 17a screens"; the count is the tab's own text, "Friends (2)", not a badge; Remove now reads the lists again after a refusal too | No answer gives a badge's look or the wording, so nothing new was drawn and the words wait for the human's eye; Remove shares the list's one change function |
| Error codes for send (`request_own`, `already_friends`, `unblock_first`) | They have no message in `src/app/messages.ts` yet | No 17a screen can meet them: sending has no screen until 17b (CLAUDE.md, "Build for today") |
| Protocol "stays at 6" | It stays at 7 | It was 7 already (M16 16e-2); fields were added, none changed |

### 17b (the source is "17b design", above, approved by answers 31 and 32)
| Source says | We built | Why different |
|---|---|---|
| The ticket's reading "an old name held after a rename finds nobody", and the Rename hold criterion's "a search for `old` finds nobody" | The old name opens the renamed player's profile, from the search box too | E1 (a), chosen by the human with that side effect stated: search and the address are one route |
| "Friend's view and spoilers": "with two games played ... for each game, a card" | Game 1's card only | E4 (a): the profile shows what Me shows, and Me has no game 2 card until 16f |
| The same criterion: "for a day the viewer has not played, no rarest answer or recent result of that day appears" | No test of its own. Rarest answers come from closed days only, by the Me page's read (`src/game/me.ts`, tested in `src/app/api/me/route.db.test.ts`), and "recent" holds counts, not answers; the route test compares a friend's profile with that friend's own Me | Plan step 2: a run is only ever started for today (`src/game/runs.ts:197`, the insert pins `private.today()`), so a closed day can't be played and its answers spoil nothing |
| The friend's view is `since`, `month`, `rarest`, `recent`; "the viewer's own name gets the friend's view" | As written; the test players have no runs, so the views are compared field by field with `/api/me`, all zeros and empty lists | Building days of play is the Me test's job; the same function reads both |
| `private.hold_username()` "(2) deletes held rows whose `held_until` has passed" | As written; two renames at the same instant could each delete the same expired rows | Found by the review; an instant wide and harmless (the rows are gone either way), in ROADMAP's Next revision |
| Step 3: `npx supabase test db` "fails on exactly those four" files, and step 4: "every other file's count unchanged" | Before the migration exactly those four failed. After it `profile.test.sql` failed 4 of 35: its test 27 asserted M12 A2's "the old username is free for anyone at once" | The approved design replaces that rule (answer 10), so the test now expects OB017 and signs its player up under another name; `src/app/api/profile/username/route.db.test.ts` had the same assertion and changed the same way. The hypothesis "nothing else changes" was wrong once |
| Plan step 5 names the route test's filter `-t "players\|lookup"` | `-t "^players "` | "players" alone also matches single tests in other files and runs them without their set-up |
| Step 6: the race is "never both held and taken" | Also asserts the sign-up is always refused and the rename always succeeds | Both orders end that way: before the rename the name is the renamer's, after it it is held. The race was not seen failing with the lock taken out |
| "`takeAttempt`'s log text ... becomes \"attempt refused\"" | Done; `src/app/api/auth/email/route.db.test.ts` expects the new text | The test pinned the old words |
| Route handlers are `handle(fn)` | The players route wraps `handle` in a function that also takes Next's `params` | `handle` passes one argument; changing it would touch every route |
| Screens: "drawn by the Me page's own components (`src/app/me.tsx`, split so both use them)" | `StatsCards` in `me.tsx` draws both; the 7-day chart moved to `src/app/survived-chart.tsx` | The chart lived in the game screen's file, which a profile shouldn't load |
| "Friends' names on the Friends list link to their profile" | A "Profile" button link on each friend's row | No control on the site is a text link (M14 14b-2b-1) |
| Screens: no words given | Claude's, listed below | For the human's eye, as 17a's |
| The lookup limit's refusal is 429 `too_many_attempts` | The profile page says it in its own words; `src/app/messages.ts` still reads "Too many sign-in attempts..." for that code | The shared text is the sign-in form's; in ROADMAP's Next revision |

### Words on the 17b screens (Claude's, for the human to change)
- Friends page: the card "Find a player"; the field "Their exact username"; the button "Find"; on a friend's row, "Profile" (read "<name>'s profile").
- The profile: "‹ Friends"; the card "You and this player"; "Add friend"; "Friend request sent." and "Cancel request"; "<name> sent you a friend request." with "Accept", "Decline", "Decline and block"; "You're friends." with "Remove" and "Block"; "You've blocked this player." and "Unblock"; "This is you." and "Your Me page"; the heading "Rarest answers".
- The questions: "Remove <name> as a friend?"; the block's is 17a's.
- Messages: "There's no player with that username." (17a's, now also for a profile nobody has); "You've looked up a lot of players. Wait a while and try again."

### Words on the 17a screens (Claude's, for the human to change)
- Friends page: the card "Friend requests"; its chip's hidden words "waiting for your answer"; buttons "Accept", "Decline", "Decline and block"; the heading "Sent, waiting for an answer"; "Cancel"; on a friend, "Block".
- The question before a block: "Block <name>? You won't be friends, and you won't see each other's comments or reactions. They won't be told. You can unblock them in Settings."
- The Friends tab: "Friends (2)", read "Friends 2 friend requests".
- Settings: the card "Blocked players", "Unblock", "You haven't blocked anyone."
- Messages: "That friend request is already gone." (`request_not_found`), "There's no player with that username." (`player_not_found`), "That player isn't blocked." (`not_blocked`).

## Evidence
### 17a (2026-11-12, local stack only; nothing touched the hosted database or plor.app)
Each line is a command run in `C:/Users/jason/RIFF-m17` and what it printed.

**Plan step 1, the manual.** `grep -c "PostgreSQL 17, " docs/milestones/M17-profiles-and-friend-requests.md` → `12` (the facts under "The manual, read"; none contradicted the design).

**Plan step 2, the SQL tests first.** Before the migration, `npx supabase test db`:
```
/Users/jason/RIFF-m17/supabase/tests/account_deletion.test.sql (Wstat: 768 (exited 3) Tests: 0 Failed: 0)
  Parse errors: Bad plan.  You planned 22 tests but ran 0.
/Users/jason/RIFF-m17/supabase/tests/friend_requests.test.sql (Wstat: 768 (exited 3) Tests: 0 Failed: 0)
  Parse errors: Bad plan.  You planned 43 tests but ran 0.
/Users/jason/RIFF-m17/supabase/tests/plor_app_role.test.sql   (Wstat: 0 Tests: 15 Failed: 1)
Files=38, Tests=720, 17 wallclock secs
Result: FAIL
```
Exactly the three files the hypothesis named, and no other.

**Plan step 3, the migration.** `npx supabase migration up` → `Applying migration 20261112235831_friend_requests_and_blocks.sql...` `"message":"Migrations applied"`. Then `npx supabase test db` (run again after the last code change):
```
/Users/jason/RIFF-m17/supabase/tests/account_deletion.test.sql .. ok
/Users/jason/RIFF-m17/supabase/tests/friend_requests.test.sql ... ok
/Users/jason/RIFF-m17/supabase/tests/plor_app_role.test.sql ..... ok
/Users/jason/RIFF-m17/supabase/tests/private_schema.test.sql .... ok
Files=38, Tests=785, 17 wallclock secs
Result: PASS
```
785 is the 720 that ran before plus the two files that couldn't run then (22 and 43). This is the **Security** criterion's 17a part (`friend_requests.test.sql`: each grant by command, no delete on `block`, `private.unblock` definer with an empty `search_path` and `plor_app`'s execute alone, the two triggers invoker, no trigger on `friend_request`, RLS with `plor_app` policies only, OB016, a block deleting the friendship; `plor_app_role.test.sql`'s exact list; `private_schema.test.sql`: no Data API role holds anything on a private table) and **Account deletion**'s (`account_deletion.test.sql`: `rows_of` with both tables, 18 rows before and 0 after).

**Plan steps 4 and 5, the routes and the block check.** With the routes built and `blockedSql` not yet used by the two comment rules, `npm run test:db -- -t "blocking"`:
```
 ❯ src/app/api/friends/block/route.db.test.ts (13 tests | 2 failed)
     × drops a blocked player's comments and reactions from the preview of a viewer whose run isn't over (12)
     × hides the pair's comments and reactions from each other, in the thread, the feed and the reaction reads (12)
```
With the two lines in `src/friends/circle.ts` (`seesCommentSql`, `seesCommentReactionSql`), the same command passes. The requests tests were written after the module (Source diff).

`npm run test:db -- -t "friend requests|blocking|plor_app, which can't|at the same moment|racing an accept"` (after the last change):
```
 Test Files  4 passed | 53 skipped (57)
      Tests  38 passed | 376 skipped (414)
```
Which test proves which criterion (the test's name, in the file named):
- **Requests (5):** "sends a pending request the receiver sees…", "refuses a request to oneself…", "makes both players friends on accept…", "removes a declined request from both lists…" (`src/app/api/friends/requests/route.db.test.ts`).
- **Sent list and cancel (23):** "lets the sender cancel a request…", "removes a declined request … no declined state" (same file).
- **Mutual requests (23, 29):** "makes two players who request each other friends…", and the four "makes no friendship from mutual requests while …" cases, each block direction and each order (same file); "two players sending to each other at the same moment always end as friends…", 10 rounds as `plor_app` (`src/friends/requests.plor-app.db.test.ts`).
- **Blocker can't send (29):** "refuses the blocker's own request until they unblock", "after the unblock, the same send succeeds…", "decline and block: the waiting request leaves the blocker's list and count, and stays pending for its sender" (`src/app/api/friends/block/route.db.test.ts`).
- **Re-request after decline (17):** "lets a declined sender ask again straight away, three times in a row: time 1, 2, 3" (requests file).
- **No cap on pending (16), 17a's part:** "puts no cap on pending requests: 25 sends to 25 players all succeed" (requests file).
- **Count on the Friends tab (14):** "counts the requests waiting for the viewer, not blocked senders' nor their own, and sends nothing live": 3, then 2 after a decline, then 1 after a block, with `realtime.messages` for the viewer's `board:` topic the same before and after (requests file).
- **Block's reach (5, 12), 17a's part:** "drops a blocked player's comments and reactions from the preview of a viewer whose run isn't over", "hides the pair's comments and reactions from each other, in the thread, the feed and the reaction reads" (both ways, with a reaction and a report on a hidden comment refused), "keeps both players on the shared group's leaderboard" as each of three members sees it (block file).
- **Block ends the friendship (20):** "before any block: friends see each other everywhere…", then "ends the friendship: the blocker / the blocked player has no friend, on the list, the board or the friends leaderboard, at once" (block file); "a block racing an accept never leaves a friendship beside the block", 10 rounds as `plor_app` (plor-app file).
- **Unblock (21), 17a's part:** "unblocks from the blocked list, restoring no friendship and no request (21, D2)", "after the unblock, the same send succeeds and reaches the other player, both ways" (block file).
- **Block is silent (13, 28):** "is silent: the blocked player's send, sent list and cancel read as if the blocker hadn't answered", comparing the JSON of a send and a cancel to the blocker with those to a player who simply hasn't answered, and the request still pending with its `created_at` set back 31 days; "makes no friends through an invite link while a block is on: the link reads as one that has gone" (block file).
- **As `plor_app`:** "sends, accepts, blocks and unblocks as plor_app, which can't delete a block itself": the pair lock under the role's own grants and policies, the trigger ending the friendship with the role's delete, OB016 on a direct friendship insert, and `delete from private.block` refused with 42501 (plor-app file).

**Plan step 6, the screens.** `npm run test:e2e -- friend-requests` (port 3000 free before and after; `.next/dev` deleted first):
```
  ok 1 [chromium] › e2e\friend-requests.e2e.ts:32:1 › a request shows on the Friends tab and its page, is accepted, and a block ends the friendship until Unblock (13.2s)
  ok 2 [chromium] › e2e\friend-requests.e2e.ts:83:1 › Decline and block takes the request off the blocker's page, and the sender still sees it waiting (6.5s)
  2 passed (25.2s)
```
After the review's fix the same command, run again: `2 passed (45.4s)`, the first test now also checking that the blocked friend leaves the live board with no reload.
Its first run failed both tests on the tab's spoken name ("Friends , 1 friend request"), which is why the count's hidden words have no comma. It was not seen failing before the screens existed. **Not run locally:** the rest of the e2e suite (HANDOFF: unreliable on this PC); CI's run on the PR is the evidence. **Nobody has looked at the screens.**

**Plan step 7, the whole.**
- `npm run test:db` → `Test Files  57 passed (57)`, `Tests  414 passed (414)`, `Duration  209.48s`. So `-t "invite links and friends"` and `-t "comment|reaction|feed|board|leaderboard"` are unchanged but for the one line of `src/app/api/friends/route.db.test.ts` that now expects `requests: []` and `sent: []`.
- `npm test` → `Test Files  64 passed (64)`, `Tests  751 passed (751)` (with `src/app/api/guest-cookie.test.ts`, which calls each of the eight new routes with a guest cookie and gets 401, and `e2e/players.test.ts`).
- `npx next typegen` then `npx tsc --noEmit -p .` → no output. `npm run lint` → no problems.
- `npm run routes | grep friends` lists the eight new routes: `POST /api/friends/block`, `GET /api/friends/blocked`, `POST /api/friends/requests`, `…/requests/accept`, `…/requests/cancel`, `GET …/requests/count`, `POST …/requests/decline`, `POST /api/friends/unblock`.

**Removes:** nothing. 17a adds; the friend invite links go in 17c.

### 17b (2026-11-13, local stack only; nothing touched the hosted database or plor.app)
Each line is a command run in `C:/Users/jason/RIFF-m17` and what it printed.

**Plan step 1, the manual.** The five facts under "The manual, read (Plan step 1, 2026-11-13)"; none contradicted the design.

**Plan step 2, a closed day can't be played.** `grep -n "private.today()" src/game/runs.ts` → line 197, `insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, private.today())`: the route takes no date. The hypothesis held.

**Plan step 3, the SQL tests first.** Before the migration, `npx supabase test db`:
```
/Users/jason/RIFF-m17/supabase/tests/account_deletion.test.sql (Wstat: 768 (exited 3) Tests: 0 Failed: 0)
  Parse errors: Bad plan.  You planned 23 tests but ran 0.
/Users/jason/RIFF-m17/supabase/tests/auth_attempt.test.sql    (Wstat: 768 (exited 3) Tests: 6 Failed: 0)
  Parse errors: Bad plan.  You planned 16 tests but ran 6.
/Users/jason/RIFF-m17/supabase/tests/held_username.test.sql   (Wstat: 768 (exited 3) Tests: 0 Failed: 0)
  Parse errors: Bad plan.  You planned 21 tests but ran 0.
/Users/jason/RIFF-m17/supabase/tests/plor_app_role.test.sql   (Wstat: 0 Tests: 15 Failed: 1)
Files=39, Tests=754, 18 wallclock secs
Result: FAIL
```
Exactly the four files named.

**Plan step 4, the migration.** `npx supabase migration up` → `"applied":[...20261113045051_held_username_and_lookup_limit.sql"],"message":"Migrations applied"`. Then `npx supabase test db`:
```
/Users/jason/RIFF-m17/supabase/tests/profile.test.sql         (Wstat: 0 Tests: 35 Failed: 4)
  Failed tests:  27, 31-32, 35
# Failed test 27: "the old username is free for anyone at once"
#     died: OB017: username is held
Files=39, Tests=808
Result: FAIL
```
The replaced rule's own test (Source diff); 31, 32 and 35 failed only because 27's player was never made. With that test changed: `Files=39, Tests=808`, `Result: PASS`. 808 is 17a's 785 plus the new file's 21, one more in `auth_attempt.test.sql` and one more in `account_deletion.test.sql`. This is **Security**'s 17b part (`held_username.test.sql`: `plor_app` reads held names and holds no other privilege, RLS with one select policy, `hold_username` definer with an empty `search_path` and no role's execute; `plor_app_role.test.sql`'s exact list; `auth_attempt.test.sql`: `lookup` is a kind it counts and `plor_app` still can't touch the table), **Rename hold**'s database part (held for the renamer until 30 days on; another player, a new one in any case, and the renamer refused with OB017; refused with a day left, taken once the hold has ended; a second change still OB011) and **Account deletion** (27) (`account_deletion.test.sql`: 19 rows before, the held name among them, 0 after, and another player takes the name right away).

**Plan step 5, the route and the limit.** With the route built and OB017 not yet mapped, `npm run test:db -- -t "players"` failed the two hold tests with `"status": 500` where 409 `username_taken` was expected; with the mapping in `src/lib/profile.ts` they pass. `npm run test:db -- -t "^changing a username"` then failed "frees the old username for anyone at once" (the replaced rule; Source diff) and passes as "holds the old username from another player".

Which test proves which criterion (`src/app/api/players/[username]/route.db.test.ts` unless named):
- **Search:** "finds a player by their exact username only, and nobody when signed out or without a username (3)": the exact name is found; a name one letter short, the display name, the name in capitals, a space and a name nobody has are each 404 `player_not_found`; signed out 401; no username 409.
- **Blocked search finds nobody (24):** "finds nobody for a player the other has blocked, the same answer as a name nobody has (13, 24)": the two responses are compared whole, and the blocker still finds the blocked player.
- **Search limit (15) and No cap on pending (16):** "allows 60 lookups and requests in an hour and refuses the next, each player on their own count (15, 16, D1)": one found lookup, one request and 58 lookups of nobody pass; then a found name, a name nobody has and a request are each 429 `too_many_attempts`; the log line has `kind: "lookup"` and 8 characters of the hash, and no username, email or user ID; the player's own profile still opens and another player's lookup works. "counts a lookup against the viewer, found or not, but not their own name or a friend's (15, E2)". "counts again once an attempt is an hour old".
- **Stranger's view (1, 4, 11):** "shows a stranger the name, the totals and the game's card, and nothing else": the whole JSON equals `{username, name, relation, totals, offbeat}`.
- **Friend's view (1, 2, 25):** "shows a friend, and the player themself, what the Me page shows, with the last days' chart": equal to the player's own `/api/me` fields, with 7 recent days ending today. Spoilers: Source diff.
- **Block's reach, the profile part:** the blocked-search test above (the profile is the search).
- **Unblock (21), the profile and search parts:** "after an unblock, opens again as a stranger's profile (21)".
- **Rename hold (10):** "keeps a renamed player's old name opening their profile, under the same viewing rules (10)" (a friend's view for a friend, a stranger's for a stranger); "holds the old name from everyone for 30 days: a rename, a sign-up, and the player who gave it up (10, 22)"; "refuses the name on day 29 and frees it on day 30", after which the name opens its new owner's profile.
- **Old link and blocks (10, 13):** "gives a blocked player the same nothing at the old name (10, 13)".
- **As `plor_app`** (`src/lib/profile.plor-app.db.test.ts`): "holds a renamed player's name as plor_app, which can read held names and not write them" (an insert, a delete and an update of `private.held_username` each refused with 42501; `getPlayer` follows the old name with the role's own grants, its lookup counted through `take_auth_attempt`).

**Plan step 6, the race.** "a sign-up racing a rename never gets the name being given up, 10 rounds", as `plor_app`: in every round the rename succeeded, the sign-up was refused `username_taken`, the name was held for the renamer and no profile had it. `npm run test:db -- -t "held names and not write|racing a rename"` → `Tests  2 passed`.

**Plan step 7, the screens.** `npm run test:e2e -- profile` (port 3000 free before; `.next/dev` deleted first):
```
  ok 1 [chromium] › e2e\profile.e2e.ts:27:1 › a player is found by username, sent a request from their profile, and shows more once a friend (17.2s)
  1 passed (23.6s)
```
Its first two runs failed on the test's own locator for the "no player" line (two elements have the alert role), not on the screens. It was not seen failing before the screens existed. The run before it, `npm run test:e2e -- profile friend-requests`, passed 17a's two tests with the new Friends page. **Not run locally:** the rest of the e2e suite (HANDOFF: unreliable on this PC); CI's run on the PR is the evidence. **Nobody has looked at the screens.**

**CI's first run on PR #195** (run 43371637325: 177 passed, 3 failed): `e2e/shell.e2e.ts:55`, `:184` and `:326`, each comparing a tab's sections with a fixed list. Hypothesis, written before any change: the one extra entry is the Friends tab's new "Find a player" card (E6), and no other tab changed. `npm run test:e2e -- shell.e2e.ts:55` showed it: `+   "Find a player",` between "Friends leaderboard" and "Your friends", and nothing else. The app is as designed, so the list in `e2e/shell.e2e.ts` gained that one section; no assertion was removed. Then `npm run test:e2e -- shell` → `10 passed (1.3m)`, the 320px no-sideways-scroll and no-text-link tests among them, now with the new card and the Profile button on the page.

**Plan step 8, the whole.**
- `npm run test:db` → `Test Files  59 passed (59)`, `Tests  430 passed (430)`, `Duration  219.73s`.
- `npm test` → `Test Files  64 passed (64)`, `Tests  752 passed (752)` (with `src/app/api/guest-cookie.test.ts`, which now calls `GET /api/players/[username]` with a guest cookie and gets 401, and `e2e/players.test.ts`).
- `npx next typegen` then `npx tsc --noEmit -p .` → no output. `npm run lint` → no problems.
- `npm run routes | grep players` → `GET /api/players/[username] src\app\api\players\[username]\route.ts`.

**Removes:** M12 A2's "the old username is free for anyone at once", with its two tests' assertions; the log text "sign-in attempt refused". Nothing else: 17b adds.

## Review
### 17b (the `reviewer` agent, Sonnet, a fresh context, 2026-11-13; it read the diff and ran `npm test`, `tsc`, lint and `npm run routes`, and was told not to touch the shared database, so the database and e2e runs are the author's)
- Blocking findings and how each was fixed:
  - **`docs/DESIGN.md` had none of the new screens** (CLAUDE.md: a PR that changes what it describes updates it). Fixed: Find a player, the profile page and its action row are described there, and the line numbers this change shifted are corrected.
- Not blocking, and found sound: a name nobody has and a player who blocked the viewer taking one path (the same query, the same count, the same 404 before any stats are read); a stranger's view built from five fields only; a 429 being the same for a found name, a missing one and a request; the limit holding for sends and not bypassed by case or held names; the trigger's lock order, its citext comparison under an empty `search_path`, and its order after the 30-day rule's; the two replaced tests changed to a stricter assertion, not weakened; the Me page's markup and count-up names unchanged, by reading; every number from the ticket; no orphans.
- Deferred to ROADMAP "Next revision" (For M17): the shared `too_many_attempts` text speaking of sign-in; two renames at one instant deleting the same expired held rows; the race test covering a sign-up but not two renames for one freed name.
- Unverified by the reviewer: the database, pgTAP and e2e runs (the author's, in Evidence); the Me page being unchanged, read not rendered (its e2e runs on CI).

### 17a (the `reviewer` agent, Sonnet, a fresh context, 2026-11-12; it read the diff and ran `npm test`, `tsc`, lint and `npm run routes`, and was told not to touch the shared database, so the database and e2e runs are the author's)
- Blocking findings and how each was fixed:
  - **A blocked or removed friend stayed on the blocker's open live board** until the page next loaded, where D5 (a) says "the blocker's page reloads its board after the block"; the e2e didn't look at the board. Fixed: the Friends tab's board starts again after any change in the friends list (`src/app/home.tsx`, `changes`). The e2e now checks the board: with the fix taken out it failed (`Expected substring: not "frb…"`, `Received string: "Friends today frb…: hasn't played yet"`), and with it `2 passed`.
- Not blocking, and found sound: the migration against the design line by line; no response of a new or changed route differing for a blocked player; no path through the new routes leaving a friendship beside a block or deleting a hidden request; `withPair`'s lock order, rollback and release; every SQL-building helper taking only SQL text or a parameter; each 17a acceptance line having a test that doesn't mock what it tests; the commit messages.
- **A correction to the design's words, from the review:** OB016 is not a full backstop for the invite-link `addFriend`, which takes no pair lock: an invite-link friendship and a block written at the same instant can each miss the other's uncommitted row, and both would stand. The window is an instant wide and the invite links go in 17c, so nothing is built for it (ROADMAP, Next revision: a race milliseconds wide is closed, not parked).
- Deferred to ROADMAP "Next revision" (For M17): the leaderboard and feed column on an open page after a block; the count's reply order and its error line on every page; the friends list's two state slips; "Blocked players" not being a heading; the transaction wrapper written twice.
- Unverified by the reviewer: the database, pgTAP and e2e runs (the author's, in Evidence); the manual's quotes (fetched by a Haiku subagent, not re-read); DESIGN.md's line numbers but one.
