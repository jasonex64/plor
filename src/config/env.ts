// Server-only environment, validated once at startup (src/instrumentation.ts) so a missing or
// malformed value crashes the boot instead of the first request (DECISIONS.md: Config and tunables).

export type DbConnection = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

export type ServerEnv = {
  database: DbConnection;
  // Required for any non-local database: Supabase recommends verify-full against its own CA
  // (supabase.com/docs/guides/platform/ssl-enforcement). Null only for the local stack.
  databaseCaCert: string | null;
};

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function readServerEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  const raw = source.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set (see docs/milestones/M00-foundations.md)");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must start with postgresql://");
  }
  // pg's connection-string parser copies every query param into its config, so ?ssl=0, ?ssl=true,
  // ?sslmode=... or ?host=... would override TLS or the host and silently skip verification
  // (pg-connection-string; M00 review 3). No param is needed, so any param is refused.
  if (url.search) throw new Error("DATABASE_URL must not contain query parameters; TLS and host are set in code");
  if (!url.port) throw new Error("DATABASE_URL must include an explicit port");

  const database: DbConnection = {
    host: url.hostname,
    port: Number(url.port),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
  };
  if (!database.user || !database.password || !database.database) {
    throw new Error("DATABASE_URL must include a user, a password and a database name");
  }

  if (LOCAL_HOSTS.has(url.hostname)) return { database, databaseCaCert: null };

  const ca = source.DATABASE_CA_CERT;
  if (!ca) throw new Error(`DATABASE_CA_CERT is required for remote database host ${url.hostname}`);
  if (!ca.trim().startsWith("-----BEGIN CERTIFICATE-----")) {
    throw new Error("DATABASE_CA_CERT is not a PEM certificate: it must start with -----BEGIN CERTIFICATE----- (check for quotes or extra text in the Vercel env var or .env.local)");
  }
  return { database, databaseCaCert: ca };
}
