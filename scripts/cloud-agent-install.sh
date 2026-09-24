#!/usr/bin/env bash
# Idempotent dependency install for the Cloud Agent environment.
# Installs the system tools the app needs (Docker + Supabase CLI) and the npm
# dependencies. Safe to run repeatedly; skips work that is already done.
set -euo pipefail

cd "$(dirname "$0")/.."

# --- System packages: Docker + helpers --------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  echo "[install] Installing Docker and helpers..."
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    -o Dpkg::Options::=--force-confold -o Dpkg::Options::=--force-confdef \
    docker.io docker-compose-v2 fuse-overlayfs uidmap iptables
fi
# Nested containers need the legacy iptables backend for container networking.
sudo update-alternatives --set iptables /usr/sbin/iptables-legacy >/dev/null 2>&1 || true
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy >/dev/null 2>&1 || true

# --- Supabase CLI ------------------------------------------------------------
if ! command -v supabase >/dev/null 2>&1; then
  echo "[install] Installing Supabase CLI..."
  ver="$(curl -fsSL https://api.github.com/repos/supabase/cli/releases/latest \
    | grep -oP '"tag_name": "\K[^"]+')"
  curl -fsSL -o /tmp/supabase.deb \
    "https://github.com/supabase/cli/releases/download/${ver}/supabase_${ver#v}_linux_amd64.deb"
  sudo dpkg -i /tmp/supabase.deb
  rm -f /tmp/supabase.deb
fi

# --- Node dependencies -------------------------------------------------------
echo "[install] Installing npm dependencies..."
npm install

echo "[install] Done."
