const express = require("express");
const router = express.Router();
const bc = require("../services/blockchainService");

// GET /api/wallet/:address/balance
router.get("/:address/balance", (req, res) => {
  const balance = bc.getBalance(req.params.address);
  const status = bc.getWalletStatus(req.params.address);
  res.json({
    address: req.params.address,
    balanceUnits: balance,
    balanceUSD: (balance / 1_000_000).toFixed(2),
    compliance: status,
  });
});

// GET /api/wallet/:address/transactions
router.get("/:address/transactions", (req, res) => {
  const addr = req.params.address.toLowerCase();
  const all = bc.getAllRemittances().filter(
    (r) => r.sender === addr || r.receiver === addr
  );
  res.json({ address: addr, total: all.length, data: all });
});

module.exports = router;
