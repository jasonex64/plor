import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { isAdmin } from "@/insights/queries";
import { edit, listRows, listView } from "@/admin/lists";
import { STATUS } from "@/lib/status";

// The researched lists an admin reviews (docs/milestones/M23-23b-research-and-review.md, 23b-2): signed out → 401, not
// in private.admin → 403. GET lists every list with its counts, or with ?category=<key> one list's answers with the
// admin's edits in; POST strikes, undoes a strike, adds an answer or marks a list seen, 409 if the edit doesn't fit the list.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if (!(await isAdmin(db, userId))) throw new AppError("admins_only", STATUS.forbidden);
  const category = new URL(request.url).searchParams.get("category");
  if (category !== null) return Response.json({ ok: true, ...(await listView(db, userId, category)) });
  return Response.json({ ok: true, lists: await listRows(db, userId) });
});

// The admin is checked before the body is read, so a non-admin learns nothing.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if (!(await isAdmin(db, userId))) throw new AppError("admins_only", STATUS.forbidden);
  await edit(db, userId, await readJsonObject(request));
  return Response.json({ ok: true });
});
