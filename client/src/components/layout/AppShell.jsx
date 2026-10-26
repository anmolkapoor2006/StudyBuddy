import { useState } from "react";
import { Menu } from "lucide-react";
import BackgroundGlow from "../common/BackgroundGlow";
import HeroWeb from "../web/HeroWeb";
import { useTheme } from "../../context/ThemeContext";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { SidebarContext, useSidebar } from "./SidebarContext";

export function SidebarTrigger({ className = "" }) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      title="Open sidebar"
      aria-label="Open sidebar"
      className={`p-1.5 rounded-lg text-red-500 dark:text-red-400 hover:opacity-80 transition-opacity cursor-pointer shrink-0 flex items-center justify-center ${className}`}
    >
      <Menu className="w-4 h-4 stroke-[2.2]" />
    </button>
  );
}

export default function AppShell({ children, title, showBack = false, className = "" }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isWeb } = useTheme();

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  return (
    <SidebarContext.Provider
      value={{
        isOpen: isSidebarOpen,
        setIsOpen: setIsSidebarOpen,
        toggleSidebar,
      }}
    >
      <div
        className="relative min-h-screen overflow-hidden text-slate-900 dark:text-white bg-[var(--bg-main)] transition-colors duration-300 selection:bg-rose-200 selection:text-rose-900 dark:selection:bg-red-500/30 dark:selection:text-white"
      >
        {!isWeb && <BackgroundGlow />}
        {isWeb && (
          <>
            <HeroWeb position="tr" size={520} />
            <HeroWeb position="bl" size={240} />
          </>
        )}

        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

        {/* Main application layout */}
        <main
          className={`relative z-10 mx-auto min-h-screen max-w-[1600px] ${className}`}
        >
          <TopBar
            title={title}
            showBack={showBack}
            onMenuClick={toggleSidebar}
          />

          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  );
}

