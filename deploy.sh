#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Mantra AI — VPS Deployment Script
# Debian 12 / Ubuntu 22+ compatible
# ============================================

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"

echo "╔══════════════════════════════════════╗"
echo "║   Mantra AI — Deploy to Production   ║"
echo "╚══════════════════════════════════════╝"

# --- 1. Pre-flight checks ---
command -v docker >/dev/null 2>&1 || { echo "❌ Docker not installed. Run: curl -fsSL https://get.docker.com | sh"; exit 1; }
command -v docker compose >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose not found."; exit 1; }

if [ ! -f "$APP_DIR/.env" ]; then
  echo "⚠️  .env not found — copying from .env.example"
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo "📝 Edit .env with your values, then re-run this script."
  exit 1
fi

# --- 2. Pull latest code ---
echo ""
echo "📥 Pulling latest code..."
cd "$APP_DIR"
git pull --ff-only 2>/dev/null || echo "⚠️  Git pull skipped (not a git repo or conflicts)"

# --- 3. Build & start containers ---
echo ""
echo "🔨 Building and starting containers..."
docker compose -f "$COMPOSE_FILE" up -d --build

# --- 4. Health check ---
echo ""
echo "🏥 Running health checks..."
sleep 5

# Frontend
if curl -sf http://localhost:3000 > /dev/null 2>&1; then
  echo "✅ Frontend: OK (port 3000)"
else
  echo "❌ Frontend: NOT responding on port 3000"
fi

# Evolution API
if curl -sf http://localhost:8080/instance/fetchInstances 2>/dev/null | grep -q '\[' ; then
  echo "✅ Evolution API: OK (port 8080)"
else
  echo "⚠️  Evolution API: not responding (mungkin masih starting)"
fi

echo ""
echo "🎉 Deployment selesai!"
echo "   Frontend  → http://$(hostname -I | awk '{print $1}'):3000"
echo "   Evolution → http://$(hostname -I | awk '{print $1}'):8080"
echo ""
echo "💡 Untuk HTTPS, setup reverse proxy (Nginx/Caddy) di depan port 3000."
