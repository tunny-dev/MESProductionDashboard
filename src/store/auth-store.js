/**
 * PHIÊN ĐĂNG NHẬP.
 *
 * Lưu vào localStorage (`sfcs-auth`) để màn thống kê khởi động lại vẫn còn phiên — kiosk
 * treo tường mà mỗi lần bật phải gõ mật khẩu thì không ai dùng.
 *
 * Chỉ lưu token + tên người dùng. KHÔNG lưu mật khẩu, không lưu quyền chi
 * tiết: quyền nằm ở backend, frontend chỉ giữ vé vào.
 *
 * Token ở đây là opaque string; backend quyết JWT hay session id.
 *
 * Vì sao nằm ở `src/store/` chứ không ở `features/auth/store/`: session đăng
 * nhập là của cả app — mọi route sau cổng, http client và cả thanh tài khoản
 * đều đọc nó, không riêng màn đăng nhập. Mọi store zustand của app đặt cùng cấp
 * `src`; dữ liệu chỉ dùng trong một feature thì để `useQuery` trong feature đó,
 * không dựng store.
 */

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
