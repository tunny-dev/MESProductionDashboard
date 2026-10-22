import { Navigate, useLocation, useSearchParams } from 'react-router-dom';

import { useAuthStore } from '@/store/auth-store';
import { canAccessOverview } from '@/config/app';
import { ROUTES } from '@/app/router/routes.js';

/** Trang chỉ dành cho guest chưa đăng nhập. */
const GUEST_ONLY_PATHS = [ROUTES.LOGIN, ROUTES.FORGOT_PASSWORD];

export function RequireGuest({ children }) {
  const token = useAuthStore((state) => state.token);
  const [searchParams] = useSearchParams();

  if (!token) return children;

  const back = searchParams.get('back') ?? '';
  const safeBack = back.startsWith('/') && !GUEST_ONLY_PATHS.some((p) => back.startsWith(p));

  return <Navigate to={safeBack ? back : ROUTES.HOME} replace />;
}

export function RequireAuth({ children }) {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    const back = location.pathname + location.search;
    return <Navigate to={`${ROUTES.LOGIN}?back=${encodeURIComponent(back)}`} replace />;
  }

  return children;
}

export function RequireOverviewAccess({ children }) {
  const user = useAuthStore((state) => state.user);

  if (!canAccessOverview(user)) {
    return <Navigate to={ROUTES.FORBIDDEN} replace />;
  }

  return children;
}
