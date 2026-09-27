import { describe, expect, it } from 'vitest';
import {
  activeFilterChips,
  createDefaultFilters,
  describeDateRange,
  formatDurationLabel,
  matchCallDatePreset,
  resolveCallDatePreset,
  rollDatePresetForward,
} from './callHistoryFilters';

const NOW = new Date('2026-09-28T10:00:00');

describe('callHistoryFilters', () => {
  it('resolves and recognises date presets', () => {
    expect(resolveCallDatePreset('today', NOW)).toEqual({ from: '2026-09-28', to: '2026-09-28' });
    expect(resolveCallDatePreset('yesterday', NOW)).toEqual({ from: '2026-09-27', to: '2026-09-27' });
    expect(resolveCallDatePreset('last_7', NOW)).toEqual({ from: '2026-09-22', to: '2026-09-28' });
    expect(resolveCallDatePreset('last_30', NOW)).toEqual({ from: '2026-08-30', to: '2026-09-28' });
    expect(matchCallDatePreset('2026-09-22', '2026-09-28', NOW)).toBe('last_7');
    expect(matchCallDatePreset('2026-08-27', '2026-09-27', NOW)).toBeNull();
  });

  it('labels ranges with the preset name when one matches', () => {
    expect(describeDateRange('2026-09-28', '2026-09-28', NOW)).toBe('Today (28 Sep 2026)');
    expect(describeDateRange('2026-09-22', '2026-09-28', NOW)).toBe('Last 7 days (22 Sep – 28 Sep 2026)');
    expect(describeDateRange('2026-08-27', '2026-09-27', NOW)).toBe('27 Aug – 27 Sep 2026');
    expect(describeDateRange('2025-12-30', '2026-01-02', NOW)).toBe('30 Dec 2025 – 2 Jan 2026');
  });

  it('formats durations in minutes and seconds', () => {
    expect(formatDurationLabel(45)).toBe('45 s');
    expect(formatDurationLabel(120)).toBe('2 min');
    expect(formatDurationLabel(160)).toBe('2 min 40 s');
  });

  it('builds one chip per active filter, excluding dates and sort', () => {
    const filters = { ...createDefaultFilters(NOW), repId: 'rep-1', direction: 'outgoing', minDurationSeconds: '160', tag: ' hot ', followUpStatus: 'open' };
    expect(activeFilterChips(filters, new Map([['rep-1', 'Asha']])).map((chip) => chip.label)).toEqual([
      'Salesperson: Asha',
      'Outgoing calls',
      'At least 2 min 40 s',
      'Tag: hot',
      'Follow-up: Open',
    ]);
    expect(activeFilterChips(createDefaultFilters(NOW), new Map())).toEqual([]);
  });

  it('moves a preset range saved on an earlier day to today, and keeps custom ranges', () => {
    const savedToday = { ...createDefaultFilters(new Date('2026-09-27T23:50:00')), direction: 'outgoing' };
    expect(rollDatePresetForward(savedToday, '2026-09-27', NOW)).toMatchObject({ from: '2026-09-28', to: '2026-09-28', direction: 'outgoing' });

    const savedWeek = { ...createDefaultFilters(NOW), from: '2026-09-21', to: '2026-09-27' };
    expect(rollDatePresetForward(savedWeek, '2026-09-27', NOW)).toMatchObject({ from: '2026-09-22', to: '2026-09-28' });

    const custom = { ...createDefaultFilters(NOW), from: '2026-08-27', to: '2026-09-27' };
    expect(rollDatePresetForward(custom, '2026-09-27', NOW)).toBe(custom);
    expect(rollDatePresetForward(savedToday, undefined, NOW)).toBe(savedToday);
  });
});
