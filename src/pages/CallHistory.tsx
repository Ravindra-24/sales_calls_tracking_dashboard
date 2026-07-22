import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Filter,
  MessageSquare,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  Save,
  X,
} from 'lucide-react';
import { api, getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/auth';
import { useFeedback } from '../context/feedback';
import type { ApiResponse, CallRecord, CallSummary, SavedCallFilter, TeamMember } from '../types/api';

interface CallFilters {
  repId: string;
  direction: string;
  from: string;
  to: string;
  phoneSearch: string;
  tag: string;
  followUpStatus: string;
  minDurationSeconds: string;
  maxDurationSeconds: string;
}

interface CursorPage {
  cursor?: string;
  offset: number;
}

const createDefaultFilters = (): CallFilters => ({
  repId: '',
  direction: '',
  from: format(new Date(), 'yyyy-MM-dd'),
  to: format(new Date(), 'yyyy-MM-dd'),
  phoneSearch: '',
  tag: '',
  followUpStatus: '',
  minDurationSeconds: '',
  maxDurationSeconds: '',
});

const initialFilters = createDefaultFilters();

const readCallFilters = (storageKey: string, salesMember: boolean): CallFilters => {
  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (!stored) return createDefaultFilters();
    const parsed = JSON.parse(stored) as Partial<Record<keyof CallFilters, unknown>>;
    const defaults = createDefaultFilters();
    const restored = Object.fromEntries(
      (Object.keys(defaults) as Array<keyof CallFilters>).map((key) => [
        key,
        typeof parsed[key] === 'string' ? parsed[key] : defaults[key],
      ]),
    ) as unknown as CallFilters;
    if (salesMember) restored.repId = '';
    return restored;
  } catch {
    return createDefaultFilters();
  }
};

const filterParams = (filters: CallFilters) => ({
  repId: filters.repId || undefined,
  direction: filters.direction || undefined,
  from: new Date(`${filters.from}T00:00:00`).toISOString(),
  to: new Date(`${filters.to}T23:59:59.999`).toISOString(),
  phoneSearch: filters.phoneSearch.trim() || undefined,
  tag: filters.tag.trim() || undefined,
  followUpStatus: filters.followUpStatus || undefined,
  minDurationSeconds: filters.minDurationSeconds ? Number(filters.minDurationSeconds) : undefined,
  maxDurationSeconds: filters.maxDurationSeconds ? Number(filters.maxDurationSeconds) : undefined,
});

