import { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { ArrowLeft, ArrowRight, Download, Filter, MessageSquare, PhoneIncoming, PhoneMissed, PhoneOutgoing, Save } from 'lucide-react';
import { api, getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/auth';
import { useFeedback } from '../context/feedback';
import type { ApiResponse, CallRecord, SavedCallFilter, TeamMember } from '../types/api';

const initialFrom = format(subDays(new Date(), 29), 'yyyy-MM-dd');
const initialTo = format(new Date(), 'yyyy-MM-dd');

export const CallHistory = () => {
  const { user, claims } = useAuth();
  const feedback = useFeedback();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedCallFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [repId, setRepId] = useState('');
  const [direction, setDirection] = useState('');
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [tag, setTag] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState('');
  const [minDurationSeconds, setMinDurationSeconds] = useState('');
  const [maxDurationSeconds, setMaxDurationSeconds] = useState('');
  const [filterName, setFilterName] = useState('');
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
    if (claims.role === 'platform_owner') return;
    let active = true;
    api.get<ApiResponse<SavedCallFilter[]>>('/calls/filters')
      .then((response) => {
        if (active) setSavedFilters(response.data.data);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [claims.role]);

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
    if (phoneSearch.trim()) params.phoneSearch = phoneSearch.trim();
    if (tag.trim()) params.tag = tag.trim();
    if (followUpStatus) params.followUpStatus = followUpStatus;
    if (minDurationSeconds) params.minDurationSeconds = Number(minDurationSeconds);
    if (maxDurationSeconds) params.maxDurationSeconds = Number(maxDurationSeconds);
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
  }, [claims.role, currentCursor, direction, followUpStatus, from, maxDurationSeconds, minDurationSeconds, phoneSearch, repId, tag, to]);

  const names = useMemo(() => new Map(members.map((member) => [member.id, member.name || member.email])), [members]);
  const reps = members.filter((member) => member.role === 'sales_member');
  const resetPage = () => setCursorHistory([undefined]);

  const currentFilterParams = () => ({
    repId: repId || undefined,
    direction: direction || undefined,
    from: new Date(`${from}T00:00:00`).toISOString(),
    to: new Date(`${to}T23:59:59.999`).toISOString(),
    phoneSearch: phoneSearch.trim() || undefined,
    tag: tag.trim() || undefined,
    followUpStatus: followUpStatus || undefined,
    minDurationSeconds: minDurationSeconds ? Number(minDurationSeconds) : undefined,
    maxDurationSeconds: maxDurationSeconds ? Number(maxDurationSeconds) : undefined,
  });

  const applySavedFilter = (filter: SavedCallFilter) => {
    const values = filter.filters;
    setRepId(typeof values.repId === 'string' ? values.repId : '');
    setDirection(typeof values.direction === 'string' ? values.direction : '');
    setPhoneSearch(typeof values.phoneSearch === 'string' ? values.phoneSearch : '');
    setTag(typeof values.tag === 'string' ? values.tag : '');
    setFollowUpStatus(typeof values.followUpStatus === 'string' ? values.followUpStatus : '');
    setMinDurationSeconds(values.minDurationSeconds === undefined ? '' : String(values.minDurationSeconds));
    setMaxDurationSeconds(values.maxDurationSeconds === undefined ? '' : String(values.maxDurationSeconds));
    if (typeof values.from === 'string') setFrom(values.from.slice(0, 10));
    if (typeof values.to === 'string') setTo(values.to.slice(0, 10));
    resetPage();
  };

  const saveFilter = async () => {
    const name = filterName.trim();
    if (!name) {
      setError('Enter a name before saving this filter.');
      return;
    }
    try {
      const response = await api.post<ApiResponse<SavedCallFilter>>('/calls/filters', {
        name,
        filters: currentFilterParams(),
      });
      setSavedFilters((current) => [response.data.data, ...current]);
      setFilterName('');
      feedback.toast({ variant: 'success', message: 'Filter saved.' });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to save filter.'));
    }
  };

  const exportCsv = async () => {
    try {
      const response = await api.get('/calls/export.csv', {
        params: currentFilterParams(),
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'leadwatch-calls.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to export calls.'));
    }
  };

  const editNotes = async (call: CallRecord) => {
    const result = await feedback.requestFields({
      title: 'Call notes',
      description: call.phoneNumber,
      confirmLabel: 'Save notes',
      fields: [
        { id: 'notes', label: 'Notes', initialValue: call.notes || '', multiline: true, required: false, maxLength: 2000 },
        { id: 'tags', label: 'Tags', initialValue: (call.tags || []).join(', '), required: false, maxLength: 180 },
        { id: 'nextAction', label: 'Next action', initialValue: call.nextAction || '', required: false, maxLength: 140 },
        { id: 'followUpAt', label: 'Follow-up date', type: 'text', initialValue: call.followUpAt?.slice(0, 10) || '', required: false, placeholder: 'YYYY-MM-DD' },
      ],
    });
    if (!result) return;

    try {
      const tags = result.tags.split(',').map((item) => item.trim()).filter(Boolean);
      const response = await api.patch<ApiResponse<CallRecord>>(`/calls/${call.id}/notes`, {
        notes: result.notes,
        tags,
        nextAction: result.nextAction,
        followUpAt: result.followUpAt ? new Date(`${result.followUpAt}T09:00:00`).toISOString() : null,
        followUpStatus: result.followUpAt ? 'open' : 'none',
      });
      setCalls((current) => current.map((item) => item.id === call.id ? response.data.data : item));
      feedback.toast({ variant: 'success', message: 'Call notes updated.' });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to update call notes.'));
    }
  };

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div><p className="eyebrow">Calls</p><h1>Call history</h1><p>{claims.role === 'sales_member' ? 'Review calls synchronized from your mobile app.' : 'Review synchronized calls across your organization.'}</p></div>
      </div>

      {claims.role !== 'platform_owner' && (
      <div className="filter-panel section-card call-filter-panel">
        <div className="filter-title"><Filter size={18} /> Filters</div>
        {claims.role !== 'sales_member' && <label>Representative
          <select className="input-field" value={repId} onChange={(event) => { setRepId(event.target.value); resetPage(); }}>
            <option value="">All representatives</option>
            {reps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name || rep.email}</option>)}
          </select>
        </label>}
        <label>Direction
          <select className="input-field" value={direction} onChange={(event) => { setDirection(event.target.value); resetPage(); }}>
            <option value="">All directions</option><option value="outgoing">Outgoing</option><option value="incoming">Incoming</option><option value="missed">Missed</option>
          </select>
        </label>
        <label>From<input className="input-field" type="date" value={from} max={to} onChange={(event) => { setFrom(event.target.value); resetPage(); }} /></label>
        <label>To<input className="input-field" type="date" value={to} min={from} onChange={(event) => { setTo(event.target.value); resetPage(); }} /></label>
        <label>Phone<input className="input-field" value={phoneSearch} onChange={(event) => { setPhoneSearch(event.target.value); resetPage(); }} placeholder="Search number" /></label>
        <label>Tag<input className="input-field" value={tag} onChange={(event) => { setTag(event.target.value); resetPage(); }} placeholder="e.g. interested" /></label>
        <label>Follow-up
          <select className="input-field" value={followUpStatus} onChange={(event) => { setFollowUpStatus(event.target.value); resetPage(); }}>
            <option value="">Any</option><option value="open">Open</option><option value="completed">Completed</option><option value="none">None</option>
          </select>
        </label>
        <label>Min duration<input className="input-field" type="number" min="0" value={minDurationSeconds} onChange={(event) => { setMinDurationSeconds(event.target.value); resetPage(); }} /></label>
        <label>Max duration<input className="input-field" type="number" min="0" value={maxDurationSeconds} onChange={(event) => { setMaxDurationSeconds(event.target.value); resetPage(); }} /></label>
        <label>Saved
          <select className="input-field" value="" onChange={(event) => {
            const selected = savedFilters.find((filter) => filter.id === event.target.value);
            if (selected) applySavedFilter(selected);
          }}>
            <option value="">Apply saved filter</option>
            {savedFilters.map((filter) => <option key={filter.id} value={filter.id}>{filter.name}</option>)}
          </select>
        </label>
        <div className="filter-actions">
          <input className="input-field" value={filterName} onChange={(event) => setFilterName(event.target.value)} placeholder="Filter name" />
          <button className="secondary-button" type="button" onClick={() => void saveFilter()}><Save size={16} /> Save</button>
          <button className="secondary-button" type="button" onClick={() => void exportCsv()}><Download size={16} /> CSV</button>
        </div>
      </div>
      )}

      {error && <div className="notice error-notice">{error}</div>}

      <div className="section-card table-card" aria-busy={loading}>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Direction</th><th>Representative</th><th>Phone number</th><th>Date & time</th><th>Duration</th><th>Notes</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="table-message">Loading calls…</td></tr>
              ) : calls.length === 0 ? (
                <tr><td colSpan={7} className="table-message">No calls match these filters.</td></tr>
              ) : calls.map((call) => (
                <tr key={call.id}>
                  <td data-label="Direction"><span className={`direction-badge ${call.direction}`}>{directionIcon(call.direction)} {call.direction}</span></td>
                  <td data-label="Representative">{names.get(call.repId) ?? `Rep ${call.repId.slice(0, 6)}`}</td>
                  <td data-label="Phone number" className="phone-number">{call.phoneNumber}</td>
                  <td data-label="Date & time">{format(new Date(call.startTime), 'd MMM yyyy, h:mm a')}</td>
                  <td data-label="Duration">{formatDuration(call.durationSeconds)}</td>
                  <td data-label="Notes">
                    <div className="call-notes-cell">
                      <span>{call.nextAction || call.notes || '—'}</span>
                      {call.tags && call.tags.length > 0 && <small>{call.tags.join(', ')}</small>}
                      {call.followUpAt && <small>Follow up {format(new Date(call.followUpAt), 'd MMM')}</small>}
                    </div>
                  </td>
                  <td data-label="Actions">
                    <button className="secondary-button" type="button" onClick={() => void editNotes(call)}>
                      <MessageSquare size={16} /> Notes
                    </button>
                  </td>
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
