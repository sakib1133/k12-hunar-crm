# K12 Hunar EdTech CRM & Inquiry System

## 1. Project Overview

K12 Hunar is a full-stack inquiry management application. Visitors can submit inquiries, and administrators can sign in to review and manage them.

The React frontend communicates with an Express API. Inquiry and admin data is stored in Supabase PostgreSQL.

## 2. Features

- Public inquiry submission with input validation.
- Admin login using bcrypt password hashes.
- Signed JWT authentication in secure, HTTP-only cookies.
- CSRF protection for login, logout, and inquiry status changes.
- Admin inquiry search, filters, pagination, summary statistics, and status updates.
- CORS restricted to configured frontend origins.
- PostgreSQL connections use SSL. Production verifies the Supabase CA certificate.
- Admin accounts are created with a setup command; there is no public registration endpoint.

## 3. Technology Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** Supabase PostgreSQL, accessed with `pg`
- **Authentication and security:** bcrypt, JSON Web Tokens, CSRF tokens, Helmet, CORS
- **Testing:** Node.js test runner and Supertest
- **Deployment:** Vercel for the frontend and backend; Supabase for PostgreSQL

## 4. Project Structure

```text
client/
  src/                 React application and API client
  package.json         Frontend scripts and dependencies
  vite.config.js       Vite development server and /api proxy
  vercel.json          Frontend routes
server/
  src/
    app.js             Express app and Vercel handler
    index.js           Local HTTP server
    controllers/       Authentication and inquiry operations
    db/                PostgreSQL pool
    middleware/        Authentication, CSRF, and error handling
    routes/            API routes
    validation/        Request validation
  scripts/             Database and admin setup commands
  test/                Backend tests
  package.json         Backend scripts and dependencies
schema.sql              PostgreSQL tables, constraints, triggers, and indexes
.env.example            Example environment variables with placeholders
package.json            Root development, test, and build scripts
```

## 5. Requirements

- Node.js 20 or newer and npm
- A Supabase project with PostgreSQL enabled
- Git

## 6. Supabase Database Setup

1. In Supabase, open **Project Settings → Database → Connection string** and select the **Session Pooler** connection.
2. Keep the connection URI private. URL-encode special characters in its username or password.
3. Apply [`schema.sql`](./schema.sql) using the Supabase SQL Editor, or configure the local environment and run `npm run db:init` as described below.
4. For production, download the project's CA certificate from **Database Settings → SSL Configuration**. Add its full PEM text to the backend's `DATABASE_SSL_CA` environment variable. The production backend requires this certificate and verifies it; do not disable certificate verification.

## 7. Local Installation and Setup

From the project root, install the root, server, and client dependencies:

```powershell
npm install
npm run install:all
```

Create the backend environment file if it does not exist:

```powershell
if (-not (Test-Path server\.env)) { Copy-Item .env.example server\.env }
```

Edit `server/.env` and set the required database, JWT, and frontend origin values. Keep this file private and out of Git.

## 8. Environment Variables

`.env.example` contains placeholders only. Replace them in your private `server/.env` or the appropriate Vercel project settings. Never commit actual secrets, database URIs, passwords, JWT secrets, or private certificate contents. Do not put backend secrets in frontend `VITE_*` variables.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase Session Pooler PostgreSQL URI. |
| `DATABASE_SSL_CA` | Production | Full PEM contents of the Supabase database CA certificate. Leave blank for local development. |
| `JWT_SECRET` | Yes | Random secret of at least 32 bytes. Keep private. |
| `FRONTEND_ORIGIN` | Yes | Exact frontend origin. Multiple trusted origins can be comma-separated. |
| `NODE_ENV` | No | Use `development` locally. Vercel sets `production` for production deployments. |
| `PORT` | No | Local API port; defaults to `4000`. Vercel manages its own port. |
| `ADMIN_NAME` | Admin setup | Initial administrator's display name. |
| `ADMIN_EMAIL` | Admin setup | Initial administrator's email. |
| `ADMIN_PASSWORD` | Admin setup | Initial password; 12–72 UTF-8 bytes. Remove it after setup. |
| `VITE_API_BASE_URL` | Frontend production | Backend origin only; do not append `/api`. Leave blank locally to use Vite's proxy. |

Generate a JWT secret locally with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

## 9. Running the Application

Initialize the database if needed, create the initial admin account, and start both applications:

