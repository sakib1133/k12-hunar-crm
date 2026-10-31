# K12 Hunar EdTech CRM & Inquiry System

A full-stack inquiry workflow for K12 Hunar. The React/Vite client submits inquiries to an Express API; the API stores records in Supabase PostgreSQL through `pg`. Admin accounts use bcrypt password hashes and short-lived, signed JWTs in secure HTTP-only cookies. Supabase Auth is not used.

## Project structure

```text
.
├── client/
│   ├── src/
│   │   ├── App.jsx                 # Public inquiry page, login, and admin dashboard
│   │   ├── api.js                  # Same-origin/dev-proxy API client and CSRF header
│   │   └── styles.css              # Tailwind layers and responsive UI
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── scripts/
│   │   ├── create-admin.js         # One-time bcrypt-backed admin setup
│   │   └── init-db.js              # Applies the root schema.sql
│   ├── src/
│   │   ├── controllers/            # Authentication and inquiry operations
│   │   ├── db/                     # PostgreSQL pool
│   │   ├── middleware/             # JWT authorization, CSRF, safe errors
│   │   ├── routes/
│   │   └── validation/
│   │   ├── index.js                # Express entry point (local listener / Vercel function)
│   ├── test/app.test.js
│   └── package.json
├── schema.sql
├── .env.example
└── package.json
```

## Requirements

- Node.js 20 or newer and npm
- A Supabase project with its PostgreSQL database available

## Supabase setup

1. Create a Supabase project and copy its PostgreSQL connection URI from **Project Settings → Database → Connection string**. Use the session pooler connection if your hosting provider requires IPv4. Include `sslmode=require`, URL-encode special characters in the database password, and keep the URI private.
2. Apply [`schema.sql`](./schema.sql) using the Supabase SQL Editor, or configure `server/.env` and run `npm run db:init`. The schema creates the `admins` and `inquiries` tables, constraints, timestamp triggers, and indexes.
3. Use the database password/URI only on the backend. It must never be set as a `VITE_*` variable.

## Local development

In PowerShell, from the project root:

```powershell
npm install
npm run install:all
if (-not (Test-Path server\.env)) { Copy-Item .env.example server\.env }
```

Edit `server/.env` and set:

| Variable | Required | Purpose |
|---|---:|---|
| `NODE_ENV` | No | Use `development` locally; set `production` when deployed. |
| `PORT` | No | API port; defaults to `4000`. |
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection URI. |
| `JWT_SECRET` | Yes | At least 32 bytes of unpredictable secret data. Generate locally with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`. |
| `FRONTEND_ORIGIN` | Yes | Exact frontend origin, such as `http://localhost:5173`; multiple exact origins may be comma-separated. |
| `ADMIN_NAME` | For admin setup | Initial admin display name, up to 100 characters. |
| `ADMIN_EMAIL` | For admin setup | Initial admin email address. |
| `ADMIN_PASSWORD` | For admin setup | Unique password, at least 12 characters and no more than 72 UTF-8 bytes. Set it only for the one-time setup command and remove it afterward. |

Vite proxies `/api` to `http://localhost:4000` in local development. `VITE_API_BASE_URL` is optional locally and is only needed when the frontend directly calls a separately hosted API.

Initialize the database and create an initial admin, then start both applications:

```powershell
npm run db:init
npm run admin:create
npm run dev
```

Open `http://localhost:5173` for the public inquiry page or `http://localhost:5173/admin/login` for the admin login. The protected dashboard is at `http://localhost:5173/admin`. The server runs on port 4000. To run either process by itself, use `npm run dev:server` or `npm run dev:client`.

The admin setup command reads `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` from `server/.env`, hashes the password with bcrypt cost 12, and does not change an account if that email already exists. Do not commit the local env file. Remove the `ADMIN_PASSWORD` value after setup; do not add a public admin-registration route.

## API

All responses are JSON except `POST /api/auth/logout` (`204`). Inquiry status values are `New`, `In Progress`, `Resolved`, and `Rejected`.

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Checks API and database connectivity. |
| `POST` | `/api/inquiries` | Public | Validates and stores a new inquiry. |
| `GET` | `/api/auth/csrf` | Public | Issues a CSRF cookie/token pair. |
| `POST` | `/api/auth/login` | Public + CSRF | Verifies bcrypt credentials; sets an 8-hour JWT cookie. Limited to 10 attempts per IP per 15 minutes. |
| `POST` | `/api/auth/logout` | Admin + CSRF | Clears the admin and CSRF cookies. |
| `GET` | `/api/auth/me` | Admin | Returns the current active admin profile. |
| `GET` | `/api/inquiries` | Admin | Lists inquiries and summary stats. Supports `category`, `userType`, `status`, `search`, `page`, and `limit` query parameters. Search covers name and phone; limit is 1–100 (default 25). |
| `PATCH` | `/api/inquiries/:id/status` | Admin + CSRF | Updates an inquiry status. JSON body: `{"status":"Resolved"}`. |

