---- MODULE FriendsAndGroups ----
\* You and one other player as friends, and you in a group, side by side. Drawn from the code as of commit d3c2c62
\* (each action cites it); a picture of the flow, not a check of it. The group half follows the rules that
\* verify-group-membership checks; the friends half has no check (the human, 2026-11-17, answer 13).
EXTENDS Naturals

VARIABLES
  rel,    \* you and the other player: "none", "sent", "received", "friends", "blocked"
  group   \* you and a group: "none", "creator", "member"

vars == <<rel, group>>

Init == rel = "none" /\ group = "none"

\* ---- Friends (src/friends/requests.ts; src/app/player.tsx, src/app/friends-list.tsx) ----
\* "Add friend" (player.tsx:80; requests.ts:72-93).
YouAdd == rel = "none" /\ rel' = "sent" /\ UNCHANGED group
\* They send a request; if yours was waiting, the crossing sends make you friends (requests.ts:85-88).
TheySend == rel \in {"none", "sent"} /\ rel' = (IF rel = "sent" THEN "friends" ELSE "received") /\ UNCHANGED group
\* They accept, or decline (you aren't told: requests.ts:108-113).
TheyAccept == rel = "sent" /\ rel' = "friends" /\ UNCHANGED group
TheyDecline == rel = "sent" /\ rel' = "none" /\ UNCHANGED group
\* "Cancel request" (requests.ts:115-120).
YouCancel == rel = "sent" /\ rel' = "none" /\ UNCHANGED group
\* "Accept", "Decline", "Decline and block" (friends-list.tsx:92-135).
YouAccept == rel = "received" /\ rel' = "friends" /\ UNCHANGED group
YouDecline == rel = "received" /\ rel' = "none" /\ UNCHANGED group
YouDeclineAndBlock == rel = "received" /\ rel' = "blocked" /\ UNCHANGED group
\* "Remove", by either of you (friends-list.tsx:158-163).
Unfriend == rel = "friends" /\ rel' = "none" /\ UNCHANGED group
\* "Block" ends the friendship (requests.ts:122-130).
YouBlock == rel = "friends" /\ rel' = "blocked" /\ UNCHANGED group
\* "Unblock" restores no friendship or request (requests.ts:132-139).
YouUnblock == rel = "blocked" /\ rel' = "none" /\ UNCHANGED group

\* ---- Groups (src/groups/groups.ts; src/app/groups.tsx; group_member_guard and group_member_left in the baseline) ----
\* "Create group" (groups.tsx:88-95).
Create == group = "none" /\ group' = "creator" /\ UNCHANGED rel
\* "Join group" from an invite link, "Join {name}?" (groups.tsx:310-332); a full group or ten groups refuse it.
Join == group = "none" /\ group' = "member" /\ UNCHANGED rel
\* "Leave group" (groups.tsx:177-183); a creator's group passes on, the last member's is deleted.
YouLeave == group \in {"creator", "member"} /\ group' = "none" /\ UNCHANGED rel
\* "Delete group" (groups.tsx:184-190).
YouDelete == group = "creator" /\ group' = "none" /\ UNCHANGED rel
\* The creator's "Remove", or their "Delete group" (groups.tsx:170-176, 184-190).
CreatorRemovesYou == group = "member" /\ group' = "none" /\ UNCHANGED rel
\* The creator leaves and you have been in longest: the group is yours (group_member_left).
Handover == group = "member" /\ group' = "creator" /\ UNCHANGED rel

Next ==
  \/ YouAdd \/ TheySend \/ TheyAccept \/ TheyDecline \/ YouCancel \/ YouAccept \/ YouDecline \/ YouDeclineAndBlock
  \/ Unfriend \/ YouBlock \/ YouUnblock
  \/ Create \/ Join \/ YouLeave \/ YouDelete \/ CreatorRemovesYou \/ Handover

Spec == Init /\ [][Next]_vars

\* A blocked player is never also a friend or a waiting request: one relation at a time.
OneRelation == rel \in {"none", "sent", "received", "friends", "blocked"}
====
