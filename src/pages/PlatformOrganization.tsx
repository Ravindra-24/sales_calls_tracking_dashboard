import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  ArrowLeft,
  Building2,
  Clock,
  CreditCard,
  LogIn,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  Power,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Timer,
  Users,
  X,
} from 'lucide-react';
import { differenceInCalendarDays, format, subDays } from 'date-fns';
import { signInWithCustomToken } from 'firebase/auth';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/client';
import { auth } from '../config/firebase';
import { useAuth } from '../context/auth';
import { useFeedback } from '../context/feedback';
import type {
  ApiResponse,
  ImpersonationStartResult,
  PlatformEmployee,
  PlatformOrganizationOverview,
  TeamStats,
} from '../types/api';
import { buildDashboardTrend, type DashboardRangePreset } from './dashboardAnalytics';

type RangePreset = '7' | '30' | '90' | 'custom';
type EmployeeRoleFilter = 'all' | PlatformEmployee['role'];
type EmployeeStatusFilter = 'all' | PlatformEmployee['status'];

const isoDate = (date: Date) => format(date, 'yyyy-MM-dd');
const formatDateTime = (value: string | null | undefined) => (
  value ? format(new Date(value), 'd MMM yyyy, h:mm a') : '—'
);
const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const rangeForPreset = (preset: Exclude<RangePreset, 'custom'>) => ({
  from: isoDate(subDays(new Date(), Number(preset) - 1)),
  to: isoDate(new Date()),
});

const StatCard = ({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  tone: string;
}) => (
  <div className="stat-card section-card">
    <div className={`stat-icon ${tone}`}>{icon}</div>
    <div><p>{title}</p><strong>{value}</strong></div>
  </div>
);

