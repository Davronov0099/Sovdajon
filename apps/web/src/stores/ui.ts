import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  mobileSidebarOpen: boolean;
  notificationsOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  sidebarOpen: true,
  commandPaletteOpen: false,
  mobileSidebarOpen: false,
  notificationsOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setNotificationsOpen: (open) => set({ notificationsOpen: open }),
}));
