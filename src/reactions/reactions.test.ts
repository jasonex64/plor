// setReaction's transaction when things fail (docs/milestones/M10-groups.md, 10a): the error the player gets is the
// one that broke the transaction, and a client whose rollback failed is destroyed, not returned to the pool
// (node-postgres, Pool: release(true)). A stand-in client fails on chosen statements; the database tests cover the rest.
import type { Pool } from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setReaction } from "./reactions";

function poolWith(failRollback: boolean) {
  const release = vi.fn();
  const query = vi.fn(async (sql: string) => {
    if (sql === "begin") return { rows: [] };
    if (sql === "rollback") {
      if (failRollback) throw new Error("rollback failed");
      return { rows: [] };
    }
    throw new Error("query failed");
  });
  return { pool: { connect: async () => ({ query, release }) } as unknown as Pool, release };
}

afterEach(() => vi.restoreAllMocks());

describe("setReaction when a statement fails", () => {
  it("throws that error and returns the client to the pool after a rollback", async () => {
    const { pool, release } = poolWith(false);
    await expect(setReaction(pool, "u", "2026-10-22", { type: "run", username: "x" }, "👍")).rejects.toThrow("query failed");
    expect(release).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("still throws that error when the rollback fails too, logs the rollback's, and destroys the client", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const { pool, release } = poolWith(true);
    await expect(setReaction(pool, "u", "2026-10-22", { type: "run", username: "x" }, "👍")).rejects.toThrow("query failed");
    expect(release).toHaveBeenCalledExactlyOnceWith(true);
    expect(logged).toHaveBeenCalledOnce();
    expect(JSON.parse(logged.mock.calls[0][0] as string)).toMatchObject({ level: "error", msg: "rollback failed" });
  });
});
