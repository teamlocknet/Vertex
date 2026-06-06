// Agente Híbrido con Salvavidas Matemático.
// Consulta Ollama cada 4s con AbortSignal.timeout(3000ms).
// Si Ollama no responde → Salvavidas: despacha lote si queue.length >= 5.

const OLLAMA_URL    = 'http://localhost:11434/api/generate';
const LOOP_INTERVAL = 4_000; // ms
const AI_TIMEOUT_MS = 3_000; // AbortSignal.timeout

export function startAgent({ provider, queue, onBatchDispatch }) {
  async function tick() {
    let usedAI = false;

    try {
      const res = await fetch(OLLAMA_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          model:  'deepseek-coder:7b',
          prompt: `Pending queue length: ${queue.length}. Should I dispatch a batch now? Reply with only YES or NO.`,
          stream: false,
        }),
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });

      if (res.ok) {
        const data  = await res.json();
        const reply = (data.response ?? '').trim().toUpperCase();
        if (reply.startsWith('YES') && queue.length > 0) {
          const batch = queue.splice(0, Math.min(queue.length, 5));
          onBatchDispatch(batch);
          usedAI = true;
          console.log(`[AGENT:AI] dispatching batch of ${batch.length} (queue remaining: ${queue.length})`);
        } else {
          usedAI = true;
          console.log(`[AGENT:AI] holding — AI said: ${reply} (queue: ${queue.length})`);
        }
      }
    } catch {
      // Timeout, network error, or Ollama not running → fall through to Salvavidas
    }

    if (!usedAI) {
      if (queue.length >= 5) {
        const batch = queue.splice(0, 5);
        onBatchDispatch(batch);
        console.log(`[AGENT:FALLBACK] dispatching batch of ${batch.length} (queue: ${queue.length})`);
      } else {
        console.log(`[AGENT:FALLBACK] holding — queue too small (${queue.length}/5)`);
      }
    }
  }

  const intervalId = setInterval(tick, LOOP_INTERVAL);
  console.log('[Agent] started — 4s loop, 3s AI timeout, salvavidas at queue>=5');
  return () => clearInterval(intervalId);
}
