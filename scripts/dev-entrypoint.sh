#!/bin/sh
set -eu

# Reconcile the named dependency volume with the current checkout's lockfile.
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:deploy
exec pnpm dev
