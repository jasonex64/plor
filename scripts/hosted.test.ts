// The hosted loader's rules that need no database (M15 15e-1): where the connection string may point, the hidden prompt, the
// verified connection, and that no failure prints the secret. The database side is in base.db.test.ts. The string below
// is made up: db.example.test never resolves (RFC 2606), so nothing is sent anywhere.
import { readFileSync } from "node:fs";
import { PassThrough } from "node:stream";
import pg from "pg";
import { describe, expect, it, vi } from "vitest";
import { hostedConfig, hostedFailure, hostedRefusal, hostedTarget, listCategories, listsRefusal, migrationsRefusal, readHidden } from "./base.ts";

const PASSWORD = "s3cr3t-Pa55";
const FAKE = `postgresql://postgres:${PASSWORD}@db.example.test:5432/postgres`;

describe("hostedTarget", () => {
  it("takes a hosted session-mode string as the app reads it", () => {
    expect(hostedTarget(FAKE)).toEqual({ host: "db.example.test", port: 5432, user: "postgres", password: PASSWORD, database: "postgres" });
  });

  it.each(["127.0.0.1", "localhost", "[::1]"])("refuses the local host %s: hosted commands are for a hosted database", (host) => {
    expect(() => hostedTarget(`postgresql://postgres:${PASSWORD}@${host}:54322/postgres`)).toThrow(/for a hosted database/);
  });

  it("refuses the transaction-mode port and says the load needs the session-mode string", () => {
    expect(() => hostedTarget(`postgresql://postgres:${PASSWORD}@db.example.test:6543/postgres`)).toThrow(/session-mode/);
  });

  it.each([
    ["a query parameter", `${FAKE}?sslmode=disable`],
    ["no port", `postgresql://postgres:${PASSWORD}@db.example.test/postgres`],
    ["no password", "postgresql://postgres@db.example.test:5432/postgres"],
    ["not a URL", `${PASSWORD} db.example.test`],
  ])("refuses %s, and its message holds neither the password nor the string", (_, raw) => {
    let message = "";
    try {
      hostedTarget(raw);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).not.toBe("");
    expect(message).not.toContain(PASSWORD);
    expect(message).not.toContain(raw);
  });
});

describe("readHidden", () => {
  function terminal(isTTY: boolean) {
    const input = Object.assign(new PassThrough(), { isTTY, setRawMode: vi.fn() });
    const written: string[] = [];
    return { input, written, output: { write: (s: string) => written.push(s) } };
  }

  it("echoes nothing of what is typed, takes a pasted string and backspace, and leaves raw mode", async () => {
    const { input, output, written } = terminal(true);
    const answer = readHidden("string: ", input, output);
    input.write("abc");
    input.write("\u007f");
    input.write(`${PASSWORD}\r`);
    await expect(answer).resolves.toBe(`ab${PASSWORD}`);
    expect(written.join("")).toBe("string: \n");
    expect(input.setRawMode.mock.calls).toEqual([[true], [false]]);
  });

  it("is cancelled by Ctrl-C", async () => {
    const { input, output } = terminal(true);
    const answer = readHidden("string: ", input, output);
    input.write("abc\u0003");
    await expect(answer).rejects.toThrow(/cancelled/);
    expect(input.setRawMode.mock.calls).toEqual([[true], [false]]);
  });

  it("refuses when stdin is not a terminal, with no fallback to visible input", async () => {
    const { input, output, written } = terminal(false);
    await expect(readHidden("string: ", input, output)).rejects.toThrow(/real terminal.*PowerShell/);
    expect(written).toEqual([]);
    expect(input.setRawMode).not.toHaveBeenCalled();
  });
});

describe("hostedConfig", () => {
  it("carries the committed CA, the parsed fields and nothing that could turn checking off or send pg to another host", () => {
    const db = hostedTarget(FAKE);
    const config = hostedConfig(db);
    expect(config).toEqual({ ...db, ssl: { ca: readFileSync("supabase/certs/prod-ca-2021.crt", "utf8") } });
    expect((config.ssl as { ca: string }).ca).toMatch(/^-----BEGIN CERTIFICATE-----/);
    // Takes the parsed fields alone: no argument can carry an option.
    expect(hostedConfig.length).toBe(1);
  });
});

