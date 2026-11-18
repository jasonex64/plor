// The /statechart view of FriendsAndGroups.tla: two regions, you and one other player, and you and a group.
export const title = "Friends and groups";

const rel = {
  none: "Not friends",
  sent: "Request sent",
  received: "Request to you",
  friends: "Friends",
  blocked: "Blocked",
};
const group = { none: "In no group", creator: "Creator of a group", member: "Member of a group" };

// The friends half has no check behind it (the human, 2026-11-17, answer 13).
export const state = (v) => ({ "Friends (not verified)": rel[v.rel], Groups: group[v.group] });

const steps = {
  YouAdd: "you press Add friend",
  TheySend: "they send you a request",
  TheyAccept: "they accept",
  TheyDecline: "they decline",
  YouCancel: "you press Cancel request",
  YouAccept: "you press Accept",
  YouDecline: "you press Decline",
  YouDeclineAndBlock: "you press Decline and block",
  Unfriend: "one of you presses Remove",
  YouBlock: "you press Block",
  YouUnblock: "you press Unblock",
  Create: "you press Create group",
  Join: "you join from an invite link",
  YouLeave: "you press Leave group",
  YouDelete: "you press Delete group",
  CreatorRemovesYou: "the creator removes you or deletes the group",
  Handover: "the creator leaves and you have been in longest",
};

export const step = (action, from, to) => {
  if (!(action in steps)) throw new Error(`no label for ${action}`);
  if (action === "TheySend" && to.rel === "friends") return "they send a request too";
  return steps[action];
};
