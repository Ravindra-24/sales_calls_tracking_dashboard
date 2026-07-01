import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Mail, Shield, User, UserPlus, X } from 'lucide-react';
import { format } from 'date-fns';
import { api, getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/auth';
import type { ApiResponse, InviteResult, TeamMember } from '../types/api';

export const Team = () => {
  const { claims } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'rep' | 'manager'>('rep');
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  const loadTeam = useCallback(async () => {
    if (!claims.orgId) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get<ApiResponse<TeamMember[]>>(`/orgs/${claims.orgId}/users`, { params: { limit: 100 } });
      setMembers(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load team members.'));
    } finally {
      setLoading(false);
    }
  }, [claims.orgId]);

  useEffect(() => { void loadTeam(); }, [loadTeam]);

  const submitInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!claims.orgId) return;
    setSubmitting(true);
    setError('');
    setInvite(null);
    try {
      const response = await api.post<ApiResponse<InviteResult>>(`/orgs/${claims.orgId}/invites`, { email: email.trim(), role });
      setInvite(response.data.data);
      setEmail('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to create the invitation.'));
    } finally {
      setSubmitting(false);
    }
  };

  const copyToken = async () => {
    if (!invite) return;
    await navigator.clipboard.writeText(invite.token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div><p className="eyebrow">Organization</p><h1>Team management</h1><p>View members and invite sales representatives or managers.</p></div>
        <button className="btn-primary" onClick={() => { setShowInvite(true); setInvite(null); }}><UserPlus size={18} /> Invite member</button>
      </div>

      {error && <div className="notice error-notice">{error}</div>}

      {showInvite && (
        <section className="section-card invite-panel">
          <div className="section-heading">
            <div><h2>Create invitation</h2><p>The invite expires after 72 hours.</p></div>
            <button className="icon-button" aria-label="Close invitation form" onClick={() => setShowInvite(false)}><X size={18} /></button>
          </div>
          <form className="invite-form" onSubmit={submitInvite}>
            <label>Email address<div className="input-with-icon"><Mail size={17} /><input className="input-field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="rep@company.com" required /></div></label>
            <label>Role<select className="input-field" value={role} onChange={(event) => setRole(event.target.value as 'rep' | 'manager')}>
              <option value="rep">Sales representative</option>
              {claims.role === 'owner' && <option value="manager">Manager</option>}
            </select></label>
            <button className="btn-primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create invitation'}</button>
          </form>

          {invite && (
            <div className="invite-result">
              <div className="success-icon"><Check size={18} /></div>
              <div><strong>Invitation created for {invite.email}</strong><p>Share this token securely. It expires {format(new Date(invite.expiresAt), 'd MMM yyyy, h:mm a')}.</p></div>
              <code>{invite.token}</code>
              <button className="secondary-button" type="button" onClick={copyToken}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy token'}</button>
            </div>
          )}
        </section>
      )}

      <div className="section-card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Phone</th><th>Joined</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="table-message">Loading team members…</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={5} className="table-message">No team members found.</td></tr>
              ) : members.map((member) => (
                <tr key={member.id}>
                  <td><div className="member-cell"><div className="avatar"><User size={17} /></div><div><strong>{member.name || 'Unnamed member'}</strong><span>{member.email}</span></div></div></td>
                  <td><span className={`role-badge ${member.role}`}><Shield size={14} /> {member.role}</span></td>
                  <td><span className={`status-badge ${member.status}`}><i /> {member.status}</span></td>
                  <td>{member.phoneNumber || '—'}</td>
                  <td>{member.createdAt ? format(new Date(member.createdAt), 'd MMM yyyy') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
