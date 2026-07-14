import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useEngagementStore } from '@/stores/engagement-store';
import { ROUTES } from '@/constants/routes';

/**
 * Subtle "Sign up to save your progress" banner shown to non-authenticated
 * users once they have demonstrated engagement (listened to 2+ episodes).
 *
 * The banner is dismissible and only reappears if the engagement threshold
 * is crossed again after a reset.
 */
export function SignupPromptBanner() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const shouldShow = useEngagementStore((s) =>
    s.shouldShowSignupPrompt(isAuthenticated),
  );
  const dismiss = useEngagementStore((s) => s.dismissSignupPrompt);

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="relative flex items-center gap-3 rounded-xl border border-gold/30 bg-gradient-to-r from-purple-deep/40 via-bg-card to-bg-elevated p-3 shadow-gold-glow-sm">
            {/* Icon */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-bg-elevated">
              <UserPlus size={18} className="text-gold-bright" />
            </div>

            {/* Copy */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                Sign up to save your progress
              </p>
              <p className="clamp-1 text-xs text-text-secondary">
                Keep your coins, streak, and listening history across devices.
              </p>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={() => navigate(ROUTES.AUTH)}
              className="shrink-0 rounded-lg bg-gradient-gold px-3 py-1.5 text-xs font-bold text-bg-deepest shadow-gold-glow-sm transition-transform hover:scale-105 active:scale-95"
            >
              Sign Up
            </button>

            {/* Dismiss */}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
            >
              <X size={12} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SignupPromptBanner;
