import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * @typedef {Object} AuthSession
 * @property {string} token        Access token (JWT).
 * @property {string|null} refreshToken Refresh token (dùng để làm mới phiên).
 * @property {string|null} expiresAt    Thời điểm access token hết hạn (ISO).
 * @property {{ id: string, name: string, email?: string|null, type?: string|null }} user
 */
export const useAuthStore = create()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      expiresAt: null,
      user: null,

      /** @param {AuthSession} session */
      login: (session) =>
        set({
          token: session.token,
          refreshToken: session.refreshToken ?? null,
          expiresAt: session.expiresAt ?? null,
          user: session.user,
        }),

      logout: () => set({ token: null, refreshToken: null, expiresAt: null, user: null }),
    }),
    {
      name: 'sfcs-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        user: state.user,
      }),
    }
  )
);
