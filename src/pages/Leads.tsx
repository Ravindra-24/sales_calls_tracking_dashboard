import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BrainCircuit, Plus, RefreshCw, Save, TrendingDown, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/auth';
import { useFeedback } from '../context/feedback';
import type { ApiResponse, LeadCallRecord, LeadRecord, TeamMember } from '../types/api';

const stages: LeadRecord['stage'][] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
const emptyForm = { name: '', company: '', primaryPhone: '', ownerRepId: '' };

export const Leads = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { claims } = useAuth();
  const feedback = useFeedback();
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [detail, setDetail] = useState<LeadRecord | null>(null);
  const [calls, setCalls] = useState<LeadCallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [health, setHealth] = useState('');
  const [trend, setTrend] = useState('');
  const [owner, setOwner] = useState('');
  const [lastCallDays, setLastCallDays] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const requests: Promise<unknown>[] = [
        api.get<ApiResponse<LeadRecord[]>>('/leads', {
          params: { search: search || undefined, stage: stage || undefined, health: health || undefined, limit: 100 },
        }),
      ];
      if (claims.role !== 'sales_member' && claims.orgId) {
        requests.push(api.get<ApiResponse<TeamMember[]>>(`/orgs/${claims.orgId}/users`, { params: { limit: 100 } }));
      }
      const responses = await Promise.all(requests);
      setLeads((responses[0] as { data: ApiResponse<LeadRecord[]> }).data.data);
      if (responses[1]) {
        setMembers((responses[1] as { data: ApiResponse<TeamMember[]> }).data.data.filter(
          (member) => member.role === 'sales_member' && member.status === 'active',
        ));
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load leads.'));
    } finally {
      setLoading(false);
    }
  }, [claims.orgId, claims.role, health, search, stage]);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const [leadResponse, callsResponse] = await Promise.all([
        api.get<ApiResponse<LeadRecord>>(`/leads/${id}`),
        api.get<ApiResponse<LeadCallRecord[]>>(`/leads/${id}/calls`),
      ]);
      setDetail(leadResponse.data.data);
      setCalls(callsResponse.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load lead intelligence.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (leadId) void loadDetail(leadId); else void load(); }, [leadId, load, loadDetail]);

  useEffect(() => {
    if (claims.role === 'sales_member' || !claims.orgId) return;
    void api.get<ApiResponse<TeamMember[]>>(`/orgs/${claims.orgId}/users`, { params: { limit: 100 } })
      .then((response) => setMembers(response.data.data.filter((member) => member.role === 'sales_member' && member.status === 'active')))
      .catch(() => undefined);
  }, [claims.orgId, claims.role]);

  const names = useMemo(() => new Map(members.map((member) => [member.id, member.name || member.email])), [members]);
  const visibleLeads = useMemo(() => leads.filter((lead) => {
    if (trend && lead.health.trend !== trend) return false;
    if (owner && lead.ownerRepId !== owner) return false;
    if (actionFilter === 'set' && !lead.nextAction) return false;
    if (actionFilter === 'missing' && lead.nextAction) return false;
    if (lastCallDays) {
      if (!lead.lastCallAt) return false;
      if (Date.now() - new Date(lead.lastCallAt).getTime() > Number(lastCallDays) * 86_400_000) return false;
    }
    return true;
  }), [actionFilter, lastCallDays, leads, owner, trend]);

  const createLead = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        company: form.company || null,
        primaryPhone: form.primaryPhone,
        ...(claims.role === 'sales_member' ? {} : { ownerRepId: form.ownerRepId, assignedRepIds: [form.ownerRepId] }),
      };
      const response = await api.post<ApiResponse<LeadRecord>>('/leads', payload);
      setForm(emptyForm);
      feedback.toast({ message: 'Lead created.', variant: 'success' });
      navigate(`/dashboard/leads/${response.data.data.id}`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to create lead.'));
    } finally {
      setSaving(false);
    }
  };

  const updateLead = async (patch: Partial<LeadRecord>) => {
    if (!detail) return;
    setSaving(true);
    try {
      const response = await api.patch<ApiResponse<LeadRecord>>(`/leads/${detail.id}`, patch);
      setDetail(response.data.data);
      feedback.toast({ message: 'Lead updated.', variant: 'success' });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to update lead.'));
    } finally {
      setSaving(false);
    }
  };

  const editNotes = async () => {
    if (!detail) return;
    const values = await feedback.requestFields({
      title: 'Lead follow-up',
      confirmLabel: 'Save',
      fields: [
        { id: 'name', label: 'Lead name', required: true, maxLength: 120, initialValue: detail.name },
        { id: 'company', label: 'Company', required: false, maxLength: 120, initialValue: detail.company || '' },
        { id: 'primaryPhone', label: 'Primary phone', required: true, maxLength: 30, initialValue: detail.primaryPhone },
        { id: 'notes', label: 'Notes', multiline: true, required: false, maxLength: 2000, initialValue: detail.notes || '' },
        { id: 'nextAction', label: 'Next action', required: false, maxLength: 280, initialValue: detail.nextAction || '' },
        { id: 'followUpAt', label: 'Follow-up date', required: false, placeholder: 'YYYY-MM-DD', initialValue: detail.followUpAt?.slice(0, 10) || '' },
      ],
    });
    if (!values) return;
    await updateLead({
      name: values.name,
      company: values.company || null,
      primaryPhone: values.primaryPhone,
      notes: values.notes,
      nextAction: values.nextAction,
      followUpAt: values.followUpAt ? new Date(`${values.followUpAt}T09:00:00`).toISOString() : null,
      followUpStatus: values.followUpAt ? 'open' : 'none',
    });
  };

  const applySuggestion = async (analysisId: string) => {
    if (!detail) return;
    try {
      const response = await api.post<ApiResponse<LeadRecord>>(`/leads/${detail.id}/suggestions/${analysisId}/apply`);
      setDetail(response.data.data);
      await loadDetail(detail.id);
      feedback.toast({ message: 'AI suggestion applied to the lead follow-up.', variant: 'success' });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to apply the suggestion.'));
    }
  };

  const archiveLead = async () => {
    if (!detail) return;
    const approved = await feedback.confirm({
      title: 'Archive this lead?',
      message: 'The lead will leave active lists. Linked call records are retained.',
      confirmLabel: 'Archive lead',
      variant: 'danger',
    });
    if (!approved) return;
    try {
      await api.delete(`/leads/${detail.id}`);
      feedback.toast({ message: 'Lead archived.', variant: 'success' });
      navigate('/dashboard/leads');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to archive lead.'));
    }
  };

  if (leadId) {
    return (
      <div className="page animate-fade-in leads-page">
        <div className="page-header">
          <div><p className="eyebrow">Deal intelligence</p><h1>{detail?.name || 'Lead'}</h1><p>{detail?.company || detail?.primaryPhone || 'Loading lead profile…'}</p></div>
          <Link className="secondary-button" to="/dashboard/leads"><ArrowLeft size={16} /> All leads</Link>
        </div>
        {error && <div className="notice error-notice">{error}</div>}
        {loading || !detail ? <div className="section-card empty-state">Loading lead intelligence…</div> : (
          <>
            <section className="lead-health-grid">
              <div className={`section-card lead-health-card ${detail.health.label || 'unscored'}`}>
                <p>Deal health</p><strong>{detail.health.score ?? '—'}</strong><span>{detail.health.label?.replace('_', ' ') || detail.health.status}</span>
              </div>
              <div className="section-card lead-health-card"><p>Trend</p><strong>{detail.health.trend === 'improving' ? <TrendingUp /> : detail.health.trend === 'declining' ? <TrendingDown /> : '—'}</strong><span>{detail.health.trend || 'No trend'}</span></div>
              <div className="section-card lead-health-card"><p>Confidence</p><strong>{detail.health.confidence}</strong><span>{detail.health.analyzedCallCount} analyzed call(s)</span></div>
              <div className="section-card lead-health-card"><p>Connected calls</p><strong>{detail.connectedCallCount}</strong><span>{detail.lastConnectedCallAt ? format(new Date(detail.lastConnectedCallAt), 'd MMM yyyy') : 'No connection yet'}</span></div>
            </section>
            <section className="section-card lead-profile-card">
              <div className="section-heading"><div><h2>Lead profile</h2><p>{detail.primaryPhone} · Owner {names.get(detail.ownerRepId) || detail.ownerRepId.slice(0, 8)}</p></div><div className="settings-actions"><button className="secondary-button" onClick={() => void editNotes()}><Save size={16} /> Edit & follow-up</button>{claims.role !== 'sales_member' && <button className="danger-button" onClick={() => void archiveLead()}>Archive</button>}</div></div>
              <div className="lead-profile-grid">
                <label>Stage<select className="input-field" value={detail.stage} disabled={saving} onChange={(event) => void updateLead({ stage: event.target.value as LeadRecord['stage'] })}>{stages.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
                {claims.role !== 'sales_member' && <label>Owner<select className="input-field" value={detail.ownerRepId} disabled={saving} onChange={(event) => void updateLead({ ownerRepId: event.target.value, assignedRepIds: Array.from(new Set([...detail.assignedRepIds, event.target.value])) })}>{members.map((member) => <option value={member.id} key={member.id}>{member.name || member.email}</option>)}</select></label>}
                {claims.role !== 'sales_member' && <label>Assignees<select className="input-field" multiple value={detail.assignedRepIds} disabled={saving} onChange={(event) => void updateLead({ assignedRepIds: Array.from(event.target.selectedOptions, (option) => option.value) })}>{members.map((member) => <option value={member.id} key={member.id}>{member.name || member.email}</option>)}</select></label>}
                <div><small>Next action</small><p>{detail.nextAction || 'No action applied yet.'}</p></div>
                <div><small>Follow-up</small><p>{detail.followUpAt ? format(new Date(detail.followUpAt), 'd MMM yyyy') : 'Not scheduled'}</p></div>
              </div>
              {detail.health.reasons.length > 0 && <div className="health-reasons"><h3>Why this score</h3><ul>{detail.health.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div>}
            </section>
            <section className="section-card">
              <div className="section-heading"><div><h2>Call intelligence timeline</h2><p>Summaries, customer sentiment, and recommended actions.</p></div></div>
              <div className="lead-timeline">
                {calls.length === 0 ? <div className="empty-state">No linked calls yet.</div> : calls.map((call) => (
                  <article className="lead-call-card" key={call.id}>
                    <div><strong>{call.startTime ? format(new Date(call.startTime), 'd MMM yyyy, h:mm a') : 'Call'}</strong><span>{call.direction} · {Math.round(call.durationSeconds / 60)} min</span></div>
                    {call.analysis ? <>
                      <span className={`health-pill ${call.analysis.sentimentLabel || 'neutral'}`}>{call.analysis.sentimentLabel || call.analysis.status}</span>
                      <p>{call.analysis.summary || 'Analysis is still processing.'}</p>
                      {call.analysis.suggestedNextAction?.text && <div className="suggestion-box"><BrainCircuit size={18} /><div><strong>{call.analysis.suggestedNextAction.text}</strong><p>{call.analysis.suggestedNextAction.rationale}</p></div>{!call.analysis.suggestedNextAction.appliedAt && <button className="btn-primary" onClick={() => void applySuggestion(call.analysis!.id)}>Apply</button>}</div>}
                    </> : <p>No AI analysis for this call.</p>}
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="page animate-fade-in leads-page">
      <div className="page-header"><div><p className="eyebrow">Deal intelligence</p><h1>Leads</h1><p>Prioritize follow-ups using call sentiment, engagement, and momentum.</p></div><button className="secondary-button" onClick={() => void load()}><RefreshCw size={16} /> Refresh</button></div>
      {error && <div className="notice error-notice">{error}</div>}
      <section className="section-card lead-create-card">
        <div className="section-heading"><div><h2>Add lead</h2><p>Calls to the same normalized phone number link automatically.</p></div></div>
        <form className="lead-create-form" onSubmit={createLead}>
          <input className="input-field" placeholder="Lead name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <input className="input-field" placeholder="Company (optional)" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} />
          <input className="input-field" placeholder="Phone number" value={form.primaryPhone} onChange={(event) => setForm({ ...form, primaryPhone: event.target.value })} required />
          {claims.role !== 'sales_member' && <select className="input-field" value={form.ownerRepId} onChange={(event) => setForm({ ...form, ownerRepId: event.target.value })} required><option value="">Choose owner</option>{members.map((member) => <option value={member.id} key={member.id}>{member.name || member.email}</option>)}</select>}
          <button className="btn-primary" disabled={saving}><Plus size={16} /> {saving ? 'Saving…' : 'Add lead'}</button>
        </form>
      </section>
      <section className="section-card lead-filter-bar">
        <input className="input-field" placeholder="Search name, company, or phone" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="input-field" value={stage} onChange={(event) => setStage(event.target.value)}><option value="">All stages</option>{stages.map((value) => <option value={value} key={value}>{value}</option>)}</select>
        <select className="input-field" value={health} onChange={(event) => setHealth(event.target.value)}><option value="">All health</option><option value="strong">Strong</option><option value="healthy">Healthy</option><option value="watch">Watch</option><option value="at_risk">At risk</option></select>
        <select className="input-field" value={trend} onChange={(event) => setTrend(event.target.value)}><option value="">All trends</option><option value="improving">Improving</option><option value="stable">Stable</option><option value="declining">Declining</option></select>
        {claims.role !== 'sales_member' && <select className="input-field" value={owner} onChange={(event) => setOwner(event.target.value)}><option value="">All owners</option>{members.map((member) => <option value={member.id} key={member.id}>{member.name || member.email}</option>)}</select>}
        <select className="input-field" value={lastCallDays} onChange={(event) => setLastCallDays(event.target.value)}><option value="">Any last call</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="60">Last 60 days</option></select>
        <select className="input-field" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}><option value="">Any next action</option><option value="set">Action set</option><option value="missing">Action missing</option></select>
        <button className="secondary-button" onClick={() => void load()}>Apply</button>
      </section>
      <section className="section-card table-card" aria-busy={loading}>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Lead</th><th>Stage</th><th>Owner</th><th>Health</th><th>Trend</th><th>Last call</th><th>Next action</th></tr></thead><tbody>
          {loading ? <tr><td colSpan={7} className="table-message">Loading leads…</td></tr> : visibleLeads.length === 0 ? <tr><td colSpan={7} className="table-message">No leads match these filters.</td></tr> : visibleLeads.map((lead) => <tr key={lead.id}>
            <td data-label="Lead"><Link className="lead-name-link" to={`/dashboard/leads/${lead.id}`}><strong>{lead.name}</strong><span>{lead.company || lead.primaryPhone}</span></Link></td>
            <td data-label="Stage"><span className="role-badge">{lead.stage}</span></td>
            <td data-label="Owner">{names.get(lead.ownerRepId) || lead.ownerRepId.slice(0, 8)}</td>
            <td data-label="Health"><span className={`health-pill ${lead.health.label || 'unscored'}`}>{lead.health.score ?? '—'} {lead.health.label?.replace('_', ' ') || ''}</span></td>
            <td data-label="Trend">{lead.health.trend || '—'}</td>
            <td data-label="Last call">{lead.lastCallAt ? format(new Date(lead.lastCallAt), 'd MMM yyyy') : '—'}</td>
            <td data-label="Next action">{lead.nextAction || '—'}</td>
          </tr>)}
        </tbody></table></div>
      </section>
    </div>
  );
};
