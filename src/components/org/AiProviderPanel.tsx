import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { api, getApiErrorMessage } from '../../api/client';
import type { AiOrganizationConfiguration, ApiResponse } from '../../types/api';

type Provider = AiOrganizationConfiguration['provider'];

const providerLabel = (provider: Provider) => (
  provider === 'openai' ? 'OpenAI' : provider === 'gemini' ? 'Google Gemini' : 'Anthropic Claude'
);

/** Connect, test, or delete an organization's AI provider key. */
export const AiProviderPanel = ({ orgId }: { orgId: string }) => {
  const [aiConfiguration, setAiConfiguration] = useState<AiOrganizationConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [providerKey, setProviderKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<Provider>('openai');
  const [aiBusy, setAiBusy] = useState('');
  const [aiMessage, setAiMessage] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get<ApiResponse<AiOrganizationConfiguration>>(`/orgs/${orgId}/ai-settings`)
      .then((response) => {
        if (!active) return;
        setAiConfiguration(response.data.data);
        setSelectedProvider(response.data.data.provider);
      })
      .catch((err) => {
        if (active) setAiMessage(getApiErrorMessage(err, 'Failed to load AI settings.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [orgId]);

  const saveProviderKey = async () => {
    const apiKey = providerKey.trim();
    if (!apiKey) return;
    setAiBusy('save');
    setAiMessage('');
    try {
      const response = await api.put<ApiResponse<AiOrganizationConfiguration>>(`/orgs/${orgId}/ai-provider/credential`, { provider: selectedProvider, apiKey });
      setAiConfiguration(response.data.data);
      setProviderKey('');
      setAiMessage(`${providerLabel(selectedProvider)} credential validated and saved.`);
    } catch (err) {
      setAiMessage(getApiErrorMessage(err, 'Failed to validate the AI provider credential.'));
    } finally {
      setAiBusy('');
    }
  };

  const testProvider = async () => {
    setAiBusy('test');
    setAiMessage('');
    try {
      await api.post(`/orgs/${orgId}/ai-provider/test`);
      const response = await api.get<ApiResponse<AiOrganizationConfiguration>>(`/orgs/${orgId}/ai-settings`);
      setAiConfiguration(response.data.data);
      setAiMessage('The connected AI provider is ready.');
    } catch (err) {
      setAiMessage(getApiErrorMessage(err, 'AI provider readiness check failed.'));
      const response = await api.get<ApiResponse<AiOrganizationConfiguration>>(`/orgs/${orgId}/ai-settings`).catch(() => null);
      if (response) setAiConfiguration(response.data.data);
    } finally {
      setAiBusy('');
    }
  };

  const deleteProviderKey = async () => {
    setAiBusy('delete');
    setAiMessage('');
    try {
      await api.delete(`/orgs/${orgId}/ai-provider/credential`);
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

  const messageNotice = aiMessage && <div className={`notice ${/(fail|error|required|rejected|invalid|unavailable)/i.test(aiMessage) ? 'error-notice' : 'success-notice'}`}>{aiMessage}</div>;

  if (loading) return <div className="empty-state">Loading AI settings...</div>;
  if (!aiConfiguration) return <div className="settings-form">{messageNotice}</div>;

  return (
    <div className="settings-form">
      <div className="provider-card-grid">
        <div className="provider-card">
          <div className="provider-card-heading">
            <KeyRound size={17} />
            <div>
              <h3>{providerLabel(aiConfiguration.provider)}</h3>
              <p>{aiConfiguration.configured ? `Connected ${aiConfiguration.maskedKey}` : 'Not connected · AI processing is unavailable'}</p>
            </div>
          </div>
          <div className="subtle-text">
            Transcription: {aiConfiguration.models.transcription ?? 'Not supported'} · Intelligence: {aiConfiguration.models.intelligence}
          </div>
          <select className="input-field" aria-label="AI provider" value={selectedProvider} onChange={(event) => setSelectedProvider(event.target.value as Provider)}>
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
      {messageNotice}
    </div>
  );
};
