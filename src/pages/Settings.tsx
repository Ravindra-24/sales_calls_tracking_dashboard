import { useEffect, useState } from 'react';
import { AlertCircle, Building2, Lock, Monitor, Moon, Save, Shield, Sun, User } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { api, getApiErrorMessage } from '../api/client';
import { auth } from '../config/firebase';
import { useAuth } from '../context/auth';
import { useTheme, type ThemeMode } from '../context/theme';
import type { ApiResponse, OrganizationDetails, PlatformSettings } from '../types/api';

const defaultOrgSettings: OrganizationDetails['settings'] = {
  timezone: 'Asia/Kolkata',
  weeklyReportsEnabled: true,
  managerCanEditSalesMembers: true,
};

const themeOptions: Array<{ value: ThemeMode; label: string; icon: typeof Monitor }> = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export const Settings = () => {
  const { user, claims } = useAuth();
  const { mode, setMode } = useTheme();

  const [name, setName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const [orgSettings, setOrgSettings] = useState<OrganizationDetails['settings']>(defaultOrgSettings);
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgMessage, setOrgMessage] = useState('');
  const [orgLoading, setOrgLoading] = useState(false);

  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [platformSaving, setPlatformSaving] = useState(false);
  const [platformMessage, setPlatformMessage] = useState('');
  const [platformLoading, setPlatformLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get<ApiResponse<{ name?: string; avatarUrl?: string }>>('/auth/me');
        setName(response.data.data.name || user?.displayName || '');
        setAvatarUrl(response.data.data.avatarUrl || '');
      } catch {
        setName(user?.displayName || '');
      }
    };
    void loadProfile();
  }, [user]);

  useEffect(() => {
    if (claims.role !== 'org_admin' || !claims.orgId) return;

    const loadOrg = async () => {
      setOrgLoading(true);
      try {
        const response = await api.get<ApiResponse<OrganizationDetails>>(`/orgs/${claims.orgId}`);
        setOrgSettings({ ...defaultOrgSettings, ...response.data.data.settings });
      } catch (err) {
        setOrgMessage(getApiErrorMessage(err, 'Failed to load organization settings.'));
      } finally {
        setOrgLoading(false);
      }
    };

    void loadOrg();
  }, [claims.orgId, claims.role]);

  useEffect(() => {
    if (claims.role !== 'platform_owner') return;

    const loadPlatform = async () => {
      setPlatformLoading(true);
      try {
        const res = await api.get<ApiResponse<PlatformSettings>>('/admin/settings');
        setPlatformSettings(res.data.data);
      } catch (err) {
        setPlatformMessage(getApiErrorMessage(err, 'Failed to load platform settings.'));
      } finally {
        setPlatformLoading(false);
      }
    };

    void loadPlatform();
  }, [claims.role]);

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileMessage('');
    try {
      await api.patch('/auth/me/profile', { name, avatarUrl: avatarUrl || undefined });
      setProfileMessage('Profile updated successfully.');
    } catch (err) {
      setProfileMessage(getApiErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setProfileMessage('Password reset email sent. Check your inbox.');
    } catch (err) {
      setProfileMessage(err instanceof Error ? err.message : 'Failed to send reset email.');
    }
  };

  const handleOrgSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!claims.orgId) return;
    setOrgSaving(true);
    setOrgMessage('');
    try {
      await api.patch(`/orgs/${claims.orgId}`, { settings: orgSettings });
      setOrgMessage('Organization settings updated.');
    } catch (err) {
      setOrgMessage(getApiErrorMessage(err, 'Failed to update organization settings.'));
    } finally {
      setOrgSaving(false);
    }
  };

  const handlePlatformSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setPlatformSaving(true);
    setPlatformMessage('');
    try {
      await api.patch('/admin/settings', platformSettings);
      setPlatformMessage('Platform settings updated.');
    } catch (err) {
      setPlatformMessage(getApiErrorMessage(err, 'Failed to update platform settings.'));
    } finally {
      setPlatformSaving(false);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="page animate-fade-in">
      <header className="page-header">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Settings</h1>
          <p>Manage your profile, appearance, and role-based controls.</p>
        </div>
      </header>

      <div className="settings-stack">
        <section className="section-card settings-card">
          <div className="section-heading">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="stat-icon violet"><User size={18} /></div>
              <div>
                <h2>Profile Settings</h2>
                <p>Personal details used across LeadWatch.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSave} style={{ display: 'grid', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <label htmlFor="avatar-upload" className="avatar-picker">
                  {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : <User size={40} color="rgba(148,163,184,0.72)" />}
                  <div className="overlay"><span style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>Change</span></div>
                </label>
                <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="avatar-input" />
              </div>

              <div className="settings-grid" style={{ flex: 1 }}>
                <label>Full Name
                  <input className="input-field" value={name} onChange={(event) => setName(event.target.value)} />
                </label>
                <label>Email Address
                  <input className="input-field" value={user?.email || ''} disabled />
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
              <button type="button" onClick={handlePasswordReset} className="secondary-button"><Lock size={16} /> Reset Password</button>
              <button type="submit" className="btn-primary" disabled={profileSaving}>{profileSaving ? 'Saving...' : <><Save size={16} /> Save Profile</>}</button>
            </div>
            {profileMessage && <div className={`notice ${profileMessage.toLowerCase().includes('fail') ? 'error-notice' : 'success-notice'}`}>{profileMessage}</div>}
          </form>
        </section>

        <section className="section-card settings-card">
          <div className="section-heading">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="stat-icon blue"><Monitor size={18} /></div>
              <div>
                <h2>Appearance</h2>
                <p>Theme preference is saved on this device.</p>
              </div>
            </div>
          </div>
          <div className="segmented-control" role="group" aria-label="Theme mode">
            {themeOptions.map((option) => (
              <button key={option.value} className={mode === option.value ? 'active' : ''} onClick={() => setMode(option.value)} type="button">
                <option.icon size={15} /> {option.label}
              </button>
            ))}
          </div>
        </section>

        {claims.role === 'org_admin' && (
          <section className="section-card settings-card">
            <div className="section-heading">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="stat-icon blue"><Building2 size={18} /></div>
                <div>
                  <h2>Organization Settings</h2>
                  <p>Controls shared by dashboard and mobile app.</p>
                </div>
              </div>
            </div>

            {orgLoading ? (
              <div className="empty-state">Loading settings...</div>
            ) : (
              <form onSubmit={handleOrgSave} style={{ display: 'grid', gap: '18px' }}>
                <div className="settings-row">
                  <div><h3>Weekly Summary Reports</h3><p>Email summaries for managers and admins.</p></div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={orgSettings.weeklyReportsEnabled ?? true} onChange={(event) => setOrgSettings((settings) => ({ ...settings, weeklyReportsEnabled: event.target.checked }))} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="settings-row">
                  <div><h3>Manager Sales Rep Edits</h3><p>Allow managers to edit sales representative profiles and reset passwords.</p></div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={orgSettings.managerCanEditSalesMembers ?? true} onChange={(event) => setOrgSettings((settings) => ({ ...settings, managerCanEditSalesMembers: event.target.checked }))} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="settings-grid">
                  <label>Default Timezone
                    <select className="input-field" value={orgSettings.timezone || 'Asia/Kolkata'} onChange={(event) => setOrgSettings((settings) => ({ ...settings, timezone: event.target.value }))}>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time (US)</option>
                      <option value="America/Los_Angeles">Pacific Time (US)</option>
                      <option value="Europe/London">London (GMT/BST)</option>
                    </select>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <button type="submit" className="btn-primary" disabled={orgSaving}>{orgSaving ? 'Saving...' : <><Save size={16} /> Save Organization</>}</button>
                </div>
                {orgMessage && <div className={`notice ${orgMessage.toLowerCase().includes('fail') ? 'error-notice' : 'success-notice'}`}>{orgMessage}</div>}
              </form>
            )}
          </section>
        )}

        {claims.role === 'platform_owner' && (
          <section className="section-card settings-card">
            <div className="section-heading">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="stat-icon" style={{ color: 'var(--danger)', background: 'rgba(248, 113, 113, 0.1)' }}><Shield size={18} /></div>
                <div>
                  <h2>Platform Administration</h2>
                  <p>Global settings affecting all tenants.</p>
                </div>
              </div>
            </div>

            {platformLoading ? (
              <div className="empty-state">Loading settings...</div>
            ) : (
              <form onSubmit={handlePlatformSave} style={{ display: 'grid', gap: '18px' }}>
                <div className="settings-row" style={{ background: 'rgba(248, 113, 113, 0.05)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', marginBottom: '4px' }}><AlertCircle size={16} /><h3>Global Weekly Reports</h3></div>
                    <p>Master switch for the weekly report scheduler.</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={platformSettings?.weeklyReportsEnabled ?? false} onChange={(event) => setPlatformSettings((settings) => settings ? { ...settings, weeklyReportsEnabled: event.target.checked } : null)} />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <button type="submit" className="btn-primary" disabled={platformSaving}>{platformSaving ? 'Saving...' : <><Save size={16} /> Save Platform</>}</button>
                </div>
                {platformMessage && <div className={`notice ${platformMessage.toLowerCase().includes('fail') ? 'error-notice' : 'success-notice'}`}>{platformMessage}</div>}
              </form>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
