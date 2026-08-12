import { useEffect, useState } from 'react';
import { AlertCircle, Bot, Building2, KeyRound, Lock, Monitor, Moon, Save, Shield, Sun, User } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { api, getApiErrorMessage } from '../api/client';
import { auth } from '../config/firebase';
import { useAuth } from '../context/auth';
import { useTheme, type ThemeMode } from '../context/theme';
import type { AiOrganizationConfiguration, ApiResponse, OrganizationDetails, PlatformSettings } from '../types/api';

const defaultOrgSettings: OrganizationDetails['settings'] = {
  timezone: 'Asia/Kolkata',
  weeklyReportsEnabled: true,
  managerCanEditSalesMembers: true,
  defaultPhoneCountry: 'IN',
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
  const [aiConfiguration, setAiConfiguration] = useState<AiOrganizationConfiguration | null>(null);
  const [providerKey, setProviderKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'gemini' | 'anthropic'>('openai');
  const [aiBusy, setAiBusy] = useState('');
  const [aiMessage, setAiMessage] = useState('');

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
        const [orgResponse, aiResponse] = await Promise.all([
          api.get<ApiResponse<OrganizationDetails>>(`/orgs/${claims.orgId}`),
          api.get<ApiResponse<AiOrganizationConfiguration>>(`/orgs/${claims.orgId}/ai-settings`),
        ]);
        setOrgSettings({ ...defaultOrgSettings, ...orgResponse.data.data.settings });
        setAiConfiguration(aiResponse.data.data);
        setSelectedProvider(aiResponse.data.data.provider);
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

  const saveProviderKey = async () => {
    const apiKey = providerKey.trim();
    if (!apiKey || !claims.orgId) return;
    setAiBusy('save');
    setAiMessage('');
    try {
      const response = await api.put<ApiResponse<AiOrganizationConfiguration>>(`/orgs/${claims.orgId}/ai-provider/credential`, { provider: selectedProvider, apiKey });
      setAiConfiguration(response.data.data);
      setProviderKey('');
      setAiMessage(`${selectedProvider === 'openai' ? 'OpenAI' : selectedProvider === 'gemini' ? 'Google Gemini' : 'Anthropic Claude'} credential validated and saved.`);
    } catch (err) {
      setAiMessage(getApiErrorMessage(err, 'Failed to validate the AI provider credential.'));
    } finally {
      setAiBusy('');
    }
  };

  const testProvider = async () => {
    if (!claims.orgId) return;
    setAiBusy('test');
    setAiMessage('');
    try {
      await api.post(`/orgs/${claims.orgId}/ai-provider/test`);
      const response = await api.get<ApiResponse<AiOrganizationConfiguration>>(`/orgs/${claims.orgId}/ai-settings`);
      setAiConfiguration(response.data.data);
      setAiMessage('The connected AI provider is ready.');
    } catch (err) {
      setAiMessage(getApiErrorMessage(err, 'AI provider readiness check failed.'));
      const response = await api.get<ApiResponse<AiOrganizationConfiguration>>(`/orgs/${claims.orgId}/ai-settings`).catch(() => null);
      if (response) setAiConfiguration(response.data.data);
    } finally {
      setAiBusy('');
    }
  };

  const deleteProviderKey = async () => {
    if (!claims.orgId) return;
    setAiBusy('delete');
    setAiMessage('');
    try {
      await api.delete(`/orgs/${claims.orgId}/ai-provider/credential`);
      setAiConfiguration((current) => current ? {
        ...current,
        configured: false,
        maskedKey: null,
        validatedAt: null,
        updatedAt: null,
      } : current);
      setAiMessage('AI provider credential deleted. New and active AI processing is disabled until another key is connected.');
    } catch (err) {
      setAiMessage(getApiErrorMessage(err, 'Failed to delete the AI provider credential.'));
    } finally {
      setAiBusy('');
    }
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

        {claims.role === 'org_admin' && (
          <section className="section-card settings-card">
            <div className="section-heading">
              <div className="settings-heading-content">
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

        {claims.role === 'org_admin' && (
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

            {orgLoading || !aiConfiguration ? (
              <div className="empty-state">Loading AI settings...</div>
            ) : (
              <div className="settings-form">
                <div className="provider-card-grid">
                  <div className="provider-card">
                    <div className="provider-card-heading">
                      <KeyRound size={17} />
                      <div>
                        <h3>{aiConfiguration.provider === 'openai' ? 'OpenAI' : aiConfiguration.provider === 'gemini' ? 'Google Gemini' : 'Anthropic Claude'}</h3>
                        <p>{aiConfiguration.configured ? `Connected ${aiConfiguration.maskedKey}` : 'Not connected · AI processing is unavailable'}</p>
                      </div>
                    </div>
                    <div className="subtle-text">
                      Transcription: {aiConfiguration.models.transcription ?? 'Not supported'} · Intelligence: {aiConfiguration.models.intelligence}
                    </div>
                    <select className="input-field" aria-label="AI provider" value={selectedProvider} onChange={(event) => setSelectedProvider(event.target.value as typeof selectedProvider)}>
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="anthropic">Anthropic Claude</option>
                    </select>
                    <input type="password" autoComplete="new-password" className="input-field" placeholder={`Enter ${selectedProvider === 'openai' ? 'OpenAI' : selectedProvider === 'gemini' ? 'Gemini' : 'Claude'} API key`} value={providerKey} onChange={(event) => setProviderKey(event.target.value)} />
                    {selectedProvider === 'anthropic' && <small>Claude can analyze an existing transcript but cannot transcribe recording audio. Use OpenAI or Gemini for the complete recording workflow.</small>}
                    <div className="settings-actions">
                      <button type="button" className="secondary-button" disabled={!providerKey.trim() || aiBusy === 'save'} onClick={() => void saveProviderKey()}>{aiBusy === 'save' ? 'Validating...' : aiConfiguration.configured ? 'Validate & Replace' : 'Validate & Connect'}</button>
                      {aiConfiguration.configured && <button type="button" className="secondary-button" disabled={aiBusy === 'test'} onClick={() => void testProvider()}>{aiBusy === 'test' ? 'Testing...' : 'Test Connection'}</button>}
                      {aiConfiguration.configured && <button type="button" className="danger-button" disabled={aiBusy === 'delete'} onClick={() => void deleteProviderKey()}>{aiBusy === 'delete' ? 'Deleting...' : 'Delete Key'}</button>}
                    </div>
                    {aiConfiguration.validatedAt && <small>Last validated {new Date(aiConfiguration.validatedAt).toLocaleString()}</small>}
                    <small>The key is encrypted, write-only, and used only for this organization&apos;s processing.</small>
                  </div>
                </div>
                {aiMessage && <div className={`notice ${/(fail|error|required|rejected|invalid|unavailable)/i.test(aiMessage) ? 'error-notice' : 'success-notice'}`}>{aiMessage}</div>}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
