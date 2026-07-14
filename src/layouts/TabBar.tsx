import { useLocation, useNavigate } from 'react-router-dom';
import { Flame, Compass, BookOpen, Coins } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

const TABS = [
  { path: ROUTES.HOME, label: 'Home', icon: Flame },
  { path: ROUTES.BROWSE, label: 'Browse', icon: Compass },
  { path: ROUTES.LIBRARY, label: 'Library', icon: BookOpen },
  { path: ROUTES.STORE, label: 'Store', icon: Coins },
] as const;

export default function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string): boolean => {
    if (path === ROUTES.HOME) {
      return location.pathname === ROUTES.HOME;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-bg-hover bg-bg-deep/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(tab.path)}
              className={`relative flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 transition-colors sm:flex-row sm:justify-center sm:gap-2 sm:px-4 ${
                active ? 'text-gold-bright' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Icon size={22} className="shrink-0" />
              <span className="hidden text-xs font-medium sm:inline">{tab.label}</span>
              {active && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-gold-bright" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
