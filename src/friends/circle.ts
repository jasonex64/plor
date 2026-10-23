// Who a player's social features reach, written once (docs/milestones/M10-groups.md, 10a): the board, the friends
// list, the leaderboard, comments and reactions all ask these, and groups (10b–10d) widen them in one place. Each
// returns SQL text; the arguments are SQL expressions (a parameter such as "$1", or a column), never player input.
// A friendship is one row per pair with the smaller user ID first (M07 7b).

// True when the two players are friends.
export function friendsSql(viewer: string, other: string): string {
  return `exists (select from private.friendship f where f.user_a = least(${viewer}::uuid, ${other}) and f.user_b = greatest(${viewer}::uuid, ${other}))`;
}

// True when the viewer may see what this author wrote or reacted: their own, or a friend's (M08 D5, 8b).
export function seesAuthorSql(viewer: string, author: string): string {
  return `(${author} = ${viewer}::uuid or ${friendsSql(viewer, author)})`;
}

// True when the player is a current member of the group.
export function memberSql(player: string, group: string): string {
  return `exists (select from private.group_member gm where gm.group_id = ${group} and gm.user_id = ${player}::uuid)`;
}

// True when the viewer may see this comment (a private.comment alias): in the friends thread, their own or a friend's
// (M08 D5); in a group's thread, any, while the viewer is a member (M10 G4). Whether the day's thread is open to them
// yet is the caller's check.
export function seesCommentSql(viewer: string, comment: string): string {
  return `(${comment}.group_id is null and ${seesAuthorSql(viewer, `${comment}.user_id`)}
          or ${comment}.group_id is not null and ${memberSql(viewer, `${comment}.group_id`)})`;
}

// True when a reaction on this comment counts for the viewer, who can see the comment: in the friends thread, their
// own or a friend's (M08 8b); in a group's thread, a current member's, so every member sees the same counts (G4).
export function seesCommentReactionSql(viewer: string, comment: string, reactor: string): string {
  return `(${comment}.group_id is null and ${seesAuthorSql(viewer, reactor)}
          or ${comment}.group_id is not null and ${memberSql(reactor, `${comment}.group_id`)})`;
}

// The viewer and each of their friends, one user_id per row (M07; M09 D4).
export function circleSql(viewer: string): string {
  return `select ${viewer}::uuid as user_id
     union all
     select case when f.user_a = ${viewer}::uuid then f.user_b else f.user_a end from private.friendship f where ${viewer}::uuid in (f.user_a, f.user_b)`;
}

// A group's members, one user_id per row, or none when the viewer isn't one of them (M10 G3): members see each
// other's weekly points whether or not they are friends (G2).
export function groupCircleSql(viewer: string, group: string): string {
  return `select m.user_id from private.group_member m where m.group_id = ${group}::uuid and ${memberSql(viewer, `${group}::uuid`)}`;
}
