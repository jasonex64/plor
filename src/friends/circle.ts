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

// The viewer and each of their friends, one user_id per row (M07; M09 D4).
export function circleSql(viewer: string): string {
  return `select ${viewer}::uuid as user_id
     union all
     select case when f.user_a = ${viewer}::uuid then f.user_b else f.user_a end from private.friendship f where ${viewer}::uuid in (f.user_a, f.user_b)`;
}
