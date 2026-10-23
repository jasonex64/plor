// Changing a username against the local stack (run with `npm run test:db`; docs/milestones/M12-account.md, 12b, A2):
// once every 30 days, the first change at once, the old name free for anyone straight away.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GET as accountRoute } from "@/app/api/account/route";
import { POST as createProfile } from "@/app/api/profile/route";
import { USERNAME_CHANGE_DAYS } from "@/config/tunables";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { POST as changeRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({ email: `${RUN}-${tag}@example.test`, username: `${tag}${RUN}`, session: new Map<string, string>() });
const A = player("ua");
const B = player("ub");
const C = player("uc");
const DAY_MS = 24 * 60 * 60 * 1000;

async function change(username: unknown) {
  const response = await changeRoute(apiRequest("/api/profile/username", { method: "POST", body: { username } }));
  return { status: response.status, body: await response.json() };
}
async function account() {
  return (await (await accountRoute(apiRequest("/api/account", { method: "GET" }))).json()).account;
}

beforeAll(useLocalStack);

afterAll(async () => {
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await getPool().end();
});

describe("changing a username", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in three players with usernames", async () => {
    for (const p of [A, B, C]) {
      p.session = (await signIn(p.email)).session;
      expect((await createProfile(apiRequest("/api/profile", { method: "POST", body: { username: p.username } }))).status).toBe(201);
    }
  });

  it("changes a username at once the first time, and says when it may change again", async () => {
    useSession(A.session);
    expect((await account()).usernameChangeableAt).toBeNull();
    const before = Date.now();
    expect(await change(`ua2${RUN}`)).toEqual({ status: 200, body: { ok: true, username: `ua2${RUN}` } });
    const after = await account();
    expect(after.username).toBe(`ua2${RUN}`);
    // 30 days from the change, within the seconds this test took.
    const next = new Date(after.usernameChangeableAt).getTime();
    expect(next).toBeGreaterThanOrEqual(before + USERNAME_CHANGE_DAYS * DAY_MS - 60_000);
    expect(next).toBeLessThanOrEqual(Date.now() + USERNAME_CHANGE_DAYS * DAY_MS + 60_000);
  });

  it("frees the old username for anyone at once", async () => {
    useSession(B.session);
    expect(await change(A.username)).toEqual({ status: 200, body: { ok: true, username: A.username } });
  });

  it("refuses a second change within 30 days", async () => {
    useSession(A.session);
    expect(await change(`ua3${RUN}`)).toEqual({ status: 409, body: { ok: false, error: "username_change_too_soon" } });
    expect((await account()).username).toBe(`ua2${RUN}`);
  });

  it("refuses a taken or invalid username, which leaves the next change free", async () => {
    useSession(C.session);
    expect(await change(`ua2${RUN}`)).toEqual({ status: 409, body: { ok: false, error: "username_taken" } });
    expect(await change("Not Valid")).toEqual({ status: 400, body: { ok: false, error: "username_invalid" } });
    expect(await change(7)).toEqual({ status: 400, body: { ok: false, error: "username_invalid" } });
    expect(await account()).toMatchObject({ username: C.username, usernameChangeableAt: null });
  });
});
