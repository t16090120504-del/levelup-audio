import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  LogOut,
  LogIn,
  Volume2,
  Gauge,
  Repeat,
  Trash2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { usePlayerStore } from '@/stores/player-store';
import { useCoinStore } from '@/stores/coin-store';
import { useContentStore } from '@/stores/content-store';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useToastStore } from '@/stores/toast-store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ROUTES } from '@/constants/routes';

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const signOut = useAuthStore((s) => s.signOut);
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  const autoPlayNext = usePlayerStore((s) => s.autoPlayNext);
  const setAutoPlayNext = usePlayerStore((s) => s.setAutoPlayNext);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);
  const volume = usePlayerStore((s) => s.volume);
  const setVolume = usePlayerStore((s) => s.setVolume);

  const coinReset = useCoinStore((s) => s.reset);
  const contentReset = useContentStore((s) => s.reset);
  const onboardingReset = useOnboardingStore((s) => s.reset);

  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleClearAllData = useCallback(() => {
    coinReset();
    contentReset();
    onboardingReset();
    setShowClearDataModal(false);
    addToast({
      type: 'success',
      title: 'Data Cleared',
      message: 'All local data has been reset successfully.',
    });
    // Force reload to ensure all stores are fresh
    window.location.reload();
  }, [coinReset, contentReset, onboardingReset, addToast]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch {
      logout();
    }
    setShowLogoutModal(false);
    addToast({
      type: 'info',
      title: 'Logged Out',
      message: 'You have been successfully logged out.',
    });
  }, [logout, signOut, addToast]);

  return (
    <div className="space-y-6 pb-8">
      <h1 className="font-display text-3xl text-gold-bright">Settings</h1>

      {/* Account Info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-5">
          <div className="flex items-center gap-2 pb-3">
            <User size={18} className="text-gold-bright" />
            <h2 className="font-display text-lg text-gold-bright">Account</h2>
          </div>
          <div className="space-y-3">
            {user ? (
              <>
                <div className="flex items-center justify-between rounded-lg bg-bg-elevated px-4 py-3">
                  <span className="text-sm text-text-secondary">Name</span>
                  <span className="font-medium text-text-primary">{user.name}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-bg-elevated px-4 py-3">
                  <span className="text-sm text-text-secondary">Email</span>
                  <span className="font-medium text-text-primary">{user.email}</span>
                </div>
              </>
            ) : (
              <div className="rounded-lg bg-bg-elevated px-4 py-6 text-center text-sm text-text-muted">
                <p>You are not logged in.</p>
                <p className="mt-1 text-xs">
                  Log in to sync your library across devices.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  leftIcon={<LogIn size={16} />}
                  onClick={() => navigate(ROUTES.AUTH)}
                >
                  Sign In
                </Button>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Playback Settings */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Card className="p-5">
          <div className="flex items-center gap-2 pb-3">
            <Gauge size={18} className="text-gold-bright" />
            <h2 className="font-display text-lg text-gold-bright">Playback</h2>
          </div>
          <div className="space-y-4">
            {/* Auto-play next */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat size={16} className="text-text-secondary" />
                <span className="text-sm text-text-primary">Auto-play next episode</span>
              </div>
              <button
                type="button"
                onClick={() => setAutoPlayNext(!autoPlayNext)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  autoPlayNext ? 'bg-gold-bright' : 'bg-bg-hover'
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    autoPlayNext ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Playback speed */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Gauge size={16} className="text-text-secondary" />
                <span className="text-sm text-text-primary">Default speed</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PLAYBACK_RATES.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setPlaybackRate(rate)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      playbackRate === rate
                        ? 'bg-gold-bright text-bg-deepest'
                        : 'bg-bg-elevated text-text-secondary hover:bg-bg-hover'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Volume */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-text-secondary" />
                <span className="text-sm text-text-primary">Volume</span>
                <span className="ml-auto font-mono text-xs text-text-muted">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-bg-hover accent-gold-bright"
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Data Management */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="p-5">
          <div className="flex items-center gap-2 pb-3">
            <Trash2 size={18} className="text-gold-bright" />
            <h2 className="font-display text-lg text-gold-bright">Data Management</h2>
          </div>
          <p className="text-sm text-text-secondary">
            Clear all local data including favorites, progress, coins, and settings.
            This action cannot be undone.
          </p>
          <Button
            variant="danger"
            className="mt-4"
            leftIcon={<Trash2 size={16} />}
            onClick={() => setShowClearDataModal(true)}
          >
            Clear All Data
          </Button>
        </Card>
      </motion.div>

      {/* About */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Card className="p-5">
          <div className="flex items-center gap-2 pb-3">
            <Info size={18} className="text-gold-bright" />
            <h2 className="font-display text-lg text-gold-bright">About</h2>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-bg-elevated px-4 py-3">
            <span className="text-sm text-text-secondary">Version</span>
            <span className="font-mono text-sm text-text-primary">1.0.0</span>
          </div>
        </Card>
      </motion.div>

      {/* Logout - only show when authenticated */}
      {isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Button
            variant="ghost"
            fullWidth
            leftIcon={<LogOut size={18} />}
            onClick={() => setShowLogoutModal(true)}
            className="text-status-warning hover:bg-status-warning/10"
          >
            Sign Out
          </Button>
        </motion.div>
      )}

      {/* Clear Data Confirmation Modal */}
      <Modal
        isOpen={showClearDataModal}
        onClose={() => setShowClearDataModal(false)}
        title="Clear All Data"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-status-warning/30 bg-status-warning/10 px-3 py-2.5 text-sm text-status-warning">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p>
              This will permanently erase all your favorites, listening progress, coin
              balance, and settings. Are you sure?
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowClearDataModal(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" fullWidth onClick={handleClearAllData}>
              Clear Everything
            </Button>
          </div>
        </div>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Sign Out"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to sign out?
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowLogoutModal(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" fullWidth onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
