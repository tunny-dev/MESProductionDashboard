import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/store/auth-store';
import { canAccessOverview } from '@/config/app';
import { ROUTES } from './routes';

export function RequireAuth({ children }) {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    const back = location.pathname + location.search;
    return <Navigate to={`${ROUTES.LOGIN}?back=${encodeURIComponent(back)}`} replace />;
  }

  return children;
}

/**
 * TEMP — user ngoài OVERVIEW_ALLOWED_USER_IDS không được vào Tổng quan
 * (kèm line/chart). Gõ URL trực tiếp thì gặp màn 403.
 * Xem OVERVIEW_ALLOWED_USER_IDS trong config/app.js, xoá cùng khi có quyền thật.
 */
export function RequireOverviewAccess({ children }) {
  const user = useAuthStore((state) => state.user);

  if (!canAccessOverview(user)) {
    return <Navigate to={ROUTES.FORBIDDEN} replace />;
  }

  return children;
}
