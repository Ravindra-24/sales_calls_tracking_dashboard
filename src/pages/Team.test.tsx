import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Team } from './Team';

const managerUser = { uid: 'manager-1', email: 'manager@example.com', displayName: 'Manager' };

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  confirm: vi.fn(),
  auth: {
    user: { uid: 'manager-1', email: 'manager@example.com', displayName: 'Manager' },
    claims: { orgId: 'org-1', role: 'manager' as 'manager' | 'org_admin' },
  },
}));

vi.mock('../api/client', () => ({
  api: {
    get: mocks.get,
    delete: mocks.delete,
    patch: mocks.patch,
    post: vi.fn(),
    put: mocks.put,
  },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock('../context/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('../context/feedback', () => ({ useFeedback: () => ({ confirm: mocks.confirm, toast: vi.fn() }) }));

const members = [
  { id: 'manager-1', name: 'Manager', email: 'manager@example.com', role: 'manager', status: 'active', createdAt: '', updatedAt: '' },
  { id: 'assigned-1', name: 'Assigned Rep', email: 'assigned@example.com', role: 'sales_member', status: 'active', managerId: 'manager-1', createdAt: '', updatedAt: '' },
  { id: 'unassigned-1', name: 'Unassigned Rep', email: 'unassigned@example.com', role: 'sales_member', status: 'active', managerId: null, createdAt: '', updatedAt: '' },
];

afterEach(() => {
  cleanup();
  mocks.get.mockReset();
  mocks.delete.mockReset();
  mocks.patch.mockReset();
  mocks.put.mockReset();
  mocks.confirm.mockReset();
  mocks.auth = { user: managerUser, claims: { orgId: 'org-1', role: 'manager' } };
});

describe('Team manager access', () => {
  it('hides unassigned members and lets a manager remove an assigned member', async () => {
    let currentMembers = members;
    mocks.get.mockImplementation((url: string) => {
      if (url.endsWith('/users')) return Promise.resolve({ data: { data: currentMembers } });
      if (url.includes('/invites')) return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: { settings: { managerCanEditSalesMembers: true } } } });
    });
    mocks.delete.mockImplementation(() => {
      currentMembers = members.filter((member) => member.id !== 'assigned-1');
      return Promise.resolve({ data: { success: true } });
    });

    render(<Team />);

    expect(await screen.findByText('Assigned Rep')).toBeInTheDocument();
    expect(screen.queryByText('Unassigned Rep')).not.toBeInTheDocument();

    const userRequestsBeforeRefresh = mocks.get.mock.calls.filter(([url]) => String(url).endsWith('/users')).length;
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(
      mocks.get.mock.calls.filter(([url]) => String(url).endsWith('/users')).length,
    ).toBeGreaterThan(userRequestsBeforeRefresh));

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Assigned Rep' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove from my team' }));

    await waitFor(() => expect(mocks.delete).toHaveBeenCalledWith(
      '/orgs/org-1/managers/manager-1/members/assigned-1',
    ));
    await waitFor(() => expect(screen.queryByText('Assigned Rep')).not.toBeInTheDocument());
  });
});

const adminMembers = [
  { id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'org_admin', status: 'active', createdAt: '', updatedAt: '' },
  { id: 'mgr-a', name: 'Deepak', email: 'deepak@example.com', role: 'manager', status: 'active', createdAt: '', updatedAt: '' },
  { id: 'mgr-b', name: 'Mahesh', email: 'mahesh@example.com', role: 'manager', status: 'active', createdAt: '', updatedAt: '' },
  { id: 'rep-a', name: 'Asha', email: 'asha@example.com', role: 'sales_member', status: 'active', managerId: 'mgr-a', createdAt: '', updatedAt: '' },
  { id: 'rep-free', name: 'Free Rep', email: 'free@example.com', role: 'sales_member', status: 'active', managerId: null, createdAt: '', updatedAt: '' },
  { id: 'rep-b', name: 'Vishal', email: 'vishal@example.com', role: 'sales_member', status: 'active', managerId: 'mgr-b', createdAt: '', updatedAt: '' },
];

