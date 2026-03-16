import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '@sardorbek/shared';

interface User {
  id: string;
  login: string;
  name: string;
  role: Role;
  phone: string | null;
  avatar: string | null;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      setAccessToken: (token) => set({ accessToken: token, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'sardorbek-auth',
      // accessToken PERSIST QILINMAYDI — faqat memory da
      // Refresh token httpOnly cookie da — sahifa yangilanganda /auth/refresh orqali yangilanadi
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
