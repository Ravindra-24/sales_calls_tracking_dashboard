import { Fragment, useEffect, useMemo } from 'react';
import L, { type LatLngExpression, type LatLngTuple } from 'leaflet';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../../context/theme';
import type {
  LiveRepStatus,
  TrackingClient,
  TrackingVisit,
} from '../../types/tracking';

const DEFAULT_CENTER: LatLngTuple = [18.5204, 73.8567];
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const numberedIcon = (number: number, tone: 'visit' | 'live' | 'client' = 'visit') =>
  L.divIcon({
    className: 'tracking-div-icon-shell',
    html: `<span class="tracking-div-icon ${tone}" aria-hidden="true"><b>${number}</b></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

const clientIcon = (name: string) =>
  L.divIcon({
    className: 'tracking-div-icon-shell',
    html: `<span class="tracking-div-icon client" title="${escapeHtml(name)}" aria-hidden="true"><b>C</b></span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

const routeEndpointIcon = (label: 'S' | 'E', tone: 'route-start' | 'route-end') =>
  L.divIcon({
    className: 'tracking-div-icon-shell',
    html: `<span class="tracking-div-icon ${tone}" aria-hidden="true"><b>${label}</b></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

const RecenterMap = ({ center, zoom = 16 }: { center: LatLngTuple; zoom?: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, map, zoom]);
  return null;
};

const FitMapToPoints = ({ points }: { points: LatLngTuple[] }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [34, 34], maxZoom: 16 });
  }, [map, points]);
  return null;
};

const TileLayerForTheme = () => {
  const { resolvedTheme } = useTheme();
  const style = resolvedTheme === 'dark' ? 'dark_all' : 'light_all';
  return (
    <TileLayer
      key={style}
      attribution={CARTO_ATTRIBUTION}
      url={`https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`}
      subdomains="abcd"
      maxZoom={20}
    />
  );
};

const MapClickPicker = ({
  onChange,
}: {
  onChange: (position: { lat: number; lng: number }) => void;
}) => {
  useMapEvents({
    click: (event) => onChange(event.latlng),
  });
  return null;
};

export const ClientLocationPicker = ({
  value,
  radiusMeters,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  radiusMeters: number;
  onChange: (position: { lat: number; lng: number }) => void;
}) => {
  const center: LatLngTuple = value ? [value.lat, value.lng] : DEFAULT_CENTER;
  const marker = useMemo(() => clientIcon('Selected client location'), []);

  return (
    <div className="tracking-map client-location-map">
      <MapContainer center={center} zoom={value ? 16 : 12} scrollWheelZoom>
        <TileLayerForTheme />
        <MapClickPicker onChange={onChange} />
        <RecenterMap center={center} zoom={value ? 16 : 12} />
        {value ? (
          <>
            <Circle
              center={[value.lat, value.lng]}
              radius={radiusMeters}
              pathOptions={{ color: '#4f8cff', fillColor: '#4f8cff', fillOpacity: 0.12 }}
            />
            <Marker
              position={[value.lat, value.lng]}
              icon={marker}
              draggable
              eventHandlers={{
                dragend: (event) => {
                  const next = event.target.getLatLng();
                  onChange({ lat: next.lat, lng: next.lng });
                },
              }}
            >
              <Tooltip permanent direction="top" offset={[0, -18]}>
                Drag to fine-tune
              </Tooltip>
            </Marker>
          </>
        ) : null}
      </MapContainer>
      <div className="map-instruction">
        {value ? 'Drag the pin or click another place.' : 'Click the client location on the map.'}
      </div>
    </div>
  );
};

export interface VisitPolyline {
  id?: string;
  repId: string;
  positions: LatLngTuple[];
  kind?: 'visit-sequence' | 'gps-route';
}

export const VisitMap = ({
  visits,
  clients = [],
  liveReps = [],
  polylines = [],
  selectedVisitId,
  onSelectVisit,
  repNames = new Map<string, string>(),
}: {
  visits: TrackingVisit[];
  clients?: TrackingClient[];
  liveReps?: LiveRepStatus[];
  polylines?: VisitPolyline[];
  selectedVisitId?: string | null;
  onSelectVisit?: (visitId: string) => void;
  repNames?: Map<string, string>;
}) => {
  const mapPoints = useMemo<LatLngTuple[]>(() => [
    ...visits.map((visit) => [visit.lat, visit.lng] as LatLngTuple),
    ...clients.map((client) => [client.lat, client.lng] as LatLngTuple),
    ...liveReps
      .filter((rep) => rep.lastLat !== null && rep.lastLng !== null)
      .map((rep) => [rep.lastLat!, rep.lastLng!] as LatLngTuple),
    ...polylines.flatMap((line) => line.positions),
  ], [clients, liveReps, polylines, visits]);

  const center = mapPoints[0] ?? DEFAULT_CENTER;
  const visitIcons = useMemo(
    () => visits.map((_, index) => numberedIcon(index + 1)),
    [visits],
  );

  return (
    <div className="tracking-map visit-map">
      <MapContainer center={center} zoom={12} scrollWheelZoom>
        <TileLayerForTheme />
        <FitMapToPoints points={mapPoints} />
        {polylines.map((line) => (
          <Polyline
            key={`${line.repId}-${line.kind ?? 'visit-sequence'}-${line.id ?? 'all'}`}
            positions={line.positions}
            pathOptions={{
              color: line.kind === 'gps-route' ? '#4f8cff' : '#8b5cf6',
              weight: line.kind === 'gps-route' ? 5 : 3,
              opacity: line.kind === 'gps-route' ? 0.9 : 0.55,
              dashArray: line.kind === 'gps-route' ? undefined : '8 8',
            }}
          >
            <Tooltip sticky>
              {repNames.get(line.repId) ?? line.repId} ·{' '}
              {line.kind === 'gps-route' ? 'GPS route' : 'visit sequence'}
            </Tooltip>
          </Polyline>
        ))}
        {polylines
          .filter((line) => line.kind === 'gps-route' && line.positions.length > 0)
          .flatMap((line) => {
            const name = repNames.get(line.repId) ?? line.repId;
            const start = line.positions[0];
            const end = line.positions[line.positions.length - 1];
            return [
              <Marker
                key={`${line.repId}-${line.id ?? 'all'}-route-start`}
                position={start}
                icon={routeEndpointIcon('S', 'route-start')}
                zIndexOffset={900}
              >
                <Popup><strong>{name}</strong><br />Shift route started here</Popup>
              </Marker>,
              <Marker
                key={`${line.repId}-${line.id ?? 'all'}-route-end`}
                position={end}
                icon={routeEndpointIcon('E', 'route-end')}
                zIndexOffset={900}
              >
                <Popup><strong>{name}</strong><br />Shift route ended here</Popup>
              </Marker>,
            ];
          })}
        {clients.map((client) => (
          <Fragment key={client.id}>
            <Circle
              center={[client.lat, client.lng]}
              radius={client.radiusMeters}
              pathOptions={{ color: '#14b8a6', fillOpacity: 0.05, weight: 1 }}
            />
            <Marker
              position={[client.lat, client.lng]}
              icon={clientIcon(client.name)}
            >
              <Popup>
                <strong>{client.name}</strong>
                <br />
                {client.address ?? `${client.radiusMeters} m visit radius`}
              </Popup>
            </Marker>
          </Fragment>
        ))}
        {visits.map((visit, index) => (
          <Marker
            key={visit.id}
            position={[visit.lat, visit.lng]}
            icon={visitIcons[index]}
            zIndexOffset={selectedVisitId === visit.id ? 1000 : 0}
            eventHandlers={{ click: () => onSelectVisit?.(visit.id) }}
          >
            <Popup>
              <strong>{visit.placeName ?? visit.reason ?? 'Unclassified stop'}</strong>
              <br />
              {repNames.get(visit.repId) ?? visit.repId}
              <br />
              {visit.arrivedAt ? new Date(visit.arrivedAt).toLocaleString() : 'Time unavailable'}
            </Popup>
          </Marker>
        ))}
        {liveReps
          .filter((rep) => rep.lastLat !== null && rep.lastLng !== null)
          .map((rep, index) => (
            <Marker
              key={rep.repId}
              position={[rep.lastLat!, rep.lastLng!] as LatLngExpression}
              icon={numberedIcon(index + 1, 'live')}
            >
              <Popup>
                <strong>{repNames.get(rep.repId) ?? rep.repId}</strong>
                <br />
                {rep.stale ? 'Tracking signal is stale' : 'Live position'}
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
};
