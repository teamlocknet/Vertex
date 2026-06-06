import { ethers }           from 'ethers';
import { WebSocketServer }   from 'ws';
import WebSocket             from 'ws';
import { readFile }          from 'fs/promises';
import { fileURLToPath }     from 'url';
import { dirname, join }     from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG    = join(__dirname, '../config/deployments.json');
const ANVIL_WS  = 'ws://127.0.0.1:8545';

// ── Safety net ─────────────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  if (err.code === 'ECONNREFUSED' || err.syscall === 'connect') {
    console.warn('[Indexer] WS connection error (uncaught):', err.message);
    return;
  }
  console.error('[Indexer] Fatal error:', err);
  process.exit(1);
});

// ── Contract event ABIs ────────────────────────────────────────────────────────

const MONOLITH_ABI = [
  'event StateUpdated(address indexed sender, uint256 globalBalance, uint256 clientTimestamp, uint256 blockNumber, uint256 shieldDifficulty)',
];

const EXECUTOR_ABI = [
  'event BatchPush(uint256 indexed channelId, uint256 opCount, bytes32 payloadRoot, uint64 timestamp)',
];

// ── In-memory metrics ──────────────────────────────────────────────────────────

const metrics = {
  monolith: { timestamps: [], latencies: [], errorTs: [] },
  vertex:   { timestamps: [], latencies: [], errorTs: [] },
};

function rollingCount(arr, windowMs) {
  const cutoff = Date.now() - windowMs;
  let i = 0;
  while (i < arr.length && arr[i] < cutoff) i++;
  if (i) arr.splice(0, i);
  return arr.length;
}

function rollingTps(timestamps) {
  const WINDOW_MS = 5_000;
  return Math.round(rollingCount(timestamps, WINDOW_MS) / (WINDOW_MS / 1_000));
}

function rollingErrors(errorTs) {
  return rollingCount(errorTs, 30_000);
}

function drainAvgLatency(latencies) {
  if (!latencies.length) return 0;
  const avg = latencies.reduce((s, v) => s + v, 0) / latencies.length;
  latencies.length = 0;
  return Math.round(avg);
}

// ── WebSocket broadcast server — port 8080 ─────────────────────────────────────

const wss     = new WebSocketServer({ port: 8080 });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
  console.log(`[WS] client connected (total: ${clients.size})`);
});

function broadcast(payload) {
  const msg = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  }
}

// ── Pulse — every 500 ms push snapshot to all WS clients ──────────────────────

setInterval(() => {
  broadcast({ target: 'monolith', tps: rollingTps(metrics.monolith.timestamps), errors: rollingErrors(metrics.monolith.errorTs), latencyMs: drainAvgLatency(metrics.monolith.latencies) });
  broadcast({ target: 'fabric',   tps: rollingTps(metrics.vertex.timestamps),   errors: rollingErrors(metrics.vertex.errorTs),   latencyMs: drainAvgLatency(metrics.vertex.latencies)   });
}, 500);

// ── Connectivity pre-check ─────────────────────────────────────────────────────

function canReachAnvil() {
  return new Promise((resolve) => {
    const probe = new WebSocket(ANVIL_WS);
    const timer = setTimeout(() => { probe.terminate(); resolve(false); }, 3_000);
    probe.on('open',  () => { clearTimeout(timer); probe.close(); resolve(true);  });
    probe.on('error', () => { clearTimeout(timer);               resolve(false); });
  });
}

// ── Anvil connection + listener setup ─────────────────────────────────────────

let reconnecting = false;

function scheduleReconnect(addresses, delayMs = 3_000) {
  if (reconnecting) return;
  reconnecting = true;
  console.warn(`[Indexer] Reconnecting in ${delayMs / 1_000}s…`);
  setTimeout(() => { reconnecting = false; connectToAnvil(addresses); }, delayMs);
}

async function safeDestroy(provider) {
  if (!provider) return;
  try { await provider.destroy(); } catch { /* already closed */ }
}

