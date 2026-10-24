// Deleting your own account against the local stack (run with `npm run test:db`; docs/milestones/M12-account.md, 12c:
// A4, A7, A9): the typed username must be the player's own, and the deletion signs this device out.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest, cookieJar } from "@/test/request-scope";
import { POST as deleteRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const email = `${RUN}-del@example.test`;
const username = `del${RUN}`;
let session = new Map<string, string>();

async function remove(body: unknown) {
  const response = await deleteRoute(apiRequest("/api/account/delete", { method: "POST", body }));
  return { status: response.status, body: await response.json() };
}
const users = async () => (await getPool().query("select from auth.users where email = $1", [email])).rows.length;

beforeAll(useLocalStack);

afterAll(async () => {
  await getPool().query("delete from auth.users where email = $1", [email]);
  await getPool().end();
});

describe("POST /api/account/delete", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in a player with a username", async () => {
    session = (await signIn(email)).session;
    expect((await createProfile(apiRequest("/api/profile", { method: "POST", body: { username } }))).status).toBe(201);
  });

  it("refuses a signed-out request", async () => {
    useSession(new Map());
    expect(await remove({ username })).toEqual({ status: 401, body: { ok: false, error: "not_signed_in" } });
  });

  it("refuses any username but the player's own, and deletes nothing", async () => {
    useSession(session);
    for (const typed of [`other${RUN}`, username.toUpperCase(), "", 7, undefined]) {
      expect(await remove({ username: typed })).toEqual({ status: 400, body: { ok: false, error: "username_mismatch" } });
    }
    expect(await users()).toBe(1);
  });

  it("deletes the account with the player's own username and signs this device out (A9 (a))", async () => {
    useSession(session);
    expect([...cookieJar.keys()].some((name) => name.startsWith("sb-"))).toBe(true);
    expect(await remove({ username })).toEqual({ status: 200, body: { ok: true } });
    expect(await users()).toBe(0);
    expect([...cookieJar.keys()].filter((name) => name.startsWith("sb-"))).toEqual([]);
  });
});
