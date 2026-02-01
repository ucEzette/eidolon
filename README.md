# EIDOLON Protocol

> The World's First "Quantum Liquidity" Network

[![Uniswap v4](https://img.shields.io/badge/Uniswap-v4%20Hooks-FF007A?style=flat&logo=uniswap)](https://docs.uniswap.org/contracts/v4/overview)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.26-363636?style=flat&logo=solidity)](https://soliditylang.org/)
[![Foundry](https://img.shields.io/badge/Foundry-Testing-orange?style=flat)](https://book.getfoundry.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## 🌀 What is EIDOLON?

EIDOLON decouples **capital ownership** from **liquidity provision**. Users keep funds in their own wallets while providing liquidity to multiple DEX pools simultaneously.

**The Problem:** Traditional LPs lock capital in pools, earning 0% during inactivity and suffering Impermanent Loss.

**The Solution:** "Ghost Permits" allow the protocol to *summon* user funds only for the exact duration of a profitable trade, returning them instantly within the same transaction block.

## ⚡ Key Features

| Feature | Description |
|---------|-------------|
| **Quantum Liquidity** | One dollar can underwrite 50+ pools simultaneously |
| **Zero TVL Lock** | Funds never leave your wallet until the moment of trade |
| **The Exorcism** | Anti-MEV defense that blocks sandwich attacks |
| **Atomic Settlement** | All-or-nothing—funds always return in the same block |

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    The Sanctum (Frontend)                        │
│                   Next.js + Circle Wallets                       │
│                  EIP-712 "Ghost Permit" Signing                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │ Intents (Off-chain signatures)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                    The Medium (Bot)                              │
│            Mempool Monitor → Intent Matcher → Bundler            │
│                      Flashbots Protect RPC                       │
└────────────────────────────┬─────────────────────────────────────┘
                             │ Bundle [Permit + Swap]
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                 The EIDOLON Hook (On-Chain)                      │
│          Uniswap v4 Hook + Permit2 Witness Verification          │
│              beforeSwap → JIT Liquidity → afterSwap              │
└──────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
eidolon/
├── contracts/          # Foundry - Solidity smart contracts
├── sanctum/            # Next.js frontend
├── medium/             # Node.js mempool bot
└── common/             # Shared TypeScript types
```

## 🚀 Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/)

### Smart Contracts

```bash
cd contracts
forge install
forge build
forge test -vvv
```

### Run All Tests with Coverage

```bash
cd contracts
forge coverage
```

### The Sanctum (Frontend + Relayer)

The interface for summoning Ghost Permits.

```bash
cd sanctum
npm install
# Configure .env.local with RPC_URL and NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
npm run dev
# App: http://localhost:3000
# Relayer API: http://localhost:3000/api/relayer/orders
```

### The Medium (Bot)

The off-chain agent that exorcises (executes) the permits.

```bash
cd medium
npm install
# Configure .env with PRIVATE_KEY and RPC_URL
npm run dev
```

## 🔐 Security Model

EIDOLON uses **Permit2 with Witness Data** for cryptographic binding:

1. **Ghost Signature:** User signs intent bound to specific pool + block
2. **Witness Verification:** Hook validates context before pulling funds
3. **Atomic Guard:** `require(balanceAfter >= balanceBefore)` ensures zero loss

## 🏆 Hackathon Tracks

- **Uniswap v4 Agent-Driven Systems** (Rule 3)
- **Uniswap v4 Privacy/Anti-MEV** (Rule 4)
- **Circle AI Agents + RWA** (Rule 2)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

*Built with 👻 by the EIDOLON team*
