import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformOrganization } from './PlatformOrganization';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
  signInWithCustomToken: vi.fn(),
}));

vi.mock('../api/client', () => ({
  api: { get: mocks.get, patch: mocks.patch, post: mocks.post },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock('../config/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({ signInWithCustomToken: mocks.signInWithCustomToken }));
vi.mock('../context/auth', () => ({
  useAuth: () => ({ claims: { role: 'platform_owner', orgId: '' } }),
}));
vi.mock('../context/feedback', () => ({
  useFeedback: () => ({ toast: mocks.toast, confirm: mocks.confirm }),
}));

const overview = {
  organization: {
    id: 'org-1',
    name: 'Acme Sales',
    plan: 'pro',
    status: 'active',
    ownerUserId: 'admin-1',
    settings: { timezone: 'Asia/Kolkata', workingHoursStart: '09:00', workingHoursEnd: '18:00' },
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
  },
  primaryAdmin: { id: 'admin-1', name: 'Asha Admin', email: 'asha@example.com', phoneNumber: null, status: 'active' },
  users: { total: 2, active: 2, disabled: 0, roleCounts: { org_admin: 1, sales_member: 1 } },
  activity: { lastCallAt: '2026-07-29T10:00:00.000Z', lastSyncAt: '2026-07-29T10:05:00.000Z' },
  syncHealth: { totalDevices: 1, healthy: 1, attention: 0 },
  billing: {
    account: { effectivePlan: 'pro', planSource: 'razorpay', accessMode: 'full', currentPeriodEnd: '2026-08-29T00:00:00.000Z', currentSubscriptionId: 'sub-1' },
    subscription: { id: 'sub-1', status: 'active', planCode: 'pro', currentPeriodEnd: '2026-08-29T00:00:00.000Z', cancelAtPeriodEnd: false },
  },
};

const employees = [
  { id: 'admin-1', orgId: 'org-1', name: 'Asha Admin', email: 'asha@example.com', role: 'org_admin', status: 'active', phoneNumber: '', accountDisabled: false, lastSignInAt: '2026-07-29T09:00:00.000Z', lastSeenAt: null, createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '' },
  { id: 'rep-1', orgId: 'org-1', name: 'Ravi Rep', email: 'ravi@example.com', role: 'sales_member', status: 'active', phoneNumber: '+919000000001', accountDisabled: false, lastSignInAt: null, lastSeenAt: '2026-07-29T08:00:00.000Z', createdAt: '2026-07-02T00:00:00.000Z', updatedAt: '' },
];

const analytics = {
  range: { from: '2026-07-01', to: '2026-07-29' },
  teamTotals: { totalCalls: 12, totalDurationSeconds: 600, incomingCount: 4, outgoingCount: 6, missedCount: 2 },
  byRep: [{ repId: 'rep-1', totalCalls: 12, totalDurationSeconds: 600, incomingCount: 4, outgoingCount: 6, missedCount: 2, dailyBreakdown: [] }],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PlatformOrganization', () => {
  it('shows tenant overview, employees, analytics, billing, and support status controls', async () => {
    mocks.get.mockImplementation((url: string) => {
      if (url.endsWith('/users')) return Promise.resolve({ data: { data: employees, meta: {} } });
      if (url.endsWith('/analytics')) return Promise.resolve({ data: { data: analytics } });
      return Promise.resolve({ data: { data: overview } });
    });
    mocks.confirm.mockResolvedValue(true);
    mocks.patch.mockResolvedValue({ data: { data: {} } });
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/dashboard/platform/organizations/org-1']}>
        <Routes>
          <Route path="/dashboard/platform/organizations/:orgId" element={<PlatformOrganization />} />
          <Route path="/dashboard/platform" element={<div>Organizations list</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Acme Sales' })).toBeInTheDocument();
    expect(screen.getByText('Asha Admin · asha@example.com')).toBeInTheDocument();
    expect(screen.getByText('Ravi Rep', { selector: '.member-cell strong' })).toBeInTheDocument();
    expect(screen.getByText('12', { selector: '.stat-card strong' })).toBeInTheDocument();
    expect(screen.getByText('active', { selector: '.platform-billing-details strong' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Role'), 'sales_member');
    expect(screen.queryByText('Asha Admin', { selector: '.member-cell strong' })).not.toBeInTheDocument();
    expect(screen.getByText('Ravi Rep', { selector: '.member-cell strong' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Disable' }));
    await waitFor(() => expect(mocks.patch).toHaveBeenCalledWith(
      '/admin/organizations/org-1',
      { status: 'disabled' },
    ));
    expect(await screen.findByRole('button', { name: 'Enable' })).toBeInTheDocument();
  });
});
