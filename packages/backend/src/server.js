import express    from 'express';
import cors       from 'cors';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join }  from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG    = join(__dirname, '../config/deployments.json');

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// ── In-memory shared state (populated by indexer via shared process state) ─────
let pendingTxs = 0;
let lastBlock   = 0;

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/deployments', async (_req, res) => {
  try {
    const raw = await readFile(CONFIG, 'utf8');
    res.json(JSON.parse(raw));
  } catch {
    res.status(503).json({ error: 'deployments.json not found — run Deploy.s.sol first' });
  }
});

app.post('/attack/monolith', (req, res) => {
  const { waves = 10, batchSize = 120 } = req.body ?? {};
  res.json({ started: true, target: 'monolith', waves, batchSize });
});

app.post('/attack/vertex', (req, res) => {
  const { waves = 10, batchSize = 120 } = req.body ?? {};
  res.json({ started: true, target: 'vertex', waves, batchSize });
});

app.get('/status', (_req, res) => {
  res.json({ pendingTxs, lastBlock, timestamp: Date.now() });
});

// ── Start ──────────────────────────────────────────────────────────────────────

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`[Server] REST API listening on http://localhost:${PORT}`);
  console.log(`[Server] CORS enabled for http://localhost:3000`);
});
