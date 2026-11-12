import { describe, expect, it } from "vitest";
import { resultExtras } from "./result-extras";

// What sits with a finished run's result, by whose run it is (docs/milestones/M18-guest-play.md, Design, "What a guest can
// reach" and "The peek and pages").
describe("resultExtras", () => {
  it("gives a signed-in player Share and the answer searches, and never the peek", () => {
    expect(resultExtras("account")).toEqual({ share: true, search: true, peek: false });
  });

  it("gives a guest Share and the peek, and no answer searches, which need an account", () => {
    expect(resultExtras("guest")).toEqual({ share: true, search: false, peek: true });
  });

  it("gives an admin's test run none of them: nothing is saved", () => {
    expect(resultExtras("test")).toEqual({ share: false, search: false, peek: false });
  });
});
