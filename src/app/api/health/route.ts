import { getPool } from "@/lib/db";
import { handle } from "@/lib/http";
import { PROTOCOL_VERSION } from "@/lib/protocol";

export const GET = handle(async () => {
  // A failed query throws; handle() logs it and returns 500, which scripts/status reports as DOWN.
  await getPool().query("select 1");
  return Response.json({ ok: true, protocol: PROTOCOL_VERSION });
});
