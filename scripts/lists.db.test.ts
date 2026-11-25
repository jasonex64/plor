// A list's review edits and the load (docs/milestones/M23-23b-research-and-review.md, 23b-2 criteria 4 and 5), against the
// local stack (run with `npm run test:db`): a load after a fold marks the edits the files now hold as folded and leaves
// the rest, the load warns of an edit the files lack, and the hosted check lists it and the hosted load refuses. Its
// own small category, loaded in committed transactions and taken out again, with every row an edit made.
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { foldList } from "../src/content/list-edits.ts";
import type { ResearchList } from "../src/content/list.ts";
import { hostedCheck, hostedLoad, loadResearch, readEdits } from "./base.ts";
import { localStack } from "./slot.ts";

const KEY = "ls_demo";
const SNAPSHOT = "ls-test";
const db = new pg.Client({ connectionString: localStack().databaseUrl });
const list = (...names: string[]): ResearchList => ({ format: 1, category: KEY, passes: 2, borderline_seen: null, answers: names.map((name) => ({ name, aliases: [], tier: "common" as const })) });
let admin = "";

const mine = async () => (await readEdits(db)).filter((e) => e.category === KEY);
const logged = () => vi.spyOn(console, "log").mockImplementation(() => {});

async function clean(): Promise<void> {
  // The things an add made go with their edit rows (list_edit.thing_id cascades from the thing).
  await db.query("delete from private.thing where id in (select thing_id from private.list_edit where category = $1)", [KEY]);
  await db.query("delete from private.list_edit where category = $1", [KEY]);
  await db.query("delete from private.list_seen where category = $1", [KEY]);
  await db.query("delete from private.category where key = $1", [KEY]);
  await db.query("delete from private.thing where id in (select thing_id from private.thing_source where source = 'research' and split_part(source_id, '/', 1) = $1)", [KEY]);
  await db.query("delete from private.base_log where (action = 'import' and detail ->> 'snapshot' = $1) or (action = 'define_category' and detail ->> 'key' = $2) or (action = 'list' and detail ->> 'category' = $2)", [SNAPSHOT, KEY]);
}

beforeAll(async () => {
  await db.connect();
  await clean();
  const { rows } = await db.query<{ id: string }>("insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id::text", [`lists-${Date.now()}@example.test`]);
  admin = rows[0].id;
  await db.query("insert into private.admin (user_id) values ($1)", [admin]);
});
afterAll(async () => {
  await clean();
  await db.query("delete from auth.users where id = $1", [admin]);
  await db.end();
});
beforeEach(async () => {
  await clean();
  await loadResearch(db, [list("alpha", "beta")], SNAPSHOT);
  await db.query("select private.define_category($1, 'demo', 'research', $1, null)", [KEY]);
  await db.query("select private.list_strike($1, $2, 'alpha')", [admin, KEY]);
  await db.query("select private.list_add($1, $2, 'Gamma Ray', 'gamma ray')", [admin, KEY]);
});

describe("a load after the edits", () => {
  it("marks the edits the files now hold as folded, and leaves the ones they don't", async () => {
    const edits = await mine();
    expect(edits.map((e) => `${e.kind} ${e.name}`)).toEqual(["strike alpha", "add Gamma Ray"]);
    // The strike is in the file (alpha is gone), the add is not yet.
    const log = logged();
    try {
      await loadResearch(db, [list("beta")], SNAPSHOT);
      expect((await mine()).map((e) => `${e.kind} ${e.name}`)).toEqual(["add Gamma Ray"]);
      expect(log.mock.calls.map((c) => c[0]).join("\n")).toContain("FOLDED 1 list edits the files now hold");
      expect(log.mock.calls.map((c) => c[0]).join("\n")).toMatch(/UNFOLDED 1 list edits.*add ls_demo: Gamma Ray/);
    } finally {
      log.mockRestore();
    }
  });

  it("marks every edit folded after the fold, and ends the added answer's own thing, which the file's line replaces", async () => {
    const log = logged();
    try {
      const folded = foldList(list("alpha", "beta"), await mine(), null);
      expect(folded.answers.map((a) => a.name)).toEqual(["beta", "Gamma Ray"]);
      await loadResearch(db, [folded], SNAPSHOT);
      expect(await mine()).toEqual([]);
      const { rows } = await db.query<{ n: number }>("select count(*)::int as n from private.list_edit where category = $1 and folded_at is not null", [KEY]);
      expect(rows[0].n).toBe(2);
      // Gamma Ray is now a member through its file line, and the edit's own thing stops being an answer at midnight.
      const { rows: ends } = await db.query<{ ends: string | null }>(
        "select a.removed_at is not null as ends from private.list_edit e join private.thing_alias a on a.thing_id = e.thing_id where e.category = $1 and e.kind = 'add'", [KEY]);
      expect(ends.every((r) => r.ends)).toBe(true);
    } finally {
      log.mockRestore();
    }
  });

  it("leaves another category's edits alone when it loads only some lists", async () => {
    const log = logged();
    try {
      await loadResearch(db, [{ ...list("beta"), category: "ls_other" }], SNAPSHOT);
      expect((await mine()).map((e) => e.kind)).toEqual(["strike", "add"]);
    } finally {
      log.mockRestore();
      await db.query("delete from private.thing where id in (select thing_id from private.thing_source where source = 'research' and split_part(source_id, '/', 1) = 'ls_other')");
    }
  });
});

describe("the hosted check and load", () => {
  it("the check lists an edit the files lack, and the load refuses it before anything is written", async () => {
    const log = logged();
    try {
      // The files still have alpha and lack Gamma Ray: neither edit is in them.
      await hostedCheck(db, "127.0.0.1", [list("alpha", "beta")]);
      expect(log.mock.calls.map((c) => c[0]).join("\n")).toContain("LIST EDITS NOT IN THE FILES: 2 (strike ls_demo: alpha; add ls_demo: Gamma Ray)");
      const before = (await db.query("select count(*)::int as n from private.thing")).rows[0].n;
      await expect(hostedLoad(db, "127.0.0.1", async () => "127.0.0.1", [list("alpha", "beta")])).rejects.toThrow(
        /2 list edits made on the site aren't in content\/lists yet \(strike ls_demo: alpha; add ls_demo: Gamma Ray\).*npm run lists -- fold.*nothing was written/);
      expect((await db.query("select count(*)::int as n from private.thing")).rows[0].n).toBe(before);
    } finally {
      log.mockRestore();
    }
  });

  it("asks for nothing once the files hold the edits", async () => {
    const log = logged();
    try {
      await hostedCheck(db, "127.0.0.1", [foldList(list("alpha", "beta"), await mine(), null)]);
      expect(log.mock.calls.map((c) => c[0]).join("\n")).toContain("LIST EDITS NOT IN THE FILES: 0");
    } finally {
      log.mockRestore();
    }
  });
});
