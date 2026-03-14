const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { auditStore } = require("./auditStore");
const db = require("./db");
const { broadcast } = require("./wsServer");

const DEFAULT_LIMIT = 500_000_000; // 500 BPUSD (6 decimals)
const FEE_BPS = 50; // 0.5%

// ─── Web3 Setup ──────────────────────────────────────────────────────────────
const isSimulation = process.env.NETWORK === "simulation";
let provider, wallet, contracts = {};

if (!isSimulation) {
  provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
  wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  try {
    const contractDataPath = path.join(__dirname, "../../backend/contractData.json");
    if (fs.existsSync(contractDataPath)) {
      const data = JSON.parse(fs.readFileSync(contractDataPath, "utf8"));
      contracts.BPUSD = new ethers.Contract(data.BPUSD.address, data.BPUSD.abi, wallet);
      contracts.ComplianceRegistry = new ethers.Contract(data.ComplianceRegistry.address, data.ComplianceRegistry.abi, wallet);
      contracts.SettlementEngine = new ethers.Contract(data.SettlementEngine.address, data.SettlementEngine.abi, wallet);
      console.log("✅ Web3 Contracts Loaded!");
    } else {
      console.warn("⚠️ contractData.json not found! Run Hardhat deploy script.");
    }
  } catch(e) {
    console.error("Error loading contracts:", e);
  }
}

