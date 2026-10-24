const path = require("path");
const fs = require("fs");
const UserCodingProgress = require("../models/UserCodingProgress");
const User = require("../models/User");
const userResponse = require("../utils/userResponse");

const GlobalSheet = require("../models/GlobalSheet");
const { inferProblemCategory, sortModulesByPedagogy } = require("../utils/dsaCategorizer");

const dataDir = path.resolve(__dirname, "../data");

// In-memory cache for fast dataset retrieval
const cache = {
  os: null,
  dbms: null,
  cn: null,
  sql: null,
  tuf180: null,
  cfLadder: null,
  neetcode150: null,
  striversA2Z: null,
};

function loadJson(subPath) {
  try {
    const fullPath = path.join(dataDir, subPath);
    if (fs.existsSync(fullPath)) {
      return JSON.parse(fs.readFileSync(fullPath, "utf8"));
    }
  } catch (err) {
    console.error(`[Prephub] Failed to load ${subPath}:`, err.message);
  }
  return null;
}

function initData() {
  if (!cache.os) cache.os = loadJson("tuf/tuf-os-prep.json");
  if (!cache.dbms) cache.dbms = loadJson("tuf/tuf-dbms-prep.json");
  if (!cache.cn) cache.cn = loadJson("tuf/tuf-cn-prep.json");
  if (!cache.sql) cache.sql = loadJson("tuf/tuf-sql-75.json");
  if (!cache.tuf180) cache.tuf180 = loadJson("tuf/tuf-sde-180-mapped.json");
  if (!cache.cfLadder) cache.cfLadder = loadJson("codeforces/codeforces-ladder.json");
  if (!cache.neetcode150) cache.neetcode150 = loadJson("neetcode/neetcode-150.json");
  if (!cache.striversA2Z) cache.striversA2Z = loadJson("tuf/tuf-strivers-a2z.json");
}

initData();

/**
 * GET /api/prephub/subjects
 * High-level overview grouped into Core CS and DSA roadmaps
 */
