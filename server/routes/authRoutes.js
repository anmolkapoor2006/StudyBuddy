const express = require("express");
const router = express.Router();

const { logoutUser, googleAuth, guestAuth, emailAuth, getMe } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiters");

router.post("/google", authLimiter, googleAuth);
router.post("/guest", authLimiter, guestAuth);
router.post("/email", authLimiter, emailAuth);
router.post("/logout", logoutUser);
router.get("/me", authMiddleware, getMe);

module.exports = router;
