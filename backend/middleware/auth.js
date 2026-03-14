/**
 * @module authMiddleware
 * @description JWT authentication and role-based authorization middleware for BlockPay.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'blockpay-jwt-secret-2024-change-this-in-production';

/**
 * Verifies the Bearer token in Authorization header.
 * Attaches decoded payload to req.user on success.
 */
function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

/**
 * Role-based authorization middleware factory.
 * Must be used AFTER authMiddleware.
 * @param {...string} roles - Allowed roles (e.g. 'admin', 'user')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. This action requires one of the following roles: ${roles.join(', ')}.`
      });
    }
    next();
  };
}

module.exports = authMiddleware;
module.exports.JWT_SECRET = JWT_SECRET;
module.exports.requireRole = requireRole;
