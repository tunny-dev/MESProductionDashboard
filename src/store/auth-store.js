import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create()(
  persist(
    (set) => ({
      token: null,
      user: null,

      /** @param {{ token: string, user: { id: string, name: string } }} session */
      login: (session) => set({ token: session.token, user: session.user }),

      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'sfcs-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

/** Đọc nhanh không cần hook — dùng trong http client và guard. */
export function isAuthenticated() {
  return Boolean(useAuthStore.getState().token);
}
