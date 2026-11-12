import { describe, expect, it } from "vitest";
import { SIGN_IN_HREF, signInOpen } from "./sign-in-open";

// The front page's sign-in is a small link; the form shows when the address asks for it (docs/milestones/M18-guest-play.md,
// answers 32 and 33).
describe("signInOpen", () => {
  it("keeps the form closed on the plain front page", () => {
    expect(signInOpen(new URLSearchParams(""))).toBe(false);
  });

  it("opens the form at the address the Sign in links go to", () => {
    expect(signInOpen(new URLSearchParams(SIGN_IN_HREF.slice(SIGN_IN_HREF.indexOf("?"))))).toBe(true);
  });

  it("opens the form when a sign-in came back with an error, so the error shows above the form it failed", () => {
    expect(signInOpen(new URLSearchParams("?error=access_denied"))).toBe(true);
  });

  it("keeps the form closed for an empty error, which shows no message", () => {
    expect(signInOpen(new URLSearchParams("?error="))).toBe(false);
  });
});
