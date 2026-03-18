# Railway Deployment Guide — Airfare Backend (TestFlight)

Deploy the Express + PostgreSQL backend to Railway so the React Native app can be submitted to TestFlight.

---

## Architecture Overview

```
Mobile App (TestFlight)
        |
        | HTTPS (auto-provisioned)
        v
  Railway Service (api.skylens.app)
    - Node.js process (Express + cron jobs)
    - Environment variables in Railway dashboard
    - .p8 key via base64 env var
        |
        | Internal networking
        v
  Railway PostgreSQL
    - Managed, same project
    - Auto-provisioned DATABASE_URL
```

Everything lives in a single Railway project. No VPCs, security groups, or load balancers to configure.

---

## 1. Why Railway

- **git push deploys** — connect GitHub, every push to `master` deploys automatically
- **Persistent process** — your `node-cron` jobs (price check every 4h, token cleanup daily) run fine since Railway keeps the process alive (unlike Lambda/serverless)
- **Built-in PostgreSQL** — one click, gives you a `DATABASE_URL` instantly
- **Auto HTTPS** — free SSL on custom domains, zero config
- **No infrastructure to manage** — no EC2, no SSH, no PM2, no security groups

---

## 2. Step-by-Step Deployment

### Step 1: Create a Railway Account and Project

1. Go to [railway.app](https://railway.app) and sign up (GitHub login works)
2. Click **New Project**
3. Choose **Deploy from GitHub repo** → select your `flight-tracker` repo

### Step 2: Configure the Backend Service

Railway will detect your repo. You need to tell it to deploy only the backend:

- **Root directory**: Set to `backend` in service settings
- **Build command**: `npm ci && npx prisma generate && npm run build`
- **Start command**: `node dist/index.js`

### Step 3: Add PostgreSQL

1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**
2. Railway auto-provisions it and creates a `DATABASE_URL` variable
3. Click on the PostgreSQL service → **Connect** → copy the `DATABASE_URL`
4. Add it to your backend service's environment variables (or use Railway's variable references: `${{Postgres.DATABASE_URL}}`)

### Step 4: Set Environment Variables

In your backend service → **Variables** tab, add:

```
# Database (use Railway's reference or paste the URL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# App
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Auth
JWT_SECRET=<generate with: openssl rand -hex 32>
GOOGLE_CLIENT_ID=541006511724-n8kkpu2af7djamqcv3f95fku179bqvkc.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=541006511724-9doi917bte93hgln5d86ff33a6bj5ah1.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=949286619491-o6etm64pprte6j89i6b75rqmkiss404j.apps.googleusercontent.com

# Apple IAP
APPLE_KEY_ID=TAQQHCA4DV
APPLE_ISSUER_ID=6e16684f-51a3-49a5-9750-d141c2e3a8f6
APPLE_BUNDLE_ID=com.martinyis.skylens
APPLE_ENVIRONMENT=Sandbox
APPLE_PRIVATE_KEY_BASE64=<base64-encoded .p8 key — see Step 5>

# SerpAPI
SERPAPI_KEY=<your-key>
```

### Step 5: Handle the .p8 Key File

Railway doesn't have filesystem access, so you can't upload files. Instead, base64-encode the key and pass it as an env var.

**On your Mac:**
```bash
base64 -i backend/keys/SubscriptionKey_TAQQHCA4DV.p8 | tr -d '\n'
```

Copy the output and set it as `APPLE_PRIVATE_KEY_BASE64` in Railway.

**Then update `appleIapService.ts`** to read from the env var when the file path doesn't exist:

```typescript
function getPrivateKey(): string {
  // Railway: read from base64 env var (no filesystem access)
  if (process.env.APPLE_PRIVATE_KEY_BASE64) {
    return Buffer.from(process.env.APPLE_PRIVATE_KEY_BASE64, "base64").toString("utf8");
  }
  // Local dev: read from file
  return fs.readFileSync(process.env.APPLE_KEY_PATH!, "utf8");
}
```

This way local dev still uses the file, and Railway uses the env var.

### Step 6: Run Database Migrations

Railway lets you run one-off commands. In the backend service:

1. Go to **Settings** → **Deploy** → you can add a **deploy command** that runs before the start command
2. Or set the **build command** to: `npm ci && npx prisma generate && npx prisma migrate deploy && npm run build`

This runs migrations on every deploy. Since `prisma migrate deploy` is idempotent (skips already-applied migrations), this is safe.

### Step 7: Add a Custom Domain

