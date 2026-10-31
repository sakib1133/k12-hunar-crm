import pg from "pg";

const { Pool } = pg;

const sslConnectionParameters = new Set([
  "ssl",
  "sslcert",
  "sslkey",
  "sslmode",
  "sslrootcert",
  "uselibpqcompat",
]);

function withoutConnectionStringSslParameters(connectionString) {
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URI");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the postgres or postgresql protocol");
  }

  for (const [parameter] of [...url.searchParams]) {
    if (sslConnectionParameters.has(parameter.toLowerCase())) {
      url.searchParams.delete(parameter);
    }
  }
  return url.toString();
}

export function createPool(connectionString = process.env.DATABASE_URL, env = process.env) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const isProduction = env.NODE_ENV === "production";
  let ssl;
  if (isProduction) {
    const ca = env.DATABASE_SSL_CA?.trim();
    if (!ca || !/^-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----$/.test(ca)) {
      throw new Error("DATABASE_SSL_CA must contain a PEM-encoded CA certificate in production");
    }
    connectionString = withoutConnectionStringSslParameters(connectionString);
    ssl = { ca, rejectUnauthorized: true };
  }

  return new Pool({
    connectionString,
    ssl,
    max: env.VERCEL ? 1 : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export const pool = createPool();
