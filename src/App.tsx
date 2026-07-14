import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import AppLayout from '@/layouts/AppLayout';
import PageLoader from '@/components/ui/PageLoader';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { useAuthStore } from '@/stores/auth-store';

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

export default function App() {
  useEffect(() => {
    const cleanup = useAuthStore.getState().initAuthListener();
    return cleanup;
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastContainer />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Onboarding - standalone layout (no TabBar) */}
            <Route path={ROUTES.ONBOARDING} element={<OnboardingPage />} />

            {/* Auth - standalone layout (no TabBar) */}
            <Route path={ROUTES.AUTH} element={<AuthPage />} />

            {/* Payment success - standalone layout (no TabBar) */}
            <Route path={ROUTES.PAYMENT_SUCCESS} element={<PaymentSuccessPage />} />

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
