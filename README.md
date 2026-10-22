# Poké Center

A Pokémon collection tracker. This slice provides email/password signup and email
verification. Sign-in UI, protected application routes, and Pokémon features follow
in separate tickets.

## Start with Docker (recommended)

Install Docker Desktop (or Docker Engine with Compose v2) and start the daemon.
No host Node.js, pnpm, PostgreSQL, or browser installation is needed for Docker use.

```sh
docker compose build app
docker compose run --rm --no-deps --user "$(id -u):$(id -g)" app node scripts/setup-env.mjs
docker compose up -d
docker compose logs -f app
```

Open <http://localhost:3000> to create an account with email and a password of
16–128 characters. Open Mailpit, find the verification message, and follow its
link. No external email credentials are needed. Verification links expire after an
hour. The pending-verification page allows resending with a 60-second UI cooldown;
the server separately enforces request limits using PostgreSQL-backed counters.

The setup command creates `.env` from `.env.example` if absent and generates a
random auth secret without printing it. Re-running it preserves the secret and
existing settings. Keep this secret stable: changing it invalidates outstanding
links and sessions. Never commit `.env`; production secrets and SMTP delivery are
separate deployment work.

The development-only readiness UI is at <http://localhost:3000/development>. It
reports **Database connected** and a persistent initialization timestamp through
TanStack Query, tRPC, Zod, Prisma, and PostgreSQL. `/api/health` remains a public,
non-user infrastructure check; neither endpoint exposes account data.

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

`BETTER_AUTH_URL` must match the URL used to open the app (default
`http://localhost:3000`), including its port. SMTP settings default to Mailpit inside
Compose. For host tooling use the SMTP settings from `.env.example`. The app derives
the required internal display name as `Trainer`; users only enter email/password.
Unverified users cannot authenticate, verification does not automatically sign them
in, and session cookie caching is disabled for immediate database validation.

Signup is limited to 20 requests per minute per client IP, verification-email
requests to 5, and verification attempts to 30. Limits are enabled in development
too and survive app restarts. Before exposing a production origin, configure the
hosting proxy to sanitize forwarded client-IP headers; the local Compose ports
are bound to loopback. Verification query strings are excluded from Next.js's
development request logging so bearer links are not written to app logs.

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
and the timestamp can demonstrate persistence. The signup migration adds Better Auth
user, account, session, verification, and rate-limit tables without dropping existing data.

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

The browser tests load the actual app against PostgreSQL and Mailpit. They cover
signup, server/client password validation, verification, invalid/expired links,
resend controls, duplicate signup, server rate limits, and database readiness.
HTML reports and failure traces appear under `artifacts/`. The runner waits for
the app's database-backed health check and shares its network namespace so emailed
`localhost:3000` links work unchanged inside Chromium. Docker browser tests use this
default origin; for a custom host port use host tests with `PLAYWRIGHT_BASE_URL`
set to the same URL as `BETTER_AUTH_URL`.

Tests use unique synthetic addresses and a simulated forwarded client IP per run,
so rerunning the suite does not exhaust another run's IP allowance. The expired-link
case signs a deliberately expired fixture with the local test secret; it adds no
application bypass and does not alter database state to fake verification.
To diagnose a startup failure:

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
node scripts/setup-env.mjs
pnpm db:generate
# Start just the services needed by a host app:
docker compose up -d db mailpit
pnpm db:deploy
pnpm dev
```

The setup script initializes `.env` and the local auth secret. Stop the Compose app
before using its host port.
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

Container scans retain unfiltered JSON reports as Actions artifacts. Exceptions in
`.trivyignore.yaml` cover only the reviewed upstream npm-tooling and `gosu` findings
in the pinned Node/PostgreSQL images. They are scoped by CVE and affected file path,
expire on November 22, 2026, and do not suppress new CVEs or findings in app packages.
Recheck the published images and remove resolved exceptions before renewing any.
Mailpit was upgraded to v1.32.0 to fix its reported Go runtime vulnerability.

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
