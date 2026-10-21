FROM node:24.22.1-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@12.14.0

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS development
COPY . .
RUN pnpm db:generate
EXPOSE 3000
CMD ["sh", "scripts/dev-entrypoint.sh"]

FROM dependencies AS browser-dependencies
RUN pnpm exec playwright install --with-deps chromium

FROM browser-dependencies AS e2e
COPY . .
ENV CI=true
CMD ["pnpm", "test:e2e"]
