const path = require("path");
const fs = require("fs");
const axios = require("axios");
const User = require("../models/User");
const UserCodingProgress = require("../models/UserCodingProgress");
const GlobalSheet = require("../models/GlobalSheet");
const ProblemSolution = require("../models/ProblemSolution");
const DailyActivity = require("../models/DailyActivity");
const { getLocalDateString } = require("../utils/dateUtils");
const geminiSheetService = require("../services/geminiSheetService");
const leetcodeService = require("../services/leetcodeService");
const { inferProblemCategory, sortModulesByPedagogy } = require("../utils/dsaCategorizer");

// In-memory fast dataset maps & metadata
let tuf180Data = null;
let sql75Data = null;
const catalogMap = new Map();
const leetcodeSolutionsMap = new Map();
const curatedSolutionsMap = new Map();
const tufItemMap = new Map();
const tufNonLeetcodeMap = new Map();
const codeforcesMap = new Map();
const codeforcesSolutionsMap = new Map();
const externalProblemsMap = new Map();
let lastLcMtime = 0;
const dataDir = path.resolve(__dirname, "../data");

const normalize = (str) =>
  String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();

const PLATFORM_DOMAINS = [
  ["leetcode.com", "LeetCode"],
  ["codeforces.com", "Codeforces"],
  ["codechef.com", "CodeChef"],
  ["geeksforgeeks.org", "GeeksforGeeks"],
  ["hackerrank.com", "HackerRank"],
];

const detectPlatform = (url = "") => {
  const match = PLATFORM_DOMAINS.find(([domain]) => url.includes(domain));
  return match ? match[1] : (url.startsWith("http") ? "Problem Link" : "");
};

const parseCodeforcesUrl = (url = "") => {
  if (!url || typeof url !== "string" || !url.includes("codeforces.com")) return null;
  const m = url.match(/(?:problemset\/problem|contest|gym)\/(\d+)(?:\/problem)?\/([a-zA-Z0-9]+)/i);
  if (m) {
    const contestId = m[1];
    const index = m[2].toUpperCase();
    return {
      contestId,
      index,
      id: `${contestId}${index}`,
      normId: normalize(`${contestId}${index}`),
    };
  }
  return null;
};

const isPracticeJudgeUrl = (url = "") => {
  if (!url) return false;
  return /leetcode\.com\/problems|takeuforward\.org\/practice|geeksforgeeks\.org\/problems|codeforces\.com\/(?:problemset|contest|gym)|hackerrank\.com\/challenges|codechef\.com\/problems|interviewbit\.com\/problems|spoj\.com|atcoder\.jp/i.test(url);
};

const isInstructorResourceUrl = (url = "") => {
  if (!url) return false;
  return /drive\.google\.com|docs\.google\.com|youtube\.com|youtu\.be|github\.com|notion\.so|notion\.site|loom\.com|medium\.com|dropbox\.com|pastebin\.com|hastebin\.com|ghostbin\.com|rentry\.co/i.test(url);
};

function cleanProblemTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== "string") return "";
  let title = rawTitle.trim();

  // Strip leading numbering / prefixes (strictly require separator punctuation before stripping digits to protect titles like '24 Game' or '132 Pattern'):
  title = title.replace(/^(?:question|prob(?:lem)?|q|day)\s*#?\d+[\s.:\-–—)\]]+/i, "");
  title = title.replace(/^(?:leetcode|lc)\s*#?\d*[\s.:\-–—)\]]+/i, "");
  title = title.replace(/^#\s*\d+[\s.:\-–—)\]]*/, "");
  title = title.replace(/^\d+\s*[\.:)\]]\s*|^\d+\s+[\-–—]\s+/, "");

  // Strip trailing difficulties, platforms, brackets, tags ONLY when in brackets () [] {} or preceded by a delimiter ( - | ):
  title = title.replace(/(?:[\s\-–—|]+\s*|[\(\[\{])(?:easy|medium|hard)[\)\]\}]?\s*$/i, "");
  title = title.replace(/(?:[\s\-–—|]+\s*|[\(\[\{])(?:leetcode|lc|gfg|codeforces|tuf)[\s\d]*[\)\]\}]?\s*$/i, "");
  title = title.replace(/(?:[\s\-–—|]+\s*|[\(\[\{])(?:optimal|brute\s*force|better)[\)\]\}]?\s*$/i, "");
  title = title.replace(/(?:[\s\-–—|]+\s*|[\(\[\{])(?:arrays?|strings?|trees?|graphs?|dp|dynamic\s*programming|linked\s*lists?|binary\s*search)[\)\]\}]\s*$/i, "");

  // Clean trailing/leading punctuation
  title = title.replace(/^[\s.:\-–—]+|[\s.:\-–—]+$/g, "").trim();

  return title || rawTitle.trim();
}

function findProblemInDatabase(cleanTitle, rawTitle = "") {
  loadData();
  const normClean = normalize(cleanTitle);
  const normRaw = normalize(rawTitle);

  // 1. Direct match on clean title
  let match =
    catalogMap.get(normClean) ||
    tufItemMap.get(normClean) ||
    curatedSolutionsMap.get(normClean) ||
    leetcodeSolutionsMap.get(normClean) ||
    codeforcesMap.get(normClean) ||
    externalProblemsMap.get(normClean);
  if (match) return match;

  // 2. Direct match on raw title if different
  if (normRaw && normRaw !== normClean) {
    match =
      catalogMap.get(normRaw) ||
      tufItemMap.get(normRaw) ||
      curatedSolutionsMap.get(normRaw) ||
      leetcodeSolutionsMap.get(normRaw) ||
      codeforcesMap.get(normRaw) ||
      externalProblemsMap.get(normRaw);
    if (match) return match;
  }

  // 3. Word-set fuzzy matching across external, LeetCode catalog, and Codeforces (skipping duplicate aliases)
  const cleanWords = cleanTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["the", "and", "for", "with", "from"].includes(w));

  if (cleanWords.length >= 2) {
    for (const [key, item] of externalProblemsMap.entries()) {
      if (key !== normalize(item.title)) continue;
      const titleLower = (item.title || "").toLowerCase();
      if (cleanWords.every((w) => titleLower.includes(w))) return item;
    }
    for (const [key, item] of catalogMap.entries()) {
      if (key !== normalize(item.title)) continue;
      const titleLower = (item.title || "").toLowerCase();
      if (cleanWords.every((w) => titleLower.includes(w))) return item;
    }
    for (const [key, item] of codeforcesMap.entries()) {
      if (key !== normalize(item.title || item.name)) continue;
      const titleLower = (item.title || item.name || "").toLowerCase();
      if (cleanWords.every((w) => titleLower.includes(w))) return item;
    }
  }

  return null;
}

function resolveProblemItem(p, idx = 0) {
  const rawTitle = (p.title || `Problem ${idx + 1}`).trim();
  const cleanTitle = cleanProblemTitle(rawTitle);
  const normTitle = normalize(cleanTitle);

  // Collect all URLs associated with this problem from any link field
  const rawUrls = [p.solutionUrl, p.instructorUrl, p.platformUrl, p.questionUrl, p.url]
    .filter((u) => u && typeof u === "string" && u.trim().startsWith("http"))
    .map((u) => u.trim());
  const uniqueUrls = [...new Set(rawUrls)];

  // 1. Database search (Database is primary source of truth)
  loadData();
  let dbItem = null;
  for (const u of uniqueUrls) {
    if (u.includes("codeforces.com")) {
      const cfParsed = parseCodeforcesUrl(u);
      if (cfParsed?.normId) {
        dbItem = codeforcesMap.get(cfParsed.normId);
        if (dbItem) break;
      }
    }
    if (u.includes("/problems/")) {
      const s = u.split("/problems/")[1]?.split("/")[0] || "";
      if (s) {
        dbItem = catalogMap.get(normalize(s)) || tufItemMap.get(normalize(s));
        if (dbItem) break;
      }
    }
  }
  if (!dbItem) {
    dbItem = findProblemInDatabase(cleanTitle, rawTitle);
  }

  let platformUrl = "";
  let platform = "";
  let solutionUrl = "";
  let leetcodeDifficulty = p.leetcodeDifficulty || p.difficulty || "Medium";
  let leetcodeId = p.leetcodeId || p.number || String(idx + 1);
  let leetcodeUrl = "";
  let leetcodeSlug = p.leetcodeSlug ? normalize(p.leetcodeSlug) : "";

  if (dbItem) {
    const isLeetcode = !dbItem.platform || dbItem.platform === "LeetCode";
    const isCodeforces = dbItem.platform === "Codeforces" || Boolean(dbItem.contestId);
    const userCfUrl = uniqueUrls.find((u) => u.includes("codeforces.com"));
    const officialSlug = dbItem.slug || normalize(dbItem.title);
    const officialUrl =
      dbItem.url ||
      (isCodeforces && dbItem.id ? `https://codeforces.com/problemset/problem/${dbItem.contestId || dbItem.id.slice(0, -1)}/${dbItem.index || dbItem.id.slice(-1)}` : "") ||
      (isLeetcode && officialSlug ? `https://leetcode.com/problems/${encodeURIComponent(officialSlug)}/` : "");
    platformUrl = (isCodeforces && userCfUrl) ? userCfUrl : officialUrl;
    leetcodeUrl = isLeetcode ? officialUrl : "";
    leetcodeSlug = isLeetcode ? officialSlug : "";
    platform = isCodeforces ? "Codeforces" : (dbItem.platform || "LeetCode");
    leetcodeDifficulty = dbItem.difficulty || leetcodeDifficulty;
    leetcodeId = String(dbItem.id || dbItem.questionId || leetcodeId);

    // Target solution link from uniqueUrls (filter out the official question link and practice judges)
    const candidateSols = uniqueUrls.filter((u) => u !== officialUrl && !isPracticeJudgeUrl(u));
    const knownInstructorSol = candidateSols.find((u) => isInstructorResourceUrl(u));
    solutionUrl = knownInstructorSol || candidateSols[0] || "";
  } else {
    const judgeUrl = uniqueUrls.find((u) => isPracticeJudgeUrl(u));
    const nonJudgeUrls = uniqueUrls.filter((u) => u !== judgeUrl);

    if (judgeUrl) {
      platformUrl = judgeUrl;
      leetcodeUrl = judgeUrl.includes("leetcode.com") ? judgeUrl : "";
      platform = detectPlatform(judgeUrl);
      solutionUrl = nonJudgeUrls.find((u) => isInstructorResourceUrl(u)) || nonJudgeUrls[0] || "";
    } else if (uniqueUrls.length >= 2) {
      platformUrl = uniqueUrls[0];
      platform = detectPlatform(uniqueUrls[0]) || "Problem Link";
      solutionUrl = uniqueUrls[1];
    } else if (uniqueUrls.length === 1) {
      if (isInstructorResourceUrl(uniqueUrls[0])) {
        solutionUrl = uniqueUrls[0];
        platformUrl = "";
        platform = "";
      } else {
        platformUrl = uniqueUrls[0];
        platform = detectPlatform(uniqueUrls[0]) || "Problem Link";
        solutionUrl = "";
      }
    }
  }

  return {
    id: String(p.id || idx + 1),
    number: String(p.number || leetcodeId || idx + 1),
    title: dbItem?.title || p.title || cleanTitle,
    module: inferProblemCategory(cleanTitle || p.title, p.module || p.topic || dbItem?.category),
    platform,
    platformUrl,
    questionUrl: platformUrl,
    solutionUrl,
    instructorUrl: solutionUrl,
    leetcodeId: String(leetcodeId),
    leetcodeSlug,
    leetcodeDifficulty,
    leetcodeUrl,
    hasNotes: Boolean(p.hasNotes || (dbItem && hasProblemSolution(normTitle, leetcodeSlug, leetcodeId))),
    key: normTitle,
  };
}

