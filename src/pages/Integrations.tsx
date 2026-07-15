import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  Check,
  CircleAlert,
  Clipboard,
  Code2,
  Copy,
  KeyRound,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Webhook,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { api, BACKEND_URL, getApiErrorMessage } from '../api/client';
import { ActionMenu } from '../components/ActionMenu';
import { useAuth } from '../context/auth';
import { useFeedback } from '../context/feedback';
import type {
  ApiResponse,
  CreatedIntegrationApiKey,
  CreatedIntegrationWebhook,
  IntegrationApiKey,
  IntegrationEventType,
  IntegrationOverview,
  IntegrationScope,
  IntegrationWebhookDelivery,
  IntegrationWebhookEndpoint,
  PlatformOrganization,
} from '../types/api';

const scopeOptions: Array<{ value: IntegrationScope; label: string }> = [
  { value: 'read:org', label: 'Organization' },
  { value: 'read:team', label: 'Team' },
  { value: 'read:calls', label: 'Calls' },
  { value: 'read:stats', label: 'Statistics' },
];

const eventOptions: Array<{ value: IntegrationEventType; label: string }> = [
  { value: 'call.created', label: 'Call created' },
  { value: 'daily_stats.updated', label: 'Daily stats updated' },
];

const formatDate = (value: string | null) =>
  value ? format(new Date(value), 'd MMM yyyy, HH:mm') : 'Never';

const SecretNotice = ({
  label,
  value,
  onDismiss,
}: {
  label: string;
  value: string;
  onDismiss: () => void;
}) => {
  const [copied, setCopied] = useState(false);

  const copySecret = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="integration-secret-notice" role="status">
      <ShieldCheck size={20} />
      <div>
        <strong>{label}</strong>
        <p>This value is shown once. Store it in your server-side secret manager.</p>
        <code>{value}</code>
      </div>
      <div className="row-actions">
        <button className="secondary-button" type="button" onClick={copySecret}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button className="icon-button" type="button" onClick={onDismiss} title="Dismiss">
          <Check size={17} />
        </button>
      </div>
    </div>
  );
};

