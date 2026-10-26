import { useEffect, useMemo, useRef, useState } from "react";
import {
  Code2,
  Terminal,
  Play,
  Flame,
  CheckCircle2,
  ArrowRight,
  Zap,
  BookOpen,
  ShieldCheck,
  Compass,
  Heart,
  ChevronDown,
  HelpCircle,
  Sun,
  Moon,
  Download,
  Sparkles,
  RefreshCw,
  Lock,
  Check,
  Copy,
  Puzzle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import Loader from "../components/common/Loader";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import AnimatedBackground from "../components/background/AnimatedBackground";
import Logo from "../components/common/Logo";

function TypewriterText({ text = "", speed = 55, delay = 300, className = "", cursor = true, quote = false }) {
  const [displayed, setDisplayed] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const safeText = text || "";
    let index = 0;
    setDisplayed("");
    setIsTyping(true);

    let intervalId = null;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        index++;
        setDisplayed(safeText.slice(0, index));
        if (index >= safeText.length) {
          clearInterval(intervalId);
          setIsTyping(false);
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, speed, delay, isVisible]);

  return (
    <span ref={containerRef} className={`relative inline ${className}`} aria-label={text}>
      {!isVisible ? (
        <span className="opacity-0 select-none pointer-events-none" aria-hidden="true">
          {quote ? `“${text}”` : text}
        </span>
      ) : (
        <>
          {quote && "“"}
          {displayed}
          {isTyping && cursor && (
            <span className="inline-block w-[2px] h-[0.9em] bg-[#E04D4D] ml-0.5 align-middle animate-[cursorBlink_0.75s_step-start_infinite]" />
          )}
          {quote && "”"}
        </>
      )}
    </span>
  );
}