exports.getOverview = async (req, res) => {
  try {

    const globalSheets = await GlobalSheet.find({}).lean().catch(() => []);
    const globalMap = new Map(globalSheets.map((g) => [g.id, g]));

    const sde180Global = globalMap.get("strivers-180");
    const blind75Global = globalMap.get("blind-75");
    const sql75Global = globalMap.get("sql-75");
    const cfLadderGlobal = globalMap.get("codeforces-ladder");
    const ncGlobal = globalMap.get("neetcode-150");
    const a2zGlobal = globalMap.get("strivers-a2z");

    const coreSubjects = [];
    const dsaSubjects = [];
    const rkSubjects = [];

    // 1. Dynamic Core CS Cards: Only SQL 75 for initial release

    if (sql75Global || cache.sql?.modules?.length) {
      coreSubjects.push({
        id: "sql",
        title: sql75Global?.title || cache.sql?.sheetName || "SQL Interview 75",
        category: "Databases & Practical Queries",
        group: "core",
        modulesCount: cache.sql?.totalModules || cache.sql?.modules?.length || 12,
        topicsCount: sql75Global?.problems?.length || cache.sql?.totalItems || 75,
        description: "Frequently asked SQL interview problems covering aggregations, joins, window functions, and CTEs.",
        badge: "Hands-on",
        sheetId: "sql-75",
        uploadedBy: "Developer / Admin",
        isOfficial: true,
        sourceUrl: sql75Global?.sourceUrl || "",
        lastSyncedAt: sql75Global?.lastSyncedAt || null,
      });
    }

    // 2. Dynamic DSA Cards (strictly included only if dataset is available)
    if (sde180Global || cache.tuf180?.modules?.length) {
      dsaSubjects.push({
        id: "strivers-180",
        title: sde180Global?.title || cache.tuf180?.sheetName || "SDE 180 Master Sheet",
        category: "DSA Patterns",
        group: "dsa",
        modulesCount: cache.tuf180?.modules?.length || 33,
        topicsCount: sde180Global?.problems?.length || cache.tuf180?.totalItems || 179,
        description: "33 modules covering all core interview DSA patterns mapped directly to LeetCode problems.",
        badge: "Popular",
        sheetId: "strivers-180",
        uploadedBy: "Developer / Admin",
        isOfficial: true,
        sourceUrl: sde180Global?.sourceUrl || "",
        lastSyncedAt: sde180Global?.lastSyncedAt || null,
      });
    }

    if (ncGlobal || cache.neetcode150?.modules?.length) {
      dsaSubjects.push({
        id: "neetcode-150",
        title: ncGlobal?.title || cache.neetcode150?.sheetName || "NeetCode 150",
        category: "DSA Patterns",
        group: "dsa",
        modulesCount: cache.neetcode150?.totalModules || cache.neetcode150?.modules?.length || 18,
        topicsCount: ncGlobal?.problems?.length || cache.neetcode150?.totalItems || 150,
        description: ncGlobal?.description || "18 modules covering the definitive 150 LeetCode patterns for FAANG/tier-1 technical interviews.",
        badge: "Top Pick",
        sheetId: "neetcode-150",
        uploadedBy: "Developer / Admin",
        isOfficial: true,
        sourceUrl: ncGlobal?.sourceUrl || "https://neetcode.io/practice",
        lastSyncedAt: ncGlobal?.lastSyncedAt || null,
      });
    }

    if (a2zGlobal || cache.striversA2Z?.modules?.length) {
      dsaSubjects.push({
        id: "strivers-a2z",
        title: a2zGlobal?.title || cache.striversA2Z?.sheetName || "Striver's A2Z DSA Sheet",
        category: "DSA Patterns",
        group: "dsa",
        modulesCount: cache.striversA2Z?.totalModules || cache.striversA2Z?.modules?.length || 18,
        topicsCount: a2zGlobal?.problems?.length || cache.striversA2Z?.totalItems || 455,
        description: a2zGlobal?.description || "Comprehensive Step-by-Step roadmap (455 problems) from basics, recursion, trees to dynamic programming and tries.",
        badge: "Mastery",
        sheetId: "strivers-a2z",
        uploadedBy: "Developer / Admin",
        isOfficial: true,
        sourceUrl: a2zGlobal?.sourceUrl || "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/",
        lastSyncedAt: a2zGlobal?.lastSyncedAt || null,
      });
    }

    if (cfLadderGlobal || cache.cfLadder?.modules?.length || cache.cfLadder?.problems?.length) {
      dsaSubjects.push({
        id: "codeforces-ladder",
        title: cfLadderGlobal?.title || cache.cfLadder?.title || "Codeforces Ladder",
        category: "Competitive Programming",
        group: "dsa",
        modulesCount: cache.cfLadder?.totalModules || cache.cfLadder?.modules?.length || 8,
        topicsCount: cfLadderGlobal?.problems?.length || cache.cfLadder?.totalItems || cache.cfLadder?.problems?.length || 269,
        description: cfLadderGlobal?.description || cache.cfLadder?.description || "Contest rating ladders (800–1600+) featuring 269 classic problems with accepted C++ solutions & 1-click judge forwarding.",
        badge: "Contests",
        sheetId: "codeforces-ladder",
        uploadedBy: "Developer / Admin",
        isOfficial: true,
        sourceUrl: cfLadderGlobal?.sourceUrl || cache.cfLadder?.sourceUrl || "https://codeforces.com/problemset",
        lastSyncedAt: cfLadderGlobal?.lastSyncedAt || cache.cfLadder?.lastSyncedAt || null,
      });
    }

    // 3. Dynamic Global Sheets from MongoDB (distributed to proper group based on metadata)
    const builtInIds = new Set(["os", "dbms", "cn", "sql", "sql-75", "strivers-180", "codeforces-ladder", "neetcode-150", "strivers-a2z", "rk-classroom"]);

    globalSheets.forEach((gs) => {
      if (builtInIds.has(gs.id)) return;
      const modSet = new Set((gs.problems || []).map((p) => p.module || inferProblemCategory(p.title, p.module)));
      const isRk = gs.group === "rk" || gs.category?.toLowerCase().includes("rk") || gs.id.startsWith("rk-");
      const isCore = gs.group === "core" || gs.category?.toLowerCase().includes("core");
      const targetGroup = isRk ? "rk" : isCore ? "core" : "dsa";

      const card = {
        id: gs.id,
        title: gs.title,
        category: gs.category || (isRk ? "Special Tracks" : isCore ? "Core Computer Science" : "DSA Patterns"),
        group: targetGroup,
        modulesCount: modSet.size || 1,
        topicsCount: (gs.problems || []).length,
        description: gs.description || (isRk ? "Curated practice roadmaps and study materials." : "Official roadmap curated by Developer / Admin."),
        badge: gs.badge || (isRk ? "Curated" : "Curated"),
        sheetId: gs.id,
        uploadedBy: gs.uploadedBy?.name || "Developer / Admin",
        isOfficial: Boolean(gs.isOfficial),
        sourceUrl: gs.sourceUrl || "",
        lastSyncedAt: gs.lastSyncedAt || null,
      };

      if (targetGroup === "rk") rkSubjects.push(card);
      else if (targetGroup === "core") coreSubjects.push(card);
      else dsaSubjects.push(card);
    });

    // 4. Default RK workspace placeholder if no custom RK sheets exist
    if (rkSubjects.length === 0) {
      rkSubjects.push({
        id: "rk-classroom",
        title: "Classroom Notes & Assignments",
        category: "Special Tracks",
        group: "rk",
        modulesCount: 0,
        topicsCount: 0,
        description: "Curated study notes, mock problem series, and lecture materials.",
        badge: "Curated",
        uploadedBy: "Developer / Admin",
        isOfficial: true,
      });
    }

    res.json({
      success: true,
      coreSubjects,
      dsaSubjects,
      rkSubjects,
      subjects: [...coreSubjects, ...dsaSubjects, ...rkSubjects],
    });
  } catch (error) {
    console.error("[Prephub:getOverview]", error);
    res.status(500).json({ success: false, message: "Failed to load prephub overview" });
  }
};

