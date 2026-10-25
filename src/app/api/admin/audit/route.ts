import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { isAdmin } from "@/insights/queries";
import { decide, listReviews, openCount } from "@/admin/audit";

// The audit of what was learned from misses, for admins only (docs/milestones/M13-13b-learning-from-misses.md):
// signed out → 401, not in private.admin → 403. GET lists every text with the count waiting for review, or only the
// count with ?count (the admin pages' "N to review"); POST decides one text, 409 if the decision doesn't fit its state.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if (!(await isAdmin(db, userId))) throw new AppError("admins_only", 403);
  if (new URL(request.url).searchParams.has("count")) return Response.json({ ok: true, open: await openCount(db, userId) });
  return Response.json({ ok: true, ...(await listReviews(db, userId)) });
});

// The admin is checked before the body is read, so a non-admin learns nothing.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if (!(await isAdmin(db, userId))) throw new AppError("admins_only", 403);
  await decide(db, userId, await readJsonObject(request));
  return Response.json({ ok: true });
});
