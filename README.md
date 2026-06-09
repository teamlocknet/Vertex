# Vertex — Parallel Execution Engine for Monad

> **Hackatón Monad Blitz 2026**

## The problem

Monad executes transactions optimistically in parallel. When two transactions
in the same block write to the same storage slot, Monad detects the conflict
and re-executes the second one sequentially — killing the parallelism benefit.
A monolithic contract with flat storage (`mapping(address => uint256) balances`)
causes this on every high-concurrency block.

## The solution

Vertex proves empirically that partitioning storage into disjoint channel slots
(`mapping(channelId => mapping(address => Partition))`) ensures every transaction
touches a unique slot. Monad's scheduler never detects a conflict.
Result: **zero OCC collisions, full parallel throughput.**

## Live demo

The dashboard shows two contracts under identical 1,200-transaction load:
- **Left (red):** MonolithDemo — flat storage, sequential re-execution, collisions visible
- **Right (green):** VertexCore — disjoint channels, zero re-execution, full parallelism

---

## Arquitectura

```
/
├── packages/
│   ├── contracts/   # Foundry — 6 contratos, 90 tests
│   ├── backend/     # Node.js ESM — indexador WS + REST + agente IA
│   ├── attacker/    # Script de ataque (1,200 txs por corrida)
│   └── frontend/    # Next.js 14 + Three.js — dashboard A/B en tiempo real
├── lib/
│   └── openzeppelin-contracts/
└── pnpm-workspace.yaml
```

### Contratos

| Contrato | Rol |
|---|---|
| `MonolithDemo.sol` | Almacenamiento plano — se satura bajo concurrencia |
| `VertexCore.sol` | Storage disjunto: `uint128 balance + uint64 nonce + uint64 lastUpdated` por canal |
| `VertexExecutor.sol` | Orquestador con Shield PoW (Yul inline, selector `0x8437022e`) |
| `AegisNet.sol` | Control de acceso por canal (SLOAD limpio, sin branches) |
| `GasAuditor.sol` | Presupuesto de gas por lote (`unchecked` math) |
| `PulseState.sol` | Telemetría on-chain en 1 solo slot |

---

## Requisitos previos

```bash
# Node.js >= 18
node --version

# pnpm (único gestor autorizado)
npm install -g pnpm

# Foundry (forge + anvil)
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Ollama (opcional — el agente tiene salvavidas matemático sin él)
# https://ollama.com
ollama pull deepseek-coder:7b
```

---

## Arranque completo (6 terminales)

### Paso 1 — Instalar dependencias
```bash
git clone https://github.com/teamlocknet/Vertex.git
cd Vertex
pnpm install
```

### Paso 2 — Levantar la cadena local
```bash
# Terminal 1
anvil --block-time 1
```

### Paso 3 — Desplegar contratos
El deploy genera `packages/backend/config/deployments.json` automáticamente.
```bash
# Terminal 2
cd packages/contracts
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

### Paso 4 — Arrancar el indexador WebSocket
```bash
# Terminal 3 (desde la raíz)
node packages/backend/src/indexer.js
# Escucha en ws://localhost:8080
```

### Paso 5 — Dashboard en tiempo real
```bash
# Terminal 4
cd packages/frontend
pnpm dev
# Abre http://localhost:3000
```

### Paso 6 — Ejecutar el ataque
```bash
# Terminal 5 — ataque al Monolito (verás colisiones OCC en rojo)
node packages/attacker/src/attack.js --target monolith

# Terminal 6 — ataque al ecosistema Vertex (sin colisiones, en verde)
node packages/attacker/src/attack.js --target vertex
```

El attacker lanza **1,200 transacciones** (10 wallets × 12 txs × 10 waves) por corrida. El dashboard actualiza en tiempo real vía WebSocket, sin polling.

---

## Comandos útiles

```bash
# Compilar contratos
cd packages/contracts && forge build

# Correr los 90 tests
cd packages/contracts && forge test --summary

# Solo el indexador + servidor REST en paralelo
node packages/backend/src/indexer.js &
node packages/backend/src/server.js

# Ataque con parámetros personalizados
node packages/attacker/src/attack.js --target vertex --waves=5 --batch=60
```

---

## Notas importantes para el equipo

- **Canal 0 está prohibido** — cualquier operación con `channelId == 0` revierte con `ZeroChannel()`. El attacker rota canales del 1 al 10.
- **Nonces**: el attacker usa siempre `wallet.getNonce('pending')`, nunca contador local.
- **`deployments.json` no está en el repo** (`.gitignore`) — es generado por el deploy script y es específico de cada máquina.
- **El frontend nunca hace polling** — solo reacciona al stream de WebSocket del puerto 8080.
- **Versiones congeladas**: Next.js 14.2.23, React 18.3.1, ethers ^6.16.0. No actualizar.

---

## Stack

| Capa | Tecnología |
|---|---|
| Contratos | Solidity 0.8.24, EVM target cancun, Foundry |
| Blockchain local | Anvil (`--block-time 1`) |
| Backend | Node.js ESM >= 18, Ethers.js v6, Express, ws |
| Agente IA | Ollama `deepseek-coder:7b` + salvavidas matemático |
| Frontend | Next.js 14.2.23, React 18.3.1, Three.js ^0.177.0, R3F ^8.17.10 |
| Gestor de paquetes | pnpm (monorepo workspace) |

## Deployed Contracts (Monad Testnet - Chain 10143)

| Contract | Description | Address |
|----------|-------------|---------|
| MonolithDemo | Contrato de comparación | [0x82Ad35989e44B4eC920c9E902E1C058108a57436](https://testnet.monadexplorer.com/address/0x82Ad35989e44B4eC920c9E902E1C058108a57436) |
| VertexExecutor | Orquestador + Shield PoW | [0xbCf9e3B448f85C1368FbAB54F8B63668d774014B](https://testnet.monadexplorer.com/address/0xbCf9e3B448f85C1368FbAB54F8B63668d774014B) |
| AegisNet | Control de acceso por canal | [0xa1F5bB7a2dabc7967CF6d902C2eafBFE314E01fc](https://testnet.monadexplorer.com/address/0xa1F5bB7a2dabc7967CF6d902C2eafBFE314E01fc) |
| GasAuditor | Auditoría de gas por lote | [0x896ab0Fc78e30f16495332b51601e814ee66eBc5](https://testnet.monadexplorer.com/address/0x896ab0Fc78e30f16495332b51601e814ee66eBc5) |
| PulseState | Telemetría on-chain | [0x500c7dB7affEC9e034bF476Be751B7Dccc1058F1](https://testnet.monadexplorer.com/address/0x500c7dB7affEC9e034bF476Be751B7Dccc1058F1) |
| VertexCore | Storage disjunto por canales | [0x749735A33Ad638B093662e76Bf27640468aCB12c](https://testnet.monadexplorer.com/address/0x749735A33Ad638B093662e76Bf27640468aCB12c) |

Deployer wallet: `0xDD1627107Bb5783EEE9DFBc4Abd5611220736F0A`
