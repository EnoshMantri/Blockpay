/**
 * @module db
 * @description Lowdb-backed persistent JSON store for BlockPay.
 * All state is stored in ./data/db.json and survives server restarts.
 */
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const adapter = new FileSync(path.join(DATA_DIR, 'db.json'));
const db = low(adapter);

// Default schema
db.defaults({
  wallets: [],
  remittances: [],
  auditLogs: [],
  balances: [],
  users: [],
  config: {
    feeBps: 50,
    defaultLimit: 500_000_000,
    version: '1.0.0',
  },
}).write();

module.exports = db;
