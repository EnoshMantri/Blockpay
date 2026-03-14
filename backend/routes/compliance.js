const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const bc = require("../services/blockchainService");
const authMiddleware = require("../middleware/auth");
const { calculateRiskScore } = require("../services/riskEngine");

const isEthAddress = (val) => /^0x[a-fA-F0-9]{40}$/.test(val);

// GET /api/compliance/wallets
router.get("/wallets", (req, res) => {
  res.json(bc.getAllWallets());
});

// GET /api/compliance/wallet/:address
router.get("/wallet/:address", (req, res) => {
  const status = bc.getWalletStatus(req.params.address);
  res.json({ address: req.params.address, ...status });
});

// Generate a risk score for a wallet
// POST /api/compliance/risk-score/:address
router.post("/risk-score/:address", authMiddleware, (req, res) => {
  try {
    const score = calculateRiskScore(req.params.address);
    res.json(score);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/compliance/whitelist
router.post("/whitelist", authMiddleware, [
  body("address").isString().custom(isEthAddress).withMessage("Must be a valid 42-character Ethereum address (0x...)")
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { address, limit, name, email, kycDocRef } = req.body;
    const limitUnits = limit ? Math.floor(parseFloat(limit) * 1_000_000) : 0;
    const result = await bc.whitelistWallet(address, limitUnits, { name, email, kycDocRef });
    res.json({ success: true, wallet: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/compliance/bulk-whitelist
router.post("/bulk-whitelist", authMiddleware, [
  body("addresses").isArray().withMessage("addresses must be an array")
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { addresses, limit } = req.body;
    const limitUnits = limit ? Math.floor(parseFloat(limit) * 1_000_000) : 0;
    
    // Validate all addresses first
    for (const addr of addresses) {
      if (!isEthAddress(addr)) throw new Error(`Invalid Ethereum address: ${addr}`);
    }
    
    const results = [];
    for (const addr of addresses) {
      results.push(await bc.whitelistWallet(addr, limitUnits, { note: "Bulk import" }));
    }
    res.json({ success: true, count: results.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/compliance/blacklist
router.post("/blacklist", authMiddleware, [
  body("address").isString().custom(isEthAddress).withMessage("Invalid Ethereum address")
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { address, reason } = req.body;
    const result = await bc.blacklistWallet(address, reason || "");
    res.json({ success: true, wallet: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/compliance/remove-blacklist
router.post("/remove-blacklist", authMiddleware, [
  body("address").isString().custom(isEthAddress).withMessage("Invalid Ethereum address")
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { address } = req.body;
    const result = await bc.removeBlacklist(address);
    res.json({ success: true, wallet: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/compliance/set-limit
router.post("/set-limit", authMiddleware, [
  body("address").isString().custom(isEthAddress).withMessage("Invalid Ethereum address"),
  body("limit").isNumeric()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { address, limit } = req.body;
    const limitUnits = Math.floor(parseFloat(limit) * 1_000_000);
    const result = await bc.setTransferLimit(address, limitUnits);
    res.json({ success: true, wallet: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
