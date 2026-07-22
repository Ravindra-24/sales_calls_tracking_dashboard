import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  auth: {
    user: { uid: 'admin-1', email: 'admin@example.com', displayName: 'Admin' },
    claims: { orgId: 'org-1', role: 'manager' as const },
  },
}));

vi.mock('../api/client', () => ({
  api: { get: mocks.get },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock('../context/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('../components/OnboardingChecklist', () => ({ OnboardingChecklist: () => null }));
vi.mock('../components/SyncHealthPanel', () => ({ SyncHealthPanel: () => null }));

const stats = {
  range: { from: '2026-07-16', to: '2026-07-22' },
  teamTotals: {
    totalCalls: 10,
    totalDurationSeconds: 640,
    incomingCount: 3,
    outgoingCount: 5,
    missedCount: 2,
  },
  byRep: [{
    repId: 'rep-1',
    totalCalls: 10,
    totalDurationSeconds: 640,
    incomingCount: 3,
    outgoingCount: 5,
    missedCount: 2,
    dailyBreakdown: [{
      date: '2026-07-22',
      totalCalls: 10,
      totalDurationSeconds: 640,
      incomingCount: 3,
      outgoingCount: 5,
      missedCount: 2,
    }],
  }],
};

afterEach(() => {
  cleanup();
  mocks.get.mockReset();
  window.sessionStorage.clear();
});

describe('Dashboard', () => {
  it('renders balanced KPIs and applies the representative filter', async () => {
    mocks.get.mockImplementation((url: string) => Promise.resolve({ data: { data: url.includes('/users') ? [{
      id: 'rep-1', name: 'Asha', email: 'asha@example.com', role: 'sales_member', status: 'disabled', createdAt: '', updatedAt: '',
    }] : stats } }));
    const user = userEvent.setup();
    render(<Dashboard />);

    expect(screen.getByLabelText('Date range')).toHaveValue('today');
    expect(await screen.findByText('80%')).toBeInTheDocument();
    expect(screen.getByText('1m 20s')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /5 outgoing, 3 incoming, 2 missed/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Asha (inactive)' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Representative'), 'rep-1');
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/stats/team', expect.objectContaining({
      params: expect.objectContaining({ repId: 'rep-1' }),
    })));
  });
});
