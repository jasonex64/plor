// The feed's result for a run on a clock (docs/milestones/M23-23d-the-screens.md, 23d-2; found by the live board's e2e test): a
// finished run has no answer events to take its time from, so its time is the Finish's, or the clock's end. Run with
// `npm run test:db`. The item says what the run scored and how many answers it gave (23f-2, answer 67), by the answers
// given before the day's midnight, as the ledger counts them (src/game/ledger.ts).
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPool } from "@/lib/db";
import { GAME_ID } from "@/platform/game";
import { useLocalStack } from "@/test/local-stack";
import { getFeedPage } from "./feed-page";
import { localStack } from "../../scripts/slot.ts";

const RUN = Date.now().toString(36);
const ids = { viewer: "00000000-0000-0000-0000-00000000fd01", early: "00000000-0000-0000-0000-00000000fd02", late: "00000000-0000-0000-0000-00000000fd03" };
let today = "";
// The local superuser, which may switch the answer triggers off to write an answer given after midnight.
const admin = new Pool({ connectionString: localStack().adminDatabaseUrl, max: 1 });

beforeAll(async () => {
  useLocalStack();
  const db = getPool();
  today = (await db.query<{ today: string }>("select private.today()::text as today")).rows[0].today;
  const { rowCount } = await db.query("select from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, today]);
  if (rowCount) throw new Error(`${today} has a puzzle already; this test needs it free for a clock day`);
  const day = { format: 4, game_id: GAME_ID, date: today, questions: [{ prompt: "one", levels: {} }, { prompt: "two", levels: {} }, { prompt: "three", levels: {} }] };
  await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, today, day]);
  for (const [name, id] of Object.entries(ids)) {
    await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${RUN}-${name}@example.test`]);
    await db.query("insert into private.profile (user_id, username) values ($1, $2)", [id, `${name.slice(0, 1)}fd${RUN}`]);
  }
  await db.query("insert into private.friendship (user_a, user_b) values ($1, $2), ($1, $3)", [ids.viewer, ids.early, ids.late]);
  // The viewer has finished their own run, or today's results of a game would come without their run (blurred).
  await db.query("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, $2, $3::date, clock_timestamp() - interval '5 seconds')", [ids.viewer, GAME_ID, today]);
  for (const index of [1, 2]) await db.query("insert into private.question_open (user_id, game_id, puzzle_date, question_idx) values ($1, $2, $3::date, $4)", [ids.viewer, GAME_ID, today, index]);
  await db.query("insert into private.clock_finish (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [ids.viewer, GAME_ID, today]);
  // One friend finishes with Finish a second after starting; the other's clock runs out a minute after its start.
  await db.query("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, $3, $4::date, clock_timestamp() - interval '2 seconds'), ($2, $3, $4::date, clock_timestamp() - interval '60 seconds')", [
    ids.early,
    ids.late,
    GAME_ID,
    today,
  ]);
  for (const index of [1, 2]) await db.query("insert into private.question_open (user_id, game_id, puzzle_date, question_idx) values ($1, $2, $3::date, $4)", [ids.early, GAME_ID, today, index]);
  await db.query("insert into private.clock_finish (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [ids.early, GAME_ID, today]);
  // The early friend's answers: two before midnight, 100 and 240 points, and one a day later, which counts for nothing.
  const answer = (entry: string, points: number, at: string) =>
    admin.query(
      `insert into private.clock_answer (user_id, game_id, puzzle_date, question_idx, entry_id, tier, added_ms, points, created_at)
       values ($1, $2, $3::date, 0, $4, 'common', 1000, $5, ${at})`,
      [ids.early, GAME_ID, today, entry, points],
    );
  await admin.query("begin");
  await admin.query("set local session_replication_role = replica");
  await answer("cat", 100, "now()");
  await answer("dog", 240, "now()");
  await answer("eel", 500, "now() + interval '1 day'");
  await admin.query("commit");
});

afterAll(async () => {
  const db = getPool();
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, today]);
  await db.end();
  await admin.end();
});

describe("the feed's result of a run on a clock", () => {
  it("carries its points and its number of answers, as the ledger counts them: none after midnight", async () => {
    const { items } = await getFeedPage(getPool(), ids.viewer, null);
    const ended = (username: string) => {
      const item = items.find((i) => i.kind === "result" && i.username === username);
      return item && item.kind === "result" && !item.blurred && item.game === GAME_ID ? item.ended : undefined;
    };
    expect(ended(`efd${RUN}`)).toEqual({ result: "scored", points: 340, answers: 2 });
    expect(ended(`lfd${RUN}`)).toEqual({ result: "scored", points: 0, answers: 0 });
  });

  it("is dated by the Finish, or by the end of the clock when it ran out", async () => {
    const { items } = await getFeedPage(getPool(), ids.viewer, null);
    const results = items.filter((i) => i.kind === "result" && !i.mine);
    expect(results.map((i) => i.username).sort()).toEqual([`efd${RUN}`, `lfd${RUN}`].sort());
    const at = (username: string) => results.find((i) => i.username === username)!.at;
    const { rows } = await getPool().query<{ early: boolean; late: boolean }>(
      `select $1::timestamptz between (select started_at from private.run where user_id = $3) and now() as early,
              $2::timestamptz = (select started_at + private.clock_start_ms() * interval '1 millisecond' from private.run where user_id = $4) as late`,
      [at(`efd${RUN}`), at(`lfd${RUN}`), ids.early, ids.late],
    );
    expect(rows[0]).toEqual({ early: true, late: true });
  });
});
