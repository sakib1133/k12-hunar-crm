import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { before, test } from "node:test";
import bcrypt from "bcrypt";
import request from "supertest";
import vercelHandler, { createApp } from "../src/app.js";

const jwtSecret = randomBytes(32).toString("hex");
let passwordHash;
let app;
let lastListSql;
let lastListValues;
let adminActive = true;

const inquiry = {
  id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  name: "Riya Sharma",
  email: "riya@example.com",
  phone: "+91 98765 43210",
  userType: "Parent",
  category: "Scholarship",
  status: "New",
  createdAt: "2026-10-29T08:00:00.000Z",
};

const pool = {
  async query(sql, values = []) {
    if (sql.includes("FROM admins WHERE email")) {
      return { rows: [{ id: "admin-1", name: "K12 Admin", email: "admin@example.com", role: "admin", password_hash: passwordHash }], rowCount: 1 };
    }
    if (sql.includes("FROM admins WHERE id = $1 AND is_active = TRUE")) {
      return { rows: adminActive ? [{ id: "admin-1" }] : [], rowCount: adminActive ? 1 : 0 };
    }
    if (sql.includes("INSERT INTO inquiries")) {
      return { rows: [{ id: "inquiry-2", name: values[0], category: values[4], status: "New", created_at: "2026-10-29T08:00:00.000Z" }], rowCount: 1 };
    }
    if (sql.includes("SELECT COUNT(*)::int AS total FROM inquiries")) {
      lastListSql = sql;
      lastListValues = values;
      return { rows: [{ total: 1 }], rowCount: 1 };
    }
    if (sql.includes("FROM inquiries") && sql.includes("ORDER BY created_at")) {
      lastListSql = sql;
      lastListValues = values;
      return { rows: [inquiry], rowCount: 1 };
    }
    if (sql.includes("COUNT(*) FILTER")) {
      return { rows: [{ total: 1, new: 1, in_progress: 0, resolved: 0 }], rowCount: 1 };
    }
    if (sql.includes("UPDATE inquiries SET status")) {
      return { rows: [{ id: values[1], status: values[0], updatedAt: "2026-10-29T08:00:00.000Z" }], rowCount: 1 };
    }
    if (sql === "SELECT 1") return { rows: [{ "?column?": 1 }], rowCount: 1 };
    if (sql.includes("FROM admins WHERE id")) {
      return { rows: [{ id: "admin-1", name: "K12 Admin", email: "admin@example.com" }], rowCount: 1 };
    }
    throw new Error(`Unexpected test query: ${sql}`);
  },
};

before(async () => {
  passwordHash = await bcrypt.hash("correct-horse-battery-55", 4);
  app = createApp({ pool, env: { JWT_SECRET: jwtSecret, FRONTEND_ORIGIN: "http://localhost:5173", NODE_ENV: "test" } });
});

