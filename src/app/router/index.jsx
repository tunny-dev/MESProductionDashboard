import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { AppShell } from '@/components/layouts/app-shell';
import { Forbidden } from '@/components/common/forbidden';
import { NotFound } from '@/components/common/not-found';
import { RequireAuth, RequireGuest, RequireOverviewAccess } from './require-auth';
import { RouteErrorPage, FullscreenRouteErrorPage } from './route-error-page';
import { ROUTES } from './routes';

const OverviewPage = lazy(() =>
  import('@/pages/overview-page').then((m) => ({ default: m.OverviewPage }))
);
const HomePage = lazy(() => import('@/pages/home-page').then((m) => ({ default: m.HomePage })));
const LineDetailPage = lazy(() =>
  import('@/pages/line-detail-page').then((m) => ({ default: m.LineDetailPage }))
);
const ChartPage = lazy(() => import('@/pages/chart-page').then((m) => ({ default: m.ChartPage })));
const LoginPage = lazy(() => import('@/pages/login-page').then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() =>
  import('@/pages/forgot-password-page').then((m) => ({ default: m.ForgotPasswordPage }))
);

const ProductionDashboardPage = lazy(() =>
  import('@/pages/production-dashboard-page').then((m) => ({ default: m.ProductionDashboardPage }))
);

const WipReportPage = lazy(() =>
  import('@/pages/wip-report-page').then((m) => ({ default: m.WipReportPage }))
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
        <AppShell />
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
        <AppShell />
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
    path: ROUTES.FORBIDDEN,
    element: <Forbidden />,
    errorElement: <RouteErrorPage />,
  },
  { path: '*', element: <NotFound /> },
]);
