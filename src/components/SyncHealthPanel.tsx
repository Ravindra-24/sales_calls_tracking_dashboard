import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api, getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/auth';
import type { ApiResponse, SyncHealthRecord } from '../types/api';

export const SyncHealthPanel = () => {
  const { claims } = useAuth();
  const [rows, setRows] = useState<SyncHealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const unhealthy = rows.filter((row) => row.billingReadOnly || row.batteryOptimized || !row.trackingEnabled || row.lastFailureReason);

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
            <span><CheckCircle2 size={17} /> {rows.length - unhealthy.length} healthy</span>
            <span><AlertTriangle size={17} /> {unhealthy.length} need attention</span>
          </div>
          <div className="sync-health-list">
            {rows.slice(0, 6).map((row) => {
              const needsAttention = row.billingReadOnly || row.batteryOptimized || !row.trackingEnabled || Boolean(row.lastFailureReason);
              return (
                <div className={`sync-health-row ${needsAttention ? 'warning' : 'healthy'}`} key={row.id}>
                  <span>{needsAttention ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}</span>
                  <div>
                    <strong>{row.name || row.email || 'Your device'}</strong>
                    <p>
                      {row.lastSuccessAt ? `Last sync ${formatDistanceToNow(new Date(row.lastSuccessAt), { addSuffix: true })}` : 'No successful sync yet'}
                      {row.pendingUploadCount > 0 ? ` · ${row.pendingUploadCount} pending` : ''}
                    </p>
                    {row.lastFailureReason && <small>{row.lastFailureReason}</small>}
                    {row.billingReadOnly && <small>{row.billingReadOnlyMessage || 'Billing recovery is required.'}</small>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};
