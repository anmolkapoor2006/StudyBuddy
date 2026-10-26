import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Mail, KeyRound, X, ArrowRight } from "lucide-react";
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
  const [isOpeningGoogle, setIsOpeningGoogle] = useState(false);
  const [referralState, setReferralState] = useState(null); // null | 'verifying' | 'success'
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [emailInput, setEmailInput] = useState("");
  const [showClientIdModal, setShowClientIdModal] = useState(false);
  const [customClientIdInput, setCustomClientIdInput] = useState(
    () => localStorage.getItem("studybuddy_google_client_id") || ""
  );

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

  const getGoogleClientId = useCallback(() => {
    return (
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      customClientIdInput ||
      localStorage.getItem("studybuddy_google_client_id") ||
      ""
    ).trim();
  }, [customClientIdInput]);

  const handleGoogleResponse = useCallback(
    async (response) => {
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
    },
    [login, navigate]
  );

  const handleGoogleClick = () => {
    const clientId = getGoogleClientId();
    if (!clientId) {
      setShowClientIdModal(true);
      return;
    }

    if (window.google?.accounts?.oauth2) {
      setIsOpeningGoogle(true);
      setLoading(true);
      setError("");

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "email profile openid",
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setError(`Google authorization error: ${tokenResponse.error}`);
            setLoading(false);
            setIsOpeningGoogle(false);
            return;
          }
          if (tokenResponse.access_token) {
            await handleGoogleResponse({ credential: tokenResponse.access_token });
          }
        },
        error_callback: (err) => {
          console.error("Google Token Client error:", err);
          setError("Google sign-in popup was closed or blocked. Please allow popups and try again.");
          setLoading(false);
          setIsOpeningGoogle(false);
        },
      });

      client.requestAccessToken();
    } else if (window.google?.accounts?.id) {
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
      setError("Google Identity Services is loading. Please check your connection and try again.");
    }
  };


  const handleEmailLogin = async (e) => {
    e?.preventDefault();
    if (!emailInput || !emailInput.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setReferralState("verifying");

      const res = await api.post("/auth/email", { email: emailInput });
      if (res.data?.success) {
        setAuthenticatedUser(res.data.user);
        setReferralState("success");
        login(res.data.token, res.data.user);
        setTimeout(() => {
          navigate("/dashboard");
        }, 800);
      } else {
        setReferralState(null);
        setError("Unable to authenticate with email.");
      }
    } catch (err) {
      setReferralState(null);
      setError(err.response?.data?.message || "Email authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomClientId = (e) => {
    e?.preventDefault();
    const cleanId = customClientIdInput.trim();
    if (cleanId) {
      localStorage.setItem("studybuddy_google_client_id", cleanId);
      setShowClientIdModal(false);
      setError("");
      setTimeout(() => {
        handleGoogleClick();
      }, 100);
    }
  };

  useEffect(() => {
    const clientId = getGoogleClientId();

    const initGsi = () => {
      if (!window.google?.accounts?.id || !clientId) return;
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
  }, [handleGoogleResponse, getGoogleClientId]);

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
      <div className="relative z-30 pb-8 sm:pb-12 pt-4 px-6 flex flex-col items-center mt-auto w-full max-w-md mx-auto">
        <div className="relative w-full">
          {/* Invisible Google One-Tap/Button Overlay */}
          <div
            id="googleBtnDiv"
            className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer overflow-hidden flex items-center justify-center"
          />

          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={loading || isOpeningGoogle}
            className={`w-full bg-[#120E1E] text-white hover:bg-[#1A142A] border-[1.5px] border-[#E04D4D] py-3.5 sm:py-4 px-6 rounded-xl font-bold text-sm font-['Courier_Prime',monospace] tracking-wider uppercase shadow-[0_4px_20px_rgba(224,77,77,0.25)] transition-all duration-300 flex items-center justify-center gap-3 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-85 cursor-pointer relative z-10 ${
              isOpeningGoogle ? "border-red-400 shadow-[0_0_24px_rgba(224,77,77,0.45)]" : ""
            }`}
          >
            {loading || isOpeningGoogle ? (
              <div className="w-5 h-5 border-2 border-[#A2382B] border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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

        {/* Alternative Auth Divider */}
        {/* Alternative Auth Divider */}
        <div className="w-full flex items-center gap-3 my-4">
          <div className="h-[1px] bg-neutral-800/80 flex-1" />
          <span className="text-[10px] font-mono uppercase text-neutral-500 tracking-wider">or sign in with email</span>
          <div className="h-[1px] bg-neutral-800/80 flex-1" />
        </div>

        {/* Email Login Form */}
        <form
          onSubmit={handleEmailLogin}
          className="w-full p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col gap-2.5"
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Mail className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="developer@domain.com"
                required
                className="w-full bg-black/60 border border-neutral-800 focus:border-[#BA3C3C]/60 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-600 outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !emailInput}
              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#BA3C3C] to-[#E04D4D] hover:opacity-90 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <span>Continue</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </form>

        {/* Live status feedback when Google popup is open */}
        {isOpeningGoogle && !referralState && (
          <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-red-400 animate-pulse bg-red-500/10 border border-red-500/25 px-3 py-1.5 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
            <span>Google authorization popup active...</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-3.5 p-3 rounded-lg bg-red-500/10 border border-[#E04D4D] text-[#E04D4D] text-xs font-mono text-center w-full shadow-md flex items-center justify-between gap-2">
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Client ID Configuration Modal / Setup Option */}
        {showClientIdModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#120E1E] border border-neutral-800 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative text-left">
              <button
                type="button"
                onClick={() => setShowClientIdModal(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white font-['Fraunces',serif]">Configure Google OAuth</h3>
              </div>

              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                To sign in with your official Google account, enter your Google OAuth 2.0 Web Client ID from Google Cloud Console.
              </p>

              <form onSubmit={handleSaveCustomClientId} className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono text-neutral-400 block mb-1">Google Client ID</label>
                  <input
                    type="text"
                    value={customClientIdInput}
                    onChange={(e) => setCustomClientIdInput(e.target.value)}
                    placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                    className="w-full bg-black/50 border border-neutral-800 focus:border-red-500/60 rounded-lg p-2.5 text-xs text-white font-mono placeholder-neutral-600 outline-none"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowClientIdModal(false)}
                    className="px-3 py-2 rounded-lg text-xs text-neutral-400 hover:text-white transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#BA3C3C] to-[#E04D4D] text-white text-xs font-semibold shadow-md cursor-pointer hover:opacity-90 transition"
                  >
                    Save & Sign In
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleReturnHome}
          disabled={isNavigatingHome}
          className="mt-6 text-neutral-400 font-mono text-[11px] tracking-wider hover:text-white active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180 text-neutral-500" />
          <span>{isNavigatingHome ? "Returning to home..." : "Return to Home"}</span>
        </button>
      </div>
    </div>
  );
}
