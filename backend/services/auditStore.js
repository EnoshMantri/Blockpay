const db = require("./db");

const auditStore = {
  log(entry) {
    const record = {
      id: db.get("auditLogs").size().value() + 1,
      ...entry,
      timestamp: new Date().toISOString(),
    };
    db.get("auditLogs").push(record).write();
    return record;
  },

  getAll({ limit = 100, offset = 0, action } = {}) {
    let filtered = db.get("auditLogs").value().slice().reverse();
    if (action) filtered = filtered.filter((l) => l.action === action);
    return {
      total: filtered.length,
      data: filtered.slice(offset, offset + limit),
    };
  },

  getByWallet(address) {
    const addr = address.toLowerCase();
    return db.get("auditLogs").value()
      .filter((l) => l.wallet === addr || l.sender === addr || l.receiver === addr)
      .reverse();
  },
};

module.exports = { auditStore };
