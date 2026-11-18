---- MODULE GroupMembership ----
\* Players joining, leaving, being removed from and deleting groups, and deleting their accounts, all at once. Each
\* action below is one indivisible step in the code, named in SKILL.md's coverage record.
\*
\* Every membership change runs group_member_guard first, which locks the group's row until commit, and a join also
\* locks the joining player's profile; so a change's checks and writes, and the triggers after it, are one step here.
\* A count of a player's groups is never too low under these locks: only a join raises it, and a join holds the
\* profile lock. What a route reads before its statement (a group by its invite code, checkCreator) is a step of its own.
\*
\* Left out: names and invite codes (a player may join any group that exists), comments and reactions on a leave, and
\* deadlocks other than account deletion's (a deadlock aborts one side, which changes nothing).
EXTENDS Integers, FiniteSets, Sequences, TLC

CONSTANTS Players, Groups, MemberCap, GroupCap

None == "none"
Idle == [kind |-> "idle"]

VARIABLES
  exists,    \* exists[g]: the private.player_group row exists
  members,   \* members[g]: the group's private.group_member rows, in the order they joined
  creator,   \* creator[g]: creator_id
  gone,      \* gone[p]: the player's account is deleted
  req,       \* req[p]: the player's group request on its way through the server
  del,       \* del[p]: the player's account deletion: <<the groups delete_account read>>, or <<>>
  wrongActor \* a creator-only change was made by a player who was not the creator at that moment

vars == <<exists, members, creator, gone, req, del, wrongActor>>

