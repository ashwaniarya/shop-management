# Password sign-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 4–6 digit PIN login with a username and password, and keep the session in an httpOnly cookie.

**Architecture:** Shared Zod policy rejects short and digits-only passwords. The API still bcrypt-hashes `password_hash`, puts `tokenVersion` in the JWT, and sets cookie `shop_session`. Existing PIN hashes log in once (`mustChangePassword`) and must set a real password. The browser sends `credentials: 'include'` and does not use `localStorage`. Bearer stays valid for tests and scripts.

**Tech Stack:** Next.js, Express, Prisma, PostgreSQL, bcryptjs, jsonwebtoken, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-password-auth-design.md`

Created: 2026-11-22. Implementation: 2026-11-22.

## Global Constraints

- Policy numbers live only in `packages/shared/src/authPolicy.ts`: min length 10, digits-only rejected, 5 failures, 15 minute lock, session `12h`, upgrade cookie 10 minutes, cookie names `shop_session` and `shop_password_upgrade`.
- Lock and bad password share `Invalid username or password`. A locked account fails even when the password is correct.
- Username stays the login id. No email reset. Owner-only staff create stays.
- Do not commit. The user asked to fix the code, not to commit it.
- Login body field is `password`. It accepts a policy password or a legacy 4–6 digit PIN so an old account can reach the upgrade step. Register, staff create, and upgrade accept only a policy password.

## Review Focus

- A 10-digit number must not become a password. Covered by shared schema tests.
- A correct password during `lockedUntil` stays 401. Covered by the auth service test.
- Logout makes the previous JWT fail `/auth/me`. Covered by the auth route test.
- Login JSON has no `token`, and `Set-Cookie` is httpOnly. Covered by the auth route test.
- A legacy PIN on a `mustChangePassword` user returns 409 and does not open a session. Covered by the auth route test.

### Task 1: Policy, schema, session columns, login cookie, web forms

**Files:** shared auth policy and schemas, Prisma `User`, API auth service and routes, web login/register/staff form, seed and bootstrap env passwords, OpenAPI.

**Interfaces:**
- Consumes: existing `login`, `hashPin`, `signToken`, `authenticate`.
- Produces: `passwordSchema`, `loginSchema.password`, `hashPassword`, `MustChangePasswordError`, `signUpgradeToken`, cookie `shop_session`.

- [x] **Step 1: Implement the spec and update tests that post `pin` to a schema.**
- [x] **Step 2: Shared tests 71/71 and web tests 107/107 passed. API tests not run: Postgres on port 5433 was down.**
- [x] **Step 3: Do not commit.**
