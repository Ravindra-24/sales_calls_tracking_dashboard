import { useEffect, useState } from 'react';
import { AlertCircle, Bot, Building2, Lock, Monitor, Moon, Save, Shield, SlidersHorizontal, Sun, User } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { api, getApiErrorMessage } from '../api/client';
import { auth } from '../config/firebase';
import { useAuth } from '../context/auth';
import { useTheme, type ThemeMode } from '../context/theme';
import type { ApiResponse, OrganizationDetails, PlatformSettings } from '../types/api';
import { AiProviderPanel } from '../components/org/AiProviderPanel';
import { OrgProfileForm } from '../components/org/OrgProfileForm';
import { announceOrgBranding, type OrgBranding } from '../utils/orgBranding';

const defaultOrgSettings: OrganizationDetails['settings'] = {
  timezone: 'Asia/Kolkata',
  weeklyReportsEnabled: true,
  managerCanEditSalesMembers: true,
  defaultPhoneCountry: 'IN',
  // Mirrors DEFAULT_ACTIVITY_SETTINGS in GCF/functions/src/services/activityCore.ts.
  workingHoursStart: '10:00',
  workingHoursEnd: '19:30',
  breakStart: '13:30',
  breakEnd: '14:30',
  idleThresholdMinutes: 30,
};

const DEFAULT_BREAK = { breakStart: '13:30', breakEnd: '14:30' };

