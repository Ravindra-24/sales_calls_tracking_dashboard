import { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { ArrowLeft, ArrowRight, Filter, PhoneIncoming, PhoneMissed, PhoneOutgoing } from 'lucide-react';
import { api, getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/auth';
import type { ApiResponse, CallRecord, TeamMember } from '../types/api';

const initialFrom = format(subDays(new Date(), 29), 'yyyy-MM-dd');
const initialTo = format(new Date(), 'yyyy-MM-dd');

export const CallHistory = () => {
  const { user, claims } = useAuth();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [repId, setRepId] = useState('');
  const [direction, setDirection] = useState('');
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const [nextCursor, setNextCursor] = useState<string>();
  const currentCursor = cursorHistory[cursorHistory.length - 1];

  useEffect(() => {
    if (claims.role === 'platform_owner') return;
    let active = true;
    if (claims.role === 'sales_member' && user) {
      setMembers([{
        id: user.uid,
        email: user.email ?? '',
        name: user.displayName ?? user.email ?? 'You',
        role: 'sales_member',
        status: 'active',
        createdAt: '',
        updatedAt: '',
      }]);
    } else if (claims.orgId) {
      api.get<ApiResponse<TeamMember[]>>(`/orgs/${claims.orgId}/users`, { params: { limit: 100 } })
        .then((usersResponse) => {
          if (active) setMembers(usersResponse.data.data);
        })
        .catch(() => undefined);
    }
    return () => { active = false; };
  }, [claims.orgId, claims.role, user]);

  useEffect(() => {
    if (claims.role === 'platform_owner') {
      setCalls([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    const params: Record<string, string | number> = {
      limit: 20,
      from: new Date(`${from}T00:00:00`).toISOString(),
      to: new Date(`${to}T23:59:59.999`).toISOString(),
    };
    if (repId) params.repId = repId;
    if (direction) params.direction = direction;
    if (currentCursor) params.cursor = currentCursor;

    api.get<ApiResponse<CallRecord[]>>('/calls', { params })
      .then((response) => {
        if (active) {
          setCalls(response.data.data);
          setNextCursor(response.data.meta?.nextCursor);
        }
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'Failed to load call history.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [claims.role, currentCursor, direction, from, repId, to]);

  const names = useMemo(() => new Map(members.map((member) => [member.id, member.name || member.email])), [members]);
  const reps = members.filter((member) => member.role === 'sales_member');
  const resetPage = () => setCursorHistory([undefined]);

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div><p className="eyebrow">Calls</p><h1>Call history</h1><p>{claims.role === 'sales_member' ? 'Review calls synchronized from your mobile app.' : 'Review synchronized calls across your organization.'}</p></div>
      </div>

      {claims.role !== 'sales_member' && (
      <div className="filter-panel section-card">
        <div className="filter-title"><Filter size={18} /> Filters</div>
        <label>Representative
          <select className="input-field" value={repId} onChange={(event) => { setRepId(event.target.value); resetPage(); }}>
            <option value="">All representatives</option>
            {reps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name || rep.email}</option>)}
          </select>
        </label>
        <label>Direction
          <select className="input-field" value={direction} onChange={(event) => { setDirection(event.target.value); resetPage(); }}>
            <option value="">All directions</option><option value="outgoing">Outgoing</option><option value="incoming">Incoming</option><option value="missed">Missed</option>
          </select>
        </label>
        <label>From<input className="input-field" type="date" value={from} max={to} onChange={(event) => { setFrom(event.target.value); resetPage(); }} /></label>
        <label>To<input className="input-field" type="date" value={to} min={from} onChange={(event) => { setTo(event.target.value); resetPage(); }} /></label>
      </div>
      )}

      {claims.role === 'sales_member' && (
        <div className="filter-panel section-card member-filter-panel">
          <div className="filter-title"><Filter size={18} /> Filters</div>
          <label>Direction
            <select className="input-field" value={direction} onChange={(event) => { setDirection(event.target.value); resetPage(); }}>
              <option value="">All directions</option><option value="outgoing">Outgoing</option><option value="incoming">Incoming</option><option value="missed">Missed</option>
            </select>
          </label>
          <label>From<input className="input-field" type="date" value={from} max={to} onChange={(event) => { setFrom(event.target.value); resetPage(); }} /></label>
          <label>To<input className="input-field" type="date" value={to} min={from} onChange={(event) => { setTo(event.target.value); resetPage(); }} /></label>
        </div>
      )}

      {error && <div className="notice error-notice">{error}</div>}

      <div className="section-card table-card" aria-busy={loading}>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Direction</th><th>Representative</th><th>Phone number</th><th>Date & time</th><th>Duration</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="table-message">Loading calls…</td></tr>
              ) : calls.length === 0 ? (
                <tr><td colSpan={5} className="table-message">No calls match these filters.</td></tr>
              ) : calls.map((call) => (
                <tr key={call.id}>
                  <td data-label="Direction"><span className={`direction-badge ${call.direction}`}>{directionIcon(call.direction)} {call.direction}</span></td>
                  <td data-label="Representative">{names.get(call.repId) ?? `Rep ${call.repId.slice(0, 6)}`}</td>
                  <td data-label="Phone number" className="phone-number">{call.phoneNumber}</td>
                  <td data-label="Date & time">{format(new Date(call.startTime), 'd MMM yyyy, h:mm a')}</td>
                  <td data-label="Duration">{formatDuration(call.durationSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>Page {cursorHistory.length}</span>
          <div>
            <button className="secondary-button" disabled={cursorHistory.length === 1 || loading} onClick={() => setCursorHistory((history) => history.slice(0, -1))}><ArrowLeft size={16} /> Previous</button>
            <button className="secondary-button" disabled={!nextCursor || loading} onClick={() => nextCursor && setCursorHistory((history) => [...history, nextCursor])}>Next <ArrowRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

const directionIcon = (direction: CallRecord['direction']) => {
  if (direction === 'incoming') return <PhoneIncoming size={16} />;
  if (direction === 'outgoing') return <PhoneOutgoing size={16} />;
  return <PhoneMissed size={16} />;
};

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
};
