import { format, parseISO, subDays } from 'date-fns';

export interface CallFilters {
  repId: string;
  direction: string;
  from: string;
  to: string;
  phoneSearch: string;
  tag: string;
  followUpStatus: string;
  minDurationSeconds: string;
  maxDurationSeconds: string;
  /** Call start-time order: 'desc' (newest first) or 'asc'. Not a filter. */
  sort: string;
}

export type CallDatePreset = 'today' | 'yesterday' | 'last_7' | 'last_30';

export const CALL_DATE_PRESETS: Array<{ value: CallDatePreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7', label: 'Last 7 days' },
  { value: 'last_30', label: 'Last 30 days' },
];

const day = (date: Date) => format(date, 'yyyy-MM-dd');

export const resolveCallDatePreset = (preset: CallDatePreset, now = new Date()) => {
  if (preset === 'yesterday') return { from: day(subDays(now, 1)), to: day(subDays(now, 1)) };
  const span = preset === 'last_7' ? 7 : preset === 'last_30' ? 30 : 1;
  return { from: day(subDays(now, span - 1)), to: day(now) };
};

export const matchCallDatePreset = (from: string, to: string, now = new Date()): CallDatePreset | null => (
  CALL_DATE_PRESETS.find(({ value }) => {
    const range = resolveCallDatePreset(value, now);
    return range.from === from && range.to === to;
  })?.value ?? null
);

export const createDefaultFilters = (now = new Date()): CallFilters => ({
  repId: '',
  direction: '',
  ...resolveCallDatePreset('today', now),
  phoneSearch: '',
  tag: '',
  followUpStatus: '',
  minDurationSeconds: '',
  maxDurationSeconds: '',
  sort: 'desc',
});

/**
 * A range saved as a preset ("Today", "Last 7 days") on an earlier day is
 * moved to the same preset today, so a tab left open overnight doesn't keep
 * showing yesterday as "today". Custom ranges are kept as picked.
 */
export const rollDatePresetForward = (filters: CallFilters, savedOn: string | undefined, now = new Date()): CallFilters => {
  if (!savedOn || savedOn === day(now)) return filters;
  const preset = matchCallDatePreset(filters.from, filters.to, parseISO(savedOn));
  return preset ? { ...filters, ...resolveCallDatePreset(preset, now) } : filters;
};

export const describeDateRange = (from: string, to: string, now = new Date()) => {
  const preset = matchCallDatePreset(from, to, now);
  const presetLabel = CALL_DATE_PRESETS.find(({ value }) => value === preset)?.label;
  const start = parseISO(from);
  const end = parseISO(to);
  const range = from === to
    ? format(start, 'd MMM yyyy')
    : `${format(start, start.getFullYear() === end.getFullYear() ? 'd MMM' : 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`;
  return presetLabel ? `${presetLabel} (${range})` : range;
};

/** "45 s", "2 min", "2 min 40 s". */
export const formatDurationLabel = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes === 0) return `${remainder} s`;
  return remainder ? `${minutes} min ${remainder} s` : `${minutes} min`;
};

const FOLLOW_UP_LABELS: Record<string, string> = { open: 'Open', completed: 'Completed', none: 'None' };

export type ChipKey = Exclude<keyof CallFilters, 'from' | 'to' | 'sort'>;

/** One removable chip per active filter other than the date range. */
export const activeFilterChips = (filters: CallFilters, repNames: Map<string, string>) => {
  const chips: Array<{ key: ChipKey; label: string }> = [];
  if (filters.repId) chips.push({ key: 'repId', label: `Salesperson: ${repNames.get(filters.repId) ?? 'Selected rep'}` });
  if (filters.direction) chips.push({ key: 'direction', label: `${filters.direction.charAt(0).toUpperCase()}${filters.direction.slice(1)} calls` });
  if (filters.minDurationSeconds) chips.push({ key: 'minDurationSeconds', label: `At least ${formatDurationLabel(Number(filters.minDurationSeconds))}` });
  if (filters.maxDurationSeconds) chips.push({ key: 'maxDurationSeconds', label: `At most ${formatDurationLabel(Number(filters.maxDurationSeconds))}` });
  if (filters.phoneSearch.trim()) chips.push({ key: 'phoneSearch', label: `Phone: ${filters.phoneSearch.trim()}` });
  if (filters.tag.trim()) chips.push({ key: 'tag', label: `Tag: ${filters.tag.trim()}` });
  if (filters.followUpStatus) chips.push({ key: 'followUpStatus', label: `Follow-up: ${FOLLOW_UP_LABELS[filters.followUpStatus] ?? filters.followUpStatus}` });
  return chips;
};
