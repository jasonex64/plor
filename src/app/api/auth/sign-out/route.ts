import { createAuthClient } from "@/lib/auth";
import { checkProtocol, handle } from "@/lib/http";

// signOut() clears the session cookies through setAll; its default scope ends every session of the user.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  return Response.json({ ok: true });
});