/** Why the working-hours inputs can't be saved, or null when they can. */
const workingHoursError = (settings: OrganizationDetails['settings']) => {
  const { workingHoursStart: start, workingHoursEnd: end, breakStart, breakEnd } = settings;
  if (!start || !end || end <= start) return 'Working hours must end after they start.';
  if (breakStart && breakEnd && (breakEnd <= breakStart || breakStart < start || breakEnd > end)) {
    return 'The break must end after it starts and sit inside working hours.';
  }
  const threshold = settings.idleThresholdMinutes ?? 30;
  if (!Number.isInteger(threshold) || threshold < 10 || threshold > 180) {
    return 'The no-activity threshold must be between 10 and 180 minutes.';
  }
  return null;
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

  const [orgProfile, setOrgProfile] = useState<OrgBranding | null>(null);
  const [orgSettings, setOrgSettings] = useState<OrganizationDetails['settings']>(defaultOrgSettings);
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgMessage, setOrgMessage] = useState('');
  const [orgLoading, setOrgLoading] = useState(false);

  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [platformSaving, setPlatformSaving] = useState(false);
  const [platformMessage, setPlatformMessage] = useState('');
  const [platformLoading, setPlatformLoading] = useState(false);
  const canManageOrgProfile = claims.role === 'org_admin' || claims.role === 'manager';

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
    if (!canManageOrgProfile || !claims.orgId) return;

    const loadOrg = async () => {
      setOrgLoading(true);
      try {
        const orgResponse = await api.get<ApiResponse<OrganizationDetails>>(`/orgs/${claims.orgId}`);
        setOrgProfile({ name: orgResponse.data.data.name, logoUrl: orgResponse.data.data.logoUrl ?? null });
        setOrgSettings({ ...defaultOrgSettings, ...orgResponse.data.data.settings });
      } catch (err) {
        setOrgMessage(getApiErrorMessage(err, 'Failed to load organization settings.'));
      } finally {
        setOrgLoading(false);
      }
    };

    void loadOrg();
  }, [canManageOrgProfile, claims.orgId]);

  useEffect(() => {
    if (claims.role !== 'platform_owner') return;

    const loadPlatform = async () => {
      setPlatformLoading(true);
      try {
        const settingsResponse = await api.get<ApiResponse<PlatformSettings>>('/admin/settings');
        setPlatformSettings(settingsResponse.data.data);
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
    const hoursError = workingHoursError(orgSettings);
    if (hoursError) {
      setOrgMessage(`Failed to save: ${hoursError}`);
      return;
    }
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
            <div className="settings-heading-content">
              <div className="stat-icon violet"><User size={18} /></div>
              <div>
                <h2>Profile Settings</h2>
                <p>Personal details used across Smartly Manage.</p>
              </div>
            </div>
          </div>

          <form className="settings-form profile-settings-form" onSubmit={handleProfileSave}>
            <div className="profile-settings-layout">
              <div className="avatar-settings">
                <label htmlFor="avatar-upload" className="avatar-picker">
                  {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : <User size={40} color="rgba(148,163,184,0.72)" />}
                  <div className="overlay"><span>Change</span></div>
                </label>
                <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="avatar-input" />
              </div>

              <div className="settings-grid profile-settings-grid">
                <label>Full Name
                  <input className="input-field" value={name} onChange={(event) => setName(event.target.value)} />
                </label>
                <label>Email Address
                  <input className="input-field" value={user?.email || ''} disabled />
                </label>
              </div>
            </div>

            <div className="settings-actions split-actions">
              <button type="button" onClick={handlePasswordReset} className="secondary-button"><Lock size={16} /> Reset Password</button>
              <button type="submit" className="btn-primary" disabled={profileSaving}>{profileSaving ? 'Saving...' : <><Save size={16} /> Save Profile</>}</button>
            </div>
            {profileMessage && <div className={`notice ${profileMessage.toLowerCase().includes('fail') ? 'error-notice' : 'success-notice'}`}>{profileMessage}</div>}
          </form>
        </section>

        <section className="section-card settings-card">
          <div className="section-heading">
            <div className="settings-heading-content">
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

        {canManageOrgProfile && (
          <section className="section-card settings-card">
            <div className="section-heading">
              <div className="settings-heading-content">
                <div className="stat-icon violet"><Building2 size={18} /></div>
                <div>
                  <h2>Organization Profile</h2>
                  <p>Your organization&apos;s name and logo, shown at the top of the sidebar for everyone in your team.</p>
                </div>
              </div>
            </div>
            {orgLoading || !orgProfile ? (
              <div className="empty-state">{orgLoading ? 'Loading organization profile...' : orgMessage || 'Organization profile is unavailable.'}</div>
            ) : (
              <OrgProfileForm
                orgId={claims.orgId}
                initial={orgProfile}
                onSaved={(branding) => {
                  setOrgProfile(branding);
                  announceOrgBranding(branding);
                }}
              />
            )}
          </section>
        )}

        {claims.role === 'org_admin' && (
          <section className="section-card settings-card">
            <div className="section-heading">
              <div className="settings-heading-content">
                <div className="stat-icon blue"><SlidersHorizontal size={18} /></div>
                <div>
                  <h2>Organization Settings</h2>
                  <p>Controls shared by dashboard and mobile app.</p>
                </div>
              </div>
            </div>

            {orgLoading ? (
              <div className="empty-state">Loading settings...</div>
            ) : (
              <form className="settings-form" onSubmit={handleOrgSave}>
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
                  <label>Default Calling Country
                    <select className="input-field" value={orgSettings.defaultPhoneCountry || 'IN'} onChange={(event) => setOrgSettings((settings) => ({ ...settings, defaultPhoneCountry: event.target.value }))}>
                      <option value="IN">India (+91)</option>
                      <option value="US">United States (+1)</option>
                      <option value="GB">United Kingdom (+44)</option>
                      <option value="AE">United Arab Emirates (+971)</option>
                      <option value="SG">Singapore (+65)</option>
                    </select>
                  </label>
                </div>

                <div className="settings-row">
                  <div><h3>Working Hours &amp; Activity</h3><p>Used by Team Activity to find stretches with no call activity. Calls outside these hours are shown but not scored.</p></div>
                </div>
                <div className="settings-grid">
                  <label>Working hours start
                    <input className="input-field" type="time" required value={orgSettings.workingHoursStart ?? ''} onChange={(event) => setOrgSettings((settings) => ({ ...settings, workingHoursStart: event.target.value }))} />
                  </label>
                  <label>Working hours end
                    <input className="input-field" type="time" required value={orgSettings.workingHoursEnd ?? ''} onChange={(event) => setOrgSettings((settings) => ({ ...settings, workingHoursEnd: event.target.value }))} />
                  </label>
                  <label>No-activity threshold (minutes)
                    <input className="input-field" type="number" min={10} max={180} step={5} required value={orgSettings.idleThresholdMinutes ?? 30} onChange={(event) => setOrgSettings((settings) => ({ ...settings, idleThresholdMinutes: Number(event.target.value) }))} />
                  </label>
                </div>
                <div className="settings-row">
                  <div><h3>Scheduled Break</h3><p>Time excluded from activity analysis, such as lunch.</p></div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={Boolean(orgSettings.breakStart && orgSettings.breakEnd)} onChange={(event) => setOrgSettings((settings) => ({ ...settings, ...(event.target.checked ? DEFAULT_BREAK : { breakStart: null, breakEnd: null }) }))} />
                    <span className="toggle-slider" />
                  </label>
                </div>
                {orgSettings.breakStart && orgSettings.breakEnd ? (
                  <div className="settings-grid">
                    <label>Break start
                      <input className="input-field" type="time" required value={orgSettings.breakStart} onChange={(event) => setOrgSettings((settings) => ({ ...settings, breakStart: event.target.value }))} />
                    </label>
                    <label>Break end
                      <input className="input-field" type="time" required value={orgSettings.breakEnd} onChange={(event) => setOrgSettings((settings) => ({ ...settings, breakEnd: event.target.value }))} />
                    </label>
                  </div>
                ) : null}

                <div className="settings-actions">
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
              <div className="settings-heading-content">
                <div className="stat-icon danger"><Shield size={18} /></div>
                <div>
                  <h2>Platform Administration</h2>
                  <p>Global settings affecting all tenants.</p>
                </div>
              </div>
            </div>

            {platformLoading ? (
              <div className="empty-state">Loading settings...</div>
            ) : (
              <form className="settings-form" onSubmit={handlePlatformSave}>
                <div className="settings-row danger-settings-row">
                  <div>
                    <div className="danger-settings-title"><AlertCircle size={16} /><h3>Global Weekly Reports</h3></div>
                    <p>Master switch for the weekly report scheduler.</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={platformSettings?.weeklyReportsEnabled ?? false} onChange={(event) => setPlatformSettings((settings) => settings ? { ...settings, weeklyReportsEnabled: event.target.checked } : null)} />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <div className="settings-actions">
                  <button type="submit" className="btn-primary" disabled={platformSaving}>{platformSaving ? 'Saving...' : <><Save size={16} /> Save Platform</>}</button>
                </div>
                {platformMessage && <div className={`notice ${platformMessage.toLowerCase().includes('fail') ? 'error-notice' : 'success-notice'}`}>{platformMessage}</div>}
              </form>
            )}
          </section>
        )}

        {canManageOrgProfile && (
          <section className="section-card settings-card">
            <div className="section-heading">
              <div className="settings-heading-content">
                <div className="stat-icon violet"><Bot size={18} /></div>
                <div>
                  <h2>AI Processing</h2>
                  <p>Connect your organization&apos;s OpenAI, Gemini, or Claude API key.</p>
                </div>
              </div>
            </div>
            <AiProviderPanel orgId={claims.orgId} />
          </section>
        )}
      </div>
    </div>
  );
};
