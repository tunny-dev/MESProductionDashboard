/**
 * SESSION EXPIRY STATE
 *
 * Tách khỏi auth-store để tránh circular dependency:
 * http client (mes-http, http) import store này để trigger alert,
 * không import auth-store trực tiếp trong logic expiry.
 *
 * Flag `sessionExpired` được set từ interceptor khi nhận 401/403,
 * reset khi user bấm "Đăng nhập lại".
 */
import { create } from 'zustand';

export const useSessionStore = create((set) => ({
  sessionExpired: false,

  /** Gọi từ HTTP interceptor khi token hết hạn / bị từ chối. */
  triggerSessionExpiry: () => set({ sessionExpired: true }),

  /** Reset sau khi user xác nhận đăng nhập lại. */
  resetSessionExpiry: () => set({ sessionExpired: false }),
}));

/** Đọc nhanh không cần hook — dùng trong interceptor (ngoài React). */
export function triggerSessionExpiry() {
  useSessionStore.getState().triggerSessionExpiry();
}
