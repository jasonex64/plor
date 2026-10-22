import { describe, expect, it } from "vitest";
import { readDisplayName } from "./profile";

describe("readDisplayName (M07 7a)", () => {
  it("passes null through, which clears the name", () => {
    expect(readDisplayName(null)).toBeNull();
  });

  it("trims the text", () => {
    expect(readDisplayName("  Zoë Ann  ")).toBe("Zoë Ann");
  });

  // The database refuses text that isn't in NFC, so a name typed with a combining accent is composed first.
  it("composes combining accents into NFC", () => {
    expect(readDisplayName("Zoë")).toBe("Zoë");
  });

  it.each([undefined, 42, ["Zoë"], { name: "Zoë" }])("refuses %j with 400 display_name_invalid", (input) => {
    expect(() => readDisplayName(input)).toThrow(expect.objectContaining({ code: "display_name_invalid", status: 400 }));
  });
});
