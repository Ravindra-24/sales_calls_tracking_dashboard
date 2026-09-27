import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { endOfToday, format, isAfter, isValid } from 'date-fns';
import TextField from '@mui/material/TextField';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Filter,
  MessageSquare,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Trash2,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  Save,
  X,
} from 'lucide-react';
import { api, getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/auth';
import { useFeedback } from '../context/feedback';
import { MuiFieldProvider } from '../components/MuiFieldProvider';
import type { ApiResponse, CallAnalysis, CallRecord, CallSummary, SavedCallFilter, TeamMember } from '../types/api';
import {
  activeFilterChips,
  CALL_DATE_PRESETS,
  createDefaultFilters,
  describeDateRange,
  formatDurationLabel,
  matchCallDatePreset,
  resolveCallDatePreset,
  rollDatePresetForward,
  type CallDatePreset,
  type CallFilters,
  type ChipKey,
} from './callHistoryFilters';

interface CursorPage {
  cursor?: string;
  offset: number;
}

const readCallFilters = (storageKey: string, salesMember: boolean): CallFilters => {
  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (!stored) return createDefaultFilters();
    const parsed = JSON.parse(stored) as Partial<Record<keyof CallFilters | 'savedOn', unknown>>;
    const defaults = createDefaultFilters();
    const restored = Object.fromEntries(
      (Object.keys(defaults) as Array<keyof CallFilters>).map((key) => [
        key,
        typeof parsed[key] === 'string' ? parsed[key] : defaults[key],
      ]),
    ) as unknown as CallFilters;
    if (salesMember) restored.repId = '';
    if (restored.sort !== 'asc') restored.sort = 'desc';
    return rollDatePresetForward(restored, typeof parsed.savedOn === 'string' ? parsed.savedOn : undefined);
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

const toDate = (value: string) => new Date(`${value}T00:00:00`);

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
  // Hidden by default; opens inline on desktop and as a modal on phones.
  const [filterOpen, setFilterOpen] = useState(false);
  const [savedFilterId, setSavedFilterId] = useState('');
  const [cursorHistory, setCursorHistory] = useState<CursorPage[]>([{ offset: 0 }]);
  const [nextCursor, setNextCursor] = useState<string>();
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [analysisCall, setAnalysisCall] = useState<CallRecord | null>(null);
  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const currentPage = cursorHistory[cursorHistory.length - 1];
  const appliedParams = useMemo(() => filterParams(appliedFilters), [appliedFilters]);

  useEffect(() => {
    if (claims.role === 'platform_owner') return;
    window.sessionStorage.setItem(filterStorageKey, JSON.stringify({ ...appliedFilters, savedOn: format(new Date(), 'yyyy-MM-dd') }));
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
        sort: appliedFilters.sort,
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
  }, [appliedFilters.sort, appliedParams, claims.role, currentPage.cursor, refreshVersion]);

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
  const filterChips = activeFilterChips(appliedFilters, names);
  const dateLabel = describeDateRange(appliedFilters.from, appliedFilters.to);
  const activeDatePreset = matchCallDatePreset(appliedFilters.from, appliedFilters.to);
  const showingDefaults = filterChips.length === 0 && activeDatePreset === 'today';

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

  // Quick controls outside the filter card apply at once and keep the draft in step.
  const applyQuickFilters = (patch: Partial<CallFilters>) => {
    setAppliedFilters((current) => ({ ...current, ...patch }));
    setDraftFilters((current) => ({ ...current, ...patch }));
    setCursorHistory([{ offset: 0 }]);
    if (!('sort' in patch)) setSavedFilterId('');
  };

  const applyDatePreset = (preset: CallDatePreset) => applyQuickFilters(resolveCallDatePreset(preset));

  const removeFilter = (key: ChipKey) => applyQuickFilters({ [key]: '' });

  const clearAllFilters = () => {
    const cleared = { ...createDefaultFilters(), sort: appliedFilters.sort };
    setAppliedFilters(cleared);
    setDraftFilters(cleared);
    setCursorHistory([{ offset: 0 }]);
    setSavedFilterId('');
  };

  const changeDate = (field: 'from' | 'to', value: Date | null) => {
    // Typed or keyboard-stepped dates can land in the future; the pickers flag those, so ignore them.
    if (!value || !isValid(value) || isAfter(value, endOfToday())) return;
    const date = format(value, 'yyyy-MM-dd');
    if (field === 'from') {
      applyQuickFilters({ from: date, ...(date > appliedFilters.to ? { to: date } : {}) });
    } else {
      applyQuickFilters({ to: date, ...(date < appliedFilters.from ? { from: date } : {}) });
    }
  };

  const applyFilters = () => {
    setSavedFilterId('');
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
    const next: CallFilters = {
      repId: claims.role === 'sales_member' ? '' : typeof values.repId === 'string' ? values.repId : '',
      direction: typeof values.direction === 'string' ? values.direction : '',
      phoneSearch: typeof values.phoneSearch === 'string' ? values.phoneSearch : '',
      tag: typeof values.tag === 'string' ? values.tag : '',
      followUpStatus: typeof values.followUpStatus === 'string' ? values.followUpStatus : '',
      minDurationSeconds: values.minDurationSeconds === undefined ? '' : String(values.minDurationSeconds),
      maxDurationSeconds: values.maxDurationSeconds === undefined ? '' : String(values.maxDurationSeconds),
      from: typeof values.from === 'string' ? values.from.slice(0, 10) : createDefaultFilters().from,
      to: typeof values.to === 'string' ? values.to.slice(0, 10) : createDefaultFilters().to,
      sort: appliedFilters.sort,
    };
    setAppliedFilters(next);
    setDraftFilters(next);
    setCursorHistory([{ offset: 0 }]);
    setSavedFilterId(filter.id);
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
      const response = await api.get('/calls/export.csv', { params: { ...appliedParams, sort: appliedFilters.sort }, responseType: 'blob' });
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

  const openAnalysis = async (call: CallRecord) => {
    setAnalysisCall(call);
    setAnalysis(null);
    setAudioUrl('');
    setAnalysisError('');
    setAnalysisLoading(true);
    try {
      const response = await api.get<ApiResponse<CallAnalysis>>(`/calls/${call.id}/analysis`);
      setAnalysis(response.data.data);
      if (response.data.data.status === 'ready') {
        const audio = await api.get<ApiResponse<{ url: string }>>(`/calls/${call.id}/analysis/audio-url`);
        setAudioUrl(audio.data.data.url);
      }
    } catch (requestError) {
      setAnalysisError(getApiErrorMessage(requestError, 'Call analysis is not available yet.'));
    } finally {
      setAnalysisLoading(false);
    }
  };

  const retryAnalysis = async () => {
    if (!analysisCall) return;
    try {
      await api.post(`/calls/${analysisCall.id}/analysis/retry`);
      setAnalysis(current => current ? { ...current, status: 'queued', failureMessage: null } : current);
      feedback.toast({ variant: 'success', message: 'Call analysis queued for retry.' });
      setRefreshVersion(current => current + 1);
    } catch (requestError) {
      setAnalysisError(getApiErrorMessage(requestError, 'Failed to retry call analysis.'));
    }
  };

  const deleteAnalysis = async () => {
    if (!analysisCall) return;
    const approved = await feedback.confirm({
      title: 'Delete recording and AI output?',
      message: 'The recording, transcript, and summary will be permanently removed.',
      confirmLabel: 'Delete permanently',
      variant: 'danger',
    });
    if (!approved) return;
    try {
      await api.delete(`/calls/${analysisCall.id}/analysis`);
      setAnalysisCall(null);
      setAnalysis(null);
      setAudioUrl('');
      setRefreshVersion(current => current + 1);
      feedback.toast({ variant: 'success', message: 'Recording and analysis deleted.' });
    } catch (requestError) {
      setAnalysisError(getApiErrorMessage(requestError, 'Failed to delete call analysis.'));
    }
  };

  const applyAnalysisSuggestion = async () => {
    if (!analysisCall?.leadId || !analysis?.suggestedNextAction) return;
    try {
      await api.post(`/leads/${analysisCall.leadId}/suggestions/${analysis.id}/apply`);
      setAnalysis((current) => current?.suggestedNextAction ? {
        ...current,
        suggestedNextAction: { ...current.suggestedNextAction, appliedAt: new Date().toISOString() },
      } : current);
      feedback.toast({ variant: 'success', message: 'Suggestion applied to the lead.' });
    } catch (requestError) {
      setAnalysisError(getApiErrorMessage(requestError, 'Failed to apply suggestion.'));
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
          <div><h2 id="call-filter-title">Filters</h2><p>Adjust call details, then apply them together.</p></div>
          <button className="icon-button" type="button" onClick={cancelFilters} aria-label="Close filters"><X size={18} /></button>
        </div>
        <div className="call-filter-grid">
          <label>Direction
            <select className="input-field" value={draftFilters.direction} onChange={(event) => updateDraft({ direction: event.target.value })}>
              <option value="">All directions</option><option value="outgoing">Outgoing</option><option value="incoming">Incoming</option><option value="missed">Missed</option>
            </select>
          </label>
          <label>Phone<input className="input-field" value={draftFilters.phoneSearch} onChange={(event) => updateDraft({ phoneSearch: event.target.value })} placeholder="Search number" /></label>
          <label>Tag<input className="input-field" value={draftFilters.tag} onChange={(event) => updateDraft({ tag: event.target.value })} placeholder="e.g. interested" /></label>
          <label>Follow-up
            <select className="input-field" value={draftFilters.followUpStatus} onChange={(event) => updateDraft({ followUpStatus: event.target.value })}>
              <option value="">Any</option><option value="open">Open</option><option value="completed">Completed</option><option value="none">None</option>
            </select>
          </label>
          <label>Min duration (seconds)<input className="input-field" type="number" min="0" value={draftFilters.minDurationSeconds} onChange={(event) => updateDraft({ minDurationSeconds: event.target.value })} placeholder="e.g. 120 = 2 min" />
            {draftFilters.minDurationSeconds && <small className="call-duration-hint">= {formatDurationLabel(Number(draftFilters.minDurationSeconds))}</small>}
          </label>
          <label>Max duration (seconds)<input className="input-field" type="number" min="0" value={draftFilters.maxDurationSeconds} onChange={(event) => updateDraft({ maxDurationSeconds: event.target.value })} />
            {draftFilters.maxDurationSeconds && <small className="call-duration-hint">= {formatDurationLabel(Number(draftFilters.maxDurationSeconds))}</small>}
          </label>
        </div>
        <div className="call-filter-save">
          <input className="input-field" value={filterName} onChange={(event) => setFilterName(event.target.value)} placeholder="Saved filter name" />
          <button className="secondary-button" type="button" onClick={() => void saveFilter()}><Save size={16} /> Save filter</button>
        </div>
        <div className="call-filter-actions">
          <button className="secondary-button" type="button" onClick={() => setDraftFilters((current) => ({
            ...createDefaultFilters(),
            repId: current.repId,
            from: current.from,
            to: current.to,
            sort: current.sort,
          }))}>Reset</button>
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
            <div className="call-filter-summary"><Filter size={18} /><div><strong>{dateLabel}</strong><span>{filterChips.length ? `${filterChips.length} more ${filterChips.length === 1 ? 'filter' : 'filters'} applied` : 'No other filters'}</span></div></div>
            <div className="call-date-presets" role="group" aria-label="Date range">
              {CALL_DATE_PRESETS.map((preset) => (
                <button key={preset.value} type="button" className={activeDatePreset === preset.value ? 'active' : ''} aria-pressed={activeDatePreset === preset.value} onClick={() => applyDatePreset(preset.value)}>{preset.label}</button>
              ))}
            </div>
            <div className="call-filter-toolbar-actions">
              <button className="secondary-button" type="button" onClick={() => void exportCsv()}><Download size={16} /> CSV</button>
              <button ref={filterButtonRef} className="btn-primary" type="button" aria-expanded={filterOpen} aria-controls="call-history-filters" onClick={() => filterOpen ? cancelFilters() : openFilters()}><Filter size={16} /> {filterOpen && !isMobile ? 'Hide filters' : 'Filters'}</button>
            </div>
            <MuiFieldProvider>
              <div className="call-quick-filters">
                {claims.role !== 'sales_member' && (
                  <TextField select size="small" label="Salesperson" value={appliedFilters.repId} onChange={(event) => applyQuickFilters({ repId: event.target.value })} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}>
                    <option value="">All salespeople</option>
                    {reps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name || rep.email}{rep.status === 'disabled' ? ' (inactive)' : ''}</option>)}
                  </TextField>
                )}
                <DatePicker label="From" format="d MMM yyyy" value={toDate(appliedFilters.from)} maxDate={toDate(appliedFilters.to)} disableFuture onChange={(value) => changeDate('from', value)} slotProps={{ textField: { size: 'small' } }} />
                <DatePicker label="To" format="d MMM yyyy" value={toDate(appliedFilters.to)} minDate={toDate(appliedFilters.from)} disableFuture onChange={(value) => changeDate('to', value)} slotProps={{ textField: { size: 'small' } }} />
                <TextField select size="small" label="Sort by call time" value={appliedFilters.sort} onChange={(event) => applyQuickFilters({ sort: event.target.value })} slotProps={{ select: { native: true } }}>
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </TextField>
                <TextField select size="small" label="Saved filter" value={savedFilterId} disabled={savedFilters.length === 0} onChange={(event) => {
                  const selected = savedFilters.find((filter) => filter.id === event.target.value);
                  if (selected) applySavedFilter(selected);
                }} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}>
                  <option value="">{savedFilters.length ? 'Choose a saved filter' : 'No saved filters'}</option>
                  {savedFilters.map((filter) => <option key={filter.id} value={filter.id}>{filter.name}</option>)}
                </TextField>
              </div>
            </MuiFieldProvider>
          </div>
          {renderedFilterPanel}

          <div className={`call-active-filters${showingDefaults ? '' : ' filtered'}`} aria-label="Active filters" role="status">
            <span>Showing</span>
            <strong>{dateLabel}</strong>
            {filterChips.map((chip) => (
              <span className="call-filter-chip" key={chip.key}>
                {chip.label}
                <button type="button" aria-label={`Remove filter: ${chip.label}`} onClick={() => removeFilter(chip.key)}><X size={13} /></button>
              </span>
            ))}
            {!showingDefaults && <button className="call-clear-filters" type="button" onClick={clearAllFilters}>Clear all</button>}
          </div>

          <div className="call-summary-grid" aria-busy={summaryLoading}>
            <CallSummaryCard label="Total" value={summaryLoading ? '—' : summary?.totalCalls ?? '—'} icon={<PhoneCall />} tone="blue" />
            <CallSummaryCard label="Connected" value={summaryLoading ? '—' : summary?.connectedCalls ?? '—'} icon={<PhoneIncoming />} tone="green" />
            <CallSummaryCard label="Not connected" value={summaryLoading ? '—' : summary?.notConnectedCalls ?? '—'} icon={<PhoneMissed />} tone="orange" />
            <CallSummaryCard label="Missed" value={summaryLoading ? '—' : summary?.missedCalls ?? '—'} icon={<PhoneMissed />} tone="orange" />
            <CallSummaryCard label="Unique incoming" value={summaryLoading ? '—' : summary?.uniqueIncomingCalls ?? '—'} icon={<PhoneIncoming />} tone="green" />
            <CallSummaryCard label="Unique outgoing" value={summaryLoading ? '—' : summary?.uniqueOutgoingCalls ?? '—'} icon={<PhoneCall />} tone="blue" />
            <CallSummaryCard label="Unique connected" value={summaryLoading ? '—' : summary?.uniqueConnectedCalls ?? '—'} icon={<PhoneIncoming />} tone="green" />
          </div>
          {summaryError && <div className="call-summary-error" role="status">{summaryError}</div>}
        </>
      )}

      {error && <div className="notice error-notice">{error}</div>}

      <div className="section-card table-card" aria-busy={loading}>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>#</th><th>Direction</th><th>Representative</th><th>Phone number</th><th>Date & time</th><th>Duration</th><th>AI</th><th>Notes</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="table-message">Loading calls…</td></tr>
              ) : calls.length === 0 ? (
                <tr><td colSpan={9} className="table-message">No calls match these filters.</td></tr>
              ) : calls.map((call, index) => (
                <tr key={call.id}>
                  <td data-label="#" className="call-row-number">{currentPage.offset + index + 1}</td>
                  <td data-label="Direction"><span className={`direction-badge ${call.direction}`}>{directionIcon(call.direction)} {call.direction}</span></td>
                  <td data-label="Representative">{names.get(call.repId) ?? `Rep ${call.repId.slice(0, 6)}`}</td>
                  <td data-label="Phone number" className="phone-number">{call.leadId ? <Link to={`/dashboard/leads/${call.leadId}`}>{call.phoneNumber}</Link> : call.phoneNumber}</td>
                  <td data-label="Date & time">{format(new Date(call.startTime), 'd MMM yyyy, h:mm a')}</td>
                  <td data-label="Duration">{formatDuration(call.durationSeconds)}</td>
                  <td data-label="AI">
                    {call.analysisStatus && call.analysisStatus !== 'none' ? (
                      <button className="analysis-status-button" type="button" onClick={() => void openAnalysis(call)}>
                        <Sparkles size={15} /> {call.analysisStatus}
                      </button>
                    ) : <span className="muted-cell">—</span>}
                    {call.consentNoticeStatus === 'missing' && (
                      <small className="call-recording-error">Notice not detected</small>
                    )}
                  </td>
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

      {analysisCall && (
        <div className="analysis-dialog-backdrop" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) setAnalysisCall(null);
        }}>
          <section className="analysis-dialog section-card" role="dialog" aria-modal="true" aria-labelledby="analysis-title">
            <div className="analysis-dialog-heading">
              <div>
                <p className="eyebrow">AI call review</p>
                <h2 id="analysis-title">{analysisCall.phoneNumber}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close" onClick={() => setAnalysisCall(null)}><X size={19} /></button>
            </div>
            {analysisLoading ? (
              <div className="table-message">Loading call analysis…</div>
            ) : analysisError ? (
              <div className="notice error-notice">{analysisError}</div>
            ) : analysis ? (
              <div className="analysis-content">
                <div className="analysis-status-line">
                  <span className={`direction-badge ${analysis.status === 'ready' ? 'incoming' : analysis.status === 'failed' ? 'missed' : 'outgoing'}`}>{analysis.status}</span>
                  <span className={`direction-badge ${analysis.consentNoticeStatus === 'detected' ? 'incoming' : analysis.consentNoticeStatus === 'missing' ? 'missed' : 'outgoing'}`}>
                    Notice {analysis.consentNoticeStatus}
                  </span>
                </div>
                {audioUrl && <audio className="analysis-audio" controls preload="metadata" src={audioUrl} />}
                {analysis.summary && <section><h3>Summary</h3><p>{analysis.summary}</p></section>}
                {analysis.outcome && <section><h3>Outcome</h3><p>{analysis.outcome}</p></section>}
                {analysis.sentimentLabel && <section><h3>Customer sentiment</h3><p><span className={`health-pill ${analysis.sentimentLabel}`}>{analysis.sentimentLabel} {analysis.sentimentScore !== null ? `(${analysis.sentimentScore.toFixed(2)})` : ''}</span> · {analysis.sentimentConfidence} confidence</p></section>}
                {analysis.keyPoints.length > 0 && <section><h3>Key points</h3><ul>{analysis.keyPoints.map(point => <li key={point}>{point}</li>)}</ul></section>}
                {analysis.actionItems.length > 0 && <section><h3>Action items</h3><ul>{analysis.actionItems.map(item => <li key={item}>{item}</li>)}</ul></section>}
                {analysis.buyingSignals.length > 0 && <section><h3>Buying signals</h3><ul>{analysis.buyingSignals.map(item => <li key={item}>{item}</li>)}</ul></section>}
                {analysis.riskSignals.length > 0 && <section><h3>Risks and objections</h3><ul>{[...analysis.riskSignals, ...analysis.objections, ...analysis.customerConcerns].map(item => <li key={item}>{item}</li>)}</ul></section>}
                {analysis.nextStep && <section><h3>Next step</h3><p>{analysis.nextStep}</p></section>}
                {analysis.suggestedNextAction && <section className="suggestion-box"><Sparkles size={18} /><div><h3>Suggested next action</h3><p><strong>{analysis.suggestedNextAction.text}</strong></p><p>{analysis.suggestedNextAction.rationale}</p></div>{analysisCall.leadId && !analysis.suggestedNextAction.appliedAt && <button className="btn-primary" type="button" onClick={() => void applyAnalysisSuggestion()}>Apply to lead</button>}</section>}
                <small>Processed by {analysis.transcriptionProvider} transcription{analysis.transcriptionModel ? ` (${analysis.transcriptionModel})` : ''} and {analysis.intelligenceProvider} intelligence{analysis.intelligenceModel ? ` (${analysis.intelligenceModel})` : ''}</small>
                {analysis.transcript && <details><summary>Transcript</summary><pre className="analysis-transcript">{analysis.transcript}</pre></details>}
                {analysis.failureMessage && <div className="notice error-notice">{analysis.failureMessage}</div>}
                <div className="analysis-actions">
                  {analysis.status === 'failed' && claims.role !== 'sales_member' && (
                    <button className="secondary-button" type="button" onClick={() => void retryAnalysis()}><RefreshCw size={16} /> Retry</button>
                  )}
                  {claims.role !== 'manager' && (
                    <button className="danger-button" type="button" onClick={() => void deleteAnalysis()}><Trash2 size={16} /> Delete recording</button>
                  )}
                  {audioUrl && <a className="secondary-button" href={audioUrl} target="_blank" rel="noreferrer"><PlayCircle size={16} /> Open audio</a>}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      )}
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
