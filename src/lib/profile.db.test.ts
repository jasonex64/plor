// private.profile as riff_app really sees it: grants, the riff_app RLS policies, the foreign key to auth.users
// and citext together. Needs the local stack (`npx supabase start`); run with `npm run test:db`.
// pgTAP runs as postgres, which can't SET ROLE riff_app, so this connects as the local stack's superuser,
// supabase_admin (local password observed to be the stack default, 2026-10-18), only to switch to riff_app.
import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { createProfile, getUsername } from "./profile";

const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });

afterAll(async () => {
  await admin.end();
});

// Runs fn as riff_app inside a transaction that is always rolled back, with one fresh auth user.
async function asRiffApp(fn: (client: PoolClient, userId: string) => Promise<void>): Promise<void> {
  const client = await admin.connect();
  try {
    await client.query("begin");
    const userId = randomUUID();
    await client.query("insert into auth.users (id, email) values ($1, $2)", [userId, `${userId}@example.test`]);
    await client.query("set local role riff_app");
    await fn(client, userId);
  } finally {
    await client.query("rollback");
    client.release();
  }
}

describe("private.profile as riff_app", () => {
  it("creates and reads a profile", async () => {
    await asRiffApp(async (client, userId) => {
      await createProfile(client, userId, "riff_app_probe");
      expect(await getUsername(client, userId)).toBe("riff_app_probe");
    });
  });

  it("cannot change a profile", async () => {
    await asRiffApp(async (client, userId) => {
      await createProfile(client, userId, "riff_app_probe");
      await expect(client.query("update private.profile set username = 'other' where user_id = $1", [userId])).rejects.toThrow(
        /permission denied for table profile/,
      );
    });
  });
});
