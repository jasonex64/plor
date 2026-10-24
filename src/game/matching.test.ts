// The pure parts of matching (src/game/matching.ts): the texts one typo away, and which member a name is.
import { describe, expect, it } from "vitest";
import { answersAmong, oneEditAway, pickAnswer, type Candidate } from "./matching";

describe("oneEditAway", () => {
  const near = oneEditAway("horse");

  it("holds every text one letter missing, extra, wrong or swapped with its neighbour away", () => {
    expect(near).toEqual(expect.arrayContaining(["hors", "horsee", "horde", "hrose", "ohrse", "horsr"]));
  });

  it("holds neither the text itself nor anything two edits away", () => {
    expect(near).not.toContain("horse");
    expect(near).not.toContain("hose s");
    expect(near).not.toContain("hrsoe");
  });

  it("normalizes what it makes, as aliases are", () => {
    expect(oneEditAway("ab")).not.toContain(" b");
    expect(oneEditAway("ab")).toContain("b");
  });
});

describe("pickAnswer", () => {
  const c = (thing_id: string, caught = false, ancestors: string[] = [thing_id]): Candidate => ({ alias: "robin", thing_id, caught, ancestors });

  it("is nothing for no candidates", () => {
    expect(pickAnswer([], {})).toBeNull();
  });

  it("is caught if the host catches any meaning, and is that meaning", () => {
    expect(pickAnswer([c("b"), c("a", true)], {})).toEqual({ thingId: "a", caught: true });
  });

  it("is the highest member of one line of the tree", () => {
    expect(pickAnswer([c("species", false, ["species", "genus"]), c("genus", false, ["genus"])], {})).toEqual({ thingId: "genus", caught: false });
  });

  it("is the most common level, then the smallest ID, among unrelated members", () => {
    expect(pickAnswer([c("a"), c("b")], { b: "uncommon" })).toEqual({ thingId: "b", caught: false });
    expect(pickAnswer([c("b"), c("a")], {})).toEqual({ thingId: "a", caught: false });
  });
});

describe("answersAmong", () => {
  const c = (thing_id: string, alias: string): Candidate => ({ alias, thing_id, caught: false, ancestors: [thing_id] });

  it("counts names of one thing, and one name several things share, as one answer each", () => {
    expect(answersAmong([c("kiwi", "kiwi"), c("kiwi", "kiwis")])).toBe(1);
    expect(answersAmong([c("american", "robin"), c("european", "robin"), c("european", "robins")])).toBe(1);
  });

  it("counts unrelated names of unrelated things apart", () => {
    expect(answersAmong([c("horse", "horse"), c("horde", "horde")])).toBe(2);
  });
});
