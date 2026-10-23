import { createAuthClient } from "@/lib/auth";
import { checkProtocol, handle } from "@/lib/http";

// signOut() clears the session cookies through setAll. Its scope is this device's session only (docs/milestones/
// M12-account.md, A3): Supabase's default, "global", would sign the player out on every device.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
  return Response.json({ ok: true });
});
