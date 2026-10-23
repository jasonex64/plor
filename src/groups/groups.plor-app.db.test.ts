// Groups' database work as plor_app really does it: its grants and policies, and the guard and handover triggers that
// run as their owner on its behalf (docs/milestones/M10-groups.md, 10b; G10). Locally the routes connect as postgres,
// so this file switches to plor_app the same way src/game/runs.plor-app.db.test.ts does.
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, expect, it } from "vitest";
import { createGroup, deleteGroup, getGroup, joinGroup, leaveGroup, removeMember, renameGroup, resetGroupInvite } from "./groups";

const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });

afterAll(async () => {
  await admin.end();
});

it("creates, joins, renames, resets, removes, hands over and deletes as plor_app", async () => {
  const client = await admin.connect();
  try {
    await client.query("begin");
    const [a, b, c] = [randomUUID(), randomUUID(), randomUUID()];
    for (const [i, id] of [a, b, c].entries()) {
      await client.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@example.test`]);
      await client.query("insert into private.profile (user_id, username) values ($1, $2)", [id, `p${i}${id.slice(0, 8)}`]);
    }
    await client.query("set local role plor_app");

    const group = await createGroup(client, a, "App Club");
    const { inviteCode } = await getGroup(client, a, group.id);
    await joinGroup(client, b, inviteCode);
    await renameGroup(client, a, group.id, "Renamed");
    const code = await resetGroupInvite(client, a, group.id);
    await joinGroup(client, c, code);
    const cName = (await getGroup(client, c, group.id)).members.find((m) => !m.creator && m.username.startsWith("p2"))!.username;
    await removeMember(client, a, group.id, cName);
    await leaveGroup(client, a, group.id);
    const handed = await getGroup(client, b, group.id);
    expect(handed).toMatchObject({ name: "Renamed", inviteCode: code, creator: true });
    expect(handed.members.map((m) => m.creator)).toEqual([true]);
    // What a commit would check: every creator is a member.
    await client.query("set constraints all immediate");
    await deleteGroup(client, b, group.id);
    expect((await client.query("select count(*)::int as n from private.player_group where id = $1", [group.id])).rows[0].n).toBe(0);
  } finally {
    await client.query("rollback");
    client.release();
  }
});
