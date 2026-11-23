import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useSessionStore = create()(
  devtools(
    (set) => ({
      sessionExpired: false,

      /** Gọi từ HTTP interceptor khi token hết hạn / bị từ chối. */
      triggerSessionExpiry: () =>
        set({ sessionExpired: true }, false, 'session/triggerSessionExpiry'),

      /** Reset sau khi user xác nhận đăng nhập lại. */
      resetSessionExpiry: () => set({ sessionExpired: false }, false, 'session/resetSessionExpiry'),
    }),
    { name: 'SessionStore', enabled: import.meta.env.DEV }
  )
);

export function triggerSessionExpiry() {
  useSessionStore.getState().triggerSessionExpiry();
}
