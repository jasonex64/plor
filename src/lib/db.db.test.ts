// Needs the local Supabase stack (`npx supabase start`); run with `npm run test:db`.
// Uses the local database's documented default URL (supabase.com/docs/guides/local-development/cli/getting-started).
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withTransaction } from "./db";

// One connection so the temp table (session-scoped) is visible to every transaction in this file.
const pool = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });

beforeAll(async () => {
  await pool.query("create temp table tx_probe (n int not null)");
});

afterAll(async () => {
  await pool.end();
});

async function count(): Promise<number> {
  const { rows } = await pool.query<{ c: number }>("select count(*)::int as c from tx_probe");
  return rows[0].c;
}

describe("withTransaction", () => {
  it("commits when the callback succeeds", async () => {
    const result = await withTransaction(pool, async (c) => {
      await c.query("insert into tx_probe values (1)");
      return "done";
    });
    expect(result).toBe("done");
    expect(await count()).toBe(1);
  });

  it("rolls back and rethrows the original error when the callback fails", async () => {
    const boom = new Error("boom");
    await expect(
      withTransaction(pool, async (c) => {
        await c.query("insert into tx_probe values (2)");
        throw boom;
      }),
    ).rejects.toBe(boom);
    expect(await count()).toBe(1);
  });

  it("rolls back when a statement fails inside the transaction", async () => {
    await expect(
      withTransaction(pool, async (c) => {
        await c.query("insert into tx_probe values (3)");
        await c.query("insert into tx_probe values (null)");
      }),
    ).rejects.toThrow(/null value/);
    expect(await count()).toBe(1);
  });

  it("returns the client to the pool after both outcomes", async () => {
    expect(pool.totalCount).toBe(1);
    expect(pool.idleCount).toBe(1);
  });
});
