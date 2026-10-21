// Needs the local Supabase stack (`npx supabase start`); run with `npm run test:db`.
// Uses the local database's documented default URL (supabase.com/docs/guides/local-development/cli/getting-started).
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { withTransaction } from "./db.ts";

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

// B18 (M02 2f): when ROLLBACK itself fails, the caller still gets the callback's error, and the failed rollback is
// logged. The callback ends its own backend, so the failure is real; a separate pool keeps the temp table's
// connection alive. (Whether the client is destroyed isn't checked: pg-pool 3.14.0 also drops a client that can no
// longer query, so the pool count is 0 either way.)
// The dropped socket also emits "error" on the checked-out client, which pg-pool 3.14.0 leaves without a listener
// (index.js, _acquireClient); the test records that event and checks it (ROADMAP item from 2f).
describe("withTransaction when the rollback fails", () => {
  it("rethrows the callback's error and logs the failed rollback", async () => {
    const doomed = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const clientErrors: Error[] = [];
    try {
      const failure = withTransaction(doomed, (c) => {
        c.on("error", (err: Error) => clientErrors.push(err));
        return c.query("select pg_terminate_backend(pg_backend_pid())");
      });
      await expect(failure).rejects.toThrow(/terminating connection/);
      expect(logged.mock.calls.map((call) => JSON.parse(call[0]).msg)).toContain("rollback failed; destroying client");
      expect(clientErrors.map((e) => e.message)).toContain("Connection terminated unexpectedly");
    } finally {
      logged.mockRestore();
      await doomed.end();
    }
  });
});
