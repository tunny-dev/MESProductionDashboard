import { create } from 'zustand';

export const useSessionStore = create((set) => ({
  sessionExpired: false,

  /** Gọi từ HTTP interceptor khi token hết hạn / bị từ chối. */
  triggerSessionExpiry: () => set({ sessionExpired: true }),

  /** Reset sau khi user xác nhận đăng nhập lại. */
  resetSessionExpiry: () => set({ sessionExpired: false }),
}));

export function triggerSessionExpiry() {
  useSessionStore.getState().triggerSessionExpiry();
}
