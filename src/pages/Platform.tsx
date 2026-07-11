import { useCallback, useEffect, useState } from 'react';
import { Building2, Check, Copy, Plus, Power, Shield, User } from 'lucide-react';
import { format } from 'date-fns';
import { api, getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/auth';
import type { ApiResponse, PlatformOrganization, TenantCreateResult } from '../types/api';

export const Platform = () => {
  const { claims } = useAuth();
  const [organizations, setOrganizations] = useState<PlatformOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingOrgId, setUpdatingOrgId] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<TenantCreateResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    orgName: '',
    adminName: '',
    adminEmail: '',
    temporaryPassword: '',
    plan: 'free',
    timezone: 'Asia/Kolkata',
  });

  const loadOrganizations = useCallback(async () => {
    if (claims.role !== 'platform_owner') return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get<ApiResponse<PlatformOrganization[]>>('/admin/organizations');
      setOrganizations(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load organizations.'));
    } finally {
      setLoading(false);
    }
  }, [claims.role]);

  useEffect(() => { void loadOrganizations(); }, [loadOrganizations]);

  const submitTenant = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const response = await api.post<ApiResponse<TenantCreateResult>>('/admin/organizations', {
        ...form,
        temporaryPassword: form.temporaryPassword.trim() || undefined,
      });
      setResult(response.data.data);
      setForm({ orgName: '', adminName: '', adminEmail: '', temporaryPassword: '', plan: 'free', timezone: 'Asia/Kolkata' });
      await loadOrganizations();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to create organization.'));
    } finally {
      setSubmitting(false);
    }
  };

  const copyCredentials = async () => {
    if (!result) return;
    await navigator.clipboard.writeText([
      `Organization: ${result.org.name}`,
      `Dashboard: ${result.loginLink}`,
      `Email: ${result.admin.email}`,
      `Temporary password: ${result.temporaryPassword}`,
    ].join('\n'));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const updateOrganization = async (
    organization: PlatformOrganization,
    updates: { plan?: string; status?: 'active' | 'disabled' },
  ) => {
    if (updates.status === 'disabled' && !window.confirm(`Disable ${organization.name}? Its users and integration access will be blocked.`)) return;
    setUpdatingOrgId(organization.id);
    setError('');
    try {
      await api.patch(`/admin/organizations/${organization.id}`, updates);
      setOrganizations((current) => current.map((item) => (
        item.id === organization.id ? { ...item, ...updates } : item
      )));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to update organization.'));
    } finally {
      setUpdatingOrgId('');
    }
  };

  if (claims.role !== 'platform_owner') {
    return (
      <div className="page animate-fade-in">
        <div className="notice error-notice">Only platform owners can access tenant administration.</div>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <p className="eyebrow">Platform owner</p>
          <h1>Tenant administration</h1>
          <p>Create customer organizations and first admin accounts.</p>
        </div>
      </div>

      {error && <div className="notice error-notice">{error}</div>}

      <section className="section-card invite-panel">
        <div className="section-heading">
          <div>
            <h2>Create organization</h2>
            <p>The first org admin receives access to manage managers and sales members.</p>
          </div>
        </div>
        <form className="tenant-form" onSubmit={submitTenant}>
          <label>Organization name<input className="input-field" value={form.orgName} onChange={(event) => setForm((current) => ({ ...current, orgName: event.target.value }))} required /></label>
          <label>Admin name<input className="input-field" value={form.adminName} onChange={(event) => setForm((current) => ({ ...current, adminName: event.target.value }))} required /></label>
          <label>Admin email<input className="input-field" type="email" value={form.adminEmail} onChange={(event) => setForm((current) => ({ ...current, adminEmail: event.target.value }))} required /></label>
          <label>Temporary password<input className="input-field" value={form.temporaryPassword} onChange={(event) => setForm((current) => ({ ...current, temporaryPassword: event.target.value }))} placeholder="Auto-generate if blank" minLength={6} /></label>
          <label>Plan<select className="input-field" value={form.plan} onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value }))}>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="enterprise">Enterprise</option>
          </select></label>
          <label>Timezone<input className="input-field" value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} required /></label>
          <button className="btn-primary" disabled={submitting}><Plus size={17} /> {submitting ? 'Creating…' : 'Create tenant'}</button>
        </form>

        {result && (
          <div className="invite-result">
            <div className="success-icon"><Check size={18} /></div>
            <div><strong>{result.org.name} created</strong><p>{result.emailSent ? 'Credentials were emailed to the admin.' : 'Email was not sent. Copy these credentials and share them securely.'}</p></div>
            <code>{result.admin.email} | {result.temporaryPassword}</code>
            <button className="secondary-button" type="button" onClick={copyCredentials}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy credentials'}</button>
          </div>
        )}
      </section>

      <section className="section-card table-card">
        <div className="section-heading table-heading">
          <div><h2>Organizations</h2><p>Customer tenants currently configured on the platform.</p></div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Organization</th><th>Plan</th><th>Admin</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="table-message">Loading organizations…</td></tr>
              ) : organizations.length === 0 ? (
                <tr><td colSpan={6} className="table-message">No organizations created yet.</td></tr>
              ) : organizations.map((org) => (
                <tr key={org.id}>
                  <td><div className="member-cell"><div className="avatar"><Building2 size={17} /></div><div><strong>{org.name}</strong><span>{org.id}</span></div></div></td>
                  <td>
                    <div className="platform-plan-control">
                      <Shield size={14} />
                      <select
                        value={org.plan}
                        aria-label={`Plan for ${org.name}`}
                        disabled={updatingOrgId === org.id}
                        onChange={(event) => void updateOrganization(org, { plan: event.target.value })}
                      >
                        <option value="free">Free</option>
                        <option value="starter">Starter</option>
                        <option value="growth">Growth</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                  </td>
                  <td>{org.admin ? <div className="member-cell compact-member"><div className="avatar"><User size={15} /></div><div><strong>{org.admin.name}</strong><span>{org.admin.email}</span></div></div> : '—'}</td>
                  <td>{org.createdAt ? format(new Date(org.createdAt), 'd MMM yyyy') : '—'}</td>
                  <td><span className={`status-badge ${org.status}`}><i /> {org.status}</span></td>
                  <td>
                    <button
                      className={`secondary-button ${org.status === 'active' ? 'danger-button' : ''}`}
                      type="button"
                      disabled={updatingOrgId === org.id}
                      onClick={() => void updateOrganization(org, { status: org.status === 'active' ? 'disabled' : 'active' })}
                    >
                      <Power size={15} /> {org.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