Set(s) == {s[i] : i \in 1..Len(s)}
Without(s, p) == SelectSeq(s, LAMBDA x : x # p)
GroupsOf(p) == {g \in Groups : p \in Set(members[g])}

Init ==
  /\ exists = [g \in Groups |-> FALSE]
  /\ members = [g \in Groups |-> <<>>]
  /\ creator = [g \in Groups |-> None]
  /\ gone = [p \in Players |-> FALSE]
  /\ req = [p \in Players |-> Idle]
  /\ del = [p \in Players |-> <<>>]
  /\ wrongActor = FALSE

\* A membership leaves (leave, remove, or account deletion), with group_member_left after it: the last member deletes
\* the group, and a creator who leaves hands it to the longest-standing member (order by joined_at).
LeaveRow(g, p) ==
  LET rest == Without(members[g], p) IN
  [ ex |-> rest # <<>>,
    ms |-> rest,
    cr |-> IF rest = <<>> THEN None ELSE IF creator[g] = p THEN Head(rest) ELSE creator[g] ]

\* createGroup: the group and its creator's membership in one statement; the guard counts the creator's groups, and
\* player_group_creator_is_member is checked at commit.
Create(p, g) ==
  /\ ~gone[p] /\ req[p] = Idle /\ ~exists[g]
  /\ IF Cardinality(GroupsOf(p)) >= GroupCap
       THEN UNCHANGED <<exists, members, creator>>   \* too_many_groups (OB010)
       ELSE /\ exists' = [exists EXCEPT ![g] = TRUE]
            /\ members' = [members EXCEPT ![g] = <<p>>]
            /\ creator' = [creator EXCEPT ![g] = p]
  /\ UNCHANGED <<gone, req, del, wrongActor>>

\* joinGroup, its CTE's read: which group the invite code names.
JoinReads(p, g) ==
  /\ ~gone[p] /\ req[p] = Idle /\ exists[g]
  /\ req' = [req EXCEPT ![p] = [kind |-> "join", g |-> g]]
  /\ UNCHANGED <<exists, members, creator, gone, del, wrongActor>>

\* joinGroup, its insert: the guard locks the group and the player's profile and counts both caps. A group deleted
\* since the read fails the foreign key (23503); a deleted account fails the one to auth.users.
JoinWrites(p) ==
  /\ req[p].kind = "join"
  /\ LET g == req[p].g IN
       IF exists[g] /\ ~gone[p] /\ p \notin Set(members[g])
          /\ Len(members[g]) < MemberCap /\ Cardinality(GroupsOf(p)) < GroupCap
         THEN members' = [members EXCEPT ![g] = Append(@, p)]
         ELSE UNCHANGED members
  /\ req' = [req EXCEPT ![p] = Idle]
  /\ UNCHANGED <<exists, creator, gone, del, wrongActor>>

\* leaveGroup: LOCK_GROUP, then the membership's delete and group_member_left.
Leave(p, g) ==
  /\ ~gone[p] /\ req[p] = Idle /\ p \in Set(members[g])
  /\ LET r == LeaveRow(g, p) IN
       /\ exists' = [exists EXCEPT ![g] = r.ex]
       /\ members' = [members EXCEPT ![g] = r.ms]
       /\ creator' = [creator EXCEPT ![g] = r.cr]
  /\ UNCHANGED <<gone, req, del, wrongActor>>

\* removeMember and deleteGroup: checkCreator, a statement of its own.
CreatorChecks(p, g, what, m) ==
  /\ ~gone[p] /\ req[p] = Idle /\ exists[g] /\ creator[g] = p
  /\ req' = [req EXCEPT ![p] = [kind |-> what, g |-> g, m |-> m]]
  /\ UNCHANGED <<exists, members, creator, gone, del, wrongActor>>

\* removeMember's delete: LOCK_GROUP, and only where creator_id is still the remover and the member is not them.
RemoveWrites(p) ==
  /\ req[p].kind = "remove"
  /\ LET g == req[p].g
         m == req[p].m
         does == exists[g] /\ creator[g] = p /\ m \in Set(members[g]) /\ m # p
     IN /\ IF does
             THEN LET r == LeaveRow(g, m) IN
                  /\ exists' = [exists EXCEPT ![g] = r.ex]
                  /\ members' = [members EXCEPT ![g] = r.ms]
                  /\ creator' = [creator EXCEPT ![g] = r.cr]
             ELSE UNCHANGED <<exists, members, creator>>
        /\ wrongActor' = (wrongActor \/ (does /\ creator[g] # p))
  /\ req' = [req EXCEPT ![p] = Idle]
  /\ UNCHANGED <<gone, del>>

\* deleteGroup's delete: only where creator_id is still the deleter. Its memberships go by the cascade, and
\* group_member_left finds nothing left to do.
DeleteGroupWrites(p) ==
  /\ req[p].kind = "deleteGroup"
  /\ LET g == req[p].g
         does == exists[g] /\ creator[g] = p
     IN /\ exists' = IF does THEN [exists EXCEPT ![g] = FALSE] ELSE exists
        /\ members' = IF does THEN [members EXCEPT ![g] = <<>>] ELSE members
        /\ creator' = IF does THEN [creator EXCEPT ![g] = None] ELSE creator
        /\ wrongActor' = (wrongActor \/ (does /\ creator[g] # p))
  /\ req' = [req EXCEPT ![p] = Idle]
  /\ UNCHANGED <<gone, del>>

\* delete_account reads the player's groups once, for its loop.
AccountDeleteReads(p) ==
  /\ ~gone[p] /\ del[p] = <<>>
  /\ del' = [del EXCEPT ![p] = <<GroupsOf(p)>>]
  /\ UNCHANGED <<exists, members, creator, gone, req, wrongActor>>

\* The rest of delete_account, to its commit: each group it read is left as leaveGroup leaves it (the group's lock,
\* then the membership); a group joined since the read is left to auth.users' cascade, which takes the membership's
\* lock before the group's and can deadlock with a leave or a removal in that group (ROADMAP, For M12). A deadlock
\* aborts one side: here, the deletion, which then changes nothing. Either way group_member_left runs for each row.
AccountDeleteCommits(p) ==
  /\ del[p] # <<>>
  /\ LET joinedSince == GroupsOf(p) \ del[p][1] IN
     \/ /\ exists' = [g \in Groups |-> IF g \in GroupsOf(p) THEN LeaveRow(g, p).ex ELSE exists[g]]
        /\ members' = [g \in Groups |-> IF g \in GroupsOf(p) THEN LeaveRow(g, p).ms ELSE members[g]]
        /\ creator' = [g \in Groups |-> IF g \in GroupsOf(p) THEN LeaveRow(g, p).cr ELSE creator[g]]
        /\ gone' = [gone EXCEPT ![p] = TRUE]
     \/ /\ joinedSince # {}
        /\ UNCHANGED <<exists, members, creator, gone>>
  /\ del' = [del EXCEPT ![p] = <<>>]
  /\ UNCHANGED <<req, wrongActor>>

Next ==
  \/ \E p \in Players :
       \/ \E g \in Groups : Create(p, g) \/ JoinReads(p, g) \/ Leave(p, g)
       \/ \E g \in Groups, m \in Players : CreatorChecks(p, g, "remove", m)
       \/ \E g \in Groups : CreatorChecks(p, g, "deleteGroup", None)
       \/ JoinWrites(p) \/ RemoveWrites(p) \/ DeleteGroupWrites(p)
       \/ AccountDeleteReads(p) \/ AccountDeleteCommits(p)
  \* Everyone's account deleted: nothing more can happen.
  \/ (\A p \in Players : gone[p]) /\ UNCHANGED vars

Spec == Init /\ [][Next]_vars

\* Players are interchangeable, and so are group slots: TLC checks one state of each relabelling.
Symmetry == Permutations(Players) \cup Permutations(Groups)

\* ---- Rules ----

\* A group never has more than its cap of members.
MembersUnderCap == \A g \in Groups : Len(members[g]) <= MemberCap

\* A player is never in more than their cap of groups.
GroupsUnderCap == \A p \in Players : Cardinality(GroupsOf(p)) <= GroupCap

\* No player is in a group twice.
NoDoubleMembership == \A g \in Groups : Len(members[g]) = Cardinality(Set(members[g]))

\* A group that exists has members, and its creator is one of them.
CreatorIsMember == \A g \in Groups : exists[g] => creator[g] \in Set(members[g])

\* A deleted group keeps no members.
NoMembersOfDeletedGroups == \A g \in Groups : ~exists[g] => members[g] = <<>>

\* A deleted account is in no group.
DeletedAccountsInNoGroup == \A p \in Players : gone[p] => GroupsOf(p) = {}

\* The creator is the longest-standing member: the first to join, or the earliest left after a handover.
CreatorLongestStanding == \A g \in Groups : exists[g] => creator[g] = Head(members[g])

\* Only the creator, at the moment of the change, removes a member or deletes the group.
OnlyCreatorActs == ~wrongActor
====
