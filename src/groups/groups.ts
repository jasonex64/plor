// Groups and their members (docs/milestones/M10-groups.md, 10b; G1, G6, G8). The database keeps the rules: the name
// format, the invite code's shape, the creator always a member, the caps and the creator handover
// (supabase/migrations/20261023050925_groups.sql). The routes pass only the verified player's ID.
import { DatabaseError } from "pg";
import { newInviteCode, type Friend } from "@/friends/friends";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";

export type GroupSummary = { id: string; name: string };
// A member as the others see them (G3): the username identifies them (the creator removes by it), and the name shown
// is the display name if set (M07 7a).
export type Member = Friend & { creator: boolean };
// creator says whether the viewer is the creator, which decides the controls the page shows (G1).
export type Group = GroupSummary & { inviteCode: string; creator: boolean; members: Member[] };

const GROUP_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// A group ID from a link or a request body. Anything that can't be one is the same 404 as a group the player isn't in.
export function readGroupId(input: unknown): string {
  if (typeof input !== "string" || !GROUP_ID.test(input)) throw new AppError("group_not_found", 404);
  return input;
}

// Trimmed and in NFC, the form the database requires, as display names (M07 D1); the database checks the rest (G11).
export function readGroupName(input: unknown): string {
  if (typeof input !== "string") throw new AppError("group_name_invalid", 400);
  return input.normalize("NFC").trim();
}

// The group and its first member, the creator, in one statement: the database checks the creator is a member when
// it commits.
export async function createGroup(db: Db, userId: string, name: string): Promise<GroupSummary> {
  try {
    const { rows } = await db.query<GroupSummary>(
      `with g as (insert into private.player_group (name, creator_id, invite_code) values ($2, $1, $3) returning id, name),
            m as (insert into private.group_member (group_id, user_id) select id, $1 from g)
       select id, name from g`,
      [userId, name, newInviteCode()],
    );
    return rows[0];
  } catch (err) {
    throw groupError(err);
  }
}

export async function listGroups(db: Db, userId: string): Promise<GroupSummary[]> {
  const { rows } = await db.query<GroupSummary>(
    `select g.id, g.name from private.group_member m join private.player_group g on g.id = m.group_id
     where m.user_id = $1 order by lower(g.name), g.id`,
    [userId],
  );
  return rows;
}

// A group the player is in, with its members and invite code, which every member may share (G1).
export async function getGroup(db: Db, userId: string, groupId: string): Promise<Group> {
  const { rows } = await db.query<Group>(
    `select g.id, g.name, g.invite_code as "inviteCode", g.creator_id = $1 as creator,
            (select json_agg(json_build_object('username', p.username, 'name', coalesce(p.display_name, p.username::text),
                                               'creator', m.user_id = g.creator_id)
                             order by lower(coalesce(p.display_name, p.username::text)), p.username)
             from private.group_member m join private.profile p using (user_id) where m.group_id = g.id) as members
     from private.player_group g
     where g.id = $2 and exists (select from private.group_member where group_id = g.id and user_id = $1)`,
    [userId, groupId],
  );
  if (!rows[0]) throw new AppError("group_not_found", 404);
  return rows[0];
}

// Which group a code opens, for the join page to ask "Join <name>?".
export async function findGroupByCode(db: Db, code: string): Promise<GroupSummary> {
  const { rows } = await db.query<GroupSummary>("select id, name from private.player_group where invite_code = $1", [code]);
  if (!rows[0]) throw new AppError("invite_invalid", 404);
  return rows[0];
}

export async function joinGroup(db: Db, userId: string, code: string): Promise<GroupSummary> {
  try {
    const { rows } = await db.query<GroupSummary>(
      `with g as (select id, name from private.player_group where invite_code = $2),
            m as (insert into private.group_member (group_id, user_id) select id, $1 from g returning group_id)
       select g.id, g.name from g join m on m.group_id = g.id`,
      [userId, code],
    );
    if (!rows[0]) throw new AppError("invite_invalid", 404);
    return rows[0];
  } catch (err) {
    throw groupError(err);
  }
}

// Any member may leave; a creator who leaves hands the group on, and the last member deletes it (G6, in the database).
export async function leaveGroup(db: Db, userId: string, groupId: string): Promise<void> {
  const { rowCount } = await db.query("delete from private.group_member where group_id = $2 and user_id = $1", [userId, groupId]);
  if (rowCount === 0) throw new AppError("group_not_found", 404);
}

// The creator's powers (G1). Each checks first, so a member who isn't the creator gets 403 and anyone else 404, and
// each change repeats the creator condition, so a handover between the check and the change can't let it through.
async function checkCreator(db: Db, userId: string, groupId: string): Promise<void> {
  const { rows } = await db.query<{ creator: boolean }>(
    `select g.creator_id = $1 as creator from private.player_group g
     join private.group_member m on m.group_id = g.id and m.user_id = $1 where g.id = $2`,
    [userId, groupId],
  );
  if (!rows[0]) throw new AppError("group_not_found", 404);
  if (!rows[0].creator) throw new AppError("not_creator", 403);
}

export async function renameGroup(db: Db, userId: string, groupId: string, name: string): Promise<void> {
  await checkCreator(db, userId, groupId);
  try {
    const { rowCount } = await db.query("update private.player_group set name = $3 where id = $2 and creator_id = $1", [userId, groupId, name]);
    if (rowCount === 0) throw new AppError("not_creator", 403);
  } catch (err) {
    throw groupError(err);
  }
}

// A new code, so the old link stops working.
export async function resetGroupInvite(db: Db, userId: string, groupId: string): Promise<string> {
  await checkCreator(db, userId, groupId);
  const { rows } = await db.query<{ code: string }>(
    "update private.player_group set invite_code = $3 where id = $2 and creator_id = $1 returning invite_code as code",
    [userId, groupId, newInviteCode()],
  );
  if (!rows[0]) throw new AppError("not_creator", 403);
  return rows[0].code;
}

// The creator removes another member; leaving is how the creator goes.
export async function removeMember(db: Db, userId: string, groupId: string, username: string): Promise<void> {
  await checkCreator(db, userId, groupId);
  const { rowCount } = await db.query(
    `delete from private.group_member m using private.profile p, private.player_group g
     where g.id = $2 and g.creator_id = $1 and m.group_id = g.id and p.username = $3 and m.user_id = p.user_id and m.user_id <> $1`,
    [userId, groupId, username],
  );
  if (rowCount === 0) throw new AppError("member_not_found", 404);
}

export async function deleteGroup(db: Db, userId: string, groupId: string): Promise<void> {
  await checkCreator(db, userId, groupId);
  const { rowCount } = await db.query("delete from private.player_group where id = $2 and creator_id = $1", [userId, groupId]);
  if (rowCount === 0) throw new AppError("not_creator", 403);
}

// Maps the rule a rejected write broke to the player-facing error; anything else is rethrown as is.
function groupError(err: unknown): unknown {
  if (!(err instanceof DatabaseError)) return err;
  if (err.code === "23514" && err.constraint === "player_group_name_format") return new AppError("group_name_invalid", 400);
  if (err.code === "23505" && err.constraint === "group_member_pkey") return new AppError("already_member", 409);
  if (err.code === "OB009") return new AppError("group_full", 409);
  if (err.code === "OB010") return new AppError("too_many_groups", 409);
  return err;
}
