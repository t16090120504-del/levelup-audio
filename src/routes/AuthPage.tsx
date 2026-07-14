import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useToastStore } from '@/stores/toast-store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants/routes';

type AuthTab = 'signin' | 'signup';

const tabVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
};

export default function AuthPage() {
  const [tab, setTab] = useState<AuthTab>('signin');
  const [direction, setDirection] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  // If already authenticated, redirect to home
  if (isAuthenticated) {
    navigate(ROUTES.HOME, { replace: true });
    return null;
  }

  const switchTab = (next: AuthTab) => {
    if (next === tab) return;
    setDirection(next === 'signup' ? 1 : -1);
    setTab(next);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      addToast({
        type: 'warning',
        title: 'Missing Fields',
        message: 'Please enter both email and password.',
      });
      return;
    }

    setLoading(true);
    try {
      if (tab === 'signin') {
        await signIn(email, password);
        addToast({
          type: 'success',
          title: 'Welcome Back',
          message: 'You have signed in successfully.',
        });
      } else {
        await signUp(email, password);
        addToast({
          type: 'success',
          title: 'Account Created',
          message: 'Please check your email to verify your account.',
        });
      }
      navigate(ROUTES.HOME, { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      addToast({
        type: 'error',
        title: tab === 'signin' ? 'Sign In Failed' : 'Sign Up Failed',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center justify-center rounded-xl border border-gold-bright/20 bg-gold-bright/10 p-3">
            <Swords size={32} className="text-gold-bright" />
          </div>
          <h1 className="font-display text-2xl text-gold-bright">
            LevelUp Audio
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Level up your listening experience
          </p>
        </div>

        {/* Auth Card */}
        <Card className="overflow-hidden p-6">
          {/* Tab Switcher */}
          <div className="relative mb-6 flex rounded-lg bg-bg-elevated p-1">
            {/* Animated tab indicator */}
            <motion.div
              className="absolute inset-y-1 rounded-md bg-gold-bright shadow-gold-glow-sm"
              animate={{
                x: tab === 'signin' ? '4px' : 'calc(50% - 4px)',
                width: 'calc(50% - 8px)',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
            <button
              type="button"
              onClick={() => switchTab('signin')}
              className={`relative z-10 flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                tab === 'signin' ? 'text-bg-deepest' : 'text-text-secondary'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchTab('signup')}
              className={`relative z-10 flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                tab === 'signup' ? 'text-bg-deepest' : 'text-text-secondary'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.form
              key={tab}
              custom={direction}
              variants={tabVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="auth-email"
                  className="mb-1.5 block text-xs font-semibold tracking-wide text-text-secondary"
                >
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-bg-hover bg-bg-elevated px-4 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-gold-bright/50 focus:ring-1 focus:ring-gold-bright/30"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="mb-1.5 block text-xs font-semibold tracking-wide text-text-secondary"
                >
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={
                    tab === 'signin'
                      ? 'current-password'
                      : 'new-password'
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-bg-hover bg-bg-elevated px-4 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-gold-bright/50 focus:ring-1 focus:ring-gold-bright/30"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
                className="mt-2"
              >
                {tab === 'signin' ? 'Sign In' : 'Create Account'}
              </Button>
            </motion.form>
          </AnimatePresence>

          {/* Bottom hint */}
          <p className="mt-5 text-center text-xs text-text-muted">
            {tab === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('signup')}
                  className="font-semibold text-gold-bright hover:underline"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('signin')}
                  className="font-semibold text-gold-bright hover:underline"
                >
                  Sign In
                </button>
              </>
            )}
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