test("Vercel entry point dispatches /api requests through the Express app", async () => {
  assert.equal(typeof vercelHandler, "function");
  const originalEnv = {
    DATABASE_URL: process.env.DATABASE_URL,
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  };
  process.env.DATABASE_URL = "postgres://test:test@127.0.0.1:5432/test";
  process.env.FRONTEND_ORIGIN = "http://localhost:5173";
  process.env.JWT_SECRET = jwtSecret;
  process.env.NODE_ENV = "test";

  try {
    await request(vercelHandler).get("/api/auth/csrf").expect(200);
  } finally {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

async function authenticatedAgent() {
  const agent = request.agent(app);
  const csrf = await agent.get("/api/auth/csrf");
  await agent.post("/api/auth/login")
    .set("X-CSRF-Token", csrf.body.csrfToken)
    .send({ email: "admin@example.com", password: "correct-horse-battery-55" })
    .expect(200);
  return { agent, csrfToken: csrf.body.csrfToken };
}

test("admin login checks bcrypt credentials and issues an HttpOnly JWT cookie", async () => {
  const agent = request.agent(app);
  const csrf = await agent.get("/api/auth/csrf").expect(200);
  const response = await agent.post("/api/auth/login")
    .set("X-CSRF-Token", csrf.body.csrfToken)
    .send({ email: "admin@example.com", password: "correct-horse-battery-55" })
    .expect(200);

  assert.equal(response.body.admin.email, "admin@example.com");
  assert.match(response.headers["set-cookie"].join(";"), /admin_token=.*HttpOnly/);
});

test("production auth cookies are secure and CORS permits only the configured frontend", async () => {
  const productionApp = createApp({
    pool,
    env: {
      JWT_SECRET: randomBytes(32).toString("hex"),
      FRONTEND_ORIGIN: "https://app.example.com",
      NODE_ENV: "production",
    },
  });
  const agent = request.agent(productionApp);
  const csrf = await agent.get("/api/auth/csrf")
    .set("Origin", "https://app.example.com")
    .expect(200);

  assert.equal(csrf.headers["access-control-allow-origin"], "https://app.example.com");
  assert.equal(csrf.headers["access-control-allow-credentials"], "true");
  assert.match(csrf.headers["set-cookie"].join(";"), /csrf_token=.*Secure; SameSite=None/);

  const response = await agent.post("/api/auth/login")
    .set("Origin", "https://app.example.com")
    .set("Cookie", `csrf_token=${csrf.body.csrfToken}`)
    .set("X-CSRF-Token", csrf.body.csrfToken)
    .send({ email: "admin@example.com", password: "correct-horse-battery-55" })
    .expect(200);

  assert.match(response.headers["set-cookie"].join(";"), /admin_token=.*HttpOnly; Secure; SameSite=None/);
});

test("inquiry submission validates and inserts the provided fields with parameters", async () => {
  const response = await request(app).post("/api/inquiries").send({
    name: "  Riya Sharma ",
    email: "RIYA@example.com",
    phone: "+91 98765 43210",
    userType: "Parent",
    category: "Scholarship",
    message: "I would like to know about available scholarships.",
  }).expect(201);
  assert.equal(response.body.inquiry.name, "Riya Sharma");

  await request(app).post("/api/inquiries").send({ name: "x", email: "bad", message: "x" }).expect(400);
});

test("admin authorization protects listing and status changes", async () => {
  await request(app).get("/api/inquiries").expect(401);
  await request(app).patch(`/api/inquiries/${inquiry.id}/status`).send({ status: "Resolved" }).expect(401);

  const { agent, csrfToken } = await authenticatedAgent();
  await agent.patch(`/api/inquiries/${inquiry.id}/status`)
    .set("X-CSRF-Token", csrfToken)
    .send({ status: "Resolved" })
    .expect(200, { inquiry: { id: inquiry.id, status: "Resolved", updatedAt: "2026-10-29T08:00:00.000Z" } });
});

test("inquiry filters are parameterized and return pagination and summary stats", async () => {
  const { agent } = await authenticatedAgent();
  const response = await agent.get("/api/inquiries")
    .query({ category: "Scholarship", userType: "Parent", search: "Riya_%", page: "2", limit: "10" })
    .expect(200);

  assert.equal(response.body.inquiries.length, 1);
  assert.deepEqual(response.body.pagination, { page: 2, limit: 10, total: 1, pages: 1 });
  assert.equal(response.body.stats.total, 1);
  assert.match(lastListSql, /category = \$1/);
  assert.match(lastListSql, /user_type = \$2/);
  assert.match(lastListSql, /ILIKE \$3/);
  assert.deepEqual(lastListValues.slice(0, 3), ["Scholarship", "Parent", "%Riya\\_\\%%"]);
  assert.equal(lastListValues.at(-2), 10);
  assert.equal(lastListValues.at(-1), 10);
});

test("invalid CSRF tokens and invalid filters are rejected", async () => {
  await request(app).post("/api/auth/login")
    .set("X-CSRF-Token", "wrong")
    .send({ email: "admin@example.com", password: "correct-horse-battery-55" })
    .expect(403);

  const { agent } = await authenticatedAgent();
  await agent.get("/api/inquiries").query({ category: "Unknown" }).expect(400);
  await agent.get("/api/inquiries").query({ page: "2abc" }).expect(400);
  const csrf = await agent.get("/api/auth/csrf");
  await agent.patch("/api/inquiries/not-a-uuid/status")
    .set("X-CSRF-Token", csrf.body.csrfToken)
    .send({ status: "Resolved" })
    .expect(400);
});

test("malformed JSON and disallowed browser origins receive safe client errors", async () => {
  await request(app).post("/api/inquiries")
    .set("Content-Type", "application/json")
    .send("{")
    .expect(400, { error: "Request body must be valid JSON" });
  await request(app).get("/api/health")
    .set("Origin", "https://untrusted.example")
    .expect(403, { error: "Origin is not allowed by CORS" });
});

test("disabled admins cannot use an unexpired JWT", async () => {
  const { agent } = await authenticatedAgent();
  adminActive = false;
  await agent.get("/api/inquiries").expect(401);
  adminActive = true;
});