```powershell
npm run db:init
npm run admin:create
npm run dev
```

The frontend is at `http://localhost:5173`; the API listens on `http://localhost:4000`. Vite forwards `/api` requests to the local API.

To run one application by itself:

```powershell
npm run dev:client
npm run dev:server
```

The public inquiry page is at `/`. Admin sign-in is at `/admin/login`, and the dashboard is at `/admin`.

## 10. Admin Account Setup

Set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `server/.env`, then run:

```powershell
npm run admin:create
```

The command hashes the password with bcrypt. If the email already exists, it does not change that account. Remove `ADMIN_PASSWORD` from the environment after setup. Do not add a public admin-registration endpoint.

## 11. API Endpoints

All responses are JSON except logout, which returns `204 No Content`. Inquiry statuses are `New`, `In Progress`, `Resolved`, and `Rejected`.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Checks API and database connectivity. |
| `POST` | `/api/inquiries` | Public | Validates and submits an inquiry. |
| `GET` | `/api/auth/csrf` | Public | Issues a CSRF token and cookie. |
| `POST` | `/api/auth/login` | Public + CSRF | Checks admin credentials and sets an 8-hour JWT cookie. |
| `POST` | `/api/auth/logout` | Admin + CSRF | Clears the admin and CSRF cookies. |
| `GET` | `/api/auth/me` | Admin | Returns the signed-in admin profile. |
| `GET` | `/api/inquiries` | Admin | Lists inquiries and summary statistics. Supports `category`, `userType`, `status`, `search`, `page`, and `limit`; search covers name and phone, and limit is 1–100 (default 25). |
| `PATCH` | `/api/inquiries/:id/status` | Admin + CSRF | Updates an inquiry status. |

The frontend sends cookies with API requests. CORS allows only the configured `FRONTEND_ORIGIN`; wildcard origins are not used. Login is limited to 10 attempts per IP per 15 minutes, and public inquiry submission is limited to 20 per IP per 15 minutes.

## 12. Testing and Build

Run the backend tests and build the frontend from the project root:

```powershell
npm test
npm run build
```

The backend tests use a test database stub and do not require a live Supabase connection.

## 13. Deployment on Vercel

The frontend and backend are deployed as **two separate Vercel projects** from this repository. Supabase PostgreSQL remains the database.

### Frontend project

1. Set the Vercel **Root Directory** to `client`, with the Vite framework preset.
2. Use `npm run build` as the build command and `dist` as the output directory.
3. Set this Production environment variable:

   ```text
   VITE_API_BASE_URL=https://k12-hunar-crm-8s3a.vercel.app
   ```

   Use only the backend origin. The frontend already adds the `/api` route prefix. Redeploy the frontend after changing this variable.

### Backend project

1. Set the Vercel **Root Directory** to `server` and use the Express framework preset. Vercel serves the Express handler in `src/app.js`; `src/index.js` is for local development.
2. Set these Production environment variables:
   - `DATABASE_URL`: Supabase Session Pooler connection URI.
   - `DATABASE_SSL_CA`: Full PEM text of the CA certificate downloaded from this Supabase project's Database Settings. Keep certificate verification enabled.
   - `JWT_SECRET`: A private random secret of at least 32 bytes.
   - `FRONTEND_ORIGIN=https://k12-hunar-crm-ten.vercel.app`
3. Do not set `PORT` in Vercel. Do not put database credentials or `JWT_SECRET` in frontend variables.

The backend allows credentialed requests only from the exact `FRONTEND_ORIGIN`. Production JWT cookies are `Secure`, `HttpOnly`, and use `SameSite=None` for cross-origin frontend requests. No custom domains are required for these Vercel project URLs.

## 14. Live Application Links

- **Frontend:** [https://k12-hunar-crm-ten.vercel.app](https://k12-hunar-crm-ten.vercel.app/)
- **Admin sign-in:** [https://k12-hunar-crm-ten.vercel.app/admin/login](https://k12-hunar-crm-ten.vercel.app/admin/login)
- **Backend API health check:** [https://k12-hunar-crm-8s3a.vercel.app/api/health](https://k12-hunar-crm-8s3a.vercel.app/api/health)

The health endpoint returns `{"status":"ok"}` when the API can connect to PostgreSQL. To verify the application, submit an inquiry, sign in, review the inquiry list, and test search, filters, status updates, and sign-out.
