# SupplyChain Product Authenticity Tracker

A decentralised supply-chain transparency platform built on Ethereum.
Products are minted on-chain by manufacturers, transferred through distributors
and retailers with cryptographic consent signatures, and their full custody
history is stored permanently on the blockchain — making counterfeiting and
unauthorised tampering immediately detectable.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart contract | Solidity 0.8.20 |
| Local blockchain / testing | Hardhat |
| Contract interaction | ethers.js v6 |
| Frontend | React 19 + Vite |
| Wallet | MetaMask (EIP-1193) |
| Testnet | Ethereum Sepolia |

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in VITE_CONTRACT_ADDRESS, SEPOLIA_RPC_URL, PRIVATE_KEY
```

### 3. Run local blockchain & deploy
```bash
npx hardhat node                                        # terminal 1
npx hardhat run scripts/deploy.cjs --network hardhat   # terminal 2
```

### 4. Start the frontend
```bash
npm run dev
```

### 5. Run tests
```bash
npx hardhat test
```

## Repository Structure

```
contracts/
  SupplyChainTracker.sol   ← Solidity smart contract (the backend)
scripts/
  deploy.cjs               ← Hardhat deployment script
test/
  SupplyChainTracker.test.js ← Full test suite (13 tests)
src/
  middleware/              ← JS bridge between React and the contract
    step1_provider.js      ← MetaMask / wallet connection
    step2_contract.js      ← ABI & contract instance factory
    step3_roles.js         ← Role detection and management
    step4_signatures.js    ← Cryptographic transfer signing
    step5_read.js          ← Fetching products and checkpoints
    step6_write.js         ← Sending transactions
    step7_events.js        ← Real-time event listeners
    index.js               ← Unified middleware entry point
  components/              ← React UI components
hardhat.config.cjs         ← Hardhat network configuration
```

## Backend Documentation

For a complete explanation of the Solidity contract, every middleware file,
the end-to-end data flow, and a suggested 2-person work distribution, see
**[BACKEND.md](./BACKEND.md)**.

## Roles

| Role | Capability |
|------|-----------|
| Admin | Deploy contract, grant/revoke roles, expire products |
| Manufacturer | Create (mint) new products |
| Distributor | Receive and forward products |
| Retailer | Receive products and mark them delivered |

## How a Product Moves Through the Chain

1. **Admin** grants roles to wallet addresses.
2. **Manufacturer** calls `createProduct` — product is minted on-chain.
3. **Receiver** signs a transfer hash with MetaMask to provide consent.
4. **Current owner** calls `transferProduct` with the receiver's signature — the contract verifies it with `ecrecover`.
5. Steps 3–4 repeat for each hop (manufacturer → distributor → retailer).
6. **Retailer** calls `markDelivered` once goods arrive.
7. Anyone can call `getProduct` / `getCheckpoint` to verify the full history.
