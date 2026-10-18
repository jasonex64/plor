// Postgres access for route handlers (DECISIONS.md: Database access from route handlers).
// Connects through the Supavisor transaction pooler, so: no named (prepared) queries, no session
// SET, and schema-qualified table names (supabase.com/docs/guides/database/connecting-to-postgres).
import { attachDatabasePool } from "@vercel/functions";
import { Pool, type PoolClient, type PoolConfig } from "pg";
import { readServerEnv, type ServerEnv } from "@/config/env";
import { log } from "@/lib/log";

let pool: Pool | undefined;

// Pool sizes are node-postgres defaults until the M07 load test (human decision, 2026-10-17).
export function getPool(): Pool {
  if (pool) return pool;
  pool = new Pool(poolConfig(readServerEnv()));
  // An idle client can error when the backend drops it; pg removes it from the pool, and without a
  // listener Node "potentially crash[es]" (node-postgres.com/apis/pool). Log it so it stays visible.
  pool.on("error", (err) => log.error("idle postgres client error", { error: String(err) }));
  attachDatabasePool(pool);
  return pool;
}

// Explicit fields, never `connectionString`: pg would read URL query params from a connection string,
// and those can override `ssl` and `host` (M00 review 3). Remote hosts always verify against the CA.
export function poolConfig(env: Pick<ServerEnv, "database" | "databaseCaCert">): PoolConfig {
  return { ...env.database, ssl: env.databaseCaCert ? { ca: env.databaseCaCert } : false };
}

// All statements of a transaction must run on one client, never pool.query
// (node-postgres.com/features/transactions). Errors roll back and rethrow.
export async function withTransaction<T>(db: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  let broken: Error | undefined;
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      // The connection itself is unusable; destroy it instead of returning it to the pool.
      broken = rollbackErr as Error;
      log.error("rollback failed; destroying client", { error: String(rollbackErr) });
    }
    throw err;
  } finally {
    client.release(broken);
  }
}
