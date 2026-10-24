// StudyBuddy Extension – Streamlined Popup Controller (Ponytail Minimalist)
document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const apiUrlInput = $("apiUrl");
  const authTokenInput = $("authToken");
  const saveBtn = $("saveBtn");
  const testBtn = $("testBtn");
  const autoDetectBtn = $("autoDetectBtn");
  const syncAllBtn = $("syncAllBtn");
  const syncBtnText = $("syncBtnText");
  const platLcBtn = $("platLcBtn");
  const platCfBtn = $("platCfBtn");
  const cfHandleBox = $("cfHandleBox");
  const cfHandleInput = $("cfHandleInput");
  const statusPill = $("statusPill");
  const statusPillText = $("statusPillText");
  const statusMsg = $("statusMsg");
  const profileCard = $("profileCard");
  const userAvatar = $("userAvatar");
  const userName = $("userName");
  const userEmail = $("userEmail");
  const statStreak = $("statStreak");
  const statToday = $("statToday");
  const statTotal = $("statTotal");
  const envLocalBtn = $("envLocalBtn");
  const envProdBtn = $("envProdBtn");
  const disconnectBtn = $("disconnectBtn");
  const toggleSettingsBtn = $("toggleSettingsBtn");
  const settingsDrawer = $("settingsDrawer");
  const toggleArrow = $("toggleArrow");
  const ytDetectedBox = $("ytDetectedBox");
  const ytDetectedTitle = $("ytDetectedTitle");
  const ytSyncBtn = $("ytSyncBtn");

  const DEFAULT_LOCAL_API = "http://localhost:5000/api";
  const DEFAULT_PROD_API = "https://studybuddy-mepq.onrender.com/api";
  let currentEnv = "local";
  let localUrl = DEFAULT_LOCAL_API;
  let prodUrl = DEFAULT_PROD_API;
  let activeToken = "";
  let activePlatform = "leetcode";

  // 1. Strict Write-Only Token Protection
  ["copy", "cut", "contextmenu", "dragstart"].forEach((evt) => {
    authTokenInput.addEventListener(evt, (e) => e.preventDefault());
  });
  authTokenInput.addEventListener("select", () => window.getSelection()?.removeAllRanges());

  // 2. Settings Drawer Toggle
  toggleSettingsBtn.addEventListener("click", () => {
    const isOpen = settingsDrawer.classList.toggle("open");
    toggleArrow.textContent = isOpen ? "▲" : "▼";
  });

  // 3. Platform Switcher (Option B)
  const switchPlatform = (platform) => {
    activePlatform = platform;
    chrome.storage.local.set({ studybuddy_platform: platform });
    const isLc = platform === "leetcode";
    platLcBtn?.classList.toggle("active", isLc);
    platCfBtn?.classList.toggle("active", !isLc);
    if (cfHandleBox) cfHandleBox.style.display = isLc ? "none" : "block";
    if (syncBtnText) syncBtnText.textContent = `Sync Solved History (${isLc ? "LeetCode" : "Codeforces"})`;
  };
  platLcBtn?.addEventListener("click", () => switchPlatform("leetcode"));
  platCfBtn?.addEventListener("click", () => switchPlatform("codeforces"));

  // 4. Environment Switcher
  const switchEnv = (env) => {
    if (currentEnv === "local") localUrl = apiUrlInput.value.trim() || DEFAULT_LOCAL_API;
    else prodUrl = apiUrlInput.value.trim() || DEFAULT_PROD_API;

    currentEnv = env;
    envLocalBtn.classList.toggle("active", env === "local");
    envProdBtn.classList.toggle("active", env === "prod");
    apiUrlInput.value = env === "local" ? localUrl : (prodUrl || DEFAULT_PROD_API);

    chrome.storage.local.set({
      studybuddy_env: env,
      studybuddy_local_url: localUrl,
      studybuddy_prod_url: prodUrl,
      studybuddy_api_url: apiUrlInput.value,
    });
    if (activeToken) refreshUserStatus(apiUrlInput.value, activeToken);
  };
  envLocalBtn.addEventListener("click", () => switchEnv("local"));
  envProdBtn.addEventListener("click", () => switchEnv("prod"));

  // 5. Restore Saved State
  chrome.storage.local.get(
    ["studybuddy_token", "studybuddy_api_url", "studybuddy_env", "studybuddy_local_url", "studybuddy_prod_url", "studybuddy_platform", "studybuddy_cf_handle"],
    (data) => {
      localUrl = data.studybuddy_local_url || DEFAULT_LOCAL_API;
      prodUrl = data.studybuddy_prod_url || DEFAULT_PROD_API;
      currentEnv = data.studybuddy_env || "local";
      envLocalBtn.classList.toggle("active", currentEnv === "local");
      envProdBtn.classList.toggle("active", currentEnv === "prod");

      apiUrlInput.value = data.studybuddy_api_url || (currentEnv === "local" ? localUrl : prodUrl);
      if (data.studybuddy_platform) switchPlatform(data.studybuddy_platform);
      if (data.studybuddy_cf_handle && cfHandleInput) cfHandleInput.value = data.studybuddy_cf_handle;

      if (data.studybuddy_token) {
        activeToken = data.studybuddy_token;
        authTokenInput.value = "";
        authTokenInput.placeholder = "•••••••••••••••• (Encrypted & Saved)";
        refreshUserStatus(apiUrlInput.value, activeToken);
      } else {
        setConnectedUI(false, "Not Linked");
        settingsDrawer.classList.add("open");
        toggleArrow.textContent = "▲";
      }
    }
  );

  // 6. User Status Refresh
  async function refreshUserStatus(apiUrl, token) {
    if (!token) return setConnectedUI(false, "No Token");

    chrome.runtime.sendMessage({ action: "GET_USER_STATUS", payload: { apiUrl, token } }, (res) => {
      if (res?.success) {
        setConnectedUI(true, "Connected");
        profileCard.classList.add("active");
        const u = res.user || {};
        userName.textContent = u.name || "StudyBuddy Developer";
        userEmail.textContent = u.email || "Active Session";
        userAvatar.textContent = (u.name?.[0] || "U").toUpperCase();
        statStreak.textContent = u.streak || 0;
        statToday.textContent = res.todaySolved || 0;
        statTotal.textContent = res.totalSolved || 0;

        if (u.codeforcesHandle && cfHandleInput && !cfHandleInput.value) {
          cfHandleInput.value = u.codeforcesHandle;
        }
        if (Array.isArray(res.solvedKeys)) {
          chrome.storage.local.set({ studybuddy_solved_keys: res.solvedKeys });
        }
      } else {
        setConnectedUI(false, res?.message ? "Invalid Token" : "Offline");
        profileCard.classList.remove("active");
      }
    });
  }

  function setConnectedUI(isConnected, label) {
    statusPill.className = `status-pill ${isConnected ? "" : "disconnected"}`;
    statusPillText.textContent = label;
  }

  // 7. Save Config
  saveBtn.addEventListener("click", () => {
    const apiUrl = apiUrlInput.value.trim() || DEFAULT_LOCAL_API;
    const tokenToSave = authTokenInput.value.trim() || activeToken;
    if (!tokenToSave) return showMsg("Please enter your JWT token or click Auto-Detect", false);

    activeToken = tokenToSave;
    authTokenInput.value = "";
    authTokenInput.placeholder = "•••••••••••••••• (Encrypted & Saved)";

    const updates = { studybuddy_api_url: apiUrl, studybuddy_token: activeToken, studybuddy_env: currentEnv };
    if (currentEnv === "local") updates.studybuddy_local_url = apiUrl;
    else updates.studybuddy_prod_url = apiUrl;

    chrome.storage.local.set(updates, () => {
      showMsg("Settings saved & token protected!", true);
      refreshUserStatus(apiUrl, activeToken);
    });
  });

  // 8. Disconnect Account
  disconnectBtn?.addEventListener("click", () => {
    chrome.storage.local.remove(["studybuddy_token", "studybuddy_solved_keys"], () => {
      activeToken = "";
      authTokenInput.value = "";
      authTokenInput.placeholder = "Paste token here to update";
      setConnectedUI(false, "Not Linked");
      profileCard.classList.remove("active");
      showMsg("StudyBuddy account disconnected.", true);
    });
  });

  // 9. Test Ping
  testBtn.addEventListener("click", () => {
    const apiUrl = apiUrlInput.value.trim() || DEFAULT_LOCAL_API;
    const token = authTokenInput.value.trim() || activeToken;
    showMsg("Pinging backend server...", true);

    chrome.runtime.sendMessage({ action: "TEST_CONNECTION", payload: { apiUrl, token } }, (res) => {
      showMsg(res?.message || "Connection check completed", Boolean(res?.success));
      if (res?.success) refreshUserStatus(apiUrl, token);
      else setConnectedUI(false, "Failed");
    });
  });

  // 10. Auto-Detect Token
  autoDetectBtn.addEventListener("click", async () => {
    showMsg("Scanning open tabs for StudyBuddy...", true);
    try {
      const tabs = await chrome.tabs.query({});
      const target = tabs.find((t) => t.url && /(?:localhost:(?:5173|3000)|pages\.dev|workers\.dev|studybuddy)/i.test(t.url))
                  || (await chrome.tabs.query({ active: true, currentWindow: true }))[0];

      if (!target?.id) return showMsg("StudyBuddy tab not found. Open StudyBuddy in Chrome first!", false);

      chrome.scripting.executeScript(
        {
          target: { tabId: target.id },
          func: () => ({
            token: localStorage.getItem("token"),
            apiUrl: localStorage.getItem("studybuddy_api_url"),
            origin: window.location.origin,
          }),
        },
        ([res]) => {
          const { token, apiUrl, origin } = res?.result || {};
          if (!token) return showMsg("No token found. Please log in to StudyBuddy in that tab!", false);

          activeToken = token;
          authTokenInput.value = "";
          authTokenInput.placeholder = "•••••••••••••••• (Encrypted & Saved)";

          const isLocal = origin?.includes("localhost") || origin?.includes("127.0.0.1");
          const targetApi = apiUrl || (isLocal ? DEFAULT_LOCAL_API : (origin ? `${origin}/api` : DEFAULT_PROD_API));
          apiUrlInput.value = targetApi;
          currentEnv = isLocal ? "local" : "prod";
          envLocalBtn.classList.toggle("active", isLocal);
          envProdBtn.classList.toggle("active", !isLocal);

          chrome.storage.local.set(
            { studybuddy_token: token, studybuddy_api_url: targetApi, studybuddy_env: currentEnv },
            () => {
              showMsg("Token auto-detected & securely stored! 🔥", true);
              refreshUserStatus(targetApi, token);
              settingsDrawer.classList.remove("open");
              toggleArrow.textContent = "▼";
            }
          );
        }
      );
    } catch (err) {
      showMsg("Tab detection failed: " + err.message, false);
    }
  });

  // 11. Unified Historical Sync (Shared Dispatcher)
  syncAllBtn.addEventListener("click", () => {
    const token = activeToken || authTokenInput.value.trim();
    const apiUrl = apiUrlInput.value.trim() || DEFAULT_LOCAL_API;
    if (!token) return showMsg("Please connect your StudyBuddy account first!", false);

    const isLc = activePlatform === "leetcode";
    const handle = cfHandleInput?.value.trim() || "";

    if (!isLc && !handle) {
      showMsg("Please enter your Codeforces username above!", false);
      cfHandleInput?.focus();
      return;
    }

    if (!isLc) chrome.storage.local.set({ studybuddy_cf_handle: handle });

    showMsg(`Fetching solved problems from ${isLc ? "LeetCode" : "Codeforces"}...`, true);
    syncAllBtn.disabled = true;

    const action = isLc ? "SYNC_ALL_LEETCODE" : "SYNC_ALL_CODEFORCES";
    chrome.runtime.sendMessage({ action, payload: { apiUrl, token, handle } }, (res) => {
      syncAllBtn.disabled = false;
      showMsg(res?.message || (res?.success ? "Sync successful!" : "Sync failed."), Boolean(res?.success));
      if (res?.success) refreshUserStatus(apiUrl, token);
    });
  });

  // 12. Active Tab YouTube Detection
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs?.[0];
    if (activeTab?.url && /youtube\.com\/(?:watch|playlist)/i.test(activeTab.url)) {
      if (ytDetectedBox) {
        ytDetectedBox.style.display = "block";
        if (ytDetectedTitle) {
          ytDetectedTitle.textContent = activeTab.title ? activeTab.title.replace(/- YouTube$/i, "").trim() : "YouTube Course Detected";
        }
        ytSyncBtn?.addEventListener("click", () => {
          const token = activeToken || authTokenInput.value.trim();
          const apiUrl = apiUrlInput.value.trim() || DEFAULT_LOCAL_API;
          if (!token) return showMsg("Please connect your StudyBuddy account first!", false);

          showMsg("Importing YouTube course to StudyBuddy...", true);
          ytSyncBtn.disabled = true;
          chrome.runtime.sendMessage(
            { action: "SYNC_YOUTUBE", payload: { url: activeTab.url, apiUrl, token } },
            (res) => {
              ytSyncBtn.disabled = false;
              showMsg(res?.message || (res?.success ? "Course imported!" : "Import failed"), Boolean(res?.success));
              if (res?.success) ytDetectedBox.style.display = "none";
            }
          );
        });
      }
    }
  });

  function showMsg(text, isSuccess) {
    statusMsg.textContent = text;
    statusMsg.className = `msg ${isSuccess ? "success" : "error"}`;
    setTimeout(() => { statusMsg.className = "msg"; }, 5000);
  }
});
