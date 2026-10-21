# Poké Center

A Pokémon collection tracker. This first slice provides a barebones development
readiness page; authentication and Pokémon features follow in separate tickets.

## Start with Docker (recommended)

Install Docker Desktop (or Docker Engine with Compose v2) and start the daemon.
No host Node.js, pnpm, PostgreSQL, or browser installation is needed for Docker use.

```sh
cp .env.example .env
docker compose up --build -d
docker compose logs -f app
```

Open <http://localhost:3000>. The page should report **Database connected** and a
database initialization timestamp. The check runs through TanStack Query, tRPC,
Zod, Prisma, and the actual PostgreSQL database. It also verifies the initial
migration was applied. The public readiness endpoint contains no account data.

- App: <http://localhost:3000>
- Mailpit inbox: <http://localhost:8025> (SMTP on localhost:1025)
- PostgreSQL: localhost:5432 (local-only credentials in `.env.example`)

Ports bind only to the local host. Change the port variables in `.env` if occupied.
If changing database credentials, update the host `DATABASE_URL` too. Existing
PostgreSQL volumes keep the credentials with which they were initialized; changing
environment variables does not change an existing database user's password.
The sample credentials are for local development only. Keep `.env` out of Git.

Inside Compose, the app uses `db:5432` and `mailpit:1025`, not `localhost`.
The Compose database variables define its connection URL; `DATABASE_URL` in `.env`
is for optional host commands. Use URL-safe database credentials or URL-encode
special characters in connection URLs.

Edit source files normally: the app bind mount supports Next.js hot reload. The
named volumes for container dependencies, Next.js output, and generated Prisma
Client prevent host/container artifacts from interfering with each other. Container
startup reconciles dependencies with the frozen lockfile, generates Prisma Client,
and applies committed migrations before serving the app.

The first build downloads dependencies and container images. Subsequent starts use
Docker's cache. This is a development image, not a production deployment image.
Netlify deployment, production SMTP, OAuth credentials, and image storage are follow-ups.

## Stop and restart without losing data

```sh
docker compose stop
# Resume the same containers:
docker compose start
# Or remove containers/networks while retaining every named volume:
docker compose down
docker compose up -d
```

The initialization timestamp stays the same after a restart because PostgreSQL
uses a persistent volume. PostgreSQL 18 data is mounted at `/var/lib/postgresql`,
which contains its version-specific data directory.

## Database migrations

Run commands in the app container after startup:

```sh
# After editing the Prisma schema, create and apply a migration locally:
docker compose exec app pnpm db:migrate --name describe_change
# Generate the client after schema changes:
docker compose exec app pnpm db:generate
# Apply committed migrations without creating new ones:
docker compose exec app pnpm db:deploy
# Inspect migration status:
docker compose exec app pnpm db:status
```

Commit schema changes and their SQL migrations together. The first migration adds
a single non-user readiness marker so the browser check proves schema initialization
and the timestamp can demonstrate persistence. Future auth tables arrive in issue #3.

For a **deliberate, destructive local reset**, stop the app and run Prisma's reset
interactively. Read its confirmation: it deletes the database contents and reapplies
migrations. Do not use this against shared or production databases.

```sh
docker compose stop app
docker compose run --rm --no-deps app pnpm exec prisma migrate reset
docker compose up -d app
```

Ordinary shutdown never deletes volumes. Avoid `docker compose down --volumes`
unless you intentionally want to erase all local database and tooling storage.

## Checks and browser tests

```sh
# Run against a running development container:
docker compose exec app pnpm check
# Build in an isolated one-off container while the app is stopped:
docker compose stop app
docker compose run --rm --no-deps app pnpm build
docker compose up -d --wait
# Browser runner with Chromium and OS dependencies inside Docker:
docker compose --profile test build e2e
docker compose --profile test run --rm e2e
```

The browser test loads the actual app against PostgreSQL, checks the database
status, and verifies the initialization timestamp survives a page reload. HTML
reports and failure traces appear under `artifacts/`. The test runner waits for the
app's database-backed health check. To diagnose a startup failure:

```sh
docker compose ps
docker compose logs app db
```

## Optional host tooling

The pinned runtime is Node.js **24.22.1** and package manager is **pnpm 12.14.0**.
Docker, package engines, and CI enforce these versions. For host editor tooling:

```sh
nvm install
nvm use
npm install --global pnpm@12.14.0
pnpm install --frozen-lockfile
pnpm db:generate
# Start just the services needed by a host app:
docker compose up -d db mailpit
pnpm db:deploy
pnpm dev
```

Copy `.env.example` to `.env` first. Stop the Compose app before using its host port.
For host browser tests, install Chromium once with `pnpm exec playwright install
chromium`, then run `pnpm test:e2e`. Use `PLAYWRIGHT_BASE_URL` for a different app port.

VS Code settings recommend ESLint, Prettier, Tailwind, and Prisma extensions and
format/fix on save. Install host dependencies to enable local TypeScript IntelliSense.
Root ESLint/Prettier configuration is authoritative; CI checks it regardless of editor.
ESLint 9 is pinned because Next.js's current React lint plugins do not support ESLint 10.
The starter Tailwind CSS is retained without a custom design system.

## Updates and security

GitHub Actions runs types, lint, formatting, a production build, and the Docker-based
browser smoke test on feature branches and pull requests. The separate security
workflow audits npm dependencies and scans the pinned Node, PostgreSQL, and Mailpit
images for fixable high/critical vulnerabilities on changes and weekly.

The full dependency audit is always reported, including development advisories.
Any high/critical production advisory fails the security check.
Currently `braces` has an unpatched development-only advisory
([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)) through
Next.js's lint tooling. It remains visible in the full audit rather than being
silenced through an advisory ignore list.

Dependabot checks npm, Dockerfile, Compose images, and Actions weekly once the
configuration reaches the default branch. Prisma updates stay within v7. Update the
Node version together in the Dockerfile, package engines, `.nvmrc`, `.node-version`,
and security workflow when reviewing a Node update; likewise keep pnpm's package
manager, engines, Dockerfile, and documented versions aligned. No automatic merging
is enabled. Vulnerability alerts can require fixes even before a version-update PR.
