import { describe, expect, it } from "vitest";
import { runRoutes, startBody, substringRoutes } from "./run-routes";

// The game screen's one prefix picks the route family (docs/milestones/M18-guest-play.md, Design, "Guest routes").
describe("runRoutes", () => {
  it("gives a signed-in player the account routes, as the screen called them before", () => {
    expect(runRoutes("account")).toEqual({
      state: "/api/run",
      start: "/api/run/start",
      next: "/api/run/next",
      answer: "/api/run/answer",
    });
  });

  it("gives a guest the guest routes, all under /api/guest so the guest cookie travels with them", () => {
    expect(runRoutes("guest")).toEqual({
      state: "/api/guest/run",
      start: "/api/guest/run/start",
      next: "/api/guest/run/next",
      answer: "/api/guest/run/answer",
    });
  });
});

describe("startBody", () => {
  it("sends nothing with a signed-in start", () => {
    expect(startBody("account", null)).toBeUndefined();
  });

  it("sends the bot-check token with a guest start, in the field the route reads", () => {
    expect(startBody("guest", "tok")).toEqual({ turnstileToken: "tok" });
  });
});

// Game 2's screen takes its routes from the same kind of prefix (docs/milestones/M18-guest-play.md, 18d).
describe("substringRoutes", () => {
  it("gives a signed-in player the account routes, as the screen called them before", () => {
    expect(substringRoutes("account")).toEqual({
      state: "/api/substrings",
      start: "/api/substrings/start",
      try: "/api/substrings/try",
      next: "/api/substrings/next",
    });
  });

  it("gives a guest the guest routes, all under /api/guest so the guest cookie travels with them", () => {
    expect(substringRoutes("guest")).toEqual({
      state: "/api/guest/substrings",
      start: "/api/guest/substrings/start",
      try: "/api/guest/substrings/try",
      next: "/api/guest/substrings/next",
    });
  });
});
