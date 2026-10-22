// The live board with two real browsers (docs/milestones/M07-friends-and-live-board.md, 7c): two players sign in
// with emailed codes, become friends through an invite link, and one sees the other's run change without reloading.
// A second test restarts Realtime and checks that the page refetches the board with reason=reconnect.
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
const MAILPIT = "http://127.0.0.1:54324";
const RUN = Date.now().toString(36);
let createdPuzzle: string | null = null;
let hostAnswer = "";

test.beforeAll(async () => {
  // Today's puzzle, or a fixture under today's date (removed in afterAll), as in src/test/puzzles.ts.
  const { rows } = await DB.query<{ today: string; content: { questions: { host_answers: string[]; entries: { id: string; name: string }[] }[] } | null }>(
    "select private.today()::text as today, (select content from private.puzzle where game_id = 'offbeat' and puzzle_date = private.today()) as content",
  );
  let content = rows[0].content;
  if (!content) {
    content = { ...JSON.parse(readFileSync("content/offbeat/2026-10-26.json", "utf8")), date: rows[0].today };
    await DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('offbeat', $1::date, $2)", [rows[0].today, content]);
    createdPuzzle = rows[0].today;
  }
  // Question 1 steals no letter (schedule A), so the host answer's name can be typed as is.
  const q = content!.questions[0];
  hostAnswer = q.entries.find((e) => e.id === q.host_answers[0])!.name;
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  if (createdPuzzle) await DB.query("delete from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date", [createdPuzzle]);
  await DB.end();
});

async function emailedCode(email: string): Promise<string> {
  let code: string | undefined;
  await expect
    .poll(async () => {
      const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)).json();
      if (!list.messages?.length) return false;
      const message = await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json();
      code = /<strong>(\d+)<\/strong>/.exec(message.HTML)?.[1];
      return Boolean(code);
    })
    .toBe(true);
  return code!;
}

// Signs in on the page it's on (home or an invite link) and picks a username.
async function signInAndPick(page: Page, name: string): Promise<void> {
  const email = `${RUN}-${name}@example.test`;
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in code" }).click();
  await page.getByLabel("Code").fill(await emailedCode(email));
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByLabel("Username").fill(`${name}${RUN}`);
  await page.getByRole("button", { name: "Save" }).click();
}

// Opens the home page and waits until its board channel has joined (Realtime replies ok to the join).
async function openBoard(page: Page): Promise<void> {
  // The dev server's hot-reload socket opens too; only Realtime's counts.
  const joined = page.waitForEvent("websocket", (ws) => ws.url().includes("/realtime/v1")).then((ws) =>
    ws.waitForEvent("framereceived", { predicate: (f) => String(f.payload).includes("phx_reply") && String(f.payload).includes('"status":"ok"') && String(f.payload).includes("board:") }),
  );
  await page.goto("/");
  await joined;
}

test("a friend's run shows up live, with no spoiler", async ({ browser }) => {
  const watcher = await (await browser.newContext()).newPage();
  const player = await (await browser.newContext()).newPage();
  const watcherName = `w${RUN}`;
  const playerName = `p${RUN}`;

  await watcher.goto("/");
  await signInAndPick(watcher, "w");
  await watcher.getByRole("button", { name: "Make my invite link" }).click();
  const link = await watcher.locator("code").filter({ hasText: "/invite/" }).textContent();

  await player.goto(new URL(link!).pathname);
  await signInAndPick(player, "p");
  await expect(player.getByRole("heading", { name: `Add ${watcherName} as a friend?` })).toBeVisible();
  await player.getByRole("button", { name: "Add friend" }).click();
  await expect(player.getByRole("heading", { name: `You and ${watcherName} are now friends.` })).toBeVisible();

  await openBoard(watcher);
  const row = watcher.getByRole("region", { name: "Friends today" }).getByRole("listitem").filter({ hasText: playerName });
  await expect(row).toHaveText(`${playerName}: hasn't played yet`);

  // The player starts and is caught on question 1; the watcher's page changes without a reload.
  await player.goto("/");
  await player.getByRole("button", { name: "Start today's puzzle" }).click();
  await expect(row).toHaveText(`${playerName}: on question 1`);
  await player.getByLabel("Your answer").fill(hostAnswer);
  await player.getByRole("button", { name: "Answer" }).click();
  // The watcher hasn't played, so how the run ended stays hidden.
  await expect(row).toHaveText(`${playerName}: finished (you'll see how once you finish)`);
  await expect(row).not.toContainText(hostAnswer);
});

// Browser offline emulation left the Realtime socket open (tried twice, 2026-10-22), so the server end is restarted
// instead, as a Realtime restart or deploy would do to players. The local container restarts in about 2 s.
test("a reconnect refetches the board", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "r");
  await openBoard(page);
  const refetch = page.waitForRequest((r) => r.url().includes("/api/board?reason=reconnect"));
  execSync("docker restart supabase_realtime_plor", { stdio: "ignore" });
  await refetch;
});
