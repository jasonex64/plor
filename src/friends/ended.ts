// "Where everyone ended" (docs/milestones/M07-friends-and-live-board.md, 7d): after the player's run, one row per
// place where someone ended, in play order: each question caught on, then ran out of time, then survived. Each row
// shows the player first if they ended there, then up to FRIENDS_PER_PLACE friends by name, then a count of the
// rest, and the whole list is one tap away (the rule accepted on 2026-10-20, closed draft D28; D2).
import { FRIENDS_PER_PLACE } from "@/config/tunables";
import type { BoardFriend, Ended } from "./board";

export type Place = { kind: "caught"; question: number } | { kind: "timed_out" } | { kind: "survived" };

// username identifies a friend (display names needn't be unique); name is what's shown.
export type PlacePerson = { username: string; name: string };

export type PlaceRow = {
  place: Place;
  // The player ended here.
  you: boolean;
  // Up to FRIENDS_PER_PLACE friends, in the board's order.
  named: PlacePerson[];
  // How many more friends ended here.
  more: number;
  // Every friend who ended here, for the full list.
  everyone: PlacePerson[];
};

const KIND_ORDER: Place["kind"][] = ["caught", "timed_out", "survived"];

function placeOf(ended: Ended): Place {
  return ended.result === "caught" ? { kind: "caught", question: ended.question } : { kind: ended.result };
}

function samePlace(a: Place, b: Place): boolean {
  return a.kind === b.kind && (a.kind !== "caught" || a.question === (b as { question: number }).question);
}

export function placeRows(mine: Ended, friends: BoardFriend[]): PlaceRow[] {
  const rows: PlaceRow[] = [];
  const row = (place: Place) => {
    let found = rows.find((r) => samePlace(r.place, place));
    if (!found) rows.push((found = { place, you: false, named: [], more: 0, everyone: [] }));
    return found;
  };
  row(placeOf(mine)).you = true;
  for (const f of friends) if (f.ended) row(placeOf(f.ended)).everyone.push({ username: f.username, name: f.name });
  return rows
    .map((r) => ({ ...r, named: r.everyone.slice(0, FRIENDS_PER_PLACE), more: Math.max(0, r.everyone.length - FRIENDS_PER_PLACE) }))
    .sort(
      (a, b) =>
        KIND_ORDER.indexOf(a.place.kind) - KIND_ORDER.indexOf(b.place.kind) ||
        (a.place.kind === "caught" && b.place.kind === "caught" ? a.place.question - b.place.question : 0),
    );
}
