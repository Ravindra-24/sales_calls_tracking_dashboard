import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Building2,
  CheckCircle2,
  CircleDashed,
  Clock,
  IndianRupee,
  MoonStar,
  PhoneCall,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { api, getApiErrorMessage } from '../api/client';
import { billingPlanName, formatBillingMoney } from '../api/billing';
import type { ApiResponse, OrganizationHealth, PlatformOverview } from '../types/api';
import { buildPlatformCallTrend, PLATFORM_RANGE_OPTIONS, resolvePlatformRange, type PlatformRangePreset } from './platformDashboardView';
import '../styles/platform-dashboard.css';

const RANGE_STORAGE_KEY = 'smartlymanage.platform.range';

const HEALTH_META: Record<OrganizationHealth, { label: string; icon: ReactNode }> = {
  healthy: { label: 'Healthy', icon: <CheckCircle2 size={14} /> },
  at_risk: { label: 'At risk', icon: <AlertTriangle size={14} /> },
  dormant: { label: 'Dormant', icon: <MoonStar size={14} /> },
  never_activated: { label: 'Not activated', icon: <CircleDashed size={14} /> },
  disabled: { label: 'Disabled', icon: <Ban size={14} /> },
};
const HEALTH_ORDER: OrganizationHealth[] = ['healthy', 'at_risk', 'dormant', 'never_activated', 'disabled'];

const SEVERITY_LABEL = { high: 'Urgent', medium: 'Follow up', low: 'FYI' } as const;
const BILLING_ATTENTION = new Set(['payment_read_only', 'payment_grace', 'subscription_payment_issue', 'stuck_checkout', 'disabled_with_subscription']);

