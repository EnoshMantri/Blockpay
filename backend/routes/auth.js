const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../services/db');
const { JWT_SECRET } = require('../middleware/auth');

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, username, walletAddress, password } = req.body;

    // At minimum we need an email OR walletAddress, plus a password
    if (!password) {
      return res.status(400).json({ error: 'password is required' });
    }
    if (!email && !walletAddress) {
      return res.status(400).json({ error: 'email or walletAddress is required' });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check for duplicate email
    if (email) {
      const existingByEmail = db.get('users').find({ email: email.toLowerCase() }).value();
      if (existingByEmail) {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }
    }

    // Check for duplicate wallet address
    const addr = walletAddress ? walletAddress.toLowerCase() : null;
    if (addr) {
      const existingByWallet = db.get('users').find({ walletAddress: addr }).value();
      if (existingByWallet) {
        return res.status(400).json({ error: 'An account with this wallet address already exists' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = {
      id: require('crypto').randomUUID(),
      email: email ? email.toLowerCase() : null,
      username: username ? username.trim() : null,
      walletAddress: addr,
      passwordHash,
      role: 'user',  // Default role — admins are seeded separately
      createdAt: new Date().toISOString(),
    };

    db.get('users').push(user).write();

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please log in.',
    });
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, walletAddress, password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'password is required' });
    }
    if (!email && !walletAddress) {
      return res.status(400).json({ error: 'email or walletAddress is required' });
    }

    // Find user by email OR walletAddress
    let user = null;
    if (email) {
      user = db.get('users').find({ email: email.toLowerCase() }).value();
    }
    if (!user && walletAddress) {
      user = db.get('users').find({ walletAddress: walletAddress.toLowerCase() }).value();
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = {
      id: user.id,
      email: user.email,
      username: user.username,
      walletAddress: user.walletAddress,
      role: user.role,  // 'user' | 'admin'
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        walletAddress: user.walletAddress,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/seed-admin ────────────────────────────────────────────────
// One-time admin seeding. Will error if an admin already exists.
router.post('/seed-admin', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    // Only allow if no admin exists yet
    const existingAdmin = db.get('users').find({ role: 'admin' }).value();
    if (existingAdmin) {
      return res.status(400).json({ error: 'An admin account already exists. Use the login page.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const admin = {
      id: require('crypto').randomUUID(),
      email: email.toLowerCase(),
      username: username || 'Admin',
      walletAddress: null,
      passwordHash,
      role: 'admin',
      createdAt: new Date().toISOString(),
    };

    db.get('users').push(admin).write();

    res.status(201).json({
      success: true,
      message: `Admin account created for ${admin.email}. Please log in.`,
    });
  } catch (err) {
    console.error('[auth/seed-admin]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
const authMiddleware = require('../middleware/auth');
router.get('/me', authMiddleware, (req, res) => {
  const user = db.get('users').find({ id: req.user.id }).value();
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

module.exports = router;
