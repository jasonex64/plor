// The question bank page's uses and catch rates against the local stack (run with `npm run test:db`;
// docs/milestones/M13-13d-the-question-bank.md): a played day shows the share of answers the host caught, as the
// insights report counts it, matched to the bank question by its prompt and category; a drafted day not yet played
// shows none. Built in a transaction that is rolled back, the fixture base loaded inside it (the suites leave none
// behind, 13f-3b-2), with the answer triggers off while past answers go in, as in src/game/ledger.db.test.ts.
import { Pool, type PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import type { Bank } from "@/content/bank";
import { GAME_ID } from "@/platform/game";
import { fixtureDay, fixtureDraft, fixtureId, loadFixtureBase } from "@/test/answer-fixture";
import { bankView } from "./bank";

const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });
afterAll(() => admin.end());

const PLAYED = "2001-03-03";
const LATER = "2099-03-03";
// A drafted day that's gone by without being approved: past by its date, not scheduled (the 14b-2c-3 review).
const MISSED = "2001-04-04";
// The fixture's second question, so the match goes through its index (1), not the first.
const bank: Bank = {
  format: 1,
  questions: [{ id: "fixture-fruit", prompt: "Name a fruit", category: "fixture_fruit", host_bank: ["apple"], uncommon: [], themes: ["autumn"], added_by: "claude" }],
  themes: {},
};

describe("bankView", () => {
  it("shows a played day's catch rate for the question, today's with no answers yet, and none for a day not yet played", async () => {
    const client: PoolClient = await admin.connect();
    try {
      await client.query("begin");
      await loadFixtureBase(client);
      await client.query("set local session_replication_role = replica");
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, PLAYED, fixtureDay(PLAYED, `${PLAYED}T00:00:00Z`)]);
      // Four players answer question 2 (index 1): one says apple, the host's answer, and is caught.
      for (const [entry, matched] of [["apple", true], ["kiwi", false], ["mango", false], ["banana", false]] as const) {
        const { rows } = await client.query<{ id: string }>("insert into auth.users (id, email) values (gen_random_uuid(), gen_random_uuid() || '@example.test') returning id");
        await client.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [rows[0].id, GAME_ID, PLAYED]);
        await client.query("insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched) values ($1, $2, $3::date, 1, $4, $5)", [
          rows[0].id,
          GAME_ID,
          PLAYED,
          fixtureId(1, entry),
          matched,
        ]);
      }
      // Today's puzzle, started and with no answers (14b-2c-3, answer 18); an existing row for today is left as it is.
      const today = (await client.query<{ today: string }>("select private.today()::text as today")).rows[0].today;
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3) on conflict do nothing", [
        GAME_ID,
        today,
        fixtureDay(today, `${today}T00:00:00Z`),
      ]);
      await client.query("delete from private.run_event where game_id = $1 and puzzle_date = $2::date", [GAME_ID, today]);
      await client.query("set local session_replication_role = origin");
      const view = await bankView(client, bank, new Map([[PLAYED, fixtureDraft(PLAYED)], [MISSED, fixtureDraft(MISSED)], [today, fixtureDraft(today)], [LATER, fixtureDraft(LATER)]]));
      expect(view.questions).toEqual([
        {
          id: "fixture-fruit",
          prompt: "Name a fruit",
          category: "fixture_fruit",
          themes: ["autumn"],
          addedBy: "claude",
          uses: [
            { date: PLAYED, day: "past", answered: 4, catchRate: 0.25 },
            { date: MISSED, day: "past", answered: 0, catchRate: null },
            { date: today, day: "today", answered: 0, catchRate: null },
            { date: LATER, day: "future", answered: 0, catchRate: null },
          ],
        },
      ]);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });
});
