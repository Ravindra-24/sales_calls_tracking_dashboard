import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, MapPin, PhoneCall, RefreshCw, UserCheck, Users } from 'lucide-react';
import { format } from 'date-fns';
import { api, getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/auth';
import type { ApiResponse, TeamMember, TeamToday, TeamTodayFlag, TeamTodayRow } from '../types/api';

const REFRESH_MS = 60_000;

const FLAG_LABELS: Record<TeamTodayFlag, string> = {
  not_started: 'Not started',
  tracking_dropped: 'Tracking dropped',
  idle_now: 'No recent calls',
  quick_hangups: 'Many quick hang-ups',
  target_behind: 'Behind target',
  device_issue: 'Device issue',
};

type RowFilter = 'all' | 'attention' | 'not_started' | 'on_shift';

const minuteLabel = (minute: number | null) => {
  if (minute === null) return null;
  const whole = Math.floor(minute);
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
};

const durationLabel = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
};

const statusFor = (row: TeamTodayRow) => {
  if (row.onShift && row.trackingStale) return { label: 'On shift · signal lost', tone: 'warn' };
  if (row.onShift) return { label: 'On shift', tone: 'good' };
  if (row.shiftStartedAtMs !== null) return { label: 'Shift ended', tone: 'muted' };
  if (row.calls > 0) return { label: 'Calling', tone: 'good' };
  if (row.flags.includes('not_started')) return { label: 'Not started', tone: 'bad' };
  return { label: 'Not started yet', tone: 'muted' };
};

