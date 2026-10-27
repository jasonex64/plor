import { describe, expect, it } from "vitest";
import { newInviteCode, readInviteCode } from "./friends";

describe("invite codes (M07 7b, D3; 10 characters since M14 14b-3)", () => {
  it("are 10 base64url characters, and differ each time", () => {
    const codes = new Set(Array.from({ length: 50 }, newInviteCode));
    expect(codes.size).toBe(50);
    for (const code of codes) expect(code).toMatch(/^[A-Za-z0-9_-]{10}$/);
  });

  it("reads a well-formed code", () => {
    expect(readInviteCode("abcdefgh-_")).toBe("abcdefgh-_");
  });

  // The old 22-character size is refused like any other wrong length.
  it.each([undefined, null, 7, "", "abcdefgh-", "abcdefgh+/", "abcdefgh-_x", "abcdefghijklmnopqrst-_"])(
    "answers %j like an unknown code: 404 invite_invalid",
    (input) => {
      expect(() => readInviteCode(input)).toThrow(expect.objectContaining({ code: "invite_invalid", status: 404 }));
    },
  );
});