// Simulation helpers
function mockTxHash() {
  return "0x" + [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
}
function mockBlockHash() {
  return "0x" + [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Compliance Operations ───────────────────────────────────────────────────

function getWalletStatus(address) {
  const addr = address.toLowerCase();
  const w = db.get("wallets").find({ address: addr }).value();
  if (!w) return { exists: false, whitelisted: false, blacklisted: false, limit: DEFAULT_LIMIT };
  return { exists: true, ...w };
}

async function whitelistWallet(address, limit, kycData = {}) {
  const addr = address.toLowerCase();
  let existing = db.get("wallets").find({ address: addr }).value();
  
  if (existing && existing.blacklisted) throw new Error("Cannot whitelist blacklisted wallet");
  
  // On-Chain Sync
  if (!isSimulation && contracts.ComplianceRegistry) {
    const tx = await contracts.ComplianceRegistry.whitelist(address, String(limit || DEFAULT_LIMIT));
    await tx.wait();
  }

  db.get("wallets").remove({ address: addr }).write();
  const w = {
    address: addr,
    ...(existing || {}),
    whitelisted: true,
    blacklisted: false,
    limit: limit || DEFAULT_LIMIT,
    kycStatus: "approved",
    kycData,
    whitelistedAt: new Date().toISOString(),
  };
  db.get("wallets").push(w).write();

  auditStore.log({ action: "WHITELIST", wallet: addr, limit: limit || DEFAULT_LIMIT, ...kycData });
  return getWalletStatus(addr);
}

async function blacklistWallet(address, reason = "") {
  const addr = address.toLowerCase();
  let existing = db.get("wallets").find({ address: addr }).value() || {};
  
  if (!isSimulation && contracts.ComplianceRegistry) {
    const tx = await contracts.ComplianceRegistry.blacklist(address, reason);
    await tx.wait();
  }

  db.get("wallets").remove({ address: addr }).write();
  const w = { address: addr, ...existing, whitelisted: false, blacklisted: true, blacklistedAt: new Date().toISOString(), blacklistReason: reason };
  db.get("wallets").push(w).write();

  auditStore.log({ action: "BLACKLIST", wallet: addr, reason });
  return getWalletStatus(addr);
}

async function removeBlacklist(address) {
  const addr = address.toLowerCase();
  let existing = db.get("wallets").find({ address: addr }).value() || {};
  if (!existing.blacklisted) throw new Error("Wallet is not blacklisted");
  
  if (!isSimulation && contracts.ComplianceRegistry) {
    const tx = await contracts.ComplianceRegistry.removeBlacklist(address);
    await tx.wait();
  }

  db.get("wallets").remove({ address: addr }).write();
  db.get("wallets").push({ address: addr, ...existing, blacklisted: false }).write();
  
  auditStore.log({ action: "REMOVE_BLACKLIST", wallet: addr });
  return getWalletStatus(addr);
}

async function setTransferLimit(address, limit) {
  const addr = address.toLowerCase();
  let existing = db.get("wallets").find({ address: addr }).value() || {};
  
  if (!isSimulation && contracts.ComplianceRegistry && existing.whitelisted) {
    const tx = await contracts.ComplianceRegistry.whitelist(address, String(limit));
    await tx.wait();
  }

  db.get("wallets").remove({ address: addr }).write();
  db.get("wallets").push({ address: addr, ...existing, limit }).write();
  
  auditStore.log({ action: "SET_LIMIT", wallet: addr, limit });
  return getWalletStatus(addr);
}

function getAllWallets() {
  return db.get("wallets").value();
}

// ─── Fiat Simulation ─────────────────────────────────────────────────────────

async function depositFiat(address, amountUSD) {
  const addr = address.toLowerCase();
  const units = Math.floor(amountUSD * 1_000_000); 
  
  let current = db.get("balances").find({ address: addr }).value()?.balance || 0;
  
  if (!isSimulation && contracts.BPUSD) {
    const tx = await contracts.BPUSD.mint(address, String(units));
    await tx.wait();
  }

  db.get("balances").remove({ address: addr }).write();
  db.get("balances").push({ address: addr, balance: current + units }).write();
  
  auditStore.log({ action: "FIAT_DEPOSIT", wallet: addr, amountUSD, units });
  return { balance: current + units, units };
}

function getBalance(address) {
  const addr = address.toLowerCase();
  return db.get("balances").find({ address: addr }).value()?.balance || 0;
}

// ─── Settlement Engine ───────────────────────────────────────────────────────

async function sendRemittance({ sender, receiver, amount, onStageUpdate }) {
  const senderAddr = sender.toLowerCase();
  const receiverAddr = receiver.toLowerCase();
  const amountUnits = Math.floor(parseFloat(amount) * 1_000_000);

  const remittanceId = uuidv4();
  const txCount = db.get("remittances").size().value();

  const stagesLog = [];
  const logStage = (stage, data) => {
    const entry = { stage, ...data, timestamp: new Date().toISOString() };
    stagesLog.push(entry);
    if (onStageUpdate) onStageUpdate(entry);
    broadcast({ type: "STAGE_UPDATE", remittanceId, stage: entry });
    return entry;
  };

  // 1: Deposit Initiated
  await sleep(400);
  const depositRef = "DEP-" + Date.now().toString(36).toUpperCase();
  logStage(1, { name: "Deposit Initiated", description: "Fiat deposit confirmed", depositRef, amount: parseFloat(amount), currency: "USD" });

  // 2: Stablecoin Minted
  let mintTxHash = mockTxHash();
  let mintBlockNumber = 5000000 + txCount;
  
  if (!isSimulation && contracts.BPUSD) {
    const bal = await contracts.BPUSD.balanceOf(sender);
    if (bal < BigInt(amountUnits)) {
       const tx = await contracts.BPUSD.mint(sender, String(amountUnits));
       const receipt = await tx.wait();
       mintTxHash = receipt.hash;
       mintBlockNumber = receipt.blockNumber;
    }
  } else {
    await sleep(400);
  }
  
  logStage(2, { name: "Stablecoin Minted", description: "ERC-20 BPUSD confirmed in wallet", txHash: mintTxHash, blockNumber: mintBlockNumber, amountMinted: amountUnits });

  // 3: Compliance Check
  await sleep(200);
  const senderStatus = getWalletStatus(senderAddr);
  const receiverStatus = getWalletStatus(receiverAddr);

  if (!senderStatus.whitelisted) throw new Error("Sender not whitelisted");
  if (!receiverStatus.whitelisted) throw new Error("Receiver not whitelisted");
  if (senderStatus.blacklisted) throw new Error("Sender blacklisted");
  if (receiverStatus.blacklisted) throw new Error("Receiver blacklisted");
  if (amountUnits > senderStatus.limit) throw new Error("Exceeds transfer limit");

  const senderBalance = getBalance(senderAddr);
  if (amountUnits > senderBalance && isSimulation) {
    throw new Error("Insufficient balance. Please deposit funds first.");
  }

  logStage(3, { name: "Compliance Check", description: "Passed whitelist & limits", checks: { senderWhitelisted: true, receiverWhitelisted: true, withinLimit: true } });

  // 4: Remittance Transfer & 5: Settlement Finalized (Combined On-Chain Execution)
  const fee = Math.floor((amountUnits * FEE_BPS) / 10000);
  const netAmount = amountUnits - fee;
  
  let transferTxHash = mockTxHash();
  let settlementBlockNumber = mintBlockNumber + 3;
  let blockHash = mockBlockHash();
  let settlementHash = mockTxHash();

  if (!isSimulation && contracts.SettlementEngine) {
    try {
      const tx = await contracts.SettlementEngine.executeRemittance(
        remittanceId,
        sender,
        receiver,
        String(amountUnits)
      );
      const receipt = await tx.wait();
      
      transferTxHash = receipt.hash;
      settlementHash = receipt.hash;
      settlementBlockNumber = receipt.blockNumber;
      blockHash = receipt.blockHash;
    } catch (e) {
      console.error("On-chain settlement failed:", e);
      throw new Error("On-Chain Smart Contract execution reverted! Has the receiver been whitelisted on-chain?");
    }
  } else {
    await sleep(800);
  }

  // Update DB balances
  db.get("balances").remove({ address: senderAddr }).write();
  db.get("balances").push({ address: senderAddr, balance: Math.max(0, senderBalance - amountUnits) }).write();
  const receiverBalance = getBalance(receiverAddr);
  db.get("balances").remove({ address: receiverAddr }).write();
  db.get("balances").push({ address: receiverAddr, balance: receiverBalance + netAmount }).write();

  logStage(4, { name: "Remittance Transfer", description: "transferFrom executed; 0.5% fee deducted", txHash: transferTxHash, grossAmount: amountUnits, fee, netAmount });
  logStage(5, { name: "Settlement Finalized", description: "Cryptographic finality achieved", txHash: transferTxHash, settlementHash, blockNumber: settlementBlockNumber, blockHash, finality: "Ethereum (Hardhat Local)" });

  // 6: Burn + Withdrawal
  await sleep(400);
  const burnTxHash = mockTxHash();
  const bankRef = "BANK-" + Date.now().toString(36).toUpperCase();

  logStage(6, { name: "Burn + Withdrawal", description: "Tokens burned; fiat disbursed", burnTxHash, bankRef, disbursedAmount: netAmount / 1_000_000, currency: "USD" });

  const record = {
    id: remittanceId,
    sender: senderAddr,
    receiver: receiverAddr,
    grossAmount: amountUnits,
    fee,
    netAmount,
    settlementHash,
    txHash: transferTxHash,
    blockNumber: settlementBlockNumber,
    status: "settled",
    createdAt: stagesLog[0].timestamp,
    settledAt: stagesLog[4].timestamp,
    stages: stagesLog,
  };

  db.get("remittances").push(record).write();
  auditStore.log({ action: "REMITTANCE_SETTLED", remittanceId, ...record });

  return record;
}

function getRemittance(id) {
  return db.get("remittances").find({ id }).value();
}
function getAllRemittances() {
  return db.get("remittances").value().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
function getStats() {
  const all = getAllRemittances();
  const totalVolume = all.reduce((s, r) => s + r.grossAmount, 0);
  const totalFees = all.reduce((s, r) => s + r.fee, 0);
  const wallets = db.get("wallets").value();
  return {
    totalTransactions: all.length,
    totalVolumeBPUSD: (totalVolume / 1_000_000).toFixed(2),
    totalFeesBPUSD: (totalFees / 1_000_000).toFixed(2),
    activeWallets: wallets.length,
    whitelistedWallets: wallets.filter((w) => w.whitelisted).length,
    blacklistedWallets: wallets.filter((w) => w.blacklisted).length,
  };
}

module.exports = {
  getWalletStatus, whitelistWallet, blacklistWallet, removeBlacklist, setTransferLimit,
  getAllWallets, depositFiat, getBalance, sendRemittance, getRemittance, getAllRemittances,
  getStats, DEFAULT_LIMIT, FEE_BPS,
};