1. In your backend service → **Settings** → **Networking** → **Custom Domain**
2. Add `api.skylens.app` (or whatever domain you own)
3. Railway gives you a CNAME record to add at your DNS provider
4. Railway auto-provisions an SSL certificate (free, auto-renewing)

If you don't have a domain yet, Railway gives you a free `*.up.railway.app` subdomain that works immediately.

### Step 8: Update the Mobile App

In `frontend/src/lib/api/client.ts`, change the baseURL to your Railway domain:

```typescript
const api = axios.create({
  baseURL: "https://api.skylens.app/api",  // or your-app.up.railway.app/api
});
```

### Step 9: Deploy

Just push to GitHub:
```bash
git push origin master
```

Railway auto-builds and deploys. Watch the build logs in the Railway dashboard.

Verify:
```bash
curl https://api.skylens.app/health
# Should return: {"status":"ok"}
```

---

## 3. Cost Estimate

Railway Pro plan ($5/month base) is required for persistent services.

| Resource | Spec | Cost |
|---|---|---|
| Pro plan | Base fee | $5/mo |
| Backend | ~512MB RAM, always on | ~$3-5/mo |
| PostgreSQL | ~1GB storage | ~$3-5/mo |
| Bandwidth | Minimal API traffic | ~$1/mo |
| **Total** | | **~$12-15/mo** |

---

## 4. Deployment Workflow (Day-to-Day)

### Automatic (recommended)

Push to GitHub → Railway auto-deploys:
```bash
git add .
git commit -m "fix: whatever"
git push origin master
# Done. Railway builds and deploys in ~60 seconds.
```

### Manual (if auto-deploy is off)

Click **Deploy** in the Railway dashboard, or use the Railway CLI:
```bash
railway up
```

### Running Prisma Migrations

If migrations are in your build command, they run automatically on every deploy.

If not, use the Railway CLI:
```bash
railway run npx prisma migrate deploy
```

---

## 5. Monitoring and Debugging

### Logs

- Railway dashboard → click your service → **Logs** tab (live streaming)
- Or via CLI: `railway logs`

### Health Check

Railway can ping your `/health` endpoint. Configure it in:
- Service → **Settings** → **Healthcheck Path** → `/health`

If the health check fails, Railway will restart the service.

### Common Issues

1. **Build fails** — Check build logs. Usually a missing dependency or TypeScript error.
2. **Service crashes on start** — Check runtime logs. Usually a missing env var.
3. **Database connection refused** — Make sure `DATABASE_URL` is set correctly (use `${{Postgres.DATABASE_URL}}` reference).
4. **Migrations fail** — Check if the Prisma schema matches the migration files.

---

## 6. Things That Just Work (No Changes Needed)

- **Push notifications**: Expo's push API works from anywhere
- **Apple IAP verification**: HTTPS calls to Apple's servers
- **Google/Apple OAuth**: JWT verification fetches public keys automatically
- **node-cron**: Runs in-process, Railway keeps the process alive
- **Graceful shutdown**: Railway sends SIGTERM before stopping — your shutdown handler in `index.ts` handles this
- **Rate limiting**: Works correctly (Railway sets `X-Forwarded-For` and you have `trust proxy` enabled)

---

## 7. When to Move to AWS

Railway is great up to ~10,000 active users. Consider AWS (ECS + RDS + ALB) when:

- You need multiple backend instances (horizontal scaling)
- You need a distributed cron scheduler (only one instance should run crons)
- Railway costs exceed equivalent AWS costs (~$50+/mo)
- You need VPC-level network isolation or compliance requirements

---

## 8. Checklist

### Before deploying:
- [ ] Railway account created (Pro plan)
- [ ] GitHub repo connected
- [ ] Backend service configured (root directory: `backend`)
- [ ] PostgreSQL added to project
- [ ] All environment variables set (see Step 4)
- [ ] `.p8` key base64-encoded and set as `APPLE_PRIVATE_KEY_BASE64`
- [ ] `appleIapService.ts` updated to read base64 env var
- [ ] Build command includes `prisma generate` and `prisma migrate deploy`
- [ ] Custom domain added (or using Railway's default subdomain)

### After deploying:
- [ ] `curl https://your-domain/health` returns OK
- [ ] Sign in with Google/Apple OAuth from TestFlight build
- [ ] Create a search and verify results
- [ ] Purchase credits (sandbox IAP) and verify balance updates
- [ ] Wait for cron to run and verify tracking works
- [ ] Verify push notification arrives
