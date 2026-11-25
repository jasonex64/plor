// A player's stars as plor_app really sets them: its two column grants and update policies, and the one-star index
// under two moves at once (docs/milestones/M24-groups-tab-and-favourites.md, 24a). Locally the routes connect as
// postgres, so this file connects with the role set to plor_app, as src/friends/requests.plor-app.db.test.ts does:
// setGroupStar opens its own transaction.
import { randomUUID } from "node:crypto";
import { DatabaseError, Pool } from "pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { listFriends, setFavourite } from "@/friends/friends";
import { AppError } from "@/lib/http";
import { createGroup, listGroups, setGroupStar } from "./groups";
import { localStack } from "../../scripts/slot.ts";

const URL = localStack().adminDatabaseUrl;
const admin = new Pool({ connectionString: URL, max: 1 });
const app = new Pool({ connectionString: URL, options: "-c role=plor_app" });
const [a, b] = [randomUUID(), randomUUID()].toSorted();
const name = (id: string) => `s${id.slice(0, 8)}${id.slice(-6)}`;
// How many times the race is run; the test's size, not a limit of the app.
const ROUNDS = 10;

beforeAll(async () => {
  for (const id of [a, b]) {
    await admin.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@example.test`]);
    await admin.query("insert into private.profile (user_id, username) values ($1, $2)", [id, name(id)]);
  }
});

afterAll(async () => {
  await admin.query("delete from auth.users where id in ($1, $2)", [a, b]);
  await admin.end();
  await app.end();
});

it("stars a group and a friend as plor_app, which can change no other column of either row", async () => {
  expect((await app.query("select current_user as role")).rows[0].role).toBe("plor_app");
  const group = await createGroup(app, a, "Star Club");
  await setGroupStar(app, a, group.id, true);
  expect(await listGroups(app, a)).toEqual([{ id: group.id, name: "Star Club", starred: true }]);

  await app.query("insert into private.friendship (user_a, user_b) values ($1, $2)", [a, b]);
  await setFavourite(app, b, a, true);
  expect((await listFriends(app, b)).map((f) => f.favourite)).toEqual([true]);
  expect((await listFriends(app, a)).map((f) => f.favourite)).toEqual([false]);

  // The grants are the three flags only: a membership or a friendship can't be moved to another player.
  for (const moved of ["update private.group_member set user_id = $2 where user_id = $1", "update private.friendship set user_b = $2 where user_a = $1"]) {
    const denied = await app.query(moved, [a, b]).then(() => null, (err: unknown) => err);
    expect(denied).toBeInstanceOf(DatabaseError);
    expect((denied as DatabaseError).code).toBe("42501");
  }
});

it("two moves of one player's star at the same moment always leave exactly one star", async () => {
  const [one, two] = [await createGroup(app, b, "Race One"), await createGroup(app, b, "Race Two")];
  for (let round = 0; round < ROUNDS; round++) {
    const results = await Promise.allSettled([setGroupStar(app, b, one.id, true), setGroupStar(app, b, two.id, true)]);
    for (const result of results) {
      // The later move may meet the earlier one's star: that is "busy", and nothing else is allowed to go wrong.
      if (result.status === "rejected") expect(result.reason).toMatchObject({ code: "busy" } satisfies Partial<AppError>);
    }
    expect(results.some((r) => r.status === "fulfilled")).toBe(true);
    expect((await listGroups(app, b)).filter((g) => g.starred)).toHaveLength(1);
  }
});
