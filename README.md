# Shop Management System

Multi-shop management system; first use case: vehicle spare-parts shop.

- [Domain model](docs/domain-model.md) — entities, ERD, fitment design, grades & copy families, stock ledger
- [API contract](openapi.yaml) — OpenAPI 3.1, served as Swagger UI at `/docs`
- `apps/api` — Express + TypeScript + Prisma (PostgreSQL)
- `apps/web` — Next.js + TypeScript + Tailwind
- `packages/shared` — zod schemas + types shared between web and api

## Local development

```bash
pnpm install
pnpm db:up            # start PostgreSQL 16 via docker compose
cp .env.example apps/api/.env
pnpm --filter api db:migrate
pnpm --filter api db:seed
pnpm dev              # api on :4000 (Swagger at /docs), web on :3000
```

### Demo logins

Seeded by `apps/api/prisma/seed.ts` — sign in via `POST /auth/login` with `{ username, pin }`:

| Username  | PIN  | Shop    | Role    |
|-----------|------|---------|---------|
| `owner`   | 1111 | Main    | OWNER   |
| `manager` | 2222 | Main    | MANAGER |
| `staff`   | 3333 | Main    | STAFF   |
| `highway` | 4444 | Highway | OWNER   |

Deployment target: Railway (Postgres + api + web services).
