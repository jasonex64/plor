import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle } from "@/lib/http";
import { allTimePoints } from "@/game/ledger";
import { getProfile } from "@/lib/profile";

// The signed-in player's account page (docs/milestones/M12-account.md, 12a; A1): their username, display name and
// all-time points. Reading it settles their finished runs on closed days first (M09 D3, D10).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const profile = await getProfile(getPool(), userId);
  if (!profile) throw new AppError("no_profile", 409);
  return Response.json({ ok: true, account: { ...profile, allTimePoints: await allTimePoints(getPool(), userId) } });
});
