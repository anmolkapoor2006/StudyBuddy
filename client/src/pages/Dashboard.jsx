import { useState, useEffect, useMemo, useCallback } from "react";
import { ListMusic, Code2, Flame, Clock, ArrowRight, Play, Plus, Sparkles } from "lucide-react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import AppShell, { SidebarTrigger } from "../components/layout/AppShell";
import Loader from "../components/common/Loader";
import CreatePlaylistModal from "../components/modals/CreatePlaylistModal";
import useImportPlaylist from "../hooks/useImportPlaylist";
import formatTime from "../utils/formatTime";
import Heatmap from "../components/playlist/Heatmap";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Cutout from "../components/web/Cutout";
import HeroWeb from "../components/web/HeroWeb";
import StrandDivider from "../components/web/StrandDivider";
import AnimatedStatNumber from "../components/web/AnimatedStatNumber";

export default function Dashboard() {
  const { user, setStreak } = useAuth();
  const { isWeb } = useTheme();
  const [dashboardData, setDashboardData] = useState(null);
  const [streakData, setStreakData] = useState(null);
  const [continueData, setContinueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [dashboardRes, streakRes, continueRes] = await Promise.allSettled([
        api.get("/dashboard"),
        api.get("/streak"),
        api.get("/dashboard/continue"),
      ]);

      if (dashboardRes.status === "fulfilled") {
        setDashboardData(dashboardRes.value.data);
      } else {
        throw new Error("Core dashboard data rejected");
      }

      if (streakRes.status === "fulfilled") {
        setStreakData(streakRes.value.data);
        if (typeof streakRes.value.data?.currentStreak === "number") {
          setStreak?.(streakRes.value.data.currentStreak);
        }
      }

      if (
        continueRes.status === "fulfilled" &&
        continueRes.value.data?.video &&
        continueRes.value.data?.playlist
      ) {
        setContinueData(continueRes.value.data);
      } else {
        setContinueData(null);
      }

      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const {
    importing,
    showModal,
    openModal,
    closeModal: closeImportModal,
    handleImport,
  } = useImportPlaylist(
    useCallback(() => fetchData(), [fetchData]),
    "/youtube",
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const totalMinutes = useMemo(() => {
    return streakData?.totalMinutesStudied || 0;
  }, [streakData]);

  const totalProblemsSolved = useMemo(() => {
    return streakData?.totalProblemsSolved || 0;
  }, [streakData]);

  const stats = useMemo(() => {
    const totalPlaylists = dashboardData?.stats?.totalPlaylists ?? 0;
    const completedVideos = dashboardData?.stats?.completedVideos ?? 0;

    return [
      {
        title: "Current Streak",
        value: `${streakData?.currentStreak ?? 0} days`,
        sub: `Best: ${streakData?.longestStreak ?? 0}d`,
        icon: Flame,
        color: isWeb
          ? "text-[var(--crimson-hover)]"
          : (streakData?.currentStreak ?? 0) > 0
          ? "text-orange-400"
          : "text-neutral-500",
        bg: isWeb
          ? "bg-[var(--surface-hover)] border-[var(--crimson)]/40"
          : (streakData?.currentStreak ?? 0) > 0
          ? "bg-orange-500/10 border-orange-500/20"
          : "bg-neutral-900 border-neutral-800",
      },
      {
        title: "Problems Solved",
        value: totalProblemsSolved,
        sub: "DSA & Coding",
        icon: Code2,
        color: isWeb ? "text-[var(--crimson-hover)]" : "text-red-400",
        bg: isWeb
          ? "bg-[var(--surface-hover)] border-[var(--crimson)]/40"
          : "bg-red-500/10 border-red-500/20",
      },
      {
        title: "Study Time",
        value:
          totalMinutes >= 60
            ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
            : `${totalMinutes}m`,
        sub: `${completedVideos} videos completed`,
        icon: Clock,
        color: isWeb ? "text-[var(--bone)]" : "text-neutral-300",
        bg: isWeb
          ? "bg-[var(--surface-hover)] border-[var(--border-subtle)]"
          : "bg-neutral-900 border-neutral-800",
      },
      {
        title: "Playlists Tracked",
        value: totalPlaylists,
        sub: "Ad - free Video",
        icon: ListMusic,
        color: isWeb ? "text-[var(--crimson-hover)]" : "text-red-400",
        bg: isWeb
          ? "bg-[var(--surface-hover)] border-[var(--crimson)]/40"
          : "bg-red-500/10 border-red-500/20",
      },
    ];
  }, [dashboardData, streakData, totalProblemsSolved, totalMinutes, isWeb]);

  if (loading) {
    return (
      <Loader
        text="Loading Dashboard..."
        subtitle="Preparing your learning insights."
        fullscreen
      />
    );
  }

  if (error) {
    return (
      <AppShell title="Dashboard" showBack={false}>
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-neutral-100 mb-2">
            Failed to load dashboard
          </h2>
          <p className="text-xs text-neutral-400 max-w-sm mb-6">
            We couldn't connect to the StudyBuddy API server. Please check your network or try again.
          </p>
          <button
            type="button"
            onClick={fetchData}
            className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition cursor-pointer border border-neutral-700"
          >
            Try Again
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Dashboard" showBack={false}>
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-12 space-y-6">
        {/* Dynamic Welcome Header */}
        <section className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <div className="space-y-0.5">
              <p
                className={`text-xs sm:text-sm font-medium tracking-wide ${
                  isWeb
                    ? "font-mono uppercase tracking-[0.08em] text-[var(--bone-muted,#b9a29b)]"
                    : "text-neutral-400"
                }`}
              >
                {greeting},
              </p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">
              {isWeb ? (
                <span className="text-[var(--crimson-hover)] font-semibold">
                  {user?.name || "Developer"}
                </span>
              ) : (
                <span className="italic bg-gradient-to-r from-red-400 via-rose-300 to-amber-300 bg-clip-text text-transparent inline-block animate-name-glow">
                  {user?.name || "Developer"}
                </span>
              )}
            </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isWeb ? (
              <Cutout
                variant="btn"
                as="button"
                onClick={() => navigate("/prephub")}
                innerClassName="px-4 py-2.5 bg-[var(--surface-card)] hover:bg-[var(--surface-hover)] text-xs sm:text-sm font-medium text-[var(--bone)] flex items-center gap-2 cursor-pointer group"
                title="Explore Roadmaps"
              >
                <Play className="w-3.5 h-3.5 text-[var(--crimson-hover)] fill-[var(--crimson-hover)]/30" />
                <span>Start Learning</span>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--bone-muted)] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </Cutout>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/prephub")}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 text-xs sm:text-sm font-medium text-slate-800 dark:text-neutral-200 transition flex items-center gap-2 cursor-pointer shadow-xs group"
                title="Explore Roadmaps"
              >
                <Play className="w-3.5 h-3.5 text-red-500 fill-red-500/30" />
                <span>Start Learning</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </button>
            )}
          </div>
        </section>

        {/* Divider */}
        <StrandDivider className="my-1" />

        {/* 4 Stat Cards with Alternating Chamfer Rhythm (Card 1 TR, Card 2 BL, Card 3 TR, Card 4 BL) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            // Stat Card Rhythm: card 1 cuts TR, card 2 cuts BL, card 3 cuts TR, card 4 cuts BL
            const cutVariant = idx % 2 === 0 ? "card-tr" : "card-bl";

            if (isWeb) {
              return (
                <Cutout
                  key={stat.title}
                  variant={cutVariant}
                  className="w-full"
                  innerClassName="p-6 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--bone-muted)] truncate">
                      {stat.title}
                    </p>
                    <div className="mt-1">
                      <AnimatedStatNumber value={stat.value} />
                    </div>
                    <p className="text-[10px] font-mono text-[var(--bone-muted)]/80 mt-1 truncate">
                      {stat.sub}
                    </p>
                  </div>
                  <div
                    className={`w-10 h-10 border flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}
                    style={{
                      clipPath:
                        "polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </Cutout>
              );
            }

            return (
              <div
                key={stat.title}
                className="bg-white dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 p-4 rounded-xl shadow-xs dark:shadow-none backdrop-blur-sm flex items-center justify-between"
              >
                <div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
                    {stat.title}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold mt-0.5 text-slate-900 dark:text-neutral-100">
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-neutral-500 mt-0.5">
                    {stat.sub}
                  </p>
                </div>
                <div
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </section>

        {/* Heatmap + Continue Learning */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Heatmap heatmap={streakData?.heatmap || {}} />

          {isWeb ? (
            <Cutout
              variant="card"
              className="w-full h-full"
              innerClassName="p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold tracking-[-0.02em] text-[var(--bone)]">
                    Continue Learning
                  </h2>
                  {continueData?.video && (
                    <span className="text-[11px] text-[var(--crimson-hover)] font-mono">
                      {continueData.video.progressPercent || 0}% watched
                    </span>
                  )}
                </div>

                {continueData?.video && continueData?.playlist ? (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div
                      className="w-full sm:w-44 aspect-video overflow-hidden shrink-0 bg-[var(--bg-main)] border border-[var(--border-subtle)]"
                      style={{
                        clipPath:
                          "polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)",
                      }}
                    >
                      <img
                        src={continueData.video.thumbnailUrl}
                        alt={continueData.video.title}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&auto=format&fit=crop&q=60";
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex flex-col justify-between flex-1 min-w-0">
                      <div>
                        <h3 className="text-sm font-medium text-[var(--bone)] line-clamp-1">
                          {continueData.playlist.title}
                        </h3>
                        <p className="text-xs text-[var(--crimson-hover)] mt-1 line-clamp-1">
                          ▶ {continueData.video.title}
                        </p>
                        <p className="text-[11px] text-[var(--bone-muted)] mt-1.5 font-mono">
                          Resume at {formatTime(continueData.video.watchedSeconds)}
                        </p>
                      </div>

                      <div className="mt-3">
                        <div className="h-1.5 bg-[var(--progress-track,var(--surface-hover))] border border-[var(--border-subtle,rgba(241,232,218,0.14))] overflow-hidden mb-3">
                          <div
                            className="h-full bg-[var(--progress-fill,var(--crimson-hover))]"
                            style={{
                              width: `${continueData.video.progressPercent || 0}%`,
                            }}
                          />
                        </div>

                        <Cutout
                          variant="btn"
                          as="button"
                          onClick={() =>
                            navigate(
                              `/playlist/${continueData.playlist._id}/video/${continueData.video._id}?start=${
                                continueData.video.watchedSeconds || 0
                              }`,
                            )
                          }
                          innerClassName="w-full sm:w-auto px-4 py-1.5 bg-[var(--crimson-deep,#6e1d24)] hover:bg-[var(--crimson,#d63a3a)] text-[var(--on-crimson-deep,#f1e8da)] hover:text-[var(--on-accent,#ffffff)] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Resume Video</span>
                        </Cutout>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 flex flex-col sm:flex-row items-center gap-5 sm:gap-6 my-auto">
                    <div className="relative shrink-0">
                      <img
                        src="/assets/learning-illustration.jpg"
                        alt="Start Learning Illustration"
                        className="relative w-40 sm:w-48 h-32 sm:h-36 object-cover border border-[var(--border-strong)] shadow-xl shadow-black/60 transition-transform duration-300 hover:scale-[1.02]"
                        style={{
                          clipPath:
                            "polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)",
                        }}
                      />
                    </div>
                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2 flex-1 min-w-0">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.08em] bg-[var(--surface-hover)] text-[var(--crimson-hover)] border border-[var(--crimson)]/40">
                        <Sparkles className="w-3 h-3 text-[var(--crimson-hover)]" />
                        <span>Ready to Start</span>
                      </span>
                      <h3 className="text-sm font-semibold tracking-[-0.02em] text-[var(--bone)]">
                        No active courses in progress
                      </h3>
                      <p className="text-xs text-[var(--bone-muted)] leading-relaxed line-clamp-2">
                        Import your favorite YouTube playlists to learn with synced notes, bookmarks, and automated progress tracking.
                      </p>
                      <Cutout
                        variant="btn"
                        as="button"
                        onClick={openModal}
                        innerClassName="mt-1 px-4 py-2 bg-[var(--crimson-deep,#6e1d24)] hover:bg-[var(--crimson,#d63a3a)] text-[var(--on-crimson-deep,#f1e8da)] hover:text-[var(--on-accent,#ffffff)] text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Import Playlist or Video</span>
                      </Cutout>
                    </div>
                  </div>
                )}
              </div>
            </Cutout>
          ) : (
            <div className="bg-white dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs dark:shadow-none backdrop-blur-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
                    Continue Learning
                  </h2>
                  {continueData?.video && (
                    <span className="text-[11px] text-red-500 dark:text-red-400 font-mono">
                      {continueData.video.progressPercent || 0}% watched
                    </span>
                  )}
                </div>

                {continueData?.video && continueData?.playlist ? (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-44 aspect-video rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                      <img
                        src={continueData.video.thumbnailUrl}
                        alt={continueData.video.title}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&auto=format&fit=crop&q=60";
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex flex-col justify-between flex-1 min-w-0">
                      <div>
                        <h3 className="text-sm font-medium text-slate-900 dark:text-neutral-200 line-clamp-1">
                          {continueData.playlist.title}
                        </h3>
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1 line-clamp-1">
                          ▶ {continueData.video.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1.5 font-mono">
                          Resume at {formatTime(continueData.video.watchedSeconds)}
                        </p>
                      </div>

                      <div className="mt-3">
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700/50 overflow-hidden mb-3">
                          <div
                            className="h-full bg-gradient-to-r from-[#BA3C3C] to-[#E04D4D] rounded-full"
                            style={{
                              width: `${continueData.video.progressPercent || 0}%`,
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/playlist/${continueData.playlist._id}/video/${continueData.video._id}?start=${
                                continueData.video.watchedSeconds || 0
                              }`,
                            )
                          }
                          className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#BA3C3C] to-[#E04D4D] hover:opacity-90 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Resume Video
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 flex flex-col sm:flex-row items-center gap-5 sm:gap-6 my-auto">
                    <div className="relative shrink-0 group">
                      <div className="absolute -inset-2 bg-gradient-to-tr from-red-500/20 via-purple-500/20 to-transparent rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition duration-500" />
                      <img
                        src="/assets/learning-illustration.jpg"
                        alt="Start Learning Illustration"
                        className="relative w-40 sm:w-48 h-32 sm:h-36 object-cover rounded-xl border border-slate-200 dark:border-neutral-800 shadow-xl shadow-black/10 dark:shadow-black/60 transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2 flex-1 min-w-0">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20">
                        <Sparkles className="w-3 h-3 text-red-500 dark:text-red-400" />
                        <span>Ready to Start</span>
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
                        No active courses in progress
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed line-clamp-2">
                        Import your favorite YouTube playlists to learn with synced notes, bookmarks, and automated progress tracking.
                      </p>
                      <button
                        type="button"
                        onClick={openModal}
                        className="mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-[#BA3C3C] to-[#E04D4D] hover:opacity-90 text-white text-xs font-semibold transition-all duration-200 cursor-pointer shadow-md shadow-red-500/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Import Playlist or Video</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      <CreatePlaylistModal
        isOpen={showModal}
        onClose={closeImportModal}
        onImport={handleImport}
        importing={importing}
      />
    </AppShell>
  );
}