function buildModulesFromProblems(problems = []) {
  const moduleMap = new Map();
  problems.forEach((p, idx) => {
    const modName = p.module || inferProblemCategory(p.title, p.module) || "Core Patterns";
    if (!moduleMap.has(modName)) {
      moduleMap.set(modName, []);
    }
    const judgeLink = p.platformUrl || p.leetcodeUrl || p.questionUrl || "";
    const solLink = p.solutionUrl || p.instructorUrl || "";
    moduleMap.get(modName).push({
      id: p.id || idx + 1,
      number: p.number || String(idx + 1),
      title: p.title,
      module: modName,
      platform: p.platform || (judgeLink.includes("codeforces.com") ? "Codeforces" : "LeetCode"),
      platformUrl: judgeLink || solLink,
      leetcodeUrl: p.leetcodeUrl || (judgeLink.includes("leetcode.com") ? judgeLink : ""),
      solutionUrl: solLink,
      leetcodeDifficulty: p.leetcodeDifficulty || "Medium",
      hasNotes: Boolean(p.hasNotes),
    });
  });

  const rawModules = Array.from(moduleMap.entries()).map(([moduleTitle, items], mIdx) => ({
    moduleId: `mod-${mIdx + 1}`,
    moduleTitle,
    items,
  }));

  return sortModulesByPedagogy(rawModules);
}

/**
 * GET /api/prephub/subject/:subjectId
 * Detailed module and topic syllabus for a core subject or DSA sheet
 */
