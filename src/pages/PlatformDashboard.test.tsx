import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlatformOverview } from '../types/api';
import { PlatformDashboard } from './PlatformDashboard';
import { buildPlatformCallTrend } from './platformDashboardView';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('../api/client', () => ({
  api: { get: mocks.get },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

const day = (date: string, totalCalls: number) => ({ date, totalCalls, connectedCount: Math.floor(totalCalls / 2), activeOrganizations: totalCalls ? 1 : 0 });

const overview: PlatformOverview = {
  range: { from: '2026-08-29', to: '2026-09-27', timezone: 'Asia/Kolkata' },
  generatedAt: '2026-09-27T10:00:00.000Z',
  organizations: {
    total: 3,
    active: 3,
    disabled: 0,
    newInRange: 1,
    activeLast7Days: 1,
    byHealth: { healthy: 1, at_risk: 1, dormant: 0, never_activated: 1, disabled: 0 },
  },
  people: {
    total: 14,
    active: 13,
    disabled: 1,
    newInRange: 2,
    roleCounts: { org_admin: 3, sales_member: 11 },
    activeReps: 10,
    repsCallingInRange: 8,
    repsWithoutApp: 1,
  },
  calls: {
    totalCalls: 1200,
    connectedCount: 600,
    notConnectedCount: 450,
    missedCount: 150,
    incomingCount: 200,
    outgoingCount: 850,
    totalDurationSeconds: 90_000,
  },
  revenue: {
    mrrPaise: 0,
    payingOrganizations: 0,
    testMrrPaise: 89_976,
    testPayingOrganizations: 3,
    planMix: { lite: 1, pro: 0, max: 2, enterprise: 0 },
    planSourceMix: { razorpay: 2, free: 1 },
    renewalsDue: [{ orgId: 'org-a', orgName: 'Acme Sales', planCode: 'max', mode: 'test', currentPeriodEnd: '2026-10-02T00:00:00.000Z', cancelAtCycleEnd: false }],
  },
  trends: {
    daily: [day('2026-09-26', 700), day('2026-09-27', 500)],
    weekly: [{ weekStart: '2026-09-21', newOrganizations: 1, newUsers: 2, totalOrganizations: 3, totalUsers: 14 }],
  },
  tenants: [
    { orgId: 'org-a', name: 'Acme Sales', status: 'active', plan: 'max', planSource: 'razorpay', health: 'healthy', members: 11, activeReps: 10, callsInRange: 1200, callsLast7Days: 400, callsPrevious7Days: 500, lastCallAt: '2026-09-27T09:00:00.000Z', createdAt: '2026-07-01T00:00:00.000Z' },
    { orgId: 'org-b', name: 'Beta Traders', status: 'active', plan: 'lite', planSource: 'free', health: 'never_activated', members: 1, activeReps: 0, callsInRange: 0, callsLast7Days: 0, callsPrevious7Days: 0, lastCallAt: null, createdAt: '2026-09-20T00:00:00.000Z' },
  ],
  attention: [
    { kind: 'stuck_checkout', severity: 'high', orgId: 'org-c', orgName: 'Cobalt', message: 'Checkout has been processing for over 30 minutes; it may be paid but not activated.' },
    { kind: 'no_sales_reps', severity: 'medium', orgId: 'org-b', orgName: 'Beta Traders', message: 'No sales reps have been added yet.' },
  ],
};

const renderDashboard = () => render(<MemoryRouter><PlatformDashboard /></MemoryRouter>);

describe('PlatformDashboard', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mocks.get.mockResolvedValue({ data: { success: true, data: overview } });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows platform totals, attention items, and ranked tenants', async () => {
    renderDashboard();

    const callsCard = (await screen.findByText('50% connected')).closest('.stat-card') as HTMLElement;
    expect(within(callsCard).getByText('1,200')).toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledWith('/admin/overview', { params: expect.objectContaining({ from: expect.any(String), to: expect.any(String) }) });
    expect(screen.getByText('10 reps · 8 calling')).toBeInTheDocument();
    expect(screen.getByText(/No live billing yet/)).toBeInTheDocument();
    expect(screen.getByText('1 urgent')).toBeInTheDocument();

    const attention = screen.getByRole('heading', { name: 'Needs attention' }).closest('section') as HTMLElement;
    const stuckRow = within(attention).getByText('Cobalt').closest('li') as HTMLElement;
    expect(within(stuckRow).getByText('Urgent')).toBeInTheDocument();
    expect(within(stuckRow).getByRole('link', { name: 'Billing' })).toHaveAttribute('href', '/dashboard/billing-operations?search=org-c');
    const setupRow = within(attention).getByText('Beta Traders').closest('li') as HTMLElement;
    expect(within(setupRow).getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/dashboard/platform/organizations/org-b');

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getByText('Acme Sales')).toBeInTheDocument();
    expect(within(rows[1]).getByText('(-20% vs prior week)')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Not activated')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Never')).toBeInTheDocument();
  });

  it('refetches when the range changes and remembers it', async () => {
    renderDashboard();
    await screen.findByText('50% connected');

    await userEvent.selectOptions(screen.getByLabelText('Date range'), 'last_7');

    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
    const { from, to } = mocks.get.mock.calls[1][1].params;
    expect((Date.parse(to) - Date.parse(from)) / 86_400_000).toBe(6);
    expect(window.sessionStorage.getItem('smartlymanage.platform.range')).toBe('last_7');
  });

  it('shows an error when the overview fails to load', async () => {
    mocks.get.mockRejectedValueOnce(new Error('boom'));
    renderDashboard();
    expect(await screen.findByText('Failed to load platform overview.')).toBeInTheDocument();
  });
});

describe('buildPlatformCallTrend', () => {
  it('keeps days up to a month and groups longer ranges into Monday weeks', () => {
    const month = Array.from({ length: 30 }, (_, index) => day(`2026-09-${String(index + 1).padStart(2, '0')}`, 10));
    expect(buildPlatformCallTrend(month)).toHaveLength(30);

    const quarter = Array.from({ length: 35 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 7, 24 + index)).toISOString().slice(0, 10);
      return day(date, 10);
    });
    const weeks = buildPlatformCallTrend(quarter);
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toMatchObject({ key: '2026-08-24', totalCalls: 70, weekly: true, activeOrganizations: null });
  });
});
