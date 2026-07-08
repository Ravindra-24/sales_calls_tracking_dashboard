import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, Building2, Clock, PhoneCall, PhoneIncoming, PhoneMissed, PhoneOutgoing, Users } from 'lucide-react';
import { eachDayOfInterval, format, parseISO, subDays } from 'date-fns';
import { api, getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/auth';
import type { ApiResponse, PlatformAnalytics, TeamMember, TeamStats } from '../types/api';

const today = format(new Date(), 'yyyy-MM-dd');

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

export const Dashboard = () => {
  const { user, claims } = useAuth();
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const from = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');

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
      return () => {
        active = false;
      };
    }

    api.get<ApiResponse<TeamStats>>('/stats/team', { params: { from, to: today } })
      .then(async (statsResponse) => {
        let nextMembers: TeamMember[] = [];
        if (claims.role !== 'sales_member' && claims.orgId) {
          const usersResponse = await api.get<ApiResponse<TeamMember[]>>(
            `/orgs/${claims.orgId}/users`,
            { params: { limit: 100 } },
          );
          nextMembers = usersResponse.data.data;
        } else if (user) {
          nextMembers = [{
            id: user.uid,
            email: user.email ?? '',
            name: user.displayName ?? user.email ?? 'You',
            role: 'sales_member',
            status: 'active',
            createdAt: '',
            updatedAt: '',
          }];
        }
        if (active) {
          setStats(statsResponse.data.data);
          setMembers(nextMembers);
        }
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'Failed to load dashboard statistics.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [claims.orgId, claims.role, days, from, user]);

  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.id, member.name || member.email])),
    [members],
  );

  const dailyTrend = useMemo(() => {
    const totals = new Map<string, number>();
    stats?.byRep.forEach((rep) => {
      rep.dailyBreakdown.forEach((day) => {
        totals.set(day.date, (totals.get(day.date) ?? 0) + day.totalCalls);
      });
    });
    return eachDayOfInterval({ start: parseISO(from), end: parseISO(today) }).map((date) => {
      const key = format(date, 'yyyy-MM-dd');
      return { date: key, label: format(date, days > 7 ? 'd MMM' : 'EEE'), calls: totals.get(key) ?? 0 };
    });
  }, [days, from, stats]);

  const maximumCalls = Math.max(...dailyTrend.map((day) => day.calls), 1);
  const totals = stats?.teamTotals;
  const isSalesMember = claims.role === 'sales_member';
  const connectedCalls = (totals?.incomingCount ?? 0) + (totals?.outgoingCount ?? 0);
  const activeReps = members.filter((member) => member.role === 'sales_member' && member.status === 'active').length;

  if (claims.role === 'platform_owner') {
    return (
      <div className="page animate-fade-in">
        <div className="page-header">
          <div>
            <p className="eyebrow">Platform</p>
            <h1>Owner dashboard</h1>
            <p>Monitor tenant growth and users across the LeadWatch service.</p>
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
          <div className="section-heading">
            <div>
              <h2>Role distribution</h2>
              <p>Current user mix across all tenant accounts.</p>
            </div>
          </div>
          <div className="summary-list">
            {Object.entries(platformStats?.roleCounts ?? {}).map(([role, count]) => (
              <div className="summary-row" key={role}>
                <span>{role.replace('_', ' ')}</span>
                <strong>{count}</strong>
              </div>
            ))}
            {!loading && Object.keys(platformStats?.roleCounts ?? {}).length === 0 && <EmptyState message="No users have been created yet." />}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <p className="eyebrow">Performance</p>
          <h1>Dashboard overview</h1>
          <p>{claims.role === 'sales_member' ? 'Your call activity' : 'Team call activity'} from {format(parseISO(from), 'd MMM')} to {format(parseISO(today), 'd MMM yyyy')}.</p>
        </div>
        <select className="input-field compact-select" value={days} onChange={(event) => setDays(Number(event.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {error && <div className="notice error-notice">{error}</div>}

      <div className="stats-grid" aria-busy={loading}>
        <StatCard title="Total calls" value={loading ? '—' : totals?.totalCalls ?? 0} icon={<PhoneCall />} tone="blue" />
        <StatCard title="Talk time" value={loading ? '—' : formatDuration(totals?.totalDurationSeconds ?? 0)} icon={<Clock />} tone="violet" />
        <StatCard
          title={isSalesMember ? 'Connected calls' : 'Active reps'}
          value={loading ? '—' : isSalesMember ? connectedCalls : activeReps}
          icon={isSalesMember ? <PhoneIncoming /> : <Activity />}
          tone="green"
        />
        <StatCard title="Missed calls" value={loading ? '—' : totals?.missedCount ?? 0} icon={<PhoneMissed />} tone="orange" />
      </div>

      <div className="dashboard-grid">
        <section className="section-card chart-card">
          <div className="section-heading">
            <div>
              <h2>Call trend</h2>
              <p>{claims.role === 'sales_member' ? 'Daily call volume from your device' : 'Daily call volume across the team'}</p>
            </div>
          </div>
          {dailyTrend.some((day) => day.calls > 0) ? (
            <div className="bar-chart" role="img" aria-label="Daily team call volume">
              {dailyTrend.map((day) => (
                <div className="bar-column" key={day.date} title={`${day.date}: ${day.calls} calls`}>
                  <span className="bar-value">{day.calls}</span>
                  <div className="bar" style={{ height: `${Math.max((day.calls / maximumCalls) * 100, 4)}%` }} />
                  <span className="bar-label">{day.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No calls were recorded in this range." />
          )}
        </section>

        <section className="section-card">
          <div className="section-heading">
            <div>
              <h2>{claims.role === 'sales_member' ? 'Your performance' : 'Top representatives'}</h2>
              <p>{claims.role === 'sales_member' ? 'Total calls and talk time' : 'Ranked by total calls'}</p>
            </div>
          </div>
          <div className="rep-list">
            {[...(stats?.byRep ?? [])]
              .sort((left, right) => right.totalCalls - left.totalCalls)
              .slice(0, 6)
              .map((rep) => (
                <div className="rep-row" key={rep.repId}>
                  <div className="avatar">{(memberNames.get(rep.repId) ?? 'R').charAt(0).toUpperCase()}</div>
                  <div className="rep-summary">
                    <strong>{memberNames.get(rep.repId) ?? `Rep ${rep.repId.slice(0, 6)}`}</strong>
                    <span>{formatDuration(rep.totalDurationSeconds)} talk time</span>
                  </div>
                  <strong>{rep.totalCalls}</strong>
                </div>
              ))}
            {!loading && stats?.byRep.length === 0 && <EmptyState message="No representative activity yet." />}
          </div>
        </section>
      </div>

      <section className="section-card direction-summary">
        <DirectionMetric icon={<PhoneOutgoing />} label="Outgoing" value={totals?.outgoingCount ?? 0} />
        <DirectionMetric icon={<PhoneIncoming />} label="Incoming" value={totals?.incomingCount ?? 0} />
        <DirectionMetric icon={<PhoneMissed />} label="Missed" value={totals?.missedCount ?? 0} />
      </section>
    </div>
  );
};

const StatCard = ({ title, value, icon, tone }: { title: string; value: string | number; icon: ReactNode; tone: string }) => (
  <div className="stat-card section-card">
    <div className={`stat-icon ${tone}`}>{icon}</div>
    <div><p>{title}</p><strong>{value}</strong></div>
  </div>
);

const DirectionMetric = ({ icon, label, value }: { icon: ReactNode; label: string; value: number }) => (
  <div className="direction-metric"><span>{icon}</span><div><strong>{value}</strong><p>{label}</p></div></div>
);

const EmptyState = ({ message }: { message: string }) => <div className="empty-state">{message}</div>;
