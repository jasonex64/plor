// Deleting an account as plor_app really does it (docs/milestones/M12-account.md, 12c: A5, A7, A9). Locally the routes
// connect as postgres, so this file switches to plor_app the same way src/groups/groups.plor-app.db.test.ts does.
// Needs the local stack; run with `npm run test:db`.
import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { postComment } from "@/comments/comments";
import { GAME_ID } from "@/platform/game";
import { issueInviteCode } from "@/friends/friends";
import { startRun } from "@/game/runs";
import { createGroup, leaveGroup } from "@/groups/groups";
import { deleteAccount } from "./account";
import { createProfile } from "./profile";
import { fixtureDay, loadFixtureBase } from "@/test/answer-fixture";

const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 3 });
const RUN = Date.now().toString(36);
const committed: string[] = [];

afterAll(async () => {
  await admin.query("delete from auth.users where id = any($1)", [committed]);
  await admin.end();
});

async function addUser(db: Pool | PoolClient, tag: string): Promise<{ id: string; username: string }> {
  const id = randomUUID();
  const username = `${tag}${RUN}`;
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@example.test`]);
  await db.query("insert into private.profile (user_id, username) values ($1, $2)", [id, username]);
  return { id, username };
}

// Runs fn as plor_app in a transaction that is always rolled back.
async function asPlorApp(fn: (client: PoolClient) => Promise<void>, setup?: (client: PoolClient) => Promise<void>): Promise<void> {
  const client = await admin.connect();
  try {
    await client.query("begin");
    await setup?.(client);
    await client.query("set local role plor_app");
    await fn(client);
  } finally {
    await client.query("rollback");
    client.release();
  }
}

describe("deleting an account as plor_app", () => {
  it("deletes only with the player's own username", async () => {
    let player = { id: "", username: "" };
    await asPlorApp(
      async (client) => {
        expect(await deleteAccount(client, player.id, `other${RUN}`)).toBe(false);
        expect(await deleteAccount(client, player.id, player.username)).toBe(true);
        const { rows } = await client.query("select count(*)::int as n from private.profile where user_id = $1", [player.id]);
        expect(rows[0].n).toBe(0);
      },
      async (client) => {
        player = await addUser(client, "dk");
      },
    );
  });

  // ROADMAP "Next revision", For M12: deleting the auth.users row directly while a group's creator left it deadlocked
  // (40P01, plan step 1). Leaving each group first takes the group's lock before any membership, as a leave does.
  it("waits for a creator's leave from a shared group instead of deadlocking", async () => {
    const creator = await addUser(admin, "dc");
    const member = await addUser(admin, "dm");
    committed.push(creator.id, member.id);
    const leaver = await admin.connect();
    const deleter = await admin.connect();
    try {
      await leaver.query("begin");
      await leaver.query("set local role plor_app");
      const group = await createGroup(leaver, creator.id, "Race Club");
      await leaver.query("insert into private.group_member (group_id, user_id) values ($1, $2)", [group.id, member.id]);
      await leaver.query("commit");

      await leaver.query("begin");
      await leaver.query("set local role plor_app");
      await leaveGroup(leaver, creator.id, group.id);
      await deleter.query("begin");
      await deleter.query("set local role plor_app");
      const deleting = deleteAccount(deleter, member.id, member.username);
      // Long enough for the deletion to be waiting on the group's lock before the leave commits.
      await new Promise((resolve) => setTimeout(resolve, 500));
      await leaver.query("commit");
      expect(await deleting).toBe(true);
      await deleter.query("commit");

      // The creator left, the member was handed the group and then deleted as its last member (M10 G6).
      const { rows } = await admin.query("select count(*)::int as n from private.player_group where id = $1", [group.id]);
      expect(rows[0].n).toBe(0);
    } finally {
      await leaver.query("rollback");
      await deleter.query("rollback");
      leaver.release();
      deleter.release();
    }
  });
});

// A9 (a): a deleted player's access token stays valid until it expires, and the hosted project checks it without
// asking Auth. Whatever a route then tries for that user ID, the foreign keys to auth.users (directly, or through their
// run) store nothing.
describe("writes for a deleted player", () => {
  async function deleted(client: PoolClient): Promise<string> {
    const player = await addUser(client, "dg");
    const { rows } = await client.query<{ today: string; content: unknown }>(
      "select private.today()::text as today, (select content from private.puzzle where game_id = $1 and puzzle_date = private.today()) as content",
      [GAME_ID],
    );
    if (!rows[0].content) {
      const puzzle = fixtureDay(rows[0].today, await loadFixtureBase(client));
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, rows[0].today, puzzle]);
    }
    await client.query("set local role plor_app");
    expect(await deleteAccount(client, player.id, player.username)).toBe(true);
    await client.query("reset role");
    return player.id;
  }

  // Each is refused by the database for the missing auth.users row (23503), except a comment, which needs a finished
  // run that can't exist for them.
  const writes: [string, (client: PoolClient, userId: string) => Promise<unknown>, object][] = [
    ["create a profile", (client, userId) => createProfile(client, userId, `dg2${RUN}`), { code: "23503", constraint: "profile_user_id_fkey" }],
    ["start a run", (client, userId) => startRun(client, userId), { code: "23503", constraint: "run_user_id_fkey" }],
    ["make an invite link", (client, userId) => issueInviteCode(client, userId, false), { code: "23503", constraint: "friend_invite_user_id_fkey" }],
    ["create a group", (client, userId) => createGroup(client, userId, "Ghost Club"), { code: "23503", constraint: "group_member_user_id_fkey" }],
    [
      "post a comment",
      async (client, userId) => postComment(client, userId, (await client.query("select private.today()::text as d")).rows[0].d, "hello", null),
      { code: "not_finished", status: 409 },
    ],
  ];

  for (const [what, write, refusal] of writes) {
    it(`can't ${what}`, async () => {
      let userId = "";
      await asPlorApp(
        async (client) => {
          await expect(write(client, userId)).rejects.toMatchObject(refusal);
        },
        async (client) => {
          userId = await deleted(client);
        },
      );
    });
  }
});
