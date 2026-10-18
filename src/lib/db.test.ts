import { Client } from "pg";
import { describe, expect, it } from "vitest";
import { poolConfig } from "./db";

// Feeds our config through pg's real parameter resolution (what a pooled client actually uses),
// so a regression back to `connectionString` or a dropped CA shows up here. No network.
type Resolved = { host: string; port: number; ssl: unknown };
const resolved = (c: Client) => (c as unknown as { connectionParameters: Resolved }).connectionParameters;

const remote = {
  database: { host: "aws-0-us-east-1.pooler.supabase.com", port: 6543, user: "riff_app.ref", password: "pw", database: "postgres" },
  databaseCaCert: "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----",
};

describe("poolConfig", () => {
  it("verifies remote hosts against the CA, on the configured host", () => {
    const p = resolved(new Client(poolConfig(remote)));
    expect(p.host).toBe("aws-0-us-east-1.pooler.supabase.com");
    expect(p.port).toBe(6543);
    expect(p.ssl).toEqual({ ca: remote.databaseCaCert });
  });

  it("never passes a connection string, so URL params can't reach pg", () => {
    expect(poolConfig(remote)).not.toHaveProperty("connectionString");
  });

  it("uses no TLS only for the local stack", () => {
    const local = { ...remote, database: { ...remote.database, host: "127.0.0.1", port: 54322 }, databaseCaCert: null };
    expect(resolved(new Client(poolConfig(local))).ssl).toBe(false);
  });
});
