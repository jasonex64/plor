// Today's feed against the local stack (run with `npm run test:db`; docs/milestones/M11-home-screen.md, 11b;
// H2, H3). Real players sign in, play today's puzzle and post through the route handlers. V is the viewer; F is V's
// friend; G is in V's group Club but isn't V's friend; O is in Club too, and in Other, which V isn't in.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as postComment } from "@/app/api/comments/route";
import { POST as reportComment } from "@/app/api/comments/report/route";
import { POST as createProfile } from "@/app/api/profile/route";
import { POST as react } from "@/app/api/reactions/route";
import { POST as answerRoute } from "@/app/api/run/answer/route";
import { POST as startRoute } from "@/app/api/run/start/route";
import { type ApprovedPuzzle } from "@/content/puzzle";
import { createGroup, getGroup, joinGroup } from "@/groups/groups";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, hostName, removeFixtures } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET as feedRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({
  email: `${RUN}-${tag}@example.test`,
  username: `${tag}${RUN}`,
  userId: "",
  session: new Map<string, string>(),
});
const V = player("fv");
const F = player("ff");
const G = player("fg");
const O = player("fo");
let today = "";
let puzzle: ApprovedPuzzle;
let club = "";

async function call(route: (r: Request) => Promise<Response>, path: string, method: "GET" | "POST", body?: unknown) {
  const response = await route(apiRequest(path, { method, body }));
  return { status: response.status, body: await response.json() };
}
const feed = () => call(feedRoute, "/api/feed", "GET");
const post = (body: string, group?: string) => call(postComment, "/api/comments", "POST", { date: today, body, group });
type FeedComment = {
  id: string;
  username: string;
  body: string;
  group: { id: string; name: string } | null;
  reactions: { counts: unknown[] };
};

// Question 1 steals no letter (schedule A), so the host answer's name can be typed as is.
async function finishToday() {
  expect((await call(startRoute, "/api/run/start", "POST")).status).toBe(200);
  const text = hostName(puzzle, 0);
  expect((await call(answerRoute, "/api/run/answer", "POST", { index: 0, text })).body.run.status).toBe("died");
}

beforeAll(async () => {
  useLocalStack();
  const { rows } = await getPool().query<{ today: string }>("select private.today()::text as today");
  today = rows[0].today;
  puzzle = await ensurePuzzle(today);
});

afterAll(async () => {
  // Deleting the auth users cascades to memberships, runs, comments and reactions, and the last member's going deletes
  // each group; then the fixture puzzle goes.
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removeFixtures();
  await getPool().end();
});

describe("today's feed", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in four players; F posts in the friends thread, G in Club, O in Other and the friends thread; O reacts in Club", async () => {
    for (const p of [V, F, G, O]) {
      p.session = (await signIn(p.email)).session;
      expect((await call(createProfile, "/api/profile", "POST", { username: p.username })).status).toBe(201);
      const { rows } = await getPool().query<{ id: string }>("select id from auth.users where email = $1", [p.email]);
      p.userId = rows[0].id;
    }
    await getPool().query(
      "insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))",
      [V.userId, F.userId],
    );
    club = (await createGroup(getPool(), V.userId, "Club")).id;
    const code = (await getGroup(getPool(), V.userId, club)).inviteCode;
    await joinGroup(getPool(), G.userId, code);
    await joinGroup(getPool(), O.userId, code);
    const other = (await createGroup(getPool(), O.userId, "Other")).id;

    useSession(F.session);
    await finishToday();
    expect((await post("friends words from f")).status).toBe(201);
    useSession(G.session);
    await finishToday();
    const gComment = (await post("club words from g", club)).body.comment.id;
    useSession(O.session);
    await finishToday();
    expect((await post("other words from o", other)).status).toBe(201);
    expect((await post("friends words from o")).status).toBe(201);
    expect(
      (await call(react, "/api/reactions", "POST", { date: today, target: { type: "comment", id: gComment }, emoji: "😂" })).status,
    ).toBe(200);
  });

  it("shows only who commented and how many reactions until the viewer's run is over, and no text (H3)", async () => {
    useSession(V.session);
    const r = await feed();
    expect(r).toEqual({
      status: 200,
      body: {
        ok: true,
        // F is named, being V's friend; G, who isn't, is counted (G3). O's comments are in threads V can't see, so V will
        // read 2 comments. The one reaction is O's on G's comment, O being a member of Club.
        feed: { date: today, canPost: false, comments: null, preview: { friends: [F.username], others: 1, count: 2, reactions: 1 } },
      },
    });
    expect(JSON.stringify(r.body)).not.toMatch(/words/);
  });

  it("then shows today's comments from the friends thread and V's groups, each labelled, oldest first (H2)", async () => {
    useSession(V.session);
    await finishToday();
    const r = await feed();
    expect(r.body.feed).toMatchObject({ date: today, canPost: true, preview: null });
    const comments: FeedComment[] = r.body.feed.comments;
    expect(comments.map((c) => [c.body, c.group])).toEqual([
      ["friends words from f", null],
      ["club words from g", { id: club, name: "Club" }],
    ]);
    expect(comments[1].reactions.counts).toEqual([{ emoji: "😂", count: 1 }]);

    // V's own post goes to the friends thread, and shows there.
    expect((await post("friends words from v")).status).toBe(201);
    expect(((await feed()).body.feed.comments as FeedComment[]).map((c) => [c.body, c.group])).toEqual([
      ["friends words from f", null],
      ["club words from g", { id: club, name: "Club" }],
      ["friends words from v", null],
    ]);
  });

  it("leaves out a comment the viewer reported (M08 D5)", async () => {
    useSession(V.session);
    const gComment = ((await feed()).body.feed.comments as FeedComment[]).find((c) => c.username === G.username)!;
    expect((await call(reportComment, "/api/comments/report", "POST", { id: gComment.id })).status).toBe(200);
    expect(((await feed()).body.feed.comments as FeedComment[]).map((c) => c.body)).toEqual([
      "friends words from f",
      "friends words from v",
    ]);
  });
});
