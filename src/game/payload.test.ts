import { describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { named, thingNames } from "./payload";

describe("named", () => {
  it("refuses a thing with no name rather than show nothing", () => {
    expect(() => named(new Map(), "missing")).toThrow("thing missing has no name");
  });
});

// Every thing is shown in lowercase (human, 2026-10-27), whatever the base stores (13f-1).
describe("thingNames", () => {
  it("lowercases the names it reads", async () => {
    const db = { query: async () => ({ rows: [{ id: "a", name: "Washington, D.C." }, { id: "b", name: "Grey Wolf" }] }) } as unknown as Db;
    expect(await thingNames(db, ["a", "b"])).toEqual(new Map([["a", "washington, d.c."], ["b", "grey wolf"]]));
  });
});
