# Backend Deployment — Railway

> Last updated: 2026-03-17

## Overview

The Airfare backend runs on **Railway** (Pro plan) with a managed PostgreSQL database. It auto-deploys on every push to `master` via GitHub integration.

- **Project**: aware-transformation
- **Region**: us-west2
- **Public URL**: `https://flight-tracker-production-c0bb.up.railway.app`
- **Health check**: `GET /health` → `{"status":"ok"}`

---

## Architecture

```
Mobile App (Expo)
    |
    | HTTPS (Railway auto-SSL)
    v
Railway Service (flight-tracker)
  - Node.js 22 (Express + cron jobs)
  - Root directory: /backend
  - Start script: scripts/start.js
    |
    | Private network (.railway.internal)
    v
Railway PostgreSQL (Postgres)
  - Managed, same project
  - DATABASE_URL pasted directly (not via ${{}} reference — reference didn't resolve)
```

---

## Railway Service Configuration

| Setting | Value |
|---------|-------|
| Root directory | `backend` |
| Build command | `npm ci && npx prisma generate && npm run build` |
| Start command | `node scripts/start.js` |
| Healthcheck path | `/health` |
| Restart policy | On failure (max 10 retries) |
| Node version | 22.x (auto-detected by Railpack) |

---

## How the Start Script Works

`scripts/start.js` handles a Prisma 7 quirk on Railway:

1. **Writes a temporary `.env` file** with `DATABASE_URL` — Prisma 7's `prisma.config.ts` uses `import "dotenv/config"` to load the URL, but Railway injects env vars at runtime without a `.env` file. Without this step, `prisma migrate deploy` fails with "Connection url is empty."
2. **Runs `prisma migrate deploy`** — applies any pending migrations (idempotent, safe to run on every deploy).
3. **Spawns `node dist/index.js`** — uses `spawn` (not `require`) so that `require.main === module` is true and the server actually starts listening.

```js
// Simplified flow:
fs.writeFileSync(".env", `DATABASE_URL="${process.env.DATABASE_URL}"\n`);
execSync("npx prisma migrate deploy");
spawn("node", ["dist/index.js"]);
```

### Why not just `node dist/index.js`?

Migrations need to run on every deploy. Prisma 7 removed `url` from the schema file — it must come from `prisma.config.ts`. But `prisma.config.ts` uses `dotenv/config` which needs a `.env` file to exist. On Railway, there's no `.env` file. The start script bridges this gap.

### Why the placeholder URL in prisma.config.ts?

```ts
url: process.env["DATABASE_URL"] || "postgresql://placeholder:placeholder@localhost:5432/placeholder"
```

During **build time**, `DATABASE_URL` is not available. `prisma generate` validates the config and fails if the URL is undefined. The placeholder lets the build pass — it's never used for actual connections.

---

## Environment Variables

