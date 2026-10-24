// private.take_auth_attempt under concurrency (docs/milestones/M12-12e-sign-in-limits.md, criterion 1; review finding
// 3): requests arriving at once must not all slip under a limit between counting and recording. Needs the local stack;
// run with `npm run test:db`.
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, expect, it } from "vitest";
import { hashKey } from "./auth-limits";

const ATTEMPTS = 20;
const LIMIT = 3;
const db = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: ATTEMPTS });
const key = hashKey(randomUUID());

afterAll(async () => {
  await db.query("delete from private.auth_attempt where key = $1", [key]);
  await db.end();
});

it(`allows exactly ${LIMIT} of ${ATTEMPTS} attempts taken at once on one key`, async () => {
  // Each attempt on its own connection, all open before any takes, so they really overlap.
  const clients = await Promise.all(Array.from({ length: ATTEMPTS }, () => db.connect()));
  try {
    const taken = await Promise.all(
      clients.map(async (client) =>
        (await client.query<{ taken: boolean }>("select private.take_auth_attempt('check_ip', $1, $2, interval '5 minutes') as taken", [key, LIMIT]))
          .rows[0].taken,
      ),
    );
    expect(taken.filter(Boolean)).toHaveLength(LIMIT);
    // On one of the 20: all of the pool's connections are still checked out here.
    const { rows } = await clients[0].query("select count(*)::int as n from private.auth_attempt where key = $1", [key]);
    expect(rows[0].n).toBe(LIMIT);
  } finally {
    for (const client of clients) client.release();
  }
});
