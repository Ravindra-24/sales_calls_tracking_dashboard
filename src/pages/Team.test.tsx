import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Team } from './Team';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  authState: {
    user: { uid: 'admin-1', email: 'admin@example.com' },
    claims: { orgId: 'org-1', role: 'org_admin' },
  },
}));

vi.mock('../api/client', () => ({
  api: { get: mocks.get, post: mocks.post, patch: mocks.patch },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock('../context/auth', () => ({ useAuth: () => mocks.authState }));

const member = (overrides: Record<string, unknown>) => ({
  email: `${overrides.id}@example.com`,
  status: 'active',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
});

const members = [
  member({ id: 'admin-1', name: 'Asha Admin', role: 'org_admin' }),
  member({ id: 'mgr-1', name: 'Meera Manager', role: 'manager', managerVisibility: 'team' }),
  member({ id: 'mgr-2', name: 'Omar Manager', role: 'manager' }),
  member({ id: 'rep-1', name: 'Ravi Rep', role: 'sales_member', managerId: 'mgr-1' }),
  member({ id: 'rep-2', name: 'Sana Rep', role: 'sales_member' }),
];

const mockLoads = () => {
  mocks.get.mockImplementation((url: string) => Promise.resolve({
    data: { data: url.endsWith('/users') ? members : url.endsWith('/invites') ? [] : { settings: {} } },
  }));
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.authState.user = { uid: 'admin-1', email: 'admin@example.com' };
  mocks.authState.claims = { orgId: 'org-1', role: 'org_admin' };
});

describe('team hierarchy', () => {
  it('shows reporting lines and warns admins about unassigned reps', async () => {
    mockLoads();
    render(<Team />);

    const raviManager = await screen.findByLabelText('Manager for Ravi Rep');
    expect(raviManager).toHaveValue('mgr-1');
    expect(screen.getByLabelText('Manager for Sana Rep')).toHaveValue('unassigned');
    expect(screen.getByText(/1 active sales member has no manager/)).toBeInTheDocument();
    // Legacy managers without a setting read as organization-wide.
    expect(screen.getByLabelText('What Omar Manager can see')).toHaveValue('all');
    expect(screen.getByLabelText('What Meera Manager can see')).toHaveValue('team');
  });

  it('reassigns a rep inline', async () => {
    mockLoads();
    mocks.patch.mockResolvedValue({ data: { data: {} } });
    const user = userEvent.setup();
    render(<Team />);

    await user.selectOptions(await screen.findByLabelText('Manager for Sana Rep'), 'mgr-2');

    await waitFor(() => expect(mocks.patch).toHaveBeenCalledWith('/orgs/users/rep-2', { managerId: 'mgr-2' }));
    expect(await screen.findByText('Sana Rep now reports to Omar Manager.')).toBeInTheDocument();
  });

  it('does not offer a manager their own reports as a manager', async () => {
    mockLoads();
    render(<Team />);

    const options = [...(await screen.findByLabelText('Manager for Meera Manager')).querySelectorAll('option')]
      .map((option) => option.textContent);
    expect(options).toEqual(['No manager', 'Omar Manager']);
  });

  it('moves selected members in bulk', async () => {
    mockLoads();
    mocks.patch.mockResolvedValue({ data: { data: { moved: 2 } } });
    const user = userEvent.setup();
    render(<Team />);

    await user.click(await screen.findByLabelText('Select Ravi Rep'));
    await user.click(screen.getByLabelText('Select Sana Rep'));
    await user.selectOptions(screen.getByLabelText('Move selected members to'), 'mgr-2');
    await user.click(screen.getByRole('button', { name: 'Move' }));

    await waitFor(() => expect(mocks.patch).toHaveBeenCalledWith('/orgs/org-1/reporting-lines', {
      userIds: ['rep-1', 'rep-2'],
      managerId: 'mgr-2',
    }));
    expect(await screen.findByText('2 members moved to Omar Manager.')).toBeInTheDocument();
  });

  it('sends the chosen manager and visibility with an admin invite', async () => {
    mockLoads();
    mocks.post.mockResolvedValue({ data: { data: { email: 'new@example.com', expiresAt: '2026-11-20T00:00:00.000Z', token: 't' } } });
    const user = userEvent.setup();
    render(<Team />);

    await user.click(await screen.findByRole('button', { name: /Invite member/ }));
    await user.type(screen.getByPlaceholderText('sales@company.com'), 'new@example.com');
    await user.selectOptions(screen.getByLabelText('Role'), 'manager');
    await user.selectOptions(screen.getByLabelText('Reports to'), 'mgr-1');
    await user.selectOptions(screen.getByLabelText('Can see'), 'all');
    await user.click(screen.getByRole('button', { name: 'Create invitation' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/orgs/org-1/invites', expect.objectContaining({
      email: 'new@example.com',
      role: 'manager',
      managerId: 'mgr-1',
      managerVisibility: 'all',
    })));
  });

  it('gives managers a read-only view without bulk moves', async () => {
    mocks.authState.user = { uid: 'mgr-1', email: 'mgr-1@example.com' };
    mocks.authState.claims = { orgId: 'org-1', role: 'manager' };
    mockLoads();
    render(<Team />);

    expect(await screen.findByText(/Your team: the people who report to you/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Manager for Ravi Rep')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Select Ravi Rep')).not.toBeInTheDocument();
    expect(screen.getAllByText('Meera Manager').length).toBeGreaterThan(0);
  });
});
