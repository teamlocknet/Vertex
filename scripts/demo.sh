#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── 1. Check required commands ────────────────────────────────────────────────
for cmd in anvil forge node pnpm; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Missing required command: $cmd"
    exit 1
  fi
done

# ── 2. Kill any existing processes on demo ports ──────────────────────────────
for port in 8545 8080 3001 3000; do
  lsof -ti:"$port" | xargs kill -9 2>/dev/null || true
done

# ── 3. Start Anvil ────────────────────────────────────────────────────────────
anvil --block-time 1 >/tmp/vertex-anvil.log 2>&1 &
sleep 2

# ── 4. Deploy contracts ───────────────────────────────────────────────────────
cd "$ROOT_DIR/packages/contracts"
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast 2>&1 || {
  echo "Deploy failed"
  exit 1
}
cd "$ROOT_DIR"

# ── 5. Sleep after deploy ─────────────────────────────────────────────────────
sleep 1

# ── 6. Start indexer ──────────────────────────────────────────────────────────
node packages/backend/src/indexer.js >/tmp/vertex-indexer.log 2>&1 &

# ── 7. Start REST server ──────────────────────────────────────────────────────
node packages/backend/src/server.js >/tmp/vertex-server.log 2>&1 &

# ── 8. Start frontend ─────────────────────────────────────────────────────────
pnpm --filter frontend dev >/tmp/vertex-frontend.log 2>&1 &

# ── 9. Print ready message and exit ──────────────────────────────────────────
sleep 3
cat <<'EOF'

✅ Vertex stack is ready

→ Frontend:  http://localhost:3000
→ REST API:  http://localhost:3001
→ WebSocket: ws://localhost:8080
→ Anvil RPC: http://localhost:8545

Attack monolith: node packages/attacker/src/attack.js --target monolith
Attack vertex:   node packages/attacker/src/attack.js --target vertex

Logs: tail -f /tmp/vertex-*.log

EOF
