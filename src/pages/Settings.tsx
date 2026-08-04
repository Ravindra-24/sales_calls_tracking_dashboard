import { useEffect, useState } from 'react';
import { AlertCircle, Bot, Building2, KeyRound, Lock, Monitor, Moon, Save, Shield, Sun, User } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { api, getApiErrorMessage } from '../api/client';
import { auth } from '../config/firebase';
import { useAuth } from '../context/auth';
import { useTheme, type ThemeMode } from '../context/theme';
import type { AiPlatformConfiguration, ApiResponse, OrganizationDetails, PlatformSettings } from '../types/api';

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
  const [aiConfiguration, setAiConfiguration] = useState<AiPlatformConfiguration | null>(null);
  const [providerKeys, setProviderKeys] = useState({ openai: '', assemblyai: '' });
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
        const [settingsResponse, aiResponse] = await Promise.all([
          api.get<ApiResponse<PlatformSettings>>('/admin/settings'),
          api.get<ApiResponse<AiPlatformConfiguration>>('/admin/ai-settings'),
        ]);
        setPlatformSettings(settingsResponse.data.data);
        setAiConfiguration(aiResponse.data.data);
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

  const saveAiRouting = async () => {
    if (!aiConfiguration) return;
    setAiBusy('routing');
    setAiMessage('');
    try {
      const response = await api.patch<ApiResponse<AiPlatformConfiguration['settings']>>('/admin/ai-settings', {
        transcriptionProvider: aiConfiguration.settings.transcriptionProvider,
        intelligenceProvider: aiConfiguration.settings.intelligenceProvider,
      });
      setAiConfiguration((current) => current ? { ...current, settings: response.data.data } : current);
      setAiMessage('AI routing updated. New analysis jobs will use this configuration.');
    } catch (err) {
      setAiMessage(getApiErrorMessage(err, 'Failed to update AI routing. Sign in again if recent authentication is required.'));
    } finally {
      setAiBusy('');
    }
  };

  const saveProviderKey = async (provider: 'openai' | 'assemblyai') => {
    const apiKey = providerKeys[provider].trim();
    if (!apiKey) return;
    setAiBusy(provider);
    setAiMessage('');
    try {
      const response = await api.put<ApiResponse<AiPlatformConfiguration['providers'][typeof provider]>>(`/admin/ai-providers/${provider}/credential`, { apiKey });
      setAiConfiguration((current) => current ? {
        ...current,
        providers: { ...current.providers, [provider]: response.data.data },
      } : current);
      setProviderKeys((current) => ({ ...current, [provider]: '' }));
      setAiMessage(`${provider} credential validated and saved.`);
    } catch (err) {
      setAiMessage(getApiErrorMessage(err, `Failed to validate the ${provider} credential.`));
    } finally {
      setAiBusy('');
    }
  };

  const testProvider = async (provider: 'google' | 'openai' | 'assemblyai') => {
    setAiBusy(`test-${provider}`);
    setAiMessage('');
    try {
      await api.post(`/admin/ai-providers/${provider}/test`);
      setAiMessage(`${provider} is ready.`);
    } catch (err) {
      setAiMessage(getApiErrorMessage(err, `${provider} readiness check failed.`));
    } finally {
      setAiBusy('');
    }
  };

  const deleteProviderKey = async (provider: 'openai' | 'assemblyai') => {
    setAiBusy(`delete-${provider}`);
    setAiMessage('');
    try {
      await api.delete(`/admin/ai-providers/${provider}/credential`);
      setAiConfiguration((current) => current ? {
        ...current,
        providers: {
          ...current.providers,
          [provider]: { configured: false, maskedKey: null, validatedAt: null, updatedAt: null },
        },
      } : current);
      setAiMessage(`${provider} credential deleted. Jobs routed there will fall back to Google.`);
    } catch (err) {
      setAiMessage(getApiErrorMessage(err, `Failed to delete the ${provider} credential.`));
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

        {claims.role === 'platform_owner' && (
          <section className="section-card settings-card">
            <div className="section-heading">
              <div className="settings-heading-content">
                <div className="stat-icon violet"><Bot size={18} /></div>
                <div>
                  <h2>AI Call Providers</h2>
                  <p>Select independent transcription and intelligence providers. Google is always the fallback.</p>
                </div>
              </div>
            </div>

            {platformLoading || !aiConfiguration ? (
              <div className="empty-state">Loading AI provider settings...</div>
            ) : (
              <div className="settings-form">
                <div className="settings-grid">
                  <label>Transcription Provider
                    <select className="input-field" value={aiConfiguration.settings.transcriptionProvider} onChange={(event) => setAiConfiguration((current) => current ? { ...current, settings: { ...current.settings, transcriptionProvider: event.target.value as AiPlatformConfiguration['settings']['transcriptionProvider'] } } : current)}>
                      <option value="google">Google · {aiConfiguration.models.google.transcription}</option>
                      <option value="openai">OpenAI · {aiConfiguration.models.openai.transcription}</option>
                      <option value="assemblyai">AssemblyAI · {aiConfiguration.models.assemblyai.transcription}</option>
                    </select>
                  </label>
                  <label>Intelligence Provider
                    <select className="input-field" value={aiConfiguration.settings.intelligenceProvider} onChange={(event) => setAiConfiguration((current) => current ? { ...current, settings: { ...current.settings, intelligenceProvider: event.target.value as AiPlatformConfiguration['settings']['intelligenceProvider'] } } : current)}>
                      <option value="google">Google · {aiConfiguration.models.google.intelligence}</option>
                      <option value="openai">OpenAI · {aiConfiguration.models.openai.intelligence}</option>
                    </select>
                  </label>
                </div>
                <div className="settings-actions">
                  <button type="button" className="btn-primary" disabled={aiBusy === 'routing'} onClick={() => void saveAiRouting()}><Save size={16} /> {aiBusy === 'routing' ? 'Saving...' : 'Save Routing'}</button>
                  <span className="subtle-text">Fallback: Google · configuration v{aiConfiguration.settings.configVersion}</span>
                </div>

                <div className="provider-card-grid">
                  {(['google', 'openai', 'assemblyai'] as const).map((provider) => {
                    const status = aiConfiguration.providers[provider];
                    const isManaged = provider === 'google';
                    return (
                      <div className="provider-card" key={provider}>
                        <div className="provider-card-heading"><KeyRound size={17} /><div><h3>{provider === 'assemblyai' ? 'AssemblyAI' : provider === 'openai' ? 'OpenAI' : 'Google'}</h3><p>{status.configured ? `Ready ${status.maskedKey || '(server managed)'}` : 'Credential not configured'}</p></div></div>
                        {!isManaged && <input type="password" autoComplete="new-password" className="input-field" placeholder={`New ${provider} API key`} value={providerKeys[provider]} onChange={(event) => setProviderKeys((current) => ({ ...current, [provider]: event.target.value }))} />}
                        <div className="settings-actions">
                          {!isManaged && <button type="button" className="secondary-button" disabled={!providerKeys[provider].trim() || aiBusy === provider} onClick={() => void saveProviderKey(provider)}>{aiBusy === provider ? 'Validating...' : 'Validate & Save'}</button>}
                          <button type="button" className="secondary-button" disabled={aiBusy === `test-${provider}`} onClick={() => void testProvider(provider)}>{aiBusy === `test-${provider}` ? 'Testing...' : 'Test'}</button>
                          {!isManaged && status.configured && <button type="button" className="danger-button" disabled={aiBusy === `delete-${provider}`} onClick={() => void deleteProviderKey(provider)}>{aiBusy === `delete-${provider}` ? 'Deleting...' : 'Delete'}</button>}
                        </div>
                        {status.validatedAt && <small>Last validated {new Date(status.validatedAt).toLocaleString()}</small>}
                      </div>
                    );
                  })}
                </div>
                {aiMessage && <div className={`notice ${/(fail|error|required)/i.test(aiMessage) ? 'error-notice' : 'success-notice'}`}>{aiMessage}</div>}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
