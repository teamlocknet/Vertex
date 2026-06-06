# 🤖 CLAUDE.md — MEMORIA DE CONTEXTO E INMUTABILIDAD DE ARQUITECTURA

> **PROYECTO:** Vertex (Motor de Ejecución Paralela por Canales para Monad)  
> **CONTEXTO:** Hackatón Monad Blitz 2026.  
> **REGLA DE MEMORIA:** Este archivo contiene los planos absolutos para iniciar el repositorio en limpio. Si la sesión de la IA supera el 50% de contexto y se reinicia, lee este documento para recuperar las directrices exactas sin alucinar código, APIs o versiones.

---

## 1. ESTRUCTURA GLOBAL DEL REPOSITORIO (MONOREPO PNPM)

El proyecto se organizará estrictamente bajo la siguiente estructura de carpetas aisladas. Las IA deben respetar la ubicación de cada módulo y no mezclar dependencias:

/ (Raíz del proyecto con este CLAUDE.md)
├── packages/
│   ├── contracts/   # Entorno Foundry (Smart Contracts, Tests, Scripts)
│   ├── backend/     # Node.js ESM (Express API, Indexador WS, Agente IA, Scripts de Ataque)
│   └── frontend/    # Next.js 14 + Three.js / React Three Fiber (Dashboard 3D)
├── package.json     # Configuración del espacio de trabajo de pnpm
└── pnpm-workspace.yaml

---

## 2. STACK TECNOLÓGICO Y VERSIONES CONGELADAS

Queda estrictamente prohibido alterar, actualizar o degradar estas versiones para evitar fallos de compilación en el acoplamiento:

* **Smart Contracts:** Solidity 0.8.24 (Configurado con EVM target cancun en foundry.toml)
* **Blockchain Local:** Foundry (Anvil) latest stable (Forzar simulación local: anvil --block-time 1)
* **Backend Runtime:** Node.js (ESM) >= 18.0.0 (Requerido "type": "module" en package.json)
* **Blockchain Client:** Ethers.js ^6.16.0 (API v6 estable para interacción On-Chain)
* **Frontend Core:** Next.js 14.2.23 (Fijado en React 18.3.1 para estabilidad total de la CPU)
* **Gráficos 3D:** Three.js / R3F (three@^0.177.0 y @react-three/fiber@^8.17.10, incompatible con React 19)
* **Gestor Paquetes:** pnpm latest (Único gestor autorizado. Prohibido package-lock.json)

---

## 3. DISEÑO DE ARQUITECTURA Y FIRMAS ESPECÍFICAS (PILAR INTERFAZ A/B)

Para demostrar empíricamente el problema de las colisiones OCC de Monad, el sistema construirá y comparará dos entornos en paralelo:

### Contrato A: El Monolito (MonolithDemo.sol)
* **Propósito:** Simular un contrato tradicional saturable. Usa un almacenamiento plano (mapping(address => uint256) public balances) sin división de canales ni protección criptográfica. Cuando múltiples bots lo ataquen en el mismo bloque, generará colisión de estado absoluta.

### Contrato B: El Ecosistema FabricVM
Dividido en módulos altamente eficientes e inmutables:
* **VertexCore.sol:** Almacenamiento fragmentado por canales disjuntos. Estructura de slot compacto de 256 bits exactos: struct Partition { uint128 balance; uint64 nonce; uint64 lastUpdated; } indexada por mapping(uint256 => mapping(address => Partition)) public partitions.
* **VertexExecutor.sol:** El orquestador síncrono central. Expone la firma unificada de transacciones.
* **Shield (Yul Inline):** Validador dinámico de Proof-of-Work integrado en assembly dentro del Executor. Si la dificultad está activa, valida el hash y si falla, aborta la transacción mediante el selector hardcoded 0x8437022e (InvalidPoWNonce()) en la fase de estimateGas, evitando consumo de gas innecesario.
* **AegisNet.sol:** Control de acceso y permisos por canal mediante SLOAD limpio sin bifurcaciones (branches).
* **GasAuditor.sol:** Auditoría de presupuesto de gas remanente por lote mediante matemáticas no verificadas (unchecked) y validación de desbordamiento (overflow) posterior.
* **PulseState.sol:** Telemetría on-chain empaquetada en un solo slot de memoria para registrar volúmenes y tiempos por canal de ejecución.

