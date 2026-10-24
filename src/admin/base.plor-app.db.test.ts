// The answer database's admin lookup as plor_app really runs it (docs/milestones/M13-13a-the-base.md): plor_app has
// no grant on the base's tables, so the lookup works only through private.base_lookup's owner rights. Locally the
// routes connect as postgres (ROADMAP), so this file switches to plor_app the way src/game/runs.plor-app.db.test.ts does.
import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { lookupThings } from "./base";

const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });

afterAll(async () => {
  await admin.end();
});

// Runs fn as plor_app in a transaction that is always rolled back, with an admin and a one-thing fixture loaded as
// the owner.
async function asPlorApp(fn: (client: PoolClient, adminId: string, alias: string) => Promise<void>): Promise<void> {
  const client = await admin.connect();
  // No hyphens: aliases are normalized, which drops punctuation (src/content/puzzle.ts).
  const tag = randomUUID().replace(/-/g, "");
  try {
    await client.query("begin");
    const adminId = randomUUID();
    await client.query("insert into auth.users (id, email) values ($1, $2)", [adminId, `${adminId}@example.test`]);
    await client.query("insert into private.admin (user_id) values ($1)", [adminId]);
    await client.query("select private.import_source('wikidata', $1, $2::jsonb)", [
      tag,
      JSON.stringify([{ id: `plor-app-${tag}`, name: "plor app thing", aliases: [{ alias: `plor app thing ${tag}`, kind: "name" }] }]),
    ]);
    await client.query("set local role plor_app");
    await fn(client, adminId, `plor app thing ${tag}`);
  } finally {
    await client.query("rollback");
    client.release();
  }
}

describe("the admin lookup as plor_app", () => {
  it("finds a thing through private.base_lookup", async () => {
    await asPlorApp(async (client, adminId, alias) => {
      expect((await lookupThings(client, adminId, alias)).map((t) => t.name)).toEqual(["plor app thing"]);
    });
  });

  it("can't read the base's tables directly", async () => {
    await asPlorApp(async (client) => {
      await expect(client.query("select count(*) from private.thing")).rejects.toMatchObject({ code: "42501" });
    });
  });

  it("can't import or define categories", async () => {
    await asPlorApp(async (client) => {
      await expect(client.query("select private.import_source('wikidata', 'x', '[]'::jsonb)")).rejects.toMatchObject({ code: "42501" });
    });
  });
});