export const PlatformOrganization = () => {
  const { orgId = '' } = useParams();
  const navigate = useNavigate();
  const { claims } = useAuth();
  const { confirm, toast } = useFeedback();
  const initialRange = rangeForPreset('30');
  const [overview, setOverview] = useState<PlatformOrganizationOverview | null>(null);
  const [employees, setEmployees] = useState<PlatformEmployee[]>([]);
  const [analytics, setAnalytics] = useState<TeamStats | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [rangePreset, setRangePreset] = useState<RangePreset>('30');
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [repId, setRepId] = useState('');
  const [roleFilter, setRoleFilter] = useState<EmployeeRoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState('');
  const [impersonationTarget, setImpersonationTarget] = useState<PlatformEmployee | null>(null);
  const [impersonationReason, setImpersonationReason] = useState('');
  const [impersonationError, setImpersonationError] = useState('');
  const [impersonationSubmitting, setImpersonationSubmitting] = useState(false);

  const loadEmployees = useCallback(async (cursor?: string) => {
    const response = await api.get<ApiResponse<PlatformEmployee[]>>(
      `/admin/organizations/${orgId}/users`,
      { params: { limit: 100, ...(cursor ? { cursor } : {}) } },
    );
    setEmployees((current) => cursor ? [...current, ...response.data.data] : response.data.data);
    setNextCursor(response.data.meta?.nextCursor);
  }, [orgId]);

  const loadOverview = useCallback(async () => {
    const response = await api.get<ApiResponse<PlatformOrganizationOverview>>(
      `/admin/organizations/${orgId}`,
    );
    setOverview(response.data.data);
  }, [orgId]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const response = await api.get<ApiResponse<TeamStats>>(
        `/admin/organizations/${orgId}/analytics`,
        { params: { from, to, ...(repId ? { repId } : {}) } },
      );
      setAnalytics(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load organization analytics.'));
    } finally {
      setAnalyticsLoading(false);
    }
  }, [from, orgId, repId, to]);

  useEffect(() => {
    if (claims.role !== 'platform_owner' || !orgId) return;
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([loadOverview(), loadEmployees()])
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'Failed to load organization details.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [claims.role, loadEmployees, loadOverview, orgId]);

  useEffect(() => {
    if (claims.role === 'platform_owner' && orgId) void loadAnalytics();
  }, [claims.role, loadAnalytics, orgId]);

  const changeRangePreset = (value: RangePreset) => {
    setRangePreset(value);
    if (value !== 'custom') {
      const range = rangeForPreset(value);
      setFrom(range.from);
      setTo(range.to);
    }
  };

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      await loadEmployees(nextCursor);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load more employees.'));
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleOrganizationStatus = async () => {
    if (!overview) return;
    const nextStatus = overview.organization.status === 'active' ? 'disabled' : 'active';
    if (nextStatus === 'disabled') {
      const approved = await confirm({
        title: `Disable ${overview.organization.name}?`,
        message: 'Its users and integration access will be blocked until the organization is enabled again.',
        confirmLabel: 'Disable organization',
        variant: 'danger',
      });
      if (!approved) return;
    }
    setUpdatingStatus(true);
    try {
      await api.patch(`/admin/organizations/${orgId}`, { status: nextStatus });
      setOverview((current) => current ? {
        ...current,
        organization: { ...current.organization, status: nextStatus },
      } : current);
      toast({
        title: `Organization ${nextStatus === 'active' ? 'enabled' : 'disabled'}`,
        message: `${overview.organization.name} is now ${nextStatus}.`,
        variant: 'success',
      });
    } catch (requestError) {
      toast({
        title: 'Organization not updated',
        message: getApiErrorMessage(requestError, 'Failed to update organization.'),
        variant: 'error',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const startImpersonation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!impersonationTarget) return;
    const reason = impersonationReason.trim();
    if (reason.length < 10) {
      setImpersonationError('Enter a support reason of at least 10 characters.');
      return;
    }
    setImpersonationSubmitting(true);
    setImpersonationError('');
    try {
      const response = await api.post<ApiResponse<ImpersonationStartResult>>(
        `/admin/impersonate/${impersonationTarget.id}`,
        { reason },
      );
      await signInWithCustomToken(auth, response.data.data.customToken);
      toast({
        title: 'Impersonation started',
        message: `You are now viewing Smartly Manage as ${impersonationTarget.name}.`,
        variant: 'success',
      });
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setImpersonationError(getApiErrorMessage(requestError, 'Could not start impersonation.'));
      setImpersonationSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter((employee) => (
    (roleFilter === 'all' || employee.role === roleFilter) &&
    (statusFilter === 'all' || employee.status === statusFilter)
  ));
  const employeeNames = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee.name || employee.email])),
    [employees],
  );
  const totals = analytics?.teamTotals;
  const connected = (totals?.incomingCount ?? 0) + (totals?.outgoingCount ?? 0);
  const connectRate = totals?.totalCalls ? Math.round((connected / totals.totalCalls) * 100) : 0;
  const trendPreset: DashboardRangePreset = useMemo(() => {
    const days = differenceInCalendarDays(new Date(to), new Date(from)) + 1;
    if (days > 120) return 'yearly';
    if (days > 45) return 'quarterly';
    if (days <= 7) return 'last_week';
    return 'last_month';
  }, [from, to]);
  const trend = useMemo(
    () => buildDashboardTrend(analytics?.byRep ?? [], from, to, trendPreset),
    [analytics, from, to, trendPreset],
  );
  const maximumCalls = Math.max(...trend.map((point) => point.calls), 1);
  const rankedReps = [...(analytics?.byRep ?? [])]
    .sort((left, right) => right.totalCalls - left.totalCalls);

  if (claims.role !== 'platform_owner') {
    return <div className="page"><div className="notice error-notice">Only platform owners can inspect organizations.</div></div>;
  }

  if (loading && !overview) {
    return <div className="page platform-org-loader">Loading organization details…</div>;
  }

  if (!overview) {
    return (
      <div className="page">
        <Link className="secondary-button" to="/dashboard/platform"><ArrowLeft size={16} /> Back to organizations</Link>
        <div className="notice error-notice">{error || 'Organization details are unavailable.'}</div>
      </div>
    );
  }

  const { organization, primaryAdmin, users, activity, syncHealth, billing } = overview;

  return (
    <div className="page animate-fade-in platform-org-page">
      <div className="platform-org-breadcrumb">
        <Link to="/dashboard/platform"><ArrowLeft size={15} /> Organizations</Link>
        <span>/</span><strong>{organization.name}</strong>
      </div>
      <header className="page-header platform-org-header">
        <div>
          <p className="eyebrow">Organization details</p>
          <h1>{organization.name}</h1>
          <div className="platform-org-header-meta">
            <span className={`status-badge ${organization.status}`}><i /> {organization.status}</span>
            <span className="role-badge">{organization.plan}</span>
            <code>{organization.id}</code>
          </div>
        </div>
        <div className="platform-org-actions">
          <Link className="secondary-button" to={`/dashboard/billing-operations?search=${encodeURIComponent(organization.id)}`}><CreditCard size={16} /> Billing operations</Link>
          <button className={`secondary-button ${organization.status === 'active' ? 'danger-button' : ''}`} disabled={updatingStatus} onClick={() => void toggleOrganizationStatus()}>
            <Power size={16} /> {updatingStatus ? 'Updating…' : organization.status === 'active' ? 'Disable' : 'Enable'}
          </button>
        </div>
      </header>

      {error && <div className="notice error-notice">{error}</div>}

      <section className="platform-org-section" aria-labelledby="overview-heading">
        <div className="section-heading"><div><h2 id="overview-heading">Overview</h2><p>Tenant identity, ownership, activity, and service health.</p></div><Building2 size={21} /></div>
        <div className="stats-grid">
          <StatCard title="Employees" value={users.total} icon={<Users />} tone="blue" />
          <StatCard title="Active employees" value={users.active} icon={<ShieldCheck />} tone="green" />
          <StatCard title="Devices healthy" value={`${syncHealth.healthy}/${syncHealth.totalDevices}`} icon={<Smartphone />} tone="violet" />
          <StatCard title="Needs attention" value={syncHealth.attention} icon={<Activity />} tone="orange" />
        </div>
        <div className="platform-org-overview-grid">
          <article className="section-card platform-org-info-card">
            <h3>Organization</h3>
            <dl>
              <div><dt>Primary admin</dt><dd>{primaryAdmin ? `${primaryAdmin.name} · ${primaryAdmin.email}` : '—'}</dd></div>
              <div><dt>Timezone</dt><dd>{organization.settings.timezone || '—'}</dd></div>
              <div><dt>Working hours</dt><dd>{organization.settings.workingHoursStart && organization.settings.workingHoursEnd ? `${organization.settings.workingHoursStart}–${organization.settings.workingHoursEnd}` : 'Not configured'}</dd></div>
              <div><dt>Created</dt><dd>{formatDateTime(organization.createdAt)}</dd></div>
            </dl>
          </article>
          <article className="section-card platform-org-info-card">
            <h3>Recent activity</h3>
            <dl>
              <div><dt>Last call</dt><dd>{formatDateTime(activity.lastCallAt)}</dd></div>
              <div><dt>Last successful sync</dt><dd>{formatDateTime(activity.lastSyncAt)}</dd></div>
              <div><dt>Disabled employees</dt><dd>{users.disabled}</dd></div>
              <div><dt>Managers / sales members</dt><dd>{users.roleCounts.manager ?? 0} / {users.roleCounts.sales_member ?? 0}</dd></div>
            </dl>
          </article>
        </div>
      </section>

      <section className="platform-org-section section-card table-card" aria-labelledby="employees-heading">
        <div className="section-heading table-heading">
          <div><h2 id="employees-heading">Employees</h2><p>People and account activity currently attached to this tenant.</p></div>
          <div className="platform-org-filters">
            <label>Role<select className="input-field" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as EmployeeRoleFilter)}><option value="all">All roles</option><option value="org_admin">Org admins</option><option value="manager">Managers</option><option value="sales_member">Sales members</option></select></label>
            <label>Status<select className="input-field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as EmployeeStatusFilter)}><option value="all">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table platform-employee-table">
            <thead><tr><th>Employee</th><th>Role</th><th>Status</th><th>Phone</th><th>Joined</th><th>Last sign-in</th><th>Device last seen</th><th>Support</th></tr></thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td data-label="Employee"><div className="member-cell"><div className="avatar">{employee.name.charAt(0).toUpperCase()}</div><div><strong>{employee.name}</strong><span>{employee.email}</span></div></div></td>
                  <td data-label="Role"><span className={`role-badge ${employee.role}`}>{employee.role.replace('_', ' ')}</span></td>
                  <td data-label="Status"><span className={`status-badge ${employee.status}`}><i /> {employee.accountDisabled ? 'auth disabled' : employee.status}</span></td>
                  <td data-label="Phone">{employee.phoneNumber || '—'}</td>
                  <td data-label="Joined">{formatDateTime(employee.createdAt)}</td>
                  <td data-label="Last sign-in">{formatDateTime(employee.lastSignInAt)}</td>
                  <td data-label="Device last seen">{formatDateTime(employee.lastSeenAt)}</td>
                  <td data-label="Support"><button className="secondary-button" type="button" disabled={employee.status !== 'active' || employee.accountDisabled || organization.status !== 'active'} onClick={() => { setImpersonationTarget(employee); setImpersonationReason(''); setImpersonationError(''); }}><LogIn size={15} /> Login as</button></td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && <tr><td colSpan={8} className="table-message">No employees match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        {nextCursor && <div className="platform-org-load-more"><button className="secondary-button" disabled={loadingMore} onClick={() => void loadMore()}><RefreshCw size={15} /> {loadingMore ? 'Loading…' : 'Load more employees'}</button></div>}
      </section>

      <section className="platform-org-section" aria-labelledby="analytics-heading">
        <div className="section-heading platform-analytics-heading">
          <div><h2 id="analytics-heading">Operational analytics</h2><p>Aggregate call performance without exposing customer phone records.</p></div>
          <div className="platform-org-filters">
            <label>Range<select className="input-field" value={rangePreset} onChange={(event) => changeRangePreset(event.target.value as RangePreset)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="custom">Custom</option></select></label>
            {rangePreset === 'custom' && <><label>From<input className="input-field" type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label><label>To<input className="input-field" type="date" value={to} min={from} max={isoDate(new Date())} onChange={(event) => setTo(event.target.value)} /></label></>}
            <label>Representative<select className="input-field" value={repId} onChange={(event) => setRepId(event.target.value)}><option value="">All representatives</option>{employees.filter((employee) => employee.role === 'sales_member').map((employee) => <option value={employee.id} key={employee.id}>{employee.name}</option>)}</select></label>
          </div>
        </div>
        <div className="stats-grid analytics-stats-grid" aria-busy={analyticsLoading}>
          <StatCard title="Total calls" value={analyticsLoading ? '—' : totals?.totalCalls ?? 0} icon={<PhoneCall />} tone="blue" />
          <StatCard title="Connected" value={analyticsLoading ? '—' : connected} icon={<PhoneIncoming />} tone="green" />
          <StatCard title="Missed" value={analyticsLoading ? '—' : totals?.missedCount ?? 0} icon={<PhoneMissed />} tone="orange" />
          <StatCard title="Talk time" value={analyticsLoading ? '—' : formatDuration(totals?.totalDurationSeconds ?? 0)} icon={<Timer />} tone="violet" />
          <StatCard title="Connect rate" value={analyticsLoading ? '—' : `${connectRate}%`} icon={<Activity />} tone="green" />
          <StatCard title="Active reps" value={analyticsLoading ? '—' : analytics?.byRep.length ?? 0} icon={<Users />} tone="blue" />
        </div>
        <div className="analytics-grid">
          <article className="section-card trend-card">
            <div className="section-heading"><div><h3>Call trend</h3><p>{from} to {to}</p></div><Clock size={20} /></div>
            {trend.some((point) => point.calls > 0) ? <div className="bar-chart">{trend.map((point) => <div className="bar-column" key={point.key}><span className="bar-value">{point.calls}</span><div className="bar" style={{ height: `${Math.max((point.calls / maximumCalls) * 100, 4)}%` }} /><span className="bar-label">{point.label}</span></div>)}</div> : <div className="empty-state">No calls were recorded in this range.</div>}
          </article>
          <article className="section-card platform-rep-ranking">
            <div className="section-heading"><div><h3>Representative ranking</h3><p>Ranked by total call volume.</p></div></div>
            <div className="summary-list">
              {rankedReps.map((rep, index) => <div className="summary-row" key={rep.repId}><span>{index + 1}. {employeeNames.get(rep.repId) ?? `Rep ${rep.repId.slice(0, 6)}`}</span><strong>{rep.totalCalls}</strong></div>)}
              {!analyticsLoading && rankedReps.length === 0 && <div className="empty-state">No representative activity yet.</div>}
            </div>
          </article>
        </div>
      </section>

      <section className="platform-org-section section-card platform-billing-card" aria-labelledby="billing-heading">
        <div className="section-heading"><div><h2 id="billing-heading">Billing</h2><p>Current local billing projection for this organization.</p></div><CreditCard size={21} /></div>
        <div className="platform-billing-details">
          <div><span>Effective plan</span><strong>{billing.account?.effectivePlan ?? organization.plan}</strong></div>
          <div><span>Subscription</span><strong>{billing.subscription?.status ?? 'No paid subscription'}</strong></div>
          <div><span>Access mode</span><strong>{billing.account?.accessMode ?? 'full'}</strong></div>
          <div><span>Current period ends</span><strong>{formatDateTime(billing.subscription?.currentPeriodEnd ?? billing.account?.currentPeriodEnd)}</strong></div>
        </div>
        <Link className="secondary-button" to={`/dashboard/billing-operations?search=${encodeURIComponent(organization.id)}`}>Open filtered billing operations</Link>
      </section>

      {impersonationTarget && (
        <div className="impersonation-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !impersonationSubmitting) setImpersonationTarget(null); }}>
          <section className="impersonation-modal" role="dialog" aria-modal="true" aria-labelledby="org-impersonation-title">
            <button className="impersonation-modal-close" type="button" aria-label="Close impersonation dialog" disabled={impersonationSubmitting} onClick={() => setImpersonationTarget(null)}><X size={19} /></button>
            <div className="impersonation-modal-heading"><span><LogIn size={20} /></span><div><p className="eyebrow">Support access</p><h2 id="org-impersonation-title">Login as {impersonationTarget.name}</h2><p>You will view {organization.name} with {impersonationTarget.name}’s {impersonationTarget.role.replace('_', ' ')} permissions.</p></div></div>
            <form onSubmit={startImpersonation}>
              <label>Required support reason<textarea className="input-field" rows={4} minLength={10} maxLength={500} value={impersonationReason} disabled={impersonationSubmitting} onChange={(event) => setImpersonationReason(event.target.value)} required /></label>
              <div className="impersonation-warning">This action is audited. Changes made during impersonation use the selected employee’s access.</div>
              {impersonationError && <div className="notice error-notice" role="alert">{impersonationError}</div>}
              <div className="impersonation-modal-actions"><button className="secondary-button" type="button" disabled={impersonationSubmitting} onClick={() => setImpersonationTarget(null)}>Cancel</button><button className="btn-primary" type="submit" disabled={impersonationSubmitting}><LogIn size={16} /> {impersonationSubmitting ? 'Switching…' : 'Confirm and login'}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
