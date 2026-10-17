import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/store/auth-store';
import { canAccessOverview } from '@/config/app';
import { ROUTES } from '@/app/router/routes.js';

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
