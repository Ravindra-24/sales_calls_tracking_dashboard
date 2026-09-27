import { useEffect, useState } from 'react';
import { ImagePlus, Save, Trash2 } from 'lucide-react';
import { api, getApiErrorMessage } from '../../api/client';
import type { ApiResponse } from '../../types/api';
import { resizeLogo, type OrgBranding } from '../../utils/orgBranding';
import { OrgBrand } from './OrgBrand';

interface OrgProfileFormProps {
  orgId: string;
  initial: OrgBranding;
  onSaved?: (branding: OrgBranding) => void;
}

/** Organization name + logo, saved through PATCH /orgs/:orgId/profile. */
export const OrgProfileForm = ({ orgId, initial, onSaved }: OrgProfileFormProps) => {
  const [name, setName] = useState(initial.name);
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setName(initial.name);
    setLogoUrl(initial.logoUrl);
  }, [initial.name, initial.logoUrl]);

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage('');
    try {
      setLogoUrl(await resizeLogo(file));
    } catch (err) {
      setMessage(`Failed to use logo: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await api.patch<ApiResponse<OrgBranding>>(`/orgs/${orgId}/profile`, { name: name.trim(), logoUrl });
      const saved = { name: response.data.data.name, logoUrl: response.data.data.logoUrl ?? null };
      onSaved?.(saved);
      setMessage('Organization profile updated.');
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Failed to update organization profile.'));
    } finally {
      setSaving(false);
    }
  };

  const inputId = `org-logo-upload-${orgId}`;

  return (
    <form className="settings-form" onSubmit={handleSave}>
      <div className="profile-settings-layout">
        <div className="avatar-settings">
          <label htmlFor={inputId} className="avatar-picker logo-picker" aria-label="Upload organization logo">
            {logoUrl ? <img src={logoUrl} alt="Organization logo" /> : <ImagePlus size={34} color="rgba(148,163,184,0.72)" />}
            <div className="overlay"><span>{logoUrl ? 'Change' : 'Upload'}</span></div>
          </label>
          <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleLogoChange(event)} className="avatar-input" />
          {logoUrl && <button type="button" className="secondary-button" onClick={() => setLogoUrl(null)}><Trash2 size={15} /> Remove logo</button>}
        </div>

        <div className="settings-grid profile-settings-grid">
          <label>Organization Name
            <input className="input-field" value={name} minLength={2} maxLength={100} required onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="org-brand-preview">
            <span className="org-brand-preview-label">Sidebar preview</span>
            <div className="brand-lockup"><OrgBrand branding={{ name: name.trim() || initial.name, logoUrl }} as="strong" /></div>
            {!logoUrl && <small>Upload a logo to show your organization&apos;s name and logo in the sidebar.</small>}
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button type="submit" className="btn-primary" disabled={saving || name.trim().length < 2}>{saving ? 'Saving...' : <><Save size={16} /> Save Organization Profile</>}</button>
      </div>
      {message && <div className={`notice ${message.toLowerCase().includes('fail') ? 'error-notice' : 'success-notice'}`}>{message}</div>}
    </form>
  );
};
