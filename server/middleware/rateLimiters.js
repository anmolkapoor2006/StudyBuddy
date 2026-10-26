const rateLimit = require("express-rate-limit");

/**
 * Helper to identify user:
 * Uses User ID if authenticated (solves shared college/hostel Wi-Fi issue),
 * falls back to public IP for unauthenticated requests.
 */
const getUserOrIpKey = (req) => {
  return req.user?.id ? `user_${req.user.id}` : req.ip;
};

/**
 * 1. Global Platform Guard
 * Allows normal browsing (100 req/min), blocks volumetric DDoS & fast bots.
 * Skips health check & live extraction monitor so dashboard stays real-time.
 */
const isDev = process.env.NODE_ENV !== "production";

exports.globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 1000 : 200,
  message: {
    success: false,
    message: "Too many requests from this connection. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    isDev ||
    req.path === "/api/health" ||
    req.path === "/" ||
    req.ip === "127.0.0.1" ||
    req.ip === "::1",
});

/**
 * 2. Auth Brute-Force Guard
 * Max 10 failed login/register attempts per 15 minutes per IP.
 */
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 100 : 10,
  message: {
    success: false,
    message: "Too many login attempts from this network. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 3. Solution Reader Rate Limiter
 * Allows smooth problem browsing while preventing automated mass-scrapers.
 */
exports.practiceSolutionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 300 : 60,
  keyGenerator: getUserOrIpKey,
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: "Solution browsing rate exceeded. Please wait a moment before loading more solutions.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
});
