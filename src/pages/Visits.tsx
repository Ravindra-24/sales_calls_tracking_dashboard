import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Map as MapIcon, MapPin, RefreshCw, Route, UserRound } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { api, getApiErrorMessage } from '../api/client';
import { VisitMap, type VisitPolyline } from '../components/maps/TrackingMap';
import { useAuth } from '../context/auth';
import type { ApiResponse, TeamMember } from '../types/api';
import type {
  LiveRepStatus,
  RoutePoint,
  TrackingClient,
  TrackingVisit,
} from '../types/tracking';

const visitLabel = (visit: TrackingVisit) =>
  visit.placeName
  ?? visit.reason
  ?? (visit.type === 'unclassified' ? 'Unclassified stop' : 'Client visit');

export const Visits = () => {
  const { claims } = useAuth();
  const [visits, setVisits] = useState<TrackingVisit[]>([]);
  const [clients, setClients] = useState<TrackingClient[]>([]);
  const [liveReps, setLiveReps] = useState<LiveRepStatus[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [repId, setRepId] = useState('');
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [routeNotice, setRouteNotice] = useState(
    'Select one representative to request the exact GPS trail.',
  );
  const [routeLoading, setRouteLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReferenceData = useCallback(async () => {
    if (!claims.orgId) return;
    try {
      const [membersResponse, clientsResponse, liveResponse] = await Promise.all([
        api.get<ApiResponse<TeamMember[]>>(`/orgs/${claims.orgId}/users`, {
          params: { limit: 100 },
        }),
        api.get<ApiResponse<TrackingClient[]>>('/tracking/clients'),
        api.get<ApiResponse<LiveRepStatus[]>>('/tracking/live'),
      ]);
      // Every organization role can start a shift in the mobile app. Keeping
      // only sales_member here hid valid test/field trails recorded by a
      // manager or org admin (for example Ritik's July 27 shift).
      setMembers(membersResponse.data.data.filter((member) => member.status === 'active'));
      setClients(clientsResponse.data.data);
      setLiveReps(liveResponse.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load tracking context.'));
    }
  }, [claims.orgId]);

  const loadVisits = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const dayStart = startOfDay(new Date(`${selectedDate}T00:00:00`));
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const response = await api.get<ApiResponse<TrackingVisit[]>>('/tracking/visits', {
        params: {
          from: dayStart.toISOString(),
          to: dayEnd.toISOString(),
          repId: repId || undefined,
          limit: 200,
        },
      });
      setVisits(response.data.data);
      setSelectedVisitId(response.data.data[0]?.id ?? null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load visits.'));
    } finally {
      setLoading(false);
    }
  }, [repId, selectedDate]);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    void loadVisits();
  }, [loadVisits]);

  useEffect(() => {
    if (!repId) {
      setRoutePoints([]);
      setRouteNotice('Select one representative to request the exact GPS trail.');
      return;
    }
    let cancelled = false;
    setRouteLoading(true);
    api.get<ApiResponse<{
      repId: string;
      date: string;
      points: RoutePoint[];
    }>>('/tracking/route', {
      params: { repId, date: selectedDate },
    })
      .then((response) => {
        if (cancelled) return;
        setRoutePoints(response.data.data.points);
        setRouteNotice(
          response.data.data.points.length > 1
            ? 'Showing the consented GPS trail from the 90-day archive.'
            : 'No archived GPS trail was found for this representative and day.',
        );
      })
      .catch((requestError) => {
        if (cancelled) return;
        setRoutePoints([]);
        setRouteNotice(getApiErrorMessage(
          requestError,
          'Exact route playback is not available for this selection.',
        ));
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repId, selectedDate]);

  const repNames = useMemo(
    () => new Map(members.map((member) => [member.id, member.name || member.email])),
    [members],
  );

  const boardVisitLabel = useCallback((visit: TrackingVisit) => {
    const place = visitLabel(visit);
    if (repId) return place;
    return `${place} · ${repNames.get(visit.repId) ?? 'Unknown representative'}`;
  }, [repId, repNames]);

  const filteredLiveReps = useMemo(
    () => liveReps.filter((rep) => !repId || rep.repId === repId),
    [liveReps, repId],
  );

  const visitSequenceLines = useMemo<VisitPolyline[]>(() => {
    const grouped = new Map<string, TrackingVisit[]>();
    visits.forEach((visit) => {
      const list = grouped.get(visit.repId) ?? [];
      list.push(visit);
      grouped.set(visit.repId, list);
    });
    return [...grouped.entries()]
      .map(([lineRepId, repVisits]) => ({
        repId: lineRepId,
        kind: 'visit-sequence' as const,
        positions: repVisits
          .filter((visit) => visit.arrivedAt)
          .sort((a, b) => (
            new Date(a.arrivedAt!).getTime() - new Date(b.arrivedAt!).getTime()
          ))
          .map((visit) => [visit.lat, visit.lng] as [number, number]),
      }))
      .filter((line) => line.positions.length > 1);
  }, [visits]);

  const displayedLines = useMemo<VisitPolyline[]>(() => {
    if (repId && routePoints.length > 1) {
      const byShift = new Map<string, RoutePoint[]>();
      routePoints.forEach((point) => {
        const points = byShift.get(point.shiftId) ?? [];
        points.push(point);
        byShift.set(point.shiftId, points);
      });
      return [...byShift.entries()].map(([shiftId, points]) => ({
        id: shiftId,
        repId,
        kind: 'gps-route' as const,
        positions: points.map((point) => [point.lat, point.lng]),
      }));
    }
    return visitSequenceLines;
  }, [repId, routePoints, visitSequenceLines]);

  const unclassified = visits.filter((visit) => visit.type === 'unclassified');
  const atLocation = visits.filter((visit) => visit.status === 'open');
  const visited = visits.filter(
    (visit) => visit.type === 'client_visit' && visit.status === 'closed',
  );
  const visitedClientIds = new Set(
    visits
      .filter((visit) => visit.type === 'client_visit')
      .map((visit) => visit.clientId)
      .filter(Boolean),
  );
  const notVisited = clients.filter(
    (client) =>
      (repId
        ? client.assignedRepIds.includes(repId)
        : client.assignedRepIds.length > 0)
      && !visitedClientIds.has(client.id),
  );

  const board = [
    { title: 'Unclassified', tone: 'warning', items: unclassified.map(boardVisitLabel) },
    { title: 'At location', tone: 'active', items: atLocation.map(boardVisitLabel) },
    { title: 'Visited today', tone: 'active', items: visited.map(boardVisitLabel) },
    { title: 'Assigned · not visited', tone: 'pending', items: notVisited.map((client) => client.name) },
  ];

  return (
    <div className="page animate-fade-in visits-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Field movement</p>
          <h1>Visits & routes</h1>
          <p>See client stops spatially and understand each representative&apos;s day.</p>
        </div>
        <button
          className="secondary-button"
          onClick={() => void Promise.all([loadReferenceData(), loadVisits()])}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error ? <div className="notice error-notice">{error}</div> : null}

      <section className="section-card tracking-filter-card">
        <label>
          <CalendarDays size={16} />
          Day
          <input
            className="input-field"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </label>
        <label>
          <UserRound size={16} />
          Representative
          <select
            className="input-field"
            value={repId}
            onChange={(event) => setRepId(event.target.value)}
          >
            <option value="">All representatives</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name || member.email}
                {member.role === 'sales_member'
                  ? ''
                  : ` · ${member.role === 'org_admin' ? 'Admin' : 'Manager'}`}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="section-card map-card">
        <div className="map-card-heading">
          <div>
            <h2>Field map</h2>
            <p>
              {routePoints.length > 1
                ? 'The solid line is the archived GPS trail for the selected representative.'
                : 'Dashed lines connect visit stops in time order; they are not the exact road traveled.'}
            </p>
          </div>
          <span className="route-state">
            <Route size={16} />
            {routeLoading
              ? 'Loading route'
              : routePoints.length > 1
                ? 'GPS route'
                : 'Visit sequence'}
          </span>
        </div>
        {loading ? (
          <div className="map-loading">Loading mapped visits…</div>
        ) : (
          <VisitMap
            visits={visits}
            clients={clients}
            liveReps={filteredLiveReps}
            polylines={displayedLines}
            selectedVisitId={selectedVisitId}
            onSelectVisit={setSelectedVisitId}
            repNames={repNames}
          />
        )}
      </section>

      <div className="visit-board">
        {board.map((column) => (
          <section className="section-card visit-board-column" key={column.title}>
            <div className="visit-board-heading">
              <h2>{column.title}</h2>
              <span className={`status-badge ${column.tone}`}><i />{column.items.length}</span>
            </div>
            {column.items.length === 0 ? (
              <p className="visit-board-empty">Nothing here for this selection.</p>
            ) : (
              <div className="visit-board-items">
                {column.items.slice(0, 12).map((item, index) => (
                  <div className="visit-board-item" key={`${item}-${index}`}>
                    <MapPin size={15} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <section className="section-card route-explainer">
        <MapIcon size={22} />
        <div>
          <h2>{routePoints.length > 1 ? 'Exact GPS trail' : 'Route playback status'}</h2>
          <p>{routeNotice}</p>
        </div>
      </section>
    </div>
  );
};