export const MyTeam = () => {
  const { claims } = useAuth();
  const [data, setData] = useState<TeamToday | null>(null);
  const [managers, setManagers] = useState<TeamMember[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [managerId, setManagerId] = useState('');
  const [filter, setFilter] = useState<RowFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await api.get<ApiResponse<TeamToday>>('/stats/team-today', {
        params: managerId ? { managerId } : undefined,
      });
      setData(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load your team.'));
    } finally {
      setLoading(false);
    }
  }, [managerId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { void load(); }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  // Managers the viewer can narrow to, and names for "reports to".
  useEffect(() => {
    if (!claims.orgId) return;
    api.get<ApiResponse<TeamMember[]>>(`/orgs/${claims.orgId}/users`, { params: { limit: 100 } })
      .then((response) => {
        const members = response.data.data;
        setNames(new Map(members.map((member) => [member.id, member.name || member.email])));
        setManagers(members.filter((member) => member.role === 'manager' && member.status === 'active'));
      })
      .catch(() => undefined);
  }, [claims.orgId]);

  const rows = useMemo(() => (data?.rows ?? []).filter((row) => {
    if (filter === 'attention') return row.flags.length > 0;
    if (filter === 'not_started') return row.flags.includes('not_started');
    if (filter === 'on_shift') return row.onShift;
    return true;
  }), [data, filter]);

  const totals = data?.totals;

  return (
    <div className="page animate-fade-in my-team-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Team &amp; field</p>
          <h1>My Team today</h1>
          <p>
            {claims.role === 'org_admin' ? 'Everyone in the organization' : 'The people who report to you'}
            {data ? ` · ${format(new Date(`${data.date}T00:00:00`), 'EEEE d MMM')} · working hours ${data.settings.workStart}–${data.settings.workEnd}` : ''}
          </p>
        </div>
        <div className="my-team-actions">
          {managers.length > 0 && (
            <label className="table-filter-label">Team
              <select className="input-field compact-select" value={managerId} onChange={(event) => { setManagerId(event.target.value); setLoading(true); }}>
                <option value="">{claims.role === 'org_admin' ? 'Whole organization' : 'Everyone I manage'}</option>
                {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name || manager.email}'s team</option>)}
              </select>
            </label>
          )}
          <button className="secondary-button" type="button" onClick={() => { void load(); }} aria-label="Refresh">
            <RefreshCw size={16} /> {data ? `Updated ${format(new Date(data.generatedAt), 'HH:mm')}` : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="notice error-notice">{error}</div>}
      {data && !data.workingDay && (
        <div className="notice warning-notice">Today isn't a working day, so nobody is flagged for not starting.</div>
      )}

      {totals && (
        <div className="stats-grid my-team-stats">
          <StatTile icon={<UserCheck />} tone="green" title="Started today" value={`${totals.started}/${totals.members}`} />
          <StatTile icon={<MapPin />} tone="blue" title="On shift now" value={String(totals.onShift)} />
          <StatTile icon={<Clock3 />} tone="red" title="Not started" value={String(totals.notStarted)} detail={`An hour after ${data!.settings.workStart}`} />
          <StatTile icon={<AlertTriangle />} tone="orange" title="Needs attention" value={String(totals.flagged)} />
          <StatTile icon={<PhoneCall />} tone="violet" title="Calls today" value={String(totals.calls)} detail={`${durationLabel(totals.talkSeconds)} talk time`} />
        </div>
      )}

      <div className="section-card table-card">
        <div className="section-heading table-heading">
          <div><h2>Roll-call</h2><p>People who need attention are listed first.</p></div>
          <div className="segmented-control" role="tablist" aria-label="Filter team">
            {([
              ['all', 'All'],
              ['attention', `Needs attention${totals ? ` (${totals.flagged})` : ''}`],
              ['not_started', 'Not started'],
              ['on_shift', 'On shift'],
            ] as Array<[RowFilter, string]>).map(([value, label]) => (
              <button key={value} type="button" role="tab" aria-selected={filter === value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Member</th><th>Status</th><th>First – last call</th><th>Calls</th><th>Targets</th><th>Flags</th></tr></thead>
            <tbody>
              {loading && !data ? (
                <tr><td colSpan={6} className="table-message">Loading your team…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="table-message">{data?.rows.length ? 'Nobody matches this filter.' : 'Nobody reports to you yet. An admin can assign people on Team Management.'}</td></tr>
              ) : rows.map((row) => {
                const status = statusFor(row);
                const first = minuteLabel(row.firstActivityMinute);
                const last = minuteLabel(row.lastActivityMinute);
                return (
                  <tr key={row.repId}>
                    <td data-label="Member">
                      <div className="member-cell">
                        <div className="avatar"><Users size={16} /></div>
                        <div>
                          <strong>{row.name}</strong>
                          <span>{row.role === 'manager' ? 'Manager' : row.managerId ? `Reports to ${names.get(row.managerId) ?? '—'}` : 'No manager'}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Status">
                      <span className={`team-status ${status.tone}`}>{status.label}</span>
                      {row.shiftStartedAtMs !== null && <span className="member-subtext">Shift from {format(new Date(row.shiftStartedAtMs), 'HH:mm')}{row.batteryPct !== null ? ` · ${row.batteryPct}% battery` : ''}</span>}
                    </td>
                    <td data-label="First – last call">{first ? `${first} – ${last}` : '—'}</td>
                    <td data-label="Calls">
                      <strong>{row.calls}</strong>
                      <span className="member-subtext">{durationLabel(row.talkSeconds)} talk{row.quickHangups > 0 ? ` · ${row.quickHangups} quick hang-up${row.quickHangups === 1 ? '' : 's'}` : ''}</span>
                    </td>
                    <td data-label="Targets">
                      {row.targets.total === 0 ? '—' : row.targets.behind > 0 ?
                        <span className="team-status bad">{row.targets.behind} of {row.targets.total} behind</span> :
                        <span className="team-status good">{row.targets.achieved > 0 ? `${row.targets.achieved} achieved` : 'On track'}</span>}
                    </td>
                    <td data-label="Flags">
                      {row.flags.length === 0 ? <span className="action-unavailable">—</span> : (
                        <div className="flag-list">
                          {row.flags.map((flag) => (
                            <span key={flag} className={`flag-chip ${flag}`} title={flag === 'device_issue' ? row.deviceIssues.join('; ') : undefined}>{FLAG_LABELS[flag]}</span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatTile = ({ icon, tone, title, value, detail }: { icon: React.ReactNode; tone: string; title: string; value: string; detail?: string }) => (
  <div className="stat-card section-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><p>{title}</p><strong>{value}</strong>{detail && <small>{detail}</small>}</div></div>
);
