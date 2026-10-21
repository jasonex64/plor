import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { askHidden, dateGaps } from "./content-publish.ts";

describe("dateGaps", () => {
  it("accepts consecutive dates in any order, across a month end", () => {
    expect(dateGaps(["2026-11-01", "2026-10-31", "2026-10-30"])).toEqual([]);
  });

  it("names each gap", () => {
    expect(dateGaps(["2026-10-26", "2026-10-27", "2026-10-29"])).toEqual(["no puzzle between 2026-10-27 and 2026-10-29 (expected 2026-10-28)"]);
  });

  it("finds a duplicate date as a gap too", () => {
    expect(dateGaps(["2026-10-26", "2026-10-26"])).toHaveLength(1);
  });
});

// A stand-in for an interactive terminal: a stream that says it is a TTY and accepts raw mode.
function fakeTerminal(): NodeJS.ReadStream {
  return Object.assign(new PassThrough(), { isTTY: true, setRawMode: () => {} }) as unknown as NodeJS.ReadStream;
}
const sink = new PassThrough() as unknown as NodeJS.WriteStream;

describe("askHidden", () => {
  it("returns what was typed before Enter, without the Enter", async () => {
    const input = fakeTerminal();
    const answer = askHidden("Password: ", input, sink);
    input.write("s3cret\r");
    await expect(answer).resolves.toBe("s3cret");
  });

  it("rejects when the input ends before Enter, instead of waiting forever (M02 2f, B7)", async () => {
    const input = fakeTerminal();
    const answer = askHidden("Password: ", input, sink);
    input.write("half");
    input.end();
    await expect(answer).rejects.toThrow("the input ended before the password was entered");
  });
});
