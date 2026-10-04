# Railway deployment runbook

Deploys the whole repo as **three Railway services** — Postgres (plugin) + `api` + `web` — on the **Hobby** plan, using a **per-service Dockerfile** for each app.

> **Why Dockerfiles?** Railway's default builder is now **Railpack** (it replaced Nixpacks), which ignores `NIXPACKS_*` variables and can't resolve a start command at a pnpm-workspace root ("No start command detected"). For a shared monorepo the reliable, CLI-drivable path is a Dockerfile per service, selected with the `RAILWAY_DOCKERFILE_PATH` **service variable**. The build context is the repo root, so each Dockerfile copies the whole workspace and runs filtered `pnpm --filter <svc>` build/start commands.

Live deployment (project `shop-management`, id `bb740cba-e2d7-4ec5-86f8-e68085c1d6bd`):
- **web** → https://web-production-a1b81.up.railway.app
- **api** → https://api-production-0e22d.up.railway.app (Swagger at `/docs`)

Files that make it work (committed in the repo):
- `apps/api/Dockerfile` — installs the workspace, `pnpm --filter api build`; CMD = `migrate deploy → bootstrap:owner → start`. Installs OpenSSL for Prisma.
- `apps/web/Dockerfile` — installs the workspace, `ARG NEXT_PUBLIC_API_URL` (inlined into the client bundle), `pnpm --filter web build`; CMD = `next start -p $PORT`.
- `.dockerignore` — keeps `node_modules`/`dist`/`.next`/`.env` out of the build context.

> ⚠️ **Auth is mandatory.** `JWT_SECRET` is read at api boot (crash-loop without it), and a fresh DB has **zero login-capable users** until `bootstrap:owner` runs. Step 3 sets both. Do **not** run the dev seed (`db:seed`) in a real deployment — it wipes every table and uses public PINs.

Run from the repo root, in order:

```bash
# 1. Provision
railway add -d postgres
railway add -s api
railway add -s web

# 2. Public domains (target port 8080, matched by PORT below)
railway domain --service api --port 8080     # -> https://<api-domain>
railway domain --service web --port 8080     # -> https://<web-domain>

# 3. api service configuration
#    - RAILWAY_DOCKERFILE_PATH selects the Dockerfile (relative to repo root).
#    - JWT_SECRET: generated fresh; the api throws at boot if unset.
#    - ALLOWED_ORIGINS: the EXACT web origin — https, no trailing slash, no path
#      (CORS is exact-string matched; a mismatch breaks the browser UI while curl still works).
#    - BOOTSTRAP_OWNER_*: the first-owner login, created once on first boot (idempotent).
#    - WEB_APP_URL: where the OAuth callback sends the browser, and the origin the
#      provider redirect URI is built from. Same value as ALLOWED_ORIGINS.
#    - PORT=8080 matches the domain target port.
railway variables --service api \
  --set 'RAILWAY_DOCKERFILE_PATH=apps/api/Dockerfile' \
  --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --set 'ALLOWED_ORIGINS=https://<web-domain>' \
  --set 'WEB_APP_URL=https://<web-domain>' \
  --set "JWT_SECRET=$(openssl rand -hex 32)" \
  --set 'BOOTSTRAP_OWNER_USERNAME=owner' \
  --set 'BOOTSTRAP_OWNER_PIN=<choose 4-6 digits>' \
  --set 'BOOTSTRAP_SHOP_NAME=Demo Shop' \
  --set 'PORT=8080'

# 3b. (optional) Sign in with Google — read at REQUEST time, so this is a plain redeploy,
#     and the button simply doesn't render until both values are present.
#     Full walkthrough: docs/oauth-setup.md
# railway variables --service api \
#   --set 'GOOGLE_CLIENT_ID=<client id>' \
#   --set 'GOOGLE_CLIENT_SECRET=<client secret>'

# 4. web service configuration
#    NEXT_PUBLIC_API_URL is read at BUILD time (Docker ARG in apps/web/Dockerfile) and
#    inlined into the client bundle; Railway exposes service variables to the build.
railway variables --service web \
  --set 'RAILWAY_DOCKERFILE_PATH=apps/web/Dockerfile' \
  --set 'NEXT_PUBLIC_API_URL=https://<api-domain>' \
  --set 'PORT=8080'

# 5. Deploy (uploads repo root; .gitignore respected)
railway up --service api --detach
railway up --service web --detach

# 6. Smoke test
curl https://<api-domain>/health                     # {"status":"ok"}
curl https://<api-domain>/docs/                       # Swagger UI
curl -s -X POST https://<api-domain>/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"owner","pin":"<your-pin>"}'         # -> { token, user } (the bootstrap owner)
open https://<web-domain>                             # log in as owner / <your-pin>
```

## Notes

- **Migrations:** the api Dockerfile CMD runs `prisma migrate deploy` on boot and applies all **5** migrations (init incl. partial unique indexes; fitment CHECK; part grades + copy links; user credentials; invoices). No-op once current.
- **First owner:** `bootstrap:owner` (`apps/api/src/scripts/createOwner.ts`) creates one shop + one OWNER from `BOOTSTRAP_OWNER_*`, then no-ops on every later boot (skips once any user exists; never deletes data). Add more users by logging in as the owner and provisioning them in the UI (OWNER-only).
- **Empty catalog:** the bootstrap installs no demo parts — add stock from the app (the mobile "New part" flow is built for this).
- **Ports:** each domain targets 8080 and each service sets `PORT=8080`, so the app and the edge proxy agree. `next start -p $PORT` / `server.ts` both honor it.
- **Redeploy:** `railway up --service <svc> --detach` from the repo root re-uploads the working tree (no git push needed).

## Hobby-tier cost

Three always-on services (Postgres + api + web) each consume compute/memory against the Hobby monthly credit; Postgres also uses a little volume storage. Not scale-to-zero — the three run continuously. Watch usage in the dashboard; to trim cost between demos, pause or delete `api`/`web` (Postgres keeps the data).

## Hardening for a real (non-demo) instance

1. **Rotate the owner PIN** and pick a non-obvious `BOOTSTRAP_OWNER_USERNAME`.
2. **Decouple migrations from boot:** move `migrate deploy` + `bootstrap:owner` into Railway's **Pre-Deploy Command** and set the container CMD to just `pnpm --filter api start`; set **Healthcheck Path = `/health`**.
3. **Cap the DB pool:** append `?connection_limit=10&pool_timeout=20` to `DATABASE_URL` (or use PgBouncer).
4. **Keep the api at 1 replica** while migrations run at boot (Prisma serializes with a 10 s advisory lock).
