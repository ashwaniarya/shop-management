# Railway deployment runbook

Project already created: `shop-management` (https://railway.com/project/bb740cba-e2d7-4ec5-86f8-e68085c1d6bd), CLI linked from this repo.

Run from the repo root, in order:

```bash
# 1. Provision
railway add --database postgres
railway add --service api
railway add --service web

# 2. Public domains (needed before env vars so URLs are known)
railway domain --service api
railway domain --service web
# note the two generated URLs; substitute below

# 3. api service configuration
railway variables --service api \
  --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --set 'ALLOWED_ORIGINS=https://<web-domain>' \
  --set 'NIXPACKS_BUILD_CMD=pnpm install --frozen-lockfile && pnpm --filter api build' \
  --set 'NIXPACKS_START_CMD=pnpm --filter api exec prisma migrate deploy && pnpm --filter api start'

# 4. web service configuration
#    NEXT_PUBLIC_API_URL must be present at BUILD time (Next.js inlines it);
#    Railway injects service variables during build, so a normal variable works.
railway variables --service web \
  --set 'NEXT_PUBLIC_API_URL=https://<api-domain>' \
  --set 'NIXPACKS_BUILD_CMD=pnpm install --frozen-lockfile && pnpm --filter web build' \
  --set 'NIXPACKS_START_CMD=pnpm --filter web exec next start -p $PORT'

# 5. Deploy (uploads repo root; .gitignore respected)
railway up --service api --detach
railway up --service web --detach

# 6. Seed once (optional, sample data)
railway run --service api pnpm --filter api db:seed

# 7. Smoke test
curl https://<api-domain>/health          # {"status":"ok"}
curl https://<api-domain>/docs/           # Swagger UI
open https://<web-domain>                 # dashboard against live API
```

Notes:
- `prisma migrate deploy` runs on every api boot (start command) — applies all migrations (currently 3: init incl. partial unique indexes; fitment CHECK constraint; part grades + copy links incl. the `part_copy_of_not_self` CHECK).
- The api reads `openapi.yaml` from the repo root at boot — both services deploy the whole repo, so the file is present.
- Keep both services on whole-repo deploys (no root-directory setting needed; the NIXPACKS_* commands scope the work).
