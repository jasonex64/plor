import { describe, expect, it } from "vitest";
import { FRIENDS_PER_PLACE } from "@/config/tunables";
import type { BoardFriend, Ended } from "./board";
import { placeRows } from "./ended";

const friend = (name: string, ended: Ended | null): BoardFriend => ({
  username: name.toLowerCase(),
  name,
  state: ended ? "finished" : "playing",
  question: ended ? null : 2,
  ended,
  reactions: null,
});
const person = (name: string) => ({ username: name.toLowerCase(), name });
const caught = (question: number): Ended => ({ result: "caught", question, answer: "x" });

describe("where everyone ended (M07 7d)", () => {
  it("always shows the player, even with no friends finished", () => {
    expect(placeRows(caught(3), [])).toEqual([{ place: { kind: "caught", question: 3 }, you: true, named: [], more: 0, everyone: [] }]);
  });

  // Human, 2026-10-26: "By how far they got (Recommended)" (docs/milestones/M14-14b-2c-review-items.md, answer 10).
  it("puts each friend in their place, by how far they got: survived, then each question from the last down", () => {
    const rows = placeRows({ result: "survived" }, [
      friend("Bea", caught(5)),
      friend("Al", { result: "timed_out", question: 2 }),
      friend("Cy", caught(1)),
      friend("Eve", caught(5)),
    ]);
    expect(rows.map((r) => [r.place, r.you, r.everyone.map((p) => p.name)])).toEqual([
      [{ kind: "survived" }, true, []],
      [{ kind: "caught", question: 5 }, false, ["Bea", "Eve"]],
      [{ kind: "timed_out", question: 2 }, false, ["Al"]],
      [{ kind: "caught", question: 1 }, false, ["Cy"]],
    ]);
  });

  it("names up to FRIENDS_PER_PLACE friends per place, counts the rest, and keeps everyone for the full list", () => {
    const names = Array.from({ length: FRIENDS_PER_PLACE + 2 }, (_, i) => `F${i}`);
    const [row] = placeRows(
      caught(2),
      names.map((n) => friend(n, caught(2))),
    );
    expect(row).toEqual({
      place: { kind: "caught", question: 2 },
      you: true,
      named: names.slice(0, FRIENDS_PER_PLACE).map(person),
      more: 2,
      everyone: names.map(person),
    });
  });

  it("gives a timeout its question's row, beside a catch at the same question, the catch first", () => {
    const rows = placeRows(caught(2), [
      friend("Al", { result: "timed_out", question: 2 }),
      friend("Bo", { result: "timed_out", question: 6 }),
      friend("Cy", { result: "timed_out", question: 2 }),
    ]);
    expect(rows.map((r) => [r.place, r.you, r.everyone.map((p) => p.name)])).toEqual([
      [{ kind: "timed_out", question: 6 }, false, ["Bo"]],
      [{ kind: "caught", question: 2 }, true, []],
      [{ kind: "timed_out", question: 2 }, false, ["Al", "Cy"]],
    ]);
  });

  it("leaves out friends who haven't finished", () => {
    expect(placeRows(caught(1), [friend("Dee", null)])).toEqual([
      { place: { kind: "caught", question: 1 }, you: true, named: [], more: 0, everyone: [] },
    ]);
  });
});
