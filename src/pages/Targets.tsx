import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Lock, Pencil, Plus, RefreshCw, Send, Target as TargetIcon, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/auth';
import { useFeedback } from '../context/feedback';
import type {
  ApiResponse,
  TargetDetailRecord,
  TargetMetric,
  TargetNoteRecord,
  TargetPeriodType,
  TargetRecord,
  TargetStatus,
  TeamMember,
} from '../types/api';

const metricLabels: Record<TargetMetric, string> = {
  calls: 'Total calls',
  connected_calls: 'Connected calls',
  outgoing_calls: 'Outgoing calls',
  talk_time_minutes: 'Talk time (minutes)',
  leads_created: 'New leads',
  leads_won: 'Leads won',
  client_visits: 'Client visits',
  custom: 'Custom (reported by rep)',
};
const periodLabels: Record<TargetPeriodType, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  custom: 'Custom range',
};
const statusLabels: Record<TargetStatus, string> = {
  upcoming: 'Upcoming',
  on_track: 'On track',
  behind: 'Behind',
  achieved: 'Achieved',
  missed: 'Missed',
};
// Reuse the lead health pill palette.
const statusPill: Record<TargetStatus, string> = {
  upcoming: '',
  on_track: 'healthy',
  behind: 'watch',
  achieved: 'strong',
  missed: 'at_risk',
};
const editableFieldLabels: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  targetValue: 'Target',
  customUnit: 'Unit',
  periodType: 'Period',
  startDate: 'Start',
  endDate: 'End',
};

const todayIso = () => format(new Date(), 'yyyy-MM-dd');
const emptyForm = {
  title: '',
  metric: 'calls' as TargetMetric,
  targetValue: '',
  customUnit: '',
  periodType: 'monthly' as TargetPeriodType,
  startDate: todayIso(),
  endDate: '',
  assignTo: 'reps' as 'reps' | 'team',
  repIds: [] as string[],
  description: '',
};

const unitFor = (target: Pick<TargetRecord, 'metric' | 'customUnit'>) =>
  target.metric === 'custom' ? target.customUnit || '' : metricLabels[target.metric].toLowerCase();
const formatPeriod = (target: Pick<TargetRecord, 'startDate' | 'endDate'>) => {
  const start = new Date(`${target.startDate}T00:00:00`);
  const end = new Date(`${target.endDate}T00:00:00`);
  return target.startDate === target.endDate ? format(start, 'd MMM yyyy') : `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`;
};

const ProgressBar = ({ target }: { target: TargetRecord }) => (
  <div className="target-progress-cell">
    <div className="target-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, target.progress.percent)}>
      <span className={`target-progress-fill ${target.progress.status}`} style={{ width: `${Math.min(100, target.progress.percent)}%` }} />
    </div>
    <small>{target.progress.achievedValue} / {target.targetValue} {unitFor(target)} · {target.progress.percent}%</small>
  </div>
);

