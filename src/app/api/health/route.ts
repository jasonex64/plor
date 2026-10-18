import { connection } from "next/server";
import { PROTOCOL_VERSION } from "@/lib/protocol";

export async function GET() {
  // With Cache Components, a GET handler that touches no runtime data is prerendered at
  // build time and would report healthy even when the server is down. connection() forces
  // request-time execution (node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md).
  await connection();
  return Response.json({ ok: true, protocol: PROTOCOL_VERSION });
}
