// The answer database's admin page (docs/milestones/M13-13a-the-base.md; human, 2026-10-24: "Search and browse
// (Recommended)"): an admin looks a thing up by any alias and sees its names, facts and categories; a player who
// isn't an admin sees the refusal. The things are a fixture in a test source ID range, removed afterwards.
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
const id = (n: string) => `e2e-${RUN}-${n}`;
// A category key is letters and underscores (migration 20261024095732_answer_base.sql).
const KEY = `endtoend_${RUN.replace(/[0-9]/g, (d) => "abcdefghij"[Number(d)])}`;

test.beforeAll(async () => {
  await DB.query("select private.import_source('wikidata', $1, $2::jsonb)", [
    `e2e-${RUN}`,
    JSON.stringify([
      { id: id("root"), name: "e2e root", aliases: [{ alias: `e2e root ${RUN}`, kind: "name" }] },
      { id: id("leaf"), name: `Leaf ${RUN}`, aliases: [{ alias: `leaf ${RUN}`, kind: "name" }, { alias: `foliage ${RUN}`, kind: "synonym" }], kind_of: [id("root")] },
    ]),
  ]);
  await DB.query("select private.define_category($1, 'e2e category', 'wikidata', $2, null)", [KEY, id("root")]);
});

test.afterAll(async () => {
  await DB.query("delete from private.category where key = $1", [KEY]);
  await DB.query("delete from private.thing where id in (select thing_id from private.thing_source where source_id like $1)", [`e2e-${RUN}-%`]);
  await DB.query("delete from private.base_log where detail->>'snapshot' = $1 or detail->>'key' = $2", [`e2e-${RUN}`, KEY]);
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.end();
});

test("an admin looks a thing up by an alias; a player can't", async ({ browser }) => {
  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/");
  await signInAndPick(admin, "ab");
  await expect(admin.getByRole("link", { name: "Play", exact: true }).or(admin.getByText("There's no puzzle today."))).toBeVisible();
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-ab@example.test`]);
  await admin.goto("/admin/base");
  await admin.getByLabel("Name or alias").fill(`Foliage ${RUN}`);
  await admin.getByRole("button", { name: "Look up" }).click();
  const thing = admin.getByRole("article", { name: `Leaf ${RUN}` });
  await expect(thing.getByText(`Categories: ${KEY}`)).toBeVisible();
  await expect(thing.getByText("Facts: kind of e2e root")).toBeVisible();
  await admin.getByLabel("Name or alias").fill(`nothing ${RUN}`);
  await admin.getByRole("button", { name: "Look up" }).click();
  await expect(admin.getByText("Nothing goes by that name.")).toBeVisible();

  const player = await (await browser.newContext()).newPage();
  await player.goto("/");
  await signInAndPick(player, "pb");
  await player.goto("/admin/base");
  await player.getByLabel("Name or alias").fill(`leaf ${RUN}`);
  await player.getByRole("button", { name: "Look up" }).click();
  await expect(player.getByText("This page is for admins only.")).toBeVisible();
});
