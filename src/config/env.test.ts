import { describe, expect, it } from "vitest";
import { readServerEnv } from "./env";

const PEM = "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----";
const REMOTE = "postgresql://plor_app.ref:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
const LOCAL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const AUTH = { SUPABASE_URL: "https://ref.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x" };

describe("readServerEnv", () => {
  it("fails when DATABASE_URL is missing", () => {
    expect(() => readServerEnv({})).toThrow(/DATABASE_URL is not set/);
  });

  it("fails when DATABASE_URL is not a URL", () => {
    expect(() => readServerEnv({ DATABASE_URL: "not a url" })).toThrow(/not a valid URL/);
  });

  it("fails on a non-postgres scheme", () => {
    expect(() => readServerEnv({ DATABASE_URL: "https://u:p@host:6543/db" })).toThrow(/postgresql:\/\//);
  });

  // Each of these overrides TLS or the host inside pg's connection-string parser (M00 review 3).
  it.each(["ssl=0", "ssl=true", "sslmode=require", "sslnegotiation=direct", "sslrootcert=/x.crt", "host=evil.example.com"])(
    "rejects ?%s",
    (param) => {
      expect(() => readServerEnv({ DATABASE_URL: `${REMOTE}?${param}`, DATABASE_CA_CERT: PEM })).toThrow(/query parameters/);
    },
  );

  it("requires an explicit port", () => {
    expect(() => readServerEnv({ DATABASE_URL: "postgresql://u:p@127.0.0.1/postgres" })).toThrow(/explicit port/);
  });

  it("requires a password", () => {
    expect(() => readServerEnv({ DATABASE_URL: "postgresql://u@127.0.0.1:54322/postgres" })).toThrow(/password/);
  });

  it("parses the local stack without a CA", () => {
    expect(readServerEnv({ DATABASE_URL: LOCAL, ...AUTH })).toEqual({
      database: { host: "127.0.0.1", port: 54322, user: "postgres", password: "postgres", database: "postgres" },
      supabase: { url: "https://ref.supabase.co", publishableKey: "sb_publishable_x" },
      databaseCaCert: null,
    });
  });

  it("decodes percent-encoded credentials", () => {
    const env = readServerEnv({ DATABASE_URL: "postgresql://plor_app.ref:p%40ss@db.example.com:6543/postgres", DATABASE_CA_CERT: PEM, ...AUTH });
    expect(env.database).toMatchObject({ user: "plor_app.ref", password: "p@ss" });
  });

  it("requires a CA for a remote host", () => {
    expect(() => readServerEnv({ DATABASE_URL: REMOTE, ...AUTH })).toThrow(/DATABASE_CA_CERT is required/);
  });

  it("rejects a CA that is not PEM, e.g. mangled multi-line quoting", () => {
    expect(() => readServerEnv({ DATABASE_URL: REMOTE, DATABASE_CA_CERT: "MIIB", ...AUTH })).toThrow(/not a PEM/);
  });

  it("accepts a remote URL with a PEM CA", () => {
    const env = readServerEnv({ DATABASE_URL: REMOTE, DATABASE_CA_CERT: PEM, ...AUTH });
    expect(env.database.host).toBe("aws-0-us-east-1.pooler.supabase.com");
    expect(env.databaseCaCert).toBe(PEM);
  });

  it("fails when SUPABASE_URL is missing", () => {
    expect(() => readServerEnv({ DATABASE_URL: LOCAL, SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x" })).toThrow(/SUPABASE_URL is not set/);
  });

  it("rejects a SUPABASE_URL with a path, e.g. the REST endpoint", () => {
    expect(() => readServerEnv({ DATABASE_URL: LOCAL, ...AUTH, SUPABASE_URL: "https://ref.supabase.co/rest/v1" })).toThrow(/origin/);
  });

  it("rejects plain http for a remote SUPABASE_URL", () => {
    expect(() => readServerEnv({ DATABASE_URL: LOCAL, ...AUTH, SUPABASE_URL: "http://ref.supabase.co" })).toThrow(/https/);
  });

  it("allows plain http for the local stack", () => {
    const env = readServerEnv({ DATABASE_URL: LOCAL, ...AUTH, SUPABASE_URL: "http://127.0.0.1:54321" });
    expect(env.supabase.url).toBe("http://127.0.0.1:54321");
  });

  it("fails when SUPABASE_PUBLISHABLE_KEY is missing", () => {
    expect(() => readServerEnv({ DATABASE_URL: LOCAL, SUPABASE_URL: AUTH.SUPABASE_URL })).toThrow(/SUPABASE_PUBLISHABLE_KEY is not set/);
  });

  // A secret key bypasses RLS; the app must never hold one (CLAUDE.md: Least privilege).
  it.each(["sb_secret_x", "legacy_anon_key"])("rejects a key that is not publishable (%s)", (key) => {
    expect(() => readServerEnv({ DATABASE_URL: LOCAL, ...AUTH, SUPABASE_PUBLISHABLE_KEY: key })).toThrow(/publishable key/);
  });
});
