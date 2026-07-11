import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Mail, RefreshCw, Shield, User, UserPlus, X } from 'lucide-react';
import { format } from 'date-fns';
import { api, getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/auth';
import type { ApiResponse, InviteLog, InviteResult, OrganizationDetails, TeamMember } from '../types/api';

export const Team = () => {
  const { user, claims } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<InviteLog[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'sales_member' | 'manager'>('sales_member');
  const [inviteStatusFilter, setInviteStatusFilter] = useState<InviteLog['status'] | 'all'>('pending');
  const [createAccountNow, setCreateAccountNow] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState('');
  const [managerCanEditSalesMembers, setManagerCanEditSalesMembers] = useState(true);
  const [editingMemberId, setEditingMemberId] = useState('');
  const [editingName, setEditingName] = useState('');
  const [savingMemberId, setSavingMemberId] = useState('');
  const canManage = claims.role === 'org_admin' || claims.role === 'manager';

  const loadMembers = useCallback(async () => {
    if (!claims.orgId || !canManage) return;
    setMembersLoading(true);
    setError('');
    try {
      const usersResponse = await api.get<ApiResponse<TeamMember[]>>(`/orgs/${claims.orgId}/users`, { params: { limit: 100 } });
      setMembers(usersResponse.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load team members.'));
    } finally {
      setMembersLoading(false);
    }
  }, [canManage, claims.orgId]);

  const loadInvites = useCallback(async () => {
    if (!claims.orgId || !canManage) return;
    setInvitesLoading(true);
    setError('');
    try {
      const inviteParams = {
        limit: 100,
        status: inviteStatusFilter === 'all' ? undefined : inviteStatusFilter,
      };
      const invitesResponse = await api.get<ApiResponse<InviteLog[]>>(`/orgs/${claims.orgId}/invites`, { params: inviteParams });
      setInvites(invitesResponse.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load invite log.'));
    } finally {
      setInvitesLoading(false);
    }
  }, [canManage, claims.orgId, inviteStatusFilter]);

  useEffect(() => { void loadMembers(); }, [loadMembers]);
  useEffect(() => { void loadInvites(); }, [loadInvites]);

  useEffect(() => {
    if (!claims.orgId || claims.role !== 'manager') return;

    api.get<ApiResponse<OrganizationDetails>>(`/orgs/${claims.orgId}`)
      .then((response) => setManagerCanEditSalesMembers(response.data.data.settings.managerCanEditSalesMembers ?? true))
      .catch(() => setManagerCanEditSalesMembers(true));
  }, [claims.orgId, claims.role]);

  const submitInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!claims.orgId) return;
    setSubmitting(true);
    setError('');
    setMessage('');
    setInvite(null);
    try {
      const payload = {
        email: email.trim(),
        role,
        createAccountNow,
        temporaryPassword: createAccountNow ? temporaryPassword.trim() || undefined : undefined,
      };
      const response = await api.post<ApiResponse<InviteResult>>(`/orgs/${claims.orgId}/invites`, payload);
      setInvite(response.data.data);
      setEmail('');
      setCreateAccountNow(false);
      setTemporaryPassword('');
      await loadInvites();
      if (response.data.data.createdUser) {
        await loadMembers();
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to create the invitation.'));
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(''), 1800);
  };

  const resendInvite = async (inviteId: string) => {
    if (!claims.orgId) return;
    setError('');
    setMessage('');
    try {
      const response = await api.post<ApiResponse<{ inviteLink: string; emailSent: boolean }>>(
        `/orgs/${claims.orgId}/invites/${inviteId}/resend`,
      );
      setMessage(response.data.data.emailSent ? 'Invite email sent again.' : 'Invite link refreshed. Copy and share it manually.');
      if (response.data.data.inviteLink) {
        await copyText(response.data.data.inviteLink, inviteId);
      }
      await loadInvites();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to resend invite.'));
    }
  };

  const revokeInvite = async (inviteId: string) => {
    if (!claims.orgId) return;
    setError('');
    setMessage('');
    try {
      await api.patch(`/orgs/${claims.orgId}/invites/${inviteId}/revoke`);
      setMessage('Invite revoked.');
      await loadInvites();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to revoke invite.'));
    }
  };

  const resetPassword = async (member: TeamMember) => {
    setError('');
    setMessage('');
    try {
      const response = await api.post<ApiResponse<{ resetLink?: string; emailSent: boolean }>>(`/orgs/users/${member.id}/password-reset`);
      if (response.data.data.resetLink) {
        await copyText(response.data.data.resetLink, `reset-${member.id}`);
      }
      setMessage(response.data.data.emailSent ? `Password reset sent to ${member.email}.` : 'Password reset link copied.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to create password reset link.'));
    }
  };

  const canEditMember = (member: TeamMember) => {
    if (member.id === user?.uid) return false;
    if (claims.role === 'org_admin') return true;
    return member.role === 'sales_member' && managerCanEditSalesMembers;
  };

  const startEdit = (member: TeamMember) => {
    setEditingMemberId(member.id);
    setEditingName(member.name || '');
  };

  const saveMemberName = async (member: TeamMember) => {
    if (!editingName.trim()) return;
    setSavingMemberId(member.id);
    setError('');
    setMessage('');
    try {
      await api.patch(`/orgs/users/${member.id}`, { name: editingName.trim() });
      setMessage(`Updated ${member.email}.`);
      setEditingMemberId('');
      await loadMembers();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to update member.'));
    } finally {
      setSavingMemberId('');
    }
  };

  const toggleMemberStatus = async (member: TeamMember) => {
    setSavingMemberId(member.id);
    setError('');
    setMessage('');
    try {
      const status = member.status === 'active' ? 'disabled' : 'active';
      await api.patch(`/orgs/users/${member.id}`, { status });
      setMessage(`${member.email} is now ${status}.`);
      await loadMembers();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to update member status.'));
    } finally {
      setSavingMemberId('');
    }
  };

  if (!canManage) {
    return (
      <div className="page animate-fade-in">
        <div className="page-header">
          <div><p className="eyebrow">Organization</p><h1>Team management</h1><p>Your role does not include team administration.</p></div>
        </div>
        <div className="notice error-notice">Team management is available to organization admins and managers.</div>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div><p className="eyebrow">Organization</p><h1>Team management</h1><p>Manage members, password resets, and invitation history.</p></div>
        <button className="btn-primary" onClick={() => { setShowInvite(true); setInvite(null); }}><UserPlus size={18} /> Invite member</button>
      </div>

      {error && <div className="notice error-notice">{error}</div>}
      {message && <div className="notice success-notice">{message}</div>}
      {claims.role === 'manager' && !managerCanEditSalesMembers && (
        <div className="notice error-notice">Manager sales representative edits are disabled by the org admin.</div>
      )}

      {showInvite && (
        <section className="section-card invite-panel">
          <div className="section-heading">
            <div><h2>Create invitation</h2><p>Use a claim link, or set a temporary password to create the account immediately.</p></div>
            <button className="icon-button" aria-label="Close invitation form" onClick={() => setShowInvite(false)}><X size={18} /></button>
          </div>
          <form className="invite-form expanded-invite-form" onSubmit={submitInvite}>
            <label>Email address<div className="input-with-icon"><Mail size={17} /><input className="input-field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="sales@company.com" required /></div></label>
            <label>Role<select className="input-field" value={role} onChange={(event) => setRole(event.target.value as 'sales_member' | 'manager')}>
              <option value="sales_member">Sales member</option>
              {claims.role === 'org_admin' && <option value="manager">Manager</option>}
            </select></label>
            <label className="checkbox-label"><input type="checkbox" checked={createAccountNow} onChange={(event) => setCreateAccountNow(event.target.checked)} /> Create account now</label>
            {createAccountNow && <label>Temporary password<input className="input-field" type="text" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} placeholder="Required" minLength={6} required /></label>}
            <button className="btn-primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create invitation'}</button>
          </form>

          {invite && (
            <div className="invite-result">
              <div className="success-icon"><Check size={18} /></div>
              <div><strong>{invite.createdUser ? 'Account created' : 'Invitation created'} for {invite.email}</strong><p>{invite.createdUser ? 'Share the login link and temporary password securely.' : `The invite expires ${format(new Date(invite.expiresAt), 'd MMM yyyy, h:mm a')}.`}{invite.emailSent === false ? ' Email was not sent; copy and share manually.' : ''}</p></div>
              <code>{invite.createdUser ? `${invite.createdUser.loginLink} | ${invite.createdUser.temporaryPassword}` : invite.inviteLink ?? invite.token}</code>
              <div className="invite-result-actions">
                <button className="secondary-button" type="button" onClick={() => copyText(invite.createdUser ? `${invite.createdUser.loginLink}\nEmail: ${invite.email}\nTemporary password: ${invite.createdUser.temporaryPassword}` : invite.inviteLink ?? invite.token, 'new-invite')}>
                  {copied === 'new-invite' ? <Check size={16} /> : <Copy size={16} />} {copied === 'new-invite' ? 'Copied' : 'Copy Link'}
                </button>
                {!invite.createdUser && (invite.token || invite.inviteLink) && (
                  <button className="secondary-button" type="button" onClick={() => {
                    let t = invite.token;
                    if (!t && invite.inviteLink) {
                      try { t = new URL(invite.inviteLink).searchParams.get('token') || ''; } catch { t = invite.inviteLink.split('token=')[1]?.split('&')[0] || ''; }
                    }
                    if (t) copyText(t, 'new-invite-token');
                  }}>
                    {copied === 'new-invite-token' ? <Check size={16} /> : <Copy size={16} />} {copied === 'new-invite-token' ? 'Token Copied' : 'Copy Token'}
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="section-card table-card">
        <div className="section-heading table-heading"><div><h2>Members</h2><p>Active organization users and roles.</p></div></div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Phone</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {membersLoading ? (
                <tr><td colSpan={6} className="table-message">Loading team members…</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={6} className="table-message">No team members found.</td></tr>
              ) : members.map((member) => (
                <tr key={member.id}>
                  <td data-label="Member">
                    {editingMemberId === member.id ? (
                      <div className="member-edit-form">
                        <input className="input-field" value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                        <button className="secondary-button" disabled={savingMemberId === member.id} onClick={() => saveMemberName(member)}>{savingMemberId === member.id ? 'Saving...' : 'Save'}</button>
                        <button className="secondary-button" onClick={() => setEditingMemberId('')}>Cancel</button>
                      </div>
                    ) : (
                      <div className="member-cell"><div className="avatar"><User size={17} /></div><div><strong>{member.name || 'Unnamed member'}</strong><span>{member.email}</span></div></div>
                    )}
                  </td>
                  <td data-label="Role"><span className={`role-badge ${member.role}`}><Shield size={14} /> {formatRole(member.role)}</span></td>
                  <td data-label="Status"><span className={`status-badge ${member.status}`}><i /> {member.status}</span></td>
                  <td data-label="Phone">{member.phoneNumber || '—'}</td>
                  <td data-label="Joined">{member.createdAt ? format(new Date(member.createdAt), 'd MMM yyyy') : '—'}</td>
                  <td data-label="Actions">
                    <div className="row-actions">
                      <button className="secondary-button" disabled={!canEditMember(member)} onClick={() => startEdit(member)}><User size={15} /> Edit</button>
                      <button className="secondary-button" disabled={!canEditMember(member) || savingMemberId === member.id} onClick={() => toggleMemberStatus(member)}>
                        {member.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button className="secondary-button" disabled={!canEditMember(member)} onClick={() => resetPassword(member)}><KeyRound size={15} /> Reset</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-card table-card invite-log-card">
        <div className="section-heading table-heading">
          <div><h2>Invite send log</h2><p>Track pending, accepted, expired, and revoked invitations.</p></div>
          <label className="table-filter-label">Status
            <select className="input-field compact-select" value={inviteStatusFilter} onChange={(event) => setInviteStatusFilter(event.target.value as InviteLog['status'] | 'all')}>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
              <option value="all">All</option>
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Expires</th><th>Actions</th></tr></thead>
            <tbody>
              {invitesLoading ? (
                <tr><td colSpan={6} className="table-message">Loading invite log…</td></tr>
              ) : invites.length === 0 ? (
                <tr><td colSpan={6} className="table-message">No {inviteStatusFilter === 'all' ? '' : inviteStatusFilter} invites found.</td></tr>
              ) : invites.map((row) => (
                <tr key={row.id}>
                  <td data-label="Email">{row.email}</td>
                  <td data-label="Role"><span className={`role-badge ${row.role}`}>{formatRole(row.role)}</span></td>
                  <td data-label="Status"><span className={`status-badge ${row.status}`}><i /> {row.status}</span></td>
                  <td data-label="Created">{row.createdAt ? format(new Date(row.createdAt), 'd MMM yyyy') : '—'}</td>
                  <td data-label="Expires">{row.expiresAt ? format(new Date(row.expiresAt), 'd MMM yyyy') : '—'}</td>
                  <td data-label="Actions">
                    <div className="row-actions">
                      {row.status === 'pending' && row.inviteLink && (
                        <>
                          <button className="secondary-button" onClick={() => copyText(row.inviteLink!, row.id)}>{copied === row.id ? <Check size={15} /> : <Copy size={15} />} Copy Link</button>
                          <button className="secondary-button" onClick={() => {
                            let t = '';
                            try { t = new URL(row.inviteLink!).searchParams.get('token') || ''; } catch { t = row.inviteLink!.split('token=')[1]?.split('&')[0] || ''; }
                            if (t) copyText(t, `${row.id}-token`);
                          }}>{copied === `${row.id}-token` ? <Check size={15} /> : <Copy size={15} />} Copy Token</button>
                        </>
                      )}
                      {row.status === 'pending' && <button className="secondary-button" onClick={() => resendInvite(row.id)}><RefreshCw size={15} /> Resend</button>}
                      {row.status === 'pending' && <button className="secondary-button danger-button" onClick={() => revokeInvite(row.id)}>Revoke</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const formatRole = (role: string) => role.replace('org_admin', 'org admin').replace('sales_member', 'sales member');