export const Integrations = () => {
  const { claims } = useAuth();
  const { confirm, toast } = useFeedback();
  const isPlatformOwner = claims.role === 'platform_owner';
  const canManage = isPlatformOwner || claims.role === 'org_admin';
  const [organizations, setOrganizations] = useState<PlatformOrganization[]>([]);
  const [orgId, setOrgId] = useState(isPlatformOwner ? '' : claims.orgId);
  const [overview, setOverview] = useState<IntegrationOverview | null>(null);
  const [keys, setKeys] = useState<IntegrationApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<IntegrationWebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<IntegrationWebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [revealedSecret, setRevealedSecret] = useState<{ label: string; value: string } | null>(null);
  const [keyForm, setKeyForm] = useState<{ name: string; scopes: IntegrationScope[] }>({
    name: '',
    scopes: scopeOptions.map((scope) => scope.value),
  });
  const [webhookForm, setWebhookForm] = useState<{
    name: string;
    url: string;
    events: IntegrationEventType[];
  }>({
    name: '',
    url: '',
    events: eventOptions.map((event) => event.value),
  });

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    if (!isPlatformOwner) {
      setOrgId(claims.orgId);
      return;
    }

    const loadOrganizations = async () => {
      try {
        const response = await api.get<ApiResponse<PlatformOrganization[]>>('/admin/organizations');
        setOrganizations(response.data.data);
        setOrgId((current) => current || response.data.data[0]?.id || '');
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, 'Failed to load organizations.'));
        setLoading(false);
      }
    };
    void loadOrganizations();
  }, [canManage, claims.orgId, isPlatformOwner]);

  const loadIntegrationData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError('');
    try {
      const [overviewResponse, keysResponse, webhooksResponse, deliveriesResponse] = await Promise.all([
        api.get<ApiResponse<IntegrationOverview>>(`/orgs/${orgId}/integrations`),
        api.get<ApiResponse<IntegrationApiKey[]>>(`/orgs/${orgId}/integrations/api-keys`),
        api.get<ApiResponse<IntegrationWebhookEndpoint[]>>(`/orgs/${orgId}/integrations/webhooks`),
        api.get<ApiResponse<IntegrationWebhookDelivery[]>>(`/orgs/${orgId}/integrations/webhook-deliveries`),
      ]);
      setOverview(overviewResponse.data.data);
      setKeys(keysResponse.data.data);
      setWebhooks(webhooksResponse.data.data);
      setDeliveries(deliveriesResponse.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load integration settings.'));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void loadIntegrationData();
  }, [loadIntegrationData]);

  const planEnabled = Boolean(overview?.entitlements.integrationsEnabled);
  const activeKeyCount = useMemo(
    () => keys.filter((key) => key.status === 'active').length,
    [keys],
  );
  const activeWebhookCount = useMemo(
    () => webhooks.filter((endpoint) => endpoint.status === 'active').length,
    [webhooks],
  );

  const runAction = async (name: string, action: () => Promise<void>) => {
    setBusy(name);
    setError('');
    try {
      await action();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Integration action failed.');
      setError(message);
      toast({ title: 'Integration action failed', message, variant: 'error' });
    } finally {
      setBusy('');
    }
  };

  const toggleScope = (scope: IntegrationScope) => {
    setKeyForm((current) => ({
      ...current,
      scopes: current.scopes.includes(scope)
        ? current.scopes.filter((item) => item !== scope)
        : [...current.scopes, scope],
    }));
  };

  const toggleEvent = (eventType: IntegrationEventType) => {
    setWebhookForm((current) => ({
      ...current,
      events: current.events.includes(eventType)
        ? current.events.filter((item) => item !== eventType)
        : [...current.events, eventType],
    }));
  };

  const createKey = async (event: React.FormEvent) => {
    event.preventDefault();
    await runAction('create-key', async () => {
      const response = await api.post<ApiResponse<CreatedIntegrationApiKey>>(
        `/orgs/${orgId}/integrations/api-keys`,
        keyForm,
      );
      setRevealedSecret({ label: 'API key', value: response.data.data.apiKey });
      setKeyForm({ name: '', scopes: scopeOptions.map((scope) => scope.value) });
      toast({ title: 'API key created', message: 'Copy and store the new key before dismissing it.', variant: 'success' });
      await loadIntegrationData();
    });
  };

  const revokeKey = async (key: IntegrationApiKey) => {
    const approved = await confirm({
      title: `Revoke ${key.name}?`,
      message: 'Requests using this key will stop immediately. This action cannot be undone.',
      confirmLabel: 'Revoke key',
      variant: 'danger',
    });
    if (!approved) return;
    await runAction(`revoke-${key.id}`, async () => {
      await api.patch(`/orgs/${orgId}/integrations/api-keys/${key.id}/revoke`);
      toast({ title: 'API key revoked', message: `${key.name} can no longer access the API.`, variant: 'success' });
      await loadIntegrationData();
    });
  };

  const createWebhook = async (event: React.FormEvent) => {
    event.preventDefault();
    await runAction('create-webhook', async () => {
      const response = await api.post<ApiResponse<CreatedIntegrationWebhook>>(
        `/orgs/${orgId}/integrations/webhooks`,
        webhookForm,
      );
      setRevealedSecret({
        label: 'Webhook signing secret',
        value: response.data.data.signingSecret,
      });
      setWebhookForm({
        name: '',
        url: '',
        events: eventOptions.map((item) => item.value),
      });
      toast({ title: 'Webhook endpoint created', message: 'Copy and store its signing secret before dismissing it.', variant: 'success' });
      await loadIntegrationData();
    });
  };

  const toggleWebhookStatus = async (endpoint: IntegrationWebhookEndpoint) => {
    const nextStatus = endpoint.status === 'active' ? 'disabled' : 'active';
    await runAction(`toggle-${endpoint.id}`, async () => {
      await api.patch(`/orgs/${orgId}/integrations/webhooks/${endpoint.id}`, {
        status: nextStatus,
      });
      toast({ title: `Webhook ${nextStatus}`, message: `${endpoint.name} is now ${nextStatus}.`, variant: 'success' });
      await loadIntegrationData();
    });
  };

  const testWebhook = async (endpoint: IntegrationWebhookEndpoint) => {
    await runAction(`test-${endpoint.id}`, async () => {
      await api.post(`/orgs/${orgId}/integrations/webhooks/${endpoint.id}/test`);
      toast({ title: 'Test delivered', message: `A test event was sent to ${endpoint.name}.`, variant: 'success' });
    });
  };

  const copyApiBase = async () => {
    try {
      await navigator.clipboard.writeText(`${BACKEND_URL}/v1`);
      toast({ message: 'API base URL copied.', variant: 'success' });
    } catch {
      toast({ title: 'Copy unavailable', message: 'Select and copy the API base URL manually.', variant: 'error' });
    }
  };

  if (!canManage) {
    return (
      <div className="page animate-fade-in">
        <div className="notice error-notice">Only organization admins and platform owners can manage integrations.</div>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in integration-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Developer access</p>
          <h1>Integrations</h1>
          <p>Secure API access and event delivery for customer platforms.</p>
        </div>
        <div className={`integration-header-actions${isPlatformOwner ? ' has-org-select' : ''}`}>
          <Link
            className="secondary-button integration-docs-link"
            to="/docs/integrations"
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={16} /> View documentation
          </Link>
          {isPlatformOwner && (
            <select
              className="input-field compact-select integration-org-select"
              value={orgId}
              onChange={(event) => setOrgId(event.target.value)}
              aria-label="Organization"
            >
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name}</option>
              ))}
            </select>
          )}
          <button className="secondary-button integration-refresh-button" type="button" onClick={() => void loadIntegrationData()} disabled={loading || !orgId}>
            <RefreshCw size={16} /> <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {error && <div className="notice error-notice">{error}</div>}
      {revealedSecret && (
        <SecretNotice
          label={revealedSecret.label}
          value={revealedSecret.value}
          onDismiss={() => setRevealedSecret(null)}
        />
      )}

      {loading ? (
        <div className="empty-state">Loading integration settings…</div>
      ) : !orgId ? (
        <div className="empty-state">No organization is available.</div>
      ) : overview && (
        <>
          <section className="integration-summary-band">
            <div className="integration-plan-summary">
              <div className={`integration-status-icon ${planEnabled ? 'enabled' : 'locked'}`}>
                {planEnabled ? <ShieldCheck size={22} /> : <CircleAlert size={22} />}
              </div>
              <div>
                <span>{overview.organization.name}</span>
                <strong>{overview.organization.plan} plan</strong>
                <p>{planEnabled ? 'Organizer API and webhooks are active.' : 'Upgrade to Max or Enterprise to enable integrations.'}</p>
              </div>
            </div>
            <div className="integration-limits">
              <div><span>API keys</span><strong>{activeKeyCount} / {overview.entitlements.maxApiKeys}</strong></div>
              <div><span>Webhooks</span><strong>{activeWebhookCount} / {overview.entitlements.maxWebhookEndpoints}</strong></div>
              <div><span>API requests</span><strong>{overview.usage.requestCount.toLocaleString()} / {overview.entitlements.requestsPerMonth.toLocaleString()}</strong></div>
              <div><span>Query range</span><strong>{overview.entitlements.maxQueryRangeDays || 0} days</strong></div>
            </div>
          </section>

          <section className="section-card integration-section">
            <div className="section-heading">
              <div><h2>API keys</h2><p>Scoped credentials for server-to-server requests.</p></div>
              <KeyRound size={20} />
            </div>
            <form className="integration-create-form" onSubmit={createKey}>
              <label>
                Key name
                <input className="input-field" value={keyForm.name} onChange={(event) => setKeyForm((current) => ({ ...current, name: event.target.value }))} placeholder="Production CRM" required maxLength={80} disabled={!planEnabled} />
              </label>
              <fieldset className="integration-option-group" disabled={!planEnabled}>
                <legend>Scopes</legend>
                <div className="integration-checks">
                  {scopeOptions.map((scope) => (
                    <label key={scope.value} className="integration-check">
                      <input type="checkbox" checked={keyForm.scopes.includes(scope.value)} onChange={() => toggleScope(scope.value)} />
                      <span>{scope.label}</span>
                      <code>{scope.value}</code>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button className="btn-primary" disabled={!planEnabled || busy === 'create-key' || keyForm.scopes.length === 0}>
                <Plus size={17} /> {busy === 'create-key' ? 'Creating…' : 'Create key'}
              </button>
            </form>

            <div className="table-scroll integration-table-wrap">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Key</th><th>Scopes</th><th>Last used</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {keys.length === 0 ? (
                    <tr><td colSpan={6} className="table-message">No API keys created.</td></tr>
                  ) : keys.map((key) => (
                    <tr key={key.id}>
                      <td data-label="Name"><strong>{key.name}</strong></td>
                      <td data-label="Key"><code>{key.prefix}…</code></td>
                      <td data-label="Scopes"><div className="integration-tags">{key.scopes.map((scope) => <span key={scope}>{scope}</span>)}</div></td>
                      <td data-label="Last used">{formatDate(key.lastUsedAt)}</td>
                      <td data-label="Status"><span className={`status-badge ${key.status}`}><i /> {key.status}</span></td>
                      <td data-label="Actions">
                        <ActionMenu label={`Actions for ${key.name}`}>
                          <button className="secondary-button danger-button" type="button" disabled={key.status !== 'active' || busy === `revoke-${key.id}`} onClick={() => void revokeKey(key)}>
                            <Trash2 size={16} /> Revoke key
                          </button>
                        </ActionMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="section-card integration-section">
            <div className="section-heading">
              <div><h2>Webhooks</h2><p>Signed event delivery with automatic retries.</p></div>
              <Webhook size={20} />
            </div>
            <form className="integration-create-form webhook-form" onSubmit={createWebhook}>
              <label>
                Endpoint name
                <input className="input-field" value={webhookForm.name} onChange={(event) => setWebhookForm((current) => ({ ...current, name: event.target.value }))} placeholder="CRM event receiver" required maxLength={80} disabled={!planEnabled} />
              </label>
              <label>
                HTTPS endpoint URL
                <input className="input-field" type="url" value={webhookForm.url} onChange={(event) => setWebhookForm((current) => ({ ...current, url: event.target.value }))} placeholder="https://crm.example.com/webhooks/smartly-manage" required disabled={!planEnabled} />
              </label>
              <fieldset className="integration-option-group" disabled={!planEnabled}>
                <legend>Events</legend>
                <div className="integration-checks compact">
                  {eventOptions.map((eventType) => (
                    <label key={eventType.value} className="integration-check">
                      <input type="checkbox" checked={webhookForm.events.includes(eventType.value)} onChange={() => toggleEvent(eventType.value)} />
                      <span>{eventType.label}</span>
                      <code>{eventType.value}</code>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button className="btn-primary" disabled={!planEnabled || busy === 'create-webhook' || webhookForm.events.length === 0}>
                <Plus size={17} /> {busy === 'create-webhook' ? 'Creating…' : 'Add endpoint'}
              </button>
            </form>

            <div className="integration-endpoint-list">
              {webhooks.length === 0 ? (
                <div className="empty-state">No webhook endpoints configured.</div>
              ) : webhooks.map((endpoint) => (
                <article className="integration-endpoint" key={endpoint.id}>
                  <div className="integration-endpoint-main">
                    <div className="integration-endpoint-icon"><Webhook size={18} /></div>
                    <div><strong>{endpoint.name}</strong><code>{endpoint.url}</code><span>{endpoint.events.join(' · ')}</span></div>
                  </div>
                  <div className="integration-endpoint-health">
                    <span className={`status-badge ${endpoint.status}`}><i /> {endpoint.status}</span>
                    <small>{endpoint.lastDeliveryStatus ? `Last delivery: ${endpoint.lastDeliveryStatus}` : 'No deliveries yet'}</small>
                  </div>
                  <div className="row-actions">
                    <button className="secondary-button" type="button" disabled={endpoint.status !== 'active' || busy === `test-${endpoint.id}`} onClick={() => void testWebhook(endpoint)}>
                      <Play size={15} /> Test
                    </button>
                    <button className="secondary-button" type="button" disabled={busy === `toggle-${endpoint.id}`} onClick={() => void toggleWebhookStatus(endpoint)}>
                      {endpoint.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="integration-bottom-grid">
            <section className="section-card integration-section api-reference">
              <div className="section-heading"><div><h2>API reference</h2><p>Versioned organizer endpoints.</p></div><Code2 size={20} /></div>
              <div className="api-base-row"><code>{BACKEND_URL}/v1</code><button className="icon-button" type="button" onClick={copyApiBase} title="Copy API base URL"><Clipboard size={16} /></button></div>
              <div className="api-route-list">
                <div><span>GET</span><code>/org</code><small>read:org</small></div>
                <div><span>GET</span><code>/team</code><small>read:team</small></div>
                <div><span>GET</span><code>/calls</code><small>read:calls</small></div>
                <div><span>GET</span><code>/stats/team</code><small>read:stats</small></div>
              </div>
            </section>

            <section className="section-card integration-section delivery-log">
              <div className="section-heading"><div><h2>Recent deliveries</h2><p>Latest webhook attempts across endpoints.</p></div><Activity size={20} /></div>
              <div className="delivery-list">
                {deliveries.length === 0 ? (
                  <div className="empty-state">No webhook deliveries yet.</div>
                ) : deliveries.slice(0, 8).map((delivery) => (
                  <div className="delivery-row" key={delivery.id}>
                    <span className={`delivery-dot ${delivery.status}`} />
                    <div><strong>{delivery.eventType}</strong><small>{formatDate(delivery.createdAt)} · Attempt {delivery.attemptCount}</small></div>
                    <span>{delivery.responseStatus ?? delivery.status}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};