const readRange = (): PlatformRangePreset => {
  try {
    const stored = window.sessionStorage.getItem(RANGE_STORAGE_KEY);
    return PLATFORM_RANGE_OPTIONS.some((option) => option.value === stored) ? stored as PlatformRangePreset : 'last_30';
  } catch {
    return 'last_30';
  }
};

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours.toLocaleString('en-IN')}h ${minutes}m` : `${minutes}m`;
};

const count = (value: number) => value.toLocaleString('en-IN');
const plural = (value: number, word: string) => `${count(value)} ${word}${value === 1 ? '' : 's'}`;

export const PlatformDashboard = () => {
  const [rangePreset, setRangePreset] = useState<PlatformRangePreset>(readRange);
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { from, to } = useMemo(() => resolvePlatformRange(rangePreset), [rangePreset]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(RANGE_STORAGE_KEY, rangePreset);
    } catch {
      // Remembering the range is a convenience only.
    }
  }, [rangePreset]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get<ApiResponse<PlatformOverview>>('/admin/overview', { params: { from, to } })
      .then((response) => {
        if (active) setOverview(response.data.data);
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'Failed to load platform overview.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [from, to]);

  const trend = useMemo(() => buildPlatformCallTrend(overview?.trends.daily ?? []), [overview]);
  const maximumTrend = Math.max(...trend.map((point) => point.totalCalls), 1);
  const weekly = overview?.trends.weekly ?? [];
  const maximumWeekly = Math.max(...weekly.map((week) => week.newUsers), 1);
  const rangeLabel = `${format(parseISO(from), 'd MMM')} to ${format(parseISO(to), 'd MMM yyyy')}`;
  const blank = loading && !overview;

  const organizations = overview?.organizations;
  const people = overview?.people;
  const calls = overview?.calls;
  const revenue = overview?.revenue;
  const attention = overview?.attention ?? [];
  const urgent = attention.filter((item) => item.severity === 'high').length;
  const connectRate = calls?.totalCalls ? Math.round((calls.connectedCount / calls.totalCalls) * 100) : 0;
  const liveBilling = (revenue?.payingOrganizations ?? 0) > 0;

  return (
    <div className="page animate-fade-in platform-dashboard">
      <div className="page-header dashboard-page-header">
        <div>
          <p className="eyebrow">Platform</p>
          <h1>Owner dashboard</h1>
          <p>Tenants, people, usage, and revenue across Smartly Manage from {rangeLabel}.</p>
        </div>
        <div className="dashboard-filters" aria-label="Dashboard filters">
          <label>Date range
            <select className="input-field compact-select" value={rangePreset} onChange={(event) => setRangePreset(event.target.value as PlatformRangePreset)}>
              {PLATFORM_RANGE_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {error && <div className="notice error-notice">{error}</div>}

      <div className="stats-grid platform-stats-grid" aria-busy={loading}>
        <StatCard
          title="Organizations"
          value={blank ? '—' : count(organizations?.total ?? 0)}
          detail={organizations && `${count(organizations.activeLast7Days)} active this week · ${count(organizations.newInRange)} new`}
          icon={<Building2 />}
          tone="blue"
        />
        <StatCard
          title="People"
          value={blank ? '—' : count(people?.active ?? 0)}
          detail={people && `${plural(people.activeReps, 'rep')} · ${count(people.repsCallingInRange)} calling`}
          icon={<Users />}
          tone="green"
        />
        <StatCard
          title="Calls"
          value={blank ? '—' : count(calls?.totalCalls ?? 0)}
          detail={calls && `${connectRate}% connected`}
          icon={<PhoneCall />}
          tone="blue"
        />
        <StatCard
          title="Talk time"
          value={blank ? '—' : formatDuration(calls?.totalDurationSeconds ?? 0)}
          detail={calls && `${count(calls.connectedCount)} connected calls`}
          icon={<Clock />}
          tone="violet"
        />
        <StatCard
          title="MRR"
          value={blank ? '—' : formatBillingMoney(revenue?.mrrPaise ?? 0)}
          detail={revenue && (liveBilling || revenue.testPayingOrganizations === 0
            ? plural(revenue.payingOrganizations, 'paying org')
            : `No live billing yet · ${formatBillingMoney(revenue.testMrrPaise)} in test mode`)}
          icon={<IndianRupee />}
          tone="green"
        />
        <StatCard
          title="Needs attention"
          value={blank ? '—' : count(attention.length)}
          detail={overview && (urgent ? `${count(urgent)} urgent` : 'Nothing urgent')}
          icon={<ShieldAlert />}
          tone={urgent ? 'danger' : 'orange'}
        />
      </div>

      <section className="section-card platform-attention">
        <div className="section-heading"><div><h2>Needs attention</h2><p>Billing, setup, and sync problems across tenants, most urgent first.</p></div></div>
        {attention.length > 0 ? (
          <ul className="platform-attention-list">
            {attention.map((item) => (
              <li className={`platform-attention-row ${item.severity}`} key={`${item.orgId}-${item.kind}`}>
                <span className={`platform-severity ${item.severity}`}>{item.severity === 'high' ? <AlertTriangle size={13} /> : null}{SEVERITY_LABEL[item.severity]}</span>
                <div>
                  <Link to={`/dashboard/platform/organizations/${item.orgId}`}><strong>{item.orgName}</strong></Link>
                  <span>{item.message}</span>
                </div>
                {BILLING_ATTENTION.has(item.kind) ? (
                  <Link className="secondary-button" to={`/dashboard/billing-operations?search=${encodeURIComponent(item.orgId)}`}>Billing</Link>
                ) : (
                  <Link className="secondary-button" to={`/dashboard/platform/organizations/${item.orgId}`}>Open</Link>
                )}
              </li>
            ))}
          </ul>
        ) : <EmptyState message={loading ? 'Checking tenants…' : 'No tenant needs attention right now.'} />}
      </section>

      <div className="dashboard-grid">
        <section className="section-card chart-card">
          <div className="section-heading"><div><h2>Platform call volume</h2><p>{trend.length > 0 && trend[0].weekly ? 'Calls per week' : 'Calls per day'} across all tenants</p></div></div>
          {trend.some((point) => point.totalCalls > 0) ? (
            <div className="bar-chart" role="img" aria-label={`Platform call volume from ${rangeLabel}`}>
              {trend.map((point) => (
                <div className="bar-column" key={point.key} title={`${point.title}: ${count(point.totalCalls)} calls, ${count(point.connectedCount)} connected${point.activeOrganizations === null ? '' : `, ${plural(point.activeOrganizations, 'active org')}`}`}>
                  <span className="bar-value">{point.showValue ? count(point.totalCalls) : ''}</span>
                  <div className="bar" style={{ height: `${Math.max((point.totalCalls / maximumTrend) * 100, 4)}%` }} />
                  <span className="bar-label">{point.label}</span>
                </div>
              ))}
            </div>
          ) : <EmptyState message={loading ? 'Loading…' : 'No calls were recorded in this range.'} />}
        </section>

        <section className="section-card">
          <div className="section-heading"><div><h2>Tenant health</h2><p>Every organization, by current usage and billing state.</p></div></div>
          <div className="summary-list">
            {HEALTH_ORDER.map((health) => (
              <div className="summary-row platform-health-row" key={health}>
                <HealthBadge health={health} />
                <strong>{blank ? '—' : count(organizations?.byHealth[health] ?? 0)}</strong>
              </div>
            ))}
          </div>
          <p className="platform-footnote">Dormant: no calls for 14 days. At risk: calls halved week over week, or a payment problem.</p>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="section-card chart-card">
          <div className="section-heading">
            <div><h2>Sign-ups</h2><p>New tenant users per week, last 12 weeks</p></div>
            {weekly.length > 0 && (
              <div className="platform-growth-totals">
                <span><strong>{count(weekly.at(-1)?.totalOrganizations ?? 0)}</strong> orgs</span>
                <span><strong>{count(weekly.at(-1)?.totalUsers ?? 0)}</strong> users</span>
              </div>
            )}
          </div>
          {weekly.length > 0 ? (
            <div className="bar-chart" role="img" aria-label="New tenant users per week for the last 12 weeks">
              {weekly.map((week) => (
                <div
                  className="bar-column"
                  key={week.weekStart}
                  title={`Week of ${format(parseISO(week.weekStart), 'd MMM')}: ${plural(week.newUsers, 'new user')}, ${plural(week.newOrganizations, 'new org')}`}
                >
                  <span className="bar-value">{week.newUsers || ''}</span>
                  <div className="bar" style={{ height: `${Math.max((week.newUsers / maximumWeekly) * 100, 4)}%` }} />
                  <span className="bar-label">{format(parseISO(week.weekStart), 'd MMM')}</span>
                </div>
              ))}
            </div>
          ) : <EmptyState message={loading ? 'Loading…' : 'No sign-up history yet.'} />}
        </section>

        <section className="section-card">
          <div className="section-heading"><div><h2>Plans</h2><p>Current plan per organization, from billing records.</p></div></div>
          <div className="summary-list">
            {Object.entries(revenue?.planMix ?? {}).map(([plan, planCount]) => (
              <div className="summary-row" key={plan}><span>{billingPlanName(plan)}</span><strong>{count(planCount)}</strong></div>
            ))}
          </div>
          <h3 className="platform-subheading">Renewals in the next 14 days</h3>
          {revenue && revenue.renewalsDue.length > 0 ? (
            <ul className="platform-renewals">
              {revenue.renewalsDue.map((renewal) => (
                <li key={renewal.orgId}>
                  <Link to={`/dashboard/platform/organizations/${renewal.orgId}`}>{renewal.orgName}</Link>
                  <span>{billingPlanName(renewal.planCode)}{renewal.mode === 'test' ? ' (test)' : ''} · {renewal.cancelAtCycleEnd ? 'ends' : 'renews'} {format(parseISO(renewal.currentPeriodEnd), 'd MMM')}</span>
                </li>
              ))}
            </ul>
          ) : <p className="platform-footnote">{loading ? 'Loading…' : 'None due.'}</p>}
        </section>
      </div>

      <section className="section-card">
        <div className="section-heading">
          <div><h2>Tenants</h2><p>Ranked by calls in the selected range.</p></div>
          <Link className="secondary-button" to="/dashboard/platform">All tenants <ArrowRight size={14} /></Link>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Organization</th><th>Plan</th><th>Health</th><th>Reps</th><th>Calls</th><th>Last 7 days</th><th>Last call</th></tr></thead>
            <tbody>
              {blank ? (
                <tr><td colSpan={7} className="table-message">Loading tenants…</td></tr>
              ) : (overview?.tenants ?? []).length === 0 ? (
                <tr><td colSpan={7} className="table-message">No organizations yet.</td></tr>
              ) : overview?.tenants.map((tenant) => (
                <tr key={tenant.orgId}>
                  <td data-label="Organization"><Link className="platform-org-link" to={`/dashboard/platform/organizations/${tenant.orgId}`}><strong>{tenant.name}</strong></Link></td>
                  <td data-label="Plan"><span className="role-badge">{billingPlanName(tenant.plan)}</span></td>
                  <td data-label="Health"><HealthBadge health={tenant.health} /></td>
                  <td data-label="Reps">{count(tenant.activeReps)}<small className="platform-muted"> / {count(tenant.members)} members</small></td>
                  <td data-label="Calls">{count(tenant.callsInRange)}</td>
                  <td data-label="Last 7 days">{count(tenant.callsLast7Days)} <WeekChange current={tenant.callsLast7Days} previous={tenant.callsPrevious7Days} /></td>
                  <td data-label="Last call">{tenant.lastCallAt ? `${formatDistanceToNowStrict(parseISO(tenant.lastCallAt))} ago` : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const StatCard = ({ title, value, detail, icon, tone }: { title: string; value: string | number; detail?: string | null; icon: ReactNode; tone: string }) => (
  <div className="stat-card section-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><p>{title}</p><strong>{value}</strong>{detail && <small>{detail}</small>}</div></div>
);

const HealthBadge = ({ health }: { health: OrganizationHealth }) => (
  <span className={`platform-health ${health}`}>{HEALTH_META[health].icon}{HEALTH_META[health].label}</span>
);

const WeekChange = ({ current, previous }: { current: number; previous: number }) => {
  if (previous === 0) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  return <small className="platform-muted">({change > 0 ? '+' : ''}{change}% vs prior week)</small>;
};

const EmptyState = ({ message }: { message: string }) => <div className="empty-state">{message}</div>;
