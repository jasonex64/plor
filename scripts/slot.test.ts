import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { localStack, slotFor, supabaseEnv } from "./slot.ts";
import { isFree } from "./slots.ts";

const MAIN = resolve("/work/RIFF");

function envOf(text: string): Record<string, string> {
  return Object.fromEntries(text.trim().split("\n").map((line) => line.split("=") as [string, string]));
}

describe("slotFor", () => {
  it("makes the main checkout slot 1 and its plor-2 sibling slot 2", () => {
    expect(slotFor(MAIN, MAIN)).toMatchObject({ number: 1, projectId: "plor", devPort: 3000 });
    expect(slotFor(resolve("/work/plor-2"), MAIN)).toMatchObject({ number: 2, projectId: "plor-2", devPort: 3002 });
  });

  it("refuses any other folder, an old worktree included", () => {
    expect(() => slotFor(resolve("/work/RIFF-m14"), MAIN)).toThrow("is not a slot");
  });
});

describe("slot ports", () => {
  // Slot 1 runs on config.toml as written, so its block must be config.toml's ports.
  it("gives slot 1 supabase/config.toml's ports and project", () => {
    const toml = readFileSync(join(import.meta.dirname, "..", "supabase", "config.toml"), "utf8");
    const section = (name: string, key: string) => {
      const body = toml.split(`\n[${name}]\n`)[1].split("\n[")[0];
      return new RegExp(`^${key} = "?([^"\\n]+)"?`, "m").exec(body)?.[1];
    };
    const env = envOf(supabaseEnv(slotFor(MAIN, MAIN)));
    expect(env.SUPABASE_PROJECT_ID).toBe(/^project_id = "([^"]+)"/m.exec(toml)?.[1]);
    expect(env.SUPABASE_API_PORT).toBe(section("api", "port"));
    expect(env.SUPABASE_DB_PORT).toBe(section("db", "port"));
    expect(env.SUPABASE_DB_SHADOW_PORT).toBe(section("db", "shadow_port"));
    expect(env.SUPABASE_DB_POOLER_PORT).toBe(section("db.pooler", "port"));
    expect(env.SUPABASE_STUDIO_PORT).toBe(section("studio", "port"));
    expect(env.SUPABASE_LOCAL_SMTP_PORT).toBe(section("local_smtp", "port"));
    expect(env.SUPABASE_ANALYTICS_PORT).toBe(section("analytics", "port"));
    expect(env.SUPABASE_EDGE_RUNTIME_INSPECTOR_PORT).toBe(section("edge_runtime", "inspector_port"));
    expect(env.SUPABASE_AUTH_SITE_URL).toBe(section("auth", "site_url"));
  });

  it("moves slot 3's stack 200 ports up and its app to 3003", () => {
    const slot = slotFor(resolve("/work/plor-3"), MAIN);
    expect(envOf(supabaseEnv(slot))).toMatchObject({ SUPABASE_PROJECT_ID: "plor-3", SUPABASE_API_PORT: "54521", SUPABASE_DB_PORT: "54522", SUPABASE_EDGE_RUNTIME_INSPECTOR_PORT: "8283" });
    expect(localStack(slot)).toMatchObject({ appUrl: "http://localhost:3003", mailpitUrl: "http://127.0.0.1:54524" });
  });
});

describe("isFree", () => {
  const clean = { exists: true, branch: null, dirty: false, devHolder: null };
  it("frees a missing slot, and a clean one on main or detached with nothing on its port", () => {
    expect(isFree({ ...clean, exists: false })).toBe(true);
    expect(isFree(clean)).toBe(true);
    expect(isFree({ ...clean, branch: "main" })).toBe(true);
  });
  it("keeps busy a slot on a task branch, with changes, or with its port held", () => {
    expect(isFree({ ...clean, branch: "fix-share-link" })).toBe(false);
    expect(isFree({ ...clean, dirty: true })).toBe(false);
    expect(isFree({ ...clean, devHolder: { pid: 1, command: "node", where: "node" } })).toBe(false);
  });
});
