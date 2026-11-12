# M17 — Player profiles and friend requests

**Status:** planned, NOT approved to build. Its design round is in progress (started 2026-11-11). Four rounds of guided questions were answered 2026-11-05 (the quote "Approve, start dictionary" approved M16's dictionary, not this ticket); its open questions wait for that round. It ships before the closed beta and after M16's game 2 ("Profiles after Game 2", "Before the beta (Recommended)").

## Goal
A signed-in player can find another player by their exact username, open their profile, and send a friend request that the other player accepts, declines or blocks.

## Who uses it / what breaks without it
- Used by: every signed-in player.
- Breaks without it: nobody can open another player's profile today, and there is no search (read 2026-11-05: `src/app/(shell)/` has `me` for your own page and no page for anyone else). Once friend invite links go, this is the only way to add a friend.

## Source
No entry in `docs/SOURCES.md` covers this feature's limits or how to stop people listing usernames. *Stop and ask at the design round: a source is needed before the search route's limits are set.* Until then this ticket follows:
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

## Design (proposed)
Each line cites the answer, source or DECISIONS.md row it follows. "Reading" marks a line that reads an answer one way where it could be read another; the human confirms it. Nothing here is approved.

**Finding and opening a profile**
- **Search by exact username.** The full username gives one result, anything else gives nobody; a signed-out visitor can't search (answers 1, 3). Only current usernames match: an old name held after a rename (below) finds nobody (reading of 3, "Exact username").
- **A profile's address holds the username** (9). Its exact path is chosen when it is built; no answer gives it.
- **Searches are limited to 60 an hour per player** (15). Every search counts, found or not (reading of 15). A refused search is answered the way 12e answers a refused sign-in code, 429 `too_many_attempts`, logged with its kind and a hashed key, and counted in a table by a guarded function with no secret key (DECISIONS.md, 2026-10-24 sign-in code limits; `milestones/M12-12e-sign-in-limits.md`, L1 (a) and L2). That is the one way limits are done here, so it is reused, not a second one. No per-address limit is designed: only a per-player number was given (see Open).
- **What a signed-in stranger sees:** totals and streak, nothing else (1, 4). They are the same as the player's own Me page: the all-games summary and a card for each game (11).
- **What a friend sees:** the same, plus the calendar of days played, rarest answers and recent results (1, 2). Rarest answers and recent results never spoil a day the viewer hasn't played (a rule carried from the first draft; it follows DECISIONS.md, "Beside game 1": a game the viewer hasn't played stays blurred).
- **Nobody signed out sees a profile** (1).

**Renaming**
- **A renamed player's old name is held 30 days** (10), the same 30 as between username changes (M12 12b). During the hold the old address still opens that player's profile under the same viewing rules as any profile, so an old link never reaches a stranger (10, Numbers). After the hold the name is free.
- This replaces M12 A2's "the old one free for anyone at once" (DECISIONS.md, 2026-10-23, usernames can change once every 30 days). See Open, the hold's edges.

**Friend requests**
- **Send, accept, decline, plus a list of pending ones** (5). A request needs a search first (16), so the search limit is what bounds how many can be sent.
- **A new request shows as a count on the Friends tab, when the page next loads; no live nudge** (14).
- **No separate cap on pending requests** (16).
- **After a decline a new request can be sent right away; no wait** (17). A block is what stops it.
- **Friend invite links end in the same release that search ships**, so there is always a way to add a friend (6, 8; "Removes"). Group invite links stay (6).

**Blocking**
- **Decline and block** is one choice on an unwanted request (5). A block stops the blocked player's requests reaching the blocker and hides the blocker's profile from them (5).
- **It also hides comments and reactions:** neither player sees the other's comments or reactions anywhere. Results on a shared group's boards still show (12).
- **It is silent** (13): the blocked player's request looks unanswered, and the blocker's profile looks to them as if it doesn't exist (the same answer as a username nobody has). The blocker's count and pending list don't show that request.

