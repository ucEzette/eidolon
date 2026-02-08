# EIDOLON Protocol 👻

> **The Ethereal Liquidity Layer for Uniswap v4**
>
> 🌐 **Live App:** [eidolon.oneroad.app](https://eidolon.oneroad.app/)

[![Uniswap v4](https://img.shields.io/badge/Uniswap-v4%20Hooks-FF007A?style=flat&logo=uniswap)](https://docs.uniswap.org/contracts/v4/overview)
[![Unichain](https://img.shields.io/badge/Unichain-Sepolia-blue?style=flat)](https://unichain.org/)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.26-363636?style=flat&logo=solidity)](https://soliditylang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## 🌀 What is EIDOLON?

EIDOLON is a decentralized liquidity protocol that decouples **capital ownership** from **liquidity provision**. Built on Uniswap v4, it introduces "Quantum Liquidity"—a system where your capital can underwrite dozens of pools simultaneously without ever leaving your wallet.

### The "Quantum" Advantage
*   **Zero Opportunity Cost:** Keep your tokens in your wallet, earning yield elsewhere or simply staying liquid.
*   **Hyper-Capital Efficiency:** One $1,000 "Ghost Permit" can theoretically provide liquidity to every pair on Unichain at once.
*   **Justin-In-Time (JIT) Execution:** Funds are only "summoned" into a pool the exact millisecond a trade occurs, and are returned instantly within the same block.

---

## ⚡ Key Features

| Feature | Description |
|---------|-------------|
| **👻 Ghost Permits** | EIP-712 signatures that authorize the protocol to use your funds *only* when a swap matches your parameters. |
| **⛽ Gasless Swaps** | Submit swap intents off-chain. Our autonomous bots (The Medium) execute them on-chain and pay the gas for you. |
| **🪞 Mirror Positions** | Provide dual-sided or single-sided liquidity without locking assets. Mirror your wallet's balance into the DEX. |
| **🛡️ The Exorcism** | Built-in anti-MEV protection that prevents sandwich attacks on your JIT liquidity. |
| **📈 Atomic Rewards** | Fees are calculated and distributed instantly to providers upon swap completion. |

---

## 🏗️ Architecture

EIDOLON consists of three primary layers working in perfect synchronization:

### 1. The Sanctum (Frontend)
The user interface where capital is "weaponized." Users sign **Ghost Permits** (Permit2 with custom Witness data) that define their liquidity parameters (pairs, tick ranges, fees).

### 2. The Medium (Autonomous Bot)
A high-performance Node.js agent that monitors the Unichain mempool and the EIDOLON Relayer. When a swap intent or a market opportunity arises, The Medium bundles the permits and executes the trade.

### 3. The EIDOLON Hook (Smart Contracts)
A Uniswap v4 Hook that manages the "Summoning" process. It uses transient storage and EIP-1153 to ensure that capital is pulled, used for the swap, and returned safely in a single atomic transaction.

---

## 📁 Project Structure

```
eidolon/
├── contracts/          # Solidity (Foundry) - Hook, Executor, and JIT Libraries
├── sanctum/            # Next.js (TypeScript) - Frontend & Intent Relayer
├── medium/             # Node.js (TypeScript) - Autonomous Execution Bot
└── .env files          # Centralized configuration for all services
```

---

## 🚀 Quick Start

### 1. Configuration Centralization
EIDOLON uses a centralized environment model. Ensure you populate the `.env` files in each directory:

*   **`contracts/.env`**: Used for Foundry deployments and scripts.
*   **`medium/.env`**: Used for bot execution and relayer connection.
*   **`sanctum/.env.local`**: Used for the frontend and API routes (prefixed with `NEXT_PUBLIC_*`).

### 2. Smart Contract Deployment
```bash
cd contracts
forge build
# Deploy to Unichain Sepolia
forge script script/DeployAll.s.sol --rpc-url $RPC_URL --broadcast
```

### 3. Start the Medium (Bot)
```bash
cd medium
npm install
npm run dev # Starts sensing the ethereal plane
```

### 4. Launch the Sanctum (Frontend)
```bash
cd sanctum
npm install
npm run dev # Accessible at http://localhost:3000
```

---

## 🤖 Ghost Intents (Gasless Swaps)

One of EIDOLON's most powerful features is **Intent-Based Swapping**:

1.  **Sign:** User signs a swap intent (e.g., "Swap 1 ETH for USDC").
2.  **Relay:** The intent is sent to our off-chain Relayer.
3.  **Execute:** The Medium sees the intent, validates the signature, and submits an on-chain transaction.
4.  **Settle:** The swap is executed via the `EidolonExecutor` contract. The user receives the output tokens, and the bot pays the gas.

---

## 🔐 Security & Safety

*   **Permit2 Integration:** We leverage Uniswap's `Permit2` for secure, time-bound, and scoped token approvals.
*   **Witness Pattern:** Ghost Permits contain "Witness Data" that strictly binds the signature to specific Uniswap v4 Pool IDs and transaction logic.
*   **Atomic Guardrails:** The EIDOLON Hook enforces that every transaction must leave the user's balance in a valid state (or better), preventing unauthorized pulls.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

*Built with 👻 by the EIDOLON team for the Unichain / Uniswap v4 ecosystem.*
