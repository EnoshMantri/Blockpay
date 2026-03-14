require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const http = require("http");
const path = require("path");

const settlementRoutes = require("./routes/settlement");
const complianceRoutes = require("./routes/compliance");
const auditRoutes = require("./routes/audit");
const walletRoutes = require("./routes/wallet");
const authRoutes = require("./routes/auth");
const analyticsRoutes = require("./routes/analytics");
const adminRoutes = require("./routes/admin");

const db = require("./services/db");
const { initWS } = require("./services/wsServer");

const app = express();
const PORT = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === "production";

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for React
}));

// CORS: allow frontend origin (localhost in dev, production URL in prod)
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://localhost:4000",
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) return callback(null, true);
    // In production, also allow same-origin requests
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json());
if (!isProduction) {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/settlement", settlementRoutes);
app.use("/api/compliance", complianceRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/admin", adminRoutes);

// Health check with extended telemetry
const START_TIME = Date.now();
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "BlockPay API",
    version: db.get("config").value()?.version || "1.0.0",
    network: process.env.NETWORK || "simulation",
    uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    counts: {
      users: db.get("users").size().value(),
      wallets: db.get("wallets").size().value(),
      transactions: db.get("remittances").size().value(),
      auditLogs: db.get("auditLogs").size().value(),
    },
    config: db.get("config").value()
  });
});

// ─── Serve Frontend (production) ────────────────────────────────────────────
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// SPA catch-all: any non-API route serves index.html
app.get("*", (req, res, next) => {
  // Don't catch API routes or WebSocket upgrades
  if (req.path.startsWith("/api/") || req.path.startsWith("/ws")) {
    return next();
  }
  res.sendFile(path.join(publicDir, "index.html"));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

const server = http.createServer(app);

// Initialize WebSocket server
initWS(server);

server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════╗
  ║     BlockPay API Server           ║
  ║     Port: ${PORT}                    ║
  ║     Network: ${(process.env.NETWORK || "simulation").padEnd(18)}║
  ║     Mode: ${isProduction ? "PRODUCTION" : "DEVELOPMENT"}             ║
  ╚═══════════════════════════════════╝
  `);
});

module.exports = { app, server };
