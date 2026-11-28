// The drafting script's database step against the local stack (run with `npm run test:db`): a day on a clock, built from the
// lists last asked longest ago (docs/milestones/M23-23e-drafting-and-approving.md, 23e-1).
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { draftClock } from "./draft.ts";
import { localStack } from "./slot.ts";

const db = new pg.Client({ connectionString: localStack().databaseUrl });

beforeAll(async () => {
  await db.connect();
});
afterAll(async () => {
  await db.end();
});

describe("draftClock", () => {
  const rare = Array.from({ length: 8 }, (_, i) => ({ name: `odd ${i}`, aliases: [], tier: "rare" as const }));
  const list = (category: string) => ({ format: 1 as const, category, passes: 2 as const, borderline_seen: null, answers: [{ name: "plain", aliases: [], tier: "common" as const }, ...rare] });
  const source = { lists: ["alpha", "beta", "gamma", "delta", "eps", "zeta"].map(list), prompts: new Map(["alpha", "beta", "gamma", "delta", "eps", "zeta"].map((c) => [c, `Name an ${c}`])) };
  const approve = (date: string, category: string) =>
    db.query("insert into private.puzzle (game_id, puzzle_date, content) values ('offbeat', $1::date, $2)", [date, { format: 4, questions: [{ category }] }]);
  const farFuture = "2031-01-";

  it("takes the three lists last asked longest ago, from approved days, and says how long ago each was", async () => {
    await db.query("begin");
    try {
      await approve(`${farFuture}01`, "alpha");
      await approve(`${farFuture}05`, "beta");
      await approve(`${farFuture}10`, "gamma");
      await approve(`${farFuture}15`, "delta");
      await approve(`${farFuture}20`, "eps");
      await approve(`${farFuture}25`, "zeta");
      const { day, lines } = await draftClock(db, `${farFuture}30`, source, []);
      expect(day.questions.map((q) => q.category).sort()).toEqual(["alpha", "beta", "gamma"]);
      expect(lines).toHaveLength(3);
      const text = lines.join("\n");
      expect(text).toMatch(/\(alpha\): last appeared 29 days ago/);
      expect(text).toMatch(/\(beta\): last appeared 25 days ago/);
      expect(text).toMatch(/\(gamma\): last appeared 20 days ago/);
    } finally {
      await db.query("rollback");
    }
  });

  it("counts a drafted day on disk too, and leaves out the date's own approved day, as a redraft replaces it", async () => {
    await db.query("begin");
    try {
      await approve(`${farFuture}01`, "alpha");
      await approve(`${farFuture}30`, "beta");
      const drafted = [{ date: `${farFuture}29`, questions: [{ category: "gamma" }] }];
      const { day } = await draftClock(db, `${farFuture}30`, source, drafted);
      const picked = day.questions.map((q) => q.category);
      expect(picked).toContain("beta");
      expect(picked).not.toContain("gamma");
      expect(picked).not.toContain("alpha");
    } finally {
      await db.query("rollback");
    }
  });

  it("holds a day that passes the day check, and says so when a list has too few rare answers", async () => {
    const { day } = await draftClock(db, `${farFuture}30`, source, []);
    expect(day.questions).toHaveLength(3);
    await expect(draftClock(db, `${farFuture}30`, { lists: ["alpha", "beta", "gamma"].map((c) => ({ ...list(c), answers: [{ name: "plain", aliases: [], tier: "common" as const }] })), prompts: source.prompts }, [])).rejects.toThrow("has 0 rare answers");
  });
});
