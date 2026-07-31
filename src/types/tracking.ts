export interface TrackingClient {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  address: string | null;
  contactName: string | null;
  phone: string | null;
  category: string | null;
  notes: string | null;
  assignedRepIds: string[];
}

export interface TrackingVisit {
  id: string;
  repId: string;
  shiftId: string;
  status: 'open' | 'closed';
  source: 'geofence' | 'dwell_detection' | 'manual';
  type: 'client_visit' | 'ad_hoc_stop' | 'unclassified';
  lat: number;
  lng: number;
  orgLocationId: string | null;
  clientId: string | null;
  placeName: string | null;
  reason: string | null;
  notes: string | null;
  geocodeStatus: 'pending' | 'matched' | 'named' | 'failed' | 'skipped';
  arrivedAt: string | null;
  departedAt: string | null;
  dwellSeconds: number | null;
}

export interface LiveRepStatus {
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

export interface RoutePoint {
  shiftId: string;
  ts: string;
  lat: number;
  lng: number;
  accuracy: number | null;
}
