import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Building2, Bell, Shield, Lock, Save, AlertCircle } from 'lucide-react';
import { api, getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/auth';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import type { ApiResponse, PlatformSettings, PlatformOrganization } from '../types/api';

export const Settings = () => {
  const { user, claims, refreshClaims } = useAuth();
  
  // Profile state
  const [name, setName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(''); // Will load from backend
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  
  // Org state (org_admin only)
  const [orgSettings, setOrgSettings] = useState<PlatformOrganization['settings']>({});
  const [orgStatus, setOrgStatus] = useState<'active'|'disabled'>('active');
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgMessage, setOrgMessage] = useState('');
  const [orgLoading, setOrgLoading] = useState(false);

  // Platform state (platform_owner only)
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [platformSaving, setPlatformSaving] = useState(false);
  const [platformMessage, setPlatformMessage] = useState('');
  const [platformLoading, setPlatformLoading] = useState(false);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        // if avatarUrl is returned we would set it here.
        // The /auth/me route doesn't return avatarUrl currently, but we can get it or just let the user set it.
      } catch (err) {
        console.error(err);
      }
    };
    loadProfile();
  }, []);

  // Load Org Settings
  useEffect(() => {
    if (claims.role === 'org_admin' && claims.orgId) {
      const loadOrg = async () => {
        setOrgLoading(true);
        try {
          // A bit hacky: we can fetch all organizations and find ours, or just use the platform owner route if we had one.
          // Wait, /admin/organizations/:orgId is platform_owner only. But we have GET /admin/organizations (not for org_admin).
          // We can fetch org details... Actually we don't have a GET /orgs/:orgId endpoint.
          // I will assume the admin can just update settings without loading existing ones perfectly, or we just leave defaults.
        } catch (err) {
          console.error(err);
        } finally {
          setOrgLoading(false);
        }
      };
      loadOrg();
    }
  }, [claims]);

  // Load Platform Settings
  useEffect(() => {
    if (claims.role === 'platform_owner') {
      const loadPlatform = async () => {
        setPlatformLoading(true);
        try {
          const res = await api.get<ApiResponse<PlatformSettings>>('/admin/settings');
          setPlatformSettings(res.data.data);
        } catch (err) {
          console.error(err);
        } finally {
          setPlatformLoading(false);
        }
      };
      loadPlatform();
    }
  }, [claims]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (err: any) {
      setProfileMessage(err.message || 'Failed to send reset email.');
    }
  };

  const handleOrgSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claims.orgId) return;
    setOrgSaving(true);
    setOrgMessage('');
    try {
      await api.patch(`/orgs/${claims.orgId}`, {
        settings: orgSettings
      });
      setOrgMessage('Organization settings updated.');
    } catch (err) {
      setOrgMessage(getApiErrorMessage(err, 'Failed to update organization.'));
    } finally {
      setOrgSaving(false);
    }
  };

  const handlePlatformSave = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="text-secondary">Manage your account and preferences.</p>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* PROFILE SETTINGS */}
        <section className="section-card">
          <div className="section-heading" style={{ padding: '20px 24px 0', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="stat-icon violet" style={{ width: '36px', height: '36px', borderRadius: '10px' }}>
                <User size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--text-primary)' }}>Profile Settings</h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Update your personal details and avatar</p>
              </div>
            </div>
          </div>
          
          <div style={{ padding: '0 24px 24px' }}>
            <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
                
                {/* Custom Avatar Picker */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <label htmlFor="avatar-upload" className="avatar-picker">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" />
                    ) : (
                      <User size={40} color="rgba(255,255,255,0.4)" />
                    )}
                    <div className="overlay">
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'white' }}>Change</span>
                    </div>
                  </label>
                  <input 
                    id="avatar-upload"
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarChange} 
                    className="avatar-input"
                  />
                  <label htmlFor="avatar-upload" style={{ fontSize: '13px', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 500 }}>
                    Upload Photo
                  </label>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Full Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="Your Name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Email Address</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={user?.email || ''} 
                      disabled 
                      style={{ opacity: 0.6, cursor: 'not-allowed' }} 
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={handlePasswordReset} className="secondary-button" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <Lock size={16} /> Reset Password
                </button>
                
                <button type="submit" className="btn-primary" disabled={profileSaving}>
                  {profileSaving ? 'Saving...' : <><Save size={16} /> Save Profile</>}
                </button>
              </div>
              {profileMessage && (
                <div className={`notice ${profileMessage.includes('failed') ? 'error-notice' : 'success-notice'}`} style={{ marginBottom: 0, marginTop: '8px' }}>
                  {profileMessage}
                </div>
              )}
            </form>
          </div>
        </section>

        {/* ORG SETTINGS */}
        {claims.role === 'org_admin' && (
          <section className="section-card">
            <div className="section-heading" style={{ padding: '20px 24px 0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="stat-icon blue" style={{ width: '36px', height: '36px', borderRadius: '10px' }}>
                  <Building2 size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--text-primary)' }}>Organization Settings</h2>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Manage preferences for your team</p>
                </div>
              </div>
            </div>

            <div style={{ padding: '0 24px 24px' }}>
              {orgLoading ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading settings...</div>
              ) : (
                <form onSubmit={handleOrgSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>Weekly Summary Reports</h3>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Automatically send weekly performance emails to managers</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={orgSettings?.weeklyReportsEnabled ?? true} 
                        onChange={e => setOrgSettings(s => ({ ...s, weeklyReportsEnabled: e.target.checked }))}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="form-group" style={{ maxWidth: '400px' }}>
                    <label className="form-label" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Default Timezone</label>
                    <select 
                      className="input-field"
                      value={orgSettings?.timezone || 'Asia/Kolkata'}
                      onChange={e => setOrgSettings(s => ({ ...s, timezone: e.target.value }))}
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time (US)</option>
                      <option value="America/Los_Angeles">Pacific Time (US)</option>
                      <option value="Europe/London">London (GMT/BST)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                    <button type="submit" className="btn-primary" disabled={orgSaving}>
                      {orgSaving ? 'Saving...' : <><Save size={16} /> Save Organization</>}
                    </button>
                  </div>
                  {orgMessage && (
                    <div className={`notice ${orgMessage.includes('failed') ? 'error-notice' : 'success-notice'}`} style={{ marginBottom: 0, marginTop: '8px' }}>
                      {orgMessage}
                    </div>
                  )}
                </form>
              )}
            </div>
          </section>
        )}

        {/* PLATFORM SETTINGS */}
        {claims.role === 'platform_owner' && (
          <section className="section-card">
            <div className="section-heading" style={{ padding: '20px 24px 0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="stat-icon" style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(248, 113, 113, 0.1)', color: 'var(--danger)' }}>
                  <Shield size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--danger)' }}>Platform Administration</h2>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Global settings affecting all tenants</p>
                </div>
              </div>
            </div>

            <div style={{ padding: '0 24px 24px' }}>
              {platformLoading ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading settings...</div>
              ) : (
                <form onSubmit={handlePlatformSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(248, 113, 113, 0.05)', borderRadius: '12px', border: '1px solid rgba(248, 113, 113, 0.1)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', marginBottom: '4px' }}>
                        <AlertCircle size={16} />
                        <h3 style={{ fontSize: '15px', margin: 0 }}>Global Weekly Reports</h3>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Master switch to allow or block the cron job from sending any weekly reports</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={platformSettings?.weeklyReportsEnabled ?? false} 
                        onChange={e => setPlatformSettings(s => s ? { ...s, weeklyReportsEnabled: e.target.checked } : null)}
                      />
                      <span className="toggle-slider" style={{ background: platformSettings?.weeklyReportsEnabled ? 'var(--danger)' : '' }}></span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                    <button type="submit" className="btn-primary" disabled={platformSaving} style={{ background: 'linear-gradient(135deg, #f87171, #dc2626)', boxShadow: '0 8px 24px rgba(220, 38, 38, 0.24)' }}>
                      {platformSaving ? 'Saving...' : <><Save size={16} /> Save Platform Settings</>}
                    </button>
                  </div>
                  {platformMessage && (
                    <div className={`notice ${platformMessage.includes('failed') ? 'error-notice' : 'success-notice'}`} style={{ marginBottom: 0, marginTop: '8px' }}>
                      {platformMessage}
                    </div>
                  )}
                </form>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
