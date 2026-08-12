import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Settings } from './Settings';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  authState: {
    user: { uid: 'admin-1', email: 'admin@example.com', displayName: 'Admin' },
    claims: { orgId: 'org-1', role: 'org_admin' },
  },
}));

vi.mock('../api/client', () => ({
  api: {
    get: mocks.get,
    put: mocks.put,
    post: mocks.post,
    patch: mocks.patch,
    delete: mocks.delete,
  },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock('../config/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({ sendPasswordResetEmail: vi.fn() }));
vi.mock('../context/auth', () => ({ useAuth: () => mocks.authState }));
vi.mock('../context/theme', () => ({
  useTheme: () => ({ mode: 'system', setMode: vi.fn() }),
}));

const organization = {
  id: 'org-1',
  name: 'Acme',
  plan: 'max',
  status: 'active',
  ownerUserId: 'admin-1',
  settings: { timezone: 'Asia/Kolkata' },
  createdAt: null,
  updatedAt: null,
};

const aiConfiguration = {
  provider: 'openai',
  configured: false,
  maskedKey: null,
  validatedAt: null,
  updatedAt: null,
  models: {
    transcription: 'gpt-4o-transcribe-diarize',
    intelligence: 'gpt-5.6-luna',
  },
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.authState.claims = { orgId: 'org-1', role: 'org_admin' };
});

describe('organization AI settings', () => {
  it('loads and connects an organization-owned OpenAI key', async () => {
    mocks.get.mockImplementation((url: string) => Promise.resolve({
      data: { data: url.endsWith('/ai-settings') ? aiConfiguration : url === '/auth/me' ? {} : organization },
    }));
    mocks.put.mockResolvedValue({
      data: { data: { ...aiConfiguration, configured: true, maskedKey: '••••1234' } },
    });
    const user = userEvent.setup();
    render(<Settings />);

    expect(await screen.findByText(/AI processing is unavailable/i)).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Enter your OpenAI API key'), 'sk-organization-test-key');
    await user.click(screen.getByRole('button', { name: 'Validate & Connect' }));

    await waitFor(() => expect(mocks.put).toHaveBeenCalledWith(
      '/orgs/org-1/ai-provider/credential',
      { apiKey: 'sk-organization-test-key' },
    ));
    expect(await screen.findByText(/Connected ••••1234/)).toBeInTheDocument();
  });

  it('does not expose tenant AI controls to the platform owner', async () => {
    mocks.authState.claims = { orgId: '', role: 'platform_owner' };
    mocks.get.mockImplementation((url: string) => Promise.resolve({
      data: { data: url === '/admin/settings' ? { weeklyReportsEnabled: true } : {} },
    }));
    render(<Settings />);

    expect(await screen.findByText('Platform Administration')).toBeInTheDocument();
    expect(screen.queryByText('AI Processing')).not.toBeInTheDocument();
    expect(mocks.get).not.toHaveBeenCalledWith(expect.stringContaining('/ai-settings'));
  });
});
