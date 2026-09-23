#!/usr/bin/env bash
# Idempotent dependency install for the Cloud Agent environment.
# System packages (docker, supabase CLI) are provided by the base image/snapshot.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[install] Installing npm dependencies..."
npm install

echo "[install] Done."
