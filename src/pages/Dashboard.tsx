import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  Activity,
  Building2,
  Clock,
  Percent,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  Timer,
  Users,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { api, getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/auth';
import type { ApiResponse, PlatformAnalytics, RepStats, TeamMember, TeamStats } from '../types/api';
import { OnboardingChecklist } from '../components/OnboardingChecklist';
import { SyncHealthPanel } from '../components/SyncHealthPanel';
import {
  buildDashboardTrend,
  DASHBOARD_RANGE_OPTIONS,
  resolveDashboardRange,
  type DashboardRangePreset,
} from './dashboardAnalytics';

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const formatAverageDuration = (seconds: number) => {
  const roundedSeconds = Math.round(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const remainder = roundedSeconds % 60;
  return `${minutes}m ${remainder.toString().padStart(2, '0')}s`;
};

const readDashboardFilters = (storageKey: string) => {
  const fallback: { rangePreset: DashboardRangePreset; repId: string } = {
    rangePreset: 'today',
    repId: '',
  };
  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as { rangePreset?: unknown; repId?: unknown };
    const validPreset = DASHBOARD_RANGE_OPTIONS.some((option) => option.value === parsed.rangePreset);
    return {
      rangePreset: validPreset ? parsed.rangePreset as DashboardRangePreset : fallback.rangePreset,
      repId: typeof parsed.repId === 'string' ? parsed.repId : '',
    };
  } catch {
    return fallback;
  }
};

export const Dashboard = () => {
  const { user, claims } = useAuth();
  const dashboardFilterStorageKey = `smartlymanage.dashboard.filters:${claims.orgId || user?.uid || claims.role || 'default'}`;
  const [rangePreset, setRangePreset] = useState<DashboardRangePreset>(() => (
    readDashboardFilters(dashboardFilterStorageKey).rangePreset
  ));
  const [repId, setRepId] = useState(() => (
    claims.role === 'sales_member' ? '' : readDashboardFilters(dashboardFilterStorageKey).repId
  ));
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { from, to } = useMemo(() => resolveDashboardRange(rangePreset), [rangePreset]);

  useEffect(() => {
    if (claims.role === 'platform_owner') return;
    window.sessionStorage.setItem(dashboardFilterStorageKey, JSON.stringify({ rangePreset, repId }));
  }, [claims.role, dashboardFilterStorageKey, rangePreset, repId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    if (claims.role === 'platform_owner') {
      api.get<ApiResponse<PlatformAnalytics>>('/admin/analytics')
        .then((response) => {
          if (active) setPlatformStats(response.data.data);
        })
        .catch((requestError) => {
          if (active) setError(getApiErrorMessage(requestError, 'Failed to load platform analytics.'));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => { active = false; };
    }

    setStats(null);
    api.get<ApiResponse<TeamStats>>('/stats/team', {
      params: { from, to, ...(repId ? { repId } : {}) },
    })
      .then((response) => {
        if (active) setStats(response.data.data);
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'Failed to load dashboard statistics.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [claims.role, from, repId, to]);

  useEffect(() => {
    if (claims.role === 'platform_owner') return;
    let active = true;
    if (claims.role !== 'sales_member' && claims.orgId) {
      api.get<ApiResponse<TeamMember[]>>(`/orgs/${claims.orgId}/users`, { params: { limit: 100 } })
        .then((response) => {
          if (active) setMembers(response.data.data);
        })
        .catch(() => undefined);
    } else if (user) {
      setMembers([{
        id: user.uid,
        email: user.email ?? '',
        name: user.displayName ?? user.email ?? 'You',
        role: 'sales_member',
        status: 'active',
        createdAt: '',
        updatedAt: '',
      }]);
    }
    return () => { active = false; };
  }, [claims.orgId, claims.role, user]);

  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.id, member.name || member.email])),
    [members],
  );
  const salesReps = members.filter((member) => member.role === 'sales_member');
  const dailyTrend = useMemo(
    () => buildDashboardTrend(stats?.byRep ?? [], from, to, rangePreset),
    [from, rangePreset, stats, to],
  );
  const maximumCalls = Math.max(...dailyTrend.map((day) => day.calls), 1);
  const totals = stats?.teamTotals;
  const connectedCalls = (totals?.incomingCount ?? 0) + (totals?.outgoingCount ?? 0);
  const missedCalls = totals?.missedCount ?? 0;
  const connectRate = totals?.totalCalls ? Math.round((connectedCalls / totals.totalCalls) * 100) : 0;
  const averageDuration = connectedCalls ? (totals?.totalDurationSeconds ?? 0) / connectedCalls : 0;

  if (claims.role === 'platform_owner') {
    return (
      <div className="page animate-fade-in">
        <div className="page-header">
          <div>
            <p className="eyebrow">Platform</p>
            <h1>Owner dashboard</h1>
            <p>Monitor tenant growth and users across the Smartly Manage service.</p>
          </div>
        </div>

        {error && <div className="notice error-notice">{error}</div>}

        <div className="stats-grid" aria-busy={loading}>
          <StatCard title="Organizations" value={loading ? '—' : platformStats?.totalOrganizations ?? 0} icon={<Building2 />} tone="blue" />
          <StatCard title="Total users" value={loading ? '—' : platformStats?.totalUsers ?? 0} icon={<Users />} tone="green" />
          <StatCard title="Org admins" value={loading ? '—' : platformStats?.roleCounts.org_admin ?? 0} icon={<Activity />} tone="violet" />
          <StatCard title="Sales members" value={loading ? '—' : platformStats?.roleCounts.sales_member ?? 0} icon={<PhoneCall />} tone="orange" />
        </div>

        <section className="section-card platform-summary">
          <div className="section-heading"><div><h2>Role distribution</h2><p>Current user mix across all tenant accounts.</p></div></div>
          <div className="summary-list">
            {Object.entries(platformStats?.roleCounts ?? {}).map(([role, count]) => (
              <div className="summary-row" key={role}><span>{role.replace('_', ' ')}</span><strong>{count}</strong></div>
            ))}
            {!loading && Object.keys(platformStats?.roleCounts ?? {}).length === 0 && <EmptyState message="No users have been created yet." />}
          </div>
        </section>
      </div>
    );
  }

  const selectedRepName = repId ? memberNames.get(repId) : undefined;
  const rangeLabel = `${format(parseISO(from), 'd MMM')} to ${format(parseISO(to), 'd MMM yyyy')}`;

  return (
    <div className="page animate-fade-in">
      <div className="page-header dashboard-page-header">
        <div>
          <p className="eyebrow">Performance</p>
          <h1>Dashboard overview</h1>
          <p>{selectedRepName ? `${selectedRepName}'s call activity` : claims.role === 'sales_member' ? 'Your call activity' : 'Team call activity'} from {rangeLabel}.</p>
        </div>
        <div className="dashboard-filters" aria-label="Dashboard filters">
          {claims.role !== 'sales_member' && (
            <label>Representative
              <select className="input-field compact-select" value={repId} onChange={(event) => setRepId(event.target.value)}>
                <option value="">All representatives</option>
                {salesReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>{rep.name || rep.email}{rep.status === 'disabled' ? ' (inactive)' : ''}</option>
                ))}
              </select>
            </label>
          )}
          <label>Date range
            <select className="input-field compact-select" value={rangePreset} onChange={(event) => setRangePreset(event.target.value as DashboardRangePreset)}>
              {DASHBOARD_RANGE_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {error && <div className="notice error-notice">{error}</div>}
      <OnboardingChecklist />

      <div className="stats-grid analytics-stats-grid" aria-busy={loading}>
        <StatCard title="Total calls" value={loading ? '—' : totals?.totalCalls ?? 0} icon={<PhoneCall />} tone="blue" />
        <StatCard title="Connected" value={loading ? '—' : connectedCalls} icon={<PhoneIncoming />} tone="green" />
        <StatCard title="Missed" value={loading ? '—' : missedCalls} icon={<PhoneMissed />} tone="orange" />
        <StatCard title="Talk time" value={loading ? '—' : formatDuration(totals?.totalDurationSeconds ?? 0)} icon={<Clock />} tone="violet" />
        <StatCard title="Connect rate" value={loading ? '—' : `${connectRate}%`} icon={<Percent />} tone="green" />
        <StatCard title="Avg. duration" value={loading ? '—' : formatAverageDuration(averageDuration)} icon={<Timer />} tone="blue" />
      </div>

      <SyncHealthPanel />

      <div className="dashboard-grid dashboard-analytics-grid">
        <section className="section-card chart-card">
          <div className="section-heading"><div><h2>Call trend</h2><p>Call volume across the selected range</p></div></div>
          {dailyTrend.some((day) => day.calls > 0) ? (
            <div className="bar-chart" role="img" aria-label={`Call volume trend from ${rangeLabel}`}>
              {dailyTrend.map((day) => (
                <div className="bar-column" key={day.key} title={`${day.label}: ${day.calls} calls`}>
                  <span className="bar-value">{day.calls}</span>
                  <div className="bar" style={{ height: `${Math.max((day.calls / maximumCalls) * 100, 4)}%` }} />
                  <span className="bar-label">{day.label}</span>
                </div>
              ))}
            </div>
          ) : <EmptyState message="No calls were recorded in this range." />}
        </section>

        <OutcomeChart
          incoming={totals?.incomingCount ?? 0}
          outgoing={totals?.outgoingCount ?? 0}
          missed={missedCalls}
        />
      </div>

      <RepPerformanceChart reps={stats?.byRep ?? []} memberNames={memberNames} loading={loading} />
    </div>
  );
};

const StatCard = ({ title, value, icon, tone }: { title: string; value: string | number; icon: ReactNode; tone: string }) => (
  <div className="stat-card section-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><p>{title}</p><strong>{value}</strong></div></div>
);

const OutcomeChart = ({ incoming, outgoing, missed }: { incoming: number; outgoing: number; missed: number }) => {
  const total = incoming + outgoing + missed;
  const outgoingStop = total ? (outgoing / total) * 100 : 0;
  const incomingStop = total ? outgoingStop + (incoming / total) * 100 : 0;
  const style = total ? {
    background: `conic-gradient(#60a5fa 0 ${outgoingStop}%, #34d399 ${outgoingStop}% ${incomingStop}%, #f87171 ${incomingStop}% 100%)`,
  } as CSSProperties : undefined;
  const metrics = [
    { label: 'Outgoing', value: outgoing, color: '#60a5fa' },
    { label: 'Incoming', value: incoming, color: '#34d399' },
    { label: 'Missed', value: missed, color: '#f87171' },
  ];

  return (
    <section className="section-card outcome-card">
      <div className="section-heading"><div><h2>Call outcomes</h2><p>Incoming, outgoing, and missed share</p></div></div>
      {total > 0 ? (
        <>
          <div className="outcome-donut" style={style} role="img" aria-label={`${outgoing} outgoing, ${incoming} incoming, ${missed} missed calls`}>
            <div><strong>{total}</strong><span>Total calls</span></div>
          </div>
          <div className="outcome-legend">
            {metrics.map((metric) => (
              <div className="outcome-legend-row" key={metric.label}>
                <span className="outcome-swatch" style={{ background: metric.color }} />
                <span>{metric.label}</span><strong>{metric.value}</strong>
                <small>{Math.round((metric.value / total) * 100)}%</small>
              </div>
            ))}
          </div>
        </>
      ) : <EmptyState message="No call outcomes are available in this range." />}
    </section>
  );
};

const RepPerformanceChart = ({ reps, memberNames, loading }: { reps: RepStats[]; memberNames: Map<string, string>; loading: boolean }) => {
  const ranked = [...reps].sort((left, right) => right.totalCalls - left.totalCalls).slice(0, 8);
  return (
    <section className="section-card rep-performance-card">
      <div className="section-heading"><div><h2>{ranked.length === 1 ? 'Representative performance' : 'Rep performance'}</h2><p>Connected and missed calls, ranked by total volume</p></div></div>
      <div className="rep-performance-list">
        {ranked.map((rep, index) => {
          const connected = rep.incomingCount + rep.outgoingCount;
          const total = Math.max(rep.totalCalls, 1);
          const name = memberNames.get(rep.repId) ?? `Rep ${rep.repId.slice(0, 6)}`;
          return (
            <div className="rep-performance-row" key={rep.repId}>
              <span className="rep-rank">{index + 1}</span>
              <div className="avatar">{name.charAt(0).toUpperCase()}</div>
              <div className="rep-performance-copy">
                <div><strong>{name}</strong><span>{rep.totalCalls} calls · {formatDuration(rep.totalDurationSeconds)}</span></div>
                <div className="rep-stacked-bar" role="img" aria-label={`${name}: ${connected} connected and ${rep.missedCount} missed calls`}>
                  {connected > 0 && <span className="connected" style={{ width: `${(connected / total) * 100}%` }} />}
                  {rep.missedCount > 0 && <span className="missed" style={{ width: `${(rep.missedCount / total) * 100}%` }} />}
                </div>
              </div>
              <strong className="rep-total">{rep.totalCalls}</strong>
            </div>
          );
        })}
        {!loading && ranked.length === 0 && <EmptyState message="No representative activity yet." />}
      </div>
    </section>
  );
};

const EmptyState = ({ message }: { message: string }) => <div className="empty-state">{message}</div>;
