import assert from "node:assert/strict";
import { after, test } from "node:test";
import pg from "pg";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalNodeEnv = process.env.NODE_ENV;
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.NODE_ENV = "test";
const { createPool } = await import("../src/db/pool.js");
if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
else process.env.DATABASE_URL = originalDatabaseUrl;
if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = originalNodeEnv;

after(async () => {
  const { pool } = await import("../src/db/pool.js");
  await pool.end();
});

test("production pool verifies Supabase connections using the configured CA", async () => {
  const ca = "-----BEGIN CERTIFICATE-----\nvalid-test-certificate\n-----END CERTIFICATE-----";
  const pool = createPool(
    "postgres://user:password@db.example.com:5432/postgres?sslmode=no-verify&ssl=0&application_name=crm",
    { NODE_ENV: "production", DATABASE_SSL_CA: ca },
  );

  try {
    assert.deepEqual(pool.options.ssl, { ca, rejectUnauthorized: true });
    assert.equal(pool.options.connectionString, "postgres://user:password@db.example.com:5432/postgres?application_name=crm");
    const client = new pg.Client(pool.options);
    assert.deepEqual(client.connectionParameters.ssl, { ca, rejectUnauthorized: true });
  } finally {
    await pool.end();
  }
});

test("production pool requires a CA certificate", () => {
  assert.throws(
    () => createPool("postgres://user:password@db.example.com:5432/postgres", { NODE_ENV: "production" }),
    { message: "DATABASE_SSL_CA must contain a PEM-encoded CA certificate in production" },
  );
});

test("local pool preserves connection-string SSL settings", async () => {
  const pool = createPool(
    "postgres://user:password@localhost:5432/postgres?ssl=1",
    { NODE_ENV: "development" },
  );

  try {
    assert.equal(pool.options.ssl, undefined);
    assert.equal(pool.options.connectionString, "postgres://user:password@localhost:5432/postgres?ssl=1");
    const client = new pg.Client(pool.options);
    assert.equal(client.connectionParameters.ssl, true);
  } finally {
    await pool.end();
  }
});
