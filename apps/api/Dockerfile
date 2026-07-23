# Build context is the repo ROOT (Railway builds from root when RAILWAY_DOCKERFILE_PATH
# is set), so every path here is relative to the monorepo root.
FROM node:22-slim

# Prisma's query engine needs OpenSSL (at `prisma generate` and at runtime).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /app

COPY . .

# devDependencies (prisma CLI, tsc, typescript) are needed to build; NODE_ENV is left
# unset here so pnpm installs them, then set to production for the runtime below.
RUN pnpm install --frozen-lockfile
RUN pnpm --filter api build

ENV NODE_ENV=production
EXPOSE 8080

# Apply migrations -> idempotent first-owner bootstrap -> start the server.
CMD ["sh", "-c", "pnpm --filter api exec prisma migrate deploy && pnpm --filter api run bootstrap:owner && pnpm --filter api start"]
