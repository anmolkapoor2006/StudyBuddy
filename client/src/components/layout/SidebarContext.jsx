import { createContext, useContext } from "react";

export const SidebarContext = createContext({
  isOpen: false,
  setIsOpen: () => {},
  toggleSidebar: () => {},
});

export const useSidebar = () => useContext(SidebarContext);
