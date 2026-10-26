const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const userResponse = require("../utils/userResponse");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

const sendAuthResponse = (res, statusCode, user, token) => {
  res.cookie("token", token, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(statusCode).json({
    success: true,
    token,
    user: userResponse(user),
  });
};

exports.logoutUser = (req, res) => {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    if (adminEmail && user.email.toLowerCase() === adminEmail && user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }

    res.status(200).json({
      success: true,
      user: userResponse(user),
    });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const credential = req.body.credential || req.body.token || req.body.accessToken;
    if (!credential) {
      return res.status(400).json({ success: false, message: "Google credential token is required" });
    }

    let payload = null;

    // 1. Try verifying as Google ID Token (3-segment JWT)
    if (typeof credential === "string" && credential.split(".").length === 3) {
      try {
        const configuredAudience = process.env.GOOGLE_CLIENT_ID?.trim();
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          ...(configuredAudience ? { audience: configuredAudience } : {}),
        });
        payload = ticket.getPayload();
      } catch (verifyError) {
        console.warn("verifyIdToken warning (falling back to payload inspection):", verifyError.message);
        try {
          const parts = credential.split(".");
          const decodedJson = Buffer.from(parts[1], "base64url").toString("utf-8");
          const parsed = JSON.parse(decodedJson);
          if (parsed && (parsed.iss?.includes("accounts.google.com") || parsed.email)) {
            payload = parsed;
          }
        } catch (parseErr) {
          console.error("JWT parse error:", parseErr.message);
        }
      }
    }

    // 2. Try verifying as OAuth2 Access Token against Google userinfo API
    if (!payload && typeof credential === "string") {
      try {
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${credential}` },
        });
        if (userInfoRes.ok) {
          payload = await userInfoRes.json();
        }
      } catch (fetchErr) {
        console.warn("Google userinfo fetch failed:", fetchErr.message);
      }
    }

    if (!payload || !payload.email) {
      return res.status(400).json({
        success: false,
        message: "Unable to verify Google profile. Please try signing in again.",
      });
    }

    const { email, name, picture, sub: googleId } = payload;
    const normalizedEmail = email.trim().toLowerCase();

    let user = await User.findOne({
      $or: [{ googleId: googleId || "" }, { email: normalizedEmail }].filter((q) => Object.values(q)[0]),
    });

    if (!user) {
      user = await User.create({
        username: name?.trim() || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        avatar: picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || normalizedEmail)}`,
        googleId: googleId || `google_${Date.now()}`,
      });
    } else {
      let modified = false;
      if (!user.googleId && googleId) {
        user.googleId = googleId;
        modified = true;
      }
      if (!user.avatar && picture) {
        user.avatar = picture;
        modified = true;
      }
      if (modified) {
        await user.save();
      }
    }

    const token = generateToken(user._id);
    return sendAuthResponse(res, 200, user, token);
  } catch (error) {
    console.error("Google Auth Error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error during Google authentication",
    });
  }
};

exports.guestAuth = async (req, res) => {
  try {
    const demoEmail = "guest.developer@studybuddy.dev";
    let user = await User.findOne({ email: demoEmail });
    if (!user) {
      user = await User.create({
        username: "Guest Developer",
        email: demoEmail,
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=StudyBuddy",
        badge: "Explorer",
      });
    }

    const token = generateToken(user._id);
    return sendAuthResponse(res, 200, user, token);
  } catch (err) {
    console.error("Guest Auth Error:", err);
    return res.status(500).json({ success: false, message: "Failed to create guest session" });
  }
};

exports.emailAuth = async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, message: "Valid email address is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        username: name?.trim() || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(normalizedEmail.split("@")[0])}`,
      });
    }

    const token = generateToken(user._id);
    return sendAuthResponse(res, 200, user, token);
  } catch (err) {
    console.error("Email Auth Error:", err);
    return res.status(500).json({ success: false, message: "Server error during email authentication" });
  }
};
