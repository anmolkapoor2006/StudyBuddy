const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const prephubController = require("../controllers/prephubController");

const User = require("../models/User");

const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.id).select("role email").lean();
    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    if (user?.role === "admin" || (adminEmail && user?.email?.toLowerCase() === adminEmail)) {
      return next();
    }
    return res.status(403).json({ success: false, message: "Admin access required" });
  } catch {
    return res.status(500).json({ success: false, message: "Authorization check failed" });
  }
};

router.use(authMiddleware);

router.get("/subjects", prephubController.getOverview);
router.get("/subject/:subjectId", prephubController.getSubjectDetails);
router.post("/import-sheet", prephubController.importSheet);

// Student / Batch Verification Routes
router.post("/verify-passkey", prephubController.verifyPasskey);
router.post("/request-verification", prephubController.requestVerification);
router.get("/admin/pending-verifications", requireAdmin, prephubController.getPendingVerifications);
router.post("/admin/decide-verification", requireAdmin, prephubController.decideVerification);

module.exports = router;
