// "Where everyone ended" (docs/milestones/M07-friends-and-live-board.md, 7d): after the player's run, one row per
// place where someone ended, by how far they got: survived first, then each question from the last down, a catch and
// a timeout at one question side by side (human, 2026-10-26: "By how far they got (Recommended)";
// docs/milestones/M14-14b-2c-review-items.md, answer 10). Each row shows the player first if they ended there, then up
// to FRIENDS_PER_PLACE friends by name, then a count of the rest, and the whole list is one tap away (the rule accepted
// on 2026-10-20, closed draft D28; D2).
import { FRIENDS_PER_PLACE } from "@/config/tunables";
import type { BoardFriend, Ended } from "./board";

export type Place = { kind: "caught" | "timed_out"; question: number } | { kind: "survived" };

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

function placeOf(ended: Ended): Place {
  return ended.result === "survived" ? { kind: "survived" } : { kind: ended.result, question: ended.question };
}

function samePlace(a: Place, b: Place): boolean {
  return a.kind === b.kind && (a.kind === "survived" || a.question === (b as { question: number }).question);
}

// How far a place got: survived beyond every question, and at one question a catch before a timeout.
function depth(place: Place): [number, number] {
  return place.kind === "survived" ? [Infinity, 0] : [place.question, place.kind === "caught" ? 1 : 0];
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
    .sort((a, b) => {
      const [qa, ka] = depth(a.place);
      const [qb, kb] = depth(b.place);
      return qb - qa || kb - ka;
    });
}
