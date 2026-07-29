import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Platform } from './Platform';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  signInWithCustomToken: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('../api/client', () => ({
  api: { get: mocks.get, post: mocks.post, patch: mocks.patch },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock('../config/firebase', () => ({ auth: { currentUser: { uid: 'owner-1' } } }));
vi.mock('firebase/auth', () => ({
  signInWithCustomToken: mocks.signInWithCustomToken,
}));
vi.mock('../context/auth', () => ({
  useAuth: () => ({
    claims: { orgId: '', role: 'platform_owner' },
  }),
}));
vi.mock('../context/feedback', () => ({
  useFeedback: () => ({
    toast: mocks.toast,
    confirm: mocks.confirm,
    requestFields: vi.fn(),
    requestText: vi.fn(),
  }),
}));

const organization = {
  id: 'org-1',
  name: 'Acme Sales',
  plan: 'pro',
  status: 'active',
  ownerUserId: 'admin-1',
  createdAt: '2026-07-20T00:00:00.000Z',
  updatedAt: '2026-07-20T00:00:00.000Z',
  admin: {
    id: 'admin-1',
    name: 'Asha Admin',
    email: 'asha@example.com',
    role: 'org_admin',
    status: 'active',
  },
};

const users = [
  {
    id: 'admin-1',
    name: 'Asha Admin',
    email: 'asha@example.com',
    role: 'org_admin',
    status: 'active',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'disabled-1',
    name: 'Disabled User',
    email: 'disabled@example.com',
    role: 'manager',
    status: 'disabled',
    createdAt: '',
    updatedAt: '',
  },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Platform impersonation', () => {
  it('requires an audited reason and signs in with the returned target token', async () => {
    mocks.get.mockImplementation((url: string) => Promise.resolve({
      data: { data: url === '/admin/organizations' ? [organization] : users },
    }));
    mocks.post.mockResolvedValue({
      data: {
        data: {
          customToken: 'target-custom-token',
          user: users[0],
          session: {
            id: 'session-1',
            targetUid: 'admin-1',
            targetEmail: 'asha@example.com',
            targetName: 'Asha Admin',
            targetRole: 'org_admin',
            orgId: 'org-1',
            orgName: 'Acme Sales',
            reason: 'Investigating ticket 1234',
          },
        },
      },
    });

    const user = userEvent.setup();
    render(<MemoryRouter><Platform /></MemoryRouter>);

    await screen.findByText('Acme Sales');
    await user.click(screen.getByRole('button', { name: 'Actions for Acme Sales' }));
    await user.click(screen.getByRole('button', { name: 'Login as user' }));

    const dialog = await screen.findByRole('dialog', { name: 'Login as a user' });
    expect(dialog).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Disabled User/ })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Required support reason'), 'Investigating ticket 1234');
    await user.click(screen.getByRole('button', { name: 'Confirm and login' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith(
      '/admin/impersonate/admin-1',
      { reason: 'Investigating ticket 1234' },
    ));
    expect(mocks.signInWithCustomToken).toHaveBeenCalledWith(
      expect.anything(),
      'target-custom-token',
    );
  });
});