describe('Team assignments as org admin', () => {
  const setup = () => {
    mocks.auth = { user: { uid: 'admin-1', email: 'admin@example.com', displayName: 'Admin' }, claims: { orgId: 'org-1', role: 'org_admin' } };
    mocks.get.mockImplementation((url: string) => {
      if (url.endsWith('/users')) return Promise.resolve({ data: { data: adminMembers } });
      return Promise.resolve({ data: { data: [] } });
    });
    mocks.put.mockResolvedValue({ data: { success: true } });
    mocks.delete.mockResolvedValue({ data: { success: true } });
  };

  it('shows member counts and removes a member only after confirmation', async () => {
    setup();
    mocks.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<Team />);

    expect(await screen.findAllByText('· 1 Member')).toHaveLength(2);
    await userEvent.click(screen.getByText('deepak@example.com'));
    const removeButton = screen.getByRole('button', { name: "Remove Asha from Deepak's team" });

    await userEvent.click(removeButton);
    expect(mocks.delete).not.toHaveBeenCalled();

    await userEvent.click(removeButton);
    await waitFor(() => expect(mocks.delete).toHaveBeenCalledWith('/orgs/org-1/managers/mgr-a/members/rep-a'));
  });

  it('changes a manager back to a sales member', async () => {
    setup();
    mocks.patch.mockResolvedValue({ data: { success: true } });
    render(<Team />);

    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Deepak' }));
    await userEvent.click(screen.getByRole('button', { name: 'Make sales member' }));

    await waitFor(() => expect(mocks.patch).toHaveBeenCalledWith(
      '/orgs/users/mgr-a',
      { role: 'sales_member' },
    ));
  });

  it('blocks promotion while a sales member is assigned to a manager', async () => {
    setup();
    render(<Team />);

    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Asha' }));
    await userEvent.click(screen.getByRole('button', { name: 'Make manager' }));

    expect(await screen.findByText("First remove Asha from Deepak's team, then make them a manager.")).toBeInTheDocument();
    expect(mocks.patch).not.toHaveBeenCalled();
  });

  it('deletes a manager from the three-dot menu after confirmation', async () => {
    setup();
    mocks.confirm.mockResolvedValue(true);
    render(<Team />);

    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Deepak' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete member' }));

    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Delete manager?',
      confirmLabel: 'Delete member',
      variant: 'danger',
    }));
    await waitFor(() => expect(mocks.delete).toHaveBeenCalledWith('/orgs/users/mgr-a'));
  });

  it('adds available members via select all without picking members from other teams', async () => {
    setup();
    render(<Team />);

    await userEvent.click(await screen.findByText('deepak@example.com'));
    await userEvent.click(screen.getByRole('button', { name: /Add Member/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByLabelText('Select all available'));
    expect(within(dialog).getByText('1 selected')).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: /Add 1 Member/ }));
    await waitFor(() => expect(mocks.put).toHaveBeenCalledWith('/orgs/org-1/managers/mgr-a/members', { memberIds: ['rep-a', 'rep-free'] }));
  });

  it('requires explicit confirmation before transferring a member from another manager', async () => {
    setup();
    render(<Team />);

    await userEvent.click(await screen.findByText('deepak@example.com'));
    await userEvent.click(screen.getByRole('button', { name: /Add Member/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Search members'), 'vish');
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Vishal/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: /Add 1 Member/ }));

    expect(mocks.put).not.toHaveBeenCalled();
    expect(within(dialog).getByText(/Vishal is currently assigned to Mahesh's team/)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm Transfer' }));
    await waitFor(() => expect(mocks.put).toHaveBeenCalledWith('/orgs/org-1/managers/mgr-a/members', { memberIds: ['rep-a', 'rep-b'] }));
  });
});
