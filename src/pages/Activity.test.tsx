import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Activity } from './Activity';
import { formatMinute, formatMinutes, heatStep, resolveActivityRange, timelineHours } from './activityView';
import type { ActivityReport } from '../types/activity';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  auth: {
    user: { uid: 'admin-1', email: 'admin@example.com', displayName: 'Admin' },
    claims: { orgId: 'org-1', role: 'manager' as 'manager' | 'sales_member' },
  },
}));

vi.mock('../api/client', () => ({
  api: { get: mocks.get },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock('../context/auth', () => ({ useAuth: () => mocks.auth }));

const settings = {
  timezone: 'Asia/Kolkata',
  workStart: '10:00',
  workEnd: '19:30',
  breakStart: '13:30',
  breakEnd: '14:30',
  idleThresholdMinutes: 30,
};

// 10:00 active, then 10:15–12:00 idle, rest outside/break patterns.
const slots = `${'.'.repeat(40)}1${'0'.repeat(13)}bbbb${'1'.repeat(20)}${'.'.repeat(18)}`;

const day = (date: string) => ({
  date,
  weekday: 1,
  callCount: 42,
  talkSeconds: 3600,
  firstActivityMinute: 605,
  lastActivityMinute: 1165,
  windowMinutes: 510,
  noActivityMinutes: 195,
  noActivityGaps: [{ startMinute: 615, endMinute: 810 }],
  longestGapMinutes: 195,
  activeSlots: 21,
  windowSlots: 34,
  slots,
});

const rep = (repId: string, activeSlots: number) => ({
  repId,
  activeDays: 1,
  callCount: 42,
  talkSeconds: 3600,
  windowMinutes: 510,
  noActivityMinutes: 195,
  noActivityBlocks: 1,
  longestGapMinutes: 195,
  activeSlots,
  windowSlots: 34,
  medianFirstActivityMinute: 605,
  medianLastActivityMinute: 1165,
  hourly: [],
  days: [day('2026-09-21')],
});

const report: ActivityReport = {
  range: { from: '2026-09-21', to: '2026-09-27' },
  settings,
  team: {
    activeRepDays: 2,
    daysOff: 1,
    callCount: 84,
    talkSeconds: 7200,
    windowMinutes: 1020,
    noActivityMinutes: 390,
    noActivityBlocks: 2,
    activeSlots: 38,
    windowSlots: 68,
    heatmap: [{ weekday: 1, hour: 10, activeSlots: 3, windowSlots: 4 }],
  },
  byRep: [rep('rep-1', 17), rep('rep-2', 21)],
};

const members = [
  { id: 'rep-1', name: 'Asha', email: 'asha@example.com', role: 'sales_member', status: 'active' },
  { id: 'rep-2', name: 'Vikram', email: 'vikram@example.com', role: 'sales_member', status: 'active' },
];

afterEach(() => {
  cleanup();
  mocks.get.mockReset();
  mocks.auth.claims.role = 'manager';
});

describe('activityView helpers', () => {
  it('formats minutes and ranges', () => {
    expect(formatMinute(605)).toBe('10:05');
    expect(formatMinute(null)).toBe('—');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(195)).toBe('3h 15m');
    expect(formatMinutes(120)).toBe('2h');
    expect(resolveActivityRange('last_7', new Date('2026-09-27T12:00:00'))).toEqual({ from: '2026-09-21', to: '2026-09-27' });
    expect(timelineHours(settings)).toEqual({ start: 9, end: 21 });
    expect([heatStep(null), heatStep(0), heatStep(59), heatStep(100)]).toEqual([null, 1, 3, 5]);
  });
});

describe('Activity', () => {
  it('ranks reps by working time with calls and drills into one rep', async () => {
    mocks.get.mockImplementation((url: string) => Promise.resolve({ data: { data: url.includes('/users') ? members : report } }));
    render(<Activity />);

    const table = await screen.findByRole('table', { name: '' });
    await waitFor(() => expect(within(table).getAllByRole('button').map((button) => button.textContent)).toEqual(['Vikram', 'Asha']));
    expect(screen.getByText('56%')).toBeInTheDocument();
    expect(within(table).getAllByText('3h 15m')).toHaveLength(4);
    expect(await screen.findByRole('img', { name: /Vikram: 42 calls, 3h 15m with no call activity across 1 gap/ })).toBeInTheDocument();
    expect(screen.getByTitle(/Mon 10:00 · calls in 75% of blocks \(3\/4\)/)).toBeInTheDocument();

    await userEvent.click(within(table).getByRole('button', { name: 'Asha' }));
    await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith('/stats/activity', {
      params: expect.objectContaining({ repId: 'rep-1' }),
    }));
  });

  it('shows a sales member only their own activity without the team table', async () => {
    mocks.auth.claims.role = 'sales_member';
    mocks.get.mockResolvedValue({ data: { data: { ...report, byRep: [rep('admin-1', 21)] } } });
    render(<Activity />);

    expect(await screen.findByRole('heading', { name: 'My activity' })).toBeInTheDocument();
    await screen.findByRole('img', { name: /Mon 21 Sep: 42 calls/ });
    expect(screen.queryByText('By representative')).not.toBeInTheDocument();
    expect(mocks.get).not.toHaveBeenCalledWith(expect.stringContaining('/users'), expect.anything());
  });

  it('surfaces a load failure', async () => {
    mocks.get.mockImplementation((url: string) => (url.includes('/users')
      ? Promise.resolve({ data: { data: members } })
      : Promise.reject(new Error('boom'))));
    render(<Activity />);
    expect(await screen.findByText('Failed to load activity.')).toBeInTheDocument();
  });
});