const useMobileFilterDialog = () => {
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
  ));
  useEffect(() => {
    const query = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return isMobile;
};

export const CallHistory = () => {
  const { user, claims } = useAuth();
  const feedback = useFeedback();
  const isMobile = useMobileFilterDialog();
  const filterStorageKey = `smartlymanage.call-history.filters:${user?.uid || claims.orgId || 'default'}`;
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [summary, setSummary] = useState<CallSummary | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedCallFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<CallFilters>(() => (
    readCallFilters(filterStorageKey, claims.role === 'sales_member')
  ));
  const [draftFilters, setDraftFilters] = useState<CallFilters>(() => (
    readCallFilters(filterStorageKey, claims.role === 'sales_member')
  ));
  const [filterName, setFilterName] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [cursorHistory, setCursorHistory] = useState<CursorPage[]>([{ offset: 0 }]);
  const [nextCursor, setNextCursor] = useState<string>();
  const [refreshVersion, setRefreshVersion] = useState(0);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const currentPage = cursorHistory[cursorHistory.length - 1];
  const appliedParams = useMemo(() => filterParams(appliedFilters), [appliedFilters]);

  useEffect(() => {
    if (claims.role === 'platform_owner') return;
    window.sessionStorage.setItem(filterStorageKey, JSON.stringify(appliedFilters));
  }, [appliedFilters, claims.role, filterStorageKey]);

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
        .then((response) => { if (active) setMembers(response.data.data); })
        .catch(() => undefined);
    }
    return () => { active = false; };
  }, [claims.orgId, claims.role, user]);

  useEffect(() => {
    if (claims.role === 'platform_owner') return;
    let active = true;
    api.get<ApiResponse<SavedCallFilter[]>>('/calls/filters')
      .then((response) => { if (active) setSavedFilters(response.data.data); })
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
    api.get<ApiResponse<CallRecord[]>>('/calls', {
      params: {
        ...appliedParams,
        limit: 20,
        ...(currentPage.cursor ? { cursor: currentPage.cursor } : {}),
      },
    })
      .then((response) => {
        if (!active) return;
        setCalls(response.data.data);
        setNextCursor(response.data.meta?.nextCursor);
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'Failed to load call history.'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [appliedParams, claims.role, currentPage.cursor, refreshVersion]);

  useEffect(() => {
    if (claims.role === 'platform_owner') {
      setSummary(null);
      setSummaryLoading(false);
      return;
    }
    let active = true;
    setSummaryLoading(true);
    setSummaryError('');
    api.get<ApiResponse<CallSummary>>('/calls/summary', { params: appliedParams })
      .then((response) => { if (active) setSummary(response.data.data); })
      .catch((requestError) => {
        if (active) {
          setSummary(null);
          setSummaryError(getApiErrorMessage(requestError, 'Call totals are temporarily unavailable.'));
        }
      })
      .finally(() => { if (active) setSummaryLoading(false); });
    return () => { active = false; };
  }, [appliedParams, claims.role, refreshVersion]);

  useEffect(() => {
    if (!filterOpen || !isMobile) return;
    const previousOverflow = document.body.style.overflow;
    const filterTrigger = filterButtonRef.current;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>('button, input, select')?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setDraftFilters(appliedFilters);
        setFilterOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      filterTrigger?.focus();
    };
  }, [appliedFilters, filterOpen, isMobile]);

  const names = useMemo(() => new Map(members.map((member) => [member.id, member.name || member.email])), [members]);
  const reps = members.filter((member) => member.role === 'sales_member');
  const activeFilterCount = 1 + [
    appliedFilters.repId,
    appliedFilters.direction,
    appliedFilters.phoneSearch,
    appliedFilters.tag,
    appliedFilters.followUpStatus,
    appliedFilters.minDurationSeconds,
    appliedFilters.maxDurationSeconds,
  ].filter(Boolean).length;

  const updateDraft = (patch: Partial<CallFilters>) => {
    setDraftFilters((current) => ({ ...current, ...patch }));
  };

  const openFilters = () => {
    setDraftFilters(appliedFilters);
    setFilterOpen(true);
  };

  const cancelFilters = () => {
    setDraftFilters(appliedFilters);
    setFilterOpen(false);
  };

  const applyFilters = () => {
    setAppliedFilters({
      ...draftFilters,
      repId: claims.role === 'sales_member' ? '' : draftFilters.repId,
      phoneSearch: draftFilters.phoneSearch.trim(),
      tag: draftFilters.tag.trim(),
    });
    setCursorHistory([{ offset: 0 }]);
    setFilterOpen(false);
  };

  const applySavedFilter = (filter: SavedCallFilter) => {
    const values = filter.filters;
    setDraftFilters({
      repId: claims.role === 'sales_member' ? '' : typeof values.repId === 'string' ? values.repId : '',
      direction: typeof values.direction === 'string' ? values.direction : '',
      phoneSearch: typeof values.phoneSearch === 'string' ? values.phoneSearch : '',
      tag: typeof values.tag === 'string' ? values.tag : '',
      followUpStatus: typeof values.followUpStatus === 'string' ? values.followUpStatus : '',
      minDurationSeconds: values.minDurationSeconds === undefined ? '' : String(values.minDurationSeconds),
      maxDurationSeconds: values.maxDurationSeconds === undefined ? '' : String(values.maxDurationSeconds),
      from: typeof values.from === 'string' ? values.from.slice(0, 10) : initialFilters.from,
      to: typeof values.to === 'string' ? values.to.slice(0, 10) : initialFilters.to,
    });
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
        filters: filterParams(draftFilters),
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
      const response = await api.get('/calls/export.csv', { params: appliedParams, responseType: 'blob' });
      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'smartly-manage-calls.csv';
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
      await api.patch<ApiResponse<CallRecord>>(`/calls/${call.id}/notes`, {
        notes: result.notes,
        tags,
        nextAction: result.nextAction,
        followUpAt: result.followUpAt ? new Date(`${result.followUpAt}T09:00:00`).toISOString() : null,
        followUpStatus: result.followUpAt ? 'open' : 'none',
      });
      setRefreshVersion((current) => current + 1);
      feedback.toast({ variant: 'success', message: 'Call notes updated.' });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to update call notes.'));
    }
  };

  const filterPanel = filterOpen && (
    <div
      className={isMobile ? 'call-filter-overlay' : 'call-filter-inline'}
      onMouseDown={(event) => { if (isMobile && event.target === event.currentTarget) cancelFilters(); }}
    >
      <div
        ref={dialogRef}
        id="call-history-filters"
        className="call-filter-dialog section-card"
        role={isMobile ? 'dialog' : undefined}
        aria-modal={isMobile ? 'true' : undefined}
        aria-labelledby="call-filter-title"
      >
        <div className="call-filter-heading">
          <div><h2 id="call-filter-title">Filters</h2><p>Adjust filters, then apply them together.</p></div>
          <button className="icon-button" type="button" onClick={cancelFilters} aria-label="Close filters"><X size={18} /></button>
        </div>
        <div className="call-filter-grid">
          {claims.role !== 'sales_member' && <label>Representative
            <select className="input-field" value={draftFilters.repId} onChange={(event) => updateDraft({ repId: event.target.value })}>
              <option value="">All representatives</option>
              {reps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name || rep.email}</option>)}
            </select>
          </label>}
          <label>Direction
            <select className="input-field" value={draftFilters.direction} onChange={(event) => updateDraft({ direction: event.target.value })}>
              <option value="">All directions</option><option value="outgoing">Outgoing</option><option value="incoming">Incoming</option><option value="missed">Missed</option>
            </select>
          </label>
          <label>From<input className="input-field" type="date" value={draftFilters.from} max={draftFilters.to} onChange={(event) => updateDraft({ from: event.target.value })} /></label>
          <label>To<input className="input-field" type="date" value={draftFilters.to} min={draftFilters.from} onChange={(event) => updateDraft({ to: event.target.value })} /></label>
          <label>Phone<input className="input-field" value={draftFilters.phoneSearch} onChange={(event) => updateDraft({ phoneSearch: event.target.value })} placeholder="Search number" /></label>
          <label>Tag<input className="input-field" value={draftFilters.tag} onChange={(event) => updateDraft({ tag: event.target.value })} placeholder="e.g. interested" /></label>
          <label>Follow-up
            <select className="input-field" value={draftFilters.followUpStatus} onChange={(event) => updateDraft({ followUpStatus: event.target.value })}>
              <option value="">Any</option><option value="open">Open</option><option value="completed">Completed</option><option value="none">None</option>
            </select>
          </label>
          <label>Min duration<input className="input-field" type="number" min="0" value={draftFilters.minDurationSeconds} onChange={(event) => updateDraft({ minDurationSeconds: event.target.value })} /></label>
          <label>Max duration<input className="input-field" type="number" min="0" value={draftFilters.maxDurationSeconds} onChange={(event) => updateDraft({ maxDurationSeconds: event.target.value })} /></label>
          <label>Saved filter
            <select className="input-field" value="" onChange={(event) => {
              const selected = savedFilters.find((filter) => filter.id === event.target.value);
              if (selected) applySavedFilter(selected);
            }}>
              <option value="">Choose a saved filter</option>
              {savedFilters.map((filter) => <option key={filter.id} value={filter.id}>{filter.name}</option>)}
            </select>
          </label>
        </div>
        <div className="call-filter-save">
          <input className="input-field" value={filterName} onChange={(event) => setFilterName(event.target.value)} placeholder="Saved filter name" />
          <button className="secondary-button" type="button" onClick={() => void saveFilter()}><Save size={16} /> Save filter</button>
        </div>
        <div className="call-filter-actions">
          <button className="secondary-button" type="button" onClick={() => setDraftFilters(createDefaultFilters())}>Reset</button>
          <button className="secondary-button" type="button" onClick={cancelFilters}>Cancel</button>
          <button className="btn-primary" type="button" onClick={applyFilters}>Apply filters</button>
        </div>
      </div>
    </div>
  );
  const renderedFilterPanel = filterPanel && isMobile
    ? createPortal(filterPanel, document.body)
    : filterPanel;

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div><p className="eyebrow">Calls</p><h1>Call history</h1><p>{claims.role === 'sales_member' ? 'Review calls synchronized from your mobile app.' : 'Review synchronized calls across your organization.'}</p></div>
      </div>

      {claims.role !== 'platform_owner' && (
        <>
          <div className="call-filter-toolbar section-card">
            <div className="call-filter-summary"><Filter size={18} /><div><strong>{format(new Date(`${appliedFilters.from}T00:00:00`), 'd MMM yyyy')} – {format(new Date(`${appliedFilters.to}T00:00:00`), 'd MMM yyyy')}</strong><span>{activeFilterCount} active {activeFilterCount === 1 ? 'filter' : 'filters'}</span></div></div>
            <div className="call-filter-toolbar-actions">
              <button className="secondary-button" type="button" onClick={() => void exportCsv()}><Download size={16} /> CSV</button>
              <button ref={filterButtonRef} className="btn-primary" type="button" aria-expanded={filterOpen} aria-controls="call-history-filters" onClick={() => filterOpen ? cancelFilters() : openFilters()}><Filter size={16} /> {filterOpen && !isMobile ? 'Hide filters' : 'Filters'}</button>
            </div>
          </div>
          {renderedFilterPanel}

          <div className="call-summary-grid" aria-busy={summaryLoading}>
            <CallSummaryCard label="Total" value={summaryLoading ? '—' : summary?.totalCalls ?? '—'} icon={<PhoneCall />} tone="blue" />
            <CallSummaryCard label="Connected" value={summaryLoading ? '—' : summary?.connectedCalls ?? '—'} icon={<PhoneIncoming />} tone="green" />
            <CallSummaryCard label="Missed" value={summaryLoading ? '—' : summary?.missedCalls ?? '—'} icon={<PhoneMissed />} tone="orange" />
          </div>
          {summaryError && <div className="call-summary-error" role="status">{summaryError}</div>}
        </>
      )}

      {error && <div className="notice error-notice">{error}</div>}

      <div className="section-card table-card" aria-busy={loading}>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>#</th><th>Direction</th><th>Representative</th><th>Phone number</th><th>Date & time</th><th>Duration</th><th>Notes</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="table-message">Loading calls…</td></tr>
              ) : calls.length === 0 ? (
                <tr><td colSpan={8} className="table-message">No calls match these filters.</td></tr>
              ) : calls.map((call, index) => (
                <tr key={call.id}>
                  <td data-label="#" className="call-row-number">{currentPage.offset + index + 1}</td>
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
                  <td data-label="Actions"><button className="secondary-button" type="button" onClick={() => void editNotes(call)}><MessageSquare size={16} /> Notes</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>Page {cursorHistory.length}</span>
          <div>
            <button className="secondary-button" disabled={cursorHistory.length === 1 || loading} onClick={() => setCursorHistory((history) => history.slice(0, -1))}><ArrowLeft size={16} /> Previous</button>
            <button className="secondary-button" disabled={!nextCursor || loading} onClick={() => nextCursor && setCursorHistory((history) => [...history, { cursor: nextCursor, offset: currentPage.offset + calls.length }])}>Next <ArrowRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CallSummaryCard = ({ label, value, icon, tone }: { label: string; value: string | number; icon: React.ReactNode; tone: string }) => (
  <div className="call-summary-card section-card"><span className={`stat-icon ${tone}`}>{icon}</span><div><p>{label}</p><strong>{value}</strong></div></div>
);

const directionIcon = (direction: CallRecord['direction']) => {
  if (direction === 'incoming') return <PhoneIncoming size={16} />;
  if (direction === 'outgoing') return <PhoneCall size={16} />;
  return <PhoneMissed size={16} />;
};

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
};
