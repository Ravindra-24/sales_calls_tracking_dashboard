import {
  eachDayOfInterval,
  format,
  parseISO,
  startOfWeek,
  subDays,
} from 'date-fns';
import type { RepStats } from '../types/api';

export type DashboardRangePreset = 'today' | 'yesterday' | 'last_week' | 'last_month' | 'quarterly' | 'yearly';

export const DASHBOARD_RANGE_OPTIONS: Array<{ value: DashboardRangePreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_week', label: 'Last week' },
  { value: 'last_month', label: 'Last month' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const RANGE_DAYS: Record<Exclude<DashboardRangePreset, 'yesterday'>, number> = {
  today: 1,
  last_week: 7,
  last_month: 30,
  quarterly: 90,
  yearly: 365,
};

export const resolveDashboardRange = (
  preset: DashboardRangePreset,
  now = new Date(),
) => {
  const end = preset === 'yesterday' ? subDays(now, 1) : now;
  const days = preset === 'yesterday' ? 1 : RANGE_DAYS[preset];
  return {
    from: format(subDays(end, days - 1), 'yyyy-MM-dd'),
    to: format(end, 'yyyy-MM-dd'),
  };
};

export interface DashboardTrendPoint {
  key: string;
  label: string;
  calls: number;
}

export const buildDashboardTrend = (
  reps: RepStats[],
  from: string,
  to: string,
  preset: DashboardRangePreset,
): DashboardTrendPoint[] => {
  const dailyTotals = new Map<string, number>();
  reps.forEach((rep) => {
    rep.dailyBreakdown.forEach((day) => {
      dailyTotals.set(day.date, (dailyTotals.get(day.date) ?? 0) + day.totalCalls);
    });
  });

  const dates = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) });
  if (preset === 'yearly') {
    const totals = new Map<string, number>();
    dates.forEach((date) => {
      const dayKey = format(date, 'yyyy-MM-dd');
      const monthKey = format(date, 'yyyy-MM');
      totals.set(monthKey, (totals.get(monthKey) ?? 0) + (dailyTotals.get(dayKey) ?? 0));
    });
    return [...new Set(dates.map((date) => format(date, 'yyyy-MM')))].map((key) => ({
      key,
      label: format(parseISO(`${key}-01`), 'MMM yy'),
      calls: totals.get(key) ?? 0,
    }));
  }

  if (preset === 'quarterly') {
    const totals = new Map<string, number>();
    dates.forEach((date) => {
      const dayKey = format(date, 'yyyy-MM-dd');
      const weekKey = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      totals.set(weekKey, (totals.get(weekKey) ?? 0) + (dailyTotals.get(dayKey) ?? 0));
    });
    return [...new Set(dates.map((date) => (
      format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    )))].map((key) => ({
      key,
      label: format(parseISO(key), 'd MMM'),
      calls: totals.get(key) ?? 0,
    }));
  }

  return dates.map((date) => {
    const key = format(date, 'yyyy-MM-dd');
    const shortRange = preset === 'today' || preset === 'yesterday' || preset === 'last_week';
    return {
      key,
      label: format(date, shortRange ? 'EEE' : 'd MMM'),
      calls: dailyTotals.get(key) ?? 0,
    };
  });
};
