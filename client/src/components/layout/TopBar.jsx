import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Sun,
  Moon,
  LogOut,
  LogIn,
  LayoutDashboard,
  Code2,
  Tv,
  GraduationCap,
  Settings,
  ChevronDown,
  Home,
  Menu,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import Logo from "../common/Logo";

function StreakFlameIcon({ active = false, isWeb = false }) {
  if (!active) {
    return (
      <svg
        className={`w-4 h-4 shrink-0 transition-colors ${
          isWeb ? "text-[var(--bone-muted)]/50" : "text-neutral-500"
        }`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    );
  }

  if (isWeb) {
    // Pure Crimson under Web theme: zero orange, zero neon
    return (
      <svg
        className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="webCrimsonFlame" x1="0%" y1="100%" x2="30%" y2="0%">
            <stop offset="0%" stopColor="var(--crimson-deep)" />
            <stop offset="50%" stopColor="var(--crimson)" />
            <stop offset="100%" stopColor="var(--crimson-hover)" />
          </linearGradient>
        </defs>
        <path
          d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
          fill="url(#webCrimsonFlame)"
          stroke="var(--crimson)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      className="w-4 h-4 shrink-0 drop-shadow-[0_0_8px_rgba(249,115,22,0.7)] animate-pulse transition-transform duration-300 group-hover:scale-110"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="activeFlameGrad" x1="0%" y1="100%" x2="30%" y2="0%">
          <stop offset="0%" stopColor="#DC2626" />
          <stop offset="50%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <path
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
        fill="url(#activeFlameGrad)"
        stroke="#F97316"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TopBar({ title, showBack = false, onMenuClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, isWeb, toggleTheme, toggleSkin } = useTheme();
  const { user, streak, logout, isAuthenticated } = useAuth();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const getPageTitle = () => {
    if (title) return title;
    const path = location.pathname;
    if (path === "/") return "Home";
    if (path.startsWith("/dashboard")) return "Dashboard";
    if (path.startsWith("/practice")) return "Practice Studio";
    if (path.startsWith("/youtube")) return "Ad - free Video";
    if (path.startsWith("/prephub")) return "Core Workspace";
    if (path.startsWith("/settings")) return "Settings";
    return "";
  };

  const displayTitle = getPageTitle();

  const quickNav = [
    { name: "Home", path: "/", icon: Home },
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Practice", path: "/practice", icon: Code2 },
    { name: "Ad - free Video", path: "/youtube", icon: Tv },
    { name: "Workspace", path: "/prephub?group=rk", icon: GraduationCap },
  ];

  const isNavActive = (itemPath) => {
    if (itemPath === "/") {
      return location.pathname === "/";
    }
    const cleanItemPath = itemPath.split("?")[0];
    return location.pathname.startsWith(cleanItemPath);
  };

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
  };

  const handleAuthAction = () => {
    if (isAuthenticated) {
      logout();
      navigate("/login");
    } else {
      navigate("/login");
    }
  };

  const displayStreak =
    typeof streak === "number"
      ? streak
      : typeof streak?.currentStreak === "number"
      ? streak.currentStreak
      : Number(streak) || 0;
  const displayBadge =
    user?.badge && user.badge !== "Basic User" ? user.badge : null;

  return (
    <header
      className={`sticky top-0 z-30 shrink-0 transition-colors relative ${
        isWeb
          ? "border-b border-[var(--header-border,var(--border-subtle))] bg-[var(--header-bg,var(--bg-main))] backdrop-blur-md"
          : "border-b border-slate-200/90 dark:border-[#252033]/90 bg-white/90 dark:bg-[#0E0C15]/95 backdrop-blur-xl shadow-xs dark:shadow-[0_4px_24px_rgba(0,0,0,0.55)]"
      }`}
    >
      {/* Hairline Crimson Accent Line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[var(--crimson,#d63a3a)]/80 to-transparent" />

      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 gap-3">
        {/* Left: Branding & Context */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              title="Open menu"
              aria-label="Open menu"
              className="lg:hidden p-1.5 rounded-lg text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2.5 font-brand tracking-tight group cursor-pointer text-left focus:outline-none select-none py-1"
            title="StudyBuddy Dashboard"
          >
            <Logo size="sm" />
            <div className="flex items-baseline">
              <span
                className={`text-lg sm:text-xl font-bold transition-colors ${
                  isWeb ? "text-[var(--bone)]" : "text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-neutral-100"
                }`}
              >
                Study
              </span>
              <span
                className={`text-lg sm:text-xl font-black ${
                  isWeb
                    ? "text-[var(--crimson-hover)]"
                    : "bg-gradient-to-r from-[#FF4D4D] via-[#FF6E6E] to-[#FFA270] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(255,77,77,0.35)]"
                }`}
              >
                Buddy
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--crimson)] ml-0.5" />
            </div>
          </button>

          {/* Back Button */}
          {showBack && (
            <button
              onClick={handleBack}
              aria-label="Go back"
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium cursor-pointer transition ${
                isWeb
                  ? "bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--bone)] hover:bg-[var(--surface-hover)]"
                  : "rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-900/80 text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-neutral-800"
              }`}
              style={{
                clipPath: isWeb
                  ? "polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)"
                  : undefined,
              }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          {/* Breadcrumb / Page Title */}
          <div
            className={`hidden md:flex items-center gap-1.5 text-xs font-mono pl-1 ${
              isWeb ? "text-[var(--bone-muted)]" : "text-slate-500 dark:text-neutral-400"
            }`}
          >
            <span className="opacity-40">/</span>
            <span className="font-medium truncate max-w-[160px]">
              {displayTitle}
            </span>
          </div>
        </div>

        {/* Center: Desktop Quick Nav Tabs (Chamfered Cuts) */}
        <nav
          className={`hidden lg:flex items-center gap-1 p-1 ${
            isWeb
              ? "bg-[var(--surface-card,#1a0b0f)] border border-[var(--border-subtle,rgba(241,232,218,0.18))]"
              : "bg-slate-100 dark:bg-[#15121F]/80 rounded-xl border border-slate-200 dark:border-neutral-800/70 shadow-xs dark:shadow-inner"
          }`}
          style={{
            clipPath: isWeb
              ? "polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)"
              : undefined,
          }}
        >
          {quickNav.map((item) => {
            const active = isNavActive(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  active
                    ? isWeb
                      ? "bg-[var(--surface-hover,#26111a)] text-[var(--bone,#f1e8da)] border border-[var(--crimson,#d63a3a)] font-semibold"
                      : "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 font-semibold shadow-xs dark:shadow-[0_0_12px_rgba(224,77,77,0.2)]"
                    : isWeb
                    ? "text-[var(--bone-muted,#b9a29b)] hover:text-[var(--bone,#f1e8da)] hover:bg-[var(--surface-hover,#26111a)]/50 border border-transparent"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800/50 border border-transparent"
                } ${!isWeb ? "rounded-lg" : ""}`}
                style={{
                  clipPath: isWeb
                    ? "polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)"
                    : undefined,
                }}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    active
                      ? isWeb
                        ? "text-[var(--crimson-hover,#e5484d)]"
                        : "text-red-500 dark:text-red-400"
                      : isWeb
                      ? "text-[var(--bone-muted,#b9a29b)]"
                      : "text-slate-400 dark:text-neutral-500"
                  }`}
                />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Streak & Badge-Triggered Profile Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Streak Pill: Chamfered 6px, Crimson (No Orange) */}
          <div
            title={
              displayStreak > 0
                ? `Current Daily Streak: ${displayStreak} Day${displayStreak === 1 ? "" : "s"}`
                : "No active streak (0 days). Complete a study session or problem today to light up your streak!"
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs select-none transition group cursor-default ${
              isWeb
                ? "bg-[var(--surface-card,#1a0b0f)] border border-[var(--crimson,#d63a3a)]/40 text-[var(--bone,#f1e8da)]"
                : displayStreak > 0
                ? "bg-gradient-to-r from-orange-100 via-amber-50 to-red-100 dark:from-orange-500/15 dark:via-[#18111B] dark:to-red-500/15 border border-orange-300 dark:border-orange-500/35 hover:border-orange-400/60 shadow-xs dark:shadow-[0_0_12px_rgba(249,115,22,0.2),inset_0_1px_0_rgba(255,255,255,0.06)] rounded-full text-orange-700 dark:text-transparent"
                : "bg-slate-100 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:border-slate-300 dark:hover:border-neutral-700 rounded-full"
            }`}
            style={{
              clipPath: isWeb
                ? "polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)"
                : undefined,
            }}
          >
            <StreakFlameIcon active={displayStreak > 0} isWeb={isWeb} />
            <span
              className={`font-mono text-xs ${
                isWeb
                  ? displayStreak > 0
                    ? "font-bold text-[var(--crimson-hover,#e5484d)]"
                    : "font-medium text-[var(--bone-muted,#b9a29b)]"
                  : displayStreak > 0
                  ? "font-bold tracking-tight text-orange-700 dark:bg-gradient-to-r dark:from-amber-200 dark:via-orange-300 dark:to-amber-100 dark:bg-clip-text dark:text-transparent"
                  : "font-medium text-slate-500 dark:text-neutral-400"
              }`}
            >
              {displayStreak > 0 ? `${displayStreak}d` : "0"}
            </span>
          </div>

          {/* User Badge / Profile Menu Trigger */}
          {isAuthenticated ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className={`flex items-center gap-2 pl-1 pr-2.5 py-1 transition-all duration-200 cursor-pointer select-none text-xs group ${
                  isWeb
                    ? "bg-[var(--surface-card,#1a0b0f)] hover:bg-[var(--surface-hover,#26111a)] border border-[var(--border-strong,rgba(241,232,218,0.22))] text-[var(--bone,#f1e8da)]"
                    : isProfileMenuOpen
                    ? "rounded-full bg-slate-200 dark:bg-neutral-800/90 border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-red-500/30"
                    : "rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-neutral-900/80 dark:hover:bg-neutral-800/90 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 shadow-xs"
                }`}
                style={{
                  clipPath: isWeb
                    ? "polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)"
                    : undefined,
                }}
                title="Open Profile, Settings & Menu"
              >
                {/* Monogram / Picture Avatar */}
                <div
                  className={`w-6 h-6 shrink-0 shadow-xs flex items-center justify-center p-[1px] ${
                    isWeb
                      ? "bg-[var(--surface-hover,#26111a)] border border-[var(--crimson,#d63a3a)]"
                      : "rounded-full bg-gradient-to-br from-red-500 via-rose-500 to-amber-500"
                  }`}
                  style={{
                    clipPath: isWeb
                      ? "polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)"
                      : undefined,
                  }}
                >
                  {user?.avatar || user?.picture ? (
                    <img
                      src={user.avatar || user.picture}
                      alt={user?.name || "User"}
                      className={`w-full h-full object-cover ${
                        !isWeb ? "rounded-full" : ""
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center font-bold text-[10px] ${
                        isWeb
                          ? "bg-[var(--surface-card,#1a0b0f)] text-[var(--bone,#f1e8da)]"
                          : "bg-slate-200 dark:bg-[#14111D] text-slate-800 dark:text-white rounded-full"
                      }`}
                    >
                      {(user?.name || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <span className="font-medium max-w-[100px] truncate text-left hidden sm:inline">
                    {user?.name?.split(" ")[0] || "User"}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                      isProfileMenuOpen ? "rotate-180 text-[var(--crimson-hover,#e5484d)]" : "opacity-60"
                    }`}
                  />
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div
                  className={`absolute right-0 mt-2 w-64 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 ${
                    isWeb
                      ? "bg-[var(--surface-card,#1a0b0f)] text-[var(--bone,#f1e8da)] border border-[var(--border-strong,rgba(241,232,218,0.22))]"
                      : "rounded-2xl border border-slate-200 dark:border-neutral-700/80 bg-white/98 dark:bg-[#121118]/95 text-slate-900 dark:text-neutral-100 backdrop-blur-xl"
                  }`}
                  style={{
                    clipPath: isWeb
                      ? "polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)"
                      : undefined,
                  }}
                >
                  {/* User Monogram Header */}
                  <div className="px-3 py-2.5 flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 flex items-center justify-center font-bold text-xs shrink-0 ${
                        isWeb
                          ? "bg-[var(--surface-hover,#26111a)] text-[var(--bone,#f1e8da)] border border-[var(--crimson,#d63a3a)]"
                          : "rounded-full bg-gradient-to-br from-red-500 to-amber-500 text-white"
                      }`}
                      style={{
                        clipPath: isWeb
                          ? "polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)"
                          : undefined,
                      }}
                    >
                      {(user?.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate text-slate-900 dark:text-white">
                        {user?.name || "Student"}
                      </p>
                      <p
                        className={`text-[10px] truncate ${
                          isWeb ? "text-[var(--bone-muted)]" : "text-slate-500 dark:text-neutral-400"
                        }`}
                      >
                        {user?.email || ""}
                      </p>
                      {displayBadge && (
                        <span className="inline-block mt-1 text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-red-50 text-red-600 border border-red-200 dark:bg-[var(--surface-hover,#26111a)] dark:text-[var(--crimson-hover,#e5484d)] dark:border-[var(--crimson,#d63a3a)]/40">
                          {displayBadge}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className={`h-[1px] my-1 ${
                      isWeb
                        ? "bg-[var(--border-subtle,rgba(241,232,218,0.14))]"
                        : "bg-slate-200 dark:bg-neutral-800/80"
                    }`}
                  />

                  {/* Settings & Profile */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      navigate("/settings");
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left cursor-pointer transition ${
                      isWeb
                        ? "text-[var(--bone-muted,#b9a29b)] hover:text-[var(--bone,#f1e8da)] hover:bg-[var(--surface-hover,#26111a)]"
                        : "rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-neutral-800/60"
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5 text-[var(--crimson-hover,#e5484d)]" />
                    <span className="text-xs font-medium">Settings & Profile</span>
                  </button>

                  {/* Theme Mode Toggle Row */}
                  <button
                    type="button"
                    onClick={() => {
                      toggleTheme();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 text-left cursor-pointer transition ${
                      isWeb
                        ? "text-[var(--bone-muted,#b9a29b)] hover:text-[var(--bone,#f1e8da)] hover:bg-[var(--surface-hover,#26111a)]"
                        : "rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-neutral-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isDark ? (
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Moon className="w-3.5 h-3.5 text-[var(--crimson-hover,#e5484d)]" />
                      )}
                      <span className="text-xs font-medium">
                        {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 border ${
                        isWeb
                          ? "bg-[var(--surface-hover,#26111a)] border-[var(--border-subtle,rgba(241,232,218,0.18))] text-[var(--bone,#f1e8da)]"
                          : "rounded text-slate-600 bg-slate-100 border-slate-200 dark:text-neutral-400 dark:bg-neutral-900 dark:border-neutral-800"
                      }`}
                    >
                      {isDark ? "Dark" : "Light"}
                    </span>
                  </button>

                  {/* Skin Mode Toggle Row */}
                  <button
                    type="button"
                    onClick={() => {
                      toggleSkin();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 text-left cursor-pointer transition ${
                      isWeb
                        ? "text-[var(--bone-muted,#b9a29b)] hover:text-[var(--bone,#f1e8da)] hover:bg-[var(--surface-hover,#26111a)]"
                        : "rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-neutral-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm leading-none opacity-80 select-none">
                        🕸️
                      </span>
                      <span className="text-xs font-medium">
                        {isWeb ? "Switch to Basic Skin" : "Switch to Web Skin"}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 border ${
                        isWeb
                          ? "bg-[var(--surface-hover,#26111a)] border-[var(--border-subtle,rgba(241,232,218,0.18))] text-[var(--bone,#f1e8da)]"
                          : "rounded text-slate-600 bg-slate-100 border-slate-200 dark:text-neutral-400 dark:bg-neutral-900 dark:border-neutral-800"
                      }`}
                    >
                      {isWeb ? "Web" : "Basic"}
                    </span>
                  </button>

                  <div
                    className={`h-[1px] my-1 ${
                      isWeb
                        ? "bg-[var(--border-subtle,rgba(241,232,218,0.14))]"
                        : "bg-slate-200 dark:bg-neutral-800/80"
                    }`}
                  />

                  {/* Sign Out */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      handleAuthAction();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/40 transition text-left cursor-pointer font-medium text-xs rounded-lg"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/login")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                isWeb
                  ? "bg-[var(--crimson-deep,#6e1d24)] hover:bg-[var(--crimson,#d63a3a)] text-[var(--on-crimson-deep,#f1e8da)] hover:text-[var(--on-accent,#ffffff)] border border-[var(--crimson,#d63a3a)]/30"
                  : "text-white rounded-lg bg-gradient-to-r from-[#BA3C3C] to-[#E04D4D] hover:opacity-90 shadow-sm"
              }`}
              style={{
                clipPath: isWeb
                  ? "polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)"
                  : undefined,
              }}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
