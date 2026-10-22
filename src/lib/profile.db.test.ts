// private.profile as plor_app really sees it: grants, the plor_app RLS policies, the foreign key to auth.users
// and citext together. Needs the local stack (`npx supabase start`); run with `npm run test:db`.
// pgTAP runs as postgres, which can't SET ROLE plor_app, so this connects as the local stack's superuser,
// supabase_admin (local password observed to be the stack default, 2026-10-18), only to switch to plor_app.
import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { DISPLAY_NAME_MAX_LENGTH, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@/config/tunables";
import { createProfile, getProfile, setDisplayName } from "./profile";

const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });

afterAll(async () => {
  await admin.end();
});

// Runs fn as plor_app inside a transaction that is always rolled back, with one fresh auth user.
async function asPlorApp(fn: (client: PoolClient, userId: string) => Promise<void>): Promise<void> {
  const client = await admin.connect();
  try {
    await client.query("begin");
    const userId = randomUUID();
    await client.query("insert into auth.users (id, email) values ($1, $2)", [userId, `${userId}@example.test`]);
    await client.query("set local role plor_app");
    await fn(client, userId);
  } finally {
    await client.query("rollback");
    client.release();
  }
}

describe("private.profile as plor_app", () => {
  it("creates and reads a profile", async () => {
    await asPlorApp(async (client, userId) => {
      await createProfile(client, userId, "plor_app_probe");
      expect(await getProfile(client, userId)).toEqual({ username: "plor_app_probe", displayName: null });
    });
  });

  it("sets, changes and clears the display name (M07 7a)", async () => {
    await asPlorApp(async (client, userId) => {
      await createProfile(client, userId, "plor_app_probe");
      await setDisplayName(client, userId, "Zoë");
      expect(await getProfile(client, userId)).toEqual({ username: "plor_app_probe", displayName: "Zoë" });
      await setDisplayName(client, userId, null);
      expect(await getProfile(client, userId)).toEqual({ username: "plor_app_probe", displayName: null });
      await expect(setDisplayName(client, userId, "Zoe 😀")).rejects.toMatchObject({ code: "display_name_invalid", status: 400 });
    });
  });

  it("refuses a display name before the profile exists, with 409 no_profile", async () => {
    await asPlorApp(async (client, userId) => {
      await expect(setDisplayName(client, userId, "Zoë")).rejects.toMatchObject({ code: "no_profile", status: 409 });
    });
  });

  it("cannot change a profile", async () => {
    await asPlorApp(async (client, userId) => {
      await createProfile(client, userId, "plor_app_probe");
      await expect(client.query("update private.profile set username = 'other' where user_id = $1", [userId])).rejects.toThrow(
        /permission denied for table profile/,
      );
    });
  });
});

// The length in the player's message comes from tunables.ts; the database's check constraint must agree with it at
// both ends (M02 2f, B6). Each insert gets its own transaction, because a refused insert aborts it.
describe("the username length rule", () => {
  it.each([
    [USERNAME_MIN_LENGTH - 1, false],
    [USERNAME_MIN_LENGTH, true],
    [USERNAME_MAX_LENGTH, true],
    [USERNAME_MAX_LENGTH + 1, false],
  ])("%i characters accepted: %s", async (length, accepted) => {
    await asPlorApp(async (client, userId) => {
      const insert = createProfile(client, userId, "a".repeat(length));
      if (accepted) await expect(insert).resolves.toBeUndefined();
      else await expect(insert).rejects.toMatchObject({ code: "username_invalid", status: 400 });
    });
  });
});

// The display name's maximum (M07 D1) agrees with the constraint, the same way.
describe("the display name length rule", () => {
  it.each([
    [DISPLAY_NAME_MAX_LENGTH, true],
    [DISPLAY_NAME_MAX_LENGTH + 1, false],
  ])("%i characters accepted: %s", async (length, accepted) => {
    await asPlorApp(async (client, userId) => {
      await createProfile(client, userId, "plor_app_probe");
      const update = setDisplayName(client, userId, "a".repeat(length));
      if (accepted) await expect(update).resolves.toBeUndefined();
      else await expect(update).rejects.toMatchObject({ code: "display_name_invalid", status: 400 });
    });
  });
});
