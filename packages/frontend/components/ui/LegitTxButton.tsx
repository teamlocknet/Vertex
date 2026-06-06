'use client';
import { useState }                        from 'react';
import { ethers }                          from 'ethers';
import type { PowStatus as BasePowStatus } from '@/lib/types';

type PowStatus = BasePowStatus | 'error';

const MICROPY_ABI = [
  'function processMicropayment(uint256 channelId, uint256 clientTimestamp, uint256 noncePoW) external payable',
];

const DEMO_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

export default function LegitTxButton() {
  const [status,   setStatus]   = useState<PowStatus>('idle');
  const [txHash,   setTxHash]   = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleClick = async () => {
    if (status !== 'idle') return;
    setStatus('calculating');

    // ── 1. Fetch deployed addresses ──────────────────────────────────────────
    let deployments: { VertexExecutor: string };
    try {
      const res = await fetch('http://localhost:3001/deployments');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      deployments = await res.json();
    } catch {
      setErrorMsg('Run deploy script first');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
      return;
    }

    // ── 2. Provider → signer → contract → send ───────────────────────────────
    try {
      const provider = new ethers.JsonRpcProvider('http://localhost:8545');
      const wallet   = new ethers.Wallet(DEMO_KEY, provider);
      const contract = new ethers.Contract(deployments.VertexExecutor, MICROPY_ABI, wallet);

      const tx = await contract.processMicropayment(
        1n,
        BigInt(Math.floor(Date.now() / 1000)),
        0n,
        { value: ethers.parseEther('0.001') },
      );
      await tx.wait(1);

      setTxHash(tx.hash);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg.slice(0, 60));
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const isIdle = status === 'idle';
  const isCalc = status === 'calculating';
  const isOk   = status === 'success';
  const isErr  = status === 'error';

  return (
    <button
      onClick={handleClick}
      disabled={!isIdle}
      className="relative w-full px-4 py-3 rounded-lg font-mono text-sm font-semibold
                 transition-all duration-300 overflow-hidden
                 disabled:cursor-not-allowed"
      style={{
        color: isOk ? '#34d399' : '#67e8f9',
        background: isOk
          ? 'rgba(6,78,59,0.55)'
          : isCalc
          ? 'rgba(7,89,133,0.4)'
          : 'rgba(8,145,178,0.15)',
        border: isOk
          ? '1px solid rgba(52,211,153,0.8)'
          : '1px solid rgba(0,255,204,0.45)',
        boxShadow: isOk
          ? '0 0 20px rgba(52,211,153,0.5), 0 0 40px rgba(52,211,153,0.2)'
          : isCalc
          ? '0 0 14px rgba(34,211,238,0.35)'
          : '0 0 8px rgba(0,255,204,0.18)',
        transform: isIdle ? undefined : 'scale(0.99)',
      }}
    >
      {isIdle && <span>⚡ Enviar Tx Legítima (Juez)</span>}

      {isCalc && (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="animate-spin h-4 w-4 flex-shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Calculando Proof of Work en Yul...
        </span>
      )}

      {isOk && (
        <span className="flex items-center justify-center gap-2">
          <span className="text-emerald-400 text-base">✓</span>
          {'Tx: ' + txHash.slice(0, 12) + '...'}
        </span>
      )}

      {isErr && (
        <span style={{ color: '#f87171' }}>{errorMsg}</span>
      )}

      {isIdle && (
        <span
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(0,255,204,0.07) 50%, transparent 100%)',
          }}
        />
      )}
    </button>
  );
}
