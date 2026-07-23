# Build context is the repo ROOT (Railway builds from root when RAILWAY_DOCKERFILE_PATH
# is set), so every path here is relative to the monorepo root.
FROM node:22-slim

RUN corepack enable
WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

# Next inlines NEXT_PUBLIC_* into the client bundle, and bakes rewrite destinations
# into the routes manifest, at BUILD time. Railway build-time variables are only
# visible when declared as ARG, so declare them before the build.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG API_PROXY_TARGET
ENV API_PROXY_TARGET=$API_PROXY_TARGET
RUN pnpm --filter web build

ENV NODE_ENV=production
EXPOSE 8080

CMD ["sh", "-c", "pnpm --filter web exec next start -p ${PORT:-8080} -H 0.0.0.0"]