exports.getSubjectDetails = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const lowerId = subjectId.toLowerCase();

    // 1. Core CS: OS, DBMS, CN
    if (["os", "dbms", "cn"].includes(lowerId)) {
      const data = cache[lowerId];
      if (!data) return res.status(404).json({ success: false, message: "Subject syllabus data unavailable" });
      return res.json({
        success: true,
        subjectId,
        group: "core",
        title: data.subjectName || data.sheetName,
        totalModules: data.totalModules,
        totalItems: data.totalItems,
        modules: data.modules,
        uploadedBy: "Developer / Admin",
        isOfficial: true,
      });
    }

    // 2. Core CS / SQL: sql or sql-75
    if (lowerId === "sql" || lowerId === "sql-75") {
      const globalSheet = await GlobalSheet.findOne({ id: "sql-75" }).lean().catch(() => null);
      const data = cache.sql;
      if (!data && !globalSheet) return res.status(404).json({ success: false, message: "SQL syllabus data unavailable" });
      const modules = (data?.modules?.length ? data.modules : null) || buildModulesFromProblems(globalSheet?.problems || []);
      return res.json({
        success: true,
        subjectId: "sql",
        group: "core",
        sheetId: "sql-75",
        title: globalSheet?.title || data?.sheetName || "SQL Interview 75",
        totalModules: modules.length,
        totalItems: globalSheet?.problems?.length || data?.totalItems || 75,
        modules,
        uploadedBy: "Developer / Admin",
        isOfficial: true,
        sourceUrl: globalSheet?.sourceUrl || "",
        lastSyncedAt: globalSheet?.lastSyncedAt || null,
      });
    }

    // 3. DSA: SDE 180
    if (lowerId === "strivers-180") {
      const globalSheet = await GlobalSheet.findOne({ id: "strivers-180" }).lean().catch(() => null);
      const data = cache.tuf180;
      if (!data && !globalSheet) return res.status(404).json({ success: false, message: "Sheet data unavailable" });

      const modules = (data?.modules?.length ? data.modules : null) || buildModulesFromProblems(globalSheet?.problems || []);
      const totalItems = globalSheet?.problems?.length || data?.totalItems || 179;

      return res.json({
        success: true,
        subjectId: "strivers-180",
        group: "dsa",
        sheetId: "strivers-180",
        title: globalSheet?.title || data?.sheetName || "SDE 180 Master Sheet",
        totalModules: modules.length,
        totalItems,
        modules,
        uploadedBy: "Developer / Admin",
        isOfficial: true,
        sourceUrl: globalSheet?.sourceUrl || "https://leetcode.com",
        lastSyncedAt: globalSheet?.lastSyncedAt || null,
      });
    }

    // 3.5 Codeforces Ladder
    if (lowerId === "codeforces-ladder") {
      const globalSheet = await GlobalSheet.findOne({ id: "codeforces-ladder" }).lean().catch(() => null);
      const ladderData = cache.cfLadder;
      if (!ladderData && !globalSheet) return res.status(404).json({ success: false, message: "Ladder data unavailable" });

      const modules = (ladderData?.modules?.length ? ladderData.modules : null) || buildModulesFromProblems(globalSheet?.problems || []);
      const totalItems = globalSheet?.problems?.length || ladderData?.totalItems || 269;

      return res.json({
        success: true,
        subjectId: "codeforces-ladder",
        group: "dsa",
        sheetId: "codeforces-ladder",
        title: globalSheet?.title || ladderData?.title || "Codeforces Ladder",
        totalModules: modules.length,
        totalItems,
        modules,
        uploadedBy: "Developer / Admin",
        isOfficial: true,
        sourceUrl: globalSheet?.sourceUrl || ladderData?.sourceUrl || "https://codeforces.com/problemset",
        lastSyncedAt: globalSheet?.lastSyncedAt || ladderData?.lastSyncedAt || null,
      });
    }

    // 4. Check dynamic GlobalSheet created by developer / admin
    const globalSheet = await GlobalSheet.findOne({ id: lowerId }).lean().catch(() => null);
    if (globalSheet) {
      const modules = buildModulesFromProblems(globalSheet.problems || []);
      const isRk = globalSheet.group === "rk" || globalSheet.category?.toLowerCase().includes("rk") || lowerId.startsWith("rk-");
      const isCore = globalSheet.group === "core" || globalSheet.category?.toLowerCase().includes("core");
      const resolvedGroup = isRk ? "rk" : isCore ? "core" : "dsa";

      return res.json({
        success: true,
        subjectId: lowerId,
        group: resolvedGroup,
        sheetId: lowerId,
        title: globalSheet.title,
        totalModules: modules.length,
        totalItems: (globalSheet.problems || []).length,
        modules,
        uploadedBy: globalSheet.uploadedBy?.name || "Developer / Admin",
        isOfficial: true,
        sourceUrl: globalSheet.sourceUrl || "",
        lastSyncedAt: globalSheet.lastSyncedAt || null,
      });
    }

    if (lowerId === "neetcode-150" && cache.neetcode150) {
      return res.json({
        success: true,
        subjectId: "neetcode-150",
        group: "dsa",
        sheetId: "neetcode-150",
        title: cache.neetcode150.sheetName || "NeetCode 150",
        totalModules: cache.neetcode150.modules?.length || 18,
        totalItems: cache.neetcode150.totalItems || 150,
        modules: cache.neetcode150.modules || [],
        uploadedBy: "Developer / Admin",
        isOfficial: true,
        sourceUrl: "https://neetcode.io/practice",
        lastSyncedAt: null,
      });
    }

    if (lowerId === "strivers-a2z" && cache.striversA2Z) {
      return res.json({
        success: true,
        subjectId: "strivers-a2z",
        group: "dsa",
        sheetId: "strivers-a2z",
        title: cache.striversA2Z.sheetName || "Striver's A2Z DSA Sheet",
        totalModules: cache.striversA2Z.modules?.length || 18,
        totalItems: cache.striversA2Z.totalItems || 455,
        modules: cache.striversA2Z.modules || [],
        uploadedBy: "Developer / Admin",
        isOfficial: true,
        sourceUrl: "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/",
        lastSyncedAt: null,
      });
    }

    // 5. Special Track Modules
    if (lowerId === "rk-classroom") {
      return res.json({
        success: true,
        subjectId: "rk-classroom",
        group: "rk",
        title: "Classroom Notes & Assignments",
        totalModules: 0,
        totalItems: 0,
        modules: [],
        isUpcoming: true,
        uploadedBy: "Developer / Admin",
        isOfficial: true,
      });
    }

    return res.status(404).json({ success: false, message: "Subject or sheet not found" });
  } catch (error) {
    console.error("[Prephub:getSubjectDetails]", error);
    res.status(500).json({ success: false, message: "Failed to load subject details" });
  }
};

