import { format, parseISO, startOfWeek, subDays } from 'date-fns';
import type { PlatformOverview } from '../types/api';

export type PlatformRangePreset = 'last_7' | 'last_30' | 'last_90';

export const PLATFORM_RANGE_OPTIONS: Array<{ value: PlatformRangePreset; label: string }> = [
  { value: 'last_7', label: 'Last 7 days' },
  { value: 'last_30', label: 'Last 30 days' },
  { value: 'last_90', label: 'Last 90 days' },
];

const RANGE_DAYS: Record<PlatformRangePreset, number> = {
  last_7: 7,
  last_30: 30,
  last_90: 90,
};

export const resolvePlatformRange = (preset: PlatformRangePreset, now = new Date()) => ({
  from: format(subDays(now, RANGE_DAYS[preset] - 1), 'yyyy-MM-dd'),
  to: format(now, 'yyyy-MM-dd'),
});

export interface PlatformTrendPoint {
  key: string;
  label: string;
  title: string;
  weekly: boolean;
  showValue: boolean;
  totalCalls: number;
  connectedCount: number;
  /** Daily points only; distinct orgs per week are not in the daily rows. */
  activeOrganizations: number | null;
}

/** Days up to a month; Monday-start weeks beyond that so bars stay legible. */
export const buildPlatformCallTrend = (
  daily: PlatformOverview['trends']['daily'],
): PlatformTrendPoint[] => {
  if (daily.length <= 31) {
    const labelEvery = Math.ceil(daily.length / 10);
    return daily.map((day, index) => ({
      key: day.date,
      label: index % labelEvery === 0 ? format(parseISO(day.date), 'd MMM') : '',
      title: format(parseISO(day.date), 'EEE d MMM'),
      weekly: false,
      showValue: daily.length <= 14,
      totalCalls: day.totalCalls,
      connectedCount: day.connectedCount,
      activeOrganizations: day.activeOrganizations,
    }));
  }

  const weeks = new Map<string, PlatformTrendPoint>();
  daily.forEach((day) => {
    const weekStart = format(startOfWeek(parseISO(day.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const week = weeks.get(weekStart) ?? {
      key: weekStart,
      label: format(parseISO(weekStart), 'd MMM'),
      title: `Week of ${format(parseISO(weekStart), 'd MMM')}`,
      weekly: true,
      showValue: true,
      totalCalls: 0,
      connectedCount: 0,
      activeOrganizations: null,
    };
    week.totalCalls += day.totalCalls;
    week.connectedCount += day.connectedCount;
    weeks.set(weekStart, week);
  });
  return [...weeks.values()];
};
