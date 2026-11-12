import { describe, expect, it } from "vitest";
import { messageFor } from "./messages";

// The bot check's two refusals read plain and short (human, 2026-11-11: "Plain and short (Recommended)"; docs/milestones/M18-guest-play.md).
describe("messageFor, the guest bot check", () => {
  it("tells a failed check to try again", () => {
    expect(messageFor("captcha_failed")).toBe("The check didn't pass. Try again.");
  });

  it("says an unreachable check is on our side", () => {
    expect(messageFor("captcha_unavailable")).toBe("The check isn't working on our side right now. Try again in a few minutes.");
  });
});
