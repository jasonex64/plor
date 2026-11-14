// The overall board on the Friends page and a group's (M16 16e-3b, docs/milestones/M16-16e-points-and-boards.md,
// answers 29 and 33): the Game switch's third choice, list only, by Sum or by Average. Two closed days of last week,
// Thursday and Friday, are this file's own in both games, so no one else's runs count in their places; the runs and
// their ledger rows are written directly. X is the viewer, Y X's friend and fellow member of a group. Places:
// Thursday's game 1, X 100 and Y 50, gives X 100 and Y 0; Thursday's and Friday's game 2, Y alone, give Y 100 each.
// So by Sum Y leads, 200 to 100, and by Average X does, 100 over one game-day to 66.7 over three.
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { fixtureDay } from "../src/test/answer-fixture";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
let days: string[] = [];

test.beforeAll(async () => {
  // Last week's Thursday and Friday: this week's Monday less 4 and 3 days.
  const { rows } = await DB.query<{ thursday: string; friday: string }>(
    `select (date_trunc('week', private.today())::date - 4)::text as thursday, (date_trunc('week', private.today())::date - 3)::text as friday`,
  );
  days = [rows[0].thursday, rows[0].friday];
  // A place counts the whole day, so the days must be this file's own: an existing day fails the insert.
  for (const date of days) {
    await DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('offbeat', $1::date, $2)", [date, fixtureDay(date, `${date}T00:00:00Z`)]);
    await DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('substrings', $1::date, $2)", [
      date,
      { format: 1, game_id: "substrings", date, rounds: ["qk", "qm", "qnp", "qrs", "qtv", "qwx", "qyz"], bonus_letter: "j" },
    ]);
  }
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.query("delete from private.puzzle where game_id in ('offbeat', 'substrings') and puzzle_date = any($1::date[])", [days]);
  await DB.end();
});

const idOf = async (name: string) =>
  (await DB.query<{ id: string }>("select id::text from auth.users where email = $1", [`${RUN}-${name}@example.test`])).rows[0].id;

// A run started at its day's noon, so it's long over, and its ledger row, as settling would have written it.
async function scored(userId: string, game: string, date: string, points: number) {
  await DB.query("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, $2, $3::date, ($3::date + time '12:00') at time zone 'America/Los_Angeles')", [
    userId,
    game,
    date,
  ]);
  await DB.query("insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus) values ($1, $2, $3::date, $4, 0)", [userId, game, date, points]);
}

// The board's last week, each row's name and number.
const lastWeek = (page: Page, board: string) =>
  page
    .getByRole("region", { name: board })
    .getByRole("region", { name: "Last week" })
    .getByRole("listitem");

async function bothViews(page: Page, board: string, x: string, y: string) {
  const region = page.getByRole("region", { name: board });
  await region.getByRole("radiogroup", { name: "Game" }).getByText("Overall").click();
  await expect(region.getByRole("radiogroup", { name: "Game" }).getByRole("radio", { name: "Overall" })).toBeChecked();
  // List only: Sum or Average in the place of List or Graph, Sum first.
  await expect(region.getByRole("radiogroup", { name: "View" })).toHaveCount(0);
  const count = region.getByRole("radiogroup", { name: "Count" });
  await expect(count.getByRole("radio", { name: "Sum" })).toBeChecked();
  await expect(region.getByText("Each day adds the % of players you beat, in each game.")).toBeVisible();
  await expect(lastWeek(page, board)).toHaveText([new RegExp(`${y}: 200$`), new RegExp(`${x} \\(you\\): 100$`)]);
  await count.getByText("Average").click();
  await expect(region.getByText("Your average % of players beaten, per game played.")).toBeVisible();
  await expect(lastWeek(page, board)).toHaveText([new RegExp(`${x} \\(you\\): 100$`), new RegExp(`${y}: 66.7$`)]);
}

test("the overall board shows Sum and Average on the Friends page and a group's", async ({ browser }) => {
  const friend = await (await browser.newContext()).newPage();
  await friend.goto("/");
  await signInAndPick(friend, "wy");
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "wx");
  const [x, y] = [await idOf("wx"), await idOf("wy")];
  // Signed up before last week: a friends board lists only players whose account was made by the week's end (M19 19c).
  await DB.query("update private.profile set created_at = now() - interval '14 days' where user_id = any($1::uuid[])", [[x, y]]);
  await DB.query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [x, y]);
  const [thursday, friday] = days;
  await scored(x, "offbeat", thursday, 100);
  await scored(y, "offbeat", thursday, 50);
  await scored(y, "substrings", thursday, 80);
  await scored(y, "substrings", friday, 10);
  // The creator must be a member by the statement's end, so the group and its members go in together.
  const { rows } = await DB.query<{ id: string }>(
    `with g as (insert into private.player_group (name, creator_id, invite_code) values ('Overall Club', $1, $3) returning id),
          m as (insert into private.group_member (group_id, user_id, joined_at)
                select g.id, $1, now() - interval '30 days' from g union all select g.id, $2, now() - interval '30 days' from g)
     select id::text from g`,
    [x, y, RUN.padEnd(10, "w").slice(0, 10)],
  );
  const [xName, yName] = [`wx${RUN}`, `wy${RUN}`];

  await page.goto("/friends");
  await bothViews(page, "Friends leaderboard", xName, yName);
  await page.goto(`/groups/${rows[0].id}`);
  await bothViews(page, "Group leaderboard", xName, yName);
});
