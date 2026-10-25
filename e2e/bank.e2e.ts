// The question bank's admin page (docs/milestones/M13-13d-the-question-bank.md): an admin sees each bank question with
// the days it ran, from content/bank.json and the drafted days in content/offbeat; a player who isn't an admin sees the
// refusal. The bank and drafts are the repo's own (T1, 2026-10-24).
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.end();
});

test("an admin sees the bank's questions and the days they ran; a player can't", async ({ browser }) => {
  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/");
  await signInAndPick(admin, "bk");
  await expect(admin.getByRole("button", { name: "Start today's puzzle" }).or(admin.getByText("There's no puzzle today."))).toBeVisible();
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-bk@example.test`]);
  await admin.goto("/admin");
  await admin.getByRole("link", { name: "Question bank" }).click();
  const animal = admin.getByRole("article", { name: "Name an animal" });
  await expect(animal).toContainText("Category animal");
  await expect(animal.getByRole("listitem").filter({ hasText: "2026-10-24" })).toBeVisible();
  await expect(admin.getByRole("region", { name: "Questions" }).getByRole("article")).toHaveCount(7);

  const player = await (await browser.newContext()).newPage();
  await player.goto("/");
  await signInAndPick(player, "bp");
  await expect(player.getByRole("button", { name: "Start today's puzzle" }).or(player.getByText("There's no puzzle today."))).toBeVisible();
  await player.goto("/admin/bank");
  // Exact: the footer's audit link shows the same refusal inside its count for a player.
  await expect(player.getByText("This page is for admins only.", { exact: true })).toBeVisible();
});
