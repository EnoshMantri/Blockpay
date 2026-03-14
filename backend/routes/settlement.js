const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { auditStore } = require('../services/auditStore');
const db = require('../services/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─── Record On-Chain Settlement (From MetaMask Frontend) ───────────────
// Requires authentication — only logged-in users may record settlements
router.post(
  '/record-onchain',
  authMiddleware,
  [
    body('id').isUUID().withMessage('Valid UUID required'),
    body('sender').isEthereumAddress().withMessage('Valid checksum sender address required'),
    body('receiver').isEthereumAddress().withMessage('Valid checksum receiver address required'),
    body('grossAmount').isNumeric().withMessage('grossAmount must be numeric'),
    body('fee').isNumeric().withMessage('fee must be numeric'),
    body('netAmount').isNumeric().withMessage('netAmount must be numeric'),
    body('txHash').isString().notEmpty().withMessage('txHash is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const record = {
        id: req.body.id,
        sender: req.body.sender.toLowerCase(),
        receiver: req.body.receiver.toLowerCase(),
        grossAmount: Number(req.body.grossAmount),
        fee: Number(req.body.fee),
        netAmount: Number(req.body.netAmount),
        settlementHash: req.body.settlementHash || req.body.txHash,
        txHash: req.body.txHash,
        blockNumber: req.body.blockNumber || 0,
        status: 'settled',
        createdAt: req.body.createdAt || new Date().toISOString(),
        settledAt: req.body.settledAt || new Date().toISOString(),
        isMetaMask: true,
      };

      // Ensure we don't accidentally insert duplicates if the frontend retries
      const existing = db.get('remittances').find({ id: record.id }).value();
      if (!existing) {
        db.get('remittances').push(record).write();
        auditStore.log({ action: 'META_MASK_REMITTANCE_RECORDED', remittanceId: record.id, ...record });
      }

      res.status(201).json({ message: 'On-chain record saved', record });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Query Route — Protected: only logged-in users may query settlements ──
router.get('/', authMiddleware, (req, res) => {
  try {
    const { sender, receiver, status, page = 1, limit = 10 } = req.query;
    let data = db.get('remittances').value();

    if (sender)   data = data.filter(r => r.sender   === sender.toLowerCase());
    if (receiver) data = data.filter(r => r.receiver === receiver.toLowerCase());
    if (status)   data = data.filter(r => r.status   === status);

    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total     = data.length;
    const pages     = Math.ceil(total / Number(limit));
    const start     = (Number(page) - 1) * Number(limit);
    const paginated = data.slice(start, start + Number(limit));

    res.json({ total, page: Number(page), pages, data: paginated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get single settlement by ID — Protected ─────────────────────────────
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const record = db.get('remittances').find({ id: req.params.id }).value();
    if (!record) return res.status(404).json({ error: 'Settlement not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Stats overview — Protected ──────────────────────────────────────────
router.get('/stats/overview', authMiddleware, (req, res) => {
  try {
    const records = db.get('remittances').value();
    const total    = records.length;
    const settled  = records.filter(r => r.status === 'settled').length;
    const pending  = records.filter(r => r.status === 'pending').length;
    const failed   = records.filter(r => r.status === 'failed').length;
    const totalVol = records.reduce((sum, r) => sum + (r.grossAmount || 0), 0);
    const totalFee = records.reduce((sum, r) => sum + (r.fee || 0), 0);

    res.json({
      total, settled, pending, failed,
      totalVolume: totalVol / 1e6,
      totalFees:   totalFee / 1e6,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Deposit (simulation) — Protected ────────────────────────────────────
router.post('/deposit', authMiddleware, (req, res) => {
  try {
    const { address, amount } = req.body;
    if (!address || !amount) return res.status(400).json({ error: 'address and amount are required' });

    const existing = db.get('balances').find({ address: address.toLowerCase() }).value();
    const amountNum = Number(amount);

    if (existing) {
      db.get('balances').find({ address: address.toLowerCase() }).assign({ balance: existing.balance + amountNum }).write();
    } else {
      db.get('balances').push({ address: address.toLowerCase(), balance: amountNum }).write();
    }

    const updated = db.get('balances').find({ address: address.toLowerCase() }).value();
    res.json({ success: true, address: address.toLowerCase(), balance: updated.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get balance by address — Protected ──────────────────────────────────
router.get('/balance/:address', authMiddleware, (req, res) => {
  try {
    const entry = db.get('balances').find({ address: req.params.address.toLowerCase() }).value();
    res.json({ address: req.params.address.toLowerCase(), balance: entry?.balance || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ─── Simulate Transaction — Protected (any authenticated user) ────────────────
// Runs a realistic settlement simulation without requiring MetaMask.
// The result is stored in the DB identically to a real on-chain transaction.
router.post('/simulate', authMiddleware, [
  body('sender').isEthereumAddress().withMessage('Valid Ethereum address required for sender'),
  body('receiver').isEthereumAddress().withMessage('Valid Ethereum address required for receiver'),
  body('amount').isNumeric({ no_symbols: false }).withMessage('amount must be a positive number'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { sender, receiver, amount } = req.body;
    const grossAmount = Math.round(parseFloat(amount) * 1_000_000); // micro-units (6 decimals)
    const fee         = Math.round(grossAmount * 0.005);            // 0.5% platform fee
    const netAmount   = grossAmount - fee;

    if (grossAmount <= 0) return res.status(400).json({ error: 'amount must be greater than 0' });

    const id          = crypto.randomUUID();
    const createdAt   = new Date().toISOString();
    const settledAt   = new Date().toISOString();
    const fakeHash    = '0xSIM_' + crypto.randomBytes(28).toString('hex');
    const fakeBlock   = 1000 + Math.floor(Math.random() * 9000);

    // Build the 6 pipeline stages (replays the frontend stage tracker)
    const stages = [
      { stage: 1, name: 'Deposit Initiated',  timestamp: new Date(Date.now() + 0).toISOString(),   depositRef: `MEM-DEP-${id.slice(0, 8)}` },
      { stage: 2, name: 'Stablecoin Minted',  timestamp: new Date(Date.now() + 600).toISOString(), balance: (grossAmount / 1e6).toFixed(2) },
      { stage: 3, name: 'Compliance Check',   timestamp: new Date(Date.now() + 1200).toISOString(), status: 'PASSED' },
      { stage: 4, name: 'Remittance Transfer',timestamp: new Date(Date.now() + 1800).toISOString(), txHash: fakeHash },
      { stage: 5, name: 'Settlement Finalized',timestamp: new Date(Date.now() + 2400).toISOString(),blockNumber: fakeBlock },
      { stage: 6, name: 'Burn + Withdrawal',  timestamp: new Date(Date.now() + 3000).toISOString(), disbursed: (netAmount / 1e6).toFixed(2) },
    ];

    const record = {
      id,
      sender: sender.toLowerCase(),
      receiver: receiver.toLowerCase(),
      grossAmount,
      fee,
      netAmount,
      settlementHash: fakeHash,
      txHash: fakeHash,
      blockNumber: fakeBlock,
      status: 'settled',
      createdAt,
      settledAt,
      isSimulation: true,
      stages,
    };

    db.get('remittances').push(record).write();
    auditStore.log({
      action: 'SIMULATION_REMITTANCE',
      remittanceId: id,
      initiatedBy: req.user.email || req.user.walletAddress,
      ...record,
    });

    res.status(201).json({ success: true, record, stages });
  } catch (err) {
    console.error('[settlement/simulate]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