async function connectToAnvil(addresses) {
  if (!(await canReachAnvil())) {
    console.warn('[Indexer] Anvil not reachable at', ANVIL_WS);
    return scheduleReconnect(addresses, 3_000);
  }

  let provider;
  try {
    provider = new ethers.WebSocketProvider(ANVIL_WS);
    await provider.getBlockNumber();

    // ── Interface decoders for log parsing ────────────────────────────────
    const monolithIface = new ethers.Interface(MONOLITH_ABI);
    const executorIface = new ethers.Interface(EXECUTOR_ABI);

    const monolithAddr = addresses.MonolithDemo.toLowerCase();
    const executorAddr = addresses.VertexExecutor.toLowerCase();

    // ── Block scanner — TPS + latency + error counting ─────────────────────
    // More reliable than contract.on() over WebSocket in ethers v6.
    provider.on('block', async (blockNumber) => {
      try {
        const block = await provider.getBlock(blockNumber, true);
        if (!block?.prefetchedTransactions?.length) return;
        for (const tx of block.prefetchedTransactions) {
          if (!tx.to) continue;
          const to = tx.to.toLowerCase();
          if (to !== monolithAddr && to !== executorAddr) continue;
          try {
            const receipt = await provider.getTransactionReceipt(tx.hash);
            const now = Date.now();

            if (receipt?.status === 0) {
              if (to === monolithAddr) metrics.monolith.errorTs.push(now);
              else                    metrics.vertex.errorTs.push(now);

            } else if (receipt?.status === 1) {
              if (to === monolithAddr) {
                metrics.monolith.timestamps.push(now);
                // Extract clientTimestamp from StateUpdated log for latency
                for (const log of receipt.logs) {
                  try {
                    const parsed = monolithIface.parseLog(log);
                    if (parsed?.name === 'StateUpdated') {
                      const ts = Number(parsed.args[2]); // clientTimestamp
                      if (ts > 1_000_000_000 && ts < 9_999_999_999) {
                        const lat = now - ts * 1_000;
                        if (lat >= 0 && lat < 30_000) metrics.monolith.latencies.push(lat);
                      }
                    }
                  } catch { /* not this event */ }
                }

              } else {
                // VertexExecutor: BatchPush reports opCount operations
                for (const log of receipt.logs) {
                  try {
                    const parsed = executorIface.parseLog(log);
                    if (parsed?.name === 'BatchPush') {
                      const count = Number(parsed.args[1]); // opCount
                      for (let i = 0; i < count; i++) metrics.vertex.timestamps.push(now);
                      const ts = Number(parsed.args[3]); // timestamp (block.timestamp)
                      const lat = now - ts * 1_000;
                      if (lat >= 0 && lat < 30_000) metrics.vertex.latencies.push(lat);
                    }
                  } catch { /* not this event */ }
                }
              }
            }
          } catch { /* receipt temporarily unavailable */ }
        }
      } catch { /* block data unavailable, skip */ }
    });

    // ── Health check ──────────────────────────────────────────────────────
    const healthInterval = setInterval(async () => {
      try {
        await provider.getBlockNumber();
      } catch {
        clearInterval(healthInterval);
        await safeDestroy(provider);
        scheduleReconnect(addresses);
      }
    }, 8_000);

    try {
      const socket = provider.websocket;
      const onClose = async () => {
        clearInterval(healthInterval);
        await safeDestroy(provider);
        scheduleReconnect(addresses);
      };
      if (typeof socket.on === 'function')                    socket.on('close', onClose);
      else if (typeof socket.addEventListener === 'function') socket.addEventListener('close', onClose);
    } catch { /* websocket not exposed in this ethers build */ }

    console.log('[Indexer] Connected to Anvil', ANVIL_WS);
    console.log(`  MonolithDemo:   ${addresses.MonolithDemo}`);
    console.log(`  VertexExecutor: ${addresses.VertexExecutor}`);

  } catch (err) {
    console.warn('[Indexer] Setup failed:', err.message);
    await safeDestroy(provider);
    scheduleReconnect(addresses, 3_000);
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

let addresses;
try {
  addresses = JSON.parse(await readFile(CONFIG, 'utf8'));
} catch (err) {
  console.error('[Indexer] Cannot read deployments.json:', err.message);
  console.error('  Run the deploy script first:');
  console.error('    cd packages/contracts');
  console.error('    forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast');
  process.exit(1);
}

console.log('[Indexer] Loaded deployments from', CONFIG);
console.log('[WS]     Broadcast server listening on ws://0.0.0.0:8080');
connectToAnvil(addresses);
