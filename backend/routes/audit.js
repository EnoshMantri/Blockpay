const express = require("express");
const router = express.Router();
const { auditStore } = require("../services/auditStore");

// GET /api/audit/logs
router.get("/logs", (req, res) => {
  const { limit, offset, action } = req.query;
  res.json(
    auditStore.getAll({
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0,
      action,
    })
  );
});

// GET /api/audit/wallet/:address
router.get("/wallet/:address", (req, res) => {
  res.json(auditStore.getByWallet(req.params.address));
});

// POST /api/audit/log - manual audit log entry
router.post("/log", (req, res) => {
  const entry = auditStore.log(req.body);
  res.json({ success: true, entry });
});

module.exports = router;