**Deleting an account** removes its requests and blocks (kept from the first draft's criterion). It should follow from M12 12c, where deleting the `auth.users` row cascades (DECISIONS.md, 2026-10-23); *unverified* until a test shows the new tables cascade.

## Security changes proposed
For the human to approve, change or reject; none is decided here. CLAUDE.md, Security: changes to auth, roles, grants, RLS or what one player can read of another are proposed first and recorded in DECISIONS.md.
1. **New tables for requests and blocks**, with `plor_app` grants that let it read, add and delete only what the routes need, one policy per command, in the pattern of `private.friendship` (DECISIONS.md, 2026-10-22, invite links and friends). Routes scope every change to the signed-in player.
2. **A stranger can read another player's totals and streak, a friend a fuller profile.** This is a new way for one player to read another's data, and the profile route is its only door. Proposal: the server decides the view (stranger, friend, or nothing) and returns only that view's fields; the database is not opened to wider reads.
3. **Blocking changes what existing routes return:** comments, reactions and the feed drop a blocked pair's items (12); group boards don't. Proposal: one shared check used by each of those reads, so no route has its own copy.
4. **The held old name:** a new table of held names with a release date, and the 12b username trigger refusing a held name to anyone else. This changes the 12b trigger and its grants.
5. **The search counter:** a table and a guarded function like `private.take_auth_attempt`, keyed by the player instead of the IP. Proposal: reuse that table and function if it can hold a per-player key, rather than a second pair.
6. **Account deletion:** `private.delete_account` must leave none of the player's requests, blocks or held names behind.

## Open, for the design round
Each is a question for the human; nothing above is designed around them.
- **The search limit per address.** Answer 15 gives a number per player only. A person with several accounts, or none, is not bounded by it.
- **Whether the OWASP pages become sources.** A search on 2026-11-11 found that OWASP's Authentication Cheat Sheet, WSTG-IDNT-04 and REST Security Cheat Sheet ask for a limit and for replies that don't tell an existing account from a missing one, and give no number; none is in SOURCES.md yet, which needs the human's OK. Answer 3 already accepts that an exact search reveals which usernames exist.
- **The privacy policy.** Usernames become searchable and profiles visible to strangers (`src/app/privacy/page.tsx`); no answer gives its wording.
- **Whether a block ends an existing friendship,** and what happens to the pair's live board and feed. Answer 5 says blocking stops requests and hides the profile, and 12 hides comments and reactions; neither says friends are removed.
- **Whether a block can be undone,** and how.
- **Whether a blocked player's search finds the blocker.** Answer 13 says the profile looks missing; search isn't mentioned.
- **What a requester sees after a decline,** whether they can see and cancel their own pending requests, and what happens when two players request each other or a request goes to someone already a friend.
- **The hold's edges.** Holding the old name contradicts M12 A2 ("free for anyone at once"); can the previous owner take it back at once; is it freed when that account is deleted.
- **What the full profile shows per game.** Answer 11 settles totals and streak; answer 2's calendar, rarest answers and recent results aren't said to be per game or across both.
- **What the Friends tab's count counts.** The reading used above is requests waiting for the viewer (14).

## Acceptance criteria
Each is a check that can fail. "Route test" is a `route.db.test.ts` run the way DECISIONS.md says; "pgTAP" is `supabase test db`. File names are set when built.
- [ ] **Search.** Route test: an exact username returns that player; a prefix, a display name, an empty string and a missing name each return nobody; with no session the route answers 401.
- [ ] **Search limit (15).** Route test: as one player, searches 1 to 60 inside an hour succeed (found or not) and the 61st answers 429 `too_many_attempts`; a second player's first search still succeeds; the refusal is logged with its kind and no username or email in the line.
- [ ] **Stranger's view (1, 4, 11).** Route test: the profile response for a non-friend holds the all-games summary and a card for each game and no calendar, rarest answers or recent results, checked on the JSON, not the screen; a signed-out request answers 401.
- [ ] **Friend's view and spoilers (1, 2).** Route test: a friend's response holds all four parts; for a day the viewer has not played, no rarest answer or recent result of that day appears in it.
- [ ] **Requests (5).** Route test: send creates a pending request; the receiver's list shows it; accept makes both friends; decline removes it and no friendship exists; a request to oneself is refused.
- [ ] **Re-request after decline (17).** Route test: decline, then send again straight away, succeeds; repeated three times in a row, still succeeds. After a block, the same send does not put a request in the blocker's list.
- [ ] **No cap on pending (16).** Route test: one player sends a request to each of 25 different players (25 is the test's size, not a limit); every send succeeds, and the only refusal reachable is the search limit.
- [ ] **Count on the Friends tab (14).** Route test: with 3 requests waiting the Friends page data shows 3, after one is declined 2; a request from a player the viewer has blocked is not counted; no Realtime message is sent when a request arrives (the viewer's board topic is compared before and after).
- [ ] **Block's reach (5, 12).** Route test and pgTAP: after A blocks B, B's request does not reach A; B opening A's profile gets the same status and body as a username nobody has; A's comments and reactions are absent from B's comment, reaction and feed responses, and B's from A's; on a shared group's leaderboard both players' results are still present.
- [ ] **Block is silent (13).** Route test: B's response to sending a request, and B's list of their own requests, are the same as when A simply hasn't answered; no B-facing response names the block.
- [ ] **Rename hold (10).** Route test with the clock set: after A renames from `old` to `new`, the address for `old` opens A's profile under the viewing rules; another player renaming or signing up as `old` is refused at day 29 and succeeds at day 30; a search for `old` finds nobody.
- [ ] **Old link and blocks (10, 13).** Route test: B, blocked by A, opens A's old address and gets the same response as a username nobody has.
- [ ] **Security (proposals above, once approved).** pgTAP: `plor_app` has on each new table only the grants the approved proposal lists; a direct read of another player's requests or blocks returns no rows.
- [ ] **Invite links removed (6).** `GET /i/<any code>` answers 404; a search of the repo for `friend_invite` finds only the migration that drops it; group invite links pass their existing route tests.
- [ ] **Account deletion.** pgTAP: after `private.delete_account`, no row of that player remains in requests, blocks or held names.

## Out of scope
- Search by display name or partial name (answer 3).
- Profile pictures (ROADMAP, Later).
- Signed-out profiles (answer 1).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 60 searches an hour per player | Stops listing usernames | Human, 2026-11-11 (answer 15); no source gives a number |
| Searches allowed per address | Stops listing usernames | Open: a human number |
| 30 days a freed username is held | An old profile link doesn't reach a stranger | Human, 2026-11-11 (answer 10); the same 30 as M12 12b's wait between changes |
| No cap on pending requests | Requests | Human, 2026-11-11 (answer 16) |
| No wait after a decline | Requests | Human, 2026-11-11 (answer 17) |

## Plan
Draft sub-tickets, for the human to reorder after the design round:
1. **17a, friend requests and blocking:** tables, grants and routes, and blocking's reach into the comment, reaction and feed reads (answer 12). A security change, proposed first and recorded in DECISIONS.md.
2. **17b, search and the profile page:** the search limit, the profile views, and the 30-day hold on an old name with its trigger change (answers 9, 10, 15), as the address needs the hold.
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