function AnimatedCodeBlock({ lines = [], activeTab = "optimal" }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) return;
    setVisibleCount(0);
    setIsTyping(true);
    let current = 0;
    const interval = setInterval(() => {
      current++;
      setVisibleCount(current);
      if (current >= lines.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 85);

    return () => clearInterval(interval);
  }, [activeTab, isInView, lines.length]);

  return (
    <div
      ref={containerRef}
      className="text-neutral-300 space-y-1 font-mono text-[11px] sm:text-xs overflow-x-auto leading-relaxed min-h-[290px]"
    >
      {!isInView ? (
        <div className="opacity-0 select-none pointer-events-none" aria-hidden="true">
          {lines.map((line, idx) => (
            <div key={idx} style={{ paddingLeft: `${line.indent * 0.25}rem` }}>
              {line.content}
            </div>
          ))}
        </div>
      ) : (
        <>
          {lines.slice(0, visibleCount).map((line, idx) => {
            const isCurrentLine = isTyping && idx === visibleCount - 1;
            return (
              <div
                key={idx}
                className="flex items-center animate-[codeWriteReveal_0.38s_cubic-bezier(0.16,1,0.3,1)_both]"
                style={{ paddingLeft: `${line.indent * 0.25}rem` }}
              >
                <span>{line.content}</span>
                {isCurrentLine && (
                  <span className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-1.5 align-middle animate-[cursorBlink_0.5s_step-start_infinite] shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                )}
              </div>
            );
          })}
          {!isTyping && visibleCount >= lines.length && (
            <div className="flex items-center pl-0 pt-0.5 opacity-60">
              <span className="inline-block w-1.5 h-3.5 bg-neutral-400 ml-1 animate-[cursorBlink_1s_step-start_infinite]" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { isWeb, isDark, toggleTheme, toggleSkin } = useTheme();
  const [activeTab, setActiveTab] = useState("optimal");
  const [loaderMounted, setLoaderMounted] = useState(true);
  const [loaderVisible, setLoaderVisible] = useState(true);

  useEffect(() => {
    // Stage 1: Hold overlay briefly, then start smooth 500ms fade out
    const fadeTimer = setTimeout(() => {
      setLoaderVisible(false);
    }, 320);

    // Stage 2: Cleanly unmount overlay after CSS opacity transition completes (320ms + 500ms = 820ms)
    const unmountTimer = setTimeout(() => {
      setLoaderMounted(false);
    }, 850);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  const CODE_SNIPPETS = useMemo(
    () => ({
      optimal: [
        { indent: 0, content: <><span className="text-purple-400">class</span> <span className="text-amber-300">Solution</span> &#123;</> },
        { indent: 4, content: <><span className="text-purple-400">public</span> List&lt;List&lt;Integer&gt;&gt; <span className="text-blue-400">threeSum</span>(<span className="text-purple-400">int</span>[] nums) &#123;</> },
        { indent: 8, content: <span className="text-neutral-500">// 1. Sort to enable two pointers and skip duplicates</span> },
        { indent: 8, content: <>Arrays.<span className="text-blue-400">sort</span>(nums);</> },
        { indent: 8, content: <>List&lt;List&lt;Integer&gt;&gt; res = <span className="text-purple-400">new</span> ArrayList&lt;&gt;();</> },
        { indent: 8, content: <><span className="text-purple-400">for</span> (<span className="text-purple-400">int</span> i = 0; i &lt; nums.length - 2; i++) &#123;</> },
        { indent: 12, content: <><span className="text-purple-400">if</span> (i &gt; 0 &amp;&amp; nums[i] == nums[i - 1]) <span className="text-purple-400">continue</span>;</> },
        { indent: 12, content: <><span className="text-purple-400">int</span> left = i + 1, right = nums.length - 1;</> },
        { indent: 12, content: <span className="text-neutral-500">// Two pointers converge in O(N)</span> },
        { indent: 8, content: <>&#125;</> },
        { indent: 8, content: <><span className="text-purple-400">return</span> res;</> },
        { indent: 4, content: <>&#125;</> },
        { indent: 0, content: <>&#125;</> },
      ],
      better: [
        { indent: 0, content: <><span className="text-purple-400">class</span> <span className="text-amber-300">Solution</span> &#123;</> },
        { indent: 4, content: <><span className="text-purple-400">public</span> List&lt;List&lt;Integer&gt;&gt; <span className="text-blue-400">threeSum</span>(<span className="text-purple-400">int</span>[] nums) &#123;</> },
        { indent: 8, content: <span className="text-neutral-500">// Use HashSet to reduce 3rd loop to O(1) lookup</span> },
        { indent: 8, content: <>Set&lt;List&lt;Integer&gt;&gt; st = <span className="text-purple-400">new</span> HashSet&lt;&gt;();</> },
        { indent: 8, content: <><span className="text-purple-400">for</span> (<span className="text-purple-400">int</span> i = 0; i &lt; nums.length; i++) &#123;</> },
        { indent: 12, content: <>Set&lt;Integer&gt; hashset = <span className="text-purple-400">new</span> HashSet&lt;&gt;();</> },
        { indent: 12, content: <><span className="text-purple-400">for</span> (<span className="text-purple-400">int</span> j = i + 1; j &lt; nums.length; j++) &#123;</> },
        { indent: 16, content: <><span className="text-purple-400">int</span> third = -(nums[i] + nums[j]);</> },
        { indent: 16, content: <><span className="text-purple-400">if</span> (hashset.<span className="text-blue-400">contains</span>(third)) st.<span className="text-blue-400">add</span>(triplet);</> },
        { indent: 16, content: <>hashset.<span className="text-blue-400">add</span>(nums[j]);</> },
        { indent: 12, content: <>&#125;</> },
        { indent: 8, content: <>&#125;</> },
        { indent: 8, content: <><span className="text-purple-400">return</span> <span className="text-purple-400">new</span> ArrayList&lt;&gt;(st);</> },
        { indent: 4, content: <>&#125;</> },
        { indent: 0, content: <>&#125;</> },
      ],
      brute: [
        { indent: 0, content: <><span className="text-purple-400">class</span> <span className="text-amber-300">Solution</span> &#123;</> },
        { indent: 4, content: <><span className="text-purple-400">public</span> List&lt;List&lt;Integer&gt;&gt; <span className="text-blue-400">threeSum</span>(<span className="text-purple-400">int</span>[] nums) &#123;</> },
        { indent: 8, content: <span className="text-neutral-500">// 3 nested loops checking every combination O(N³)</span> },
        { indent: 8, content: <>Set&lt;List&lt;Integer&gt;&gt; st = <span className="text-purple-400">new</span> HashSet&lt;&gt;();</> },
        { indent: 8, content: <><span className="text-purple-400">for</span> (<span className="text-purple-400">int</span> i = 0; i &lt; nums.length; i++) &#123;</> },
        { indent: 12, content: <><span className="text-purple-400">for</span> (<span className="text-purple-400">int</span> j = i + 1; j &lt; nums.length; j++) &#123;</> },
        { indent: 16, content: <><span className="text-purple-400">for</span> (<span className="text-purple-400">int</span> k = j + 1; k &lt; nums.length; k++) &#123;</> },
        { indent: 20, content: <><span className="text-purple-400">if</span> (nums[i] + nums[j] + nums[k] == 0) &#123;</> },
        { indent: 24, content: <>st.<span className="text-blue-400">add</span>(Arrays.<span className="text-blue-400">asList</span>(nums[i], nums[j], nums[k]));</> },
        { indent: 20, content: <>&#125;</> },
        { indent: 16, content: <>&#125;</> },
        { indent: 12, content: <>&#125;</> },
        { indent: 8, content: <>&#125;</> },
        { indent: 8, content: <><span className="text-purple-400">return</span> <span className="text-purple-400">new</span> ArrayList&lt;&gt;(st);</> },
        { indent: 4, content: <>&#125;</> },
        { indent: 0, content: <>&#125;</> },
      ],
    }),
    []
  );

  const [battleState, setBattleState] = useState({
    p1Hp: 100,
    p2Hp: 100,
    p1Recoil: false,
    p2Recoil: false,
    critText: "VS",
  });

  const fireP1 = () => {
    setBattleState((prev) => ({
      ...prev,
      p2Hp: prev.p2Hp <= 15 ? 100 : prev.p2Hp - 15,
      p1Recoil: true,
      critText: prev.p2Hp <= 15 ? "💥 KO! RESET" : "-15 HP!",
    }));
    setTimeout(() => {
      setBattleState((prev) => ({ ...prev, p1Recoil: false, critText: "VS" }));
    }, 700);
  };

  const fireP2 = () => {
    setBattleState((prev) => ({
      ...prev,
      p1Hp: prev.p1Hp <= 15 ? 100 : prev.p1Hp - 15,
      p2Recoil: true,
      critText: prev.p1Hp <= 15 ? "💥 KO! RESET" : "CRIT -15!",
    }));
    setTimeout(() => {
      setBattleState((prev) => ({ ...prev, p2Recoil: false, critText: "VS" }));
    }, 700);
  };

  const [activeFeature, setActiveFeature] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const [extensionTab, setExtensionTab] = useState("hud");
  const [isGuideExpanded, setIsGuideExpanded] = useState(false);
  const [copiedExtensionUrl, setCopiedExtensionUrl] = useState(false);



  const EXTENSION_FEATURES = useMemo(
    () => [
      {
        icon: Zap,
        title: "Multi-Platform Live Sync",
        desc: "Auto-detects Accepted verdicts across LeetCode, Codeforces, and GeeksforGeeks with an ambient in-page HUD.",
        tag: "Real-Time",
        badgeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-300",
      },
      {
        icon: RefreshCw,
        title: "Dual-Platform Bulk Sync",
        desc: "1-click historical import for all past LeetCode problems and Codeforces rating ladder submissions (800–1600+).",
        tag: "1-Click Bulk",
        badgeBg: "bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-300",
      },
      {
        icon: Sparkles,
        title: "1-Click Auto-Detect & Vault",
        desc: "Instant session discovery from your active tab with write-only token protection and Manifest V3 speed.",
        tag: "Zero Config",
        badgeBg: "bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-300",
      },
    ],
    []
  );

  const handleCopyExtensionUrl = () => {
    navigator.clipboard.writeText("chrome://extensions");
    setCopiedExtensionUrl(true);
    toast.success("Copied chrome://extensions to clipboard! 📋");
    setTimeout(() => setCopiedExtensionUrl(false), 2000);
  };

  const handleDownloadExtension = () => {
    if (!import.meta.env.VITE_CHROME_EXTENSION_URL) {
      toast.success("StudyBuddy extension package downloaded! 🚀");
    }
  };

  const CORE_FEATURES = useMemo(
    () => [
      {
        id: "practice",
        num: "01",
        title: "Practice & Solution Studio",
        desc: "15,600+ problems across LeetCode & Codeforces with 3-tier solutions & judge forwarder.",
        billuTip: "4,179+ LeetCode problems with Brute, Better, Optimal code + 11,400+ Codeforces catalog!",
        path: "/practice",
        icon: Terminal,
        badgeText: "Solution Studio",
        color: "emerald",
        numColor: "text-emerald-600 dark:text-emerald-400",
        iconStyle:
          "bg-emerald-100/80 border-emerald-200 text-emerald-600 shadow-xs dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400 dark:shadow-[0_0_12px_rgba(16,185,129,0.25)]",
        activeRow:
          "bg-emerald-50/90 border-emerald-300 shadow-[0_4px_24px_rgba(16,185,129,0.15)] dark:border-emerald-500/50 dark:bg-gradient-to-r dark:from-emerald-950/50 dark:via-neutral-900/95 dark:to-neutral-900/80 dark:shadow-[0_4px_30px_rgba(16,185,129,0.2)]",
        defaultRow:
          "bg-white/90 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 shadow-xs dark:border-emerald-500/20 dark:bg-gradient-to-r dark:from-emerald-950/20 dark:via-neutral-950/70 dark:to-neutral-950/50 dark:hover:border-emerald-500/45 dark:hover:bg-neutral-900/80",
        activeArrow:
          "bg-gradient-to-r from-emerald-500 to-teal-500 border-emerald-400/50 text-[#ffffff] shadow-[0_0_18px_rgba(16,185,129,0.35)] dark:shadow-[0_0_18px_rgba(16,185,129,0.5)]",
        defaultArrow:
          "bg-slate-100 border-slate-200 text-slate-500 group-hover:bg-emerald-500 group-hover:text-[#ffffff] group-hover:border-emerald-400 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:group-hover:bg-emerald-500 dark:group-hover:text-[#ffffff] dark:group-hover:border-emerald-400 dark:group-hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]",
        billuGlow: "from-emerald-500/20 via-teal-500/20 to-emerald-500/10",
        bubbleBorder:
          "border-emerald-200 shadow-[0_8px_20px_rgba(16,185,129,0.12)] dark:border-emerald-500/40 dark:shadow-[0_10px_30px_rgba(16,185,129,0.2)]",
      },
      {
        id: "roadmaps",
        num: "02",
        title: "Custom Targeted Roadmaps",
        desc: "Personalized study paths, Striver 79, Blind 75, and NeetCode 150 at your pace.",
        billuTip: "Pick your dream company roadmap, and I'll keep your algorithmic milestones locked in!",
        path: "/prephub",
        icon: Compass,
        badgeText: "Curated Roadmaps",
        color: "amber",
        numColor: "text-amber-600 dark:text-amber-400",
        iconStyle:
          "bg-amber-100/80 border-amber-200 text-amber-600 shadow-xs dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-400 dark:shadow-[0_0_12px_rgba(245,158,11,0.25)]",
        activeRow:
          "bg-amber-50/90 border-amber-300 shadow-[0_4px_24px_rgba(245,158,11,0.15)] dark:border-amber-500/50 dark:bg-gradient-to-r dark:from-amber-950/50 dark:via-neutral-900/95 dark:to-neutral-900/80 dark:shadow-[0_4px_30px_rgba(245,158,11,0.2)]",
        defaultRow:
          "bg-white/90 border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 shadow-xs dark:border-amber-500/20 dark:bg-gradient-to-r dark:from-amber-950/20 dark:via-neutral-950/70 dark:to-neutral-950/50 dark:hover:border-amber-500/45 dark:hover:bg-neutral-900/80",
        activeArrow:
          "bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400/50 text-[#ffffff] shadow-[0_0_18px_rgba(245,158,11,0.35)] dark:shadow-[0_0_18px_rgba(245,158,11,0.5)]",
        defaultArrow:
          "bg-slate-100 border-slate-200 text-slate-500 group-hover:bg-amber-500 group-hover:text-[#ffffff] group-hover:border-amber-400 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:group-hover:bg-amber-500 dark:group-hover:text-[#ffffff] dark:group-hover:border-amber-400 dark:group-hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]",
        billuGlow: "from-amber-500/20 via-orange-500/20 to-amber-500/10",
        bubbleBorder:
          "border-amber-200 shadow-[0_8px_20px_rgba(245,158,11,0.12)] dark:border-amber-500/40 dark:shadow-[0_10px_30px_rgba(245,158,11,0.2)]",
      },
      {
        id: "youtube",
        num: "03",
        title: "Ad - free Video",
        desc: "Stream YouTube playlists with zero ads, zero shorts, and time-synced markdown notes.",
        billuTip: "Zero distraction rabbit holes, no sponsored ads — pure lecture focus with synced notes!",
        path: "/youtube",
        icon: Play,
        badgeText: "Ad - free Video",
        color: "red",
        numColor: "text-red-600 dark:text-rose-400",
        iconStyle:
          "bg-red-100/80 border-red-200 text-red-600 shadow-xs dark:bg-red-500/15 dark:border-red-500/30 dark:text-rose-400 dark:shadow-[0_0_12px_rgba(239,68,68,0.25)]",
        activeRow:
          "bg-red-50/90 border-red-300 shadow-[0_4px_24px_rgba(239,68,68,0.15)] dark:border-red-500/50 dark:bg-gradient-to-r dark:from-red-950/50 dark:via-neutral-900/95 dark:to-neutral-900/80 dark:shadow-[0_4px_30px_rgba(239,68,68,0.2)]",
        defaultRow:
          "bg-white/90 border-slate-200 hover:border-red-300 hover:bg-red-50/40 shadow-xs dark:border-red-500/20 dark:bg-gradient-to-r dark:from-red-950/20 dark:via-neutral-950/70 dark:to-neutral-950/50 dark:hover:border-red-500/45 dark:hover:bg-neutral-900/80",
        activeArrow:
          "bg-gradient-to-r from-[#BA3C3C] to-[#E04D4D] border-red-400/50 text-[#ffffff] shadow-[0_0_18px_rgba(224,77,77,0.35)] dark:shadow-[0_0_18px_rgba(224,77,77,0.5)]",
        defaultArrow:
          "bg-slate-100 border-slate-200 text-slate-500 group-hover:bg-[#E04D4D] group-hover:text-[#ffffff] group-hover:border-red-400 group-hover:shadow-[0_0_15px_rgba(224,77,77,0.3)] dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:group-hover:bg-[#E04D4D] dark:group-hover:text-[#ffffff] dark:group-hover:border-red-400 dark:group-hover:shadow-[0_0_15px_rgba(224,77,77,0.4)]",
        billuGlow: "from-red-500/20 via-rose-500/20 to-red-500/10",
        bubbleBorder:
          "border-red-200 shadow-[0_8px_20px_rgba(224,77,77,0.12)] dark:border-red-500/40 dark:shadow-[0_10px_30px_rgba(224,77,77,0.2)]",
      },
      {
        id: "dashboard",
        num: "04",
        title: "Momentum & Activity Heatmaps",
        desc: "GitHub-style daily activity grid, streak analytics, and interview conquest metrics.",
        billuTip: "Consistency beats intensity! Fill your daily heatmap green and watch your confidence soar.",
        path: "/dashboard",
        icon: Flame,
        badgeText: "Activity Heatmaps",
        color: "purple",
        numColor: "text-purple-600 dark:text-purple-400",
        iconStyle:
          "bg-purple-100/80 border-purple-200 text-purple-600 shadow-xs dark:bg-purple-500/15 dark:border-purple-500/30 dark:text-purple-400 dark:shadow-[0_0_12px_rgba(168,85,247,0.25)]",
        activeRow:
          "bg-purple-50/90 border-purple-300 shadow-[0_4px_24px_rgba(168,85,247,0.15)] dark:border-purple-500/50 dark:bg-gradient-to-r dark:from-purple-950/50 dark:via-neutral-900/95 dark:to-neutral-900/80 dark:shadow-[0_4px_30px_rgba(168,85,247,0.2)]",
        defaultRow:
          "bg-white/90 border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 shadow-xs dark:border-purple-500/20 dark:bg-gradient-to-r dark:from-purple-950/20 dark:via-neutral-950/70 dark:to-neutral-950/50 dark:hover:border-purple-500/45 dark:hover:bg-neutral-900/80",
        activeArrow:
          "bg-gradient-to-r from-purple-600 to-indigo-500 border-purple-400/50 text-[#ffffff] shadow-[0_0_18px_rgba(168,85,247,0.35)] dark:shadow-[0_0_18px_rgba(168,85,247,0.5)]",
        defaultArrow:
          "bg-slate-100 border-slate-200 text-slate-500 group-hover:bg-purple-500 group-hover:text-[#ffffff] group-hover:border-purple-400 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:group-hover:bg-purple-500 dark:group-hover:text-[#ffffff] dark:group-hover:border-purple-400 dark:group-hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]",
        billuGlow: "from-purple-500/20 via-indigo-500/20 to-purple-500/10",
        bubbleBorder:
          "border-purple-200 shadow-[0_8px_20px_rgba(168,85,247,0.12)] dark:border-purple-500/40 dark:shadow-[0_10px_30px_rgba(168,85,247,0.2)]",
      },
    ],
    []
  );


  const FAQS = useMemo(
    () => [
      {
        q: "What is StudyBuddy, what is its use, and who is it built for?",
        category: "Platform Purpose & Safe Harbor",
        badge: "Built For Developers 💻",
        paragraphs: [
          "StudyBuddy is an all-in-one developer learning ecosystem and practice tracker designed to streamline tech interview preparation and software engineering coursework.",
          "It brings together curated DSA sheets, ad-free video course tracking, interactive problem solutions, and activity consistency streaks into one unified workspace.",
        ],
      },
      {
        q: "Where does all the problem, video, and editorial data come from?",
        category: "Data Transparency & Origin",
        badge: "Public Resources & Fair Use",
        paragraphs: [
          "All data on StudyBuddy is explicitly either created and served directly by users for personal study or gathered strictly from publicly accessible educational resources across the open internet.",
          "StudyBuddy does not sell, paywall, or claim proprietary ownership over external problem descriptions, titles, or YouTube educational videos.",
        ],
      },
      {
        q: "Official References: When should I use LeetCode, Codeforces, and takeUforward (TUF)?",
        category: "Official Recommendations",
        badge: "Official Platforms Recommended",
        paragraphs: [
          "For official problem submissions, verified contest ratings, official company tags, and original long-form video tutorials, we strongly recommend supporting official platforms: LeetCode (leetcode.com), Codeforces (codeforces.com), and takeUforward (TUF - takeuforward.org).",
          "StudyBuddy serves as your distraction-free personal study workbench—keeping your 3-tier solutions, 1-click judge forwarder, and ad-free lecture notes organized in one place alongside these platforms.",
        ],
      },
      {
        q: "What are the core features of the StudyBuddy platform?",
        category: "Platform Features",
        badge: "5 All-In-One Pillars",
        paragraphs: [
          "StudyBuddy brings together everything you need to prepare for top-tier software engineering interviews:",
        ],
        features: [
          {
            icon: "⚡",
            title: "Live Problem Sync",
            desc: "Sync accepted solutions directly into your activity heatmaps and roadmaps.",
          },
          {
            icon: "🧩",
            title: "3-Tier Algorithmic Solutions",
            desc: "Every problem broken down into Brute Force, Better, and Optimal code with exact Big-O complexities.",
          },
          {
            icon: "📺",
            title: "100% Ad - free Video",
            desc: "Stream YouTube playlists with zero ads, zero shorts, and live time-synced markdown study notes.",
          },
          {
            icon: "🗺️",
            title: "Custom Targeted Roadmaps",
            desc: "Follow Striver 79, Blind 75, NeetCode 150, and SDE sheets structured for step-by-step mastery.",
          },
          {
            icon: "🔥",
            title: "Activity Streak Heatmaps",
            desc: "GitHub-style daily activity matrix and conquest metrics to build unbreakable study consistency.",
          },
        ],
      },
      {
        q: "Is StudyBuddy completely free to use?",
        category: "Platform Access",
        badge: "100% Free & Open",
        paragraphs: [
          "Yes! StudyBuddy is 100% free for everyone. All DSA sheets, problem trackers, 3-tier solutions, video note-taking tools, and consistency streaks are fully unlocked for all learners.",
        ],
      },
    ],
    []
  );

  const billuFaqTips = useMemo(
    () => [
      "100% free and open for independent learners and developers worldwide!",
      "Zero paywalls or monetization! All data is strictly for personal study.",
      "For official contests & submissions, always check LeetCode & Codeforces!",
      "15,600+ problems, 3-tier solutions, and Ad - free Video all in one place!",
      "Track your learning daily and build unbreakable consistency streaks!",
    ],
    []
  );

  const SHEETS = useMemo(
    () => [
      {
        name: "Blind 75",
        count: "75 Problems",
        desc: "The classic high-yield roadmap covering all essential patterns.",
        difficulty: "Core Patterns",
        tag: "Essential",
        color: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
      },
      {
        name: "Striver's SDE Sheet",
        count: "180 Problems",
        desc: "Comprehensive interview curriculum from arrays to dynamic programming.",
        difficulty: "Comprehensive",
        tag: "Interview",
        color: "from-red-500/20 to-rose-500/10 border-red-500/30 text-rose-600 dark:text-rose-400",
      },
      {
        name: "Codeforces Ladder",
        count: "269 Problems",
        desc: "Contest rating ladders (800-1600+) with accepted C++ solutions & 1-click judge forwarding.",
        difficulty: "Rating 800–1600+",
        tag: "Contests",
        color: "from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400",
        to: "/prephub?subject=codeforces-ladder",
      },
      {
        name: "SQL 75",
        count: "75 Problems",
        desc: "Crucial SQL queries, window functions, and schema problem solving.",
        difficulty: "Queries & Schema",
        tag: "Database",
        color: "from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-cyan-600 dark:text-cyan-400",
      },
    ],
    [],
  );

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#030005] text-slate-900 dark:text-white overflow-x-hidden font-sans antialiased selection:bg-rose-200 selection:text-rose-900 dark:selection:bg-red-500/30 dark:selection:text-white">
      {/* SMOOTH UI PAGE TRANSITION DISSOLVE OVERLAY */}
      {loaderMounted && (
        <div
          className={`fixed inset-0 z-[100] transition-opacity duration-500 ease-out pointer-events-none ${loaderVisible ? "opacity-100" : "opacity-0"
            }`}
        >
          <Loader
            text="Loading StudyBuddy..."
            subtitle="Preparing your learning workspace."
            fullscreen
          />
        </div>
      )}

      <AnimatedBackground />

      {/* 1. Glassmorphism Top Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-slate-200/90 dark:border-neutral-800/80 bg-white/90 dark:bg-[#030005]/85 backdrop-blur-xl shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group py-0.5">
            <Logo size="md" />
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-neutral-100">
                  StudyBuddy
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-[#E04D4D] border border-red-500/25">
                  2.0
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-medium tracking-wide">
                Code • Study • Track
              </span>
            </div>
          </Link>

          {/* Apple Notch / Dynamic Island Navigation Capsule */}
          <nav className="hidden md:flex items-center p-1 rounded-full bg-slate-100/90 dark:bg-neutral-950/85 border border-slate-200/90 dark:border-neutral-800/90 shadow-xs dark:shadow-[0_4px_24px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
            <Link
              to="/practice"
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-neutral-800/80 rounded-full transition-all flex items-center gap-2 group"
            >
              <Terminal className="w-3.5 h-3.5 text-[#E04D4D] group-hover:scale-110 transition-transform" />
              <span>Practice DSA</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-600 border border-slate-300 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800 group-hover:border-slate-400 dark:group-hover:border-neutral-700">
                15,600+
              </span>
            </Link>

            <span className="w-[1px] h-3.5 bg-slate-300/80 dark:bg-neutral-800/90 my-auto"></span>

            <Link
              to="/youtube"
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-neutral-800/80 rounded-full transition-all flex items-center gap-2 group"
            >
              <Play className="w-3.5 h-3.5 text-red-500 group-hover:scale-110 transition-transform" />
              <span>Ad - free Video</span>
            </Link>

            <span className="w-[1px] h-3.5 bg-slate-300/80 dark:bg-neutral-800/90 my-auto"></span>

            <Link
              to="/prephub"
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-neutral-800/80 rounded-full transition-all flex items-center gap-2 group"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
              <span>Workspace</span>
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Skin Toggle Button */}
            <button
              type="button"
              onClick={toggleSkin}
              aria-label="Toggle visual skin"
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:opacity-80 transition-opacity cursor-pointer flex items-center justify-center"
              title={isWeb ? "Web Skin (Active) — Click to switch to Basic Skin" : "Basic Skin (Active) — Click to switch to Web Skin"}
            >
              <span
                className={`text-sm leading-none select-none transition-all duration-200 inline-block ${isWeb
                    ? "opacity-90 drop-shadow-[0_0_6px_rgba(224,77,77,0.4)] scale-105"
                    : "opacity-40 grayscale hover:opacity-75"
                  }`}
              >
                🕸️
              </span>
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#E04D4D]" />
              )}
            </button>

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-2 bg-gradient-to-r from-[#BA3C3C] to-[#E04D4D] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-[0_2px_15px_rgba(224,77,77,0.3)] hover:brightness-110 active:scale-[0.98] transition-all"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="flex items-center gap-2 bg-gradient-to-r from-[#BA3C3C] to-[#E04D4D] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-[0_2px_15px_rgba(224,77,77,0.3)] hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  <span>Start Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="h-16 w-full shrink-0" aria-hidden="true" />

      {/* 2. Hero Section (Above the Fold) */}
      <section className="relative z-10 w-full flex flex-col items-center text-center max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 pt-4 pb-8 sm:pt-6 sm:pb-10 md:pt-8 md:pb-12">
        <div className="w-full flex flex-col items-center max-w-4xl mx-auto">
          {/* Glow Tag — Underdogs Identity */}
          <div className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 bg-slate-100/90 dark:bg-neutral-900/80 border border-slate-300/80 dark:border-neutral-800 px-3 sm:px-4 py-1.5 rounded-2xl sm:rounded-full text-xs sm:text-sm font-medium tracking-wide text-slate-700 dark:text-neutral-300 mb-3 sm:mb-4 lg:mb-5 backdrop-blur-md shadow-xs dark:shadow-[0_0_20px_rgba(0,0,0,0.5)] animate-[fadeInUp_0.6s_ease-out_both] max-w-full">
            <span className="text-sm sm:text-base select-none">🥊</span>
            <span className="whitespace-nowrap">100% Free •</span>
            <span className="font-bold bg-gradient-to-r from-[#F26464] via-[#E04D4D] to-orange-400 bg-clip-text text-transparent text-center">
              Built for underdogs defying the odds
            </span>
            <span className="text-slate-400 dark:text-neutral-600 hidden sm:inline">•</span>
            <span className="text-[11px] text-amber-700 dark:text-amber-300/90 font-mono hidden sm:inline">Curated DSA & CS Roadmaps</span>
          </div>

          {/* Hero Title — Centered Structure with Fluid Vertical Scale */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[46px] font-extrabold tracking-tight max-w-5xl leading-[1.18] sm:leading-[1.15] text-slate-900 dark:text-white mb-2.5 sm:mb-3.5 lg:mb-4 animate-[fadeInUp_0.7s_ease-out_both] [animation-delay:100ms]">
            <span className="block lg:whitespace-nowrap">Master Algorithms. Conquer Courses.</span>
            <span className="block mt-0.5 sm:mt-1 lg:whitespace-nowrap">
              <span className="text-slate-800 dark:text-neutral-100">Stream YouTube. </span>
              <span className="bg-gradient-to-r from-[#F26464] via-[#E04D4D] to-[#BA3C3C] bg-clip-text text-transparent">
                <TypewriterText text="Zero Distractions." speed={75} delay={600} />
              </span>
            </span>
          </h1>

          {/* Hero Subtitle */}
          <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-neutral-400 max-w-2xl mx-auto font-normal leading-relaxed mb-3.5 sm:mb-5 lg:mb-6 animate-[fadeInUp_0.7s_ease-out_both] [animation-delay:180ms]">
            <span className="text-[#E04D4D] font-semibold">15,600+ coding challenges</span> across LeetCode & Codeforces. 4,179+ curated 3-tier solutions (Brute, Better, Optimal), 1-click judge forwarder, ad-free YouTube playlist tracker, and daily coding heatmaps.
          </p>

          {/* Platform Metrics Dock (Sleek Horizontal Capsule) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full max-w-3xl mx-auto p-1.5 sm:p-2.5 rounded-2xl bg-white/90 dark:bg-neutral-950/80 border border-slate-200/90 dark:border-neutral-800/90 backdrop-blur-2xl shadow-md dark:shadow-[0_4px_30px_rgba(0,0,0,0.6)] mb-3.5 sm:mb-5 lg:mb-7 animate-[fadeInUp_0.7s_ease-out_both] [animation-delay:260ms]">
            <div className="flex flex-col items-center py-1.5 sm:py-2.5 px-2.5 sm:px-3 border-r border-slate-200/90 dark:border-neutral-800/60 hover:bg-slate-100/70 dark:hover:bg-neutral-900/60 rounded-xl transition-all duration-200 cursor-default">
              <span className="text-base sm:text-lg md:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">15,600+</span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-neutral-400 font-medium">Practice Catalog</span>
            </div>
            <div className="flex flex-col items-center py-1.5 sm:py-2.5 px-2.5 sm:px-3 border-r border-slate-200/90 dark:border-neutral-800/60 hover:bg-slate-100/70 dark:hover:bg-neutral-900/60 rounded-xl transition-all duration-200 cursor-default">
              <span className="text-base sm:text-lg md:text-xl font-extrabold text-[#E04D4D] tracking-tight">4,179+</span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-neutral-400 font-medium">3-Tier Solutions</span>
            </div>
            <div className="flex flex-col items-center py-1.5 sm:py-2.5 px-2.5 sm:px-3 border-r border-slate-200/90 dark:border-neutral-800/60 hover:bg-slate-100/70 dark:hover:bg-neutral-900/60 rounded-xl transition-all duration-200 cursor-default">
              <span className="text-base sm:text-lg md:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">100%</span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-neutral-400 font-medium">Ad - free Video</span>
            </div>
            <div className="flex flex-col items-center py-1.5 sm:py-2.5 px-2.5 sm:px-3 hover:bg-slate-100/70 dark:hover:bg-neutral-900/60 rounded-xl transition-all duration-200 cursor-default text-center">
              <span className="text-base sm:text-lg md:text-xl font-extrabold text-amber-500 dark:text-amber-400 tracking-tight">1-Click</span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-neutral-400 font-medium">Judge Forwarder</span>
            </div>
          </div>

          {/* CTA Button Group */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-3.5 w-full sm:w-auto animate-[fadeInUp_0.7s_ease-out_both] [animation-delay:340ms]">
            <Link
              to={isAuthenticated ? "/practice" : "/signup"}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-[#BA3C3C] to-[#E04D4D] border border-red-400/20 px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-[0_4px_25px_rgba(224,77,77,0.35)] hover:shadow-[0_4px_35px_rgba(224,77,77,0.5)] hover:brightness-110 active:scale-[0.98] transition-all duration-300"
            >
              <Code2 className="w-4 h-4" />
              <span>Start Practicing Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              to="/youtube"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-900/90 dark:hover:bg-neutral-800/90 border border-slate-300 hover:border-slate-400 dark:border-neutral-800 dark:hover:border-neutral-700 px-6 sm:px-7 py-2.5 sm:py-3.5 rounded-xl font-semibold text-xs sm:text-sm text-slate-800 dark:text-neutral-200 transition-all active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
              <span>Explore Ad - free Video</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Arcade Section Break — 3D Robot Bug Battle */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 select-none">

        {/* Main Arena Battleground */}
        <div className="relative rounded-2xl border border-neutral-800/80 bg-[#0c0914]/80 backdrop-blur-xl p-4 sm:p-6 shadow-[0_15px_50px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Subtle Cyber Grid Background Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1a2e10_1px,transparent_1px),linear-gradient(to_bottom,#1f1a2e10_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

          <div className="relative flex items-center justify-between gap-2 sm:gap-4">
            {/* Player 1: 3D Red Robot Bug */}
            <div
              onClick={fireP1}
              className={`group flex items-center gap-3 cursor-pointer select-none transition-transform duration-200 ${battleState.p1Recoil ? "animate-[recoilLeft_0.4s_ease-out]" : "animate-[bugBobLeft_2.5s_ease-in-out_infinite]"
                }`}
              title="Click to fire Syntax Buster!"
            >
              <div className="relative flex items-center justify-center">
                {/* Aura Glow */}
                <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl group-hover:bg-red-500/35 transition-all" />
                {/* Syntax Bot Avatar */}
                <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-red-500/20 via-neutral-900 to-red-950/40 border border-red-500/40 flex items-center justify-center drop-shadow-[0_10px_20px_rgba(239,68,68,0.5)] group-hover:scale-105 active:scale-95 transition-transform">
                  <Code2 className="w-7 h-7 sm:w-10 sm:h-10 text-red-400" />
                </div>
                {/* Muzzle Flash Blast on Right */}
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gradient-to-r from-red-400 via-amber-300 to-white blur-[2px] animate-[muzzleFlash_0.7s_ease-in-out_infinite] pointer-events-none" />
              </div>

              {/* Bot 1 HUD */}
              <div className="hidden sm:flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono font-extrabold tracking-wider text-red-400">P1: SYNTAX_BOT</span>
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-mono bg-red-500/20 text-red-300 border border-red-500/30">Lv.99</span>
                </div>
                {/* Health Bar */}
                <div className="w-24 h-1.5 rounded-full bg-neutral-900 border border-neutral-800 overflow-hidden mt-1 relative">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-amber-400 transition-all duration-300 shadow-[0_0_8px_#ef4444]"
                    style={{ width: `${battleState.p1Hp}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-neutral-400 mt-0.5">HP {battleState.p1Hp}/100</span>
              </div>
            </div>

            {/* Central Laser Firing Rail & Clash Nexus */}
            <div className="relative flex-1 mx-2 sm:mx-6 h-12 flex items-center">
              {/* Outer Rail Line */}
              <div className="w-full h-[3px] rounded-full bg-gradient-to-r from-red-500/80 via-neutral-800 to-cyan-500/80 relative shadow-[0_0_12px_rgba(239,68,68,0.3)]">
                {/* Laser Bullets Left -> Right (Red/Amber Salvo) */}
                <div
                  className="absolute top-1/2 w-6 sm:w-8 h-2 rounded-full bg-gradient-to-r from-red-600 via-amber-400 to-white shadow-[0_0_14px_#ef4444,0_0_24px_#f97316] pointer-events-none"
                  style={{ animation: "fireBulletRight 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite 0s" }}
                />
                <div
                  className="absolute top-1/2 w-5 sm:w-6 h-1.5 rounded-full bg-gradient-to-r from-red-500 to-amber-200 shadow-[0_0_10px_#ef4444] pointer-events-none"
                  style={{ animation: "fireBulletRight 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.5s" }}
                />
                <div
                  className="absolute top-1/2 w-4 sm:w-5 h-1.5 rounded-full bg-red-400 shadow-[0_0_8px_#ef4444] pointer-events-none"
                  style={{ animation: "fireBulletRight 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite 1.0s" }}
                />

                {/* Laser Bullets Right -> Left (Cyan/Blue Salvo) */}
                <div
                  className="absolute top-1/2 w-6 sm:w-8 h-2 rounded-full bg-gradient-to-l from-blue-600 via-cyan-400 to-white shadow-[0_0_14px_#22d3ee,0_0_24px_#06b6d4] pointer-events-none"
                  style={{ animation: "fireBulletLeft 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.25s" }}
                />
                <div
                  className="absolute top-1/2 w-5 sm:w-6 h-1.5 rounded-full bg-gradient-to-l from-cyan-500 to-blue-200 shadow-[0_0_10px_#22d3ee] pointer-events-none"
                  style={{ animation: "fireBulletLeft 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.75s" }}
                />
                <div
                  className="absolute top-1/2 w-4 sm:w-5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#22d3ee] pointer-events-none"
                  style={{ animation: "fireBulletLeft 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite 1.25s" }}
                />

                {/* Central Clash Nexus & Shockwave */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                  {/* Expanding Shockwave Ping */}
                  <span className="absolute w-8 h-8 rounded-full border border-amber-400/80 animate-ping pointer-events-none" />
                  {/* Arcade Center Badge */}
                  <div className="relative px-2.5 py-1 rounded-lg bg-neutral-950/95 border border-amber-500/50 flex items-center gap-1.5 text-[10px] font-mono font-extrabold text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.5)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="tracking-wider">{battleState.critText}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Player 2: 3D Cyan Robot Bot */}
            <div
              onClick={fireP2}
              className={`group flex items-center gap-3 cursor-pointer select-none transition-transform duration-200 ${battleState.p2Recoil ? "animate-[recoilRight_0.4s_ease-out]" : "animate-[bugBobRight_2.7s_ease-in-out_infinite]"
                }`}
              title="Click to fire Runtime Shield!"
            >
              {/* Bot 2 HUD */}
              <div className="hidden sm:flex flex-col text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Lv.99</span>
                  <span className="text-[11px] font-mono font-extrabold tracking-wider text-cyan-400">P2: RUNTIME_BOT</span>
                </div>
                {/* Health Bar */}
                <div className="w-24 h-1.5 rounded-full bg-neutral-900 border border-neutral-800 overflow-hidden mt-1 relative ml-auto">
                  <div
                    className="h-full bg-gradient-to-l from-cyan-500 to-blue-400 transition-all duration-300 shadow-[0_0_8px_#22d3ee]"
                    style={{ width: `${battleState.p2Hp}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-neutral-400 mt-0.5">HP {battleState.p2Hp}/100</span>
              </div>

              <div className="relative flex items-center justify-center">
                {/* Aura Glow */}
                <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl group-hover:bg-cyan-500/35 transition-all" />
                {/* Runtime Bot Avatar */}
                <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-neutral-900 to-cyan-950/40 border border-cyan-500/40 flex items-center justify-center drop-shadow-[0_10px_20px_rgba(34,211,238,0.5)] group-hover:scale-105 active:scale-95 transition-transform">
                  <Terminal className="w-7 h-7 sm:w-10 sm:h-10 text-cyan-400" />
                </div>
                {/* Muzzle Flash Blast on Left */}
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gradient-to-l from-cyan-400 via-blue-300 to-white blur-[2px] animate-[muzzleFlash_0.7s_ease-in-out_infinite] pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* 4. Interactive Split-IDE Live Product Showcase Mockup */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 pt-4 pb-20 text-center flex flex-col items-center">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs uppercase tracking-widest text-[#E04D4D] font-bold">
            Interactive Product Preview
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1.5">
            <TypewriterText text="Test The 3-Tier Algorithmic Studio" speed={55} delay={150} />
          </h3>
          <p className="text-slate-600 dark:text-neutral-400 text-xs sm:text-sm mt-2">
            Switch between Brute, Better, and Optimal tabs to see real-time complexity evolution and code.
          </p>
        </div>

        <div className="relative group w-full max-w-5xl rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white/95 dark:bg-[#0c0a12]/95 shadow-[0_20px_70px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_70px_rgba(0,0,0,0.8)] hover:border-slate-300 dark:hover:border-neutral-700/80 transition-all duration-300 overflow-hidden text-left">
          {/* Subtle Ambient Backlight Glow */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-red-600/10 via-amber-500/5 to-cyan-600/10 blur-xl opacity-60 pointer-events-none group-hover:opacity-100 transition-opacity duration-500" />
          {/* Mockup Window Header */}
          <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-neutral-800/80 bg-slate-50 dark:bg-neutral-950/80">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              <span className="text-xs text-slate-500 dark:text-neutral-400 font-mono ml-2">StudyBuddy Workspace — Problem #15: 3Sum</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold">
                Medium
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                3-Tier Solutions
              </span>
            </div>
          </div>

          {/* Mockup Workspace Body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
            {/* Left Column: Algorithmic Approach Explorer */}
            <div className="lg:col-span-5 p-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-neutral-800/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                    Algorithmic Approaches
                  </span>
                  <span className="text-[11px] text-[#E04D4D] font-mono">3 / 3 Generated</span>
                </div>

                <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-neutral-900 rounded-xl mb-4 border border-slate-200 dark:border-neutral-800">
                  <button
                    onClick={() => setActiveTab("brute")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === "brute"
                        ? "bg-white text-slate-900 shadow-xs dark:bg-neutral-800 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                      }`}
                  >
                    Brute O(N³)
                  </button>
                  <button
                    onClick={() => setActiveTab("better")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === "better"
                        ? "bg-white text-slate-900 shadow-xs dark:bg-neutral-800 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                      }`}
                  >
                    Better O(N²)
                  </button>
                  <button
                    onClick={() => setActiveTab("optimal")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === "optimal"
                        ? "bg-[#BA3C3C] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                      }`}
                  >
                    Optimal O(N²)
                  </button>
                </div>

                {activeTab === "optimal" && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-950/70 border border-slate-200 dark:border-neutral-800/60">
                      <div className="text-xs font-semibold text-slate-800 dark:text-neutral-200 mb-1 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                        Two Pointers with Initial Sorting
                      </div>
                      <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                        Sort array once in <code className="text-slate-800 dark:text-neutral-300 font-mono">O(N log N)</code>. Fix the first element with loop <code className="text-slate-800 dark:text-neutral-300 font-mono">i</code>, then converge two pointers (<code className="text-red-500 dark:text-red-400 font-mono">left</code>, <code className="text-red-500 dark:text-red-400 font-mono">right</code>) in linear time. Skips duplicates in-place without extra sets.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800/60">
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase font-semibold block">Time Complexity</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm">O(N²)</span>
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 block">Dominated by 2-pointers</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800/60">
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase font-semibold block">Auxiliary Space</span>
                        <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold text-sm">O(1)</span>
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 block">No hash sets needed</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "better" && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-950/70 border border-slate-200 dark:border-neutral-800/60">
                      <div className="text-xs font-semibold text-slate-800 dark:text-neutral-200 mb-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        Hash Set Lookup for 3rd Element
                      </div>
                      <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                        Fix <code className="text-slate-800 dark:text-neutral-300 font-mono">nums[i]</code> and <code className="text-slate-800 dark:text-neutral-300 font-mono">nums[j]</code> with two loops. Check if <code className="text-red-500 dark:text-red-400 font-mono">-(nums[i] + nums[j])</code> exists in a hash set of inner loop elements. Uses a set to filter duplicate combinations.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800/60">
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase font-semibold block">Time Complexity</span>
                        <span className="font-mono text-amber-600 dark:text-amber-400 font-bold text-sm">O(N²)</span>
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 block">Amortized hash lookups</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800/60">
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase font-semibold block">Auxiliary Space</span>
                        <span className="font-mono text-amber-600 dark:text-amber-400 font-bold text-sm">O(N + K)</span>
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 block">Hash set + duplicate set</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "brute" && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-950/70 border border-slate-200 dark:border-neutral-800/60">
                      <div className="text-xs font-semibold text-slate-800 dark:text-neutral-200 mb-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                        Three Nested Iterative Loops
                      </div>
                      <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                        Iterate through all possible index triplets <code className="text-slate-800 dark:text-neutral-300 font-mono">(i, j, k)</code> with 3 nested loops. Whenever the sum is zero, sort the triplet and insert into a set to eliminate duplicate combinations.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800/60">
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase font-semibold block">Time Complexity</span>
                        <span className="font-mono text-red-600 dark:text-red-400 font-bold text-sm">O(N³)</span>
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 block">Triple loop traversal</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800/60">
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase font-semibold block">Auxiliary Space</span>
                        <span className="font-mono text-red-600 dark:text-red-400 font-bold text-sm">O(2 × K)</span>
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 block">Unique triplet set storage</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Side Floating Tag: Video Study Sync */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                  <span className="text-slate-700 dark:text-neutral-300 font-medium">Striver's SDE Playlist</span>
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">Progress: 84%</span>
              </div>
            </div>

            {/* Right Column: In-Browser Code & Testcase Runner Mock */}
            <div className="lg:col-span-7 bg-[#05040a] p-5 flex flex-col justify-between font-mono text-xs">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800/80">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-neutral-900 text-neutral-200 border border-neutral-800 font-medium text-[11px]">
                      Solution.java
                    </span>
                    <span className="text-neutral-500 text-[11px]">Java 21 • GCC 14 C++</span>
                  </div>
                  {activeTab === "optimal" && (
                    <span className="text-emerald-400 flex items-center gap-1 text-[11px] animate-[fadeInUp_0.3s_ease-out]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Optimal Solution • O(N²)
                    </span>
                  )}
                  {activeTab === "better" && (
                    <span className="text-amber-400 flex items-center gap-1 text-[11px] animate-[fadeInUp_0.3s_ease-out]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Better Solution • O(N²)
                    </span>
                  )}
                  {activeTab === "brute" && (
                    <span className="text-red-400 flex items-center gap-1 text-[11px] animate-[fadeInUp_0.3s_ease-out]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Brute Force • O(N³)
                    </span>
                  )}
                </div>

                <AnimatedCodeBlock
                  lines={CODE_SNIPPETS[activeTab] || CODE_SNIPPETS.optimal}
                  activeTab={activeTab}
                />
              </div>

              {/* Console Output Bar */}
              <div className="mt-4 p-3 rounded-xl bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full animate-pulse ${activeTab === "optimal"
                        ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                        : activeTab === "better"
                          ? "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
                          : "bg-red-400 shadow-[0_0_8px_#f87171]"
                      }`}
                  />
                  <span
                    className={`font-semibold text-[11px] ${activeTab === "optimal"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : activeTab === "better"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                  >
                    Output: [ [-1, -1, 2], [-1, 0, 1] ]
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-neutral-400">
                  Runtime:{" "}
                  <span className="text-slate-900 dark:text-white font-bold">
                    {activeTab === "optimal"
                      ? "24 ms"
                      : activeTab === "better"
                        ? "188 ms"
                        : "1,420 ms"}
                  </span>{" "}
                  • Tests:{" "}
                  <span
                    className={
                      activeTab === "optimal"
                        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                        : activeTab === "better"
                          ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                          : "text-amber-600 dark:text-amber-400 font-semibold"
                    }
                  >
                    {activeTab === "brute"
                      ? "312/312 Passed (TLE warning)"
                      : "312/312 Passed"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 50% Centered Red Accent Line Divider */}
      <div className="relative z-10 w-full flex justify-center py-4">
        <div className="w-1/2 max-w-2xl h-[2px] bg-gradient-to-r from-transparent via-[#E04D4D] to-transparent rounded-full shadow-[0_0_12px_rgba(224,77,77,0.45)] animate-[dividerGlow_3.5s_ease-in-out_infinite]" />
      </div>

      {/* 5. The 3 Pillars of StudyBuddy */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 pt-10 pb-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs uppercase tracking-widest text-[#E04D4D] font-bold mb-2">
            Built by the serious • For the serious • To be the serious
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            <TypewriterText text="Code, Study, and Track in Harmony." speed={55} delay={150} />
          </h3>
          <p className="text-slate-600 dark:text-neutral-400 text-sm sm:text-base mt-3">
            Stop switching between YouTube tabs, scattered LeetCode bookmarks, and disorganized notes.
          </p>
        </div>

        {/* 2-Column Split: Creative Billu on Left, Headings with Arrows on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Interactive Feature Highlight Card */}
          <div className="lg:col-span-5 flex flex-col items-center text-center relative">
            {/* Feature Tip Bubble */}
            <div
              className={`relative mb-3 px-5 py-3.5 rounded-2xl bg-white/95 dark:bg-neutral-900/95 border backdrop-blur-md max-w-sm transition-all duration-300 ${CORE_FEATURES[activeFeature].bubbleBorder}`}
            >
              <p className="text-xs text-slate-800 dark:text-neutral-200 font-medium leading-relaxed transition-all duration-300">
                "{CORE_FEATURES[activeFeature].billuTip}"
              </p>
              {/* Bubble Arrow Tail */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-neutral-900 border-r border-b border-inherit rotate-45" />
            </div>

            {/* Dynamic Feature Visual Showcase */}
            <div className="relative w-56 h-64 sm:w-64 sm:h-72 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-indigo-50/70 via-slate-100/40 to-transparent dark:from-[#2a0b12]/40 dark:via-[#160509]/30 dark:to-transparent border border-slate-200/70 dark:border-red-950/40 p-6 overflow-hidden">
              {/* Dynamic Aura Glow */}
              <div
                className={`absolute inset-4 rounded-full bg-gradient-to-tr ${CORE_FEATURES[activeFeature].billuGlow} blur-2xl pointer-events-none transition-all duration-500 opacity-60 dark:opacity-100`}
              />

              <div className="relative z-10 flex flex-col items-center justify-center text-center">
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center border transition-all duration-300 mb-3 shadow-lg ${CORE_FEATURES[activeFeature].iconStyle}`}>
                  {(() => {
                    const ActiveIcon = CORE_FEATURES[activeFeature].icon;
                    return <ActiveIcon className="w-8 h-8 sm:w-10 sm:h-10" />;
                  })()}
                </div>
                <h4 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {CORE_FEATURES[activeFeature].title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 max-w-[200px] line-clamp-2">
                  {CORE_FEATURES[activeFeature].desc}
                </p>
              </div>

              {/* Pedestal Shadows */}
              <div className="absolute bottom-2.5 w-40 h-3 rounded-[100%] bg-slate-900/30 dark:bg-black/95 blur-[2px] pointer-events-none" />
              <div className="absolute bottom-1 w-52 h-6 rounded-[100%] bg-slate-900/20 dark:bg-black/70 blur-md pointer-events-none" />
            </div>

            {/* Feature Mode Badge */}
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-white/90 dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800 shadow-xs dark:shadow-none text-[10px] font-mono text-slate-600 dark:text-neutral-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E04D4D] animate-pulse" />
              <span className="font-semibold text-slate-900 dark:text-neutral-200">{CORE_FEATURES[activeFeature].badgeText}</span>
              <span className="text-slate-400 dark:text-neutral-600">•</span>
              <span className="text-[#C23333] dark:text-[#E04D4D] font-bold">Live Preview</span>
            </div>
          </div>

          {/* Right Column: Headings One by One with Arrows */}
          <div className="lg:col-span-7 flex flex-col gap-2.5">
            {CORE_FEATURES.map((feat, idx) => {
              const Icon = feat.icon;
              const isActive = activeFeature === idx;
              return (
                <Link
                  key={feat.id}
                  to={feat.path}
                  onMouseEnter={() => setActiveFeature(idx)}
                  className={`group relative rounded-xl border transition-all duration-300 py-3 px-3.5 sm:py-3.5 sm:px-4 flex items-center justify-between gap-3.5 select-none ${isActive ? feat.activeRow + " translate-x-1" : feat.defaultRow
                    }`}
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    {/* Number & Icon Pill */}
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-lg border flex items-center justify-center transition-all duration-300 ${feat.iconStyle}`}
                    >
                      <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </div>

                    {/* Heading & Micro Detail */}
                    <div className="flex flex-col text-left truncate">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-mono font-bold ${feat.numColor}`}>
                          {feat.num}
                        </span>
                        <h4
                          className={`text-sm sm:text-base font-bold tracking-tight transition-colors ${isActive
                              ? "text-slate-900 dark:text-white"
                              : "text-slate-800 group-hover:text-slate-900 dark:text-neutral-100 dark:group-hover:text-white"
                            }`}
                        >
                          {feat.title}
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-600 dark:text-neutral-400 truncate mt-0.5">
                        {feat.desc}
                      </span>
                    </div>
                  </div>

                  {/* Arrow Action Button */}
                  <div
                    className={`w-8 h-8 sm:w-8.5 sm:h-8.5 shrink-0 rounded-lg border flex items-center justify-center transition-all duration-300 ${isActive ? feat.activeArrow : feat.defaultArrow
                      }`}
                  >
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Curated Interview Sheets Showcase */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <h2 className="text-xs uppercase tracking-widest text-[#E04D4D] font-bold mb-2">Curated Roadmaps</h2>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              <TypewriterText text="The Best Coding Sheets In One Place" speed={55} delay={150} />
            </h3>
          </div>
          <Link
            to="/prephub"
            className="mt-4 md:mt-0 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white flex items-center gap-1.5 transition-colors"
          >
            Explore all sheets in Workspace <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SHEETS.map((sheet) => (
            <Link
              key={sheet.name}
              to={sheet.to || "/practice"}
              className="p-5 sm:p-5.5 rounded-2xl bg-white/90 dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-900/80 hover:-translate-y-1 shadow-xs hover:shadow-lg dark:hover:shadow-[0_12px_30px_rgba(0,0,0,0.6)] transition-all duration-300 group flex flex-col justify-between text-left"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3.5">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border bg-gradient-to-r whitespace-nowrap shrink-0 ${sheet.color}`}>
                    {sheet.tag}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 whitespace-nowrap bg-slate-100 dark:bg-neutral-950/70 border border-slate-200 dark:border-neutral-800/80 px-2 py-0.5 rounded-md shrink-0">
                    {sheet.count}
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#E04D4D] transition-colors mb-2">
                  {sheet.name}
                </h4>
                <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed mb-4">
                  {sheet.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-neutral-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                <span className="font-medium text-[11px] text-slate-500 dark:text-neutral-400">{sheet.difficulty}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 50% Centered Red Accent Line Divider */}
      <div className="relative z-10 w-full flex justify-center py-4">
        <div className="w-1/2 max-w-2xl h-[2px] bg-gradient-to-r from-transparent via-[#E04D4D] to-transparent rounded-full shadow-[0_0_12px_rgba(224,77,77,0.45)] animate-[dividerGlow_3.5s_ease-in-out_infinite]" />
      </div>

      {/* 7. StudyBuddy Companion Extension (Manifest V3) — Real-Time Coding Sync */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 py-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-[#E04D4D] text-xs font-mono font-bold uppercase tracking-wider mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Puzzle className="w-3.5 h-3.5 text-[#E04D4D]" />
            <span>StudyBuddy Companion Extension • Manifest V3</span>
          </div>
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            <TypewriterText text="Zero Friction. Instant Solved Sync." speed={50} delay={150} />
          </h3>
          <p className="text-slate-600 dark:text-neutral-400 text-sm sm:text-base mt-3 max-w-2xl mx-auto leading-relaxed [text-wrap:balance]">
            <strong className="text-slate-900 dark:text-white">“POV: His Helper”</strong> — The official companion extension that watches your LeetCode, Codeforces &amp; GeeksforGeeks progress and syncs it straight into your StudyBuddy roadmaps and daily streak.
          </p>
        </div>

        {/* Interactive Feature Demo Showcase & Billu Celebration Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-14">
          {/* Interactive Screen Preview Container (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Tab Mode Switcher Buttons */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-200/70 dark:bg-neutral-900/80 border border-slate-300/80 dark:border-neutral-800 backdrop-blur-md">
              <button
                onClick={() => setExtensionTab("hud")}
                className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${extensionTab === "hud"
                    ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-neutral-700"
                    : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>In-Page Live HUD</span>
              </button>
              <button
                onClick={() => setExtensionTab("popup")}
                className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${extensionTab === "popup"
                    ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-neutral-700"
                    : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Obsidian Popup</span>
              </button>
              <button
                onClick={() => setExtensionTab("backfill")}
                className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${extensionTab === "backfill"
                    ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-neutral-700"
                    : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                <span>Dual Bulk Sync</span>
              </button>
            </div>

            {/* Mockup Canvas Screen */}
            <div className="relative rounded-2xl bg-[#09080e] border border-slate-800/80 shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-300 min-h-[330px] flex flex-col justify-between">
              {/* Chrome Mockup Window Header */}
              <div className="h-9 bg-[#111018] border-b border-neutral-800 px-3.5 flex items-center justify-between text-xs text-neutral-400 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-2 bg-[#09080e] px-3 py-1 rounded-md border border-neutral-800 text-[11px] font-mono text-neutral-300 truncate max-w-[280px] sm:max-w-[340px]">
                  <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    {extensionTab === "hud"
                      ? "https://leetcode.com/problems/trapping-rain-water"
                      : extensionTab === "popup"
                        ? "chrome-extension://studybuddy-sync/popup.html"
                        : "https://studybuddy.dev/api/sync/bulk-backfill"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-red-500/20 border border-red-500/40 flex items-center justify-center text-[#E04D4D] text-[10px] font-bold">
                    SB
                  </div>
                </div>
              </div>

              {/* Dynamic Content Based On Selected Tab */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center">
                {extensionTab === "hud" && (
                  <div className="space-y-3.5 animate-[textReveal_0.35s_cubic-bezier(0.16,1,0.3,1)_both]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm sm:text-base">42. Trapping Rain Water</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Hard
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400">LeetCode Judge</span>
                    </div>

                    {/* Verdict Card */}
                    <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-bold text-emerald-400 text-sm block">Accepted</span>
                          <span className="text-[11px] text-neutral-300 font-mono">
                            Runtime: 1 ms (Beats 98.4%) • Memory: 44.8 MB
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                        VERDICT OK
                      </span>
                    </div>

                    {/* StudyBuddy Floating In-Page HUD Badge */}
                    <div className="p-3 rounded-xl bg-gradient-to-r from-[#171324] to-[#0c0914] border border-red-500/40 shadow-[0_0_20px_rgba(224,77,77,0.25)] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#BA3C3C] to-[#E04D4D] text-white flex items-center justify-center text-xs font-bold shrink-0">
                          SB
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>StudyBuddy Solved ✓</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Auto-Synced
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-400 block mt-0.5">
                            Ticked in <span className="text-neutral-200 font-medium">Blind 75</span> &amp; <span className="text-neutral-200 font-medium">Striver SDE Sheet</span>
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-mono font-bold text-amber-400 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 fill-amber-400" />
                          <span>14-Day Streak</span>
                        </span>
                        <span className="text-[9px] text-neutral-500 block">+1 Solved Today</span>
                      </div>
                    </div>
                  </div>
                )}

                {extensionTab === "popup" && (
                  <div className="space-y-3 animate-[textReveal_0.35s_cubic-bezier(0.16,1,0.3,1)_both]">
                    {/* Popup Monogram & User Header */}
                    <div className="p-3 rounded-xl bg-[#14101e] border border-neutral-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E04D4D] to-orange-500 flex items-center justify-center text-white font-bold text-xs shadow-[0_0_12px_rgba(224,77,77,0.4)]">
                          AK
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">Anmol Kapoor</span>
                          <span className="text-[10px] text-neutral-400 font-mono">anmol@studybuddy.dev</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Connected
                      </span>
                    </div>

                    {/* Vector Stats Strip */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-black/40 border border-neutral-800/80">
                        <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-bold">
                          <Flame className="w-3.5 h-3.5 fill-amber-400" />
                          <span>14</span>
                        </div>
                        <span className="text-[9px] uppercase font-mono text-neutral-400 tracking-wider">Day Streak</span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/40 border border-neutral-800/80">
                        <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>5</span>
                        </div>
                        <span className="text-[9px] uppercase font-mono text-neutral-400 tracking-wider">Today Solved</span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/40 border border-neutral-800/80">
                        <div className="flex items-center justify-center gap-1 text-red-400 text-xs font-bold">
                          <Code2 className="w-3.5 h-3.5" />
                          <span>342</span>
                        </div>
                        <span className="text-[9px] uppercase font-mono text-neutral-400 tracking-wider">Total Solved</span>
                      </div>
                    </div>

                    {/* Platform Selector & 1-Click Action */}
                    <div className="p-2 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">LeetCode</span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold">Codeforces</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Auto-Detect Active
                      </span>
                    </div>
                  </div>
                )}

                {extensionTab === "backfill" && (
                  <div className="space-y-3 animate-[textReveal_0.35s_cubic-bezier(0.16,1,0.3,1)_both]">
                    <div className="p-3 rounded-xl bg-[#130f1c] border border-amber-500/30 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-400 flex items-center gap-1.5">
                          <span>🟡</span> LeetCode Session Bulk Backfill
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">350 / 350 Solved</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 w-full" />
                      </div>
                      <span className="text-[10px] text-neutral-400 block">
                        Auto-mapped to Blind 75, NeetCode 150 &amp; Striver 79 sheets.
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#10121d] border border-blue-500/30 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-blue-400 flex items-center gap-1.5">
                          <span>🔵</span> Codeforces Rating Ladder Import
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">269 / 269 Solved</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 w-full" />
                      </div>
                      <span className="text-[10px] text-neutral-400 block">
                        Direct sync via official Codeforces API (Rating 800–1600+).
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Notification Bar */}
              <div className="h-8 bg-[#0e0c15] border-t border-neutral-800/80 px-4 flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Sync Engine v1.2.0 • Real-Time DOM &amp; API Observer</span>
                </span>
                <span className="text-[10px] font-mono text-neutral-400">0.4ms Latency</span>
              </div>
            </div>
          </div>

          {/* Billu Mascot Celebrating on Right Stand (5 cols) */}
          {/* Right Column: Live Sync Status Monitor Card */}
          <div className="lg:col-span-5 flex flex-col items-center text-center relative">
            {/* Status Tip Bubble */}
            <div className="relative mb-3 px-5 py-3.5 rounded-2xl bg-white/95 dark:bg-neutral-900/95 border border-red-500/30 dark:border-red-500/40 backdrop-blur-md max-w-sm transition-all duration-300 shadow-[0_8px_20px_rgba(224,77,77,0.15)]">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-[#E04D4D] text-[10px] font-mono font-bold mb-1.5">
                <Sparkles className="w-3 h-3" />
                <span>Live Sync Active</span>
              </div>
              <p className="text-xs text-slate-800 dark:text-neutral-200 font-medium leading-relaxed">
                "Accepted solutions on LeetCode & Codeforces sync immediately into your streak and roadmaps."
              </p>
              {/* Bubble Arrow Tail */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-neutral-900 border-r border-b border-inherit rotate-45" />
            </div>

            {/* Live Sync Monitor Display */}
            <div className="relative w-56 h-64 sm:w-64 sm:h-72 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-red-50/70 via-slate-100/40 to-transparent dark:from-[#2e0910]/40 dark:via-[#180408]/30 dark:to-transparent border border-slate-200/70 dark:border-red-950/40 p-6 overflow-hidden">
              {/* Dynamic Aura Glow */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-red-500/20 via-orange-500/20 to-red-500/10 blur-2xl pointer-events-none opacity-70 dark:opacity-100" />

              <div className="relative z-10 flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-neutral-900 to-emerald-950/30 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Auto-Mark Solved</h4>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">Real-time judge synchronization</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>SYNCHRONIZED</span>
                </div>
              </div>

              {/* Ambient Pedestal Shadows */}
              <div className="absolute bottom-2.5 w-40 h-3 rounded-[100%] bg-slate-900/30 dark:bg-black/95 blur-[2px] pointer-events-none" />
              <div className="absolute bottom-1 w-52 h-6 rounded-[100%] bg-slate-900/20 dark:bg-black/70 blur-md pointer-events-none" />
            </div>

            {/* Sub-label Badge */}
            <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-white/90 dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800 shadow-xs text-[10px] font-mono text-slate-600 dark:text-neutral-400">
              <span className="text-emerald-500 font-bold">● Active Observer</span>
              <span className="text-slate-300 dark:text-neutral-700">•</span>
              <span>LeetCode • Codeforces • GFG</span>
            </div>
          </div>
        </div>

        {/* Compact 3-Pillar Feature Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 mb-8">
          {EXTENSION_FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="p-4 sm:p-4.5 rounded-xl bg-white/80 dark:bg-neutral-900/40 border border-slate-200/90 dark:border-neutral-800/80 hover:border-red-400/50 dark:hover:border-red-500/40 hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-[0_8px_25px_rgba(0,0,0,0.5)] transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700/60 flex items-center justify-center text-[#E04D4D] group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${feat.badgeBg}`}>
                      {feat.tag}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#E04D4D] transition-colors mb-1">
                    {feat.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Centered Installation Guide Trigger & Collapsible Drawer */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setIsGuideExpanded(!isGuideExpanded)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 hover:border-red-400/50 dark:hover:border-red-500/40 text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white text-xs font-mono font-medium shadow-xs hover:shadow-sm transition-all cursor-pointer group"
            aria-expanded={isGuideExpanded}
          >
            <span>🛠️</span>
            <span className="font-bold uppercase tracking-wider text-[11px]">Installation Guide</span>
            <span className="text-slate-300 dark:text-neutral-700">•</span>
            <span className="text-[11px] text-slate-500 dark:text-neutral-400">30-Sec Setup</span>
            <div
              className={`w-5 h-5 rounded-md bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-500 dark:text-neutral-400 group-hover:text-slate-900 dark:group-hover:text-white transition-transform duration-300 ml-1 ${isGuideExpanded ? "rotate-180 bg-red-500/10 text-[#E04D4D] dark:text-[#E04D4D]" : ""
                }`}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Expanded Guide Content */}
          {isGuideExpanded && (
            <div className="w-full mt-4 p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-neutral-900/30 border border-slate-200/90 dark:border-neutral-800/80 animate-[textReveal_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-neutral-800/80 text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                <span>Chrome • Brave • Edge • Arc (Manifest V3)</span>
                <span className="text-emerald-500 font-medium">Unpacked Developer Mode</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Step 1 */}
                <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-neutral-950/40 border border-slate-200/70 dark:border-neutral-800/60 flex flex-col justify-between gap-2.5">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-1">
                      <span className="w-4.5 h-4.5 rounded-md bg-red-500/15 text-[#E04D4D] flex items-center justify-center font-mono text-[10px]">1</span>
                      <span>Download &amp; Extract</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-relaxed">
                      Get the companion package and unzip it into any local folder.
                    </p>
                  </div>
                  <a
                    href={import.meta.env.VITE_CHROME_EXTENSION_URL || "/studybuddy-extension.zip"}
                    target={import.meta.env.VITE_CHROME_EXTENSION_URL ? "_blank" : undefined}
                    rel={import.meta.env.VITE_CHROME_EXTENSION_URL ? "noreferrer" : undefined}
                    download={import.meta.env.VITE_CHROME_EXTENSION_URL ? undefined : "studybuddy-extension.zip"}
                    onClick={handleDownloadExtension}
                    className="w-fit px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-[#E04D4D] border border-red-500/25 text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download .zip</span>
                  </a>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-neutral-950/40 border border-slate-200/70 dark:border-neutral-800/60 flex flex-col justify-between gap-2.5">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-1">
                      <span className="w-4.5 h-4.5 rounded-md bg-red-500/15 text-[#E04D4D] flex items-center justify-center font-mono text-[10px]">2</span>
                      <span>Enable Developer Mode</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-relaxed">
                      Open extensions page and turn on <strong>Developer mode</strong> in the top-right.
                    </p>
                  </div>
                  <button
                    onClick={handleCopyExtensionUrl}
                    className="w-fit px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-neutral-800 hover:bg-slate-300 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 text-[11px] font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Copy chrome://extensions"
                  >
                    {copiedExtensionUrl ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>chrome://extensions</span>
                  </button>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-neutral-950/40 border border-slate-200/70 dark:border-neutral-800/60 flex flex-col justify-between gap-2.5">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-1">
                      <span className="w-4.5 h-4.5 rounded-md bg-red-500/15 text-[#E04D4D] flex items-center justify-center font-mono text-[10px]">3</span>
                      <span>Load &amp; Auto-Sync</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-relaxed">
                      Click <strong>Load unpacked</strong>, select the folder, and hit <strong>Auto-Detect Token</strong>.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Ready in 1-Click
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 50% Centered Red Accent Line Divider */}
      <div className="relative z-10 w-full flex justify-center py-4">
        <div className="w-1/2 max-w-2xl h-[2px] bg-gradient-to-r from-transparent via-[#E04D4D] to-transparent rounded-full shadow-[0_0_12px_rgba(224,77,77,0.45)] animate-[dividerGlow_3.5s_ease-in-out_infinite]" />
      </div>

      {/* 8. Comprehensive Platform FAQ & Safe Harbor */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 py-16">
        {/* FAQ Header */}
        <div className="relative max-w-4xl mx-auto mb-12 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
          {/* Heading Text */}
          <div className="text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-[#E04D4D] text-xs font-mono font-bold uppercase tracking-wider mb-3">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Platform FAQs & Help</span>
            </div>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              <TypewriterText text="Frequently Asked Questions" speed={60} delay={150} />
            </h3>
            <p className="text-slate-600 dark:text-neutral-400 text-xs sm:text-sm mt-2 max-w-lg leading-relaxed [text-wrap:balance]">
              Clear facts on educational purpose, public resources, and how to get the most out of StudyBuddy.
            </p>
          </div>

          {/* Quick Help Card */}
          <div className="relative shrink-0 flex items-center gap-3 sm:gap-4 p-4 rounded-2xl bg-white/90 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-[#E04D4D]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left max-w-[200px]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#E04D4D] font-bold">
                Quick Tip
              </span>
              <p className="text-xs text-slate-700 dark:text-neutral-300 leading-snug font-medium mt-0.5">
                {openFaq !== null
                  ? billuFaqTips[openFaq]
                  : "Click any question below to see how StudyBuddy works!"}
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Accordion List (Centered & Full Width) */}
        <div className="max-w-4xl mx-auto space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className={`group relative rounded-2xl border transition-all duration-300 overflow-hidden ${isOpen
                    ? "bg-gradient-to-r from-red-50/70 via-rose-50/40 to-red-50/70 dark:from-neutral-900/95 dark:via-red-950/20 dark:to-neutral-900/95 border-red-300/80 dark:border-red-500/50 shadow-md dark:shadow-[0_8px_32px_rgba(224,77,77,0.18)] -translate-y-0.5 animate-[faqCardGlow_4s_ease-in-out_infinite]"
                    : "bg-white/90 dark:bg-neutral-950/60 border-slate-200 dark:border-neutral-800/80 hover:border-slate-300 dark:hover:border-neutral-700 hover:bg-slate-50/80 dark:hover:bg-neutral-900/50 hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-[0_4px_25px_rgba(0,0,0,0.5)]"
                  }`}
              >
                {/* Active Top Accent Line */}
                {isOpen && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent" />
                )}

                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`shrink-0 text-xs font-mono font-bold transition-colors duration-200 ${isOpen ? "text-red-600 dark:text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "text-red-500 dark:text-[#E04D4D] group-hover:text-red-600 dark:group-hover:text-red-400"
                        }`}
                    >
                      0{idx + 1}
                    </span>
                    <span
                      className={`text-sm sm:text-base font-bold tracking-tight transition-colors duration-200 ${isOpen ? "text-slate-900 dark:text-white" : "text-slate-800 dark:text-neutral-100 group-hover:text-red-600 dark:group-hover:text-white"
                        }`}
                    >
                      {faq.q}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 group-hover:border-slate-300 dark:group-hover:border-neutral-700 transition-colors">
                      {faq.badge}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all duration-300 ${isOpen
                          ? "rotate-180 bg-red-100 dark:bg-red-500/15 border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                          : "border-slate-200 dark:border-neutral-800 text-slate-400 dark:text-neutral-500 group-hover:text-slate-700 dark:group-hover:text-neutral-300 group-hover:border-slate-300 dark:group-hover:border-neutral-700"
                        }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-3.5 border-t border-slate-200/80 dark:border-neutral-800/60 text-xs sm:text-sm text-slate-600 dark:text-neutral-300 leading-relaxed space-y-3">
                    {faq.paragraphs &&
                      faq.paragraphs.map((para, pIdx) => (
                        <p
                          key={pIdx}
                          className="leading-relaxed animate-[textReveal_0.45s_cubic-bezier(0.16,1,0.3,1)_both]"
                          style={{ animationDelay: `${pIdx * 80}ms` }}
                        >
                          {para}
                        </p>
                      ))}

                    {faq.features && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5">
                        {faq.features.map((feat, fIdx) => (
                          <div
                            key={fIdx}
                            className="p-3 rounded-xl bg-white/95 dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800/80 hover:border-red-400/50 hover:bg-slate-50 dark:hover:bg-neutral-900/70 hover:scale-[1.01] flex items-start gap-3 transition-all duration-200 shadow-xs dark:shadow-none animate-[textReveal_0.45s_cubic-bezier(0.16,1,0.3,1)_both]"
                            style={{ animationDelay: `${(fIdx + 1) * 75}ms` }}
                          >
                            <span className="text-lg select-none shrink-0">{feat.icon}</span>
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white text-xs block">
                                {feat.title}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-neutral-400 leading-tight block mt-0.5">
                                {feat.desc}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Official Reference Notice & Safe Harbor Card */}
        <div className="max-w-4xl mx-auto mt-8 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-neutral-800/80 bg-white/80 dark:bg-neutral-950/70 hover:border-slate-300 dark:hover:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-900/40 hover:-translate-y-0.5 shadow-xs hover:shadow-md dark:shadow-none dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-300 flex items-center gap-4 text-xs text-slate-600 dark:text-neutral-400 group">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 group-hover:scale-105 group-hover:border-amber-500/40 transition-all flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="font-semibold text-slate-800 dark:text-neutral-200 block text-xs">
              Official Competitive Programming Platforms
            </span>
            <span className="text-[11px] text-slate-500 dark:text-neutral-400 leading-relaxed block mt-0.5">
              For official problem submissions, contest ratings, and original editorial analysis, please visit and support{" "}
              <a href="https://leetcode.com" target="_blank" rel="noopener noreferrer" className="text-amber-500 dark:text-amber-400 hover:underline font-medium">LeetCode</a>,{" "}
              <a href="https://codeforces.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline font-medium">Codeforces</a>,{" "}
              and{" "}
              <a href="https://takeuforward.org" target="_blank" rel="noopener noreferrer" className="text-red-500 dark:text-red-400 hover:underline font-medium">takeUforward (TUF / Striver)</a>.
            </span>
          </div>
        </div>
      </section>

      {/* 50% Centered Red Accent Line Divider */}
      <div className="relative z-10 w-full flex justify-center py-6">
        <div className="w-1/2 max-w-2xl h-[2px] bg-gradient-to-r from-transparent via-[#E04D4D] to-transparent rounded-full shadow-[0_0_12px_rgba(224,77,77,0.45)] animate-[dividerGlow_3.5s_ease-in-out_infinite]" />
      </div>

      {/* 8. Footer */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-neutral-900/60 bg-slate-100/90 dark:bg-[#030005] pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Footer Content */}
          <div className="flex flex-col lg:flex-row justify-between items-start gap-10 lg:gap-16 pb-10 border-b border-slate-200 dark:border-neutral-900">
            {/* Left: StudyBuddy Platform Overview */}
            <div className="max-w-xl space-y-3.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-[#E04D4D] text-[10px] font-bold uppercase tracking-wider">
                <Code2 className="w-3.5 h-3.5" />
                <span>Developer Learning Ecosystem</span>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-widest text-slate-500 dark:text-neutral-400 font-semibold block mb-1">
                  Built for Developers
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  STUDYBUDDY
                </h4>
              </div>

              <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed max-w-md">
                An all-in-one workspace designed to accelerate algorithmic problem-solving, structured video learning, and consistent engineering interview preparation.
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-neutral-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  4,500+ Curated Problems
                </span>
                <span className="text-slate-300 dark:text-neutral-700">•</span>
                <span>3-Tier Solutions</span>
                <span className="text-slate-300 dark:text-neutral-700">•</span>
                <span>Ad-Free Video Courses</span>
              </div>
            </div>

            {/* Right: Platform Navigation & Links */}
            <div className="flex flex-col sm:flex-row gap-12 sm:gap-16 lg:gap-24 sm:ml-auto shrink-0 lg:pt-8">
              {/* Middle: Platform Navigation */}
              <div className="space-y-4 min-w-[180px]">
                <h5 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-neutral-100">
                  Platform Tools
                </h5>
                <ul className="space-y-3 text-sm text-slate-600 dark:text-neutral-300">
                  <li>
                    <Link to="/practice" className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2.5">
                      <Terminal className="w-4.5 h-4.5 text-[#E04D4D]" />
                      <span>Practice DSA (4,179+)</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/youtube" className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2.5">
                      <Play className="w-4.5 h-4.5 text-red-500 dark:text-red-400" />
                      <span>Ad - free Video</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/prephub" className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2.5">
                      <BookOpen className="w-4.5 h-4.5 text-amber-500 dark:text-amber-400" />
                      <span>Workspace Roadmaps</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard" className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2.5">
                      <Flame className="w-4.5 h-4.5 text-rose-500 dark:text-rose-400" />
                      <span>Student Dashboard</span>
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Right: Resources */}
              <div className="space-y-4 max-w-[240px]">
                <h5 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-neutral-100">
                  Curated Sheets
                </h5>
                <ul className="space-y-3 text-sm text-slate-600 dark:text-neutral-300">
                  <li>
                    <Link to="/practice" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                      Striver SDE 180 & A2Z
                    </Link>
                  </li>
                  <li>
                    <Link to="/practice" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                      NeetCode 150 & Blind 75
                    </Link>
                  </li>
                  <li>
                    <Link to="/practice" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                      Codeforces Ladders
                    </Link>
                  </li>
                  <li>
                    <Link to="/prephub" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                      Core CS (OS, DBMS, Networks)
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Brand, Copyright & Dedication */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-neutral-500">
            {/* Left: StudyBuddy Micro Brand */}
            <div className="flex items-center gap-2 text-slate-600 dark:text-neutral-400">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#BA3C3C] to-[#E04D4D] flex items-center justify-center text-white">
                <Code2 className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-sm text-slate-800 dark:text-neutral-200">StudyBuddy</span>
              <span className="text-[11px] text-slate-400 dark:text-neutral-500 font-mono">• Code • Study • Track</span>
            </div>

            {/* Middle: Copyright */}
            <div className="text-center">
              <p className="text-slate-600 dark:text-neutral-300 font-medium">
                © {new Date().getFullYear()} <span className="text-slate-900 dark:text-white font-semibold">Anmol Kapoor</span>. All rights reserved.
              </p>
              <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5 flex items-center justify-center gap-1.5">
                <span>Made with</span>
                <Heart className="w-3 h-3 text-red-500 fill-red-500 inline" />
                <span>for developers & learners</span>
              </p>
            </div>

            {/* Right: Platform Note */}
            <div className="text-xs text-slate-400 dark:text-neutral-500 text-center sm:text-right">
              Designed for Desktop, Laptop & Tablet.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
