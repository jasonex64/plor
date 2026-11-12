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
- **A profile page for each player,** reusing Me's totals, calendar and rarest answers.
- **Rarest answers and recent results never spoil a day the viewer hasn't played** (a rule, not a setting).
- **Friend requests:** send, accept, decline, plus a list of pending ones. Blocking removes any friendship and stops new requests.
- **Friend invites end in the same release that search ships,** so there is always a way to add a friend.

## Open, for the design round
- The search limit per address: answer 15 gives it per player only.
- A source for the search limit. A search on 2026-11-11 found that OWASP's Authentication Cheat Sheet, WSTG-IDNT-04 and REST Security Cheat Sheet ask for a limit and for replies that don't tell an existing account from a missing one, and give no number; none is in SOURCES.md yet, which needs the human's OK. Answer 3 already accepts that an exact search reveals which usernames exist.
- The privacy policy: usernames become searchable and profiles visible to strangers (`src/app/privacy/page.tsx`).
- The Design and the acceptance criteria below are not yet rewritten for answers 9 to 17, and the ticket is not approved to build.

## Acceptance criteria
Draft shape, for the human to change:
- [ ] Searching an exact username finds that player; any other text finds nobody; a signed-out visitor can't search.
- [ ] A stranger's profile shows totals and streak and nothing else, checked against the API's response, not only the screen.
- [ ] A friend's profile shows all four parts, and no part reveals a day the viewer hasn't played.
- [ ] A request can be accepted, declined or blocked; a blocked player can't send a request or open the profile.
- [ ] The search route's limits are enforced (numbers below).
- [ ] `/i/` answers 404, no friend invite code is left, and group invite links work as before.
- [ ] Deleting an account removes its requests and blocks.

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
1. **17a, friend requests and blocking:** tables, grants and routes. A security change, proposed first and recorded in DECISIONS.md.
2. **17b, search and the profile page.**
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
