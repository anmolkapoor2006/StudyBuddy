import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  GraduationCap,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Layers,
  ArrowRight,
  Database,
  Cpu,
  Globe,
  Flame,
  Code2,
  Plus,
  Trash2,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import AppShell, { SidebarTrigger } from "../components/layout/AppShell";
import Loader from "../components/common/Loader";
import { useAuth } from "../context/AuthContext";
import CustomImportModal from "../components/modals/CustomImportModal";

const SUBJECT_ICONS = {
  os: Cpu,
  dbms: Database,
  cn: Globe,
  sql: Database,
  "strivers-a2z": Layers,
  "strivers-180": Layers,
  "neetcode-150": Code2,
  "blind-75": Flame,
  "rk-classroom": GraduationCap,
  "codeforces-ladder": Flame,
};

export default function Prephub() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeGroup, setActiveGroup] = useState("core"); // 'core' | 'dsa' | 'rk'
  const [coreSubjects, setCoreSubjects] = useState([]);
  const [dsaSubjects, setDsaSubjects] = useState([]);
  const [rkSubjects, setRkSubjects] = useState([]);
  const [activeSubjectId, setActiveSubjectId] = useState("");
  const [subjectDetails, setSubjectDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [expandedModuleId, setExpandedModuleId] = useState(null);

  // Current list based on selected group
  const currentList = useMemo(() => {
    if (activeGroup === "core") return coreSubjects;
    if (activeGroup === "dsa") return dsaSubjects;
    if (activeGroup === "rk") return rkSubjects;
    return [];
  }, [activeGroup, coreSubjects, dsaSubjects, rkSubjects]);

  // Horizontal Carousel scroll & side-fade mask state
  const carouselRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [currentList, updateScrollState]);

  const scrollCarousel = (direction) => {
    const el = carouselRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Side fade mask inspired by carousel CSS
  const maskStyle = useMemo(() => {
    if (!canScrollLeft && !canScrollRight) return {};
    if (canScrollLeft && canScrollRight) {
      return {
        maskImage: "linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)",
      };
    }
    if (canScrollRight) {
      return {
        maskImage: "linear-gradient(to right, black calc(100% - 28px), transparent)",
        WebkitMaskImage: "linear-gradient(to right, black calc(100% - 28px), transparent)",
      };
    }
    if (canScrollLeft) {
      return {
        maskImage: "linear-gradient(to right, transparent, black 28px, black)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 28px, black)",
      };
    }
    return {};
  }, [canScrollLeft, canScrollRight]);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const navigate = useNavigate();

  // 1. Fetch subjects overview (both Core CS & DSA roadmaps)
  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        const res = await api.get("/prephub/subjects");
        if (res.data.success) {
          const core = res.data.coreSubjects || [];
          const dsa = res.data.dsaSubjects || [];
          const rk = res.data.rkSubjects || [];
          setCoreSubjects(core);
          setDsaSubjects(dsa);
          setRkSubjects(rk);

          // Default initial subject or query param
          const subjectParam = searchParams.get("subject") || searchParams.get("sheet");
          if (subjectParam) {
            const isDsa = dsa.some((s) => s.id === subjectParam);
            const isCore = core.some((s) => s.id === subjectParam);
            const isRk = rk.some((s) => s.id === subjectParam);
            if (isDsa) {
              setActiveGroup("dsa");
              setActiveSubjectId(subjectParam);
            } else if (isCore) {
              setActiveGroup("core");
              setActiveSubjectId(subjectParam);
            } else if (isRk) {
              setActiveGroup("rk");
              setActiveSubjectId(subjectParam);
            } else {
              setActiveSubjectId(subjectParam);
            }
          } else if (core.length > 0) {
            setActiveGroup("core");
            setActiveSubjectId(core[0].id);
          } else if (dsa.length > 0) {
            setActiveGroup("dsa");
            setActiveSubjectId(dsa[0].id);
          } else if (rk.length > 0) {
            setActiveGroup("rk");
            setActiveSubjectId(rk[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load prephub subjects:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, [searchParams]);

  // 2. Fetch active subject details whenever activeSubjectId changes
  useEffect(() => {
    if (!activeSubjectId) return;

    const fetchDetails = async () => {
      try {
        setDetailsLoading(true);
        const res = await api.get(`/prephub/subject/${activeSubjectId}`);
        if (res.data.success) {
          setSubjectDetails(res.data);
          // Expand first module by default
          if (res.data.modules && res.data.modules.length > 0) {
            setExpandedModuleId(res.data.modules[0].moduleId);
          }
        }
      } catch (err) {
        console.error("Failed to load subject details:", err);
      } finally {
        setDetailsLoading(false);
      }
    };
    fetchDetails();
  }, [activeSubjectId]);

  const currentSubject = useMemo(() => {
    return (
      currentList.find((s) => s.id === activeSubjectId) ||
      coreSubjects.find((s) => s.id === activeSubjectId) ||
      dsaSubjects.find((s) => s.id === activeSubjectId) ||
      rkSubjects.find((s) => s.id === activeSubjectId) ||
      currentList[0]
    );
  }, [currentList, coreSubjects, dsaSubjects, rkSubjects, activeSubjectId]);

  const handleGroupChange = (group) => {
    setActiveGroup(group);
    if (group === "core") {
      setActiveSubjectId(coreSubjects[0]?.id || "");
    } else if (group === "dsa") {
      setActiveSubjectId(dsaSubjects[0]?.id || "strivers-180");
    } else if (group === "rk") {
      setActiveSubjectId(rkSubjects[0]?.id || "rk-classroom");
    }
  };

  const toggleModule = (modId) => {
    setExpandedModuleId((prev) => (prev === modId ? null : modId));
  };


  const handleOpenInStudio = async () => {
    const sheetId = currentSubject?.sheetId || activeSubjectId;
    try {
      await api.post("/practice/enroll", { sheetId });
    } catch {
      // ignore
    }
    navigate(`/practice?sheet=${encodeURIComponent(sheetId)}`);
  };

  const handleUploadSuccess = async (newSheetId) => {
    try {
      const res = await api.get("/prephub/subjects");
      if (res.data.success) {
        const core = res.data.coreSubjects || [];
        const dsa = res.data.dsaSubjects || [];
        const rk = res.data.rkSubjects || [];
        setCoreSubjects(core);
        setDsaSubjects(dsa);
        setRkSubjects(rk);
        if (newSheetId) {
          const all = [...core, ...dsa, ...rk];
          const found = all.find((s) => s.id === newSheetId);
          if (found) {
            setActiveGroup(found.group);
            setActiveSubjectId(newSheetId);
          }
        }
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteCard = async (sheetId) => {
    if (!window.confirm("Are you sure you want to permanently delete this roadmap from Workspace and Practice Studio?")) return;
    try {
      const res = await api.delete(`/practice/custom-sheet/${sheetId}`);
      if (res.data.success) {
        toast.success("Roadmap deleted successfully");
        const overviewRes = await api.get("/prephub/subjects");
        if (overviewRes.data.success) {
          const core = overviewRes.data.coreSubjects || [];
          const dsa = overviewRes.data.dsaSubjects || [];
          const rk = overviewRes.data.rkSubjects || [];
          setCoreSubjects(core);
          setDsaSubjects(dsa);
          setRkSubjects(rk);
          const first = activeGroup === "core" ? core[0] : activeGroup === "rk" ? rk[0] : dsa[0];
          setActiveSubjectId(first?.id || "");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete roadmap");
    }
  };

  const handleTopicAction = () => {
    // Topic action handler
  };

  if (loading) {
    return <Loader text="Loading Workspace..." subtitle="Gathering curriculum syllabi." fullscreen />;
  }

  const isPracticeEligible =
    (activeGroup === "dsa" ||
      activeSubjectId === "sql" ||
      Boolean(currentSubject?.sheetId)) &&
    Boolean(subjectDetails?.modules && subjectDetails.modules.length > 0);

  return (
    <AppShell title="Workspace" showBack={false}>
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pb-16 space-y-6">
        {/* Header & Main Navigation Tabs */}
        <section className="pt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <SidebarTrigger />
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-100 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-red-400" />
              Prep Hub
            </h1>
            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-[#BA3C3C] to-[#E04D4D] text-white text-xs font-semibold shadow-md shadow-red-500/20 hover:opacity-95 transition cursor-pointer"
                title={user?.role === "admin" ? "Admin: Upload & publish new roadmap card" : "Import custom roadmap or sheet"}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{user?.role === "admin" ? "Upload Roadmap" : "Import Sheet"}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Top Level Group Tabs: CORE CS and DSA */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#0E0E12] border border-slate-200 dark:border-neutral-800">
              {coreSubjects.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleGroupChange("core")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${activeGroup === "core"
                      ? "bg-gradient-to-r from-[#BA3C3C] to-[#E04D4D] text-white shadow-md shadow-red-500/20"
                      : "text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>CORE CS</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${activeGroup === "core"
                        ? "bg-black/20 text-white"
                        : "bg-slate-200 text-slate-700 dark:bg-neutral-800 dark:text-neutral-400"
                      }`}
                  >
                    {coreSubjects.length}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleGroupChange("dsa")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${activeGroup === "dsa"
                    ? "bg-gradient-to-r from-[#BA3C3C] to-[#E04D4D] text-white shadow-md shadow-red-500/20"
                    : "text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>DSA</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${activeGroup === "dsa"
                      ? "bg-black/20 text-white"
                      : "bg-slate-200 text-slate-700 dark:bg-neutral-800 dark:text-neutral-400"
                    }`}
                >
                  {dsaSubjects.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleGroupChange("rk")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${activeGroup === "rk"
                    ? "bg-gradient-to-r from-[#BA3C3C] to-[#E04D4D] text-white shadow-md shadow-red-500/20"
                    : "text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>SPECIAL TRACKS</span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full ${activeGroup === "rk"
                      ? "bg-black/25 text-white border border-white/10"
                      : "bg-slate-200/90 dark:bg-neutral-900/80 border border-slate-300 dark:border-neutral-800 text-slate-600 dark:text-neutral-400"
                    }`}
                >
                  <span>{rkSubjects.length}</span>
                </span>
              </button>
            </div>

            {/* Carousel Navigation Arrows (visible when cards overflow horizontally) */}
            {(canScrollLeft || canScrollRight) && (
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => scrollCarousel("left")}
                  disabled={!canScrollLeft}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-[#13101C] border border-slate-200 dark:border-[#262135] text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white hover:border-red-500/40 flex items-center justify-center transition disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                  title="Scroll Left"
                  aria-label="Previous roadmaps"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarousel("right")}
                  disabled={!canScrollRight}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-[#13101C] border border-slate-200 dark:border-[#262135] text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white hover:border-red-500/40 flex items-center justify-center transition disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                  title="Scroll Right"
                  aria-label="Next roadmaps"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Selected Group Subject Cards (Interactive Carousel / Responsive Grid) */}
        <section
          ref={carouselRef}
          style={maskStyle}
          className={`flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory py-1.5 px-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            currentList.length <= 4
              ? currentList.length === 4
                ? "lg:grid lg:grid-cols-4 lg:overflow-visible lg:[mask-image:none]"
                : currentList.length === 3
                ? "lg:grid lg:grid-cols-3 lg:overflow-visible lg:[mask-image:none]"
                : "lg:grid lg:grid-cols-2 lg:overflow-visible lg:[mask-image:none]"
              : ""
          }`}
        >
          {currentList.map((sub) => {
            const isActive = activeSubjectId === sub.id;
            const Icon = SUBJECT_ICONS[sub.id] || (sub.group === "rk" ? GraduationCap : sub.group === "core" ? Cpu : Code2);

            return (
              <div
                key={sub.id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveSubjectId(sub.id)}
                onKeyDown={(e) => e.key === "Enter" && setActiveSubjectId(sub.id)}
                className={`relative overflow-hidden p-5 rounded-2xl cursor-pointer select-none transition-all duration-200 group flex flex-col justify-between shrink-0 snap-start ${
                  currentList.length <= 4 ? "w-[260px] sm:w-[275px] lg:w-auto" : "w-[260px] sm:w-[275px]"
                } ${
                  isActive
                    ? "bg-gradient-to-b from-red-50 via-rose-50/40 to-white dark:from-[#181324] dark:via-[#120F1D] dark:to-[#0B0912] border border-red-300 dark:border-red-500/70 shadow-[0_0_20px_rgba(224,77,77,0.12),0_8px_24px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_0_20px_rgba(224,77,77,0.18),0_8px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]"
                    : "bg-white dark:bg-gradient-to-b dark:from-[#13101C]/80 dark:via-[#0E0C16]/85 dark:to-[#08070D]/90 border border-slate-200 dark:border-[#262135]/80 shadow-xs dark:shadow-[0_4px_16px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.02)] hover:border-slate-300 dark:hover:border-neutral-700/80 hover:shadow-md dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                }`}
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3.5">
                    {/* Icon Container */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                        isActive
                          ? "bg-red-500/15 border border-red-500/35 text-red-500 dark:text-red-400"
                          : "bg-slate-100 dark:bg-[#14111E] border border-slate-200 dark:border-[#282236] text-slate-500 dark:text-neutral-400 group-hover:text-red-500 group-hover:border-red-400/40"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Topic Count Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span
                        className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full transition-colors ${
                          isActive
                            ? "bg-red-500/15 text-red-600 dark:text-red-300 border border-red-500/30 font-semibold"
                            : "bg-slate-100 dark:bg-[#120F1A] text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-[#241F32] group-hover:border-slate-300 group-hover:text-slate-800 dark:group-hover:border-neutral-700 dark:group-hover:text-neutral-300"
                        }`}
                      >
                        {sub.topicsCount} topics
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-neutral-100 group-hover:text-red-600 dark:group-hover:text-white transition-colors truncate">
                    {sub.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-neutral-400 group-hover:text-slate-800 dark:group-hover:text-neutral-300 transition-colors mt-1.5 line-clamp-2 leading-relaxed min-h-[36px]">
                    {sub.description}
                  </p>
                </div>

                <div className="relative z-10 mt-4 pt-3 border-t border-slate-200 dark:border-[#211D2D]/80 flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-slate-500 dark:text-neutral-400 group-hover:text-slate-700 dark:group-hover:text-neutral-300 transition-colors flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 group-hover:text-red-500 dark:group-hover:text-red-400/80 transition-colors" />
                    {sub.modulesCount} modules
                  </span>
                  {isActive ? (
                    <span className="text-red-500 dark:text-red-400 font-semibold text-[11px] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/25">
                      Active
                    </span>
                  ) : (
                    <span className="text-slate-500 group-hover:text-red-600 dark:text-neutral-400 dark:group-hover:text-red-400 font-medium text-[11px] flex items-center gap-1 transition-colors">
                      Explore →
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Detailed Syllabus Explorer */}
        <section className="bg-white dark:bg-gradient-to-b dark:from-[#14111E]/85 dark:via-[#0F0D17]/90 dark:to-[#0A0910]/95 border border-slate-200 dark:border-[#282238]/80 rounded-2xl p-6 backdrop-blur-md shadow-xs dark:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.03)] space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#231F33]/80 pb-3">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 dark:text-neutral-100">
                  {subjectDetails?.title || currentSubject?.title || "Syllabus Details"}
                </h2>
                {currentSubject?.lastSyncedAt && (
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    <span>Synced {new Date(currentSubject.lastSyncedAt).toLocaleDateString()}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                {activeGroup === "core"
                  ? "Comprehensive curriculum extracted directly from core computer science university & interview syllabi."
                  : activeGroup === "dsa"
                  ? "Curated problem roadmap mapped with solution approaches, complexities, and code templates."
                  : "Curated special tracks, study materials, and structured topic roadmaps."}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-neutral-400 font-mono">
              <span>Total: {subjectDetails?.totalModules || 0} Modules, {subjectDetails?.totalItems || 0} Lessons</span>
              {user?.role === "admin" && !["os", "dbms", "cn", "sql", "strivers-180", "codeforces-ladder", "rk-classroom"].includes(activeSubjectId) && (
                <button
                  type="button"
                  onClick={() => handleDeleteCard(activeSubjectId)}
                  className="px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:hover:bg-red-900/60 border border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-white transition cursor-pointer flex items-center gap-1 font-sans text-xs"
                  title="Admin: Delete this roadmap"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Studio Practice Callout */}
          {isPracticeEligible && (
            <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-50 via-rose-50/50 to-orange-50/30 dark:from-red-950/40 dark:via-[#171324] dark:to-[#120F1C] border border-red-200 dark:border-red-500/35 shadow-xs dark:shadow-[0_0_24px_rgba(224,77,77,0.12)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative z-10">
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500 dark:text-red-400 shrink-0">
                    <Code2 className="w-4 h-4" />
                  </span>
                  Practice {currentSubject?.title} in the Interactive Studio
                </p>
                <p className="text-xs text-slate-600 dark:text-neutral-400 mt-1 pl-9">
                  Enroll this roadmap into your Practice Studio to explore 3-tier solutions, practice with 1-click judge forwarding, and track mastery.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenInStudio}
                className="relative z-10 px-4 py-2 rounded-xl bg-gradient-to-r from-[#BA3C3C] to-[#E04D4D] hover:opacity-95 text-white text-xs font-semibold transition flex items-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-red-500/25 self-start sm:self-auto"
              >
                <span>Add & Open in Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {detailsLoading ? (
            <div className="py-16 text-center text-xs text-neutral-500">
              Loading syllabus topics...
            </div>
          ) : subjectDetails?.modules && subjectDetails.modules.length > 0 ? (
            <div className="space-y-2.5">
              {subjectDetails.modules.map((mod, idx) => {
                const isExpanded = expandedModuleId === mod.moduleId;
                const itemsCount = mod.items ? mod.items.length : 0;

                return (
                  <div
                    key={mod.moduleId || idx}
                    className="border border-slate-200 dark:border-[#262035]/80 rounded-xl overflow-hidden bg-slate-50/70 dark:bg-[#110E1A]/60 hover:border-slate-300 dark:hover:border-[#352D4A] transition-all duration-200"
                  >
                    {/* Module Header Toggle */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleModule(mod.moduleId)}
                      onKeyDown={(e) => e.key === "Enter" && toggleModule(mod.moduleId)}
                      className="px-4 py-3 flex items-center justify-between hover:bg-slate-100/70 dark:hover:bg-neutral-800/40 transition cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-neutral-900 dark:text-neutral-300 border border-slate-300 dark:border-neutral-800 flex items-center gap-1.5">

                          Module {idx + 1}
                        </span>
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-neutral-200">
                          {mod.moduleTitle}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3 text-slate-500 dark:text-neutral-400 text-xs">

                        <span className="text-[11px] font-mono">{itemsCount} topics</span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-red-500 dark:text-red-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-neutral-400" />
                        )}
                      </div>
                    </div>

                    {/* Topics Sub-list */}
                    {isExpanded && (
                      <div className="px-4 pb-3 pt-1 border-t border-slate-200 dark:border-neutral-800/60 divide-y divide-slate-100 dark:divide-neutral-800/40">
                        {mod.items && mod.items.length > 0 ? (
                          mod.items.map((item) => {
                            const judgeUrl = item.platformUrl || item.leetcodeUrl;
                            const judgeName = item.platform || (judgeUrl?.includes("codeforces.com") ? "Codeforces" : "LeetCode");

                            return (
                              <div
                                key={item.id}
                                className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-100/60 dark:hover:bg-neutral-800/30 px-2 rounded-lg transition gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                  <span className="text-slate-800 dark:text-neutral-200 font-medium truncate">
                                    {item.title}
                                  </span>
                                  {item.leetcodeDifficulty && (
                                    <span
                                      className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full border shrink-0 ${item.leetcodeDifficulty === "Easy"
                                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                          : item.leetcodeDifficulty === "Hard"
                                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                                        }`}
                                    >
                                      {item.leetcodeDifficulty}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                  {/* Official Judge Link */}
                                  {judgeUrl && (
                                    <a
                                      href={judgeUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={handleTopicAction}
                                      className="text-slate-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 transition flex items-center gap-1 text-[11px]"
                                      title={`Open problem on ${judgeName}`}
                                    >
                                      
                                      <span>{judgeName}</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}

                                  {/* TUF Link (e.g. for SQL 75) */}
                                  {item.tufHref && (
                                    <a
                                      href={item.tufHref}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={handleTopicAction}
                                      className="text-slate-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 transition flex items-center gap-1 text-[11px]"
                                      title="Open on TUF"
                                    >
                                      
                                      <span>TUF</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}

                                  {/* Curated Lessons (rendered when our own lessonUrl is populated) */}
                                  {item.lessonUrl && (
                                    <a
                                      href={item.lessonUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={handleTopicAction}
                                      className="text-slate-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 transition flex items-center gap-1 text-[11px]"
                                      title="View lesson"
                                    >
                                      
                                      <span>View Lesson</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="py-2 text-xs text-slate-400 dark:text-neutral-500">
                            No topics listed for this module.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 px-6 text-center rounded-xl border border-dashed border-slate-300 dark:border-neutral-800 bg-slate-50/70 dark:bg-[#0E0C16]/50">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 mx-auto flex items-center justify-center mb-3">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-neutral-200">
                {activeGroup === "rk" ? "Special Tracks & Courses" : "No Content Available"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                {activeGroup === "rk"
                  ? "Playlists, custom lectures, and learning roadmaps published by developer/admin will be displayed here."
                  : "No syllabus topics found for this selection."}
              </p>
            </div>
          )}
        </section>

        {/* Upload / Import Roadmap Modal */}
        <CustomImportModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={handleUploadSuccess}
          isAdmin={user?.role === "admin"}
        />
      </div>
    </AppShell>
  );
}
