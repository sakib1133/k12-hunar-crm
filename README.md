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
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
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

`client/.env` can stay empty in local development. Vite proxies `/api` to `http://localhost:4000`. `VITE_API_BASE_URL` is optional and is only needed when the frontend directly calls a separately hosted API.

Initialize the database and create an initial admin, then start both applications:

```powershell
npm run db:init
npm run admin:create
npm run dev
```

Open `http://localhost:5173`. The server runs on port 4000. To run either process by itself, use `npm run dev:server` or `npm run dev:client`.

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

## Deploy: Render API + Vercel client

For cookie-based admin auth in production, use a custom domain with the frontend and API on the same registrable domain (for example `app.example.com` and `api.example.com`). Browsers increasingly restrict third-party cookies between the default `*.vercel.app` and `*.onrender.com` domains. The cookies are `Secure` and `SameSite=None` in production; same-site custom subdomains avoid third-party cookie blocking while retaining separate hosting.

### Render

1. Create a **Web Service** from this repository and keep its root directory at the repository root. This keeps the root `schema.sql` available to the setup script.
2. Set build command to `npm install --prefix server` and start command to `npm start --prefix server`; select Node 20 or newer.
3. Add runtime environment variables:
   - `NODE_ENV=production`
   - `DATABASE_URL` = Supabase connection URI
   - `JWT_SECRET` = a new, random secret (do not reuse a local/dev secret)
   - `FRONTEND_ORIGIN=https://app.example.com` (exact Vercel custom-domain origin; comma-separated if additional trusted origins are required)
   - `PORT` is supplied by Render.
4. Assign `api.example.com` to the Render service and confirm `https://api.example.com/api/health` returns `{"status":"ok"}`.
5. Apply the schema and create the initial admin using a trusted one-time environment. Either run the setup scripts from a controlled machine with the production `DATABASE_URL`, or temporarily set the three `ADMIN_*` values in Render, run `npm run admin:create` from its Shell, then remove `ADMIN_PASSWORD` and the other setup-only values. Never expose the password in a committed file or build-time variable.

### Vercel

1. Import the repository as a Vercel project and set the project root directory to `client`.
2. Use `npm run build` as the build command and `dist` as the output directory.
3. Set `VITE_API_BASE_URL=https://api.example.com` as a Vercel environment variable, then redeploy. This value is a public API origin, not a secret.
4. Assign `app.example.com` to the Vercel project. Set Render's `FRONTEND_ORIGIN` to this exact origin and redeploy the API if necessary.
5. Verify the browser can load the public page, submit an inquiry, sign in, load the protected dashboard, update status, and sign out. Verify the API CORS response allows only the configured frontend origin.

### Deployment checklist

- [ ] Supabase schema applied and database SSL connection verified.
- [ ] Render secrets configured; no database URL or JWT secret in Vercel.
- [ ] Strong, unique JWT secret generated; admin password removed after account creation.
- [ ] Custom frontend/API subdomains use HTTPS and share the same registrable domain.
- [ ] Exact production frontend origin configured in Render CORS.
- [ ] Production build and API health check pass.
- [ ] Inquiry submit, admin login, filters, status update, and logout verified against the deployed services.
- [ ] `.env` files and credentials excluded from the GitHub repository.