export const Targets = () => {
  const { targetId } = useParams();
  const navigate = useNavigate();
  const { user, claims } = useAuth();
  const feedback = useFeedback();
  const isManager = claims.role === 'org_admin' || claims.role === 'manager';
  const uid = user?.uid || '';

  const [targets, setTargets] = useState<TargetRecord[]>([]);
  const [detail, setDetail] = useState<TargetDetailRecord | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'current' | 'past'>('current');
  const [repFilter, setRepFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [noteDraft, setNoteDraft] = useState('');

  const names = useMemo(() => new Map(members.map((member) => [member.id, member.name || member.email])), [members]);
  const assigneeName = useCallback((target: Pick<TargetRecord, 'scope' | 'repId'>) => {
    if (target.scope === 'team') return 'Whole team';
    if (target.repId === uid) return 'You';
    return names.get(target.repId || '') || target.repId?.slice(0, 8) || '—';
  }, [names, uid]);
  const personName = useCallback((id: string) => (id === uid ? 'You' : names.get(id) || 'Manager'), [names, uid]);

  useEffect(() => {
    if (!isManager || !claims.orgId) return;
    void api.get<ApiResponse<TeamMember[]>>(`/orgs/${claims.orgId}/users`, { params: { limit: 100 } })
      .then((response) => setMembers(response.data.data.filter((member) => member.role !== 'platform_owner')))
      .catch(() => undefined);
  }, [claims.orgId, isManager]);
  const salesMembers = useMemo(() => members.filter((member) => member.role === 'sales_member' && member.status === 'active'), [members]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<ApiResponse<TargetRecord[]>>('/targets', {
        params: { view, repId: isManager && repFilter ? repFilter : undefined },
      });
      setTargets(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load targets.'));
    } finally {
      setLoading(false);
    }
  }, [isManager, repFilter, view]);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<ApiResponse<TargetDetailRecord>>(`/targets/${id}`);
      setDetail(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load the target.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (targetId) void loadDetail(targetId); else void load(); }, [load, loadDetail, targetId]);

  const visibleTargets = useMemo(
    () => targets.filter((target) => !statusFilter || target.progress.status === statusFilter),
    [statusFilter, targets],
  );
  const summary = useMemo(() => {
    const counts: Record<TargetStatus, number> = { upcoming: 0, on_track: 0, behind: 0, achieved: 0, missed: 0 };
    targets.forEach((target) => { counts[target.progress.status] += 1; });
    return counts;
  }, [targets]);

  const createTarget = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isManager && form.assignTo === 'reps' && form.repIds.length === 0) {
      setError('Choose at least one sales member, or assign the target to the whole team.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await api.post<ApiResponse<TargetRecord[]>>('/targets', {
        scope: isManager ? (form.assignTo === 'team' ? 'team' : 'rep') : 'rep',
        repIds: isManager && form.assignTo === 'reps' ? form.repIds : undefined,
        title: form.title,
        description: form.description || null,
        metric: form.metric,
        customUnit: form.metric === 'custom' ? form.customUnit : null,
        targetValue: Number(form.targetValue),
        periodType: form.periodType,
        startDate: form.startDate,
        endDate: form.periodType === 'custom' ? form.endDate : null,
      });
      const count = response.data.data.length;
      setForm({ ...emptyForm, startDate: todayIso() });
      feedback.toast({ message: count > 1 ? `${count} targets set.` : 'Target set.', variant: 'success' });
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to set the target.'));
    } finally {
      setSaving(false);
    }
  };

  const canEdit = (target: TargetRecord) => (target.source === 'manager' ? isManager : target.repId === uid);
  const canArchive = (target: TargetRecord) => isManager || (target.source === 'self' && target.repId === uid);
  const canReport = (target: TargetRecord) =>
    target.metric === 'custom' && (isManager || (target.scope === 'rep' && target.repId === uid));

  const editTarget = async () => {
    if (!detail) return;
    const values = await feedback.requestFields({
      title: 'Edit target',
      description: detail.source === 'manager' ? 'The assignee is notified when the target or period changes.' : undefined,
      confirmLabel: 'Save',
      fields: [
        { id: 'title', label: 'Title', required: true, maxLength: 120, initialValue: detail.title },
        { id: 'targetValue', label: `Target (${unitFor(detail)})`, type: 'number', required: true, initialValue: String(detail.targetValue), validate: (value) => (Number(value) > 0 ? undefined : 'Enter a number above zero.') },
        { id: 'startDate', label: 'Start date', required: true, placeholder: 'YYYY-MM-DD', initialValue: detail.startDate, helpText: detail.periodType === 'custom' ? undefined : `${periodLabels[detail.periodType]} periods snap to the calendar period containing this date.` },
        ...(detail.periodType === 'custom' ? [{ id: 'endDate', label: 'End date', required: true, placeholder: 'YYYY-MM-DD', initialValue: detail.endDate }] : []),
        { id: 'description', label: 'Description', multiline: true, required: false, maxLength: 1000, initialValue: detail.description || '' },
      ],
    });
    if (!values) return;
    setSaving(true);
    try {
      await api.patch(`/targets/${detail.id}`, {
        title: values.title,
        targetValue: Number(values.targetValue),
        startDate: values.startDate,
        ...(detail.periodType === 'custom' ? { endDate: values.endDate } : {}),
        description: values.description || null,
      });
      feedback.toast({ message: 'Target updated.', variant: 'success' });
      await loadDetail(detail.id);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to update the target.'));
    } finally {
      setSaving(false);
    }
  };

  const reportProgress = async () => {
    if (!detail) return;
    const value = await feedback.requestText({
      title: 'Report progress',
      label: `Achieved so far (${detail.customUnit || 'units'})`,
      inputMode: 'decimal',
      initialValue: String(detail.reportedValue ?? ''),
      required: true,
      confirmLabel: 'Save progress',
      validate: (input) => (Number.isFinite(Number(input)) && Number(input) >= 0 ? undefined : 'Enter zero or a positive number.'),
    });
    if (value === null) return;
    try {
      await api.put(`/targets/${detail.id}/progress`, { value: Number(value) });
      feedback.toast({ message: 'Progress saved.', variant: 'success' });
      await loadDetail(detail.id);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to save progress.'));
    }
  };

  const archiveTarget = async () => {
    if (!detail) return;
    const approved = await feedback.confirm({
      title: 'Remove this target?',
      message: 'It will leave active and past lists. Notes are kept with the archived target.',
      confirmLabel: 'Remove target',
      variant: 'danger',
    });
    if (!approved) return;
    try {
      await api.delete(`/targets/${detail.id}`);
      feedback.toast({ message: 'Target removed.', variant: 'success' });
      navigate('/dashboard/targets');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to remove the target.'));
    }
  };

  const addNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detail || !noteDraft.trim()) return;
    setSaving(true);
    try {
      const response = await api.post<ApiResponse<TargetNoteRecord>>(`/targets/${detail.id}/notes`, { body: noteDraft.trim() });
      setDetail({ ...detail, notes: [...detail.notes, response.data.data] });
      setNoteDraft('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to add the note.'));
    } finally {
      setSaving(false);
    }
  };

  const editNote = async (note: TargetNoteRecord) => {
    if (!detail) return;
    const body = await feedback.requestText({
      title: 'Edit note',
      label: 'Note',
      multiline: true,
      maxLength: 1000,
      required: true,
      initialValue: note.body,
      confirmLabel: 'Save',
    });
    if (body === null) return;
    try {
      const response = await api.patch<ApiResponse<TargetNoteRecord>>(`/targets/${detail.id}/notes/${note.id}`, { body });
      setDetail({ ...detail, notes: detail.notes.map((item) => (item.id === note.id ? response.data.data : item)) });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to edit the note.'));
    }
  };

  const deleteNote = async (note: TargetNoteRecord) => {
    if (!detail) return;
    const approved = await feedback.confirm({ title: 'Delete this note?', confirmLabel: 'Delete', variant: 'danger' });
    if (!approved) return;
    try {
      await api.delete(`/targets/${detail.id}/notes/${note.id}`);
      setDetail({ ...detail, notes: detail.notes.filter((item) => item.id !== note.id) });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to delete the note.'));
    }
  };

  if (targetId) {
    return (
      <div className="page animate-fade-in targets-page">
        <div className="page-header">
          <div><p className="eyebrow">Targets</p><h1>{detail?.title || 'Target'}</h1><p>{detail ? `${assigneeName(detail)} · ${formatPeriod(detail)}` : 'Loading target…'}</p></div>
          <Link className="secondary-button" to="/dashboard/targets"><ArrowLeft size={16} /> All targets</Link>
        </div>
        {error && <div className="notice error-notice">{error}</div>}
        {loading || !detail ? <div className="section-card empty-state">Loading target…</div> : (
          <>
            <section className="lead-health-grid">
              <div className="section-card lead-health-card"><p>Achieved</p><strong>{detail.progress.achievedValue}</strong><span>of {detail.targetValue} {unitFor(detail)}</span></div>
              <div className="section-card lead-health-card"><p>Progress</p><strong>{detail.progress.percent}%</strong><span className={`health-pill ${statusPill[detail.progress.status]}`}>{statusLabels[detail.progress.status]}</span></div>
              <div className="section-card lead-health-card"><p>Days left</p><strong>{detail.progress.daysLeft}</strong><span>of {detail.progress.totalDays} day(s){detail.finalized ? ' · final' : ''}</span></div>
              <div className="section-card lead-health-card"><p>Needed per day</p><strong>{detail.progress.requiredPerDay ?? '—'}</strong><span>Expected by now: {detail.progress.expectedByNow}</span></div>
            </section>

            <section className="section-card lead-profile-card">
              <div className="section-heading">
                <div><h2>Target details</h2><p>{detail.source === 'manager' ? 'Set by a manager' : 'Personal target'} · {periodLabels[detail.periodType]}</p></div>
                <div className="settings-actions">
                  {canReport(detail) && <button className="btn-primary" onClick={() => void reportProgress()}>Report progress</button>}
                  {canEdit(detail) && <button className="secondary-button" disabled={saving} onClick={() => void editTarget()}><Pencil size={16} /> Edit</button>}
                  {canArchive(detail) && <button className="danger-button" onClick={() => void archiveTarget()}>Remove</button>}
                </div>
              </div>
              {!canEdit(detail) && detail.source === 'manager' && (
                <div className="notice target-lock-notice"><Lock size={16} /> Your manager set this target, so you can't change it. Use notes below to share context or ask for a revision.</div>
              )}
              <div className="lead-profile-grid">
                <div><small>Metric</small><p>{metricLabels[detail.metric]}{detail.metric === 'custom' && detail.customUnit ? ` (${detail.customUnit})` : ''}</p></div>
                <div><small>Assigned to</small><p>{assigneeName(detail)}</p></div>
                <div><small>Period</small><p>{formatPeriod(detail)}</p></div>
                {detail.metric === 'custom' && <div><small>Last reported</small><p>{detail.reportedAt ? `${format(new Date(detail.reportedAt), 'd MMM yyyy, h:mm a')} by ${personName(detail.reportedBy || '')}` : 'Not reported yet'}</p></div>}
                {detail.description && <div className="target-description"><small>Description</small><p>{detail.description}</p></div>}
              </div>
              {detail.revisions.length > 0 && (
                <div className="health-reasons">
                  <h3>Revision history</h3>
                  <ul>
                    {[...detail.revisions].reverse().map((revision, index) => (
                      <li key={`${revision.changedAt}-${index}`}>
                        {Object.entries(revision.changes).map(([field, change]) => `${editableFieldLabels[field] || field}: ${String(change.from ?? '—')} → ${String(change.to ?? '—')}`).join('; ')}
                        <span className="subtle-text"> — {personName(revision.changedBy)}{revision.changedAt ? `, ${format(new Date(revision.changedAt), 'd MMM yyyy')}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="section-card">
              <div className="section-heading"><div><h2>Notes</h2><p>{isManager ? 'Updates from the rep and your replies.' : 'Share progress, blockers, or context with your manager.'}</p></div></div>
              <div className="lead-timeline">
                {detail.notes.length === 0 ? <div className="empty-state">No notes yet.</div> : detail.notes.map((note) => (
                  <article className="lead-call-card" key={note.id}>
                    <div>
                      <strong>{note.authorId === uid ? 'You' : note.authorName || 'Team member'}</strong>
                      <span>{note.createdAt ? formatDistanceToNow(new Date(note.createdAt), { addSuffix: true }) : ''}{note.editedAt ? ' · edited' : ''}</span>
                    </div>
                    <p className="target-note-body">{note.body}</p>
                    {(note.authorId === uid || isManager) && (
                      <div className="settings-actions">
                        {note.authorId === uid && <button className="secondary-button" onClick={() => void editNote(note)}><Pencil size={14} /> Edit</button>}
                        <button className="secondary-button" onClick={() => void deleteNote(note)}><Trash2 size={14} /> Delete</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
              <form className="target-note-form" onSubmit={addNote}>
                <textarea className="input-field" rows={3} maxLength={1000} placeholder="Add a note…" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} />
                <button className="btn-primary" disabled={saving || !noteDraft.trim()}><Send size={16} /> Add note</button>
              </form>
            </section>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="page animate-fade-in targets-page">
      <div className="page-header">
        <div><p className="eyebrow">Performance</p><h1>Targets</h1><p>{isManager ? 'Set targets for your sales team and track progress from live activity.' : 'Your targets, live progress, and notes for your manager.'}</p></div>
        <button className="secondary-button" onClick={() => void load()}><RefreshCw size={16} /> Refresh</button>
      </div>
      {error && <div className="notice error-notice">{error}</div>}

      <section className="lead-health-grid">
        <div className="section-card lead-health-card"><p>{view === 'current' ? 'Active & upcoming' : 'Past targets'}</p><strong>{targets.length}</strong><span>{summary.upcoming} upcoming</span></div>
        <div className="section-card lead-health-card"><p>On track</p><strong>{summary.on_track}</strong><span>{summary.achieved} achieved</span></div>
        <div className="section-card lead-health-card"><p>Behind</p><strong>{summary.behind}</strong><span>Below expected pace</span></div>
        <div className="section-card lead-health-card"><p>Missed</p><strong>{summary.missed}</strong><span>Period ended short</span></div>
      </section>

      <section className="section-card lead-create-card target-create-card">
        <div className="section-heading"><div><h2>{isManager ? 'Set a target' : 'Set a personal target'}</h2><p>{isManager ? 'Reps can add notes but cannot change targets you set.' : 'Personal targets are yours to edit. Targets from your manager are locked.'}</p></div></div>
        <form className="target-create-form" onSubmit={createTarget}>
          <label>Title<input className="input-field" placeholder="e.g. October outreach" value={form.title} maxLength={120} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
          <label>Metric<select className="input-field" value={form.metric} onChange={(event) => setForm({ ...form, metric: event.target.value as TargetMetric })}>{(Object.keys(metricLabels) as TargetMetric[]).map((metric) => <option key={metric} value={metric}>{metricLabels[metric]}</option>)}</select></label>
          <label>Target<input className="input-field" type="number" min={1} step="any" placeholder="100" value={form.targetValue} onChange={(event) => setForm({ ...form, targetValue: event.target.value })} required /></label>
          {form.metric === 'custom' && <label>Unit<input className="input-field" placeholder="e.g. INR, orders" maxLength={24} value={form.customUnit} onChange={(event) => setForm({ ...form, customUnit: event.target.value })} required /></label>}
          <label>Period<select className="input-field" value={form.periodType} onChange={(event) => setForm({ ...form, periodType: event.target.value as TargetPeriodType })}>{(Object.keys(periodLabels) as TargetPeriodType[]).map((period) => <option key={period} value={period}>{periodLabels[period]}</option>)}</select></label>
          <label>{form.periodType === 'custom' ? 'Start date' : 'Any date in period'}<input className="input-field" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required /></label>
          {form.periodType === 'custom' && <label>End date<input className="input-field" type="date" min={form.startDate} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required /></label>}
          {isManager && (
            <label>Assign to<select className="input-field" value={form.assignTo} onChange={(event) => setForm({ ...form, assignTo: event.target.value as 'reps' | 'team' })}><option value="reps">Selected sales members</option><option value="team">Whole team (combined)</option></select></label>
          )}
          {isManager && form.assignTo === 'reps' && (
            <fieldset className="target-rep-picker">
              <legend>Sales members <button type="button" className="link-button" onClick={() => setForm({ ...form, repIds: form.repIds.length === salesMembers.length ? [] : salesMembers.map((member) => member.id) })}>{form.repIds.length === salesMembers.length && salesMembers.length > 0 ? 'Clear' : 'Select all'}</button></legend>
              {salesMembers.length === 0 ? <p className="subtle-text">No active sales members yet.</p> : salesMembers.map((member) => (
                <label key={member.id} className="target-rep-option">
                  <input type="checkbox" checked={form.repIds.includes(member.id)} onChange={(event) => setForm({ ...form, repIds: event.target.checked ? [...form.repIds, member.id] : form.repIds.filter((id) => id !== member.id) })} />
                  {member.name || member.email}
                </label>
              ))}
            </fieldset>
          )}
          <label className="target-description">Description (optional)<input className="input-field" maxLength={1000} placeholder="What does success look like?" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <button className="btn-primary" disabled={saving}><Plus size={16} /> {saving ? 'Saving…' : 'Set target'}</button>
        </form>
      </section>

      <section className="section-card lead-filter-bar target-filter-bar">
        <select className="input-field" value={view} onChange={(event) => setView(event.target.value as 'current' | 'past')}><option value="current">Active & upcoming</option><option value="past">Past</option></select>
        <select className="input-field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{(Object.keys(statusLabels) as TargetStatus[]).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select>
        {isManager && <select className="input-field" value={repFilter} onChange={(event) => setRepFilter(event.target.value)}><option value="">All assignees</option>{salesMembers.map((member) => <option key={member.id} value={member.id}>{member.name || member.email}</option>)}</select>}
      </section>

      <section className="section-card table-card" aria-busy={loading}>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Target</th><th>Assignee</th><th>Metric</th><th>Progress</th><th>Status</th><th>Set by</th></tr></thead><tbody>
          {loading ? <tr><td colSpan={6} className="table-message">Loading targets…</td></tr> : visibleTargets.length === 0 ? <tr><td colSpan={6} className="table-message"><TargetIcon size={16} /> No targets here yet.</td></tr> : visibleTargets.map((target) => (
            <tr key={target.id}>
              <td data-label="Target"><Link className="lead-name-link" to={`/dashboard/targets/${target.id}`}><strong>{target.title}</strong><span>{formatPeriod(target)} · {periodLabels[target.periodType]}</span></Link></td>
              <td data-label="Assignee">{assigneeName(target)}</td>
              <td data-label="Metric">{metricLabels[target.metric]}</td>
              <td data-label="Progress"><ProgressBar target={target} /></td>
              <td data-label="Status"><span className={`health-pill ${statusPill[target.progress.status]}`}>{statusLabels[target.progress.status]}</span></td>
              <td data-label="Set by"><span className="role-badge">{target.source === 'manager' ? 'Manager' : 'Personal'}</span></td>
            </tr>
          ))}
        </tbody></table></div>
      </section>
    </div>
  );
};
