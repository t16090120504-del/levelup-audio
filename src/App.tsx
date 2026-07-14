import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import AppLayout from '@/layouts/AppLayout';
import PageLoader from '@/components/ui/PageLoader';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { useAuthStore } from '@/stores/auth-store';
import { usePageTracking } from '@/services/analytics';
import { initNotifications } from '@/services/notifications';
import { useStreakStore } from '@/stores/streak-store';

const HomePage = lazy(() => import('@/routes/HomePage'));
const BrowsePage = lazy(() => import('@/routes/BrowsePage'));
const LibraryPage = lazy(() => import('@/routes/LibraryPage'));
const StorePage = lazy(() => import('@/routes/StorePage'));
const SeriesDetailPage = lazy(() => import('@/routes/SeriesDetailPage'));
const PlayerPage = lazy(() => import('@/routes/PlayerPage'));
const SettingsPage = lazy(() => import('@/routes/SettingsPage'));
const OnboardingPage = lazy(() => import('@/routes/OnboardingPage'));
const AuthPage = lazy(() => import('@/routes/AuthPage'));
const PaymentSuccessPage = lazy(() => import('@/routes/PaymentSuccessPage'));

// Admin pages
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminSeriesPage = lazy(() => import('@/pages/admin/AdminSeriesPage'));
const AdminEpisodesPage = lazy(() => import('@/pages/admin/AdminEpisodesPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout'));

/**
 * Invisible component that auto-tracks a `page_view` analytics event on
 * every route change. Must be rendered inside <BrowserRouter>.
 */
function RouteTracker() {
  usePageTracking();
  return null;
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const cleanup = useAuthStore.getState().initAuthListener();
    return cleanup;
  }, []);

  // Initialize browser notifications once on startup (non-blocking).
  useEffect(() => {
    void initNotifications();
  }, []);

  // Update / sync the daily login streak. Authenticated users sync from the
  // server (so the streak is consistent across devices); anonymous users
  // track locally.
  useEffect(() => {
    if (isAuthenticated) {
      void useStreakStore.getState().initStreak();
    } else {
      useStreakStore.getState().updateStreak();
    }
  }, [isAuthenticated]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <RouteTracker />
        <ToastContainer />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Onboarding - standalone layout (no TabBar) */}
            <Route path={ROUTES.ONBOARDING} element={<OnboardingPage />} />

            {/* Auth - standalone layout (no TabBar) */}
            <Route path={ROUTES.AUTH} element={<AuthPage />} />

            {/* Payment success - standalone layout (no TabBar) */}
            <Route path={ROUTES.PAYMENT_SUCCESS} element={<PaymentSuccessPage />} />

            {/* Admin - standalone layout (password-gated) */}
            <Route path={ROUTES.ADMIN} element={<AdminLoginPage />} />
            <Route
              path={ROUTES.ADMIN_DASHBOARD}
              element={
                <AdminLayout>
                  <AdminDashboardPage />
                </AdminLayout>
              }
            />
            <Route
              path={ROUTES.ADMIN_SERIES}
              element={
                <AdminLayout>
                  <AdminSeriesPage />
                </AdminLayout>
              }
            />
            <Route
              path={ROUTES.ADMIN_EPISODES}
              element={
                <AdminLayout>
                  <AdminEpisodesPage />
                </AdminLayout>
              }
            />
            <Route
              path={ROUTES.ADMIN_USERS}
              element={
                <AdminLayout>
                  <AdminUsersPage />
                </AdminLayout>
              }
            />

            {/* Main app with TabBar layout */}
            <Route element={<AppLayout />}>
              <Route path={ROUTES.HOME} element={<HomePage />} />
              <Route path={ROUTES.BROWSE} element={<BrowsePage />} />
              <Route path={ROUTES.LIBRARY} element={<LibraryPage />} />
              <Route path={ROUTES.STORE} element={<StorePage />} />
              <Route path={ROUTES.SERIES} element={<SeriesDetailPage />} />
              <Route path={ROUTES.PLAYER} element={<PlayerPage />} />
              <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
              <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
