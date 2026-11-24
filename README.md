# Shop Management System

A mobile-first, multi-tenant management system for small shops — first use case: a vehicle spare-parts counter. Catalog, inventory ledger, roles, and a point-of-sale that prints a receipt, all built to run fast on a phone.

**🔗 Live demo: https://web-production-a1b81.up.railway.app** — [**sign up**](https://web-production-a1b81.up.railway.app/register) to create your own shop, or explore the demo account `owner` / `4268`.

## Features

- 📱 **Runs on a phone** — responsive shell, mobile "add part" flow, mobile POS
- 🔐 **Auth + RBAC** — sign in with Google (OAuth 2.0 + OIDC) or username + PIN; OWNER / MANAGER / STAFF, every request scoped to the user's shop
- 🧾 **Point of sale** — search → cart → atomic, gapless-numbered invoice → printable receipt; stock decrements through the ledger
- 📦 **Catalog & inventory** — parts, fitment, cross-references, grades & copy families, per-shop selling price, a signed stock ledger
- 🆕 **Self-service sign-up** — anyone can register and get a fresh shop with an owner account
- 🌐 **Social login** — Authorization Code + PKCE via an OpenID-certified library; owners sign in with Google, counter staff keep the fast PIN ([setup](docs/oauth-setup.md))

## Stack

- `apps/api` — Express + TypeScript + Prisma (PostgreSQL); OpenAPI 3.1 served as Swagger UI at `/docs`
- `apps/web` — Next.js 15 (App Router) + React 19 + Tailwind v4
- `packages/shared` — zod schemas + types shared between web and api
- [Domain model](docs/domain-model.md) · [API contract](openapi.yaml) · [Railway deploy runbook](docs/deploy-railway.md) · [Social login setup](docs/oauth-setup.md)

## Local development

```bash
pnpm install
pnpm db:up            # start PostgreSQL via docker compose (host port 5433)
cp .env.example apps/api/.env
pnpm --filter api db:migrate
pnpm --filter api db:seed
pnpm dev              # api on :4000 (Swagger at /docs), web on :3000
pnpm test             # shared + api + web
```

### Demo logins (local seed)

`apps/api/prisma/seed.ts` installs sample data — sign in with `{ username, pin }`:

| Username  | PIN  | Shop    | Role    |
|-----------|------|---------|---------|
| `owner`   | 1111 | Main    | OWNER   |
| `manager` | 2222 | Main    | MANAGER |
| `staff`   | 3333 | Main    | STAFF   |
| `highway` | 4444 | Highway | OWNER   |

Or open `/register` and create your own shop (username + 6-digit PIN).

**Sign in with Google** is off until credentials are configured — set `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` and the button appears on `/login` and `/register`; without them the
app is PIN-only and nothing breaks. See the [social login setup guide](docs/oauth-setup.md).

Deployed on **Railway** (Postgres + api + web); see the [deploy runbook](docs/deploy-railway.md).
