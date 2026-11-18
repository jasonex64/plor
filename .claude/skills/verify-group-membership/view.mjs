// The /statechart view of GroupMembership.tla: the groups and who is in them, in the players' words.
export const title = "Groups and their members";

export const state = (v) => {
  const groups = Object.keys(v.exists).filter((g) => v.exists[g]);
  if (groups.length === 0) return "No groups";
  return groups
    .map((g) => {
      const ms = Object.values(v.members[g]);
      return `${ms.length === 1 ? "1 member" : `${ms.length} members`}, creator ${v.creator[g]}`;
    })
    .sort()
    .join(" | ");
};

export const step = (action, from, to) => {
  switch (action) {
    case "Create":
      return "a player creates a group";
    case "JoinReads":
      return "a player opens an invite link";
    case "JoinWrites":
      return "a player joins";
    case "Leave":
      return "a player leaves";
    case "CreatorChecks":
      return "the creator asks to remove a member or delete the group";
    case "RemoveWrites":
      return "the creator removes a member";
    case "DeleteGroupWrites":
      return "the creator deletes the group";
    case "AccountDeleteReads":
      return "a player starts deleting their account";
    case "AccountDeleteCommits":
      return "the account is deleted";
    default:
      return null;
  }
};