describe("hostedFailure", () => {
  it("hides the password and the whole string wherever an error echoes them", () => {
    const echoed = new Error(`bad input ${FAKE}, and ${PASSWORD} again, and ${encodeURIComponent(PASSWORD)}`);
    const aggregate = new AggregateError([new Error(`connect ECONNREFUSED ${PASSWORD}`)], "");
    for (const err of [echoed, aggregate, `thrown text ${FAKE}`]) {
      const text = hostedFailure(err, FAKE);
      expect(text).not.toContain(PASSWORD);
      expect(text).not.toContain(FAKE);
      expect(text).toContain("[hidden]");
    }
  });

  it("hides a percent-encoded password too", () => {
    const raw = "postgresql://postgres:p%40ss%2Fw0rd@db.example.test:5432/postgres";
    const text = hostedFailure(new Error("x p%40ss%2Fw0rd y p@ss/w0rd z"), raw);
    expect(text).not.toContain("p%40ss%2Fw0rd");
    expect(text).not.toContain("p@ss/w0rd");
  });

  it("holds neither secret in a real failed connection (a host that never resolves)", async () => {
    const client = new pg.Client(hostedConfig(hostedTarget(FAKE)));
    let text = "";
    try {
      await client.connect();
    } catch (err) {
      text = hostedFailure(err, FAKE);
    }
    expect(text).not.toBe("");
    expect(text).not.toContain(PASSWORD);
    expect(text).not.toContain(FAKE);
  });
});

describe("hostedRefusal", () => {
  const state = (things: number, categories: number, words: number) => ({ database: "postgres", size: "1 MB", things, categories, words, running: 0 });

  it("loads when there is no base, whether or not a dictionary is there (the dictionary is replaced)", () => {
    expect(hostedRefusal("h", state(0, 0, 0))).toBeNull();
    expect(hostedRefusal("h", state(0, 0, 500))).toBeNull();
  });

  it.each([
    ["things with no categories (a load that stopped part-way)", state(10, 0, 0)],
    ["categories with no things", state(0, 3, 0)],
    ["a base and a dictionary", state(10, 3, 500)],
  ])("refuses %s, loudly, saying 15e-1 loads an empty database only", (_, s) => {
    expect(hostedRefusal("h", s)).toMatch(/already has a base \(\d+ things, \d+ categories\): 15e-1 loads an empty database only.*incomplete.*nothing was written/);
  });
});

// The lists-only load (M23 23b-3): the opposite rule to hostedRefusal's, and the plain word for a database not pushed to.
describe("listsRefusal", () => {
  it("loads the lists into a database that has a base", () => {
    expect(listsRefusal("h", { things: 10, categories: 3 })).toBeNull();
  });

  it.each([
    ["no base", { things: 0, categories: 0 }],
    ["things with no categories (a load that stopped part-way)", { things: 10, categories: 0 }],
    ["categories with no things", { things: 0, categories: 3 }],
  ])("refuses %s, saying hosted load is the one for it", (_, s) => {
    expect(listsRefusal("h", s)).toMatch(/h has no whole base \(\d+ things, \d+ categories\).*`hosted load`.*nothing was written/);
  });
});

describe("migrationsRefusal", () => {
  it("says to push the migrations when the list tables aren't there, and nothing when they are", () => {
    expect(migrationsRefusal("h", false)).toMatch(/h lacks the researched lists' tables.*npx supabase db push.*nothing was written/);
    expect(migrationsRefusal("h", true)).toBeNull();
  });
});

describe("listCategories", () => {
  const all = [
    { key: "animal", name: "animal", source: "wikidata" as const, root: "Q729" },
    { key: "tool", name: "tool", source: "research" as const, root: "tool" },
    { key: "hat", name: "hat", source: "research" as const, root: "hat" },
    { key: "animal_k", name: "animal starting with K", of: "animal", starts_with: "k" },
    { key: "tool_w", name: "tool starting with W", of: "tool", starts_with: "w" },
  ];

  it("gives the loaded lists' questions and the subsets of them, in the file's order, and no other category", () => {
    expect(listCategories(all, ["tool"]).map((c) => c.key)).toEqual(["tool", "tool_w"]);
  });

  it("refuses a list no question points at", () => {
    expect(() => listCategories(all, ["tool", "knot"])).toThrow(/knot.*no researched category/);
  });
});
