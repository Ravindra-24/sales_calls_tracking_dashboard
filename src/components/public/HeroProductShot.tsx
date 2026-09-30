import {
  BellRing,
  BrainCircuit,
  CalendarClock,
  ChartNoAxesGantt,
  Clock,
  LayoutDashboard,
  MapPin,
  Percent,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Route,
  Smartphone,
  Target,
  Users,
} from 'lucide-react';

/*
 * Illustrative, code-rendered replica of the manager dashboard for the public
 * home page. Every name and number here is sample data, never customer data.
 */

const navigation = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: PhoneCall, label: 'Call History' },
  { icon: BrainCircuit, label: 'Leads' },
  { icon: Target, label: 'Targets' },
  { icon: Users, label: 'Team Management' },
  { icon: ChartNoAxesGantt, label: 'Team Activity' },
  { icon: MapPin, label: 'Live Tracking' },
  { icon: Route, label: 'Visits & Routes' },
];

const stats = [
  { icon: PhoneCall, label: 'Total calls', value: '1,284', tone: 'blue' },
  { icon: PhoneIncoming, label: 'Connected', value: '842', tone: 'green' },
  { icon: Percent, label: 'Connect rate', value: '66%', tone: 'green' },
  { icon: Clock, label: 'Talk time', value: '38h 12m', tone: 'violet' },
];

const trend = [
  { day: 'Thu', calls: 168 },
  { day: 'Fri', calls: 204 },
  { day: 'Sat', calls: 131 },
  { day: 'Sun', calls: 42 },
  { day: 'Mon', calls: 236 },
  { day: 'Tue', calls: 259 },
  { day: 'Wed', calls: 244 },
];

const reps = [
  { name: 'Aarav Kulkarni', calls: 312, talk: '9h 40m', connected: 71, notConnected: 19 },
  { name: 'Sneha Patil', calls: 287, talk: '8h 55m', connected: 68, notConnected: 22 },
  { name: 'Rohan Deshmukh', calls: 241, talk: '7h 18m', connected: 62, notConnected: 25 },
  { name: 'Priya Joshi', calls: 198, talk: '6h 02m', connected: 64, notConnected: 21 },
];

const maximumCalls = Math.max(...trend.map((day) => day.calls));

export const HeroProductShot = () => (
  <div className="lw-dash" role="img" aria-label="Illustrative Smartly Manage dashboard with sample team call activity">
    <div className="lw-dash-window" aria-hidden="true">
      <div className="lw-dash-chrome">
        <span className="lw-dash-dots"><i /><i /><i /></span>
        <span className="lw-dash-url">smartlymanage.com/dashboard</span>
      </div>

      <div className="lw-dash-app">
        <aside className="lw-dash-sidebar">
          <div className="lw-dash-brand">
            <img src="/smartly-manage-icon.webp" alt="" />
            <span>Smartly Manage</span>
          </div>
          <nav>
            {navigation.map((item) => (
              <span className={item.active ? 'is-active' : undefined} key={item.label}>
                <item.icon size={15} /> {item.label}
              </span>
            ))}
          </nav>
        </aside>

        <div className="lw-dash-main">
          <div className="lw-dash-header">
            <div>
              <small>Performance</small>
              <strong>Dashboard overview</strong>
              <span>Team call activity from 24 Sep to 30 Sep 2026</span>
            </div>
            <div className="lw-dash-filters">
              <span>All representatives</span>
              <span>Last 7 days</span>
            </div>
          </div>

          <div className="lw-dash-stats">
            {stats.map((stat) => (
              <div className="lw-dash-stat" key={stat.label}>
                <span className={`lw-dash-stat-icon ${stat.tone}`}><stat.icon size={15} /></span>
                <div><small>{stat.label}</small><strong>{stat.value}</strong></div>
              </div>
            ))}
          </div>

          <div className="lw-dash-panels">
            <section className="lw-dash-panel lw-dash-trend">
              <header><strong>Call trend</strong><small>Call volume across the selected range</small></header>
              <div className="lw-dash-bars">
                {trend.map((day) => (
                  <div key={day.day}>
                    <em>{day.calls}</em>
                    <i style={{ height: `${(day.calls / maximumCalls) * 100}%` }} />
                    <span>{day.day}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="lw-dash-panel lw-dash-reps">
              <header><strong>Rep performance</strong><small>Ranked by total volume</small></header>
              {reps.map((rep, index) => (
                <div className="lw-dash-rep" key={rep.name}>
                  <span className="lw-dash-avatar">{rep.name.charAt(0)}</span>
                  <div>
                    <p><strong>{rep.name}</strong><small>{rep.calls} calls · {rep.talk}</small></p>
                    <span className="lw-dash-stack">
                      <i className="connected" style={{ width: `${rep.connected}%` }} />
                      <i className="not-connected" style={{ width: `${rep.notConnected}%` }} />
                      <i className="missed" style={{ width: `${100 - rep.connected - rep.notConnected}%` }} />
                    </span>
                  </div>
                  <b>{index + 1}</b>
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>
    </div>

    <div className="lw-dash-float lw-dash-float-sync" aria-hidden="true">
      <span className="lw-dash-float-icon"><Smartphone size={16} /></span>
      <div>
        <small>Synced from Android</small>
        <strong>Outgoing call · 4m 12s</strong>
        <span><PhoneOutgoing size={12} /> Sneha Patil → Mehta Traders</span>
      </div>
    </div>

    <div className="lw-dash-float lw-dash-float-follow" aria-hidden="true">
      <span className="lw-dash-float-icon warm"><BellRing size={16} /></span>
      <div>
        <small>Follow-up due</small>
        <strong>Send revised quote</strong>
        <span><CalendarClock size={12} /> Today, 4:30 PM</span>
      </div>
    </div>
  </div>
);
