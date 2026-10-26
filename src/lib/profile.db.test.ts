// private.profile as plor_app really sees it: grants, the plor_app RLS policies, the foreign key to auth.users
// and citext together. Needs the local stack (`npx supabase start`); run with `npm run test:db`.
// pgTAP runs as postgres, which can't SET ROLE plor_app, so this connects as the local stack's superuser,
// supabase_admin (local password observed to be the stack default, 2026-10-18), only to switch to plor_app.
import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { DISPLAY_NAME_MAX_LENGTH, USERNAME_CHANGE_DAYS, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@/config/tunables";
import { changeUsername, createProfile, getProfile, setDisplayName, setSettings } from "./profile";

// Both settings off and the theme following the device on a new profile (M14 14a-3b, 14b-1).
const OFF = { skipGameScreen: false, calendarNumbers: false, theme: "device" };

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
      expect(await getProfile(client, userId)).toEqual({ username: "plor_app_probe", displayName: null, usernameChangeableAt: null, settings: OFF });
    });
  });

  it("sets, changes and clears the display name (M07 7a)", async () => {
    await asPlorApp(async (client, userId) => {
      await createProfile(client, userId, "plor_app_probe");
      await setDisplayName(client, userId, "Zoë");
      expect(await getProfile(client, userId)).toEqual({ username: "plor_app_probe", displayName: "Zoë", usernameChangeableAt: null, settings: OFF });
      await setDisplayName(client, userId, null);
      expect(await getProfile(client, userId)).toEqual({ username: "plor_app_probe", displayName: null, usernameChangeableAt: null, settings: OFF });
      await expect(setDisplayName(client, userId, "Zoe 😀")).rejects.toMatchObject({ code: "display_name_invalid", status: 400 });
    });
  });

  // Since M14 14a-3b (a security change) plor_app may update the two settings' columns (DECISIONS.md Log, 2026-10-25),
  // which the existing update policy covers.
  it("sets the settings and the theme, one at a time, and refuses them before the profile exists", async () => {
    await asPlorApp(async (client, userId) => {
      await expect(setSettings(client, userId, { skipGameScreen: true })).rejects.toMatchObject({ code: "no_profile", status: 409 });
    });
    await asPlorApp(async (client, userId) => {
      await createProfile(client, userId, "plor_app_probe");
      expect(await setSettings(client, userId, { skipGameScreen: true })).toEqual({ ...OFF, skipGameScreen: true });
      expect(await setSettings(client, userId, { calendarNumbers: true })).toEqual({ ...OFF, skipGameScreen: true, calendarNumbers: true });
      // And the theme (14b-1): its own column grant.
      expect(await setSettings(client, userId, { theme: "moonlit" })).toEqual({ skipGameScreen: true, calendarNumbers: true, theme: "moonlit" });
      expect((await getProfile(client, userId))?.settings).toEqual({ skipGameScreen: true, calendarNumbers: true, theme: "moonlit" });
    });
  });

  it("refuses a display name before the profile exists, with 409 no_profile", async () => {
    await asPlorApp(async (client, userId) => {
      await expect(setDisplayName(client, userId, "Zoë")).rejects.toMatchObject({ code: "no_profile", status: 409 });
    });
  });

  // Since M12 12b (A2, a security change) plor_app may change the username, and only through the trigger's rule; the
  // change time and the rest of the row are still out of its reach.
  it("changes the username once, through the trigger's rule, and nothing else of a profile", async () => {
    await asPlorApp(async (client, userId) => {
      await createProfile(client, userId, "plor_app_probe");
      await changeUsername(client, userId, "plor_app_probe2");
      const changed = await getProfile(client, userId);
      expect(changed?.username).toBe("plor_app_probe2");
      expect(changed?.usernameChangeableAt).not.toBeNull();
      await expect(changeUsername(client, userId, "plor_app_probe3")).rejects.toMatchObject({
        code: "username_change_too_soon",
        status: 409,
      });
    });
    for (const column of ["username_changed_at = null", "created_at = now()", "user_id = gen_random_uuid()"]) {
      await asPlorApp(async (client, userId) => {
        await createProfile(client, userId, "plor_app_probe");
        await expect(client.query(`update private.profile set ${column} where user_id = $1`, [userId])).rejects.toThrow(
          /permission denied for table profile/,
        );
      });
    }
  });

  // M12 12c, A10: the insert grant names the user ID and username only, so a new profile can't set its change time.
  it("creates a profile naming only its user ID and username", async () => {
    await asPlorApp(async (client, userId) => {
      await expect(
        client.query("insert into private.profile (user_id, username, username_changed_at) values ($1, 'plor_app_probe', now())", [userId]),
      ).rejects.toThrow(/permission denied for table profile/);
    });
  });
});

// The length in the player's message comes from tunables.ts; the database's check constraint must agree with it at
// both ends (M02 2f, B6). Each insert gets its own transaction, because a refused insert aborts it.
// The days in the player's message and next-change date come from tunables.ts; the trigger's interval must agree with
// it at both ends (M12 12b, A2; as the length rule below, M02 2f, B6). Backdating the last change needs the superuser,
// so the test steps out of plor_app for it and back in to change.
describe("the username change interval", () => {
  it(`refuses a change a second short of ${USERNAME_CHANGE_DAYS} days after the last, and allows one a second past`, async () => {
    await asPlorApp(async (client, userId) => {
      await createProfile(client, userId, "plor_app_probe");
      await changeUsername(client, userId, "plor_app_probe2");
      async function lastChangedAgo(seconds: number) {
        await client.query("reset role");
        await client.query(
          "update private.profile set username_changed_at = statement_timestamp() - make_interval(secs => $2) where user_id = $1",
          [userId, seconds],
        );
        await client.query("set local role plor_app");
      }
      const days = USERNAME_CHANGE_DAYS * 24 * 60 * 60;
      await lastChangedAgo(days - 1);
      await client.query("savepoint short");
      await expect(changeUsername(client, userId, "plor_app_probe3")).rejects.toMatchObject({ code: "username_change_too_soon" });
      await client.query("rollback to savepoint short");
      await lastChangedAgo(days + 1);
      await expect(changeUsername(client, userId, "plor_app_probe3")).resolves.toBeUndefined();
    });
  });
});

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
