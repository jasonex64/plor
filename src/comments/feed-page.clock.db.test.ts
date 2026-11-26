// The feed's result for a run on a clock (docs/milestones/M23-23d-the-screens.md, 23d-2; found by the live board's e2e test): a
// finished run has no answer events to take its time from, so its time is the Finish's, or the clock's end. Run with
// `npm run test:db`. The item's wording for a clock run waits for 23f; this asks only that it exists, and when.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPool } from "@/lib/db";
import { GAME_ID } from "@/platform/game";
import { useLocalStack } from "@/test/local-stack";
import { getFeedPage } from "./feed-page";

const RUN = Date.now().toString(36);
const ids = { viewer: "00000000-0000-0000-0000-00000000fd01", early: "00000000-0000-0000-0000-00000000fd02", late: "00000000-0000-0000-0000-00000000fd03" };
let today = "";

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
  // One friend finishes with Finish a second after starting; the other's clock runs out a minute after its start.
  await db.query("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, $3, $4::date, clock_timestamp() - interval '2 seconds'), ($2, $3, $4::date, clock_timestamp() - interval '60 seconds')", [
    ids.early,
    ids.late,
    GAME_ID,
    today,
  ]);
  for (const index of [1, 2]) await db.query("insert into private.question_open (user_id, game_id, puzzle_date, question_idx) values ($1, $2, $3::date, $4)", [ids.early, GAME_ID, today, index]);
  await db.query("insert into private.clock_finish (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [ids.early, GAME_ID, today]);
});

afterAll(async () => {
  const db = getPool();
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, today]);
  await db.end();
});

describe("the feed's result of a run on a clock", () => {
  it("is dated by the Finish, or by the end of the clock when it ran out", async () => {
    const { items } = await getFeedPage(getPool(), ids.viewer, null);
    const results = items.filter((i) => i.kind === "result");
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
