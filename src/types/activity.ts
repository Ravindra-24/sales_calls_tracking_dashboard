/** Mirrors GCF/functions/src/services/activityCore.ts (GET /stats/activity). */

export interface ActivitySettings {
  timezone: string;
  workStart: string;
  workEnd: string;
  breakStart: string | null;
  breakEnd: string | null;
  idleThresholdMinutes: number;
}

export interface ActivityGap {
  /** Local minute-of-day. */
  startMinute: number;
  endMinute: number;
}

export interface ActivityDay {
  date: string;
  weekday: number;
  callCount: number;
  talkSeconds: number;
  firstActivityMinute: number;
  lastActivityMinute: number;
  windowMinutes: number;
  noActivityMinutes: number;
  noActivityGaps: ActivityGap[];
  longestGapMinutes: number;
  activeSlots: number;
  windowSlots: number;
  /**
   * One char per 15-minute slot: '1' call activity, '0' no activity inside
   * working hours, 'b' scheduled break, '.' outside working hours.
   */
  slots: string;
}

export interface HourActivity {
  hour: number;
  activeSlots: number;
  windowSlots: number;
}

export interface RepActivity {
  repId: string;
  activeDays: number;
  callCount: number;
  talkSeconds: number;
  windowMinutes: number;
  noActivityMinutes: number;
  noActivityBlocks: number;
  longestGapMinutes: number;
  activeSlots: number;
  windowSlots: number;
  medianFirstActivityMinute: number | null;
  medianLastActivityMinute: number | null;
  hourly: HourActivity[];
  days: ActivityDay[];
}

export interface HeatmapCell {
  weekday: number;
  hour: number;
  activeSlots: number;
  windowSlots: number;
}

export interface ActivityReport {
  range: { from: string; to: string };
  settings: ActivitySettings;
  team: {
    activeRepDays: number;
    /** Rep-days with a few calls but fewer than 3 in working hours. */
    daysOff: number;
    callCount: number;
    talkSeconds: number;
    windowMinutes: number;
    noActivityMinutes: number;
    noActivityBlocks: number;
    activeSlots: number;
    windowSlots: number;
    heatmap: HeatmapCell[];
  };
  byRep: RepActivity[];
}
