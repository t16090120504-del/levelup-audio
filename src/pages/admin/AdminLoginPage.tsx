import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { isAdminAuthenticated, loginAdmin } from '@/lib/admin-auth';
import { Button } from '@/components/ui/Button';

/**
 * Admin login page. Renders a single password field. On a correct password the
 * admin session token is persisted to localStorage and the user is redirected
 * to the dashboard.
 *
 * If the admin is already authenticated, they are sent straight to the
 * dashboard.
 */
export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (isAdminAuthenticated()) {
    return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Please enter the admin password.');
      return;
    }

    if (loginAdmin(password)) {
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-deepest px-4">
      {/* Decorative glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Back to app link */}
        <Link
          to={ROUTES.HOME}
          className="mb-6 inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-text-secondary"
        >
          <ArrowLeft size={16} />
          Back to app
        </Link>

        <div className="card-jrpg p-8">
          {/* Icon */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/40 bg-bg-elevated shadow-gold-glow-sm">
              <ShieldCheck size={32} className="text-gold-bright" />
            </div>
            <h1 className="font-display text-2xl text-gold-bright">
              Admin Console
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Enter your password to manage content
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary"
              >
                Admin Password
              </label>
              <div className="group relative flex items-center bg-bg-elevated border border-bg-hover rounded-lg transition-all duration-200 focus-within:border-gold/50 focus-within:shadow-gold-glow-sm">
                <Lock
                  size={18}
                  className="ml-3 shrink-0 text-text-muted transition-colors group-focus-within:text-gold-bright"
                />
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  autoFocus
                  className="w-full bg-transparent px-3 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-sm text-status-warning">
                {error}
              </p>
            )}

            <Button type="submit" fullWidth size="lg">
              Enter Console
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
