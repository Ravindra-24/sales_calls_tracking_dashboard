import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api, getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/auth';
import type { ApiResponse, SyncHealthRecord } from '../types/api';

export const SyncHealthPanel = () => {
  const { claims } = useAuth();
  const [rows, setRows] = useState<SyncHealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showIgnored, setShowIgnored] = useState(false);
  const [togglingId, setTogglingId] = useState('');

  const canIgnore = claims.role === 'org_admin' || claims.role === 'manager';

  const toggleIgnored = useCallback(async (row: SyncHealthRecord) => {
    if (!claims.orgId) return;
    setTogglingId(row.userId);
    setError('');
    try {
      await api.patch(`/orgs/${claims.orgId}/sync-health/${row.userId}`, { ignored: !row.ignored });
      setRows((current) => current.map((item) => (item.userId === row.userId ? { ...item, ignored: !row.ignored } : item)));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to update sync health.'));
    } finally {
      setTogglingId('');
    }
  }, [claims.orgId]);

  const loadHealth = useCallback(async () => {
    if (claims.role === 'platform_owner') {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (claims.role === 'sales_member') {
        const response = await api.get<ApiResponse<SyncHealthRecord | null>>('/sync/health/me');
        setRows(response.data.data ? [response.data.data] : []);
      } else if (claims.orgId) {
        const response = await api.get<ApiResponse<SyncHealthRecord[]>>(`/orgs/${claims.orgId}/sync-health`);
        setRows(response.data.data);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load sync health.'));
    } finally {
      setLoading(false);
    }
  }, [claims.orgId, claims.role]);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  if (claims.role === 'platform_owner') return null;

  const activeRows = rows.filter((row) => !row.ignored);
  const ignoredRows = rows.filter((row) => row.ignored);
  const unhealthy = activeRows.filter((row) => row.billingReadOnly || row.batteryOptimized || !row.trackingEnabled || row.lastFailureReason);
  const visibleRows = [...activeRows.slice(0, 6), ...(showIgnored ? ignoredRows : [])];

  return (
    <section className="section-card sync-health-panel">
      <div className="section-heading">
        <div>
          <h2>Sync reliability</h2>
          <p>{claims.role === 'sales_member' ? 'Your mobile sync health' : 'Team mobile sync health'}</p>
        </div>
        <button className="icon-button" type="button" aria-label="Refresh sync health" onClick={() => void loadHealth()}>
          <RefreshCw size={17} />
        </button>
      </div>

      {error && <div className="notice error-notice">{error}</div>}
      {loading ? (
        <div className="empty-state">Loading sync health...</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">No mobile sync reports yet.</div>
      ) : (
        <>
          <div className="sync-health-summary">
            <span><CheckCircle2 size={17} /> {activeRows.length - unhealthy.length} healthy</span>
            <span><AlertTriangle size={17} /> {unhealthy.length} need attention</span>
          </div>
          <div className="sync-health-list">
            {visibleRows.map((row) => {
              const needsAttention = !row.ignored && (row.billingReadOnly || row.batteryOptimized || !row.trackingEnabled || Boolean(row.lastFailureReason));
              const deviceIssues = [
                ...(!row.trackingEnabled ? [{ label: 'Tracking off', fix: 'turn call tracking on in the app' }] : []),
                ...(row.batteryOptimized ? [{ label: 'Battery optimization on', fix: 'allow the app to run without battery restrictions in Android settings' }] : []),
              ];
              return (
                <div className={`sync-health-row ${needsAttention ? 'warning' : 'healthy'}${row.ignored ? ' ignored' : ''}`} key={row.id}>
                  <span>{row.ignored ? <EyeOff size={18} /> : needsAttention ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}</span>
                  <div>
                    <strong>{row.name || row.email || 'Your device'}</strong>
                    <p>
                      {row.lastSuccessAt ? `Last sync ${formatDistanceToNow(new Date(row.lastSuccessAt), { addSuffix: true })}` : 'No successful sync yet'}
                      {row.pendingUploadCount > 0 ? ` · ${row.pendingUploadCount} pending` : ''}
                    </p>
                    {!row.ignored && deviceIssues.length > 0 && (
                      <div className="sync-health-tags">
                        {deviceIssues.map((issue) => <span key={issue.label}>{issue.label}</span>)}
                      </div>
                    )}
                    {!row.ignored && deviceIssues.length > 0 && (
                      <small className="sync-health-hint">
                        {claims.role === 'sales_member' ? 'To fix: ' : 'Ask them to '}
                        {deviceIssues.map((issue) => issue.fix).join(', and ')}.
                      </small>
                    )}
                    {!row.ignored && row.lastFailureReason && <small>{row.lastFailureReason}</small>}
                    {!row.ignored && row.billingReadOnly && <small>{row.billingReadOnlyMessage || 'Billing recovery is required.'}</small>}
                  </div>
                  {canIgnore && (
                    <button
                      className="icon-button"
                      type="button"
                      disabled={togglingId === row.userId}
                      aria-label={row.ignored ? 'Stop ignoring this device' : 'Ignore this device'}
                      title={row.ignored ? 'Stop ignoring this device' : 'Ignore this device'}
                      onClick={() => void toggleIgnored(row)}
                    >
                      {row.ignored ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {ignoredRows.length > 0 && (
            <button className="link-button sync-health-ignored-toggle" type="button" onClick={() => setShowIgnored((current) => !current)}>
              {showIgnored ? 'Hide ignored' : `Show ignored (${ignoredRows.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
};