function parseTestCasesFromExamples(examplesText) {
  if (!examplesText) return [];
  const cases = [];
  const regex = /(?:Example\s*(\d+)?:?[\s\S]*?)?Input:\s*([^\n]+)[\s\S]*?Ou?tput:\s*([^\n]+)/gi;
  let match;
  let id = 1;
  while ((match = regex.exec(examplesText)) !== null) {
    const input = match[2].trim().replace(/^`|`$/g, "").replace(/Explanation.*$/i, "").trim();
    const output = match[3].trim().replace(/^`|`$/g, "").replace(/Explanation.*$/i, "").replace(/[.,;:]+$/, "").trim();
    if (input && output) {
      cases.push({ id: id++, input, expectedOutput: output });
    }
  }
  return cases;
}

const getUserProgress = (userId) =>
  UserCodingProgress.findOneAndUpdate(
    { userId },
    { $setOnInsert: { solvedProblemKeys: [], starredProblemKeys: [], activeSheets: [], customSheets: [] } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  ).lean();

const updateDailyCodingSolved = (userId, count = 1) =>
  DailyActivity.findOneAndUpdate(
    { userId, date: getLocalDateString(new Date()), ...(count < 0 ? { codingProblemsSolved: { $gt: 0 } } : {}) },
    { $inc: { codingProblemsSolved: count } },
    { upsert: count > 0, returnDocument: "after" }
  );

const hasProblemSolution = (normTitle, normSlug, id) =>
  leetcodeSolutionsMap.has(normTitle) ||
  (normSlug && leetcodeSolutionsMap.has(normSlug)) ||
  (id && leetcodeSolutionsMap.has(String(id))) ||
  curatedSolutionsMap.has(normTitle) ||
  tufNonLeetcodeMap.has(normTitle) ||
  (id && tufNonLeetcodeMap.has(String(id))) ||
  codeforcesSolutionsMap.has(normTitle) ||
  (id && codeforcesSolutionsMap.has(normalize(id)));

function findLcSolFuzzy(normKey) {
  for (const [key, sol] of leetcodeSolutionsMap.entries()) {
    if (key.includes(normKey) || normKey.includes(key)) return sol;
  }
  return null;
}

function loadData() {
  try {
    const dataDir = path.resolve(__dirname, "../data");

    const lcSolPath = path.join(dataDir, "leetcode/leetcode-solutions.json");
    if (fs.existsSync(lcSolPath)) {
      const stat = fs.statSync(lcSolPath);
      if (lastLcMtime !== stat.mtimeMs || leetcodeSolutionsMap.size < 100) {
        lastLcMtime = stat.mtimeMs;
        const raw = JSON.parse(fs.readFileSync(lcSolPath, "utf8"));
        leetcodeSolutionsMap.clear();
        for (const [key, sol] of Object.entries(raw)) {
          leetcodeSolutionsMap.set(normalize(key), sol);
          if (sol.title) leetcodeSolutionsMap.set(normalize(sol.title), sol);
          if (sol.leetcodeId) leetcodeSolutionsMap.set(String(sol.leetcodeId), sol);
        }
      }
    }

    if (!tuf180Data) {
      const tufPath = path.join(dataDir, "tuf/tuf-sde-180-mapped.json");
      if (fs.existsSync(tufPath)) {
        tuf180Data = JSON.parse(fs.readFileSync(tufPath, "utf8"));
        const items = tuf180Data.modules ? tuf180Data.modules.flatMap((m) => m.items || []) : [];
        items.forEach((it) => {
          tufItemMap.set(normalize(it.title), it);
          if (it.leetcodeSlug) tufItemMap.set(normalize(it.leetcodeSlug), it);
          if (it.id) tufItemMap.set(String(it.id), it);
          if (it.leetcodeId) tufItemMap.set(String(it.leetcodeId), it);
        });
      }
    }

    if (curatedSolutionsMap.size === 0) {
      const curatedPath = path.join(dataDir, "curated-solutions.json");
      if (fs.existsSync(curatedPath)) {
        const raw = JSON.parse(fs.readFileSync(curatedPath, "utf8"));
        for (const [key, sol] of Object.entries(raw)) {
          curatedSolutionsMap.set(normalize(key), sol);
          if (sol.title) curatedSolutionsMap.set(normalize(sol.title), sol);
        }
      }
    }

    if (!sql75Data) {
      const sqlPath = path.join(dataDir, "tuf/tuf-sql-75.json");
      if (fs.existsSync(sqlPath)) {
        sql75Data = JSON.parse(fs.readFileSync(sqlPath, "utf8"));
      }
    }

    if (tufNonLeetcodeMap.size === 0) {
      const nonLcPath = path.join(dataDir, "tuf/tuf-non-leetcode-problems.json");
      if (fs.existsSync(nonLcPath)) {
        const raw = JSON.parse(fs.readFileSync(nonLcPath, "utf8"));
        for (const [key, prob] of Object.entries(raw)) {
          tufNonLeetcodeMap.set(normalize(key), prob);
          if (prob.title) tufNonLeetcodeMap.set(normalize(prob.title), prob);
          if (prob.id) tufNonLeetcodeMap.set(String(prob.id), prob);
          if (prob.slug) tufNonLeetcodeMap.set(normalize(prob.slug), prob);
        }
      }
    }

    if (catalogMap.size === 0) {
      const lcPath = path.join(dataDir, "leetcode/leetcode-catalog.json");
      if (fs.existsSync(lcPath)) {
        const catalog = JSON.parse(fs.readFileSync(lcPath, "utf8"));
        catalog.forEach((item) => {
          catalogMap.set(normalize(item.title), item);
          if (item.slug) catalogMap.set(normalize(item.slug), item);
          if (item.id) catalogMap.set(String(item.id), item);
          if (item.questionId) catalogMap.set(String(item.questionId), item);
        });
      }
    }

    if (codeforcesMap.size === 0) {
      const cfPath = path.join(dataDir, "codeforces/codeforces-catalog.json");
      if (fs.existsSync(cfPath)) {
        const cfCatalog = JSON.parse(fs.readFileSync(cfPath, "utf8"));
        cfCatalog.forEach((item) => {
          codeforcesMap.set(normalize(item.title || item.name), item);
          if (item.id) codeforcesMap.set(normalize(item.id), item);
        });
      }
    }

    if (codeforcesSolutionsMap.size === 0) {
      const cfSolPath = path.join(dataDir, "codeforces/codeforces-solutions.json");
      if (fs.existsSync(cfSolPath)) {
        const raw = JSON.parse(fs.readFileSync(cfSolPath, "utf8"));
        for (const [key, sol] of Object.entries(raw)) {
          codeforcesSolutionsMap.set(normalize(key), sol);
          if (sol.title) codeforcesSolutionsMap.set(normalize(sol.title), sol);
          if (sol.id) codeforcesSolutionsMap.set(normalize(sol.id), sol);
        }
      }
    }

    if (externalProblemsMap.size === 0) {
      const extPath = path.join(dataDir, "external/external-problems.json");
      if (fs.existsSync(extPath)) {
        const extCatalog = JSON.parse(fs.readFileSync(extPath, "utf8"));
        extCatalog.forEach((item) => {
          externalProblemsMap.set(normalize(item.title), item);
          if (item.id) externalProblemsMap.set(normalize(item.id), item);
          if (Array.isArray(item.aliases)) {
            item.aliases.forEach((alias) => externalProblemsMap.set(normalize(alias), item));
          }
        });
      }
    }
  } catch (err) {
    console.error("[Practice] Error loading static datasets:", err.message);
  }
}

loadData();

function getFallbackSheet(sheetId) {
  loadData();
  if (sheetId === "strivers-180") {
    const problems = [];
    if (tuf180Data?.modules) {
      tuf180Data.modules.forEach((m) =>
        (m.items || []).forEach((it) => {
          problems.push({
            ...it,
            module: m.moduleTitle,
            platform: Boolean(it.leetcodeSlug || it.leetcodeUrl) ? "LeetCode" : "takeUforward",
            platformUrl: it.leetcodeUrl || it.tufHref || `https://leetcode.com/problem-list/all/?search=${encodeURIComponent(it.title)}`,
          });
        })
      );
    } else {
      const defaultDsa = [
        { id: 1, title: "Two Sum", leetcodeSlug: "two-sum", leetcodeId: 1, leetcodeDifficulty: "Easy", module: "Arrays" },
        { id: 2, title: "Best Time to Buy and Sell Stock", leetcodeSlug: "best-time-to-buy-and-sell-stock", leetcodeId: 121, leetcodeDifficulty: "Easy", module: "Arrays" },
        { id: 3, title: "Maximum Subarray (Kadane's)", leetcodeSlug: "maximum-subarray", leetcodeId: 53, leetcodeDifficulty: "Medium", module: "Arrays" },
        { id: 4, title: "Merge Intervals", leetcodeSlug: "merge-intervals", leetcodeId: 56, leetcodeDifficulty: "Medium", module: "Arrays" },
        { id: 5, title: "3Sum", leetcodeSlug: "3sum", leetcodeId: 15, leetcodeDifficulty: "Medium", module: "Two Pointers" },
        { id: 6, title: "Trapping Rain Water", leetcodeSlug: "trapping-rain-water", leetcodeId: 42, leetcodeDifficulty: "Hard", module: "Two Pointers" },
        { id: 7, title: "Reverse Linked List", leetcodeSlug: "reverse-linked-list", leetcodeId: 206, leetcodeDifficulty: "Easy", module: "Linked List" },
        { id: 8, title: "LRU Cache", leetcodeSlug: "lru-cache", leetcodeId: 146, leetcodeDifficulty: "Medium", module: "Linked List" },
        { id: 9, title: "Valid Parentheses", leetcodeSlug: "valid-parentheses", leetcodeId: 20, leetcodeDifficulty: "Easy", module: "Stack & Queue" },
        { id: 10, title: "Binary Tree Level Order Traversal", leetcodeSlug: "binary-tree-level-order-traversal", leetcodeId: 102, leetcodeDifficulty: "Medium", module: "Binary Trees" },
      ];
      defaultDsa.forEach((it) =>
        problems.push({
          ...it,
          platform: "LeetCode",
          platformUrl: `https://leetcode.com/problems/${it.leetcodeSlug}/`,
        })
      );
    }
    return {
      id: "strivers-180",
      title: "SDE 180 Master Sheet",
      description: "Core interview DSA patterns mapped directly to LeetCode.",
      category: "DSA Patterns",
      isOfficial: true,
      badge: "Developer / Admin",
      problems,
    };
  }

  if (sheetId === "sql-75") {
    const problems = [];
    if (sql75Data?.modules) {
      sql75Data.modules.forEach((m) =>
        (m.items || []).forEach((it) => {
          problems.push({
            ...it,
            module: m.moduleTitle,
            platform: "SQL Hub",
            platformUrl: it.tufHref || `https://takeuforward.org/practice/sql/${it.id}`,
          });
        })
      );
    } else {
      const defaultSql = [
        { id: 175, title: "Combine Two Tables", leetcodeSlug: "combine-two-tables", leetcodeDifficulty: "Easy", module: "Select & Joins" },
        { id: 181, title: "Employees Earning More Than Their Managers", leetcodeSlug: "employees-earning-more-than-their-managers", leetcodeDifficulty: "Easy", module: "Select & Joins" },
        { id: 182, title: "Duplicate Emails", leetcodeSlug: "duplicate-emails", leetcodeDifficulty: "Easy", module: "Select & Joins" },
        { id: 184, title: "Department Highest Salary", leetcodeSlug: "department-highest-salary", leetcodeDifficulty: "Medium", module: "Aggregations & Grouping" },
        { id: 176, title: "Second Highest Salary", leetcodeSlug: "second-highest-salary", leetcodeDifficulty: "Medium", module: "Window Functions" },
        { id: 178, title: "Rank Scores", leetcodeSlug: "rank-scores", leetcodeDifficulty: "Medium", module: "Window Functions" },
      ];
      defaultSql.forEach((it) =>
        problems.push({
          ...it,
          platform: "LeetCode",
          platformUrl: `https://leetcode.com/problems/${it.leetcodeSlug}/`,
        })
      );
    }
    return {
      id: "sql-75",
      title: "SQL 75 Practical",
      description: "Modules covering joins, aggregations, window functions, and advanced querying.",
      category: "Database & SQL",
      isOfficial: true,
      badge: "Developer / Admin",
      problems,
    };
  }
  const fileMap = {
    "codeforces-ladder": "codeforces/codeforces-ladder.json",
    "neetcode-150": "neetcode/neetcode-150.json",
    "strivers-a2z": "tuf/tuf-strivers-a2z.json",
  };
  const relPath = fileMap[sheetId];
  if (relPath) {
    const filePath = path.join(dataDir, relPath);
    if (fs.existsSync(filePath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const problems = raw.problems || [];
        if (!problems.length && raw.modules) {
          raw.modules.forEach((m) => (m.items || []).forEach((it) => problems.push({ ...it, module: m.moduleTitle })));
        }
        return {
          id: sheetId,
          title: raw.sheetName || raw.title || sheetId,
          description: raw.description || "",
          category: raw.category || "DSA Patterns",
          isOfficial: true,
          badge: sheetId === "neetcode-150" ? "Top Pick" : sheetId === "strivers-a2z" ? "Mastery" : "Contests",
          sourceUrl: raw.sourceUrl || "",
          problems,
        };
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}

function formatSheetResponse(sheet, solvedSet, starredSet) {
  loadData();
  const items = (sheet.problems || []).map((p, idx) => {
    const item = resolveProblemItem(p, idx);
    const normTitle = item.key;
    const normSlug = item.leetcodeSlug ? normalize(item.leetcodeSlug) : "";
    return {
      ...item,
      isSolved:
        solvedSet.has(normTitle) ||
        solvedSet.has(String(p.id)) ||
        solvedSet.has(normalize(p.id)) ||
        solvedSet.has("cf" + normalize(p.id)) ||
        solvedSet.has(String(item.leetcodeId)) ||
        (normSlug && solvedSet.has(normSlug)),
      isStarred:
        starredSet.has(normTitle) ||
        starredSet.has(String(p.id)) ||
        starredSet.has(String(item.leetcodeId)),
      hasSolution: item.hasNotes || hasProblemSolution(normTitle, item.leetcodeSlug, item.leetcodeId),
    };
  });

  const moduleMap = new Map();
  items.forEach((item) => {
    const modName = item.module || "Core Problems";
    if (!moduleMap.has(modName)) moduleMap.set(modName, []);
    moduleMap.get(modName).push(item);
  });

  const rawModules = Array.from(moduleMap.entries()).map(([moduleTitle, modItems], mIdx) => ({
    moduleId: `mod-${mIdx + 1}`,
    moduleTitle,
    items: modItems,
  }));

  const preserveOrder = Boolean(sheet.isOfficial || sheet.id?.startsWith("neetcode") || sheet.id?.startsWith("striver"));
  const modules = preserveOrder ? rawModules : sortModulesByPedagogy(rawModules);

  return {
    success: true,
    sheetTitle: sheet.title,
    totalItems: items.length,
    modules: modules.length > 0 ? modules : [{ moduleId: "mod-1", moduleTitle: sheet.category || "Problems", items }],
    uploadedBy: sheet.uploadedBy?.name || sheet.uploadedBy || (sheet.isOfficial ? "Developer / Admin" : "You (Personal)"),
    isOfficial: Boolean(sheet.isOfficial),
    badge: sheet.badge || (sheet.isOfficial ? "Developer / Admin" : "Custom"),
    sourceUrl: sheet.sourceUrl || "",
    lastSyncedAt: sheet.lastSyncedAt || null,
  };
}

/**
 * GET /api/practice/sheets
 */
exports.getSheets = async (req, res) => {
  try {
    const progress = await getUserProgress(req.user.id);
    const solvedSet = new Set(progress.solvedProblemKeys || []);
    const activeSheetIds = Array.isArray(progress.activeSheets) ? progress.activeSheets : [];

    const globalSheets = await GlobalSheet.find({}).lean().catch(() => []);
    const globalMap = new Map(globalSheets.map((g) => [g.id, g]));
    const allSheets = [];

    const calcSolved = (problems = []) =>
      problems.filter(
        (p) =>
          solvedSet.has(normalize(p.title)) ||
          solvedSet.has(String(p.id)) ||
          solvedSet.has(normalize(p.id)) ||
          solvedSet.has("cf" + normalize(p.id)) ||
          (p.leetcodeId && solvedSet.has(String(p.leetcodeId))) ||
          (p.leetcodeSlug && solvedSet.has(normalize(p.leetcodeSlug)))
      ).length;

    // 1. Built-in roadmaps (database first, local dataset fallback)
    const BUILTIN_IDS = ["strivers-180", "sql-75", "codeforces-ladder", "neetcode-150", "strivers-a2z"];
    BUILTIN_IDS.forEach((id) => {
      const gs = globalMap.get(id) || getFallbackSheet(id);
      if (gs) {
        allSheets.push({
          id: gs.id,
          title: gs.title,
          description: gs.description || "Official developer roadmap.",
          total: (gs.problems || []).length,
          solved: calcSolved(gs.problems),
          category: gs.category || "DSA Patterns",
          badge: gs.badge || "Developer / Admin",
          uploadedBy: "Developer / Admin",
          isOfficial: true,
          sourceUrl: gs.sourceUrl || "",
          lastSyncedAt: gs.lastSyncedAt || null,
          isEnrolled: activeSheetIds.includes(gs.id),
          isCustom: false,
        });
      }
    });

    // 2. Additional Global Sheets from MongoDB (admin uploads, custom community roadmaps)
    globalSheets.forEach((gs) => {
      if (BUILTIN_IDS.includes(gs.id)) return;
      allSheets.push({
        id: gs.id,
        title: gs.title,
        description: gs.description || "Official developer roadmap.",
        total: (gs.problems || []).length,
        solved: calcSolved(gs.problems),
        category: gs.category || "DSA Patterns",
        badge: gs.badge || "Developer / Admin",
        uploadedBy: gs.uploadedBy?.name || "Developer / Admin",
        isOfficial: true,
        sourceUrl: gs.sourceUrl || "",
        lastSyncedAt: gs.lastSyncedAt || null,
        isEnrolled: activeSheetIds.includes(gs.id),
        isCustom: false,
      });
    });

    // 3. User's own custom sheets (excluding any surfaced as global)
    (progress.customSheets || []).forEach((cs) => {
      if (globalMap.has(cs.id)) return;
      allSheets.push({
        id: cs.id,
        title: cs.title,
        description: cs.description || "Custom direct imported roadmap.",
        total: (cs.problems || []).length,
        solved: calcSolved(cs.problems),
        category: "Custom",
        badge: cs.sourceUrl ? "Cloud Synced" : "Custom",
        uploadedBy: "You (Personal)",
        isOfficial: false,
        sourceUrl: cs.sourceUrl || "",
        lastSyncedAt: cs.lastSyncedAt || null,
        isEnrolled: activeSheetIds.includes(cs.id),
        isCustom: true,
      });
    });

    res.json({
      success: true,
      sheets: allSheets.filter((s) => s.isEnrolled),
      catalog: allSheets,
      activeSheets: activeSheetIds,
      totalSolved: solvedSet.size,
    });
  } catch (error) {
    console.error("[Practice:getSheets]", error.message);
    res.status(500).json({ success: false, message: "Failed to load sheets" });
  }
};

/**
 * POST /api/practice/enroll
 */
exports.enrollSheet = async (req, res) => {
  try {
    const { sheetId } = req.body;
    if (!sheetId) return res.status(400).json({ success: false, message: "sheetId is required" });

    const progress = await UserCodingProgress.findOneAndUpdate(
      { userId: req.user.id },
      { $addToSet: { activeSheets: sheetId } },
      { upsert: true, returnDocument: "after" }
    );
    res.json({ success: true, message: "Enrolled in sheet", activeSheets: progress?.activeSheets || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to enroll in sheet" });
  }
};

/**
 * POST /api/practice/unenroll
 */
exports.unenrollSheet = async (req, res) => {
  try {
    const { sheetId } = req.body;
    if (!sheetId) return res.status(400).json({ success: false, message: "sheetId is required" });

    const progress = await UserCodingProgress.findOneAndUpdate(
      { userId: req.user.id },
      { $pull: { activeSheets: sheetId } },
      { returnDocument: "after" }
    );
    res.json({ success: true, message: "Removed sheet from practice", activeSheets: progress?.activeSheets || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to remove sheet" });
  }
};

function extractTitleFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("leetcode.com")) {
      const parts = u.pathname.split("/").filter(Boolean);
      const slugIdx = parts.indexOf("problems");
      if (slugIdx !== -1 && parts[slugIdx + 1]) {
        return parts[slugIdx + 1]
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      }
    }
    if (u.hostname.includes("codeforces.com")) {
      loadData();
      const cfParsed = parseCodeforcesUrl(url);
      if (cfParsed?.normId) {
        const item = codeforcesMap.get(cfParsed.normId);
        if (item?.title) return item.title;
        return `Codeforces ${cfParsed.id}`;
      }
    }
  } catch { }
  return "";
}

function parseCsvProblems(csvText) {
  if (!csvText || typeof csvText !== "string") return [];
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const parseLine = (line) => {
    const cells = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  };

  const rows = lines.map(parseLine);
  if (rows.length === 0) return [];

  const firstRow = rows[0];
  const isHeader = firstRow.some((c) =>
    /problem|title|question|leetcode|link|url|difficulty|topic|module|tag/i.test(c)
  );
  const dataRows = isHeader ? rows.slice(1) : rows;

  return dataRows
    .map((cols, idx) => {
      const urls = [];
      let titleCol = "";
      let diffCol = null;
      let topicCol = null;

      cols.forEach((c) => {
        const matchUrls = c.match(/https?:\/\/[^\s,;"']+/gi);
        if (matchUrls) {
          urls.push(...matchUrls);
        } else if (!titleCol && c.length > 1 && !/^(easy|medium|hard|\d+)$/i.test(c)) {
          titleCol = c;
        } else if (/^(easy|medium|hard)$/i.test(c)) {
          diffCol = c.charAt(0).toUpperCase() + c.slice(1).toLowerCase();
        } else if (c.length > 2 && !topicCol && !/^\d+$/.test(c)) {
          topicCol = c;
        }
      });

      let questionUrl = "";
      let solutionUrl = "";
      if (urls.length >= 2) {
        if (isPracticeJudgeUrl(urls[0])) {
          questionUrl = urls[0];
          solutionUrl = urls[1];
        } else if (isInstructorResourceUrl(urls[0])) {
          solutionUrl = urls[0];
          questionUrl = urls[1];
        } else {
          questionUrl = urls[0];
          solutionUrl = urls[1];
        }
      } else if (urls.length === 1) {
        if (isInstructorResourceUrl(urls[0])) {
          solutionUrl = urls[0];
        } else {
          questionUrl = urls[0];
        }
      }

      const cleanTitle =
        titleCol || (questionUrl ? extractTitleFromUrl(questionUrl) : `Problem ${idx + 1}`);

      return {
        number: String(idx + 1),
        title: cleanTitle,
        platform: detectPlatform(questionUrl || solutionUrl),
        questionUrl,
        solutionUrl,
        url: questionUrl || solutionUrl,
        difficulty: diffCol,
        topic: topicCol || "Custom Problem",
      };
    })
    .filter((p) => p.title || p.questionUrl || p.solutionUrl);
}

async function fetchContentFromUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== "string") {
    throw new Error("Invalid or empty sheet URL.");
  }
  const cleanUrl = inputUrl.trim();

  // 1. Google Sheets URL (e.g. docs.google.com/spreadsheets/d/ID/...)
  const gSheetMatch = cleanUrl.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9-_]+)/i);
  if (gSheetMatch) {
    const sheetId = gSheetMatch[1];
    const gidMatch = cleanUrl.match(/[#&?]gid=([0-9]+)/i);
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidMatch ? `&gid=${gidMatch[1]}` : ""
      }`;
    const res = await axios.get(exportUrl, {
      timeout: 25000,
      responseType: "text",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/csv,text/plain,*/*",
      },
      maxRedirects: 5,
    });
    const content = res.data;
    if (
      typeof content === "string" &&
      (content.includes("<html") || content.includes("accounts.google.com") || content.includes("<!DOCTYPE"))
    ) {
      throw new Error(
        "Cannot access Google Sheet. Please ensure link sharing is set to 'Anyone with the link can view'."
      );
    }
    return { type: "text", rawText: content, source: "Google Sheets" };
  }

  // 2. Google Drive File (file/d/ID, open?id=ID, uc?id=ID)
  const gDriveMatch = cleanUrl.match(
    /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9-_]+)/i
  );
  if (gDriveMatch) {
    const fileId = gDriveMatch[1];
    // First, check if this drive file is actually a Google Sheet exportable as CSV
    try {
      const sheetExportUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`;
      const sheetRes = await axios.get(sheetExportUrl, {
        timeout: 15000,
        responseType: "text",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/csv,text/plain,*/*",
        },
        maxRedirects: 5,
      });
      const sheetContent = sheetRes.data;
      if (
        typeof sheetContent === "string" &&
        !sheetContent.includes("<html") &&
        !sheetContent.includes("accounts.google.com") &&
        !sheetContent.includes("<!DOCTYPE")
      ) {
        return { type: "text", rawText: sheetContent, source: "Google Sheets" };
      }
    } catch { }

    // Otherwise download the file directly
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const res = await axios.get(downloadUrl, {
      timeout: 30000,
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      maxRedirects: 5,
    });
    const buffer = Buffer.from(res.data);
    const headStr = buffer.slice(0, 1000).toString("utf8");
    if (headStr.includes("<html") || headStr.includes("<!DOCTYPE")) {
      const confirmMatch =
        headStr.match(/\/uc\?export=download&amp;confirm=([a-zA-Z0-9-_]+)/i) ||
        headStr.match(/name="confirm"\s+value="([a-zA-Z0-9-_]+)"/i);
      if (confirmMatch) {
        const confirmToken = confirmMatch[1];
        const confirmedUrl = `https://drive.google.com/uc?export=download&confirm=${confirmToken}&id=${fileId}`;
        const confirmedRes = await axios.get(confirmedUrl, {
          timeout: 30000,
          responseType: "arraybuffer",
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        const confirmedBuffer = Buffer.from(confirmedRes.data);
        return {
          type: "binary",
          fileBase64: confirmedBuffer.toString("base64"),
          mimeType: confirmedRes.headers["content-type"] || "application/octet-stream",
          fileName: "drive_sheet_file",
          source: "Google Drive",
        };
      }
      throw new Error(
        "Cannot access Google Drive file. Please ensure link sharing is set to 'Anyone with the link can view'."
      );
    }

    const contentType = res.headers["content-type"] || "";
    if (contentType.includes("csv") || contentType.includes("text/plain")) {
      return { type: "text", rawText: buffer.toString("utf8"), source: "Google Drive" };
    }
    return {
      type: "binary",
      fileBase64: buffer.toString("base64"),
      mimeType: contentType || "application/octet-stream",
      fileName: "drive_sheet_file",
      source: "Google Drive",
    };
  }

  // 3. Dropbox Direct Download
  let targetUrl = cleanUrl;
  if (/dropbox\.com/i.test(targetUrl)) {
    targetUrl = targetUrl.replace(/[?&]dl=0/i, "").replace(/[?&]raw=0/i, "");
    targetUrl += (targetUrl.includes("?") ? "&" : "?") + "dl=1";
  }

  // 4. General / Excel / CSV URL
  const res = await axios.get(targetUrl, {
    timeout: 30000,
    responseType: "arraybuffer",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    maxRedirects: 5,
  });

  const buffer = Buffer.from(res.data);
  const contentType = res.headers["content-type"] || "";
  const isCsvOrText =
    contentType.includes("csv") || contentType.includes("text/plain") || /\.csv$/i.test(targetUrl);

  if (isCsvOrText) {
    return { type: "text", rawText: buffer.toString("utf8"), source: "Web Sheet" };
  }

  return {
    type: "binary",
    fileBase64: buffer.toString("base64"),
    mimeType: contentType || "application/octet-stream",
    fileName: "web_sheet_file",
    source: "Web Sheet",
  };
}

/**
 * POST /api/practice/custom-sheet
 */
exports.createCustomSheet = async (req, res) => {
  try {
    const {
      title,
      description,
      sheetUrl,
      fileBase64,
      mimeType,
      fileName,
      geminiApiKey,
      rawProblems,
    } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: "Sheet title is required" });

    let extractedProblems = [];
    let sheetSource = "Custom Sheet";

    if (sheetUrl && sheetUrl.trim()) {
      try {
        const fetched = await fetchContentFromUrl(sheetUrl.trim());
        sheetSource = fetched.source || "Cloud Sheet";
        if (fetched.type === "text") {
          const activeKey = geminiApiKey || process.env.GEMINI_API_KEY;
          if (activeKey && activeKey !== "your_gemini_api_key_here") {
            try {
              extractedProblems = await geminiSheetService.scanSheetWithGemini({
                rawText: fetched.rawText,
                apiKey: geminiApiKey,
              });
            } catch { }
          }
          if (!extractedProblems?.length) {
            extractedProblems = parseCsvProblems(fetched.rawText);
          }
        } else {
          extractedProblems = await geminiSheetService.scanSheetWithGemini({
            fileBase64: fetched.fileBase64,
            mimeType: fetched.mimeType,
            fileName: fetched.fileName,
            apiKey: geminiApiKey,
          });
        }
      } catch (urlErr) {
        return res.status(400).json({
          success: false,
          message: urlErr.message || "Failed to fetch problems from the provided link.",
        });
      }
    } else if (fileBase64) {
      try {
        extractedProblems = await geminiSheetService.scanSheetWithGemini({
          fileBase64,
          mimeType,
          fileName,
          apiKey: geminiApiKey,
        });
      } catch (geminiErr) {
        return res.status(400).json({
          success: false,
          message: geminiErr.message || "Failed to scan document with Gemini API.",
        });
      }
    } else if (typeof rawProblems === "string" && rawProblems.trim()) {
      // Legacy fallback
      const activeKey = geminiApiKey || process.env.GEMINI_API_KEY;
      if (activeKey && activeKey !== "your_gemini_api_key_here") {
        try {
          extractedProblems = await geminiSheetService.scanSheetWithGemini({
            rawText: rawProblems,
            apiKey: geminiApiKey,
          });
        } catch { }
      }
      if (!extractedProblems?.length) {
        extractedProblems = parseCsvProblems(rawProblems);
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Please provide a Google Sheets / Drive / Excel link or drop a document file.",
      });
    }

    if (!extractedProblems?.length) {
      return res.status(400).json({
        success: false,
        message: "No problems could be extracted from the provided source.",
      });
    }

    loadData();

    try {
      extractedProblems = await geminiSheetService.categorizeProblemsWithGemini(extractedProblems, geminiApiKey);
    } catch (catErr) {
      console.warn("[Practice] Gemini categorization skipped:", catErr.message);
    }

    const enrichedProblems = extractedProblems.map((p, idx) => resolveProblemItem(p, idx));

    const customId = `custom-${Date.now()}`;
    const newCustomSheet = {
      id: customId,
      title: title.trim(),
      description:
        description?.trim() || `Synced with ${sheetSource} (${enrichedProblems.length} problems)`,
      sourceUrl: sheetUrl?.trim() || "",
      lastSyncedAt: sheetUrl?.trim() ? new Date() : null,
      problems: enrichedProblems,
    };

    if (req.body.isGlobal || req.body.publishAsDeveloper) {
      const adminUser = await User.findById(req.user.id).select("role username").lean();
      if (adminUser?.role === "admin") {
        const targetCategory = (req.body.category || "DSA Patterns").trim();
        const targetGroup = req.body.group || (
          /core|os|dbms|cn|sql|network|database|system/i.test(targetCategory) ? "core" :
          /rk|coaching|classroom/i.test(targetCategory) ? "rk" : "dsa"
        );

        await GlobalSheet.findOneAndUpdate(
          { id: customId },
          {
            id: customId,
            title: title.trim(),
            description: description?.trim() || `Uploaded by Developer / Admin (${enrichedProblems.length} problems)`,
            category: targetCategory,
            group: targetGroup,
            badge: req.body.badge || (targetGroup === "rk" ? "Exclusive" : targetGroup === "core" ? "Essential" : "Developer / Admin"),
            sourceUrl: sheetUrl?.trim() || "",
            lastSyncedAt: sheetUrl?.trim() ? new Date() : null,
            uploadedBy: {
              name: adminUser.username || "Developer / Admin",
              role: "admin",
              userId: req.user.id,
            },
            isOfficial: true,
            problems: enrichedProblems,
          },
          { upsert: true, returnDocument: "after" }
        );
      }
    }

    await UserCodingProgress.findOneAndUpdate(
      { userId: req.user.id },
      { $push: { customSheets: newCustomSheet }, $addToSet: { activeSheets: customId } },
      { upsert: true, returnDocument: "after" }
    );

    res.json({
      success: true,
      message: `Roadmap "${title.trim()}" created with ${enrichedProblems.length} problems`,
      sheetId: customId,
      sheet: newCustomSheet,
      count: enrichedProblems.length,
    });
  } catch (error) {
    console.error("[Practice:createCustomSheet]", error.message);
    res.status(500).json({ success: false, message: error.message || "Failed to create custom sheet" });
  }
};

/**
 * POST /api/practice/custom-sheet/sync
 * Re-sync custom sheet with its cloud source URL
 */
exports.syncCustomSheet = async (req, res) => {
  try {
    const { sheetId, sheetUrl, geminiApiKey } = req.body;
    if (!sheetId) return res.status(400).json({ success: false, message: "Sheet ID is required" });

    // 1. Check if it's an existing official sheet (strivers-180, blind-75, sql-75) or a GlobalSheet
    const isExistingOfficial = ["strivers-180", "blind-75", "sql-75"].includes(sheetId);
    let globalSheet = await GlobalSheet.findOne({ id: sheetId });

    if (isExistingOfficial || globalSheet) {
      const adminUser = await User.findById(req.user.id).select("role username").lean();
      if (adminUser?.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only administrators can synchronize official roadmaps.",
        });
      }

      const targetUrl = sheetUrl?.trim() || globalSheet?.sourceUrl;
      if (!targetUrl) {
        return res.status(400).json({
          success: false,
          message: "Please provide a Google Sheets / Drive link to sync this existing roadmap.",
        });
      }

      const fetched = await fetchContentFromUrl(targetUrl);
      let extractedProblems = [];
      if (fetched.type === "text") {
        const activeKey = geminiApiKey || process.env.GEMINI_API_KEY;
        if (activeKey && activeKey !== "your_gemini_api_key_here") {
          try {
            extractedProblems = await geminiSheetService.scanSheetWithGemini({
              rawText: fetched.rawText,
              apiKey: geminiApiKey,
            });
          } catch { }
        }
        if (!extractedProblems?.length) {
          extractedProblems = parseCsvProblems(fetched.rawText);
        }
      } else {
        extractedProblems = await geminiSheetService.scanSheetWithGemini({
          fileBase64: fetched.fileBase64,
          mimeType: fetched.mimeType,
          fileName: fetched.fileName,
          apiKey: geminiApiKey,
        });
      }

      if (!extractedProblems?.length) {
        return res.status(400).json({
          success: false,
          message: "No problems could be extracted from the linked sheet during sync.",
        });
      }

      loadData();
      try {
        extractedProblems = await geminiSheetService.categorizeProblemsWithGemini(extractedProblems, req.body.geminiApiKey);
      } catch (catErr) {
        console.warn("[Practice] Gemini sync categorization skipped:", catErr.message);
      }
      const enrichedProblems = extractedProblems.map((p, idx) => resolveProblemItem(p, idx));

      const defaultTitle =
        sheetId === "blind-75"
          ? "Blind 75 Essentials"
          : sheetId === "sql-75"
            ? "SQL 75 Practical"
            : "SDE 180 Master Sheet";

      globalSheet = await GlobalSheet.findOneAndUpdate(
        { id: sheetId },
        {
          id: sheetId,
          title: globalSheet?.title || defaultTitle,
          description: globalSheet?.description || `Synced with ${targetUrl} (${enrichedProblems.length} problems)`,
          category: globalSheet?.category || "DSA Patterns",
          group: globalSheet?.group || "dsa",
          badge: globalSheet?.badge || "Developer / Admin",
          sourceUrl: targetUrl,
          lastSyncedAt: new Date(),
          isOfficial: true,
          uploadedBy: {
            name: adminUser?.username || globalSheet?.uploadedBy?.name || "Developer / Admin",
            role: "admin",
            userId: req.user.id,
          },
          problems: enrichedProblems,
        },
        { upsert: true, returnDocument: "after" }
      );

      return res.json({
        success: true,
        message: `Official roadmap "${globalSheet.title}" synchronized with cloud sheet! (${enrichedProblems.length} problems)`,
        sheetId: globalSheet.id,
        sheet: globalSheet,
        count: enrichedProblems.length,
        lastSyncedAt: globalSheet.lastSyncedAt,
      });
    }

    // 2. Personal custom sheet sync
    const progress = await UserCodingProgress.findOne({ userId: req.user.id });
    if (!progress) return res.status(404).json({ success: false, message: "User progress not found" });

    const customSheet = (progress.customSheets || []).find((cs) => cs.id === sheetId);
    if (!customSheet) return res.status(404).json({ success: false, message: "Custom sheet not found" });

    const targetUrl = sheetUrl?.trim() || customSheet.sourceUrl;
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        message: "This roadmap does not have a linked cloud sheet URL to sync. It was imported via direct file upload.",
      });
    }

    const fetched = await fetchContentFromUrl(targetUrl);
    let extractedProblems = [];

    if (fetched.type === "text") {
      const activeKey = geminiApiKey || process.env.GEMINI_API_KEY;
      if (activeKey && activeKey !== "your_gemini_api_key_here") {
        try {
          extractedProblems = await geminiSheetService.scanSheetWithGemini({
            rawText: fetched.rawText,
            apiKey: geminiApiKey,
          });
        } catch { }
      }
      if (!extractedProblems?.length) {
        extractedProblems = parseCsvProblems(fetched.rawText);
      }
    } else {
      extractedProblems = await geminiSheetService.scanSheetWithGemini({
        fileBase64: fetched.fileBase64,
        mimeType: fetched.mimeType,
        fileName: fetched.fileName,
        apiKey: geminiApiKey,
      });
    }

    if (!extractedProblems?.length) {
      return res.status(400).json({
        success: false,
        message: "No problems could be extracted from the linked sheet during sync.",
      });
    }

    loadData();
    try {
      extractedProblems = await geminiSheetService.categorizeProblemsWithGemini(extractedProblems, req.body.geminiApiKey);
    } catch (catErr) {
      console.warn("[Practice] Gemini sync categorization skipped:", catErr.message);
    }
    const enrichedProblems = extractedProblems.map((p, idx) => resolveProblemItem(p, idx));

    customSheet.problems = enrichedProblems;
    customSheet.sourceUrl = targetUrl;
    customSheet.lastSyncedAt = new Date();
    await progress.save();

    res.json({
      success: true,
      message: `Roadmap "${customSheet.title}" synchronized! (${enrichedProblems.length} problems)`,
      sheetId: customSheet.id,
      sheet: customSheet,
      count: enrichedProblems.length,
      lastSyncedAt: customSheet.lastSyncedAt,
    });
  } catch (error) {
    console.error("[Practice:syncCustomSheet]", error.message);
    res.status(500).json({ success: false, message: error.message || "Failed to sync custom sheet" });
  }
};

