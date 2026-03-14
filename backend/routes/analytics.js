const express = require('express');
const router = express.Router();
const db = require('../services/db');
const authMiddleware = require('../middleware/auth');

// Helper to get all remittances sorted by time
const getTx = () => db.get('remittances').value().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

// GET /api/analytics/volume (Daily volume last 30 days)
router.get('/volume', authMiddleware, (req, res) => {
  const txs = getTx();
  const summary = {};

  // Initialize last 30 days with 0
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    summary[dateStr] = 0;
  }

  txs.forEach(t => {
    const dateStr = t.createdAt.split('T')[0];
    if (summary[dateStr] !== undefined) {
      summary[dateStr] += (t.grossAmount / 1e6);
    }
  });

  const chartData = Object.keys(summary).map(date => ({
    date,
    volume: parseFloat(summary[date].toFixed(2))
  }));

  res.json(chartData);
});

// GET /api/analytics/fees (Daily fee revenue)
router.get('/fees', authMiddleware, (req, res) => {
  const txs = getTx();
  const summary = {};

  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    summary[dateStr] = 0;
  }

  txs.forEach(t => {
    const dateStr = t.createdAt.split('T')[0];
    if (summary[dateStr] !== undefined) {
      summary[dateStr] += (t.fee / 1e6);
    }
  });

  const chartData = Object.keys(summary).map(date => ({
    date,
    fees: parseFloat(summary[date].toFixed(2))
  }));

  res.json(chartData);
});

// GET /api/analytics/corridors
router.get('/corridors', authMiddleware, (req, res) => {
  const txs = getTx();
  const corridors = {};

  txs.forEach(t => {
    const key = `${t.sender}_${t.receiver}`;
    if (!corridors[key]) {
      corridors[key] = { sender: t.sender, receiver: t.receiver, volume: 0, count: 0 };
    }
    corridors[key].volume += (t.grossAmount / 1e6);
    corridors[key].count += 1;
  });

  const sorted = Object.values(corridors).sort((a, b) => b.volume - a.volume).slice(0, 10);
  res.json(sorted);
});

// GET /api/analytics/compliance (Event timeline)
router.get('/compliance', authMiddleware, (req, res) => {
  const logs = db.get('auditLogs').value();
  const timeline = logs
    .filter(l => ['WHITELIST', 'BLACKLIST', 'REMOVE_BLACKLIST'].includes(l.action))
    .slice(-50)
    .reverse();

  res.json(timeline);
});

module.exports = router;
