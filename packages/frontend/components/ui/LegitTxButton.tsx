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

  const isCalc = status === 'calculating';
  const isOk   = status === 'success';
  const isErr  = status === 'error';

  return (
    <button
      onClick={handleClick}
      disabled={status !== 'idle'}
      style={{
        background: 'transparent',
        border: `1px solid ${isOk ? 'var(--bb-green)' : isErr ? 'var(--bb-red)' : 'var(--bb-green3)'}`,
        color: isOk ? 'var(--bb-white)' : isErr ? 'var(--bb-red)' : 'var(--bb-green)',
        fontFamily: 'var(--bb-font)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.18em',
        padding: '10px 20px',
        cursor: status === 'idle' ? 'pointer' : 'not-allowed',
        textTransform: 'uppercase',
        width: '100%',
        boxShadow: isOk ? '0 0 12px rgba(0,255,65,0.3)' : isErr ? '0 0 8px rgba(255,34,34,0.3)' : 'none',
        transition: 'all 0.1s',
      }}
    >
      {isOk   ? `✓ TX CONFIRMADA — ${txHash.slice(0, 14)}...`  :
       isCalc ? 'CALCULANDO PROOF OF WORK YUL...'              :
       isErr  ? `✗ ERROR: ${errorMsg}`                         :
                '⚡ ENVIAR TX LEGÍTIMA (JUEZ)'}
    </button>
  );
}