/**
 * POST /api/prephub/import-sheet
 * Add a sheet to user's active practice sheets
 */
exports.importSheet = async (req, res) => {
  try {
    const { sheetId } = req.body;
    if (!sheetId) return res.status(400).json({ success: false, message: "sheetId is required" });

    const progress = await UserCodingProgress.findOneAndUpdate(
      { userId: req.user.id },
      { $addToSet: { activeSheets: sheetId } },
      { upsert: true, new: true }
    ).lean();

    res.json({ success: true, activeSheets: progress.activeSheets });
  } catch (error) {
    console.error("[Prephub:importSheet]", error);
    res.status(500).json({ success: false, message: "Failed to import sheet" });
  }
};

/**
 * POST /api/prephub/verify-passkey
 * Instant unlock for students with secret classroom passkey
 */
exports.verifyPasskey = async (req, res) => {
  try {
    const { passkey } = req.body;
    if (!passkey || typeof passkey !== "string") {
      return res.status(400).json({ success: false, message: "Please provide a valid classroom passkey" });
    }

    const expectedPasskey = (process.env.RK_STUDENT_PASSKEY || "RKCLASS2026").trim().toLowerCase();
    if (passkey.trim().toLowerCase() !== expectedPasskey) {
      return res.status(401).json({
        success: false,
        message: "Invalid passkey. Please check with your administrator.",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.isRkStudent = true;
    user.rkStatus = "approved";
    if (!user.badge || user.badge === "Basic User") {
      user.badge = "Scholar";
    }
    await user.save();

    return res.json({
      success: true,
      message: "Access granted! Welcome 🎉",
      user: userResponse(user),
    });
  } catch (error) {
    console.error("[Prephub:verifyPasskey]", error);
    res.status(500).json({ success: false, message: "Server error verifying passkey" });
  }
};

/**
 * POST /api/prephub/request-verification
 * Student submits roll number / batch for manual instructor review
 */
exports.requestVerification = async (req, res) => {
  try {
    const { studentName, contact, rollNo, batch } = req.body;
    if (!studentName || !contact) {
      return res.status(400).json({
        success: false,
        message: "Student Name and Phone Number are required",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.rkStatus = "pending";
    user.rkStudentDetails = {
      studentName: studentName.trim(),
      contact: contact.trim(),
      rollNo: (rollNo || "").trim(),
      batch: (batch || "").trim(),
      requestedAt: new Date(),
    };
    await user.save();

    return res.json({
      success: true,
      message: "Verification request submitted! Your instructor will review it shortly.",
      user: userResponse(user),
    });
  } catch (error) {
    console.error("[Prephub:requestVerification]", error);
    res.status(500).json({ success: false, message: "Server error submitting verification request" });
  }
};

/**
 * GET /api/prephub/admin/pending-verifications
 * Admin list of pending student verification requests
 */
exports.getPendingVerifications = async (req, res) => {
  try {
    const requests = await User.find({ rkStatus: "pending" })
      .select("username email rkStudentDetails createdAt")
      .sort({ "rkStudentDetails.requestedAt": -1 })
      .lean();

    res.json({
      success: true,
      requests: requests.map((u) => ({
        userId: u._id,
        username: u.username,
        email: u.email,
        studentName: u.rkStudentDetails?.studentName || u.username,
        contact: u.rkStudentDetails?.contact || "",
        requestedAt: u.rkStudentDetails?.requestedAt || u.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/prephub/admin/decide-verification
 * Admin approve or reject a student verification request
 */
exports.decideVerification = async (req, res) => {
  try {
    const { userId, decision } = req.body;
    if (!userId || !["approve", "reject"].includes(decision)) {
      return res.status(400).json({ success: false, message: "Valid userId and decision required" });
    }

    const isApprove = decision === "approve";
    const update = isApprove
      ? { isRkStudent: true, rkStatus: "approved", "rkStudentDetails.approvedAt": new Date() }
      : { isRkStudent: false, rkStatus: "rejected" };

    const targetUser = await User.findByIdAndUpdate(userId, { $set: update }, { new: true });
    if (!targetUser) return res.status(404).json({ success: false, message: "User not found" });

    res.json({
      success: true,
      message: `User ${decision}d`,
      targetUserId: targetUser._id,
      status: targetUser.rkStatus,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
