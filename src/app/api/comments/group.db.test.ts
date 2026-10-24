// Group threads end to end against the local stack (run with `npm run test:db`; docs/milestones/M10-groups.md, 10d):
// real players sign in, play today's puzzle, and post, read, react and report through the route handlers. A creates
// Club, which B joins, and Other, which no one else is in; C is A's friend and in neither; A and B aren't friends.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createGroup } from "@/app/api/groups/create/route";
import { GET as groupDetail } from "@/app/api/groups/detail/route";
import { POST as joinGroup } from "@/app/api/groups/join/route";
import { POST as removeMember } from "@/app/api/groups/remove/route";
import { POST as createProfile } from "@/app/api/profile/route";
import { POST as reactRoute } from "@/app/api/reactions/route";
import { POST as answerRoute } from "@/app/api/run/answer/route";
import { POST as startRoute } from "@/app/api/run/start/route";
import { listReports } from "@/admin/reports";
import { GAME_ID, type ApprovedPuzzle } from "@/content/puzzle";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, hostName, removeCreatedPuzzles } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { POST as deleteRoute } from "./delete/route";
import { POST as reportRoute } from "./report/route";
import { GET as threadRoute, POST as postRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({
  email: `${RUN}-${tag}@example.test`,
  username: `${tag}${RUN}`,
  userId: "",
  session: new Map<string, string>(),
});
const A = player("ta");
const B = player("tb");
const C = player("tc");
let today = "";
let yesterday = "";
let puzzle: ApprovedPuzzle;
let club = "";
let other = "";

async function call(route: (r: Request) => Promise<Response>, path: string, method: "GET" | "POST", body?: unknown) {
  const response = await route(apiRequest(path, { method, body }));
  return { status: response.status, body: await response.json() };
}
type Comment = { id: string; username: string; body: string; reactions: { counts: { emoji: string; count: number }[] } };
const thread = (query = "") => call(threadRoute, `/api/comments${query}`, "GET");
const comments = async (query = ""): Promise<Comment[]> => (await thread(query)).body.thread.comments;
const bodies = async (query = "") => (await comments(query)).map((c) => c.body);
const post = (body: string, group?: unknown, date = today) => call(postRoute, "/api/comments", "POST", { date, body, group });
const react = (id: string, emoji: string) =>
  call(reactRoute, "/api/reactions", "POST", { date: today, target: { type: "comment", id }, emoji });
const notFound = { status: 404, body: { ok: false, error: "group_not_found" } };

// Question 1 steals no letter (schedule A), so the host answer's name can be typed as is.
async function finishToday() {
  expect((await call(startRoute, "/api/run/start", "POST")).status).toBe(200);
  const text = hostName(puzzle, 0);
  expect((await call(answerRoute, "/api/run/answer", "POST", { index: 0, text })).body.run.status).toBe("died");
}

beforeAll(async () => {
  useLocalStack();
  const { rows } = await getPool().query<{ today: string; yesterday: string }>(
    "select private.today()::text as today, (private.today() - 1)::text as yesterday",
  );
  ({ today, yesterday } = rows[0]);
  puzzle = await ensurePuzzle(today);
});

afterAll(async () => {
  // Deleting the auth users cascades to memberships, runs, comments and reactions, and the last member's going deletes
  // each group; then the fixture puzzle goes.
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removeCreatedPuzzles();
  await getPool().end();
});

describe("a group's thread", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in three players; A makes Club, which B joins, and Other; A and C are friends", async () => {
    for (const p of [A, B, C]) {
      p.session = (await signIn(p.email)).session;
      expect((await call(createProfile, "/api/profile", "POST", { username: p.username })).status).toBe(201);
      const { rows } = await getPool().query<{ id: string }>("select id from auth.users where email = $1", [p.email]);
      p.userId = rows[0].id;
    }
    useSession(A.session);
    club = (await call(createGroup, "/api/groups/create", "POST", { name: "Club" })).body.group.id;
    other = (await call(createGroup, "/api/groups/create", "POST", { name: "Other" })).body.group.id;
    const code = (await call(groupDetail, `/api/groups/detail?id=${club}`, "GET")).body.group.inviteCode;
    useSession(B.session);
    expect((await call(joinGroup, "/api/groups/join", "POST", { code })).status).toBe(200);
    await getPool().query(
      "insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))",
      [A.userId, C.userId],
    );
  });

  it("hides today's group thread, and refuses a post to it, until the member's run is over (G4, M08)", async () => {
    useSession(B.session);
    expect(await thread(`?group=${club}`)).toEqual({
      status: 200,
      body: { ok: true, thread: { date: today, canPost: false, comments: null } },
    });
    expect(await post("too early", club)).toEqual({ status: 409, body: { ok: false, error: "not_finished" } });
  });

  it("gives the members one shared thread, apart from the friends thread and other groups' (G4, G9)", async () => {
    useSession(A.session);
    await finishToday();
    expect((await post("club from a", club)).status).toBe(201);
    expect((await post("other from a", other)).status).toBe(201);
    expect((await post("friends from a")).status).toBe(201);
    useSession(B.session);
    await finishToday();
    expect((await post("club from b", club)).status).toBe(201);
    useSession(C.session);
    await finishToday();
    expect((await post("friends from c")).status).toBe(201);

    // B isn't A's friend, and sees A's comment in Club.
    useSession(B.session);
    expect(await thread(`?group=${club}`)).toMatchObject({ status: 200, body: { thread: { date: today, canPost: true } } });
    expect(await bodies(`?group=${club}`)).toEqual(["club from a", "club from b"]);
    expect(await bodies()).toEqual([]);
    useSession(A.session);
    expect(await bodies(`?group=${club}`)).toEqual(["club from a", "club from b"]);
    expect(await bodies(`?group=${other}`)).toEqual(["other from a"]);
    expect(await bodies()).toEqual(["friends from a", "friends from c"]);
    // C, A's friend, sees A's friends-thread comment but none of A's group comments.
    useSession(C.session);
    expect(await bodies()).toEqual(["friends from a", "friends from c"]);
  });

  it("refuses a non-member and an ID that isn't a group with the group page's 404", async () => {
    useSession(C.session);
    expect(await thread(`?group=${club}`)).toEqual(notFound);
    expect(await post("let me in", club)).toEqual(notFound);
    expect(await thread("?group=not-a-group")).toEqual(notFound);
    expect(await post("hi", 7)).toEqual(notFound);
    expect(await thread("?group=00000000-0000-0000-0000-000000000001")).toEqual(notFound);
  });

  it("keeps past days read-only (M08 D6)", async () => {
    useSession(A.session);
    expect(await thread(`?group=${club}&date=${yesterday}`)).toEqual({
      status: 200,
      body: { ok: true, thread: { date: yesterday, canPost: false, comments: [] } },
    });
    expect(await post("late", club, yesterday)).toEqual({ status: 409, body: { ok: false, error: "day_past" } });
  });

  it("counts members' reactions on a group comment, and refuses a non-member's (G4)", async () => {
    useSession(A.session);
    const aComment = (await comments(`?group=${club}`))[0];
    useSession(B.session);
    expect((await react(aComment.id, "👍")).status).toBe(200);
    useSession(C.session);
    expect(await react(aComment.id, "😂")).toEqual({ status: 404, body: { ok: false, error: "comment_not_found" } });
    // Even a reaction written by someone outside the group doesn't count there.
    await getPool().query(
      "insert into private.reaction (user_id, game_id, puzzle_date, comment_id, emoji) values ($1, $2, $3::date, $4, '😂')",
      [C.userId, GAME_ID, today, aComment.id],
    );
    useSession(A.session);
    expect((await comments(`?group=${club}`))[0].reactions.counts).toEqual([{ emoji: "👍", count: 1 }]);
  });

  it("lets a member report another's comment, hiding it from them alone, and refuses a non-member (M08 D5)", async () => {
    useSession(A.session);
    const bComment = (await comments(`?group=${club}`))[1];
    useSession(C.session);
    expect(await call(reportRoute, "/api/comments/report", "POST", { id: bComment.id })).toEqual({
      status: 404,
      body: { ok: false, error: "comment_not_found" },
    });
    useSession(A.session);
    expect((await call(reportRoute, "/api/comments/report", "POST", { id: bComment.id })).status).toBe(200);
    expect(await bodies(`?group=${club}`)).toEqual(["club from a"]);
    useSession(B.session);
    expect(await bodies(`?group=${club}`)).toEqual(["club from a", "club from b"]);
    // Admins see it on the reported-comments page like any other (8c).
    expect((await listReports(getPool())).filter((r) => r.id === bComment.id).map((r) => [r.body, r.reports])).toEqual([
      ["club from b", 1],
    ]);
  });

  it("lets a member delete their own group comment, for everyone, and no one else's (M08 D4)", async () => {
    useSession(B.session);
    expect((await post("delete me", club)).status).toBe(201);
    const mine = (await comments(`?group=${club}`)).find((c) => c.body === "delete me")!;
    useSession(A.session);
    expect(await call(deleteRoute, "/api/comments/delete", "POST", { id: mine.id })).toEqual({
      status: 404,
      body: { ok: false, error: "comment_not_found" },
    });
    useSession(B.session);
    expect((await call(deleteRoute, "/api/comments/delete", "POST", { id: mine.id })).status).toBe(200);
    expect(await bodies(`?group=${club}`)).toEqual(["club from a", "club from b"]);
    useSession(A.session);
    expect(await bodies(`?group=${club}`)).toEqual(["club from a"]);
  });

  it("takes a removed member's comments and reactions out of the thread (G6)", async () => {
    useSession(A.session);
    expect((await call(removeMember, "/api/groups/remove", "POST", { id: club, username: B.username })).status).toBe(200);
    const left = await comments(`?group=${club}`);
    expect(left.map((c) => c.body)).toEqual(["club from a"]);
    expect(left[0].reactions.counts).toEqual([]);
    useSession(B.session);
    expect(await thread(`?group=${club}`)).toEqual(notFound);
  });
});
