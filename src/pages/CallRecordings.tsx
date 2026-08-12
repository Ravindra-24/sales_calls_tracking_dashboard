import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Mic2, RefreshCw, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { api, getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/auth';
import { useFeedback } from '../context/feedback';
import type {
  ApiResponse,
  RecordingConfig,
  RecordingImport,
} from '../types/api';

export const CallRecordings = () => {
  const { claims } = useAuth();
  const { toast } = useFeedback();
  const [config, setConfig] = useState<RecordingConfig | null>(null);
  const [imports, setImports] = useState<RecordingImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [policyAccepted, setPolicyAccepted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [configResponse, importsResponse] = await Promise.all([
        api.get<ApiResponse<RecordingConfig>>('/recording-imports/config'),
        api.get<ApiResponse<RecordingImport[]>>('/recording-imports', {
          params: { limit: 100 },
        }),
      ]);
      setConfig(configResponse.data.data);
      setImports(importsResponse.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load call-recording controls.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (claims.role === 'platform_owner' || claims.role === 'sales_member') {
      setLoading(false);
      return;
    }
    void load();
  }, [claims.role, load]);

  const setEnabled = async (enabled: boolean) => {
    if (!claims.orgId) return;
    setBusy(true);
    setError('');
    try {
      await api.patch(`/orgs/${claims.orgId}/call-recording`, {
        enabled,
        policyAccepted: enabled ? policyAccepted : undefined,
      });
      toast({
        variant: 'success',
        title: enabled ? 'Call recording enabled' : 'New recording imports disabled',
        message: enabled
          ? 'Reps can now complete one-time folder setup in the Android app.'
          : 'Existing recordings remain available under the retention policy.',
      });
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to update call-recording settings.'));
    } finally {
      setBusy(false);
    }
  };

  const attention = useMemo(
    () => imports.filter(item => ['ambiguous', 'unmatched', 'failed'].includes(item.status)),
    [imports],
  );

  if (claims.role === 'platform_owner' || claims.role === 'sales_member') {
    return (
      <div className="page animate-fade-in">
        <div className="notice error-notice">
          Call-recording administration is available to organization admins and managers.
        </div>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <header className="page-header">
        <div>
          <p className="eyebrow">Calls</p>
          <h1>Native recording & AI</h1>
          <p>Manage organization approval, monthly usage, and recordings that need review.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      {error && <div className="notice error-notice">{error}</div>}
      {config?.planEligible && !config.aiConfigured && (
        <div className="notice error-notice">
          AI processing is unavailable until an organization admin connects an OpenAI key in Organization Settings. Recordings can still be imported and kept for a later manual retry.
        </div>
      )}

      <div className="call-summary-grid">
        <section className="call-summary-card section-card">
          <span className="stat-icon blue"><Mic2 /></span>
          <div><p>Status</p><strong>{config?.enabled ? 'Enabled' : 'Disabled'}</strong></div>
        </section>
        <section className="call-summary-card section-card">
          <span className="stat-icon green"><CheckCircle2 /></span>
          <div><p>AI minutes</p><strong>{config?.usage ? `${config.usage.usedMinutes}/${config.usage.limitMinutes}` : '—'}</strong></div>
        </section>
        <section className="call-summary-card section-card">
          <span className="stat-icon orange"><AlertTriangle /></span>
          <div><p>Needs review</p><strong>{attention.length}</strong></div>
        </section>
      </div>

      <section className="section-card settings-card">
        <div className="section-heading">
          <div className="settings-heading-content">
            <div className="stat-icon violet"><ShieldCheck size={18} /></div>
            <div>
              <h2>Organization approval</h2>
              <p>No call is routed through Smartly Manage. Reps import recordings created by their native Android dialer.</p>
            </div>
          </div>
        </div>
        {!config?.planEligible ? (
          <div className="notice error-notice">Max or Enterprise is required for recording analysis.</div>
        ) : config.enabled ? (
          <>
            <div className="notice success-notice">
              Policy {config.policyVersion} is accepted. Reps still receive their own one-time disclosure.
            </div>
            {claims.role === 'org_admin' && (
              <button className="secondary-button" type="button" disabled={busy} onClick={() => void setEnabled(false)}>
                Disable new imports
              </button>
            )}
          </>
        ) : claims.role === 'org_admin' ? (
          <>
            <label className="integration-checkbox">
              <input
                type="checkbox"
                checked={policyAccepted}
                onChange={event => setPolicyAccepted(event.target.checked)}
              />
              <span>
                I confirm the organization has an approved recording notice, lawful calling practices,
                and a reviewed retention policy. Reps will use a native dialer announcement or give the
                approved verbal notice.
              </span>
            </label>
            <button
              className="btn-primary"
              type="button"
              disabled={busy || !policyAccepted}
              onClick={() => void setEnabled(true)}
            >
              Approve and enable
            </button>
          </>
        ) : (
          <div className="notice">An organization admin must enable this feature.</div>
        )}
      </section>

      <section className="section-card table-card">
        <div className="section-heading table-heading">
          <div><h2>Recording imports</h2><p>Ambiguous files stay here instead of being attached to the wrong call.</p></div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Recording</th><th>Representative</th><th>Modified</th><th>Duration</th><th>Match</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="table-message">Loading recording imports…</td></tr>
              ) : imports.length === 0 ? (
                <tr><td colSpan={6} className="table-message">No recording imports yet.</td></tr>
              ) : imports.map(item => (
                <tr key={item.id}>
                  <td data-label="Recording">{item.fileName}</td>
                  <td data-label="Representative">{item.repId.slice(0, 10)}</td>
                  <td data-label="Modified">{item.modifiedAt ? format(new Date(item.modifiedAt), 'd MMM yyyy, h:mm a') : '—'}</td>
                  <td data-label="Duration">{Math.floor(item.durationSeconds / 60)}m {item.durationSeconds % 60}s</td>
                  <td data-label="Match">{item.matchConfidence === null ? '—' : `${item.matchConfidence}%`}</td>
                  <td data-label="Status">
                    <span className={`direction-badge ${item.status === 'uploaded' ? 'incoming' : item.status === 'failed' ? 'missed' : 'outgoing'}`}>
                      {item.status}
                    </span>
                    {item.failureMessage && <small className="call-recording-error">{item.failureMessage}</small>}
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
