import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  DASHBOARD_RANGE_OPTIONS,
  type DashboardCustomRange,
  type DashboardRangeSelection,
} from '../pages/dashboardAnalytics';

interface DashboardDateRangePickerProps {
  preset: DashboardRangeSelection;
  range: DashboardCustomRange;
  onPresetChange: (preset: DashboardRangeSelection) => void;
  onApply: (range: DashboardCustomRange) => void;
}

export const DashboardDateRangePicker = ({ preset, range, onPresetChange, onApply }: DashboardDateRangePickerProps) => {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(parseISO(range.to)));
  const [draftStart, setDraftStart] = useState<Date | null>(() => parseISO(range.from));
  const [draftEnd, setDraftEnd] = useState<Date | null>(() => parseISO(range.to));

  useEffect(() => {
    if (!open) return;
    setDraftStart(parseISO(range.from));
    setDraftEnd(parseISO(range.to));
    setViewMonth(startOfMonth(parseISO(range.to)));
  }, [open, range.from, range.to]);

  const days = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
  }), [viewMonth]);

  const rangeDays = draftStart && draftEnd ? differenceInCalendarDays(draftEnd, draftStart) + 1 : 0;
  const rangeTooLong = rangeDays > 90;

  const selectDay = (day: Date) => {
    if (!draftStart || draftEnd) {
      setDraftStart(day);
      setDraftEnd(null);
      return;
    }
    if (isBefore(day, draftStart)) {
      setDraftStart(day);
      return;
    }
    setDraftEnd(day);
  };

  const apply = () => {
    if (!draftStart || !draftEnd || rangeTooLong) return;
    onApply({ from: format(draftStart, 'yyyy-MM-dd'), to: format(draftEnd, 'yyyy-MM-dd') });
    setOpen(false);
  };

  return (
    <div className="dashboard-date-range-field"><span>Date range</span>
      <select
        aria-label="Date range"
        className="input-field compact-select"
        value={preset}
        onChange={(event) => {
          const next = event.target.value as DashboardRangeSelection;
          if (next === 'custom') setOpen(true);
          else onPresetChange(next);
        }}
      >
        {DASHBOARD_RANGE_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
        <option value="custom">Custom date range</option>
      </select>

      {open && (
        <div className="custom-range-popover" role="dialog" aria-label="Custom date range">
          <div className="custom-range-summary">
            <div><span>Start date</span><strong>{draftStart ? format(draftStart, 'd MMM yyyy') : 'Select start'}</strong></div>
            <div><span>End date</span><strong>{draftEnd ? format(draftEnd, 'd MMM yyyy') : 'Select end'}</strong></div>
          </div>
          <div className="custom-range-calendar-header">
            <button type="button" aria-label="Previous month" onClick={() => setViewMonth((current) => addMonths(current, -1))}><ChevronLeft size={18} /></button>
            <strong><CalendarDays size={17} /> {format(viewMonth, 'MMMM yyyy')}</strong>
            <button type="button" aria-label="Next month" disabled={!isBefore(endOfMonth(viewMonth), new Date())} onClick={() => setViewMonth((current) => addMonths(current, 1))}><ChevronRight size={18} /></button>
          </div>
          <div className="custom-range-weekdays" aria-hidden="true">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="custom-range-calendar-grid">
            {days.map((day) => {
              const selectedStart = Boolean(draftStart && isSameDay(day, draftStart));
              const selectedEnd = Boolean(draftEnd && isSameDay(day, draftEnd));
              const inRange = Boolean(draftStart && draftEnd && isAfter(day, draftStart) && isBefore(day, draftEnd));
              const future = isAfter(day, new Date());
              return (
                <button
                  type="button"
                  key={format(day, 'yyyy-MM-dd')}
                  aria-label={`Select ${format(day, 'yyyy-MM-dd')}`}
                  className={`${!isSameMonth(day, viewMonth) ? 'outside-month ' : ''}${inRange ? 'in-range ' : ''}${selectedStart || selectedEnd ? 'range-edge' : ''}`.trim()}
                  disabled={future}
                  onClick={() => selectDay(day)}
                >{format(day, 'd')}</button>
              );
            })}
          </div>
          {rangeTooLong && <p className="custom-range-error">Choose a range of 90 days or less.</p>}
          <div className="custom-range-actions">
            <button type="button" className="secondary-button" onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary" disabled={!draftStart || !draftEnd || rangeTooLong} onClick={apply}>Apply range</button>
          </div>
        </div>
      )}
    </div>
  );
};
