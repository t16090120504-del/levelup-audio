import { type ReactNode } from 'react';
import { NavLink, Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Headphones,
  Users,
  LogOut,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { isAdminAuthenticated, logoutAdmin } from '@/lib/admin-auth';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.ADMIN_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.ADMIN_SERIES, label: 'Series', icon: BookOpen },
  { to: ROUTES.ADMIN_EPISODES, label: 'Episodes', icon: Headphones },
  { to: ROUTES.ADMIN_USERS, label: 'Users', icon: Users },
];

export interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * Shared admin layout with a sidebar navigation, dark JRPG theme, and an auth
 * guard. Renders the provided page content in the main area.
 *
 * If no admin session token is present, the user is redirected to the login
 * page.
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();

  if (!isAdminAuthenticated()) {
    return <Navigate to={ROUTES.ADMIN} replace />;
  }

  const handleLogout = () => {
    logoutAdmin();
    navigate(ROUTES.ADMIN, { replace: true });
  };

  const handleBackToApp = () => {
    navigate(ROUTES.HOME, { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-bg-deepest">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-bg-hover bg-bg-deep/80 backdrop-blur-sm">
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-bg-hover px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gold/40 bg-bg-elevated">
            <ShieldCheck size={20} className="text-gold-bright" />
          </div>
          <div>
            <p className="font-display text-sm text-gold-bright">LevelUp</p>
            <p className="text-xs text-text-muted">Admin Console</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'border border-gold/40 bg-gold/10 text-gold-bright shadow-gold-glow-sm'
                      : 'border border-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
                  ].join(' ')
                }
              >
                <Icon size={18} className="shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="space-y-1 border-t border-bg-hover px-3 py-4">
          <button
            type="button"
            onClick={handleBackToApp}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-all duration-200 hover:bg-bg-elevated hover:text-text-primary"
          >
            <ArrowLeft size={18} className="shrink-0" />
            <span>Back to App</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-status-warning transition-all duration-200 hover:bg-status-warning/10"
          >
            <LogOut size={18} className="shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