Set these in the Railway backend service → **Variables** tab.

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string (paste the **private** URL from the Postgres service) | `postgresql://postgres:xxx@postgres.railway.internal:5432/railway` |
| `NODE_ENV` | Must be `production` | `production` |
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | JWT signing secret. Generate: `openssl rand -hex 32` | (64-char hex string) |
| `SERPAPI_KEY` | SerpAPI key for flight data | |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID | `541006...googleusercontent.com` |
| `GOOGLE_IOS_CLIENT_ID` | Google OAuth iOS client ID | |
| `GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android client ID | |
| `APPLE_KEY_ID` | Apple App Store Server API key ID | |
| `APPLE_ISSUER_ID` | Apple App Store Connect issuer ID | |
| `APPLE_BUNDLE_ID` | iOS app bundle identifier | `com.martinyis.skylens` |
| `APPLE_ENVIRONMENT` | `Sandbox` for testing, `Production` for live | `Production` |
| `APPLE_PRIVATE_KEY_BASE64` | Base64-encoded `.p8` key (see below) | |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` | `info` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:8081` |
| `EXPO_ACCESS_TOKEN` | Expo push token (avoids rate limits) | (none) |

### How to encode the .p8 key

```bash
base64 -i backend/keys/SubscriptionKey_TAQQHCA4DV.p8 | tr -d '\n' | pbcopy
# Paste clipboard contents as APPLE_PRIVATE_KEY_BASE64 in Railway
```

### DATABASE_URL Note

The `${{Postgres.DATABASE_URL}}` Railway variable reference **did not resolve** during our deployment. Instead, we copied the actual private URL string from the Postgres service → Variables → `DATABASE_URL` (click the eye icon to reveal) and pasted it directly into the backend service's `DATABASE_URL` variable. The private URL uses `.railway.internal` hostname — fast and no egress fees.

---

## Prisma 7 Specifics

- **Generator**: `prisma-client` (not `prisma-client-js`)
- **Driver adapter**: `@prisma/adapter-pg` — passed to `PrismaClient` constructor in `src/config/db.ts`
- **Generated client location**: `src/generated/prisma/` (gitignored)
- **Config file**: `prisma.config.ts` (required by Prisma 7)
- **Schema**: `prisma/schema.prisma` — no `url` field (Prisma 7 moved it to config)
- **Migrations**: `prisma/migrations/` — 14 migrations as of this writing

### Key constraint

Prisma 7 does NOT allow `url = env("DATABASE_URL")` in the schema's `datasource` block. The URL must come from `prisma.config.ts`. This is why the start script exists.

---

## Cron Jobs

Both run in-process (Railway keeps the Node.js process alive 24/7).

| Job | Schedule | What it does |
|-----|----------|--------------|
| Price check | Every 4 hours (`0 */4 * * *` UTC) | Checks tracked searches via SerpAPI sentinel strategy (3-4 API calls per search). Sends push notifications on price drops. Auto-deactivates expired searches. |
| Token cleanup | Daily 3 AM (`0 3 * * *` UTC) | Deletes expired/revoked refresh tokens from the database. |

---

## Rate Limiting

| Limiter | Scope | Limit |
|---------|-------|-------|
| Global | Per IP | 300 req / 15 min |
| Auth | Per IP | 30 req / 15 min |
| SerpAPI | Per user ID | 10 req / 1 min |

---

## API Routes

| Route | Auth | Description |
|-------|------|-------------|
| `GET /health` | No | Health check |
| `/api/auth/*` | No | Google/Apple sign-in, token refresh |
| `/api/search/*` | Yes | Flight search CRUD, results |
| `/api/credits/*` | Yes | Credit balance, transactions, purchases |

---

## Deployment Workflow

### Automatic (normal)

```bash
git push origin master
# Railway auto-builds and deploys in ~60-80 seconds
```

### What happens on deploy

1. Railway detects Node.js, runs `npm ci`
2. Build: `npm ci && npx prisma generate && npm run build` (TypeScript → `dist/`)
3. Start: `node scripts/start.js`
   - Writes `.env` for Prisma
   - Runs `prisma migrate deploy` (applies pending migrations)
   - Spawns `node dist/index.js`
4. Server starts on PORT, cron jobs begin

### Monitoring

- **Deploy logs**: Railway dashboard → deployment → Deploy Logs tab
- **Network logs**: Railway dashboard → deployment → Network Flow Logs tab
- **Health**: `curl https://flight-tracker-production-c0bb.up.railway.app/health`

---

## Database

- **Service name**: Postgres
- **Type**: Railway managed PostgreSQL
- **Data persistence**: Survives deploys, restarts, and crashes. Only deleted if you delete the Postgres service itself.
- **Backups**: Available in Railway dashboard → Postgres → Backups tab

---

## Cost Estimate

| Resource | Cost |
|----------|------|
| Railway Pro plan | $5/mo |
| Backend (~512MB RAM) | ~$3-5/mo |
| PostgreSQL (~1GB) | ~$3-5/mo |
| Bandwidth | ~$1/mo |
| **Total** | **~$12-15/mo** |

---

## Troubleshooting

### "Connection url is empty" from Prisma

The `.env` file isn't being written before `prisma migrate deploy`. Check that `scripts/start.js` is the start command and that `DATABASE_URL` is set in Railway variables.

### Build fails at `prisma generate`

The placeholder URL in `prisma.config.ts` might be missing. Ensure the fallback exists:
```ts
url: process.env["DATABASE_URL"] || "postgresql://placeholder:placeholder@localhost:5432/placeholder"
```

### App returns 502

Check Deploy Logs. Common causes:
- Missing env var (app exits with "Missing required environment variables")
- Database connection failed (wrong DATABASE_URL)
- Port mismatch (ensure PORT is set to 3000)

### Migrations fail

Check if the Postgres service is running and the DATABASE_URL points to it. You can also run migrations manually if needed by adding a one-off command in Railway.

### Server starts but never responds

Make sure the start command is `node scripts/start.js` (which uses `spawn`), not a direct `require()` — otherwise `require.main !== module` and the server doesn't listen.

---

## Key Files

| File | Purpose |
|------|---------|
| `scripts/start.js` | Startup orchestrator (env → migrate → spawn app) |
| `prisma.config.ts` | Prisma 7 config (datasource URL, schema path) |
| `prisma/schema.prisma` | Database schema (models, indexes) |
| `src/index.ts` | Express app, routes, env validation, graceful shutdown |
| `src/config/db.ts` | PrismaClient singleton with PG adapter |
| `src/workers/priceCheckWorker.ts` | Cron jobs (price check + token cleanup) |
| `.env.example` | Template for all environment variables |
| `tsconfig.json` | TypeScript config (compiles `src/` → `dist/`) |
