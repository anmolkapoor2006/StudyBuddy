import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import BackgroundGlow from "../components/common/BackgroundGlow";
import Loader from "../components/common/Loader";
import HeroWeb from "../components/web/HeroWeb";
import Logo from "../components/common/Logo";

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { isWeb } = useTheme();

  const [loaderMounted, setLoaderMounted] = useState(true);
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [isNavigatingHome, setIsNavigatingHome] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isHoveringBtn, setIsHoveringBtn] = useState(false);
  const [isOpeningGoogle, setIsOpeningGoogle] = useState(false);
  const [referralState, setReferralState] = useState(null); // null | 'verifying' | 'success'
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [popupBlockedNotice, setPopupBlockedNotice] = useState(false);
  const [reloadCountdown, setReloadCountdown] = useState(null);

  // Smooth UI transition delay
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setLoaderVisible(false);
    }, 320);

    const unmountTimer = setTimeout(() => {
      setLoaderMounted(false);
    }, 850);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  // Smooth exit transition before returning home
  const handleReturnHome = (e) => {
    e?.preventDefault();
    if (isNavigatingHome) return;
    setIsNavigatingHome(true);
    setTimeout(() => {
      navigate("/");
    }, 200);
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Detect when user clicks Google iframe (window loses focus while hovering)
  useEffect(() => {
    let focusTimer;
    const onWindowBlur = () => {
      if (isHoveringBtn) {
        setIsOpeningGoogle(true);
      }
    };

    const onWindowFocus = () => {
      // If user comes back to window and referral hasn't started, cleanly reset
      focusTimer = setTimeout(() => {
        if (!referralState) {
          setIsOpeningGoogle(false);
          setPopupBlockedNotice(false);
          setReloadCountdown(null);
        }
      }, 3500);
    };

    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("focus", onWindowFocus);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [isHoveringBtn, referralState]);

  // Failsafe timer: If Google login is initiated but stuck (e.g. popup blocked by browser/adblocker),
  // warn the user and automatically reload after enough time to reset the UI.
  useEffect(() => {
    if (!isOpeningGoogle || referralState) {
      setPopupBlockedNotice(false);
      setReloadCountdown(null);
      return;
    }

    // After 8 seconds of no response, show blocked popup warning and begin reload countdown
    const noticeTimer = setTimeout(() => {
      setPopupBlockedNotice(true);
      setReloadCountdown(6);
    }, 8000);

    return () => {
      clearTimeout(noticeTimer);
    };
  }, [isOpeningGoogle, referralState]);

  // Handle auto-reload countdown
  useEffect(() => {
    if (reloadCountdown === null) return;
    if (reloadCountdown <= 0) {
      window.location.reload();
      return;
    }

    const interval = setInterval(() => {
      setReloadCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [reloadCountdown]);

  const handleGoogleResponse = useCallback(async (response) => {
    try {
      setLoading(true);
      setIsOpeningGoogle(false);
      setReferralState("verifying");
      setError("");

      const res = await api.post("/auth/google", { credential: response.credential });
      if (res.data?.success) {
        setAuthenticatedUser(res.data.user);
        setReferralState("success");
        login(res.data.token, res.data.user);

        // Aesthetic referral handoff delay
        setTimeout(() => {
          navigate("/dashboard");
        }, 800);
      } else {
        setReferralState(null);
        setError("Unable to authenticate with Google. Please try again.");
      }
    } catch (err) {
      setReferralState(null);
      setError(err.response?.data?.message || "Google authentication failed. Please try again.");
    } finally {
      setLoading(false);
      setIsOpeningGoogle(false);
    }
  }, [login, navigate]);

  const handleGoogleClick = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Google Client ID is missing in client/.env.");
      return;
    }
    if (window.google?.accounts?.id) {
      setIsOpeningGoogle(true);
      setLoading(true);
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason?.() || "browser restrictions";
          setError(`Google Sign-In prompt was not displayed (${reason}). Please click again or allow popups.`);
          setLoading(false);
          setIsOpeningGoogle(false);
        } else if (notification.isSkippedMoment?.() || notification.isDismissedMoment?.()) {
          setLoading(false);
          setIsOpeningGoogle(false);
        }
      });
    } else {
      setError("Google Identity Services failed to load. Check your internet connection.");
    }
  };

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const initGsi = () => {
      if (!window.google?.accounts?.id) return;
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        const container = document.getElementById("googleBtnDiv");
        if (container) {
          container.innerHTML = "";
          window.google.accounts.id.renderButton(container, {
            theme: "outline",
            size: "large",
            shape: "rectangular",
            width: 320,
            text: "signin_with",
          });
        }
      } catch (err) {
        console.error("Failed to initialize Google Sign-In:", err);
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGsi;
      document.body.appendChild(script);
    }
  }, [handleGoogleResponse]);

  return (
    <div
      className={`w-full h-screen overflow-hidden flex flex-col bg-[#030005] relative text-[#EDE9E3] font-['Lora',serif] select-none transition-all duration-200 ease-out ${
        isNavigatingHome ? "opacity-0 scale-[0.99] pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* SMOOTH UI PAGE TRANSITION DISSOLVE OVERLAY */}
      {loaderMounted && (
        <div
          className={`fixed inset-0 z-50 transition-opacity duration-500 ease-out pointer-events-none ${
            loaderVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <Loader
            text="Loading StudyBuddy..."
            subtitle="Preparing secure authentication."
            fullscreen
          />
        </div>
      )}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Courier+Prime:wght@400;700&display=swap');

        .iws-noise-overlay::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 10;
          opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
      `,
        }}
      />

      {/* SIGNATURE STUDYBUDDY BACKGROUND GLOW */}
      {!isWeb && <BackgroundGlow />}
      {isWeb && <HeroWeb position="tr" size={480} />}

      {/* NOISE OVERLAY */}
      <div className="iws-noise-overlay absolute inset-0 pointer-events-none z-10" />

      {/* AMBIENT BACKGROUND GLOWS */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-red-600/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-600/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-red-500/12 blur-3xl pointer-events-none -z-10" />

      {/* BACKGROUND "STUDYBUDDY" WATERMARK */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.035] z-0 select-none">
        <div className="relative flex items-center justify-center">
          <div
            className="text-[#E04D4D] font-['Fraunces',serif] font-black leading-none tracking-tighter whitespace-nowrap"
            style={{
              fontSize: "clamp(80px, 22vw, 380px)",
              transformOrigin: "center",
            }}
          >
            STUDYBUDDY
          </div>
        </div>
      </div>

      {/* CLEAN HEADER */}
      <header className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-5">
        <a
          href="/"
          onClick={handleReturnHome}
          className="flex items-center gap-3.5 group cursor-pointer select-none"
        >
          <Logo size="lg" />
          <div className="flex flex-col justify-center">
            <span className="text-white font-['Fraunces',serif] font-bold text-xl sm:text-2xl tracking-tight leading-tight group-hover:text-white/90 transition-colors">
              StudyBuddy
            </span>
            <span className="text-neutral-400 font-['Courier_Prime',monospace] font-bold text-[10px] sm:text-[11px] tracking-wider leading-tight mt-0.5">
              Code • Study • Track
            </span>
          </div>
        </a>
      </header>

      {/* FULLSCREEN GOOGLE AUTH REFERRAL & REDIRECT OVERLAY */}
      {referralState && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030005]/95 backdrop-blur-2xl transition-all duration-300 font-['Courier_Prime',monospace] select-none p-4">
          {/* Ambient Glows */}
          <div className="absolute w-[500px] h-[500px] rounded-full bg-red-600/15 blur-[120px] pointer-events-none" />
          <div className="absolute w-72 h-72 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center space-y-6">
            {/* Animated Center Badge */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              {/* Orbital Pulse Rings */}
              <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping opacity-30" />
              <div className="absolute inset-[-8px] rounded-full border border-red-500/30 animate-spin [animation-duration:6s]" />
              <div className="absolute inset-0 rounded-full border-2 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent animate-spin [animation-duration:1s]" />

              {/* Center Google G / Success Icon */}
              <div className="w-16 h-16 rounded-full bg-[#120E1E] border border-red-500/40 flex items-center justify-center shadow-xl shadow-red-500/20">
                {referralState === "success" ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-in zoom-in-75 duration-300" />
                ) : (
                  <svg className="w-8 h-8 animate-pulse" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
              </div>
            </div>

            {/* Status Copy */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-[10px] uppercase font-bold tracking-widest text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                {referralState === "success" ? "Session Authenticated" : "Google Authorization"}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-['Fraunces',serif]">
                {referralState === "success"
                  ? (authenticatedUser?.name ? `Welcome, ${authenticatedUser.name}!` : "Welcome to StudyBuddy!")
                  : "Verifying with Google..."}
              </h2>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                {referralState === "success"
                  ? "Setting up your developer streak & redirecting to workspace..."
                  : "Validating cryptographic token & establishing secure session..."}
              </p>
            </div>

            {/* Cyberpunk Animated Progress Bar */}
            <div className="w-64 h-1.5 bg-neutral-900 border border-neutral-800 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-[#BA3C3C] via-[#E04D4D] to-red-400 transition-all duration-500 ease-out"
                style={{ width: referralState === "success" ? "100%" : "72%" }}
              />
            </div>

            <span className="text-[10px] text-neutral-500 font-mono tracking-wider">
              {referralState === "success" ? "Redirecting in 3... 2... 1..." : "Connecting to StudyBuddy Server..."}
            </span>
          </div>
        </div>
      )}

      {/* BOTTOM ACTION */}
      <div className="relative z-30 pb-8 sm:pb-12 pt-4 px-6 flex flex-col items-center mt-auto">
        <div
          className="relative w-[90%] sm:w-auto min-w-[280px]"
          onMouseEnter={() => setIsHoveringBtn(true)}
          onMouseLeave={() => setIsHoveringBtn(false)}
        >
          {/* Invisible Google One-Tap/Button Overlay */}
          <div
            id="googleBtnDiv"
            className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer overflow-hidden flex items-center justify-center"
          />

          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={loading || isOpeningGoogle}
            className={`w-full bg-[#120E1E] text-white hover:bg-[#1A142A] border-[1.5px] border-[#E04D4D] py-4 sm:py-5 px-8 rounded-none font-bold text-sm sm:text-base font-['Courier_Prime',monospace] tracking-widest uppercase shadow-[5px_5px_0_#E04D4D] transition-all duration-300 flex items-center justify-center gap-4 hover:-translate-y-1 active:translate-y-0 disabled:opacity-85 disabled:hover:translate-y-0 cursor-pointer relative z-10 ${
              isOpeningGoogle ? "border-red-400 shadow-[0_0_24px_rgba(224,77,77,0.45)]" : ""
            }`}
          >
            {loading || isOpeningGoogle ? (
              <div className="w-7 h-7 sm:w-8 sm:h-8 border-4 border-[#A2382B] border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <svg className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            <span>
              {loading
                ? "Connecting..."
                : isOpeningGoogle
                ? "Opening Google..."
                : "Sign in with Google"}
            </span>
          </button>
        </div>

        {/* Live status feedback when Google popup is open */}
        {isOpeningGoogle && !referralState && (
          <div className="mt-3 flex flex-col items-center gap-2 max-w-sm w-full">
            <div className="flex items-center gap-2 text-[11px] font-['Courier_Prime',monospace] text-red-400 animate-pulse bg-red-500/10 border border-red-500/25 px-3 py-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
              <span>Google authentication in progress... Choose your account</span>
            </div>

            {popupBlockedNotice && (
              <div className="w-full p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-['Courier_Prime',monospace] text-center flex flex-col items-center gap-2 animate-in fade-in duration-300">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Popup may be blocked by browser</span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  If the sign-in window didn't appear, check your popup blocker settings.
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-amber-400/90 font-mono">
                    Auto-reloading in {reloadCountdown ?? 0}s...
                  </span>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-bold text-amber-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Reload Now</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-none bg-red-500/10 border border-[#E04D4D] text-[#E04D4D] text-xs font-['Courier_Prime',monospace] text-center max-w-md shadow-md">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleReturnHome}
          disabled={isNavigatingHome}
          className="mt-8 text-neutral-400 font-['Courier_Prime',monospace] text-[12px] tracking-[0.06em] font-bold border-b-[1.5px] border-neutral-700 pb-[2px] hover:text-[#E04D4D] hover:border-[#E04D4D] active:scale-95 transition-all flex items-center gap-2 group cursor-pointer disabled:opacity-60"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              isNavigatingHome ? "-translate-x-1 text-[#E04D4D]" : "group-hover:-translate-x-1"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>{isNavigatingHome ? "Returning to home..." : "Return to home"}</span>
        </button>
      </div>
    </div>
  );
}
