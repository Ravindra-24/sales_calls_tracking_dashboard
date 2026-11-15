import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MyTeam } from './MyTeam';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  authState: {
    user: { uid: 'mgr-1', email: 'mgr@example.com' },
    claims: { orgId: 'org-1', role: 'manager' },
  },
}));

vi.mock('../api/client', () => ({
  api: { get: mocks.get },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock('../context/auth', () => ({ useAuth: () => mocks.authState }));

const row = (overrides: Record<string, unknown>) => ({
  email: `${overrides.repId}@example.com`,
  role: 'sales_member',
  managerId: 'mgr-1',
  onShift: false,
  trackingStale: false,
  shiftStartedAtMs: null,
  lastFixAtMs: null,
  batteryPct: null,
  calls: 0,
  talkSeconds: 0,
  outgoingCalls: 0,
  quickHangups: 0,
  firstActivityMinute: null,
  lastActivityMinute: null,
  noActivityMinutes: 0,
  targets: { total: 0, behind: 0, onTrack: 0, achieved: 0 },
  deviceIssues: [],
  flags: [],
  ...overrides,
});

const teamToday = {
  date: '2026-11-16',
  generatedAt: '2026-11-16T07:30:00.000Z',
  workingDay: true,
  settings: { workStart: '10:00', workEnd: '19:30', idleThresholdMinutes: 30, workingDays: [1, 2, 3, 4, 5, 6] },
  totals: { members: 2, onShift: 1, started: 1, notStarted: 1, flagged: 1, calls: 14, talkSeconds: 3900 },
  rows: [
    row({ repId: 'rep-2', name: 'Sana Rep', flags: ['not_started'] }),
    row({
      repId: 'rep-1', name: 'Ravi Rep', onShift: true, shiftStartedAtMs: Date.parse('2026-11-16T04:35:00Z'),
      batteryPct: 64, calls: 14, talkSeconds: 3900, firstActivityMinute: 622, lastActivityMinute: 774.5,
      targets: { total: 1, behind: 0, onTrack: 1, achieved: 0 },
    }),
  ],
};

const members = [
  { id: 'mgr-1', name: 'Meera Manager', email: 'mgr@example.com', role: 'manager', status: 'active' },
  { id: 'mgr-2', name: 'Omar Lead', email: 'omar@example.com', role: 'manager', status: 'active' },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('My Team today', () => {
  it('shows the roll-call with flags and totals', async () => {
    mocks.get.mockImplementation((url: string) => Promise.resolve({
      data: { data: url === '/stats/team-today' ? teamToday : members },
    }));
    render(<MyTeam />);

    expect(await screen.findByText('Sana Rep')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    const ravi = screen.getByText('Ravi Rep').closest('tr')!;
    expect(within(ravi).getByText('On shift')).toBeInTheDocument();
    expect(within(ravi).getByText('10:22 – 12:54')).toBeInTheDocument();
    expect(within(ravi).getByText('1h 05m talk')).toBeInTheDocument();
    expect(within(ravi).getByText('On track')).toBeInTheDocument();
    const sana = screen.getByText('Sana Rep').closest('tr')!;
    expect(within(sana).getAllByText('Not started').length).toBeGreaterThan(0);
  });

  it('filters to people needing attention', async () => {
    mocks.get.mockImplementation((url: string) => Promise.resolve({
      data: { data: url === '/stats/team-today' ? teamToday : members },
    }));
    const user = userEvent.setup();
    render(<MyTeam />);

    await screen.findByText('Ravi Rep');
    await user.click(screen.getByRole('tab', { name: /Needs attention/ }));
    expect(screen.queryByText('Ravi Rep')).not.toBeInTheDocument();
    expect(screen.getByText('Sana Rep')).toBeInTheDocument();
  });

  it('narrows to a sub-manager’s team', async () => {
    mocks.get.mockImplementation((url: string) => Promise.resolve({
      data: { data: url === '/stats/team-today' ? teamToday : members },
    }));
    const user = userEvent.setup();
    render(<MyTeam />);

    await user.selectOptions(await screen.findByLabelText('Team'), 'mgr-2');
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/stats/team-today', { params: { managerId: 'mgr-2' } }));
  });

  it('explains an empty team', async () => {
    mocks.get.mockImplementation((url: string) => Promise.resolve({
      data: { data: url === '/stats/team-today' ? { ...teamToday, rows: [], totals: { ...teamToday.totals, members: 0 } } : [] },
    }));
    render(<MyTeam />);
    expect(await screen.findByText(/Nobody reports to you yet/)).toBeInTheDocument();
  });
});
