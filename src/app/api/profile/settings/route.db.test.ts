// The player's two settings against the local stack (run with `npm run test:db`;
// docs/milestones/M14-14a-3b-settings.md, criterion 3): off for a new account, set by the signed-in player only, and
// read back where the client reads them, GET /api/profile.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GET as profileRoute, POST as createProfile } from "@/app/api/profile/route";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { POST as settingsRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({ email: `${RUN}-${tag}@example.test`, username: `${tag}${RUN}`, session: new Map<string, string>() });
const A = player("sa");
const B = player("sb");

async function set(body: unknown) {
  const response = await settingsRoute(apiRequest("/api/profile/settings", { method: "POST", body }));
  return { status: response.status, body: await response.json() };
}
async function settings() {
  return (await (await profileRoute(apiRequest("/api/profile", { method: "GET" }))).json()).settings;
}

beforeAll(useLocalStack);

afterAll(async () => {
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await getPool().end();
});

describe("the player's settings", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in two players, whose settings start off", async () => {
    for (const p of [A, B]) {
      p.session = (await signIn(p.email)).session;
      expect((await createProfile(apiRequest("/api/profile", { method: "POST", body: { username: p.username } }))).status).toBe(201);
      expect(await settings()).toEqual({ skipGameScreen: false, calendarNumbers: false });
    }
  });

  it("sets one setting, then the other, keeping the first", async () => {
    useSession(A.session);
    expect(await set({ skipGameScreen: true })).toEqual({
      status: 200,
      body: { ok: true, settings: { skipGameScreen: true, calendarNumbers: false } },
    });
    expect(await set({ calendarNumbers: true })).toEqual({
      status: 200,
      body: { ok: true, settings: { skipGameScreen: true, calendarNumbers: true } },
    });
    expect(await settings()).toEqual({ skipGameScreen: true, calendarNumbers: true });
    expect(await set({ skipGameScreen: false, calendarNumbers: false })).toMatchObject({ status: 200 });
    expect(await settings()).toEqual({ skipGameScreen: false, calendarNumbers: false });
  });

  it("changes only the signed-in player's row", async () => {
    useSession(A.session);
    await set({ skipGameScreen: true });
    useSession(B.session);
    expect(await settings()).toEqual({ skipGameScreen: false, calendarNumbers: false });
  });

  it.each([{}, { skipGameScreen: "yes" }, { calendarNumbers: null }, { theme: "night" }, { skipGameScreen: true, other: true }])(
    "refuses %j with 400 settings_invalid",
    async (body) => {
      useSession(B.session);
      expect(await set(body)).toEqual({ status: 400, body: { ok: false, error: "settings_invalid" } });
      expect(await settings()).toEqual({ skipGameScreen: false, calendarNumbers: false });
    },
  );
});
