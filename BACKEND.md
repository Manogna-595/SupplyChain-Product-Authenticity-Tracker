# Backend Deep-Dive — SupplyChain Product Authenticity Tracker

This document is a complete reference for every backend file in the project.
It is written to help you explain the code confidently to your professor and to
suggest a fair, graded work distribution between two team members.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Solidity Smart Contract](#2-solidity-smart-contract)
   - 2.1 [Role Constants](#21-role-constants)
   - 2.2 [Role Storage & Admin](#22-role-storage--admin)
   - 2.3 [Product Status Enum](#23-product-status-enum)
   - 2.4 [Data Structures](#24-data-structures)
   - 2.5 [Product Storage](#25-product-storage)
   - 2.6 [Constructor](#26-constructor)
   - 2.7 [Role Management Functions](#27-role-management-functions)
   - 2.8 [Modifiers](#28-modifiers)
   - 2.9 [Events](#29-events)
   - 2.10 [createProduct](#210-createproduct)
   - 2.11 [Signature Helpers](#211-signature-helpers)
   - 2.12 [transferProduct](#212-transferproduct)
   - 2.13 [markDelivered](#213-markdelivered)
   - 2.14 [markExpired](#214-markexpired)
   - 2.15 [Read Functions](#215-read-functions)
3. [Deployment Script](#3-deployment-script)
4. [Hardhat Configuration](#4-hardhat-configuration)
5. [Test Suite](#5-test-suite)
6. [Middleware Layer (Frontend ↔ Blockchain Bridge)](#6-middleware-layer-frontend--blockchain-bridge)
   - 6.1 [step1\_provider.js — MetaMask Connection](#61-step1_providerjs--metamask-connection)
   - 6.2 [step2\_contract.js — ABI & Contract Instance](#62-step2_contractjs--abi--contract-instance)
   - 6.3 [step3\_roles.js — Role Detection & Management](#63-step3_rolesjs--role-detection--management)
   - 6.4 [step4\_signatures.js — Cryptographic Transfer Signing](#64-step4_signaturesjs--cryptographic-transfer-signing)
   - 6.5 [step5\_read.js — Fetching On-Chain Data](#65-step5_readjs--fetching-on-chain-data)
   - 6.6 [step6\_write.js — Sending Transactions](#66-step6_writejs--sending-transactions)
   - 6.7 [step7\_events.js — Real-Time Event Listening](#67-step7_eventsjs--real-time-event-listening)
   - 6.8 [index.js — Unified Middleware Entry Point](#68-indexjs--unified-middleware-entry-point)
7. [End-to-End Data Flow](#7-end-to-end-data-flow)
8. [Suggested 2-Person Work Distribution](#8-suggested-2-person-work-distribution)

---

## 1. Architecture Overview

```
┌─────────────────────────────┐
│   React Frontend (Vite)     │
│  (components/*.jsx)         │
└────────────┬────────────────┘
             │ calls
┌────────────▼────────────────┐
│   Middleware Layer          │
│  (src/middleware/step1-7)   │  ← "backend bridge" running in the browser
└────────────┬────────────────┘
             │ ethers.js JSON-RPC calls
┌────────────▼────────────────┐
│   MetaMask (injected)       │
│   or any EIP-1193 wallet    │
└────────────┬────────────────┘
             │ signs & relays transactions
┌────────────▼────────────────┐
│  Ethereum Network           │
│  (Hardhat local / Sepolia)  │
│                             │
│  SupplyChainTracker.sol ◄───┤  ← the real "backend" (immutable on-chain logic)
└─────────────────────────────┘
```

There is **no traditional server**. The smart contract IS the backend:
- Business logic lives in Solidity and runs on every Ethereum node.
- State (products, ownership, history) is stored on-chain permanently.
- The middleware files are JavaScript helpers that let the React UI call the contract.

---

## 2. Solidity Smart Contract

**File:** `contracts/SupplyChainTracker.sol`

```
SPDX-License-Identifier: MIT
Solidity version: ^0.8.20
```

### 2.1 Role Constants

```solidity
bytes32 public constant MANUFACTURER_ROLE = keccak256(abi.encodePacked("MANUFACTURER_ROLE"));
bytes32 public constant DISTRIBUTOR_ROLE  = keccak256(abi.encodePacked("DISTRIBUTOR_ROLE"));
bytes32 public constant RETAILER_ROLE     = keccak256(abi.encodePacked("RETAILER_ROLE"));

```

Instead of comparing raw strings (expensive in Solidity), roles are stored as
**32-byte hashes** produced by `keccak256`. This is the same pattern used by
OpenZeppelin's AccessControl. Because they are `public constant`, the frontend
can compute identical hashes with `ethers.keccak256(ethers.toUtf8Bytes("MANUFACTURER_ROLE"))`.

### 2.2 Role Storage & Admin

```solidity
address public admin;
mapping(bytes32 => mapping(address => bool)) private _roles;
```

- `admin` — the Ethereum address that deployed the contract. Only the admin can
  grant/revoke roles and expire products.
- `_roles` — a nested mapping: `role hash → (wallet address → true/false)`.
  Checking a role costs only one storage read (O(1)).

### 2.3 Product Status Enum

```solidity
enum Status { Manufactured, InTransit, Delivered, Expired }
```

| Value | Integer | Meaning |
|-------|---------|---------|
| `Manufactured` | 0 | Product just created by manufacturer |
| `InTransit` | 1 | Product in transit between parties |
| `Delivered` | 2 | Product received at destination |
| `Expired` | 3 | Product marked expired by admin |

Enums compile down to `uint8`, so they cost very little gas.

### 2.4 Data Structures

```solidity
struct Checkpoint {
    string  location;    // human-readable location name
    uint256 timestamp;   // block.timestamp when this event occurred
    address handledBy;   // wallet that called the function
}

struct Product {
    uint256    productId;
    string     name;
    address    currentOwner;
    Status     status;
    Checkpoint[] history;  // dynamic array — grows with every transfer
}
```

`Checkpoint` records a single location event (creation, every transfer, every
delivery). The `history` array inside `Product` builds an **immutable audit
trail** directly on-chain — this is the authenticity guarantee of the whole
system.

### 2.5 Product Storage

```solidity
uint256 private _productCounter;
mapping(uint256 => Product) private _products;
```

- `_productCounter` auto-increments with each new product and acts as the ID.
- `_products` maps each ID to its `Product` struct.

### 2.6 Constructor

```solidity
constructor() {
    admin = msg.sender;
}
```

`msg.sender` is the wallet address that sent the deployment transaction. It
becomes the immutable admin for the lifetime of this contract.

### 2.7 Role Management Functions

```solidity
function grantRole(bytes32 role, address account) public { … }
function revokeRole(bytes32 role, address account) public { … }
function hasRole(bytes32 role, address account) public view returns (bool) { … }
```

- `grantRole` / `revokeRole` — restricted to admin; they flip the boolean in
  `_roles[role][account]`.
- `hasRole` — pure read (`view`), callable for free by anyone (including the
  frontend without a transaction).

### 2.8 Modifiers

```solidity
modifier onlyAdmin()                { require(msg.sender == admin, …); _; }
modifier onlyRole(bytes32 role)     { require(_roles[role][msg.sender], …); _; }
modifier onlyOwner(uint256 productId){ require(_products[productId].currentOwner == msg.sender, …); _; }
```

Modifiers are Solidity's "middleware" — they inject access-control checks
*before* the function body runs. The `_;` placeholder is replaced by the
function body at compile time.

### 2.9 Events

```solidity
event ProductCreated(uint256 indexed productId, string name, address manufacturer);
event ProductTransferred(uint256 indexed productId, address from, address to, string location);
event ProductStatusUpdated(uint256 indexed productId, Status newStatus);
```

Events are **cheap log entries** stored in transaction receipts (not in
contract storage). The `indexed` keyword allows filtering events by `productId`
without scanning all logs. The frontend uses events to:
- Show the product ID after minting (from `ProductCreated`).
- Build transfer history without storing it twice.

### 2.10 createProduct

```solidity
function createProduct(string memory name, string memory location)
    public
    onlyRole(MANUFACTURER_ROLE)
    returns (uint256)
```

**Who can call it:** only addresses with `MANUFACTURER_ROLE`.

**What it does:**
1. Increments `_productCounter` and uses the new value as the product ID.
2. Initialises the `Product` struct in storage.
3. Pushes the first `Checkpoint` (the factory location + timestamp).
4. Emits `ProductCreated`.
5. Returns the new product ID to the caller.

### 2.11 Signature Helpers

```solidity
function getTransferHash(uint256 productId, address from)
    public pure returns (bytes32)

function recoverSigner(bytes32 hash, bytes memory signature)
    internal pure returns (address)
```

**Purpose:** prevent unauthorised transfers by requiring the *receiver* to
cryptographically agree before custody changes.

**How it works:**

1. `getTransferHash` produces a deterministic hash of `(productId, senderAddress)`.
   This hash is unique per transfer attempt.
2. The receiver calls `getTransferHash` on their client, signs the bytes with
   their private key (via MetaMask), and sends the signature to the sender.
3. `recoverSigner` reverses the signature using `ecrecover` — an Ethereum
   precompile — to extract the address that produced it.
4. If the recovered address matches `to`, the transfer is genuine.

`recoverSigner` manually prefixes the hash with `"\x19Ethereum Signed
Message:\\n32"` to match the EIP-191 standard used by MetaMask's
`personal_sign`.

### 2.12 transferProduct

```solidity
function transferProduct(
    uint256 productId,
    address to,
    string memory location,
    bytes memory receiverSignature
) public onlyOwner(productId)
```

**Who can call it:** current owner of the product.

**Validation chain:**
1. `to` must not be the zero address.
2. Product must not be `Expired`.
3. `to` must hold `DISTRIBUTOR_ROLE` or `RETAILER_ROLE` — prevents accidental
   transfers to unknown wallets.
4. The receiver's signature must be valid (cryptographic proof of consent).

**State changes:**
- Sets `currentOwner = to`.
- Sets `status = InTransit`.
- Appends a new `Checkpoint` recording the handover location.
- Emits `ProductTransferred`.

### 2.13 markDelivered

```solidity
function markDelivered(uint256 productId, string memory location)
    public onlyOwner(productId)
```

**Who can call it:** current owner (typically a retailer after receiving goods).

**Validation:** product must be `InTransit`.

**State changes:** sets `status = Delivered`, appends checkpoint, emits event.

### 2.14 markExpired

```solidity
function markExpired(uint256 productId) public onlyAdmin()
```

**Who can call it:** admin only.

**State changes:** sets `status = Expired`, emits event. This is a one-way
operation — there is no `unmarkExpired`.

### 2.15 Read Functions

```solidity
function getProduct(uint256 productId) public view returns (…)
function getCheckpoint(uint256 productId, uint256 index) public view returns (…)
function getProductCount() public view returns (uint256)
```

These are `view` functions — they read state but do not modify it, so they cost
**zero gas** when called from off-chain code (the frontend). The frontend
iterates from index `0` to `historyLength - 1` to reconstruct the full audit
trail.

---

## 3. Deployment Script

**File:** `scripts/deploy.cjs`

```js
const Contract = await hre.ethers.getContractFactory("SupplyChainTracker");
const contract = await Contract.deploy();
await contract.waitForDeployment();
console.log("SupplyChainTracker deployed to:", await contract.getAddress());
```

Run with:
```bash
npx hardhat run scripts/deploy.cjs --network hardhat   # local
npx hardhat run scripts/deploy.cjs --network sepolia   # testnet
```

`ContractFactory` compiles the Solidity file (if not cached) and wraps the
deployment bytecode. `waitForDeployment()` waits until the deployment
transaction is mined and returns the on-chain address. That address must then
be pasted into `.env` as `VITE_CONTRACT_ADDRESS`.

---

## 4. Hardhat Configuration

**File:** `hardhat.config.cjs`

```js
module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {},          // in-memory local chain (used by tests)
    sepolia: {            // Ethereum testnet
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
  },
};
```

- **`hardhat` network** — spun up automatically when you run `npx hardhat test`.
  It has 20 pre-funded accounts that the test suite uses as
  admin/manufacturer/distributor/retailer.
- **`sepolia` network** — requires a real RPC endpoint (e.g. from Alchemy) and
  a funded private key stored in `.env`.

---

## 5. Test Suite

**File:** `test/SupplyChainTracker.test.js`

Run with:
```bash
npx hardhat test
```

The test file covers every critical path:

| Test | What it verifies |
|------|-----------------|
| Deployer is admin | `contract.admin()` equals the deploying wallet |
| Grant manufacturer role | `hasRole` returns true after `grantRole` |
| Random user cannot grant roles | `grantRole` reverts with "Only admin can grant roles" |
| Manufacturer creates product | Name, owner, status all correct on-chain |
| Random user cannot create product | Reverts with "Access denied: wrong role" |
| Product counter increments | Two products → counter equals 2 |
| Transfer with valid signature | Owner changes, status becomes `InTransit` |
| Transfer with wrong signature | Reverts with "Invalid receiver signature" |
| Non-owner cannot transfer | Reverts with "Not the current owner" |
| Mark delivered (happy path) | Status becomes `Delivered` after full transfer chain |
| Mark delivered — wrong status | Reverts when product is still `Manufactured` |
| Admin can expire product | Status becomes `Expired` |
| Non-admin cannot expire | Reverts with "Only admin" |

The test for *transfer with valid signature* is the most complex — it replicates
the exact signature flow the frontend uses:
```js
const hash = await contract.getTransferHash(1, manufacturer.address);
const sig  = await distributor.signMessage(ethers.getBytes(hash));
await contract.connect(manufacturer).transferProduct(1, distributor.address, "Dubai Port", sig);
```

---

## 6. Middleware Layer (Frontend ↔ Blockchain Bridge)

All files live in `src/middleware/`. They are plain JavaScript (ES modules)
that use [ethers.js v6](https://docs.ethers.org/v6/) to talk to the smart
contract. They run entirely in the browser — there is no Node.js server.

### 6.1 step1\_provider.js — MetaMask Connection

```js
export async function getProviderAndSigner()
```

- Checks for `window.ethereum` (injected by MetaMask or any EIP-1193 wallet).
- Creates an `ethers.BrowserProvider` that wraps the injected provider.
- Calls `eth_requestAccounts` to trigger the "Connect Wallet" popup.
- Returns `{ provider, signer }`:
  - **provider** — read-only connection, used for `view` / `pure` calls (free).
  - **signer** — wallet that can sign and send transactions (costs gas).

### 6.2 step2\_contract.js — ABI & Contract Instance

```js
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
export const ABI = [ … ];
export function getContract(signerOrProvider) { … }
```

- `CONTRACT_ADDRESS` is loaded from the `.env` file at build time by Vite.
- `ABI` is a human-readable ABI — a compact string format that ethers.js
  parses automatically. Each entry corresponds to a public function or event in
  the Solidity contract.
- `getContract(signer)` — returns a contract instance bound to a signer
  (enables sending transactions).
- `getContract(provider)` — returns a read-only contract instance.

### 6.3 step3\_roles.js — Role Detection & Management

```js
export const ROLES = { MANUFACTURER, DISTRIBUTOR, RETAILER };
export async function detectRoles(address)
export async function grantRole(roleKey, address)
export async function revokeRole(roleKey, address)
```

`ROLES` mirrors the constants in Solidity using the same `keccak256` hash so
they match exactly.

`detectRoles` makes **four parallel calls** (`Promise.all`) to the contract:
one for the admin address and one for each role. It returns a structured object
with `isAdmin`, `isMfr`, `isDist`, `isRetailer`, and a human-readable `label`.
This is how the frontend decides which dashboard to show after wallet connect.

`grantRole` / `revokeRole` send real transactions (modifies on-chain state,
costs gas), so they require a signer.

### 6.4 step4\_signatures.js — Cryptographic Transfer Signing

```js
export async function signAsReceiver(productId, fromAddress)
export async function executeTransfer(productId, toAddress, location, receiverSignature)
export async function getTransferHashForDisplay(productId, fromAddress)
```

This is the most security-critical middleware file.

**`signAsReceiver`** — called by the *receiver* (distributor / retailer):
1. Fetches the transfer hash from the contract (`getTransferHash`).
2. Signs the raw hash bytes with MetaMask (`signer.signMessage`).
3. Returns the hex signature string.

**`executeTransfer`** — called by the *sender* (current owner) after receiving
the signature out-of-band:
1. Calls `contract.transferProduct(productId, toAddress, location, signature)`.
2. The contract then verifies the signature on-chain with `ecrecover`.

**`getTransferHashForDisplay`** — utility to show the hash in the UI so the
receiver knows what they are signing.

### 6.5 step5\_read.js — Fetching On-Chain Data

```js
export const STATUS = { 0: { label, color, icon }, … };
export async function fetchProduct(productId)
export async function fetchAllProducts()
export async function fetchMyProducts(ownerAddress)
```

`fetchProduct`:
1. Calls `getProduct(id)` to get basic product info plus `historyLength`.
2. Spawns `historyLength` parallel calls to `getCheckpoint(id, i)`.
3. Converts raw `BigInt` timestamps to JavaScript `Date` strings.
4. Returns a clean JS object the UI can render directly.

`fetchAllProducts` — calls `getProductCount()` then `fetchProduct` in parallel
for every ID from 1 to count.

`fetchMyProducts` — filters `fetchAllProducts` to only products owned by the
connected wallet.

### 6.6 step6\_write.js — Sending Transactions

```js
export async function mintProduct(name, location)
export async function markDelivered(productId, location)
export async function markExpired(productId)
```

`mintProduct`:
1. Calls `contract.createProduct(name, location)`.
2. Waits for the transaction receipt.
3. Parses the `ProductCreated` event from the receipt logs using
   `ethers.Interface` to extract the newly assigned product ID.
4. Returns `{ productId, txHash }`.

`markDelivered` / `markExpired` simply send the corresponding transaction and
wait for confirmation.

### 6.7 step7\_events.js — Real-Time Event Listening

```js
export async function listenForNewProducts(callback)
export async function listenForTransfers(filterProductId, callback)
export async function fetchTransferHistory(productId)
```

`listenForNewProducts` / `listenForTransfers` — subscribe to contract events
using ethers.js `contract.on(eventName, handler)`. They return a cleanup
function (`contract.off(…)`) for use in React `useEffect` cleanup.

`fetchTransferHistory` — queries all past `ProductTransferred` events for a
specific product ID using `contract.queryFilter`. This gives the complete
on-chain transfer log without relying on the checkpoint array.

### 6.8 index.js — Unified Middleware Entry Point

```js
export * from "./step1_provider";
// … re-exports from all steps …
export async function connectWallet()
```

`index.js` is the single import point for all components:
```js
import { connectWallet, mintProduct, fetchAllProducts } from "../middleware";
```

`connectWallet` is a convenience function that connects MetaMask, gets the
wallet address, and immediately calls `detectRoles` to return a fully
initialised session object.

---

## 7. End-to-End Data Flow

Below is the typical lifecycle of one product:

```
1. Admin deploys contract  →  admin address stored on-chain

2. Admin grants MANUFACTURER_ROLE to Alice's wallet
   (grantRole tx, step3_roles.js)

3. Alice creates a product
   - Frontend calls mintProduct("Luxury Watch", "Geneva Factory")
   - step6_write.js → contract.createProduct(…) tx
   - Solidity increments counter, stores Product, emits ProductCreated
   - JS parses ProductCreated log → returns productId = 1

4. Admin grants DISTRIBUTOR_ROLE to Bob's wallet

5. Bob signs as receiver (step4_signatures.js → signAsReceiver)
   - fetches hash = keccak256(productId=1, from=Alice)
   - MetaMask signs the hash → returns signature bytes

6. Alice transfers to Bob
   - executeTransfer(1, Bob, "Dubai Port", sig)
   - Solidity verifies signature via ecrecover, changes owner, adds checkpoint
   - Product status → InTransit

7. Admin grants RETAILER_ROLE to Carol's wallet

8. Carol signs, Bob transfers to Carol (same flow as steps 5–6)

9. Carol calls markDelivered(1, "Paris Store")
   - Status → Delivered, checkpoint appended

10. Frontend calls fetchProduct(1) to show full timeline
    - Reads all checkpoints: Geneva → Dubai → Paris
```

---

## 8. Suggested 2-Person Work Distribution

This split is designed so that each person owns a coherent, independently
testable piece of the backend that is roughly equal in complexity. You can
present this as a natural division between the **on-chain layer** and the
**off-chain bridge layer**.

---

### Teammate A — Smart Contract Engineer

> *"I was responsible for all on-chain logic — the Solidity contract, its
> security model, and the automated test suite."*

| Area | Files | Key contributions |
|------|-------|-------------------|
| Smart contract | `contracts/SupplyChainTracker.sol` | Role system (constants, storage, `grantRole`, `revokeRole`, `hasRole`, modifiers), product data structures (`Checkpoint`, `Product`, enums), all core functions (`createProduct`, `transferProduct`, `markDelivered`, `markExpired`), signature verification (`getTransferHash`, `recoverSigner`), read functions (`getProduct`, `getCheckpoint`, `getProductCount`), events |
| Deployment | `scripts/deploy.cjs` | Hardhat deployment flow, contract address management |
| Network config | `hardhat.config.cjs` | Local and Sepolia network setup |
| Automated tests | `test/SupplyChainTracker.test.js` | All 13 unit + integration tests covering roles, minting, transfers (happy & sad paths), delivery, expiry |

**Talk points for the professor:**
- Explain why role hashes use `keccak256` instead of raw strings.
- Explain how `ecrecover` works and why receiver consent via signature prevents
  unauthorised transfers.
- Explain why `view` functions are free (no transaction needed).
- Explain the `Checkpoint[]` history pattern and why it provides an immutable
  audit trail.
- Walk through the signature test:
  ```js
  const hash = await contract.getTransferHash(1, manufacturer.address);
  const sig  = await distributor.signMessage(ethers.getBytes(hash));
  await contract.connect(manufacturer).transferProduct(1, distributor.address, "Dubai Port", sig);
  ```

---

### Teammate B — Middleware / Integration Engineer

> *"I was responsible for the JavaScript middleware layer that bridges the
> React frontend with the smart contract — wallet connection, ABI integration,
> role detection, cryptographic signing, data fetching, and real-time events."*

| Area | Files | Key contributions |
|------|-------|-------------------|
| Wallet connection | `src/middleware/step1_provider.js` | EIP-1193 detection, `BrowserProvider` setup, signer extraction |
| Contract binding | `src/middleware/step2_contract.js` | Human-readable ABI definition, `getContract` factory, environment-variable address loading |
| Role management | `src/middleware/step3_roles.js` | Client-side role constants, `detectRoles` (parallel `Promise.all`), `grantRole`/`revokeRole` wrappers |
| Signing flow | `src/middleware/step4_signatures.js` | `signAsReceiver` (off-chain signature generation), `executeTransfer` (on-chain submission), display helper |
| Data reading | `src/middleware/step5_read.js` | `fetchProduct` (parallel checkpoint fetching, timestamp conversion), `fetchAllProducts`, `fetchMyProducts`, status metadata |
| Transaction writing | `src/middleware/step6_write.js` | `mintProduct` (with event-log parsing for product ID), `markDelivered`, `markExpired` |
| Event streaming | `src/middleware/step7_events.js` | `listenForNewProducts`, `listenForTransfers` (real-time subscriptions + cleanup), `fetchTransferHistory` |
| Entry point | `src/middleware/index.js` | Barrel re-exports, `connectWallet` convenience function |

**Talk points for the professor:**
- Explain the provider vs signer distinction (read vs write).
- Explain why `Promise.all` is used in `detectRoles` and `fetchProduct`
  (parallel RPC calls instead of sequential = much faster).
- Explain why `mintProduct` must parse the event log to get the product ID
  (the return value of a write transaction is not directly accessible off-chain
  — only the receipt / logs are).
- Explain the two-step signing flow: receiver signs off-chain in the browser,
  sender submits on-chain — and the contract validates both in one transaction.
- Explain `contract.on` / `contract.off` for real-time event subscriptions and
  why the cleanup function is important in React `useEffect`.

---

### Summary Table

| Responsibility | Teammate A | Teammate B |
|---------------|:----------:|:----------:|
| Solidity contract | ✅ | |
| Role system (on-chain) | ✅ | |
| Signature verification (on-chain) | ✅ | |
| Deployment script | ✅ | |
| Hardhat config | ✅ | |
| Test suite | ✅ | |
| MetaMask / provider setup | | ✅ |
| ABI & contract binding | | ✅ |
| Role detection (off-chain) | | ✅ |
| Signature generation (off-chain) | | ✅ |
| Data fetch & normalisation | | ✅ |
| Write transactions | | ✅ |
| Real-time event listeners | | ✅ |
| Middleware entry point | | ✅ |

Both sides are equally critical: Teammate A's contract defines what is
possible, and Teammate B's middleware makes it usable by the UI. Neither works
without the other.
