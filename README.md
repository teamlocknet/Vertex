# ⚡ Vertex — Monorepo

¡Bienvenidos al repositorio oficial de **Vertex**! Este SDK es un entorno de ejecución paralela fragmentado por canales diseñado específicamente para mitigar las colisiones de Concurrencia Optimista (OCC) y los rollbacks masivos en la red de Monad bajo escenarios de alta congestión.

El ecosistema está protegido por **AegisNet** (Control de accesos) y **Shield** (Un motor de Proof-of-Work dinámico escrito en Yul inline para mitigar ataques Sybil antes de la fase de ejecución on-chain).

---

## 🏗️ Estructura del Proyecto

Este repositorio utiliza una arquitectura de **Monorepositorio** gestionada con `pnpm workspaces`:

* **`packages/contracts`**: Entorno de desarrollo de Smart Contracts basado en **Foundry**.
* **`packages/backend`**: Servidor Node.js (ESM) que aloja el indexador de telemetría de WebSockets (Puerto 8080), el agente de optimización híbrido de IA y los scripts de estrés de carga.
* **`packages/frontend`**: Dashboard analítico tridimensional en tiempo real construido sobre **Next.js 14 y React Three Fiber**.

---

## ⚙️ Requisitos Previos

Antes de arrancar, asegúrate de tener instalado en tu entorno local:
* [Node.js](https://nodejs.org/) (Versión v18 o superior)
* [pnpm](https://pnpm.io/) (Gestor de paquetes global obligatorio)
* [Foundry](https://book.getfoundry.sh/getting-started/installation) (`anvil`, `forge` y `cast`)

---

## 🚀 Guía de Arranque Rápido (Desarrollo)

### 1. Clonar e Instalar dependencias
Desde la raíz del monorepositorio, ejecuta el comando mágico para sincronizar e instalar de forma inteligente los módulos de todas las carpetas:
```bash
pnpm install