---

## 4. FLUJO DE DATOS DEL BACKEND Y EL SALVAVIDAS DE LA IA (PILAR AGENTE)

El backend ejecutará tres sub-procesos esenciales de forma síncrona/asíncrona en los siguientes puertos fijos:
* **Puerto 3001 (Express REST):** Expone las APIs para interactuar con la simulación.
* **Puerto 8080 (WebSockets):** El indexador (indexer.js) realiza un escaneo continuo de eventos (getLogs cada 1000ms) y emite de inmediato un formato de datos unificado en JSON string puro hacia el Frontend:

```typescript
interface TelemetryPayload {
  contractType: "Monolith" | "FabricVM";
  txHash: string;
  sender: string;
  balanceValue: string;
  latencyMs: number; // Tiempo del Servidor - clientTimestamp enviado desde el frontend
  blockNumber: number;
  shieldDifficulty: number;
  status: boolean; // true = Éxito, false = Rechazada/Bloqueada por Shield PoW
}

4.1 Mecánica del Agente Híbrido (Salvavidas Matemático)
El bucle del agente de IA (agent.js) consultará cada 4 segundos a Ollama (deepseek-coder:7b) para optimizar el envío de lotes según el gas de la red.

REGLA ESTRICTA DE CONTROL (Anti-Congelación): El cliente HTTP del agente aplicará un AbortSignal.timeout de 3000ms. Si la IA local no responde en ese lapso de tiempo o el hardware se satura, el backend abortará la consulta de inmediato y saltará al Salvavidas Matemático (Lógica Determinista): ejecutará el lote de forma automática si las transacciones pendientes en cola son mayores o iguales a 5 (pending >= 5). Esto garantiza que la demo jamás se trabe en vivo ante los jueces.

5. PROTOCOLO DE TRABAJO EN GIT (RAMAS POR ROL)
Queda terminantemente prohibido realizar modificaciones directas sobre la rama main. El repositorio se construirá de forma modular en base al esquema de trabajo por roles:

feature/contracts -> Creación de smart contracts y suite de 67 pruebas Foundry.

feature/stream -> Creación del backend, servidor Express, indexador WS y lógica del agente.

feature/attacker -> Desarrollo del script attack.js para ráfagas controladas de 1,200 transacciones.

feature/frontend -> Desarrollo de la UI en Next.js 14 que consume exclusivamente el flujo del puerto 8080.

6. PAUTAS CRÍTICAS PARA PREVENIR ALUCINACIONES DE LA IA
Si eres una IA trabajando en este repositorio, verifica obligatoriamente el cumplimiento de estas reglas antes de dar una tarea por terminada:

Nonces Explícitos: Al enviar transacciones concurrentes desde JavaScript, solicita siempre wallet.getNonce('pending'). No uses variables incrementales locales en memoria (nonce++), ya que causarás colisiones en el mempool de Anvil.

Extensiones de Archivos: Dado que el backend usa ESM puro, todas las importaciones locales deben incluir explícitamente el sufijo del archivo (Ej: import { core } from './executor.js';).

Validación de Canales: El canal 0 está prohibido en las reglas del negocio de los contratos inteligentes. Cualquier operación sobre channelId == 0 debe revertir con ZeroChannel(). Las simulaciones deben inicializarse a partir del canal 1.

Cero Consultas Iterativas en la UI: El Frontend tiene estrictamente prohibido usar funciones de consulta repetitiva (polling vía setInterval o llamadas HTTP continuas de saldos) para evitar sobrecargar el hilo de JavaScript de la computadora. Debe actualizar los componentes y las gráficas únicamente reaccionando al stream abierto de WebSockets del puerto 8080.