# BlockPay — Blockchain Cross-Border Remittance Platform

A fully functional web application prototype for blockchain-based cross-border remittances from India.

## Features

- **Landing Page** — Animated hero, stats, how-it-works, features
- **MetaMask Auth Flow** — Connect wallet modal with detection & demo mode
- **Dashboard** — Balance overview, quick send, recent transactions
- **Send Money** — 3-step transfer with live FX rates, smart contract simulation
- **Transaction History** — Filterable, searchable transaction table with on-chain hashes
- **KYC Verification** — 4-step identity verification flow

## Tech Stack

- Pure HTML, CSS, JavaScript (no build tools required)
- MetaMask Web3 integration via `window.ethereum`
- Google Fonts: Syne + DM Sans
- No external dependencies needed

## How to Run

Simply open `index.html` in a browser. No server needed.

For full MetaMask functionality:
1. Install MetaMask browser extension
2. Connect to any network
3. Click "Connect MetaMask" on the landing page

In environments without MetaMask, the app runs in demo mode with a simulated wallet address.

## Pages

| File | Description |
|------|-------------|
| `index.html` | Landing page + auth |
| `pages/dashboard.html` | Main dashboard |
| `pages/send.html` | Send money flow |
| `pages/transactions.html` | Transaction history |
| `pages/kyc.html` | KYC verification |

## Architecture (Conceptual)

```
User Wallet (MetaMask)
    ↓
Smart Contract (KYC/AML compliance)
    ↓
Stablecoin Conversion (USDC/DAI)
    ↓
Distributed Ledger Settlement (~2s)
    ↓
Regulated Off-Ramp → Local Fiat
    ↓
Recipient Bank/Wallet
```

## Design

- Dark minimal aesthetic with purple (#6c63ff) accent
- Syne display font + DM Sans body
- Smooth CSS animations & micro-interactions
- Responsive grid layout
