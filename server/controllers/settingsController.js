const User = require("../models/User");
const userResponse = require("../utils/userResponse");

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      user: userResponse(user),
    });
  } catch (error) {
    console.error("[Get Profile]", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { username, name, email, badge, leetcodeHandle, codeforcesHandle } = req.body || {};
    const rawName = typeof username === "string" ? username : (typeof name === "string" ? name : "");
    const targetUsername = rawName.trim();
    const targetEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!targetUsername || !targetEmail || !targetEmail.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Valid name and email are required",
      });
    }

    const updateFields = {
      username: targetUsername,
      email: targetEmail,
    };

    if (badge !== undefined) updateFields.badge = typeof badge === "string" ? badge.trim() : "";
    if (leetcodeHandle !== undefined) updateFields.leetcodeHandle = typeof leetcodeHandle === "string" ? leetcodeHandle.trim() : "";
    if (codeforcesHandle !== undefined) updateFields.codeforcesHandle = typeof codeforcesHandle === "string" ? codeforcesHandle.trim() : "";

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: userResponse(updatedUser),
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Email is already in use" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("[Update Profile]", error.message);
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};