/**
 * GET /api/practice/sheet/:sheetId
 */
exports.getSheetDetails = async (req, res) => {
  try {
    const { sheetId } = req.params;
    const progress = await getUserProgress(req.user.id);
    const solvedSet = new Set(progress.solvedProblemKeys || []);
    const starredSet = new Set(progress.starredProblemKeys || []);

    const sheet =
      (await GlobalSheet.findOne({ id: sheetId }).lean().catch(() => null)) ||
      getFallbackSheet(sheetId) ||
      (progress.customSheets || []).find((cs) => cs.id === sheetId);

    if (!sheet) {
      return res.status(404).json({ success: false, message: "Sheet not found" });
    }

    res.json(formatSheetResponse(sheet, solvedSet, starredSet));
  } catch (error) {
    console.error("[Practice:getSheetDetails]", error.message);
    res.status(500).json({ success: false, message: "Failed to load sheet details" });
  }
};

function formatComplexity(val) {
  if (!val) return "O(N)";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    return val.worst || val.average || val.best || val.total || val.auxiliary || val.note || "O(N)";
  }
  return String(val);
}

function formatLeetCodeCode(code, lang, canonicalMethodName) {
  if (!code || typeof code !== "string") return code;
  let res = code.trim().replace(/(?:public\s+)?class\s+Main\b/g, "class Solution");

  // Normalize method name suffixes once for all languages (e.g. majorityElementBruteForce -> majorityElement)
  if (canonicalMethodName) {
    res = res.replace(new RegExp(`\\b${canonicalMethodName}(?:BruteForce|Better|Optimal|_brute|_better|_optimal)\\b`, "g"), canonicalMethodName);
  } else {
    res = res.replace(/\b([a-zA-Z0-9_]+)(?:BruteForce|Better|Optimal)\b(?=\s*\()/g, "$1");
  }

  if (lang === "java") {
    res = res.replace(/\n\s*public\s+static\s+void\s+main\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}\s*(?=\n\s*\}|\n*$)/g, "");
    res = res.replace(/\n\s*(?:\/\/[^\n]*\n\s*)*(?:\/\/\s*)?public\s+static\s+void\s+main[\s\S]*?(?=\n\s*\}|\n*$)/g, "");
    if (!res.includes("class Solution") && !res.includes("class ")) {
      res = `class Solution {\n    ${res.split("\n").join("\n    ")}\n}`;
    }
  } else if (lang === "cpp") {
    res = res.replace(/\n\s*int\s+main\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}\s*$/g, "");
    if (!res.includes("class Solution") && !res.includes("class ")) {
      res = `class Solution {\npublic:\n    ${res.split("\n").join("\n    ")}\n};`;
    }
  } else if (lang === "python") {
    res = res.replace(/\n\s*if\s+__name__\s*==\s*['"]__main__['"]\s*:[\s\S]*$/g, "");
    if (!res.includes("class Solution:") && !res.includes("class Solution")) {
      const indented = res.split("\n").map((l) => (l.trim() ? "    " + l : l)).join("\n");
      res = `class Solution:\n${indented}`;
    }
  }

  return res.trim();
}

/**
 * GET /api/practice/solution/:problemKey
 */
exports.getProblemSolution = async (req, res) => {
  try {
    const { problemKey } = req.params;
    const querySlug = req.query.slug || "";
    const queryId = req.query.id || "";
    const queryTufHref = req.query.tufHref || "";

    const cleanKey = cleanProblemTitle(problemKey);
    const normKey = normalize(problemKey);
    const normClean = normalize(cleanKey);

    let resolvedSlug = querySlug ? String(querySlug).toLowerCase().trim() : "";
    if (!resolvedSlug && problemKey.includes("-")) {
      resolvedSlug = problemKey.toLowerCase().trim();
    }

    // 1. Primary source of truth: MongoDB Atlas ProblemSolution (works in production without local files)
    const orFilters = [{ aliases: normClean }, { aliases: normKey }];
    if (resolvedSlug) {
      orFilters.push({ slug: resolvedSlug });
      orFilters.push({ aliases: resolvedSlug });
    }
    if (queryId) {
      orFilters.push({ aliases: normalize(queryId) });
      orFilters.push({ aliases: String(queryId).toLowerCase().trim() });
    }

    const dbSol = await ProblemSolution.findOne({ $or: orFilters }).lean().catch(() => null);
    if (dbSol && (dbSol.approaches?.length || dbSol.defaultCode)) {
      return res.json({
        success: true,
        hasNotes: true,
        title: dbSol.title || cleanKey || problemKey,
        platform: dbSol.platform || "LeetCode",
        platformUrl: dbSol.platformUrl || "",
        problemStatement: dbSol.problemStatement || `Solve the problem: "${dbSol.title}".`,
        constraints: dbSol.constraints || [],
        examples: dbSol.examples || "",
        testCases: dbSol.testCases || [],
        approaches: dbSol.approaches || [],
        leetcodeSolution: null,
        defaultCode: dbSol.defaultCode || dbSol.approaches?.[0]?.code || "",
      });
    }

    loadData();

    const matchedDbItem = findProblemInDatabase(cleanKey, problemKey);

    const catItem =
      (resolvedSlug ? catalogMap.get(normalize(resolvedSlug)) : null) ||
      catalogMap.get(normClean) ||
      catalogMap.get(normKey) ||
      (matchedDbItem ? catalogMap.get(normalize(matchedDbItem.title)) : null) ||
      (queryId ? catalogMap.get(String(queryId)) : null);

    if (!resolvedSlug && catItem?.slug) resolvedSlug = catItem.slug;
    if (!resolvedSlug && matchedDbItem?.slug) resolvedSlug = matchedDbItem.slug;
    if (!resolvedSlug && matchedDbItem?.leetcodeSlug) resolvedSlug = matchedDbItem.leetcodeSlug;

    const tufItem =
      tufItemMap.get(normClean) ||
      tufItemMap.get(normKey) ||
      (resolvedSlug ? tufItemMap.get(normalize(resolvedSlug)) : null) ||
      (queryId ? tufItemMap.get(String(queryId)) : null);

    const nonLcProb =
      tufNonLeetcodeMap.get(normClean) ||
      tufNonLeetcodeMap.get(normKey) ||
      (resolvedSlug ? tufNonLeetcodeMap.get(normalize(resolvedSlug)) : null) ||
      (queryId ? tufNonLeetcodeMap.get(String(queryId)) : null) ||
      (queryId ? codeforcesMap.get(normalize(queryId)) : null) ||
      tufItem ||
      externalProblemsMap.get(normClean) ||
      externalProblemsMap.get(normKey) ||
      codeforcesMap.get(normClean) ||
      codeforcesMap.get(normKey) ||
      (matchedDbItem?.platform && matchedDbItem.platform !== "LeetCode" ? matchedDbItem : null);

    const curatedSol =
      curatedSolutionsMap.get(normClean) ||
      curatedSolutionsMap.get(normKey) ||
      (resolvedSlug ? curatedSolutionsMap.get(normalize(resolvedSlug)) : null) ||
      (catItem ? curatedSolutionsMap.get(normalize(catItem.title)) : null) ||
      (matchedDbItem ? curatedSolutionsMap.get(normalize(matchedDbItem.title)) : null);

    let lcSol =
      (resolvedSlug && leetcodeSolutionsMap.get(normalize(resolvedSlug))) ||
      leetcodeSolutionsMap.get(normClean) ||
      leetcodeSolutionsMap.get(normKey) ||
      (catItem && leetcodeSolutionsMap.get(normalize(catItem.title))) ||
      (matchedDbItem && leetcodeSolutionsMap.get(normalize(matchedDbItem.title))) ||
      (catItem?.questionId && leetcodeSolutionsMap.get(String(catItem.questionId))) ||
      (matchedDbItem?.leetcodeId && leetcodeSolutionsMap.get(String(matchedDbItem.leetcodeId))) ||
      (queryId && leetcodeSolutionsMap.get(String(queryId))) ||
      findLcSolFuzzy(normClean) ||
      findLcSolFuzzy(normKey);

    if (!resolvedSlug && lcSol?.url?.includes("/problems/")) {
      resolvedSlug = lcSol.url.split("/problems/")[1]?.split("/")[0];
    }

    let details = null;
    if (resolvedSlug) {
      details = await leetcodeService.getProblemDetails(resolvedSlug);
    }

    const testCases = details?.testCases?.length
      ? details.testCases
      : (nonLcProb?.testCases?.length
        ? nonLcProb.testCases
        : parseTestCasesFromExamples(curatedSol?.examples || lcSol?.examples || ""));

    const problemStatement =
      details?.description ||
      nonLcProb?.description ||
      curatedSol?.problemStatement ||
      lcSol?.description ||
      `Solve the problem: "${details?.title || nonLcProb?.title || curatedSol?.title || lcSol?.title || catItem?.title || problemKey}".`;

    const constraints = details?.constraints || nonLcProb?.constraints || [];

    const examplesText = testCases
      .map((tc, i) => `Example ${i + 1}:\nInput: ${tc.input}\nOutput: ${tc.expectedOutput}${tc.explanation ? `\nExplanation: ${tc.explanation}` : ""}`)
      .join("\n\n");

    const queryPlatform = String(req.query.platform || "").trim().toLowerCase();

    const cfSol =
      codeforcesSolutionsMap.get(normKey) ||
      (queryId ? codeforcesSolutionsMap.get(normalize(queryId)) : null) ||
      (catItem ? codeforcesSolutionsMap.get(normalize(catItem.title)) : null);

    if (cfSol) {
      const approaches = cfSol.approaches || [];
      const defaultCode = approaches[0]?.codes?.cpp || approaches[0]?.code || "";
      return res.json({
        success: true,
        hasNotes: true,
        title: cfSol.title || problemKey,
        platform: "Codeforces",
        platformUrl: cfSol.url,
        problemStatement: cfSol.problemStatement || `Codeforces ${cfSol.id}: "${cfSol.title}". Rating: ${cfSol.rating || "Unrated"}. Solve using standard competitive programming I/O.`,
        constraints: cfSol.constraints || (cfSol.rating ? [`Rating: ${cfSol.rating}`, `Difficulty: ${cfSol.difficulty}`] : []),
        examples: cfSol.examples || "",
        testCases: cfSol.testCases || [],
        approaches,
        leetcodeSolution: null,
        defaultCode,
      });
    }

    if (curatedSol || lcSol || details) {
      const codes = typeof lcSol?.code === "object" ? lcSol.code : { java: lcSol?.code || "" };
      const lcRawCode = codes.java || codes.cpp || codes.python || "";

      // Extract canonical LeetCode method name from official solution if available
      const canonicalMethodName =
        lcSol?.code?.java?.match(/(?:public|protected|private)?\s+[\w<>\[\]]+\s+(\w+)\s*\(/)?.[1] ||
        lcSol?.code?.cpp?.match(/[\w<>:]+\s+(\w+)\s*\(/)?.[1] ||
        null;

      const approaches = [];
      if (curatedSol?.approaches?.length) {
        approaches.push(...curatedSol.approaches.filter(
          (app) => !["takeuforward", "tuf"].includes(app.name?.trim().toLowerCase())
        ));
      }

      if (approaches.length === 0) {
        approaches.push({
          name: "Optimal",
          isLeetCode: true,
          isTuf: false,
          timeComplexity: formatComplexity(lcSol?.timeComplexity),
          spaceComplexity: formatComplexity(lcSol?.spaceComplexity || "O(1)"),
          intuition: lcSol?.explanation || "Optimized solution approach with linear complexity.",
          code: lcRawCode,
          codes: codes,
          url: lcSol?.url || (resolvedSlug ? `https://leetcode.com/problems/${resolvedSlug}/` : undefined),
        });
      } else {
        // Find Optimal approach to guarantee official LeetCode accepted code
        let optimalApp = approaches.find((a) => a.name?.toLowerCase().includes("optimal"));
        if (!optimalApp && approaches.length > 0) {
          optimalApp = approaches[approaches.length - 1];
        }

        approaches.forEach((app) => {
          app.timeComplexity = formatComplexity(app.timeComplexity);
          app.spaceComplexity = formatComplexity(app.spaceComplexity || "O(1)");
          const isOptimal = app === optimalApp || app.name?.toLowerCase().includes("optimal");
          let appCodes = typeof app.codes === "object" && app.codes !== null
            ? { ...app.codes }
            : typeof app.code === "object" && app.code !== null
              ? { ...app.code }
              : { java: typeof app.code === "string" ? app.code : "" };

          if (isOptimal && lcSol?.code && typeof lcSol.code === "object") {
            // Guarantee 100% official accepted code on Optimal approach
            if (lcSol.code.java) appCodes.java = lcSol.code.java;
            if (lcSol.code.cpp) appCodes.cpp = lcSol.code.cpp;
            if (lcSol.code.python) appCodes.python = lcSol.code.python;
          } else {
            // Standardize Brute Force & Better approaches for LeetCode
            if (appCodes.java) appCodes.java = formatLeetCodeCode(appCodes.java, "java", canonicalMethodName);
            if (appCodes.cpp) appCodes.cpp = formatLeetCodeCode(appCodes.cpp, "cpp", canonicalMethodName);
            if (appCodes.python) appCodes.python = formatLeetCodeCode(appCodes.python, "python", canonicalMethodName);
            if (!appCodes.python && lcSol?.code?.python) appCodes.python = lcSol.code.python;
          }

          app.codes = appCodes;
          app.code = appCodes.java || appCodes.cpp || appCodes.python || "";
          if (lcSol?.url && !app.url) app.url = lcSol.url;
        });
      }

      const defaultCode =
        lcSol?.code?.java ||
        lcSol?.code?.cpp ||
        approaches[0]?.codes?.java ||
        approaches[0]?.codes?.cpp ||
        lcRawCode;

      return res.json({
        success: true,
        hasNotes: true,
        title: details?.title || curatedSol?.title || lcSol?.title || catItem?.title || problemKey,
        platform: "LeetCode",
        platformUrl: lcSol?.url || (resolvedSlug ? `https://leetcode.com/problems/${resolvedSlug}/` : ""),
        problemStatement,
        constraints,
        examples: examplesText,
        testCases,
        approaches,
        leetcodeSolution: lcSol,
        defaultCode,
      });
    }

    if (nonLcProb) {
      const probTitle = nonLcProb.title || nonLcProb.name || problemKey;
      const probUrl = nonLcProb.url || nonLcProb.tufHref || "";
      const isCodeforces = Boolean(
        nonLcProb.platform === "Codeforces" ||
        probUrl.includes("codeforces.com") ||
        codeforcesMap.has(normKey)
      );
      const platformName = isCodeforces
        ? "Codeforces"
        : (nonLcProb.platform || (probUrl.includes("geeksforgeeks.org") ? "GeeksforGeeks" : "takeUforward"));

      const tufCodes = {
        cpp: `// Problem: ${probTitle}\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    return 0;\n}`,
        java: `// Problem: ${probTitle}\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}`,
        python: `# Problem: ${probTitle}\nimport sys\n\ndef main():\n    pass\n\nif __name__ == '__main__':\n    main()`,
        javascript: `// Problem: ${probTitle}\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\n\nfunction solve() {}\nsolve();`,
      };

      const approaches = curatedSol?.approaches?.length
        ? curatedSol.approaches.filter(
          (app) => !["takeuforward", "tuf"].includes(app.name?.trim().toLowerCase())
        )
        : [];

      if (approaches.length === 0) {
        approaches.push({
          name: "Optimal",
          isLeetCode: false,
          isTuf: !isCodeforces,
          isCodeforces: isCodeforces,
          platform: platformName,
          timeComplexity: "O(N)",
          spaceComplexity: "O(1)",
          intuition: `Standard problem: "${probTitle}". Practice and solve using standard input/output.`,
          code: tufCodes.cpp,
          codes: tufCodes,
          url: probUrl || undefined,
        });
      }

      return res.json({
        success: true,
        hasNotes: true,
        title: probTitle,
        platform: platformName,
        platformUrl: probUrl,
        problemStatement: nonLcProb.description || `Solve the problem: "${probTitle}". Practice and solve using standard input/output.`,
        constraints,
        examples: examplesText,
        testCases,
        approaches,
        leetcodeSolution: null,
        defaultCode: "",
      });
    }

    const fallbackTitle = cleanKey || problemKey;
    const starterCodes = {
      java: `// Problem: ${fallbackTitle}\nimport java.util.*;\n\npublic class Solution {\n    public void solve() {\n        // Write solution here\n    }\n}`,
      cpp: `// Problem: ${fallbackTitle}\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve() {\n        // Write solution here\n    }\n};`,
      python: `# Problem: ${fallbackTitle}\nclass Solution:\n    def solve(self):\n        pass`,
      javascript: `// Problem: ${fallbackTitle}\nfunction solve() {\n    // Write solution here\n}`,
    };

    return res.json({
      success: true,
      hasNotes: false,
      title: fallbackTitle,
      problemStatement: `Solve the problem: "${fallbackTitle}".\nImplement and test your optimal algorithm directly in the compiler studio.`,
      examples: "",
      testCases: [],
      approaches: [
        {
          name: "Optimal",
          isLeetCode: false,
          isTuf: false,
          timeComplexity: "O(N)",
          spaceComplexity: "O(1)",
          intuition: `Formulate an optimal solution approach for "${fallbackTitle}". Evaluate time and space complexity constraints, handle edge conditions, and verify your logic against test cases.`,
          code: starterCodes.java,
          codes: starterCodes,
        },
      ],
      leetcodeSolution: null,
      defaultCode: starterCodes.java,
    });
  } catch (error) {
    console.error("[Practice:getProblemSolution]", error.message);
    res.status(500).json({ success: false, message: "Failed to load solution" });
  }
};

/**
 * POST /api/practice/toggle-status
 */
exports.toggleProblemStatus = async (req, res) => {
  try {
    const { problemKey } = req.body;
    if (!problemKey) return res.status(400).json({ success: false, message: "problemKey is required" });

    const normKey = normalize(problemKey);
    const progress = await getUserProgress(req.user.id);
    const isCurrentlySolved = (progress.solvedProblemKeys || []).includes(normKey);
    const isSolved = !isCurrentlySolved;

    const [updatedProgress] = await Promise.all([
      UserCodingProgress.findOneAndUpdate(
        { userId: req.user.id },
        isCurrentlySolved ? { $pull: { solvedProblemKeys: normKey } } : { $addToSet: { solvedProblemKeys: normKey } },
        { new: true }
      ),
      updateDailyCodingSolved(req.user.id, isCurrentlySolved ? -1 : 1),
    ]);

    res.json({
      success: true,
      isSolved,
      problemKey: normKey,
      totalSolved: updatedProgress?.solvedProblemKeys?.length || 0,
    });
  } catch (error) {
    console.error("[Practice:toggleProblemStatus]", error.message);
    res.status(500).json({ success: false, message: "Failed to update status" });
  }
};

/**
 * POST /api/practice/toggle-starred
 */
exports.toggleProblemStarred = async (req, res) => {
  try {
    const { problemKey } = req.body;
    if (!problemKey) return res.status(400).json({ success: false, message: "problemKey is required" });

    const normKey = normalize(problemKey);
    const progress = await getUserProgress(req.user.id);
    const isStarred = (progress.starredProblemKeys || []).includes(normKey);

    await UserCodingProgress.updateOne(
      { userId: req.user.id },
      isStarred ? { $pull: { starredProblemKeys: normKey } } : { $addToSet: { starredProblemKeys: normKey } }
    );

    res.json({ success: true, isStarred: !isStarred });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to toggle star" });
  }
};

/**
 * POST /api/practice/sync-submission
 */
exports.syncSubmission = async (req, res) => {
  try {
    const key = normalize(req.body.problemSlug || req.body.title);
    if (!key) return res.status(400).json({ success: false, message: "problemSlug or title is required" });

    await getUserProgress(req.user.id);
    const updated = await UserCodingProgress.findOneAndUpdate(
      { userId: req.user.id, solvedProblemKeys: { $ne: key } },
      { $addToSet: { solvedProblemKeys: key } },
      { returnDocument: "after" }
    );

    if (updated) {
      await updateDailyCodingSolved(req.user.id, 1);
      return res.json({ success: true, alreadySolved: false, totalSolved: updated.solvedProblemKeys.length });
    }

    const current = await getUserProgress(req.user.id);
    res.json({ success: true, alreadySolved: true, totalSolved: current?.solvedProblemKeys?.length || 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: "Sync error: " + error.message });
  }
};

/**
 * POST /api/practice/sync-batch
 * Batch sync problem slugs (for syncing LeetCode solved till date in 1 call)
 */
exports.syncBatchSubmissions = async (req, res) => {
  try {
    const { problemSlugs } = req.body;
    if (!Array.isArray(problemSlugs) || problemSlugs.length === 0) {
      return res.status(400).json({ success: false, message: "problemSlugs array is required" });
    }

    const keys = Array.from(new Set(problemSlugs.map(normalize).filter(Boolean)));
    if (keys.length === 0) {
      return res.status(400).json({ success: false, message: "No valid problem slugs provided" });
    }

    const currentProgress = await getUserProgress(req.user.id);
    const existingKeys = new Set(currentProgress?.solvedProblemKeys || []);
    const newKeys = keys.filter((k) => !existingKeys.has(k));

    let updatedProgress = currentProgress;
    if (newKeys.length > 0) {
      updatedProgress = await UserCodingProgress.findOneAndUpdate(
        { userId: req.user.id },
        { $addToSet: { solvedProblemKeys: { $each: newKeys } } },
        { new: true, upsert: true }
      );
      await updateDailyCodingSolved(req.user.id, newKeys.length);
    }

    res.json({
      success: true,
      message: `Successfully synced ${newKeys.length} new solved problems!`,
      totalSolved: updatedProgress?.solvedProblemKeys?.length || existingKeys.size,
      newlySolvedCount: newKeys.length,
      alreadySolvedCount: keys.length - newKeys.length,
    });
  } catch (error) {
    console.error("[Practice:syncBatchSubmissions]", error.message);
    res.status(500).json({ success: false, message: "Batch sync error: " + error.message });
  }
};

/**
 * GET /api/practice/user-status
 * Live stats and solved keys for browser extension
 */
exports.getUserStatus = async (req, res) => {
  try {
    const [user, progress] = await Promise.all([
      User.findById(req.user.id).select("name email avatar streak currentStreak leetcodeHandle codeforcesHandle").lean(),
      getUserProgress(req.user.id),
    ]);

    const totalSolved = progress?.solvedProblemKeys?.length || 0;

    const todayActivity = await DailyActivity.findOne({
      userId: req.user.id,
      date: getLocalDateString(new Date()),
    }).lean();

    let todaySolved = todayActivity?.codingProblemsSolved || 0;

    // Self-healing: if today's count was inflated beyond total unique problems ever solved, reconcile it
    if (todaySolved > totalSolved) {
      todaySolved = totalSolved;
      await DailyActivity.updateOne(
        { userId: req.user.id, date: getLocalDateString(new Date()) },
        { $set: { codingProblemsSolved: totalSolved } }
      ).catch(() => {});
    }

    res.json({
      success: true,
      user: {
        name: user?.name || "User",
        email: user?.email || "",
        avatar: user?.avatar || "",
        streak: user?.currentStreak || user?.streak || 0,
        leetcodeHandle: user?.leetcodeHandle || "",
        codeforcesHandle: user?.codeforcesHandle || "",
      },
      todaySolved,
      solvedKeys: progress?.solvedProblemKeys || [],
      totalSolved,
    });
  } catch (error) {
    console.error("[Practice:getUserStatus]", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch user status" });
  }
};

/**
 * POST /api/practice/reset-progress
 * Clears all solved problem keys and resets coding activity
 */
exports.resetProgress = async (req, res) => {
  try {
    await Promise.all([
      UserCodingProgress.findOneAndUpdate(
        { userId: req.user.id },
        { $set: { solvedProblemKeys: [] } },
        { new: true, upsert: true }
      ),
      DailyActivity.updateOne(
        { userId: req.user.id, date: getLocalDateString(new Date()) },
        { $set: { codingProblemsSolved: 0 } }
      ),
    ]);

    res.json({
      success: true,
      message: "Coding progress reset successfully.",
      totalSolved: 0,
    });
  } catch (error) {
    console.error("[Practice:resetProgress]", error.message);
    res.status(500).json({ success: false, message: "Failed to reset progress" });
  }
};

/**
 * DELETE /api/practice/custom-sheet/:sheetId
 * Delete a custom sheet (admin can delete GlobalSheet; users can delete personal customSheets)
 */
exports.deleteCustomSheet = async (req, res) => {
  try {
    const { sheetId } = req.params;
    if (!sheetId) return res.status(400).json({ success: false, message: "sheetId is required" });

    // Built-in official sheets cannot be deleted
    const protectedIds = ["strivers-180", "sql-75", "codeforces-ladder", "os", "dbms", "cn", "sql"];
    if (protectedIds.includes(sheetId)) {
      return res.status(403).json({ success: false, message: "Protected system roadmaps cannot be deleted" });
    }

    const adminUser = await User.findById(req.user.id).select("role").lean();
    const isAdmin = adminUser?.role === "admin";

    // 1. If admin, delete from GlobalSheet
    if (isAdmin) {
      await GlobalSheet.deleteOne({ id: sheetId });
    }

    // 2. Remove from user's customSheets and activeSheets
    if (isAdmin) {
      await UserCodingProgress.updateMany(
        {},
        {
          $pull: {
            customSheets: { id: sheetId },
            activeSheets: sheetId,
          },
        }
      );
    } else {
      await UserCodingProgress.updateOne(
        { userId: req.user.id },
        {
          $pull: {
            customSheets: { id: sheetId },
            activeSheets: sheetId,
          },
        }
      );
    }

    res.json({ success: true, message: "Roadmap deleted successfully" });
  } catch (error) {
    console.error("[Practice:deleteCustomSheet]", error.message);
    res.status(500).json({ success: false, message: "Failed to delete roadmap" });
  }
};

exports.cleanProblemTitle = cleanProblemTitle;
exports.findProblemInDatabase = findProblemInDatabase;
exports.isPracticeJudgeUrl = isPracticeJudgeUrl;
exports.isInstructorResourceUrl = isInstructorResourceUrl;
exports.parseCodeforcesUrl = parseCodeforcesUrl;
exports.resolveProblemItem = resolveProblemItem;
exports.parseCsvProblems = parseCsvProblems;
exports.extractTitleFromUrl = extractTitleFromUrl;
