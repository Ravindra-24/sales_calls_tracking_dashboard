import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { format, subDays } from 'date-fns';
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
    connectedCount: 7,
    notConnectedCount: 1,
    analyzedCount: 4,
    positiveCount: 3,
    neutralCount: 0,
    negativeCount: 1,
    mixedCount: 0,
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
      connectedCount: 7,
      notConnectedCount: 1,
    }],
  }],
};

const callSummary = {
  totalCalls: 10,
  connectedCalls: 7,
  notConnectedCalls: 1,
  missedCalls: 2,
  uniqueIncomingCalls: 2,
  uniqueOutgoingCalls: 4,
  uniqueConnectedCalls: 5,
};

afterEach(() => {
  cleanup();
  mocks.get.mockReset();
  window.sessionStorage.clear();
});

describe('Dashboard', () => {
  it('renders balanced KPIs and applies the representative filter', async () => {
    mocks.get.mockImplementation((url: string) => Promise.resolve({ data: { data:
      url.includes('/users') ? [{
        id: 'rep-1', name: 'Asha', email: 'asha@example.com', role: 'sales_member', status: 'disabled', createdAt: '', updatedAt: '',
      }] : url === '/calls/summary' ? callSummary : stats,
    } }));
    const user = userEvent.setup();
    render(<Dashboard />);

    expect(screen.getByLabelText('Date range')).toHaveValue('today');
    expect(await screen.findByText('70%')).toBeInTheDocument();
    expect(screen.getByText('1m 31s')).toBeInTheDocument();
    expect(screen.getByText('Not connected')).toBeInTheDocument();
    expect(screen.getByText('Unique incoming')).toBeInTheDocument();
    expect(screen.getByText('Unique outgoing')).toBeInTheDocument();
    expect(screen.getByText('Unique connected')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Attempted').nextElementSibling).toHaveTextContent('5');
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('3 of 4 analyzed')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('1 of 4 analyzed')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /5 outgoing, 3 incoming, 2 missed/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Asha (inactive)' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Representative'), 'rep-1');
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/stats/team', expect.objectContaining({
      params: expect.objectContaining({ repId: 'rep-1' }),
    })));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/calls/summary', expect.objectContaining({
      params: expect.objectContaining({ repId: 'rep-1' }),
    })));
  });

  it('applies a custom start and end date to every dashboard data request', async () => {
    mocks.get.mockImplementation((url: string) => Promise.resolve({ data: { data:
      url.includes('/users') ? [] : url === '/calls/summary' ? callSummary : stats,
    } }));
    const user = userEvent.setup();
    const end = new Date();
    const start = subDays(end, 1);
    const from = format(start, 'yyyy-MM-dd');
    const to = format(end, 'yyyy-MM-dd');
    render(<Dashboard />);

    await user.selectOptions(screen.getByLabelText('Date range'), 'custom');
    const calendar = await screen.findByRole('dialog', { name: 'Custom date range' });
    await user.click(within(calendar).getByRole('button', { name: `Select ${from}` }));
    await user.click(within(calendar).getByRole('button', { name: `Select ${to}` }));
    await user.click(within(calendar).getByRole('button', { name: 'Apply range' }));

    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/stats/team', {
      params: { from, to },
    }));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/calls/summary', {
      params: {
        from: new Date(`${from}T00:00:00`).toISOString(),
        to: new Date(`${to}T23:59:59.999`).toISOString(),
      },
    }));
  });

  it('shows no sentiment ratio when no calls were analyzed', async () => {
    const unanalyzed = { ...stats, teamTotals: { ...stats.teamTotals, analyzedCount: 0, positiveCount: 0, negativeCount: 0 } };
    mocks.get.mockImplementation((url: string) => Promise.resolve({ data: { data:
      url.includes('/users') ? [] : url === '/calls/summary' ? callSummary : unanalyzed,
    } }));
    render(<Dashboard />);

    expect(await screen.findAllByText('No analyzed calls')).toHaveLength(2);
    expect(screen.getByText('Positive calls').nextElementSibling).toHaveTextContent('—');
  });
});
