import { describe, expect, it } from "vitest";
import { readServerEnv } from "./env";

const PEM = "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----";
const REMOTE = "postgresql://postgres.ref:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
const LOCAL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

describe("readServerEnv", () => {
  it("fails when DATABASE_URL is missing", () => {
    expect(() => readServerEnv({})).toThrow(/DATABASE_URL is not set/);
  });

  it("fails when DATABASE_URL is not a URL", () => {
    expect(() => readServerEnv({ DATABASE_URL: "not a url" })).toThrow(/not a valid URL/);
  });

  it.each(["sslmode=require", "sslrootcert=/x.crt"])("rejects %s in the URL, which would drop the ssl config", (param) => {
    expect(() => readServerEnv({ DATABASE_URL: `${REMOTE}?${param}`, DATABASE_CA_CERT: PEM })).toThrow(/must not contain/);
  });

  it("needs no CA for the local stack", () => {
    expect(readServerEnv({ DATABASE_URL: LOCAL })).toEqual({ databaseUrl: LOCAL, databaseCaCert: null });
  });

  it("requires a CA for a remote host", () => {
    expect(() => readServerEnv({ DATABASE_URL: REMOTE })).toThrow(/DATABASE_CA_CERT is required/);
  });

  it("rejects a CA that is not PEM, e.g. mangled multi-line quoting", () => {
    expect(() => readServerEnv({ DATABASE_URL: REMOTE, DATABASE_CA_CERT: "MIIB" })).toThrow(/not a PEM/);
  });

  it("accepts a remote URL with a PEM CA", () => {
    expect(readServerEnv({ DATABASE_URL: REMOTE, DATABASE_CA_CERT: PEM })).toEqual({ databaseUrl: REMOTE, databaseCaCert: PEM });
  });
});
