import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Crosshair,
  Edit3,
  MapPinned,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { api, getApiErrorMessage } from '../api/client';
import { ClientLocationPicker } from '../components/maps/TrackingMap';
import { useAuth } from '../context/auth';
import { useFeedback } from '../context/feedback';
import type { ApiResponse, TeamMember } from '../types/api';
import type { TrackingClient } from '../types/tracking';

const EMPTY_FORM = {
  name: '',
  address: '',
  contactName: '',
  phone: '',
  category: 'Customer',
  notes: '',
  radiusMeters: '150',
};

const CLIENT_CATEGORIES = ['Customer', 'Prospect', 'Distributor', 'Retailer', 'Other'];

export const Clients = () => {
  const { claims } = useAuth();
  const { confirm, toast } = useFeedback();
  const [clients, setClients] = useState<TrackingClient[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [assignedRepIds, setAssignedRepIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!claims.orgId) return;
    setLoading(true);
    setError('');
    try {
      const [clientsResponse, membersResponse] = await Promise.all([
        api.get<ApiResponse<TrackingClient[]>>('/tracking/clients'),
        api.get<ApiResponse<TeamMember[]>>(`/orgs/${claims.orgId}/users`, {
          params: { limit: 100 },
        }),
      ]);
      setClients(clientsResponse.data.data);
      setMembers(
        membersResponse.data.data.filter(
          (member) => member.role === 'sales_member' && member.status === 'active',
        ),
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load clients.'));
    } finally {
      setLoading(false);
    }
  }, [claims.orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPosition(null);
    setAssignedRepIds([]);
  };

  const startEdit = (client: TrackingClient) => {
    setEditingId(client.id);
    setForm({
      name: client.name,
      address: client.address ?? '',
      contactName: client.contactName ?? '',
      phone: client.phone ?? '',
      category: client.category ?? 'Customer',
      notes: client.notes ?? '',
      radiusMeters: String(client.radiusMeters),
    });
    setPosition({ lat: client.lat, lng: client.lng });
    setAssignedRepIds(client.assignedRepIds);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const useCurrentPosition = () => {
    if (!navigator.geolocation) {
      setError('This browser does not provide location access. Click the map instead.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({
          lat: result.coords.latitude,
          lng: result.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setError('Current location was unavailable. Click the client place on the map.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  };

  const toggleRep = (repId: string) => {
    setAssignedRepIds((current) =>
      current.includes(repId)
        ? current.filter((id) => id !== repId)
        : [...current, repId],
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!position) {
      setError('Choose the client location on the map.');
      return;
    }
    setSaving(true);
    setError('');
    const radiusMeters = Math.min(1000, Math.max(50, Number(form.radiusMeters) || 150));
    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      contactName: form.contactName.trim() || null,
      phone: form.phone.trim() || null,
      category: form.category,
      notes: form.notes.trim() || null,
      radiusMeters,
      lat: position.lat,
      lng: position.lng,
    };

    try {
      if (editingId) {
        const existing = clients.find((client) => client.id === editingId);
        await api.patch(`/tracking/clients/${editingId}`, payload);
        const previous = new Set(existing?.assignedRepIds ?? []);
        const next = new Set(assignedRepIds);
        const add = assignedRepIds.filter((id) => !previous.has(id));
        const remove = [...previous].filter((id) => !next.has(id));
        if (add.length || remove.length) {
          await api.patch(`/tracking/clients/${editingId}/assignees`, { add, remove });
        }
        toast({ message: 'Client updated.', variant: 'success' });
      } else {
        await api.post('/tracking/clients', {
          ...payload,
          address: payload.address ?? undefined,
          contactName: payload.contactName ?? undefined,
          phone: payload.phone ?? undefined,
          notes: payload.notes ?? undefined,
          assignedRepIds,
        });
        toast({ message: 'Client added to the map.', variant: 'success' });
      }
      resetForm();
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to save the client.'));
    } finally {
      setSaving(false);
    }
  };

  const removeClient = async (client: TrackingClient) => {
    const approved = await confirm({
      title: `Remove ${client.name}?`,
      message: 'This removes its geofence from future shifts. Existing visit history stays intact.',
      confirmLabel: 'Remove client',
      variant: 'danger',
    });
    if (!approved) return;
    try {
      await api.delete(`/tracking/clients/${client.id}`);
      toast({ message: 'Client removed.', variant: 'success' });
      if (editingId === client.id) resetForm();
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to remove the client.'));
    }
  };

  const repNames = useMemo(
    () => new Map(members.map((member) => [member.id, member.name || member.email])),
    [members],
  );

  return (
    <div className="page animate-fade-in clients-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Field team</p>
          <h1>Clients & locations</h1>
          <p>Add client points visually, set their visit radius, and assign representatives.</p>
        </div>
        <button className="secondary-button" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error ? <div className="notice error-notice">{error}</div> : null}

      <section className="section-card client-editor">
        <div className="section-heading">
          <div>
            <h2>{editingId ? 'Edit client' : 'Add a client point'}</h2>
            <p>Click the map or drag the pin. Coordinates are stored internally.</p>
          </div>
          {editingId ? (
            <button className="secondary-button" type="button" onClick={resetForm}>
              <X size={16} /> Cancel editing
            </button>
          ) : null}
        </div>

        <div className="client-editor-layout">
          <form className="client-form" onSubmit={submit}>
            <div className="client-form-grid">
              <label>
                Client name
                <input
                  className="input-field"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Acme Pharma"
                  maxLength={120}
                  required
                />
              </label>
              <label>
                Category
                <select
                  className="input-field"
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                >
                  {CLIENT_CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label>
                Contact person
                <input
                  className="input-field"
                  value={form.contactName}
                  onChange={(event) => setForm({ ...form, contactName: event.target.value })}
                  maxLength={120}
                />
              </label>
              <label>
                Phone
                <input
                  className="input-field"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  maxLength={20}
                />
              </label>
              <label className="client-form-wide">
                Address or landmark
                <input
                  className="input-field"
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                  placeholder="Manjari Road, Pune"
                  maxLength={200}
                />
              </label>
              <label>
                Visit radius
                <select
                  className="input-field"
                  value={form.radiusMeters}
                  onChange={(event) => setForm({ ...form, radiusMeters: event.target.value })}
                >
                  <option value="75">75 m · small shop</option>
                  <option value="150">150 m · normal building</option>
                  <option value="250">250 m · large campus</option>
                  <option value="500">500 m · industrial area</option>
                </select>
              </label>
              <label className="client-form-wide">
                Notes
                <textarea
                  className="input-field"
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  maxLength={2000}
                  rows={3}
                />
              </label>
            </div>

            <fieldset className="rep-assignment">
              <legend>Assigned representatives</legend>
              {members.length === 0 ? (
                <p>No active sales representatives found.</p>
              ) : (
                <div className="rep-assignment-grid">
                  {members.map((member) => (
                    <label className="checkbox-label" key={member.id}>
                      <input
                        type="checkbox"
                        checked={assignedRepIds.includes(member.id)}
                        onChange={() => toggleRep(member.id)}
                      />
                      {member.name || member.email}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <div className="client-form-actions">
              <button className="btn-primary" disabled={saving || !position}>
                {editingId ? <Save size={16} /> : <Plus size={16} />}
                {saving ? 'Saving…' : editingId ? 'Save client' : 'Add client'}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={useCurrentPosition}
                disabled={locating}
              >
                <Crosshair size={16} /> {locating ? 'Locating…' : 'Use my location'}
              </button>
            </div>
          </form>

          <div className="client-map-panel">
            <ClientLocationPicker
              value={position}
              radiusMeters={Number(form.radiusMeters) || 150}
              onChange={setPosition}
            />
            <div className="client-location-summary">
              <MapPinned size={18} />
              <span>
                {position
                  ? 'Client point selected. Drag the pin to fine-tune it.'
                  : 'Select the client’s real entrance or building on the map.'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="section-card clients-list-card">
        <div className="section-heading">
          <div>
            <h2>Managed clients</h2>
            <p>{clients.length} client point{clients.length === 1 ? '' : 's'} available to shifts.</p>
          </div>
        </div>
        {loading ? (
          <p>Loading clients…</p>
        ) : clients.length === 0 ? (
          <div className="empty-state">
            <MapPinned size={28} />
            <h2>No client points yet</h2>
            <p>Add the first client using the visual map above.</p>
          </div>
        ) : (
          <div className="client-card-grid">
            {clients.map((client) => (
              <article className="client-card" key={client.id}>
                <div className="client-card-heading">
                  <div>
                    <span className="client-category">{client.category ?? 'Client'}</span>
                    <h3>{client.name}</h3>
                  </div>
                  <span className="client-radius">{client.radiusMeters} m</span>
                </div>
                <p>{client.address || 'No address added'}</p>
                <div className="client-assignees">
                  {client.assignedRepIds.length === 0
                    ? 'No reps assigned'
                    : client.assignedRepIds
                      .map((id) => repNames.get(id) ?? id)
                      .join(', ')}
                </div>
                <div className="client-card-actions">
                  <button className="secondary-button" onClick={() => startEdit(client)}>
                    <Edit3 size={15} /> Edit
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${client.name}`}
                    onClick={() => void removeClient(client)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
