---
name: verify-group-membership
description: Recheck the TLA+ model of group membership whenever a change touches creating, joining, leaving or deleting a group, removing a member, the member or group caps, the creator handover, the group locks, or account deletion's group step. Use before calling such a change done.
---

# Verify group membership

A model of three players creating, joining, leaving, removing from and deleting groups, and deleting their accounts,
all at once, checked in every order of steps by TLC. The rules rest on locks taken in a trigger, a constraint checked
at commit and a trigger that runs after a delete, which tests only reach in the orders someone thought to write
(docs/milestones/PROCESS-formal-verification.md).

## The rules

Each holds in the code today, in every order of steps:

- **MembersUnderCap.** A group never has more than its cap of members. *Harm if broken:* a group passes 50.
- **GroupsUnderCap.** A player is never in more than their cap of groups. *Harm if broken:* a player passes 10.
- **NoDoubleMembership.** No player is in a group twice. *Harm if broken:* a member counted twice.
- **CreatorIsMember.** A group that exists has members, and its creator is one of them. *Harm if broken:* a group
  nobody can rename, reset or delete.
- **NoMembersOfDeletedGroups.** A deleted group keeps no members.
- **DeletedAccountsInNoGroup.** A deleted account is in no group. *Harm if broken:* a ghost member others still see.
- **CreatorLongestStanding.** The creator is the first to join, or the earliest left after a handover.
- **OnlyCreatorActs.** Only the creator, at the moment of the change, removes a member or deletes the group. *Harm if
  broken:* a creator who just handed the group on still removes people.

Seen failing on scratch breaks of the real code (2026-11-17): no member cap (OB009) and no group lock in
`group_member_guard` each break MembersUnderCap; no groups cap (OB010) breaks GroupsUnderCap; no handover in
`group_member_left` together with no `player_group_creator_is_member` breaks CreatorIsMember; `removeMember`'s delete
without `g.creator_id = $1` breaks OnlyCreatorActs. Not seen failing, and why: NoDoubleMembership (with a cap of one
group per player, the groups cap refuses a second join before the primary key does), CreatorLongestStanding (with a
cap of two members, one member is left when the creator goes, so the handover never chooses),
NoMembersOfDeletedGroups and DeletedAccountsInNoGroup (they rest on the foreign keys' cascades).

No rule is broken today: there are no findings.

## Does this change touch it?

Coverage (each step of `GroupMembership.tla` names its code):

| File | What |
|---|---|
| `src/groups/groups.ts` | `createGroup`, `joinGroup`, `leaveGroup`, `LOCK_GROUP`, `checkCreator`, `removeMember`, `deleteGroup` |
| `supabase/migrations/20261028140000_baseline.sql` | `group_member_guard`, `group_member_left` and their triggers, `player_group_creator_is_member`, `private.group_member` (its primary key and foreign keys), `delete_account` |
| `src/config/tunables.ts` | `GROUP_MAX_MEMBERS`, `GROUPS_PER_PLAYER` (the model shrinks them; below) |

**Sync commit: `d3c2c62`.** The model was last confirmed to describe the code at this commit. A change touches this
check when it edits anything above, or adds a migration that replaces one of those functions, triggers or keys. To see
what changed since: `git log --oneline d3c2c62..HEAD -- <the files above> supabase/migrations/`.

## Run it

```bash
npm run verify -- group-membership
```

Measured 2026-11-17 on the Windows PC: 97,961 states (players and group slots counted once per relabelling, TLC's
SYMMETRY), about 28 seconds. It exits 0 when every rule holds. The first run on a machine installs Java and TLC
through mise (the ticket, plan step 3).

## When it fails

Read the failure with the `/statechart` skill, with this folder's `view.mjs` as the view: it gives the shortest path
to each broken rule in the players' words. With SYMMETRY, a path's players and groups may be relabelled; the report
says so. Then decide which it is:

- **A real bug.** Replay the path against the real code, one step per action (a test with several players, or a live
  repro). If it happens, the change broke a rule: fix the change, not the model.
- **A model that no longer describes the code.** The change was meant to alter a rule (a lock moved, a check added or
  removed). Edit the matching action in `GroupMembership.tla` so each step is again one indivisible step in the code:
  if a lock that makes a step indivisible goes, split the step where the code can be interleaved. Rerun, and say in
  the PR what changed and why.

A rule the code breaks on purpose becomes a finding: move it to a `GroupMembership.findings.cfg` (as
`verify-fragments-run` has) and record it in docs/ROADMAP.md "Next revision". Never weaken a rule or remove a step to
make the check pass.

Once the check passes and the model describes the code at the new commit, move the sync commit above to it.

## What it does not cover

- **Shrunk caps:** 3 players, 2 members per group and 1 group per player, in place of 50 and 10 (the human,
  2026-11-17, ticket answer 10). A cap bug is the same at 2 as at 50, but the handover's choice among several members
  and a second join refused only by the primary key are not reached.
- `joined_at` is when the join's transaction started (`now()`), not when it committed; the model orders members by
  commit. Two joins racing into one group can be ordered the other way in the code, which matters only for a
  handover's choice among several members.
- Names, invite codes and their reset (a player may join any group that exists), rename, comments and reactions.
- Deadlocks other than account deletion's: a deadlock aborts one side, which changes nothing. The deletion's own
  (a group joined after `delete_account` read its list, left to Auth's cascade) is modelled as the deletion aborting.
