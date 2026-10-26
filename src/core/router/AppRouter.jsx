import { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { Forbidden } from '@/components/common/Forbidden';
import { NotFound } from '@/components/common/NotFound';
import { RequireAuth, RequireGuest, RequireOverviewAccess } from './ProtectedRoute';
import { RouteErrorPage, FullscreenRouteErrorPage } from './RouteErrorPage';
import { ROUTES } from '@/constants/routes';

const OverviewPage = lazy(() =>
  import('@/pages/overview/OverviewPage').then((m) => ({ default: m.default || m.OverviewPage }))
);
const HomePage = lazy(() =>
  import('@/pages/home/HomePage').then((m) => ({ default: m.default || m.HomePage }))
);
const LineDetailPage = lazy(() =>
  import('@/pages/overview/LineDetailPage').then((m) => ({
    default: m.default || m.LineDetailPage,
  }))
);
const ChartPage = lazy(() =>
  import('@/pages/overview/ChartPage').then((m) => ({ default: m.default || m.ChartPage }))
);
const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((m) => ({ default: m.default || m.LoginPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/ForgotPasswordPage').then((m) => ({
    default: m.default || m.ForgotPasswordPage,
  }))
);

const ProductionDashboardPage = lazy(() =>
  import('@/pages/production-dashboard/ProductionDashboardPage').then((m) => ({
    default: m.default || m.ProductionDashboardPage,
  }))
);

const WipReportPage = lazy(() =>
  import('@/pages/wip-report/WipReportPage').then((m) => ({
    default: m.default || m.WipReportPage,
  }))
);

const CimCycleTimePage = lazy(() =>
  import('@/pages/maintain/CimCycleTimePage').then((m) => ({
    default: m.default || m.CimCycleTimePage,
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
      {
        path: 'chart',
        element: (
          <RequireOverviewAccess>
            <ChartPage />
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
    path: ROUTES.WIP_REPORT,
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <WipReportPage />,
      },
    ],
  },
  {
    path: ROUTES.MAINTAIN_CIM_CYCLE_TIME,
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <CimCycleTimePage />,
      },
    ],
  },
  {
    path: ROUTES.FORBIDDEN,
    element: <Forbidden />,
    errorElement: <RouteErrorPage />,
  },
  { path: '*', element: <NotFound /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

export default AppRouter;
