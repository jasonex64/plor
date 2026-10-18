// Server-only environment, validated once at startup (src/instrumentation.ts) so a missing or
// malformed value crashes the boot instead of the first request (DECISIONS.md: Config and tunables).

export type ServerEnv = {
  databaseUrl: string;
  // Required for any non-local database: Supabase recommends verify-full against its own CA
  // (supabase.com/docs/guides/platform/ssl-enforcement). Null only for the local stack.
  databaseCaCert: string | null;
};

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export function readServerEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  const databaseUrl = source.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set (see docs/milestones/M00-foundations.md)");

  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }
  // node-postgres replaces the whole `ssl` config when the URL carries sslmode or sslrootcert,
  // which would silently drop certificate verification (node-postgres.com/features/ssl).
  for (const param of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) {
    if (url.searchParams.has(param)) throw new Error(`DATABASE_URL must not contain ${param}; TLS is configured in code`);
  }

  if (LOCAL_HOSTS.has(url.hostname)) return { databaseUrl, databaseCaCert: null };

  const ca = source.DATABASE_CA_CERT;
  if (!ca) throw new Error(`DATABASE_CA_CERT is required for remote database host ${url.hostname}`);
  if (!ca.trim().startsWith("-----BEGIN CERTIFICATE-----")) {
    throw new Error("DATABASE_CA_CERT is not a PEM certificate (check multi-line quoting in .env.local)");
  }
  return { databaseUrl, databaseCaCert: ca };
}
