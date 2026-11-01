import { Fragment, useCallback, useEffect, useState } from 'react';
import { Check, Copy, Crown, Headset, KeyRound, Mail, RefreshCw, ShieldCheck, Trash2, User, UserPlus, Users, X, type LucideIcon } from 'lucide-react';
import { format } from 'date-fns';
import { api, getApiErrorMessage } from '../api/client';
import { ActionMenu } from '../components/ActionMenu';
import { AddTeamMembersDialog, AssignmentBadge } from '../components/org/AddTeamMembersDialog';
import { useAuth } from '../context/auth';
import { useFeedback } from '../context/feedback';
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
  const [addingToManagerId, setAddingToManagerId] = useState('');
  const [addMembersError, setAddMembersError] = useState('');
  const [expandedManagerId, setExpandedManagerId] = useState('');
  const feedback = useFeedback();
  const canManage = claims.role === 'org_admin' || claims.role === 'manager';

  const loadMembers = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!claims.orgId || !canManage) return;
    if (!options.silent) {
      setMembersLoading(true);
      setError('');
    }
    try {
      const usersResponse = await api.get<ApiResponse<TeamMember[]>>(`/orgs/${claims.orgId}/users`, { params: { limit: 100 } });
      const visibleMembers = claims.role === 'manager'
        ? usersResponse.data.data.filter((member) => member.id === user?.uid || member.managerId === user?.uid)
        : usersResponse.data.data;
      setMembers(visibleMembers);
    } catch (requestError) {
      if (!options.silent) setError(getApiErrorMessage(requestError, 'Failed to load team members.'));
    } finally {
      if (!options.silent) setMembersLoading(false);
    }
  }, [canManage, claims.orgId, claims.role, user?.uid]);

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
    if (claims.role !== 'manager') return;
    const refreshTeam = () => { void loadMembers({ silent: true }); };
    window.addEventListener('focus', refreshTeam);
    return () => {
      window.removeEventListener('focus', refreshTeam);
    };
  }, [claims.role, loadMembers]);

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

  const updateMemberRole = async (member: TeamMember, nextRole: 'sales_member' | 'manager') => {
    if (nextRole === 'manager' && member.managerId) {
      const currentManager = members.find((candidate) => candidate.id === member.managerId);
      setMessage('');
      setError(`First remove ${member.name || member.email} from ${currentManager?.name || 'their assigned manager'}'s team, then make them a manager.`);
      return;
    }
    setSavingMemberId(member.id);
    setError('');
    setMessage('');
    try {
      await api.patch(`/orgs/users/${member.id}`, { role: nextRole });
      setMessage(`${member.email} is now a ${formatRole(nextRole)}.`);
      await loadMembers();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to update member role.'));
    } finally {
      setSavingMemberId('');
    }
  };

  const openAddMembers = (manager: TeamMember) => {
    setAddMembersError('');
    setAddingToManagerId(manager.id);
  };

  const addMembersToManager = async (memberIds: string[]) => {
    const manager = members.find((member) => member.id === addingToManagerId);
    if (!manager || !claims.orgId) return;
    setSavingMemberId(manager.id);
    setAddMembersError('');
    setError('');
    setMessage('');
    try {
      // The endpoint replaces the manager's whole team, so keep the current members alongside the new ones.
      const currentTeamIds = members.filter((member) => member.managerId === manager.id).map((member) => member.id);
      await api.put(`/orgs/${claims.orgId}/managers/${manager.id}/members`, {
        memberIds: [...new Set([...currentTeamIds, ...memberIds])],
      });
      setMessage(`Added ${memberIds.length} ${memberIds.length === 1 ? 'member' : 'members'} to ${manager.name || manager.email}'s team.`);
      setAddingToManagerId('');
      setExpandedManagerId(manager.id);
      await loadMembers({ silent: true });
    } catch (requestError) {
      setAddMembersError(getApiErrorMessage(requestError, 'Failed to update manager assignments.'));
    } finally {
      setSavingMemberId('');
    }
  };

  const removeFromManager = async (manager: TeamMember, member: TeamMember) => {
    if (!claims.orgId) return;
    const approved = await feedback.confirm({
      title: 'Remove from team?',
      message: `${member.name || member.email} will be removed from ${manager.name || manager.email}'s team. Their user account is not affected.`,
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!approved) return;
    setSavingMemberId(member.id);
    setError('');
    setMessage('');
    try {
      await api.delete(`/orgs/${claims.orgId}/managers/${manager.id}/members/${member.id}`);
      setMessage(`${member.name || member.email} was removed from ${manager.name || manager.email}'s team.`);
      await loadMembers({ silent: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to remove the sales member from this team.'));
    } finally {
      setSavingMemberId('');
    }
  };

  const removeFromMyTeam = async (member: TeamMember) => {
    if (!claims.orgId || claims.role !== 'manager' || !user?.uid) return;
    setSavingMemberId(member.id);
    setError('');
    setMessage('');
    try {
      await api.delete(`/orgs/${claims.orgId}/managers/${user.uid}/members/${member.id}`);
      setMessage(`${member.name || member.email} was removed from your team.`);
      await loadMembers();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to remove the sales member from your team.'));
    } finally {
      setSavingMemberId('');
    }
  };

  const deleteMember = async (member: TeamMember) => {
    if (claims.role !== 'org_admin' || member.id === user?.uid) return;
    const assignedCount = member.role === 'manager'
      ? members.filter((candidate) => candidate.managerId === member.id).length
      : 0;
    const approved = await feedback.confirm({
      title: `Delete ${formatRole(member.role)}?`,
      message: `${member.name || member.email} will lose access to the organization.${assignedCount > 0 ? ` Their ${assignedCount} assigned sales ${assignedCount === 1 ? 'member' : 'members'} will become unassigned.` : ''} Historical business records will be retained.`,
      confirmLabel: 'Delete member',
      variant: 'danger',
    });
    if (!approved) return;
    setSavingMemberId(member.id);
    setError('');
    setMessage('');
    try {
      await api.delete(`/orgs/users/${member.id}`);
      setMessage(`${member.name || member.email} was deleted from the organization.`);
      await loadMembers({ silent: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to delete the member.'));
    } finally {
      setSavingMemberId('');
    }
  };

  const toggleManager = (managerId: string) => {
    setExpandedManagerId((current) => (current === managerId ? '' : managerId));
  };

  const salesMembers = members.filter((member) => member.role === 'sales_member');
  const assignableSalesMembers = salesMembers.filter((member) => member.status === 'active');
  const managerNames = new Map(members.filter((member) => member.role === 'manager').map((member) => [member.id, member.name || member.email]));
  const addingToManager = members.find((member) => member.id === addingToManagerId);

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
        <div className="section-heading table-heading">
          <div><h2>{claims.role === 'manager' ? 'My team directory' : 'Organization directory'}</h2><p>{claims.role === 'manager' ? 'Your profile and assigned sales members.' : 'All active users, roles, and reporting managers.'}</p></div>
          <button className="secondary-button" disabled={membersLoading} onClick={() => void loadMembers()}>
            <RefreshCw size={15} className={membersLoading ? 'spin' : undefined} /> Refresh
          </button>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Member</th><th>Role</th><th>Reports to</th><th>Status</th><th>Phone</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {membersLoading ? (
                <tr><td colSpan={7} className="table-message">Loading team members…</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={7} className="table-message">No team members found.</td></tr>
              ) : members.map((member) => {
                const managerTeam = member.role === 'manager' ? salesMembers.filter((salesMember) => salesMember.managerId === member.id) : [];
                const isExpanded = expandedManagerId === member.id;
                return <Fragment key={member.id}>
                <tr
                  className={member.role === 'manager' ? `manager-directory-row${isExpanded ? ' expanded' : ''}` : undefined}
                  {...(member.role === 'manager' ? {
                    tabIndex: 0,
                    'aria-expanded': isExpanded,
                    'aria-controls': `manager-team-${member.id}`,
                    title: `${isExpanded ? 'Hide' : 'Show'} ${member.name || member.email}'s sales team`,
                    onClick: (event: React.MouseEvent<HTMLTableRowElement>) => {
                      // Clicks on buttons, inputs, or the portaled action menu should not toggle the row.
                      if ((event.target as HTMLElement).closest('button, a, input, select, textarea, label, [role="menu"]')) return;
                      toggleManager(member.id);
                    },
                    onKeyDown: (event: React.KeyboardEvent<HTMLTableRowElement>) => {
                      if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
                      event.preventDefault();
                      toggleManager(member.id);
                    },
                  } : {})}
                >
                  <td data-label="Member">
                    {editingMemberId === member.id ? (
                      <div className="member-edit-form">
                        <input className="input-field" value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                        <button className="secondary-button" disabled={savingMemberId === member.id} onClick={() => saveMemberName(member)}>{savingMemberId === member.id ? 'Saving...' : 'Save'}</button>
                        <button className="secondary-button" onClick={() => setEditingMemberId('')}>Cancel</button>
                      </div>
                    ) : (
                      <div className="member-cell">
                        <RoleAvatar role={member.role} size={17} /><div><strong>{member.name || 'Unnamed member'}{member.role === 'manager' && <span className="manager-member-count"> · {managerTeam.length} {managerTeam.length === 1 ? 'Member' : 'Members'}</span>}</strong><span>{member.email}</span></div>
                      </div>
                    )}
                  </td>
                  <td data-label="Role"><span className={`role-badge ${member.role}`}><RoleIcon role={member.role} size={14} /> {formatRole(member.role)}</span></td>
                  <td data-label="Reports to">{member.role === 'sales_member' ? (members.find((candidate) => candidate.id === member.managerId)?.name || 'Unassigned') : '—'}</td>
                  <td data-label="Status"><span className={`status-badge ${member.status}`}><i /> {member.status}</span></td>
                  <td data-label="Phone">{member.phoneNumber || '—'}</td>
                  <td data-label="Joined">{member.createdAt ? format(new Date(member.createdAt), 'd MMM yyyy') : '—'}</td>
                  <td data-label="Actions">
                    <ActionMenu label={`Actions for ${member.name || member.email}`}>
                      <button className="secondary-button" disabled={!canEditMember(member)} onClick={() => startEdit(member)}><User size={15} /> Edit</button>
                      <button className="secondary-button" disabled={!canEditMember(member) || savingMemberId === member.id} onClick={() => toggleMemberStatus(member)}>
                        {member.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      {claims.role === 'org_admin' && member.role === 'sales_member' && member.id !== user?.uid && (
                        <button className="secondary-button" disabled={savingMemberId === member.id} onClick={() => void updateMemberRole(member, 'manager')}>
                          <RoleIcon role="manager" size={15} /> Make manager
                        </button>
                      )}
                      {claims.role === 'org_admin' && member.role === 'manager' && member.id !== user?.uid && (
                        <button className="secondary-button" disabled={savingMemberId === member.id} onClick={() => void updateMemberRole(member, 'sales_member')}>
                          <RoleIcon role="sales_member" size={15} /> Make sales member
                        </button>
                      )}
                      {claims.role === 'manager' && member.role === 'sales_member' && member.managerId === user?.uid && (
                        <button className="danger-button" disabled={savingMemberId === member.id} onClick={() => void removeFromMyTeam(member)}>
                          <X size={15} /> Remove from my team
                        </button>
                      )}
                      {claims.role === 'org_admin' && (member.role === 'sales_member' || member.role === 'manager') && member.id !== user?.uid && (
                        <button className="danger-button" disabled={savingMemberId === member.id} onClick={() => void deleteMember(member)}>
                          <Trash2 size={15} /> Delete member
                        </button>
                      )}
                      <button className="secondary-button" disabled={!canEditMember(member)} onClick={() => resetPassword(member)}><KeyRound size={15} /> Reset</button>
                    </ActionMenu>
                  </td>
                </tr>
                {member.role === 'manager' && isExpanded && (
                  <tr className="manager-team-detail-row">
                    <td colSpan={7}>
                      <div className="manager-team-detail" id={`manager-team-${member.id}`}>
                        <div className="manager-team-detail-heading">
                          <div><strong>Sales team</strong><span>{managerTeam.length} assigned {managerTeam.length === 1 ? 'member' : 'members'}</span></div>
                          {claims.role === 'org_admin' && (
                            <button className="secondary-button" disabled={member.status !== 'active'} title={member.status !== 'active' ? 'Enable this manager to assign members' : undefined} onClick={() => openAddMembers(member)}>
                              <UserPlus size={15} /> Add Member
                            </button>
                          )}
                        </div>
                        {managerTeam.length === 0 ? (
                          <p className="empty-team-copy">No sales members are assigned to this manager yet.{claims.role === 'org_admin' && member.status === 'active' ? ' Use Add Member to build the team.' : ''}</p>
                        ) : (
                          <div className="manager-team-inline-list">
                            {managerTeam.map((salesMember) => {
                              const canRemove = claims.role === 'org_admin' || (claims.role === 'manager' && member.id === user?.uid);
                              const removing = savingMemberId === salesMember.id;
                              return (
                                <div className={`manager-team-member${removing ? ' is-busy' : ''}`} key={salesMember.id}>
                                  <RoleAvatar role={salesMember.role} size={15} />
                                  <div><strong>{salesMember.name || 'Unnamed member'}</strong><span>{salesMember.email}</span></div>
                                  {salesMember.status === 'active' ? <AssignmentBadge status="assigned" /> : <span className={`status-badge ${salesMember.status}`}><i /> {salesMember.status}</span>}
                                  {canRemove && (
                                    <button
                                      className="manager-team-remove"
                                      disabled={removing}
                                      onClick={() => void removeFromManager(member, salesMember)}
                                      aria-label={`Remove ${salesMember.name || salesMember.email} from ${member.name || member.email}'s team`}
                                      title="Remove from team"
                                    >
                                      {removing ? <RefreshCw size={15} className="spin" /> : <Trash2 size={15} />}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>;
              })}
            </tbody>
          </table>
        </div>
      </div>

      {claims.role === 'org_admin' && addingToManager && (
        <AddTeamMembersDialog
          manager={addingToManager}
          salesMembers={assignableSalesMembers}
          managerNames={managerNames}
          saving={savingMemberId === addingToManager.id}
          error={addMembersError}
          onCancel={() => setAddingToManagerId('')}
          onSubmit={(memberIds) => void addMembersToManager(memberIds)}
        />
      )}

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
                    {row.status === 'pending' ? (
                      <ActionMenu label={`Actions for invitation to ${row.email}`}>
                      {row.inviteLink && (
                        <>
                          <button className="secondary-button" onClick={() => copyText(row.inviteLink!, row.id)}>{copied === row.id ? <Check size={15} /> : <Copy size={15} />} Copy Link</button>
                          <button className="secondary-button" onClick={() => {
                            let t = '';
                            try { t = new URL(row.inviteLink!).searchParams.get('token') || ''; } catch { t = row.inviteLink!.split('token=')[1]?.split('&')[0] || ''; }
                            if (t) copyText(t, `${row.id}-token`);
                          }}>{copied === `${row.id}-token` ? <Check size={15} /> : <Copy size={15} />} Copy Token</button>
                        </>
                      )}
                        <button className="secondary-button" onClick={() => resendInvite(row.id)}><RefreshCw size={15} /> Resend</button>
                        <button className="secondary-button danger-button" onClick={() => revokeInvite(row.id)}>Revoke</button>
                      </ActionMenu>
                    ) : <span className="action-unavailable">—</span>}
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

const roleIcons: Record<string, LucideIcon> = {
  platform_owner: Crown,
  org_admin: ShieldCheck,
  manager: Users,
  sales_member: Headset,
};

const RoleIcon = ({ role, size }: { role: string; size: number }) => {
  const Icon = roleIcons[role] ?? User;
  return <Icon size={size} aria-hidden="true" />;
};

const RoleAvatar = ({ role, size }: { role: string; size: number }) => (
  <div className={`avatar role-avatar ${role}`}><RoleIcon role={role} size={size} /></div>
);

const formatRole = (role: string) => role.replace('org_admin', 'org admin').replace('sales_member', 'sales member');
