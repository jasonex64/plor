// Server-only environment, validated once at startup (src/instrumentation.ts) so a missing or
// malformed value crashes the boot instead of the first request (DECISIONS.md: Config and tunables).

export type DbConnection = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

export type SupabaseAuthEnv = {
  url: string;
  publishableKey: string;
};

export type ServerEnv = {
  database: DbConnection;
  // Supabase Auth, used only by server code (route handlers and the proxy). No browser client exists,
  // so neither value needs the NEXT_PUBLIC_ prefix that would inline it into the client bundle.
  supabase: SupabaseAuthEnv;
  // Required for any non-local database: Supabase recommends verify-full against its own CA
  // (supabase.com/docs/guides/platform/ssl-enforcement). Null only for the local stack.
  databaseCaCert: string | null;
};

export const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

// The one parser for Postgres URLs, used by the app (DATABASE_URL) and by `npm run content:publish`. The password
// may be empty here; each caller decides whether it must be there or must not be (content:publish asks for it).
export function parseDatabaseUrl(raw: string, name: string): DbConnection {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} is not a valid URL`);
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error(`${name} must start with postgresql://`);
  }
  // pg's connection-string parser copies every query param into its config, so ?ssl=0, ?ssl=true,
  // ?sslmode=... or ?host=... would override TLS or the host and silently skip verification
  // (pg-connection-string; M00 review 3). No param is needed, so any param is refused.
  if (url.search) throw new Error(`${name} must not contain query parameters; TLS and host are set in code`);
  if (!url.port) throw new Error(`${name} must include an explicit port`);

  const database: DbConnection = {
    host: url.hostname,
    port: Number(url.port),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
  };
  // Each message names only the missing part (M02 2f, B8). The password is checked by the caller: content:publish
  // asks for it instead.
  if (!database.user) throw new Error(`${name} must include a user`);
  if (!database.database) throw new Error(`${name} must include a database name`);
  return database;
}

export function readServerEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  const raw = source.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set (see docs/milestones/M00-foundations.md)");
  const database = parseDatabaseUrl(raw, "DATABASE_URL");
  if (!database.password) throw new Error("DATABASE_URL must include a password");

  const supabase = readSupabaseAuthEnv(source);
  if (LOCAL_HOSTS.has(database.host)) return { database, supabase, databaseCaCert: null };

  const ca = source.DATABASE_CA_CERT;
  if (!ca) throw new Error(`DATABASE_CA_CERT is required for remote database host ${database.host}`);
  if (!ca.trim().startsWith("-----BEGIN CERTIFICATE-----")) {
    throw new Error("DATABASE_CA_CERT is not a PEM certificate: it must start with -----BEGIN CERTIFICATE----- (check for quotes or extra text in the Vercel env var or .env.local)");
  }
  return { database, supabase, databaseCaCert: ca };
}

function readSupabaseAuthEnv(source: Record<string, string | undefined>): SupabaseAuthEnv {
  const raw = source.SUPABASE_URL;
  if (!raw) throw new Error("SUPABASE_URL is not set (the project URL, e.g. https://<ref>.supabase.co)");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("SUPABASE_URL is not a valid URL");
  }
  if (url.pathname !== "/" || url.search || url.hash) throw new Error("SUPABASE_URL must be the project origin, with no path or query");
  // Auth tokens travel over this connection, so anything but the local stack must use TLS.
  if (url.protocol !== "https:" && !(url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname))) {
    throw new Error("SUPABASE_URL must use https:// (plain http:// is allowed only for the local stack)");
  }

  const publishableKey = source.SUPABASE_PUBLISHABLE_KEY;
  if (!publishableKey) throw new Error("SUPABASE_PUBLISHABLE_KEY is not set");
  // Catches a secret key (sb_secret_...) or a legacy JWT key pasted by mistake: the app must never hold
  // a key that bypasses RLS (CLAUDE.md: Least privilege; supabase.com/docs/guides/api/api-keys).
  if (!publishableKey.startsWith("sb_publishable_")) {
    throw new Error("SUPABASE_PUBLISHABLE_KEY must be a publishable key (it starts with sb_publishable_)");
  }
  return { url: url.origin, publishableKey };
}
