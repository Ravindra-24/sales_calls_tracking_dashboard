import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Coffee, Info, PhoneCall, RefreshCw, Sunrise, Timer } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { api, getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/auth';
import type { ApiResponse, TeamMember } from '../types/api';
import type { ActivityDay, ActivityReport, ActivitySettings } from '../types/activity';
import {
  ACTIVITY_RANGE_OPTIONS,
  SLOT_MINUTES,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  describeSettings,
  formatMinute,
  formatMinutes,
  heatStep,
  heatmapLookup,
  percent,
  resolveActivityRange,
  timelineHours,
  workingHourColumns,
  type ActivityRangePreset,
} from './activityView';
import '../styles/activity.css';

const median = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const shareLabel = (active: number, total: number) => {
  const share = percent(active, total);
  return share === null ? '—' : `${share}%`;
};

interface TimelineRowProps {
  label: string;
  day: ActivityDay;
  settings: ActivitySettings;
  onHover: (text: string | null) => void;
}

const TimelineRow = ({ label, day, settings, onHover }: TimelineRowProps) => {
  const hours = timelineHours(settings);
  const startSlot = (hours.start * 60) / SLOT_MINUTES;
  const endSlot = (hours.end * 60) / SLOT_MINUTES;
  const spanMinutes = (hours.end - hours.start) * 60;
  const position = (minute: number) =>
    `${((Math.min(Math.max(minute, hours.start * 60), hours.end * 60) - hours.start * 60) / spanMinutes) * 100}%`;

  const slotClass: Record<string, string> = {
    '1': 'is-active',
    '0': 'is-pause',
    b: 'is-break',
    '.': 'is-outside',
  };
  const slotText: Record<string, string> = {
    '1': 'call activity',
    '0': 'short pause',
    b: 'scheduled break',
    '.': 'outside working hours',
  };

  const summary = `${label}: ${day.callCount} call${day.callCount === 1 ? '' : 's'}, ${formatMinutes(day.noActivityMinutes)} with no call activity across ${day.noActivityGaps.length} gap${day.noActivityGaps.length === 1 ? '' : 's'}, calls in ${shareLabel(day.activeSlots, day.windowSlots)} of working time.`;

  return (
    <div className="activity-timeline-row">
      <div className="activity-timeline-label">
        <strong>{label}</strong>
        <small>{day.callCount} call{day.callCount === 1 ? '' : 's'} · {formatMinute(day.firstActivityMinute)}–{formatMinute(day.lastActivityMinute)}</small>
      </div>
      <div className="activity-timeline-track" role="img" aria-label={summary}>
        {Array.from(day.slots.slice(startSlot, endSlot)).map((code, index) => {
          const slotStart = (startSlot + index) * SLOT_MINUTES;
          const text = `${formatMinute(slotStart)}–${formatMinute(slotStart + SLOT_MINUTES)} · ${slotText[code] ?? ''}`;
          return (
            <span
              key={slotStart}
              className={`activity-slot ${slotClass[code] ?? 'is-outside'}`}
              onMouseEnter={() => onHover(`${label} · ${text}`)}
              onMouseLeave={() => onHover(null)}
            />
          );
        })}
        {day.noActivityGaps.map((gap) => {
          const text = `${label} · no call activity ${formatMinute(gap.startMinute)}–${formatMinute(gap.endMinute)} (${formatMinutes(gap.endMinute - gap.startMinute)})`;
          return (
            <span
              key={gap.startMinute}
              className="activity-gap"
              style={{
                left: position(gap.startMinute),
                width: `calc(${position(gap.endMinute)} - ${position(gap.startMinute)})`,
              }}
              title={text}
              onMouseEnter={() => onHover(text)}
              onMouseLeave={() => onHover(null)}
            />
          );
        })}
      </div>
      <div className="activity-timeline-meta">
        <strong>{formatMinutes(day.noActivityMinutes)}</strong>
        <small>no activity</small>
      </div>
    </div>
  );
};

const TimelineAxis = ({ settings }: { settings: ActivitySettings }) => {
  const hours = timelineHours(settings);
  const ticks = Array.from({ length: hours.end - hours.start + 1 }, (_, index) => hours.start + index);
  const step = ticks.length > 14 ? 2 : 1;
  return (
    <div className="activity-timeline-row activity-timeline-axis" aria-hidden="true">
      <div />
      <div className="activity-axis-ticks">
        {ticks.map((hour, index) => (
          index % step === 0 ? (
            <span key={hour} style={{ left: `${(index / (ticks.length - 1)) * 100}%` }}>
              {String(hour).padStart(2, '0')}:00
            </span>
          ) : null
        ))}
      </div>
      <div />
    </div>
  );
};

export const Activity = () => {
  const { claims, user } = useAuth();
  const isSalesMember = claims.role === 'sales_member';
  const [rangePreset, setRangePreset] = useState<ActivityRangePreset>('last_7');
  const [repId, setRepId] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [report, setReport] = useState<ActivityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timelineDate, setTimelineDate] = useState('');
  const [hoverText, setHoverText] = useState<string | null>(null);

  const range = useMemo(() => resolveActivityRange(rangePreset), [rangePreset]);

  useEffect(() => {
    if (!claims.orgId || isSalesMember) return;
    api.get<ApiResponse<TeamMember[]>>(`/orgs/${claims.orgId}/users`, { params: { limit: 100 } })
      .then((response) => setMembers(response.data.data))
      .catch(() => setMembers([]));
  }, [claims.orgId, isSalesMember]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<ApiResponse<ActivityReport>>('/stats/activity', {
        params: { from: range.from, to: range.to, repId: repId || undefined },
      });
      setReport(response.data.data);
    } catch (requestError) {
      setReport(null);
      setError(getApiErrorMessage(requestError, 'Failed to load activity.'));
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, repId]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const repName = useCallback((id: string) => {
    if (isSalesMember) return user?.displayName || 'You';
    const member = members.find((candidate) => candidate.id === id);
    return member ? member.name || member.email : 'Former member';
  }, [isSalesMember, members, user?.displayName]);

  const reps = useMemo(
    () => [...(report?.byRep ?? [])].sort((a, b) => (
      (percent(b.activeSlots, b.windowSlots) ?? -1) - (percent(a.activeSlots, a.windowSlots) ?? -1)
    )),
    [report],
  );

  const datesWithData = useMemo(() => {
    const dates = new Set<string>();
    reps.forEach((rep) => rep.days.forEach((day) => dates.add(day.date)));
    return [...dates].sort().reverse();
  }, [reps]);

  useEffect(() => {
    if (!datesWithData.includes(timelineDate)) setTimelineDate(datesWithData[0] ?? '');
  }, [datesWithData, timelineDate]);

  const singleRep = isSalesMember || Boolean(repId);
  const timelineRows = useMemo(() => {
    if (singleRep) {
      const rep = reps[0];
      return rep ? [...rep.days].reverse().map((day) => ({
        key: day.date,
        label: format(parseISO(day.date), 'EEE d MMM'),
        day,
      })) : [];
    }
    return reps.flatMap((rep) => {
      const day = rep.days.find((candidate) => candidate.date === timelineDate);
      return day ? [{ key: rep.repId, label: repName(rep.repId), day }] : [];
    });
  }, [repName, reps, singleRep, timelineDate]);

  const team = report?.team;
  const firstCallMedian = median(
    reps.flatMap((rep) => rep.days.map((day) => day.firstActivityMinute)),
  );
  const settings = report?.settings;
  const hourColumns = settings ? workingHourColumns(settings) : [];
  const heatmap = heatmapLookup(team?.heatmap ?? []);
  const heatWeekdays = WEEKDAY_ORDER.filter((weekday) => (
    team?.heatmap.some((cell) => cell.weekday === weekday && cell.windowSlots > 0)
  ));
  const threshold = settings?.idleThresholdMinutes ?? 30;

  return (
    <div className="page animate-fade-in activity-page">
      <div className="page-header dashboard-page-header">
        <div>
          <p className="eyebrow">Team &amp; field</p>
          <h1>{isSalesMember ? 'My activity' : 'Team activity'}</h1>
          <p>
            When calls happened during working hours
            {settings ? ` (${describeSettings(settings)})` : ''}, and the stretches of {threshold}+ minutes with none.
          </p>
        </div>
        <div className="dashboard-filters" aria-label="Activity filters">
          {!isSalesMember && (
            <label>Representative
              <select className="input-field compact-select" value={repId} onChange={(event) => setRepId(event.target.value)}>
                <option value="">All representatives</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.name || member.email}{member.status === 'disabled' ? ' (inactive)' : ''}</option>
                ))}
              </select>
            </label>
          )}
          <label>Date range
            <select className="input-field compact-select" value={rangePreset} onChange={(event) => setRangePreset(event.target.value as ActivityRangePreset)}>
              {ACTIVITY_RANGE_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button className="secondary-button" onClick={() => void loadReport()} aria-label="Refresh activity">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && <div className="notice error-notice">{error}</div>}

      <div className="notice activity-caveat">
        <Info size={16} />
        <span>
          Based on phone calls only. Meetings, WhatsApp calls and email don&apos;t appear here, so a gap means
          &ldquo;no calls&rdquo;, not &ldquo;not working&rdquo;. Days with fewer than 3 calls in working hours count as days off and aren&apos;t scored
          {team?.daysOff ? ` (${team.daysOff} in this range)` : ''}. Missed incoming calls don&apos;t count as activity.
          {claims.role === 'org_admin' ? ' Working hours, break and threshold are set in Settings.' : ''}
        </span>
      </div>

      <div className="stats-grid" aria-busy={loading}>
        <div className="stat-card section-card">
          <div className="stat-icon blue"><PhoneCall /></div>
          <div>
            <p>Working time with calls</p>
            <strong>{loading || !team ? '—' : shareLabel(team.activeSlots, team.windowSlots)}</strong>
            <small>15-minute blocks with at least one call</small>
          </div>
        </div>
        <div className="stat-card section-card">
          <div className="stat-icon orange"><Timer /></div>
          <div>
            <p>No call activity / rep-day</p>
            <strong>{loading || !team?.activeRepDays ? '—' : formatMinutes(team.noActivityMinutes / team.activeRepDays)}</strong>
            <small>{loading || !team?.activeRepDays ? '' : `${(team.noActivityBlocks / team.activeRepDays).toFixed(1)} gaps of ${threshold}+ min per day`}</small>
          </div>
        </div>
        <div className="stat-card section-card">
          <div className="stat-icon violet"><Clock /></div>
          <div>
            <p>Talk time / rep-day</p>
            <strong>{loading || !team?.activeRepDays ? '—' : formatMinutes(team.talkSeconds / 60 / team.activeRepDays)}</strong>
            <small>{loading || !team?.activeRepDays ? '' : `${Math.round(team.callCount / team.activeRepDays)} calls per day`}</small>
          </div>
        </div>
        <div className="stat-card section-card">
          <div className="stat-icon green"><Sunrise /></div>
          <div>
            <p>Typical first call</p>
            <strong>{loading ? '—' : formatMinute(firstCallMedian)}</strong>
            <small>{settings ? `Working day starts ${settings.workStart}` : ''}</small>
          </div>
        </div>
      </div>

      {!singleRep && (
        <div className="section-card table-card">
          <div className="section-heading table-heading">
            <div><h2>By representative</h2><p>Averages per day with calls. Select a row to see that rep&apos;s days.</p></div>
          </div>
          <div className="table-scroll">
            <table className="data-table activity-table">
              <thead>
                <tr>
                  <th>Representative</th>
                  <th>Days</th>
                  <th>Calls / day</th>
                  <th>First call</th>
                  <th>Last call</th>
                  <th>Talk / day</th>
                  <th>No activity / day</th>
                  <th>Longest gap</th>
                  <th>Working time with calls</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="table-message">Loading activity…</td></tr>
                ) : reps.length === 0 ? (
                  <tr><td colSpan={9} className="table-message">No calls in this range.</td></tr>
                ) : reps.map((rep) => {
                  const share = percent(rep.activeSlots, rep.windowSlots);
                  return (
                    <tr key={rep.repId} className="activity-table-row" onClick={() => setRepId(rep.repId)}>
                      <td data-label="Rep">
                        <button type="button" className="activity-rep-link" onClick={() => setRepId(rep.repId)}>{repName(rep.repId)}</button>
                      </td>
                      <td data-label="Days">{rep.activeDays}</td>
                      <td data-label="Calls / day">{Math.round(rep.callCount / rep.activeDays)}</td>
                      <td data-label="First call">{formatMinute(rep.medianFirstActivityMinute)}</td>
                      <td data-label="Last call">{formatMinute(rep.medianLastActivityMinute)}</td>
                      <td data-label="Talk / day">{formatMinutes(rep.talkSeconds / 60 / rep.activeDays)}</td>
                      <td data-label="No activity / day">
                        <span>
                          {formatMinutes(rep.noActivityMinutes / rep.activeDays)}
                          <small className="activity-cell-detail">{(rep.noActivityBlocks / rep.activeDays).toFixed(1)} gaps</small>
                        </span>
                      </td>
                      <td data-label="Longest gap">{formatMinutes(rep.longestGapMinutes)}</td>
                      <td data-label="Working time with calls">
                        <div className="activity-share">
                          <span className="activity-share-bar"><i style={{ width: `${share ?? 0}%` }} /></span>
                          <span>{share === null ? '—' : `${share}%`}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section className="section-card activity-timeline-card">
        <div className="section-heading activity-section-heading">
          <div>
            <h2>Day timeline</h2>
            <p>
              {singleRep
                ? `${repName(reps[0]?.repId ?? repId)} — each day with calls in the range.`
                : 'Every representative on one day.'}
            </p>
          </div>
          <div className="activity-heading-actions">
            {!singleRep && datesWithData.length > 0 && (
              <label>Day
                <select className="input-field compact-select" value={timelineDate} onChange={(event) => setTimelineDate(event.target.value)}>
                  {datesWithData.map((date) => (
                    <option key={date} value={date}>{format(parseISO(date), 'EEE d MMM')}</option>
                  ))}
                </select>
              </label>
            )}
            {!isSalesMember && repId && (
              <button type="button" className="secondary-button" onClick={() => setRepId('')}>All representatives</button>
            )}
          </div>
        </div>

        <ul className="activity-legend" aria-label="Timeline legend">
          <li><span className="activity-swatch is-active" />Call activity</li>
          <li><span className="activity-swatch is-gap" />No calls for {threshold}+ min</li>
          <li><span className="activity-swatch is-pause" />Short pause</li>
          <li><span className="activity-swatch is-break" /><Coffee size={13} aria-hidden="true" />Scheduled break</li>
        </ul>

        {loading ? (
          <div className="empty-state">Loading timeline…</div>
        ) : timelineRows.length === 0 || !settings ? (
          <div className="empty-state">No calls to show for this selection.</div>
        ) : (
          <div className="activity-timeline" onMouseLeave={() => setHoverText(null)}>
            {timelineRows.map((row) => (
              <TimelineRow key={row.key} label={row.label} day={row.day} settings={settings} onHover={setHoverText} />
            ))}
            <TimelineAxis settings={settings} />
          </div>
        )}
        <p className="activity-hover" aria-live="polite">{hoverText ?? 'Hover the timeline for times.'}</p>
      </section>

      <section className="section-card activity-heatmap-card">
        <div className="section-heading activity-section-heading">
          <div>
            <h2>When calls happen</h2>
            <p>Share of 15-minute working blocks with a call, by weekday and hour{singleRep ? '' : ' (whole team)'}.</p>
          </div>
        </div>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : heatWeekdays.length === 0 ? (
          <div className="empty-state">No calls in working hours for this range.</div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="activity-heatmap" onMouseLeave={() => setHoverText(null)}>
                <thead>
                  <tr>
                    <th scope="col"><span className="sr-only">Weekday</span></th>
                    {hourColumns.map((hour) => <th scope="col" key={hour}>{String(hour).padStart(2, '0')}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {heatWeekdays.map((weekday) => (
                    <tr key={weekday}>
                      <th scope="row">{WEEKDAY_LABELS[weekday]}</th>
                      {hourColumns.map((hour) => {
                        const cell = heatmap.get(`${weekday}_${hour}`);
                        const share = cell ? percent(cell.activeSlots, cell.windowSlots) : null;
                        const step = heatStep(share);
                        const text = `${WEEKDAY_LABELS[weekday]} ${String(hour).padStart(2, '0')}:00 · ${share === null ? 'outside working hours' : `calls in ${share}% of blocks (${cell?.activeSlots}/${cell?.windowSlots})`}`;
                        return (
                          <td
                            key={hour}
                            className={step ? `heat-${step}` : 'heat-none'}
                            title={text}
                            onMouseEnter={() => setHoverText(text)}
                          >
                            {share === null ? '' : share}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="activity-heat-scale" aria-hidden="true">
              <span>Fewer calls</span>
              {[1, 2, 3, 4, 5].map((step) => <i key={step} className={`heat-${step}`} />)}
              <span>More calls</span>
            </div>
          </>
        )}
      </section>
    </div>
  );
};
