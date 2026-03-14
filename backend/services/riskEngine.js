/**
 * @module riskEngine
 * @description Computes address risk score (0-100) based on behaviour patterns
 */
const db = require('./db');

function calculateRiskScore(address) {
  const addr = address.toLowerCase();
  let score = 0;
  
  // 1. Transaction frequency (last 24 hours)
  const now = Date.now();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  
  const txs = db.get('remittances').value().filter(
    r => (r.sender === addr || r.receiver === addr) && r.createdAt > oneDayAgo
  );
  
  if (txs.length > 5) score += 15;
  if (txs.length > 20) score += 20;

  // 2. Average transaction size
  const totalVol = txs.reduce((sum, r) => sum + r.grossAmount, 0);
  const avgVol = txs.length ? totalVol / txs.length : 0;
  
  if (avgVol > 10000_000_000) score += 25; // > $10k
  else if (avgVol > 1000_000_000) score += 10; // > $1k

  // 3. Unique counterparties
  const counterparties = new Set(
    txs.map(r => r.sender === addr ? r.receiver : r.sender)
  );
  
  if (counterparties.size > 10) score += 20;
  
  // 4. Blacklisted counterparties
  let hasBlacklistedCounterparty = false;
  for (const cp of counterparties) {
    const cpWallet = db.get('wallets').find({ address: cp }).value();
    if (cpWallet && cpWallet.blacklisted) {
      hasBlacklistedCounterparty = true;
      break;
    }
  }
  
  if (hasBlacklistedCounterparty) score += 40;

  score = Math.min(100, score);
  
  return {
    address: addr,
    score,
    tier: score < 30 ? 'LOW' : score < 70 ? 'MEDIUM' : 'HIGH',
    factors: {
      recentTxCount: txs.length,
      avgVolumeUSD: (avgVol / 1e6).toFixed(2),
      uniqueCounterparties: counterparties.size,
      connectedToBlacklisted: hasBlacklistedCounterparty
    }
  };
}

module.exports = { calculateRiskScore };