The frontend uses `HttpOnly` JWT cookies and includes credentials on API requests. CSRF tokens are required for login, logout, and status changes. Set `FRONTEND_ORIGIN` to the exact browser origin; wildcard CORS is not used. Public inquiry submission is limited to 20 requests per IP per 15 minutes.

## Tests and production build

```powershell
npm test
npm run build
```

The API tests cover bcrypt/JWT login, inquiry validation and insertion, protected routes, status authorization, parameterized filters/search/pagination, and CSRF rejection. They use a test-only in-memory query stub and do not require a live Supabase project. For a live readiness check, use `GET /api/health` after configuring the database.

## Deploy frontend and API to Vercel

Deploy this repository as **two Vercel projects**. The client and Express API remain separate deployments, while the existing Supabase PostgreSQL database and all its data remain in place. The Express entry point is `server/src/index.js`; Vercel's Express runtime serves it as one function. The API routes retain their `/api` prefix.

Use custom HTTPS domains on the **same registrable domain**, such as `app.example.com` and `api.example.com`. Production JWT and CSRF cookies are `Secure; SameSite=None` because the browser calls a different origin. Separate default `*.vercel.app` project domains may be treated as third-party cookies and can prevent admin authentication from working reliably.

### Frontend Vercel project

1. Import the repository as a Vercel project and set **Root Directory** to `client`.
2. Select the **Vite** framework preset. Set **Build Command** to `npm run build` and **Output Directory** to `dist`; leave the install command at its detected default (`npm install`).
3. Add `VITE_API_BASE_URL=https://api.example.com` to the frontend project's **Production** environment. This is a public API origin, not a secret; do not put database credentials or `JWT_SECRET` in any `VITE_*` variable. Redeploy after changing it.
4. Assign `app.example.com` to this project.
5. The existing `client/vercel.json` rewrites `/admin` and `/admin/login` to the SPA entry point, so opening or refreshing either direct URL loads the React app.

### Express API Vercel project

1. Create a second Vercel project from the same repository. Set **Root Directory** to `server` and select the **Express** framework preset. Leave the detected build command and output directory unset; Vercel runs the Express app as a function. The package requires Node.js 20 or newer.
2. Add these **Production** environment variables:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Supabase PostgreSQL URI. Prefer Supabase's transaction pooler for serverless connections and include `sslmode=require`. |
   | `JWT_SECRET` | New random value of at least 32 bytes. Keep it private and do not reuse a development secret. |
   | `FRONTEND_ORIGIN` | Exact browser origin, `https://app.example.com` (scheme included, no trailing slash). Additional trusted origins may be comma-separated, but only add origins you control. |

   Vercel supplies `NODE_ENV=production` for production deployments. Do not set `PORT`; Vercel manages it.
3. Assign `api.example.com` to the API project. The frontend's API base URL must match this origin exactly.
4. If using Vercel Preview deployments, configure their exact frontend origins in the API's `FRONTEND_ORIGIN` and provide an appropriate `VITE_API_BASE_URL` for the preview. CORS intentionally does not allow wildcard origins.

### Existing Supabase data and initial admin

Do not reset or replace the Supabase database. If the schema is already present, leave it in place. If setup is still required, inspect the current database first and apply `schema.sql` without dropping or recreating data. Run `npm run admin:create --prefix server` once from a trusted machine with the production database URL and one-time `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` values. The script hashes the password and does not change an existing account with that email. Do not put admin setup values in Vercel build variables; remove them from the local environment after setup.

Keep local secrets in the ignored `server/.env`. `.gitignore` excludes `.env` files at every directory level while allowing the checked-in `.env.example` templates. Before pushing, verify that no real `.env` file is tracked.

### Verify after setup

1. Open `https://api.example.com/api/health`; a healthy database connection returns `{"status":"ok"}`.
2. Open `https://app.example.com/` and `https://app.example.com/admin/login` directly, then refresh both `/admin/login` and `/admin`.
3. Submit an inquiry; sign in; verify the protected dashboard, search, filters, status update, and sign out.
4. In browser developer tools, confirm API requests include credentials and that login sets a `Secure`, `HttpOnly` `admin_token` cookie. Check that the API only allows the configured `FRONTEND_ORIGIN`.

Vercel Functions are stateless and can scale to multiple instances. The PostgreSQL pool is limited to one connection per Vercel instance to avoid multiplying a large pool across instances. The existing rate limits use per-process memory and therefore are not a global rate limit across all Vercel instances; use a shared rate-limit store if globally coordinated limits become a requirement. Deployment, custom-domain setup, Supabase environment configuration, and live end-to-end verification must still be completed in your Vercel/Supabase accounts.
