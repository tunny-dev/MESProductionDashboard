import { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import {
  ForbiddenPage,
  NotFoundPage,
  RouteErrorPage,
  FullscreenRouteErrorPage,
} from '@/features/errors';
import { RequireAuth, RequireGuest, RequireOverviewAccess } from '@/core/router/ProtectedRoute';
import { ROUTES } from '@/constants/routes';

const OverviewPage = lazy(() =>
  import('@/features/overview').then((m) => ({ default: m.default || m.OverviewPage }))
);
const HomePage = lazy(() =>
  import('@/features/home').then((m) => ({ default: m.default || m.HomePage }))
);
const LineDetailPage = lazy(() =>
  import('@/features/overview').then((m) => ({
    default: m.LineDetailPage || m.default,
  }))
);
const LoginPage = lazy(() =>
  import('@/features/auth').then((m) => ({ default: m.default || m.LoginPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('@/features/auth').then((m) => ({
    default: m.ForgotPasswordPage || m.default,
  }))
);

const ProductionDashboardPage = lazy(() =>
  import('@/features/production-dashboard').then((m) => ({
    default: m.default || m.ProductionDashboardPage,
  }))
);

const ProductionBoardPage = lazy(() =>
  import('@/features/production-board/ProductionBoardPage').then((m) => ({
    default: m.default || m.ProductionBoardPage,
  }))
);

const SystemLogsPage = lazy(() =>
  import('@/features/system-logs').then((m) => ({
    default: m.default || m.SystemLogsPage,
  }))
);

export const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: (
      <RequireGuest>
        <LoginPage />
      </RequireGuest>
    ),
    errorElement: <RouteErrorPage />,
  },
  {
    path: ROUTES.FORGOT_PASSWORD,
    element: (
      <RequireGuest>
        <ForgotPasswordPage />
      </RequireGuest>
    ),
    errorElement: <RouteErrorPage />,
  },

  {
    path: ROUTES.HOME,
    element: (
      <RequireAuth>
        <HomePage />
      </RequireAuth>
    ),
    errorElement: <RouteErrorPage />,
  },
  {
    path: ROUTES.OVERVIEW,
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: (
          <RequireOverviewAccess>
            <OverviewPage />
          </RequireOverviewAccess>
        ),
      },
      {
        path: 'line/:lineId',
        element: (
          <RequireOverviewAccess>
            <LineDetailPage />
          </RequireOverviewAccess>
        ),
      },
    ],
  },
  {
    path: ROUTES.PRODUCTION_DASHBOARD,
    element: (
      <RequireAuth>
        <ProductionDashboardPage />
      </RequireAuth>
    ),
    errorElement: <FullscreenRouteErrorPage />,
  },
  {
    path: ROUTES.PRODUCTION_BOARD,
    element: (
      <RequireAuth>
        <ProductionBoardPage />
      </RequireAuth>
    ),
    errorElement: <FullscreenRouteErrorPage />,
  },
  {
    path: ROUTES.SYSTEM_LOGS,
    element: <SystemLogsPage />,
    errorElement: <FullscreenRouteErrorPage />,
  },
  {
    path: '/system/logs',
    element: <SystemLogsPage />,
    errorElement: <FullscreenRouteErrorPage />,
  },
  {
    path: ROUTES.FORBIDDEN,
    element: <ForbiddenPage />,
    errorElement: <RouteErrorPage />,
  },
  { path: '*', element: <NotFoundPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

export default AppRouter;
