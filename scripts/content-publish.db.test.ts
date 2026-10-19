// content:publish against the local stack as plor_publisher (run with `npm run test:db`). Each case runs in a
// transaction that is rolled back; dates are relative to private.today(), so the result doesn't depend on the
// calendar. The local superuser is only used to switch to plor_publisher (as in src/lib/profile.db.test.ts).
import { readFileSync } from "node:fs";
import { Pool, type PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import type { Puzzle } from "../src/content/puzzle";
import { publish } from "./content-publish";

const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });
const base: Puzzle = JSON.parse(readFileSync("content/offbeat/2026-10-26.json", "utf8"));

afterAll(async () => {
  await admin.end();
});

// Puzzles for today + offset; their own date makes each one distinct content.
function puzzlesFrom(today: string, offsets: number[]): Puzzle[] {
  return offsets.map((offset) => ({ ...base, date: new Date(Date.parse(`${today}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10) }));
}

async function asPublisher(fn: (client: PoolClient, today: string) => Promise<void>): Promise<void> {
  const client = await admin.connect();
  try {
    await client.query("begin");
    // Days near today are this test's: clear any locally published ones inside the rolled-back transaction.
    await client.query("delete from private.run where puzzle_date between private.today() - 1 and private.today() + 40");
    await client.query("delete from private.puzzle where puzzle_date between private.today() - 1 and private.today() + 40");
    const { rows } = await client.query<{ today: string }>("select private.today()::text as today");
    await client.query("set local role plor_publisher");
    await fn(client, rows[0].today);
  } finally {
    await client.query("rollback");
    client.release();
  }
}

describe("content:publish", () => {
  it("inserts new days, leaves identical days alone, and updates changed future days", async () => {
    await asPublisher(async (client, today) => {
      const days = puzzlesFrom(today, [30, 31, 32]);
      const first = await publish(client, days);
      expect(first).toEqual({ inserted: days.map((p) => p.date), updated: [], unchanged: [] });

      const again = await publish(client, days);
      expect(again).toEqual({ inserted: [], updated: [], unchanged: days.map((p) => p.date) });

      const edited = days.map((p, i) => (i === 1 ? { ...p, questions: [...p.questions].reverse() } : p));
      expect(await publish(client, edited)).toEqual({ inserted: [], updated: [days[1].date], unchanged: [days[0].date, days[2].date] });
    });
  });

  it("republishes a started day unchanged without error", async () => {
    await asPublisher(async (client, today) => {
      const [todays] = puzzlesFrom(today, [0]);
      await publish(client, [todays]);
      expect(await publish(client, [todays])).toEqual({ inserted: [], updated: [], unchanged: [todays.date] });
    });
  });

  it("refuses to change a day that has started (§4), and says which", async () => {
    await asPublisher(async (client, today) => {
      const [todays] = puzzlesFrom(today, [0]);
      await publish(client, [todays]);
      const changed = { ...todays, questions: [...todays.questions].reverse() };
      await expect(publish(client, [changed])).rejects.toThrow(`offbeat/${today} has started and can't change; nothing was published`);
    });
  });
});
