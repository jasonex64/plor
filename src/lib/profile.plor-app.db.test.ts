// The held username as plor_app really meets it: the definer trigger writes the hold though the role can't, and a
// sign-up for a name being given up at the same moment never gets it
// (docs/milestones/M17-profiles-and-friend-requests.md, "17b design", the held name). Locally the routes connect as
// postgres, so this file connects with the role set to plor_app, as src/friends/requests.plor-app.db.test.ts does.
import { randomUUID } from "node:crypto";
import { DatabaseError, Pool } from "pg";
import { afterAll, expect, it } from "vitest";
import { getPlayer } from "@/friends/players";
import { hashKey } from "./auth-limits";
import { AppError } from "./http";
import { changeUsername, createProfile } from "./profile";

const URL = "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres";
const admin = new Pool({ connectionString: URL, max: 1 });
const app = new Pool({ connectionString: URL, options: "-c role=plor_app" });
const made: string[] = [];
const name = (id: string, tag: string) => `${tag}${id.slice(0, 8)}${id.slice(-6)}`;
// How many times the race is run; the test's size, not a limit of the app.
const ROUNDS = 10;

async function user(): Promise<string> {
  const id = randomUUID();
  await admin.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@example.test`]);
  made.push(id);
  return id;
}
const heldBy = async (username: string) =>
  (await admin.query<{ user_id: string }>("select user_id from private.held_username where username = $1", [username])).rows.map((r) => r.user_id);

afterAll(async () => {
  await admin.query("delete from auth.users where id = any($1)", [made]);
  await admin.query("delete from private.auth_attempt where kind = 'lookup' and key = any($1)", [made.map(hashKey)]);
  await admin.end();
  await app.end();
});

it("holds a renamed player's name as plor_app, which can read held names and not write them", async () => {
  const [a, b] = [await user(), await user()];
  await createProfile(app, a, name(a, "h"));
  await createProfile(app, b, name(b, "h"));
  await changeUsername(app, a, name(a, "i"));
  expect(await heldBy(name(a, "h"))).toEqual([a]);
  await expect(changeUsername(app, b, name(a, "h"))).rejects.toMatchObject({ code: "username_taken", status: 409 });
  // The old name opens the renamed player's profile, read with the role's own grants.
  expect(await getPlayer(app, b, name(a, "h"))).toMatchObject({ username: name(a, "i"), relation: "none" });
  for (const write of [
    "insert into private.held_username (username, user_id, held_until) values ('zz_any_name', $1, now())",
    "delete from private.held_username where user_id = $1",
    "update private.held_username set held_until = now() where user_id = $1",
  ]) {
    const refused = await app.query(write, [a]).catch((err: unknown) => err);
    expect(refused).toBeInstanceOf(DatabaseError);
    expect((refused as DatabaseError).code).toBe("42501");
  }
  expect(await heldBy(name(a, "h"))).toEqual([a]);
});

it(`a sign-up racing a rename never gets the name being given up, ${ROUNDS} rounds`, async () => {
  for (let round = 0; round < ROUNDS; round++) {
    const [a, c] = [await user(), await user()];
    await createProfile(app, a, name(a, "j"));
    const [renamed, signedUp] = await Promise.allSettled([changeUsername(app, a, name(a, "k")), createProfile(app, c, name(a, "j"))]);
    expect(renamed.status).toBe("fulfilled");
    // Before the rename the name is the renamer's; after it, it is held. Either way the sign-up is refused.
    expect(signedUp).toMatchObject({ status: "rejected", reason: expect.any(AppError) });
    expect((signedUp as PromiseRejectedResult).reason).toMatchObject({ code: "username_taken" });
    expect(await heldBy(name(a, "j"))).toEqual([a]);
    expect((await admin.query("select from private.profile where username = $1 or user_id = $2", [name(a, "j"), c])).rowCount).toBe(0);
  }
});
