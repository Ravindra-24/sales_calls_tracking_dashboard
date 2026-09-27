import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Layout } from './Layout';
import { announceOrgBranding } from '../utils/orgBranding';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  signInWithCustomToken: vi.fn(),
  toast: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('../api/client', () => ({
  api: { get: mocks.get, post: mocks.post },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock('../config/firebase', () => ({
  auth: { signOut: mocks.signOut },
}));
vi.mock('firebase/auth', () => ({
  signInWithCustomToken: mocks.signInWithCustomToken,
}));
vi.mock('../context/auth', () => ({
  useAuth: () => ({
    user: { email: 'asha@example.com', displayName: 'Asha Admin' },
    claims: {
      orgId: 'org-1',
      role: 'org_admin',
      impersonatorUid: 'owner-1',
      impersonationSessionId: 'session-1',
      impersonationReason: 'Investigating ticket 1234',
    },
  }),
}));
vi.mock('../context/feedback', () => ({
  useFeedback: () => ({ toast: mocks.toast }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Layout impersonation banner', () => {
  it('keeps impersonation visible and restores the platform owner through the stop endpoint', async () => {
    mocks.get.mockResolvedValue({ data: { data: { organization: { id: 'org-1', name: 'Acme', logoUrl: null } } } });
    mocks.post.mockResolvedValue({
      data: { data: { customToken: 'owner-custom-token' } },
    });
    const user = userEvent.setup();
    render(<MemoryRouter><Layout /></MemoryRouter>);

    expect(screen.getByRole('group', { name: 'Overview navigation' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Sales activity navigation' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Team & field navigation' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Manage navigation' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Platform administration navigation' })).not.toBeInTheDocument();
    expect(screen.getByText('Viewing as Asha Admin')).toBeInTheDocument();
    expect(screen.getByText(/Investigating ticket 1234/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out completely' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Return to platform account' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/admin/impersonation/stop'));
    expect(mocks.signInWithCustomToken).toHaveBeenCalledWith(
      expect.anything(),
      'owner-custom-token',
    );
  });
});

describe('Layout organization branding', () => {
  it('keeps Smartly Manage branding until the organization uploads a logo', async () => {
    mocks.get.mockResolvedValue({ data: { data: { organization: { id: 'org-1', name: 'Acme', logoUrl: null } } } });
    render(<MemoryRouter><Layout /></MemoryRouter>);

    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/auth/me'));
    expect(screen.getByRole('heading', { name: 'Smartly Manage' })).toBeInTheDocument();
    expect(screen.queryByText('Powered by Smartly Manage')).not.toBeInTheDocument();
  });

  it('shows the organization logo and name with a powered-by line', async () => {
    mocks.get.mockResolvedValue({ data: { data: { organization: { id: 'org-1', name: 'Acme Field Sales', logoUrl: 'data:image/webp;base64,AAAA' } } } });
    render(<MemoryRouter><Layout /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Acme Field Sales' })).toBeInTheDocument();
    expect(screen.getAllByText('Powered by Smartly Manage')).toHaveLength(2);
    expect(screen.queryByRole('heading', { name: 'Smartly Manage' })).not.toBeInTheDocument();
  });

  it('updates the sidebar when the organization profile is saved', async () => {
    mocks.get.mockResolvedValue({ data: { data: { organization: { id: 'org-1', name: 'Acme', logoUrl: null } } } });
    render(<MemoryRouter><Layout /></MemoryRouter>);
    await waitFor(() => expect(mocks.get).toHaveBeenCalled());

    act(() => announceOrgBranding({ name: 'Acme Rebrand', logoUrl: 'data:image/webp;base64,BBBB' }));
    expect(await screen.findByRole('heading', { name: 'Acme Rebrand' })).toBeInTheDocument();
  });
});
