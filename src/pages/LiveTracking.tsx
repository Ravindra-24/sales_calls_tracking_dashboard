import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, ExternalLink, MapPin, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow, startOfDay } from 'date-fns';
import { api, getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/auth';
import type { ApiResponse, TeamMember } from '../types/api';

interface LiveRepStatus {
  repId: string;
  shiftId: string;
  lastLat: number | null;
  lastLng: number | null;
  accuracy: number | null;
  lastFixAt: string | null;
  batteryPct: number | null;
  stale: boolean;
  startedAt: string | null;
}

interface VisitRecord {
  id: string;
  repId: string;
  shiftId: string;
  status: 'open' | 'closed';
  source: 'geofence' | 'dwell_detection';
  lat: number;
  lng: number;
  orgLocationId: string | null;
  placeName: string | null;
  arrivedAt: string | null;
  departedAt: string | null;
  dwellSeconds: number | null;
}

interface ClientSite {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
}

const POLL_INTERVAL_MS = 30_000;

/**
 * Live view of reps currently on shift. Data comes from the REST API (the
 * Firestore rules are deny-all, so there are no client listeners) on a 30s
 * poll. A rep whose device stopped reporting is shown honestly as
 * "tracking dropped" — never as a fresh position.
 */
export const LiveTracking = () => {
  const { claims } = useAuth();
  const [reps, setReps] = useState<LiveRepStatus[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [visitsDate, setVisitsDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [visitsRepFilter, setVisitsRepFilter] = useState('');
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [siteForm, setSiteForm] = useState({ name: '', lat: '', lng: '', radiusMeters: '150' });
  const [siteSubmitting, setSiteSubmitting] = useState(false);
  const canView = claims.role === 'org_admin' || claims.role === 'manager';

  const loadLive = useCallback(async () => {
    if (!canView) return;
    setError('');
    try {
      const response = await api.get<ApiResponse<LiveRepStatus[]>>('/tracking/live');
      setReps(response.data.data);
      setLastLoadedAt(new Date());
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load live tracking status.'));
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    if (!claims.orgId || !canView) return;
    api.get<ApiResponse<TeamMember[]>>(`/orgs/${claims.orgId}/users`, { params: { limit: 100 } })
      .then((response) => setMembers(response.data.data))
      .catch(() => setMembers([]));
  }, [claims.orgId, canView]);

  useEffect(() => {
    void loadLive();
    const timer = window.setInterval(() => void loadLive(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadLive]);

  const loadVisits = useCallback(async () => {
    if (!canView) return;
    try {
      const dayStart = startOfDay(new Date(`${visitsDate}T00:00:00`));
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const response = await api.get<ApiResponse<VisitRecord[]>>('/tracking/visits', {
        params: {
          from: dayStart.toISOString(),
          to: dayEnd.toISOString(),
          repId: visitsRepFilter || undefined,
          limit: 200,
        },
      });
      setVisits(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load visits.'));
    }
  }, [canView, visitsDate, visitsRepFilter]);

  useEffect(() => { void loadVisits(); }, [loadVisits]);

  const loadSites = useCallback(async () => {
    if (!canView) return;
    try {
      const response = await api.get<ApiResponse<ClientSite[]>>('/tracking/locations');
      setSites(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load client sites.'));
    }
  }, [canView]);

  useEffect(() => { void loadSites(); }, [loadSites]);

  const submitSite = async (event: React.FormEvent) => {
    event.preventDefault();
    setSiteSubmitting(true);
    setError('');
    try {
      await api.post('/tracking/locations', {
        name: siteForm.name.trim(),
        lat: Number(siteForm.lat),
        lng: Number(siteForm.lng),
        radiusMeters: Number(siteForm.radiusMeters) || 150,
      });
      setSiteForm({ name: '', lat: '', lng: '', radiusMeters: '150' });
      await loadSites();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to add the client site.'));
    } finally {
      setSiteSubmitting(false);
    }
  };

  const deleteSite = async (site: ClientSite) => {
    if (!window.confirm(`Remove "${site.name}"? Reps will stop getting automatic visits there on their next shift.`)) return;
    setError('');
    try {
      await api.delete(`/tracking/locations/${site.id}`);
      await loadSites();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to remove the client site.'));
    }
  };

  const nameByRepId = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((member) => map.set(member.id, member.name || member.email));
    return map;
  }, [members]);

  const manualRefresh = async () => {
    setRefreshing(true);
    await loadLive();
    setRefreshing(false);
  };

  if (!canView) {
    return (
      <div className="page animate-fade-in">
        <div className="page-header">
          <div><p className="eyebrow">Field team</p><h1>Live tracking</h1><p>Your role does not include live tracking.</p></div>
        </div>
        <div className="notice error-notice">Live tracking is available to organization admins and managers.</div>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <p className="eyebrow">Field team</p>
          <h1>Live tracking</h1>
          <p>Reps currently on shift. Positions refresh every 30 seconds{lastLoadedAt ? ` · updated ${formatDistanceToNow(lastLoadedAt, { addSuffix: true })}` : ''}.</p>
        </div>
        <button className="secondary-button" onClick={() => void manualRefresh()} disabled={refreshing}>
          <RefreshCw size={16} /> {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="notice error-notice">{error}</div>}

      <section className="section-card">
        {loading ? (
          <p>Loading live status…</p>
        ) : reps.length === 0 ? (
          <div className="empty-state">
            <MapPin size={28} />
            <h2>No one is on shift right now</h2>
            <p>When a rep starts a shift in the mobile app, their live status appears here.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rep</th>
                  <th>Status</th>
                  <th>Last update</th>
                  <th>Battery</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {reps.map((rep) => {
                  const hasFix = rep.lastLat !== null && rep.lastLng !== null;
                  return (
                    <tr key={rep.repId}>
                      <td data-label="Rep">{nameByRepId.get(rep.repId) ?? rep.repId}</td>
                      <td data-label="Status">
                        <span className={`status-badge ${rep.stale ? 'failed' : 'active'}`}>
                          <i /> {rep.stale ? 'Tracking dropped' : 'Live'}
                        </span>
                      </td>
                      <td data-label="Last update">
                        {rep.lastFixAt
                          ? formatDistanceToNow(new Date(rep.lastFixAt), { addSuffix: true })
                          : 'Waiting for first location'}
                      </td>
                      <td data-label="Battery">{rep.batteryPct !== null ? `${rep.batteryPct}%` : '—'}</td>
                      <td data-label="Location">
                        {hasFix ? (
                          <a
                            className="secondary-button billing-action-link"
                            href={`https://maps.google.com/?q=${rep.lastLat},${rep.lastLng}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open map <ExternalLink size={14} />
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div><h2>Visits</h2><p>Client stops detected from geofences and dwell analysis.</p></div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select
              className="input-field"
              value={visitsRepFilter}
              onChange={(event) => setVisitsRepFilter(event.target.value)}
            >
              <option value="">All reps</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>{member.name || member.email}</option>
              ))}
            </select>
            <input
              className="input-field"
              type="date"
              value={visitsDate}
              onChange={(event) => setVisitsDate(event.target.value)}
            />
          </div>
        </div>
        {visits.length === 0 ? (
          <div className="empty-state">
            <Building2 size={28} />
            <h2>No visits on this day</h2>
            <p>Visits appear when a rep on shift stays at a location for a few minutes.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rep</th>
                  <th>Place</th>
                  <th>Arrived</th>
                  <th>Duration</th>
                  <th>Source</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => (
                  <tr key={visit.id}>
                    <td data-label="Rep">{nameByRepId.get(visit.repId) ?? visit.repId}</td>
                    <td data-label="Place">
                      {visit.placeName ?? `${visit.lat.toFixed(4)}, ${visit.lng.toFixed(4)}`}
                      {visit.status === 'open' ? ' · here now' : ''}
                    </td>
                    <td data-label="Arrived">
                      {visit.arrivedAt ? format(new Date(visit.arrivedAt), 'h:mm a') : '—'}
                    </td>
                    <td data-label="Duration">
                      {visit.dwellSeconds !== null
                        ? `${Math.max(1, Math.round(visit.dwellSeconds / 60))} min`
                        : 'ongoing'}
                    </td>
                    <td data-label="Source">
                      {visit.source === 'geofence' ? 'Client site' : 'Detected stop'}
                    </td>
                    <td data-label="Location">
                      <a
                        className="secondary-button billing-action-link"
                        href={`https://maps.google.com/?q=${visit.lat},${visit.lng}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open map <ExternalLink size={14} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div>
            <h2>Client sites</h2>
            <p>Registered sites become geofences on reps&apos; devices — arrivals and departures are logged automatically.</p>
          </div>
        </div>
        <form className="invite-form" onSubmit={submitSite}>
          <label>Name<input className="input-field" value={siteForm.name} onChange={(event) => setSiteForm({ ...siteForm, name: event.target.value })} placeholder="Acme Pharma HQ" required /></label>
          <label>Latitude<input className="input-field" type="number" step="any" min={-90} max={90} value={siteForm.lat} onChange={(event) => setSiteForm({ ...siteForm, lat: event.target.value })} placeholder="18.5204" required /></label>
          <label>Longitude<input className="input-field" type="number" step="any" min={-180} max={180} value={siteForm.lng} onChange={(event) => setSiteForm({ ...siteForm, lng: event.target.value })} placeholder="73.8567" required /></label>
          <label>Radius (m)<input className="input-field" type="number" min={50} max={1000} value={siteForm.radiusMeters} onChange={(event) => setSiteForm({ ...siteForm, radiusMeters: event.target.value })} /></label>
          <button className="btn-primary" disabled={siteSubmitting}><Plus size={16} /> {siteSubmitting ? 'Adding…' : 'Add site'}</button>
        </form>
        {sites.length === 0 ? (
          <p>No client sites yet. Add the places your reps visit; a 150 m radius suits most buildings.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Coordinates</th><th>Radius</th><th></th></tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id}>
                    <td data-label="Name">{site.name}</td>
                    <td data-label="Coordinates">
                      <a
                        className="secondary-button billing-action-link"
                        href={`https://maps.google.com/?q=${site.lat},${site.lng}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {site.lat.toFixed(4)}, {site.lng.toFixed(4)} <ExternalLink size={14} />
                      </a>
                    </td>
                    <td data-label="Radius">{site.radiusMeters} m</td>
                    <td data-label="">
                      <button className="icon-button" aria-label={`Remove ${site.name}`} onClick={() => void deleteSite(site)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
