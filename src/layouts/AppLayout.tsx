import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useCoinStore } from '@/stores/coin-store';
import { ROUTES } from '@/constants/routes';
import TabBar from '@/layouts/TabBar';
import { MiniPlayer } from '@/components/audio/MiniPlayer';

export default function AppLayout() {
  const location = useLocation();
  const hasCompletedOnboarding = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const balance = useCoinStore((s) => s.balance);

  if (!hasCompletedOnboarding) {
    return <Navigate to={ROUTES.ONBOARDING} replace />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header with CoinBalanceBadge placeholder */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-bg-hover bg-bg-deepest/80 px-4 py-3 backdrop-blur-sm">
        <span className="font-display text-lg text-gold-bright">LevelUp Audio</span>
        {/* CoinBalanceBadge placeholder */}
        <div className="badge-base bg-bg-elevated text-gold-bright">
          <span>{balance}</span>
          <span className="ml-1">coins</span>
        </div>
      </header>

      {/* Content area */}
      <main className="flex-1 overflow-y-auto px-4 pb-32 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* MiniPlayer */}
      <MiniPlayer />

      {/* Bottom TabBar */}
      <TabBar />
    </div>
  );
}
