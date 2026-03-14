const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { ethers } = require('ethers');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// All admin routes require authentication AND the 'admin' role
const adminGuard = [authMiddleware, requireRole('admin')];

// GET /api/admin/stats
router.get('/stats', adminGuard, (req, res) => {
  res.json({
    usersCount: db.get('users').size().value(),
    walletsCount: db.get('wallets').size().value(),
    remittancesCount: db.get('remittances').size().value(),
    auditLogsCount: db.get('auditLogs').size().value(),
    config: db.get('config').value()
  });
});

// GET /api/admin/users — list all registered users (without password hashes)
router.get('/users', adminGuard, (req, res) => {
  const users = db.get('users').value().map(({ passwordHash, ...safe }) => safe);
  res.json({ total: users.length, users });
});

// GET /api/admin/export/transactions
router.get('/export/transactions', adminGuard, (req, res) => {
  const txs = db.get('remittances').value();

  const headers = ['id', 'sender', 'receiver', 'grossAmount', 'fee', 'netAmount', 'status', 'createdAt', 'settledAt'];
  const rows = txs.map(t =>
    headers.map(h => `"${t[h] || ''}"`).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
  res.send(csv);
});

// GET /api/admin/export/audit
router.get('/export/audit', adminGuard, (req, res) => {
  const logs = db.get('auditLogs').value();

  const keysSet = new Set(['id', 'timestamp', 'action', 'wallet', 'remittanceId']);
  logs.forEach(l => Object.keys(l).forEach(k => keysSet.add(k)));
  const headers = Array.from(keysSet);

  const rows = logs.map(l =>
    headers.map(h => {
      let val = l[h] || '';
      if (typeof val === 'object') val = JSON.stringify(val);
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
  res.send(csv);
});

// GET /api/admin/node-stats
router.get('/node-stats', adminGuard, async (req, res) => {
  try {
    const isSimulation = process.env.NETWORK === 'simulation';
    if (isSimulation) return res.json({ network: 'Simulation Mode', chainId: 0, blockNumber: 0, gasPrice: 0, baseFee: 0 });

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
    const net = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    const feeData = await provider.getFeeData();

    res.json({
      network: 'Hardhat Local',
      chainId: net.chainId.toString(),
      blockNumber,
      gasPrice: ethers.formatUnits(feeData.gasPrice || 0, 'gwei').substring(0, 6),
      baseFee: ethers.formatUnits(block?.baseFeePerGas || 0, 'gwei').substring(0, 6)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to query local EVM node' });
  }
});

module.exports = router;
