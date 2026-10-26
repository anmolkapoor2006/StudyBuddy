import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem("studybuddy_theme");
      if (savedTheme === "web") return "dark"; // migrated to dark theme + web skin
      if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    } catch (_err) {
      // Fallback to dark if localStorage is inaccessible
    }
    return "dark"; // Default theme remains dark
  });

  const [skin, setSkinState] = useState(() => {
    try {
      const savedTheme = localStorage.getItem("studybuddy_theme");
      const savedSkin = localStorage.getItem("studybuddy_skin");
      if (savedTheme === "web") return "web"; // migrated legacy setting
      if (savedSkin === "web" || savedSkin === "basic") return savedSkin;
    } catch (_err) {
      // Fallback to web skin
    }
    return "web"; // Default skin is web
  });

  const [animatedBg, setAnimatedBg] = useState(() => {
    try {
      const saved = localStorage.getItem("studybuddy_animated_bg");
      if (saved !== null) return saved === "true";
    } catch (_err) {
      // Fallback to true
    }
    return true; // Default animated background is On
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark", "theme-web");
    root.classList.add(theme);
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-skin", skin);

    try {
      localStorage.setItem("studybuddy_theme", theme);
      localStorage.setItem("studybuddy_skin", skin);
      localStorage.setItem("studybuddy_animated_bg", String(animatedBg));
    } catch (_err) {
      // Ignore storage write issues
    }
  }, [theme, skin, animatedBg]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const toggleSkin = useCallback(() => {
    const nextSkin = skin === "web" ? "basic" : "web";
    try {
      localStorage.setItem("studybuddy_skin", nextSkin);
      document.documentElement.setAttribute("data-skin", nextSkin);
    } catch (_err) {
      // Ignore storage write issues
    }
    setSkinState(nextSkin);
  }, [skin]);

  const handleSetSkin = useCallback((newSkin) => {
    if (newSkin === skin) return;
    try {
      localStorage.setItem("studybuddy_skin", newSkin);
      document.documentElement.setAttribute("data-skin", newSkin);
    } catch (_err) {
      // Ignore storage write issues
    }
    setSkinState(newSkin);
  }, [skin]);

  const toggleAnimatedBg = useCallback(() => {
    setAnimatedBg((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      skin,
      setSkin: handleSetSkin,
      toggleSkin,
      animatedBg,
      setAnimatedBg,
      toggleAnimatedBg,
      isDark: theme === "dark",
      isWeb: skin === "web",
    }),
    [theme, skin, animatedBg, toggleTheme, handleSetSkin, toggleSkin, toggleAnimatedBg],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

