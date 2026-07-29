import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Layout } from './Layout';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  signInWithCustomToken: vi.fn(),
  toast: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('../api/client', () => ({
  api: { post: mocks.post },
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
    mocks.post.mockResolvedValue({
      data: { data: { customToken: 'owner-custom-token' } },
    });
    const user = userEvent.setup();
    render(<MemoryRouter><Layout /></MemoryRouter>);

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
