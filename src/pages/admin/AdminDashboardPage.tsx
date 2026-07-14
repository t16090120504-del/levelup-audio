import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Headphones,
  Users,
  Coins,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { adminSupabase } from '@/services/supabase/admin-client';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCoinAmount } from '@/lib/format';
import type { LucideIcon } from 'lucide-react';

interface DashboardStats {
  totalSeries: number;
  totalEpisodes: number;
  totalUsers: number;
  totalRevenue: number;
}

interface QuickLink {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const QUICK_LINKS: QuickLink[] = [
  {
    to: ROUTES.ADMIN_SERIES,
    title: 'Manage Series',
    description: 'Create, edit, and delete audio series',
    icon: BookOpen,
  },
  {
    to: ROUTES.ADMIN_EPISODES,
    title: 'Manage Episodes',
    description: 'Add episodes and upload audio files',
    icon: Headphones,
  },
  {
    to: ROUTES.ADMIN_USERS,
    title: 'Manage Users',
    description: 'View users and adjust coin balances',
    icon: Users,
  },
];

/**
 * Admin dashboard overview. Displays aggregate stats (total series, episodes,
 * users, and revenue) queried directly from Supabase using the service-role
 * client, plus quick links to the management pages.
 */
export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      setError(null);
      try {
        // Run all count queries in parallel.
        const [seriesRes, episodesRes, usersRes, revenueRes] =
          await Promise.all([
            adminSupabase.from('series').select('*', { count: 'exact', head: true }),
            adminSupabase.from('episodes').select('*', { count: 'exact', head: true }),
            adminSupabase.from('profiles').select('*', { count: 'exact', head: true }),
            adminSupabase
              .from('coin_transactions')
              .select('amount')
              .eq('type', 'purchase'),
          ]);

        if (seriesRes.error) throw seriesRes.error;
        if (episodesRes.error) throw episodesRes.error;
        if (usersRes.error) throw usersRes.error;
        if (revenueRes.error) throw revenueRes.error;

        // Revenue = total coins purchased (proxy for monetary revenue).
        const revenue = (revenueRes.data ?? []).reduce(
          (sum, row) => sum + (Number(row.amount) || 0),
          0,
        );

        if (!cancelled) {
          setStats({
            totalSeries: seriesRes.count ?? 0,
            totalEpisodes: episodesRes.count ?? 0,
            totalUsers: usersRes.count ?? 0,
            totalRevenue: revenue,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load stats.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const statCards: {
    label: string;
    value: number;
    icon: LucideIcon;
    accent: string;
  }[] = [
    {
      label: 'Total Series',
      value: stats?.totalSeries ?? 0,
      icon: BookOpen,
      accent: 'text-gold-bright',
    },
    {
      label: 'Total Episodes',
      value: stats?.totalEpisodes ?? 0,
      icon: Headphones,
      accent: 'text-status-unlocked',
    },
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      accent: 'text-status-free',
    },
    {
      label: 'Revenue (Coins)',
      value: stats?.totalRevenue ?? 0,
      icon: Coins,
      accent: 'text-gold-light',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-gold-bright">Dashboard</h1>
        <p className="mt-1 text-sm text-text-muted">
          Overview of your LevelUp Audio content and users.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-sm text-status-warning">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted">
                    {card.label}
                  </p>
                  {loading ? (
                    <Skeleton variant="text" className="mt-2 h-8 w-20" />
                  ) : (
                    <p className="mt-2 font-display text-3xl font-bold text-text-primary">
                      {formatCoinAmount(card.value)}
                    </p>
                  )}
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-bg-hover bg-bg-elevated">
                  <Icon size={22} className={card.accent} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick links */}
      <section>
        <h2 className="mb-4 font-display text-xl text-gold-bright">
          Quick Links
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.to}
                type="button"
                onClick={() => navigate(link.to)}
                className="card-jrpg card-jrpg-hover group cursor-pointer p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gold/30 bg-bg-elevated">
                    <Icon size={20} className="text-gold-bright" />
                  </div>
                  <h3 className="font-display text-base text-text-primary">
                    {link.title}
                  </h3>
                </div>
                <p className="mt-3 text-sm text-text-secondary">
                  {link.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gold-bright opacity-0 transition-opacity group-hover:opacity-100">
                  Open
                  <ArrowRight size={14} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent activity placeholder */}
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-gold-bright" />
          <h2 className="font-display text-lg text-gold-bright">
            Revenue Insights
          </h2>
        </div>
        {loading ? (
          <Skeleton variant="text" className="mt-3 h-5 w-3/4" />
        ) : (
          <p className="mt-2 text-sm text-text-secondary">
            Users have purchased a total of{' '}
            <span className="font-semibold text-gold-bright">
              {formatCoinAmount(stats?.totalRevenue ?? 0)} coins
            </span>{' '}
            across all transactions. Revenue is computed from purchase-type coin
            transactions as a proxy for monetary revenue.
          </p>
        )}
      </Card>
    </div>
  );
}
