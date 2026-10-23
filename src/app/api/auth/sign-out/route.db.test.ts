// Signing out against the local stack (run with `npm run test:db`; docs/milestones/M12-account.md, 12b, A3): it ends
// this device's session only. A signed-out access token stays valid until it expires (Auth checks it by signature), so
// the test counts the player's sessions in Auth itself: a global sign-out would end both.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { POST as signOut } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const email = `${Date.now().toString(36)}-out@example.test`;
const sessions = async () =>
  (await getPool().query("select from auth.sessions s join auth.users u on u.id = s.user_id where u.email = $1", [email])).rows.length;

beforeAll(useLocalStack);

afterAll(async () => {
  await getPool().query("delete from auth.users where email = $1", [email]);
  await getPool().end();
});

describe("POST /api/auth/sign-out", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("ends this device's session and leaves the player's other one (A3)", async () => {
    const laptop = (await signIn(email)).session;
    await signIn(email);
    expect(await sessions()).toBe(2);
    useSession(laptop);
    expect((await signOut(apiRequest("/api/auth/sign-out", { method: "POST" }))).status).toBe(200);
    expect(await sessions()).toBe(1);
  });
});
