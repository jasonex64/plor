import { describe, expect, it } from "vitest";
import { newInviteCode, readInviteCode } from "./friends";

describe("invite codes (M07 7b, D3)", () => {
  it("are 22 base64url characters, and differ each time", () => {
    const codes = new Set(Array.from({ length: 50 }, newInviteCode));
    expect(codes.size).toBe(50);
    for (const code of codes) expect(code).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("reads a well-formed code", () => {
    expect(readInviteCode("abcdefghijklmnopqrst-_")).toBe("abcdefghijklmnopqrst-_");
  });

  it.each([undefined, null, 7, "", "abcdefghijklmnopqrst-", "abcdefghijklmnopqrst+/", "abcdefghijklmnopqrst-_x"])(
    "answers %j like an unknown code: 404 invite_invalid",
    (input) => {
      expect(() => readInviteCode(input)).toThrow(expect.objectContaining({ code: "invite_invalid", status: 404 }));
    },
  );
});
