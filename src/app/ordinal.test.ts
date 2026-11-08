import { describe, expect, it } from "vitest";
import { ordinal } from "./ordinal";

describe("ordinal", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [22, "22nd"],
    [23, "23rd"],
    [100, "100th"],
    [111, "111th"],
    [112, "112th"],
  ])("writes %i as %s", (n, text) => expect(ordinal(n)).toBe(text));
});
