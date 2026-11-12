# M17 — Player profiles and friend requests

**Status:** planned, NOT approved to build. Its design round is in progress (started 2026-11-11). Four rounds of guided questions were answered 2026-11-05 (the quote "Approve, start dictionary" approved M16's dictionary, not this ticket); its open questions wait for that round. It ships before the closed beta and after M16's game 2 ("Profiles after Game 2", "Before the beta (Recommended)").

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

## Open
What truly remains; nothing above is designed around an unanswered question.
- **The privacy page draft** below waits for the human's approval (answer 26).
- **This ticket's approval:** its Status stays "not approved to build" until the human approves it.
- The lines marked *unverified* in Design (a request to someone who is already a friend; the new tables cascading on account deletion) stay unverified.

## Privacy page draft
**A draft, awaiting the human's approval (answer 26). `src/app/privacy/page.tsx` is not changed.** Added under "What we keep", in the page's tone; "Last updated" would change with it:
- **Your profile and who can find it:** any signed-in player can search for you by your exact username (not by display name or part of a username) and open your profile. A signed-in player who isn't your friend sees your totals and streak, and a card for each game. Your friends also see your calendar of days played, your rarest answers and your recent results. Nobody who is signed out can see a profile. If you change your username, the old one still opens your profile for 30 days and no one else can take it; if you delete your account in that time, the old username is freed at once.
- **Friend requests and blocks:** we keep the friend requests you send and receive, and the players you block. Blocking someone ends any friendship with them, stops their requests reaching you, and makes your profile and username show nothing to them. You and they stop seeing each other's comments and reactions, though results on a shared group's board still show. They are not told. You can unblock someone from a list in Settings.
- **Search counts:** to stop anyone listing usernames, we count how many searches each signed-in player makes in an hour.

Also: "your invite link" leaves the "Your friends" line when friend invite links end (17c), and "Keeping and deleting" would add requests and blocks.

## Acceptance criteria
Each is a check that can fail. "Route test" is a `route.db.test.ts` run the way DECISIONS.md says; "pgTAP" is `supabase test db`. File names are set when built.
- [ ] **Search.** Route test: an exact username returns that player; a prefix, a display name, an empty string and a missing name each return nobody; with no session the route answers 401.
- [ ] **Blocked search finds nobody (24).** Route test: after A blocks B, B's search for A's exact username returns the same status and body as a search for a username nobody has; A's search for B still finds B.
- [ ] **Search limit (15).** Route test: as one player, searches 1 to 60 inside an hour succeed (found or not) and the 61st answers 429 `too_many_attempts`; a second player's first search still succeeds; the refusal is logged with its kind and no username or email in the line.
- [ ] **Stranger's view (1, 4, 11).** Route test: the profile response for a non-friend holds the all-games summary and a card for each game and no calendar, rarest answers or recent results, checked on the JSON, not the screen; a signed-out request answers 401.
- [ ] **Friend's view and spoilers (1, 2, 25).** Route test: with two games played, a friend's response holds the all-games summary and, for each game, a card with its calendar, rarest answers and recent results, as the Me page does; for a day the viewer has not played, no rarest answer or recent result of that day appears in it.
- [ ] **Requests (5).** Route test: send creates a pending request; the receiver's list shows it; accept makes both friends; decline removes it and no friendship exists; a request to oneself is refused.
- [ ] **Sent list and cancel (23).** Route test: after A sends to B, A's sent list holds the request; A cancels it and both A's sent list and B's list are empty; after B declines instead, A's sent list no longer holds it and shows no "declined" state.
- [ ] **Mutual requests (23, 29).** Route test: A sends to B, then B sends to A: A and B are friends, no pending request remains in either list, and neither send is refused. With A having blocked B (or B having blocked A) the same two sends make no friendship, whichever order they come in.
- [ ] **Blocker can't send (29).** Route test: after A blocks B, A's send to B is refused and no request exists; A unblocks B, and the same send now succeeds and B's list shows it. A request B sent to A before the block is not in A's list or A's Friends count after the block, and stays pending in B's sent list.
- [ ] **Re-request after decline (17).** Route test: decline, then send again straight away, succeeds; repeated three times in a row, still succeeds. After a block, the same send does not put a request in the blocker's list.
- [ ] **No cap on pending (16).** Route test: one player sends a request to each of 25 different players (25 is the test's size, not a limit); every send succeeds, and the only refusal reachable is the search limit.
- [ ] **Count on the Friends tab (14).** Route test: with 3 requests waiting the Friends page data shows 3, after one is declined 2; a request from a player the viewer has blocked is not counted; no Realtime message is sent when a request arrives (the viewer's board topic is compared before and after).
- [ ] **Block's reach (5, 12).** Route test and pgTAP: after A blocks B, B's request does not reach A; B opening A's profile gets the same status and body as a username nobody has; A's comments and reactions are absent from B's comment, reaction and feed responses, and B's from A's; on a shared group's leaderboard both players' results are still present.
- [ ] **Block ends the friendship (20).** Route test: A and B are friends and appear in each other's feed and on a shared live board; A blocks B; each is absent from the other's friends, feed and live board data, read before and after.
- [ ] **Unblock (21).** Route test: A's blocked list holds B; A unblocks B; the list is empty, B's profile opens for B as a stranger's (not a friend's), B's search finds A, and a new request from B reaches A.
- [ ] **Block is silent (13, 28).** Route test: B's response to sending a request, and B's list of their own requests, are the same as when A simply hasn't answered; no B-facing response names the block. B's request stays in B's sent list as pending, still there after the test clock is advanced past the 30-day hold, so nothing expires it (23, 28).
- [ ] **Rename hold (10).** Route test with the clock set: after A renames from `old` to `new`, the address for `old` opens A's profile under the viewing rules; another player renaming or signing up as `old` is refused at day 29 and succeeds at day 30; A renaming back to `old` inside the 30 days is refused (22); a search for `old` finds nobody.
- [ ] **Old link and blocks (10, 13).** Route test: B, blocked by A, opens A's old address and gets the same response as a username nobody has.
- [ ] **Security (proposals above, once approved).** pgTAP: `plor_app` has on each new table only the grants the approved proposal lists; a direct read of another player's requests or blocks returns no rows.
- [ ] **Invite links removed (6).** `GET /i/<any code>` answers 404; a search of the repo for `friend_invite` finds only the migration that drops it; group invite links pass their existing route tests.
- [ ] **Account deletion (27).** pgTAP: A renames from `old` to `new` and then `private.delete_account` runs for A inside the 30 days; no row of A remains in requests, blocks or held names; right after, another player renames or signs up as `old` and it succeeds, with no wait.

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
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
