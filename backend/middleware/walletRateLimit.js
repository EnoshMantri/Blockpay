/**
 * @module walletRateLimit
 * @description Per-wallet rate limiter: max 10 transactions per wallet per hour.
 */

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_TX = 10;

/** @type {Map<string, number[]>} address -> array of timestamps */
const walletWindows = new Map();

/**
 * Rate-limits requests by wallet address (sender field in body).
 * Returns 429 with Retry-After header when limit exceeded.
 */
function walletRateLimit(req, res, next) {
  const wallet = (req.body?.sender || '').toLowerCase();
  if (!wallet) return next(); // let validation catch missing sender

  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Prune old timestamps
  const timestamps = (walletWindows.get(wallet) || []).filter(t => t > windowStart);

  if (timestamps.length >= MAX_TX) {
    const oldest = timestamps[0];
    const retryAfterMs = Math.ceil((oldest + WINDOW_MS - now) / 1000);
    res.setHeader('Retry-After', retryAfterMs);
    return res.status(429).json({
      error: `Rate limit exceeded for wallet ${wallet}. Max ${MAX_TX} transactions per hour.`,
      retryAfterSeconds: retryAfterMs,
    });
  }

  timestamps.push(now);
  walletWindows.set(wallet, timestamps);
  next();
}

module.exports = walletRateLimit;
