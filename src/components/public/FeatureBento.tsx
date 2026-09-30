import {
  Building2,
  CalendarClock,
  Check,
  Minus,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Play,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { productOutcomes } from '../../pages/publicContent';
import { Reveal } from './Reveal';

type Visual = (typeof productOutcomes)[number]['visual'];

/* Sample data only — these tiles illustrate the product, they are not live. */

const calls = [
  { icon: PhoneOutgoing, tone: 'outgoing', contact: 'Mehta Traders', rep: 'Sneha Patil', meta: '4m 12s', time: '11:42' },
  { icon: PhoneIncoming, tone: 'incoming', contact: 'Kale Agencies', rep: 'Aarav Kulkarni', meta: '2m 05s', time: '11:18' },
  { icon: PhoneMissed, tone: 'missed', contact: 'Shree Enterprises', rep: 'Rohan Deshmukh', meta: 'Missed', time: '10:57' },
  { icon: PhoneOutgoing, tone: 'outgoing', contact: 'Om Distributors', rep: 'Priya Joshi', meta: '6m 48s', time: '10:31' },
];

const stages = [
  { label: 'New', count: 18 },
  { label: 'Contacted', count: 11 },
  { label: 'Proposal', count: 6, active: true },
  { label: 'Won', count: 4 },
];

const roles = [
  { icon: Building2, role: 'Org admin', access: [true, true, true] },
  { icon: UsersRound, role: 'Manager', access: [false, true, true] },
  { icon: UserRound, role: 'Sales member', access: [false, false, true] },
];

const accessColumns = ['Organization settings', 'Team activity', 'Own calls & leads'];

const CallsVisual = () => (
  <div className="lw-bento-calls">
    {calls.map((call) => (
      <div className="lw-bento-call" key={call.contact}>
        <span className={`lw-bento-call-icon ${call.tone}`}><call.icon size={14} /></span>
        <p><strong>{call.contact}</strong><small>{call.rep}</small></p>
        <em className={call.tone}>{call.meta}</em>
        <time>{call.time}</time>
      </div>
    ))}
  </div>
);

const LeadsVisual = () => (
  <div className="lw-bento-leads">
    <div className="lw-bento-stages">
      {stages.map((stage) => (
        <span className={stage.active ? 'is-active' : undefined} key={stage.label}>
          {stage.label}<b>{stage.count}</b>
        </span>
      ))}
    </div>
    <div className="lw-bento-lead">
      <p><strong>Mehta Traders</strong><span>Proposal</span></p>
      <small>Last call · 4m 12s · Sneha Patil</small>
      <div><CalendarClock size={13} /> Next: send revised quote · Today, 4:30 PM</div>
    </div>
  </div>
);

const FieldVisual = () => (
  <div className="lw-bento-field">
    <svg viewBox="0 0 320 170" preserveAspectRatio="xMidYMid slice">
      <g className="streets">
        <path d="M0 42 H320 M0 118 H320 M70 0 V170 M188 0 V170 M262 0 V170" />
        <path d="M0 160 L120 0 M150 170 L320 60" />
      </g>
      <path className="route" d="M36 136 C70 128 82 96 118 90 S176 62 204 58 S250 40 284 30" />
      <circle className="stop" cx="118" cy="90" r="6" />
      <circle className="stop" cx="204" cy="58" r="6" />
      <circle className="rep" cx="284" cy="30" r="7" />
      <circle className="rep-pulse" cx="284" cy="30" r="14" />
    </svg>
    <span className="lw-bento-shift"><Play size={11} /> Shift started by rep · 9:12 AM</span>
    <span className="lw-bento-visits">2 visits logged</span>
  </div>
);

const AccessVisual = () => (
  <div className="lw-bento-access">
    <div className="lw-bento-access-head">
      <span />
      {accessColumns.map((column) => <span key={column}>{column}</span>)}
    </div>
    {roles.map((row) => (
      <div className="lw-bento-access-row" key={row.role}>
        <span><row.icon size={14} /> {row.role}</span>
        {row.access.map((allowed, index) => (
          <span className={allowed ? 'is-allowed' : undefined} key={accessColumns[index]}>
            {allowed ? <Check size={13} /> : <Minus size={13} />}
          </span>
        ))}
      </div>
    ))}
  </div>
);

const visuals: Record<Visual, ComponentType> = {
  calls: CallsVisual,
  leads: LeadsVisual,
  field: FieldVisual,
  access: AccessVisual,
};

export const FeatureBento = () => (
  <div className="lw-bento">
    {productOutcomes.map((outcome, index) => {
      const VisualComponent = visuals[outcome.visual];
      return (
        <Reveal as="article" className={`lw-bento-tile lw-bento-${outcome.visual}-tile`} delay={index * 70} key={outcome.title}>
          <div className="lw-bento-visual" aria-hidden="true"><VisualComponent /></div>
          <div className="lw-bento-copy">
            <h3><outcome.icon size={17} /> {outcome.title}</h3>
            <p>{outcome.copy}</p>
          </div>
        </Reveal>
      );
    })}
  </div>
);
