import { describe, expect, it } from 'vitest';
import type { RepStats } from '../types/api';
import { buildDashboardTrend, resolveDashboardRange } from './dashboardAnalytics';

const rep = (dailyBreakdown: RepStats['dailyBreakdown']): RepStats => ({
  repId: 'rep-1',
  totalCalls: dailyBreakdown.reduce((sum, day) => sum + day.totalCalls, 0),
  totalDurationSeconds: 0,
  incomingCount: 0,
  outgoingCount: 0,
  missedCount: 0,
  dailyBreakdown,
});

const day = (date: string, totalCalls: number) => ({
  date,
  totalCalls,
  totalDurationSeconds: 0,
  incomingCount: 0,
  outgoingCount: 0,
  missedCount: 0,
});

describe('dashboard analytics helpers', () => {
  it('resolves every rolling preset across a year boundary', () => {
    const now = new Date(2026, 0, 2, 12);
    expect(resolveDashboardRange('today', now)).toEqual({ from: '2026-01-02', to: '2026-01-02' });
    expect(resolveDashboardRange('yesterday', now)).toEqual({ from: '2026-01-01', to: '2026-01-01' });
    expect(resolveDashboardRange('last_week', now)).toEqual({ from: '2025-12-27', to: '2026-01-02' });
    expect(resolveDashboardRange('last_month', now)).toEqual({ from: '2025-12-04', to: '2026-01-02' });
    expect(resolveDashboardRange('quarterly', now)).toEqual({ from: '2025-10-05', to: '2026-01-02' });
    expect(resolveDashboardRange('yearly', now)).toEqual({ from: '2025-01-03', to: '2026-01-02' });
  });

  it('fills missing daily buckets and totals multiple representatives', () => {
    const trend = buildDashboardTrend([
      rep([day('2026-07-20', 2), day('2026-07-22', 3)]),
      { ...rep([day('2026-07-22', 4)]), repId: 'rep-2' },
    ], '2026-07-20', '2026-07-22', 'last_week');
    expect(trend.map((point) => point.calls)).toEqual([2, 0, 7]);
  });

  it('groups quarterly data by week and yearly data by month', () => {
    const stats = [rep([
      day('2025-12-31', 2),
      day('2026-01-01', 3),
      day('2026-01-05', 4),
    ])];
    const weekly = buildDashboardTrend(stats, '2025-12-29', '2026-01-11', 'quarterly');
    expect(weekly.map((point) => point.calls)).toEqual([5, 4]);
    const monthly = buildDashboardTrend(stats, '2025-12-01', '2026-01-31', 'yearly');
    expect(monthly.map((point) => point.calls)).toEqual([2, 7]);
  });
});
