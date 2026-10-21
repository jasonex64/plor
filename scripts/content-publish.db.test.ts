// content:publish against the local stack as plor_publisher (run with `npm run test:db`). Each case runs in a
// transaction that is rolled back; dates are relative to private.today(), so the result doesn't depend on the
// calendar. The local superuser is only used to switch to plor_publisher (as in src/lib/profile.db.test.ts).
import { readFileSync } from "node:fs";
import { Pool, type PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import type { Puzzle } from "../src/content/puzzle";
import { withTransaction } from "../src/lib/db";
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

// B12 (M02 2f): the rollback that matters is withTransaction's, which main uses, so this case commits for real
// instead of running inside asPublisher's outer transaction. It writes a past day that has no puzzle, then hits
// today's started puzzle with changed content. Afterwards the past day must not exist. The local superuser runs it:
// the rollback doesn't depend on the role, and the trigger that refuses the change fires for every role.
describe("content:publish as one transaction", () => {
  it("leaves no earlier day of the batch behind when a later day is refused", async () => {
    const { rows } = await admin.query<{ today: string; past: string }>(
      "select private.today()::text as today, (private.today() - 30)::text as past",
    );
    const { today, past } = rows[0];
    const exists = async (date: string) =>
      (await admin.query("select 1 from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date", [date])).rows.length > 0;
    // The past day must start empty; this test never deletes a day it didn't create.
    expect(await exists(past)).toBe(false);
    const [todays] = puzzlesFrom(today, [0]);
    const createdToday = !(await exists(today));
    if (createdToday) await admin.query("insert into private.puzzle (game_id, puzzle_date, content) values ('offbeat', $1::date, $2)", [today, todays]);
    try {
      const stored = (await admin.query<{ content: Puzzle }>("select content from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date", [today])).rows[0].content;
      const batch = [{ ...base, date: past }, { ...stored, questions: [...stored.questions].reverse() }];
      await expect(withTransaction(admin, (client) => publish(client, batch))).rejects.toThrow(`offbeat/${today} has started and can't change`);
      expect(await exists(past)).toBe(false);
    } finally {
      if (createdToday) await admin.query("delete from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date", [today]);
    }
  });
});
