import { format, subDays } from 'date-fns';
import type { ActivitySettings, HeatmapCell } from '../types/activity';

export type ActivityRangePreset = 'today' | 'yesterday' | 'last_7' | 'last_30';

export const ACTIVITY_RANGE_OPTIONS: Array<{ value: ActivityRangePreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7', label: 'Last 7 days' },
  { value: 'last_30', label: 'Last 30 days' },
];

export const resolveActivityRange = (preset: ActivityRangePreset, now = new Date()) => {
  const end = preset === 'yesterday' ? subDays(now, 1) : now;
  const days = preset === 'last_7' ? 7 : preset === 'last_30' ? 30 : 1;
  return {
    from: format(subDays(end, days - 1), 'yyyy-MM-dd'),
    to: format(end, 'yyyy-MM-dd'),
  };
};

export const SLOT_MINUTES = 15;

/** Local minute-of-day → "HH:MM". */
export const formatMinute = (minute: number | null | undefined) => {
  if (minute === null || minute === undefined) return '—';
  const whole = Math.min(24 * 60 - 1, Math.round(minute));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
};

/** Minutes → "3h 20m" / "45m". */
export const formatMinutes = (minutes: number) => {
  const whole = Math.round(minutes);
  if (whole < 60) return `${whole}m`;
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

export const percent = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : null;

const hhmmToMinute = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Hour range drawn on the day timeline: the working window plus an hour of
 * context either side, so early/late calls are visible.
 */
export const timelineHours = (settings: ActivitySettings) => {
  const start = Math.max(0, Math.floor(hhmmToMinute(settings.workStart) / 60) - 1);
  const end = Math.min(24, Math.ceil(hhmmToMinute(settings.workEnd) / 60) + 1);
  return { start, end };
};

/** Working hours of the day (the heatmap's columns). */
export const workingHourColumns = (settings: ActivitySettings) => {
  const start = Math.floor(hhmmToMinute(settings.workStart) / 60);
  const end = Math.ceil(hhmmToMinute(settings.workEnd) / 60);
  return Array.from({ length: end - start }, (_, index) => start + index);
};

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Monday-first display order. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const heatmapLookup = (cells: HeatmapCell[]) =>
  new Map(cells.map((cell) => [`${cell.weekday}_${cell.hour}`, cell]));

/** Sequential intensity step (1–5) for an activity share; null = no data. */
export const heatStep = (share: number | null) => {
  if (share === null) return null;
  return Math.min(5, Math.floor(share / 20) + 1);
};

export const describeSettings = (settings: ActivitySettings) => {
  const hours = `${settings.workStart}–${settings.workEnd}`;
  const pause = settings.breakStart && settings.breakEnd
    ? `, break ${settings.breakStart}–${settings.breakEnd}`
    : '';
  return `${hours}${pause}`;
};
