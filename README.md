# BlockPay — Blockchain Remittance Settlement Framework

> **IEEE Conference Paper Implementation**  
> Enosh (2211CS040093) · Sriram (2211CS040097) · Saikumar (2211CS040114)  
> Dept. of Cybersecurity, Malla Reddy University, Hyderabad  
> Guide: Dr. Nenavath Chander

---

## Overview

BlockPay is a blockchain-based cross-border remittance settlement framework that replaces the correspondent banking architecture with programmable smart contracts and ERC-20 stablecoins.

**Key metrics (from paper):**
- Settlement latency: **< 30 seconds** (vs 1–3 days SWIFT)
- Platform fee: **0.5% flat** (vs 3–7% traditional)
- Intermediaries: **Zero** (vs 2–5 correspondent banks)
- Compliance: **On-chain enforcement** via smart contracts

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT LAYER (React 18 + Vite + TailwindCSS)           │
│  · Sender/Receiver Dashboard                             │
│  · Admin/Regulator Compliance Console                    │
│  · 6-Stage Live Settlement Tracker                       │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────┐
│  APPLICATION LAYER (Node.js + Express)                   │
│  · Settlement Orchestration API  (/api/settlement)       │
│  · Compliance Management API     (/api/compliance)       │
│  · Audit Logging API             (/api/audit)            │
│  · Wallet API                    (/api/wallet)           │
└──────────────────────┬──────────────────────────────────┘
                       │ ethers.js v6
┌──────────────────────▼──────────────────────────────────┐
│  BLOCKCHAIN LAYER (Solidity 0.8.20 + OpenZeppelin)       │
│  · MockStablecoin.sol    — ERC-20 BPUSD with mint/burn  │
│  · ComplianceRegistry.sol — Whitelist/Blacklist/Limits   │
│  · Remittance.sol        — Settlement orchestrator       │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  FIAT INTEGRATION LAYER (Simulated)                      │
│  · INR on-ramp simulation (deposit endpoint)             │
│  · Local currency off-ramp (burn + withdrawal)           │
└─────────────────────────────────────────────────────────┘
```

---

## Smart Contracts

### MockStablecoin.sol
ERC-20 token (BPUSD) with 6 decimals, owner-controlled `mint()` and `burn()` simulating fiat conversion.

### ComplianceRegistry.sol
On-chain compliance registry with:
- `whitelistWallet(address, limit)` — KYC approval
- `blacklistWallet(address)` — AML flag (atomically revokes whitelist)
- `setTransferLimit(address, limit)` — Per-wallet limit
- `isWhitelisted()`, `isBlacklisted()`, `getLimit()` — Query functions

### Remittance.sol
Settlement orchestrator implementing the core logic:
```solidity
function sendRemittance(address receiver, uint256 amount) external nonReentrant {
    require(compliance.isWhitelisted(msg.sender));   // Stage 3
    require(compliance.isWhitelisted(receiver));
    require(!compliance.isBlacklisted(msg.sender));
    require(amount <= compliance.getLimit(msg.sender));
    
    uint256 fee = (amount * feeBps) / 10000;         // Stage 4
    stablecoin.transferFrom(sender, address(this), amount);
    stablecoin.transfer(feeCollector, fee);
    stablecoin.transfer(receiver, amount - fee);
    
    emit RemittanceCreated(...);                      // Stage 5
    emit RemittanceSettled(...);
}
```

---

## 6-Stage Settlement Lifecycle

| # | Stage | Layer | Output Artefact |
|---|-------|-------|----------------|
| 1 | Deposit Initiated | Fiat | On-ramp reference |
| 2 | Stablecoin Minted | Blockchain | ERC-20 Transfer event |
| 3 | Compliance Check | Smart Contract | On-chain validation / revert |
| 4 | Remittance Transfer | Smart Contract | RemittanceCreated event |
| 5 | Settlement Finalized | Blockchain | RemittanceSettled event + block hash |
| 6 | Burn + Withdrawal | Fiat | Burn event + bank transfer ref |

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Install dependencies
```bash
npm run install:all
```

### 2. Start backend API
```bash
cd backend
npm start
# API runs on http://localhost:4000
```

### 3. Start frontend
```bash
cd frontend
npm run dev
# UI runs on http://localhost:5173
```

### 4. Seed demo data (optional)
```bash
# With both servers running:
node scripts/seed-demo.js
```

### 5. Demo workflow
1. Open http://localhost:5173
2. Go to **Wallet** → Enter `0xAlice01` → Deposit $200
3. Go to **Compliance** → Add wallet `0xBob02` → Whitelist it
4. Go to **Send Money** → Sender: `0xAlice01`, Receiver: `0xBob02`, Amount: `100`
5. Watch the 6-stage live tracker execute
6. Go to **Transactions** to see the settled record and audit log

---

## API Reference

### Settlement
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/settlement/send` | Execute remittance |
| GET | `/api/settlement/:id` | Get remittance by ID |
| GET | `/api/settlement` | List all remittances |
| GET | `/api/settlement/stats/overview` | Dashboard stats |
| POST | `/api/settlement/deposit` | Fiat on-ramp simulation |
| GET | `/api/settlement/balance/:address` | Get wallet balance |

### Compliance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/compliance/wallets` | List all wallets |
| GET | `/api/compliance/wallet/:address` | Get wallet status |
| POST | `/api/compliance/whitelist` | Whitelist wallet |
| POST | `/api/compliance/blacklist` | Blacklist wallet |
| POST | `/api/compliance/remove-blacklist` | Remove from blacklist |
| POST | `/api/compliance/set-limit` | Update transfer limit |

### Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit/logs` | Get audit log |
| GET | `/api/audit/wallet/:address` | Wallet audit trail |

---

## Smart Contract Deployment (Ethereum Sepolia)

```bash
cd contracts
npm install
cp .env.example .env  # add SEPOLIA_RPC_URL and PRIVATE_KEY

# Deploy to Sepolia testnet
npm run deploy:sepolia

# Run full test suite (9 unit tests)
npm test
```

Test suite covers all 9 tests from the paper:
1. Wallet whitelisting stores correct compliance state
2. Blacklisting atomically revokes whitelist status
3. Whitelisting a blacklisted wallet reverts
4. Transfer limit correctly stored and returned
5. sendRemittance() reverts when sender not whitelisted
6. sendRemittance() reverts when receiver not whitelisted
7. sendRemittance() reverts when sender blacklisted
8. sendRemittance() reverts when amount exceeds limit
9. Platform fee correctly computed at 50 bps (0.5%)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.20, OpenZeppelin v5, Hardhat |
| Backend | Node.js, Express, ethers.js v6 |
| Frontend | React 18, Vite, TailwindCSS, Recharts |
| Blockchain | Ethereum Sepolia Testnet |
| Wallet | MetaMask (browser signing) |

---

## Limitations (from paper)
1. Fiat on/off-ramp is simulated — production requires RBI-regulated PSP partnerships
2. Compliance registry uses in-memory storage — production requires persistent DB
3. No SIWE wallet authentication — production requires signature-based auth
4. Smart contracts not formally audited
5. Not evaluated against FEMA/RBI/DPDPA/FATF VASP requirements

## References
- IEEE paper: BlockPay: A Blockchain-Based Settlement Framework (Malla Reddy University, 2024)
- OpenZeppelin Contracts v5.0
- Ethereum Sepolia Testnet
- World Bank Remittance Prices Q4 2023
