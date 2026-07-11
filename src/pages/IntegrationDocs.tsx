import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  KeyRound,
  LockKeyhole,
  Server,
  ShieldCheck,
  Webhook,
} from 'lucide-react';
import { BACKEND_URL } from '../api/client';
import { useAuth } from '../context/auth';

const apiBaseUrl = `${BACKEND_URL}/v1`;

const navigation = [
  { href: '#overview', label: 'Overview' },
  { href: '#quick-start', label: 'Quick start' },
  { href: '#plans', label: 'Plans and limits' },
  { href: '#authentication', label: 'Authentication' },
  { href: '#organization', label: 'Get organization' },
  { href: '#team', label: 'List team members' },
  { href: '#calls', label: 'List calls' },
  { href: '#statistics', label: 'Team statistics' },
  { href: '#pagination', label: 'Pagination' },
  { href: '#webhooks', label: 'Webhooks' },
  { href: '#errors', label: 'Errors' },
  { href: '#go-live', label: 'Go-live checklist' },
];

const curlExample = `curl "${apiBaseUrl}/calls?limit=50" \\
  -H "Authorization: Bearer $LEADWATCH_API_KEY"`;

const organizationResponse = `{
  "success": true,
  "data": {
    "id": "org_01JZ...",
    "name": "Northstar Sales",
    "plan": "growth",
    "status": "active",
    "settings": {
      "timezone": "Asia/Kolkata",
      "workingHoursStart": "09:00",
      "workingHoursEnd": "18:00"
    },
    "createdAt": "2026-06-18T08:40:21.000Z",
    "updatedAt": "2026-07-10T11:12:30.000Z"
  }
}`;

const teamResponse = `{
  "success": true,
  "data": [
    {
      "id": "user_8f21",
      "name": "Aarav Shah",
      "email": "aarav@example.com",
      "phoneNumber": "+919876543210",
      "role": "sales_member",
      "status": "active",
      "createdAt": "2026-06-20T09:15:00.000Z",
      "updatedAt": "2026-07-09T14:05:10.000Z"
    }
  ]
}`;

const callsResponse = `{
  "success": true,
  "data": [
    {
      "id": "user_8f21_1842",
      "repId": "user_8f21",
      "rep": {
        "id": "user_8f21",
        "name": "Aarav Shah",
        "email": "aarav@example.com"
      },
      "phoneNumber": "+919812345678",
      "direction": "outgoing",
      "startTime": "2026-07-10T10:30:00.000Z",
      "endTime": "2026-07-10T10:34:42.000Z",
      "durationSeconds": 282,
      "status": "synced",
      "deviceCallLogId": "1842",
      "createdAt": "2026-07-10T10:34:45.000Z",
      "syncedAt": "2026-07-10T10:34:45.000Z"
    }
  ],
  "meta": {
    "limit": 50,
    "nextCursor": "user_4c13_1721"
  }
}`;

const statisticsResponse = `{
  "success": true,
  "data": {
    "range": {
      "from": "2026-07-01",
      "to": "2026-07-10"
    },
    "teamTotals": {
      "totalCalls": 438,
      "totalDurationSeconds": 52380,
      "incomingCount": 118,
      "outgoingCount": 276,
      "missedCount": 44
    },
    "byRep": [
      {
        "repId": "user_8f21",
        "rep": {
          "id": "user_8f21",
          "name": "Aarav Shah",
          "email": "aarav@example.com"
        },
        "totalCalls": 86,
        "totalDurationSeconds": 10420,
        "incomingCount": 22,
        "outgoingCount": 57,
        "missedCount": 7,
        "dailyBreakdown": []
      }
    ]
  }
}`;

const webhookPayload = `{
  "id": "evt_01JZ9F2H5A7KQG3V6M8N",
  "type": "call.created",
  "createdAt": "2026-07-10T10:34:46.000Z",
  "data": {
    "id": "user_8f21_1842",
    "repId": "user_8f21",
    "rep": {
      "id": "user_8f21",
      "name": "Aarav Shah",
      "email": "aarav@example.com"
    },
    "phoneNumber": "+919812345678",
    "direction": "outgoing",
    "startTime": "2026-07-10T10:30:00.000Z",
    "endTime": "2026-07-10T10:34:42.000Z",
    "durationSeconds": 282,
    "status": "synced",
    "deviceCallLogId": "1842",
    "createdAt": "2026-07-10T10:34:45.000Z",
    "syncedAt": "2026-07-10T10:34:45.000Z"
  }
}`;

const verificationExample = `import crypto from "node:crypto";

export function verifyLeadWatchWebhook(rawBody, headers, secret) {
  const timestamp = headers["leadwatch-timestamp"];
  const received = headers["leadwatch-signature"];

  const ageInSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!timestamp || !received || ageInSeconds > 300) return false;

  const expected = "sha256=" + crypto
    .createHmac("sha256", secret)
    .update(timestamp + "." + rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  return expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}`;

const errorResponse = `{
  "success": false,
  "error": {
    "code": "SCOPE_REQUIRED",
    "message": "API key is missing scope 'read:calls'"
  }
}`;

const CodeBlock = ({ code, language = 'json' }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="docs-code-block">
      <div className="docs-code-header">
        <span>{language}</span>
        <button type="button" onClick={copy} title="Copy code">
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
};

const EndpointHeading = ({
  path,
  scope,
  children,
}: {
  path: string;
  scope: string;
  children: React.ReactNode;
}) => (
  <div className="docs-endpoint-heading">
    <div className="docs-endpoint-title">
      <span className="docs-method">GET</span>
      <code>{path}</code>
    </div>
    <p>{children}</p>
    <div className="docs-scope"><LockKeyhole size={14} /> Required scope: <code>{scope}</code></div>
  </div>
);

export const IntegrationDocs = () => {
  const { user } = useAuth();
  const [baseCopied, setBaseCopied] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;
    document.title = 'Organizer API Documentation | LeadWatch';
    if (description) {
      description.content = 'Integrate LeadWatch call data, team statistics, and signed webhooks into your organization platform.';
    }
    return () => {
      document.title = previousTitle;
      if (description && previousDescription) description.content = previousDescription;
    };
  }, []);

  useEffect(() => {
    const updateActiveSection = () => {
      const marker = 110;
      let current = 'overview';

      for (const item of navigation) {
        const section = document.getElementById(item.href.slice(1));
        if (section && section.getBoundingClientRect().top <= marker) {
          current = section.id;
        }
      }

      const atPageEnd = window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      setActiveSection(atPageEnd ? 'go-live' : current);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, []);

  const scrollToSection = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    event.preventDefault();
    const section = document.getElementById(href.slice(1));
    if (!section) return;
    setActiveSection(section.id);
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `${window.location.pathname}${href}`);
  };

  const copyBaseUrl = async () => {
    await navigator.clipboard.writeText(apiBaseUrl);
    setBaseCopied(true);
    window.setTimeout(() => setBaseCopied(false), 1600);
  };

  return (
    <main className="api-docs-page">
      <header className="docs-topbar">
        <Link className="docs-brand" to="/" aria-label="LeadWatch home">
          <span><img src="/favicon.svg" alt="" /></span>
          LeadWatch
        </Link>
        <div className="docs-topbar-title"><BookOpen size={16} /> Organizer API documentation</div>
        <nav>
          <Link to="/"><ArrowLeft size={15} /> Product</Link>
          <Link className="docs-sign-in" to={user ? '/dashboard' : '/login'}>
            {user ? 'Dashboard' : 'Sign in'} <ArrowRight size={15} />
          </Link>
        </nav>
      </header>

      <div className="docs-shell">
        <label className="docs-mobile-navigation">
          <span>On this page</span>
          <select
            value={`#${activeSection}`}
            aria-label="Documentation section"
            onChange={(event) => {
              const href = event.target.value;
              const section = document.getElementById(href.slice(1));
              if (!section) return;
              setActiveSection(section.id);
              section.scrollIntoView({ behavior: 'smooth', block: 'start' });
              window.history.replaceState(null, '', `${window.location.pathname}${href}`);
            }}
          >
            {navigation.map((item) => <option key={item.href} value={item.href}>{item.label}</option>)}
          </select>
        </label>
        <aside className="docs-sidebar" aria-label="Documentation sections">
          <p>Organizer API</p>
          <nav>
            {navigation.map((item) => {
              const sectionId = item.href.slice(1);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={activeSection === sectionId ? 'active' : ''}
                  aria-current={activeSection === sectionId ? 'location' : undefined}
                  onClick={(event) => scrollToSection(event, item.href)}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        </aside>

        <article className="docs-content">
          <section className="docs-intro" id="overview">
            <div className="docs-version"><span /> API v1</div>
            <h1>Connect LeadWatch to your organization platform</h1>
            <p>
              Read call activity, team members, and performance statistics from your own backend.
              Receive signed webhook events when calls and daily totals change.
            </p>
            <div className="docs-base-url">
              <Server size={18} />
              <div><span>Base URL</span><code>{apiBaseUrl}</code></div>
              <button type="button" onClick={copyBaseUrl} title="Copy base URL">
                {baseCopied ? <Check size={17} /> : <Copy size={17} />}
              </button>
            </div>
            <div className="docs-callout info">
              <ShieldCheck size={19} />
              <p><strong>Server-to-server only.</strong> Keep API keys in your backend or secret manager. Never place a key in browser or mobile application code.</p>
            </div>
          </section>

          <section className="docs-section" id="quick-start">
            <p className="docs-eyebrow">Start here</p>
            <h2>Quick start</h2>
            <p>Make your first request in three steps.</p>
            <ol className="docs-steps">
              <li><span>1</span><div><strong>Confirm plan access</strong><p>Your organization must use the Growth or Enterprise plan.</p></div></li>
              <li><span>2</span><div><strong>Create an API key</strong><p>Sign in as an organization admin, open <b>Dashboard → Integrations</b>, choose the required scopes, and create a key.</p></div></li>
              <li><span>3</span><div><strong>Call the API from your backend</strong><p>Send the key in the Authorization header. The key automatically identifies your organization.</p></div></li>
            </ol>
            <CodeBlock code={curlExample} language="bash" />
          </section>

          <section className="docs-section" id="plans">
            <p className="docs-eyebrow">Access control</p>
            <h2>Plans and limits</h2>
            <p>Minute limits apply to each API key. Monthly limits apply across the organization. Revoked keys stop working immediately.</p>
            <div className="docs-table-wrap">
              <table className="docs-table">
                <thead><tr><th>Plan</th><th>API keys</th><th>Webhooks</th><th>Requests/min</th><th>Requests/month</th><th>Query range</th></tr></thead>
                <tbody>
                  <tr><td>Free</td><td colSpan={5}>Integration access is not included</td></tr>
                  <tr><td>Starter</td><td colSpan={5}>Integration access is not included</td></tr>
                  <tr className="highlight"><td>Growth</td><td>2</td><td>2</td><td>60</td><td>50,000</td><td>90 days</td></tr>
                  <tr><td>Enterprise</td><td>10</td><td>10</td><td>300</td><td>1,000,000</td><td>365 days</td></tr>
                </tbody>
              </table>
            </div>
            <p className="docs-note">Webhook delivery attempts use the same monthly allowance shown for API requests. A plan downgrade blocks API requests and new webhook events, but saved configuration is retained.</p>
          </section>

          <section className="docs-section" id="authentication">
            <p className="docs-eyebrow">Security</p>
            <h2>Authentication</h2>
            <p>Every request must include the API key as a bearer token.</p>
            <CodeBlock code={'Authorization: Bearer lwk_live_<key-id>_<secret>'} language="http" />
            <div className="docs-fact-grid">
              <div><KeyRound size={19} /><strong>Shown once</strong><p>Copy the key when it is created. LeadWatch cannot display it again.</p></div>
              <div><ShieldCheck size={19} /><strong>Organization scoped</strong><p>Do not send an organization ID. It is securely resolved from the key.</p></div>
              <div><LockKeyhole size={19} /><strong>Permission scoped</strong><p>Each endpoint requires a matching read scope.</p></div>
            </div>
            <div className="docs-callout warning">
              <KeyRound size={19} />
              <p>If a key is exposed, revoke it from <strong>Dashboard → Integrations</strong> and create a replacement.</p>
            </div>
          </section>

          <section className="docs-section docs-endpoint" id="organization">
            <EndpointHeading path="/org" scope="read:org">Return the organization profile, current plan, status, and operational settings.</EndpointHeading>
            <h3>Example response</h3>
            <CodeBlock code={organizationResponse} />
          </section>

          <section className="docs-section docs-endpoint" id="team">
            <EndpointHeading path="/team" scope="read:team">List active and disabled organization users with their roles and contact identity.</EndpointHeading>
            <h3>Example response</h3>
            <CodeBlock code={teamResponse} />
          </section>

          <section className="docs-section docs-endpoint" id="calls">
            <EndpointHeading path="/calls" scope="read:calls">Return full call metadata in reverse chronological order. The default range is the latest 30 days.</EndpointHeading>
            <h3>Query parameters</h3>
            <div className="docs-table-wrap">
              <table className="docs-table parameters">
                <thead><tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><code>from</code></td><td>ISO 8601 datetime</td><td>No</td><td>Start of the date range, including UTC offset.</td></tr>
                  <tr><td><code>to</code></td><td>ISO 8601 datetime</td><td>No</td><td>End of the date range, including UTC offset.</td></tr>
                  <tr><td><code>repId</code></td><td>string</td><td>No</td><td>Return calls for one team member.</td></tr>
                  <tr><td><code>direction</code></td><td>enum</td><td>No</td><td><code>incoming</code>, <code>outgoing</code>, or <code>missed</code>.</td></tr>
                  <tr><td><code>limit</code></td><td>integer</td><td>No</td><td>1–100 records. Default: 50.</td></tr>
                  <tr><td><code>cursor</code></td><td>string</td><td>No</td><td>The previous response's <code>meta.nextCursor</code>.</td></tr>
                </tbody>
              </table>
            </div>
            <CodeBlock code={`${apiBaseUrl}/calls?from=2026-07-01T00:00:00%2B05:30&to=2026-07-10T23:59:59%2B05:30&direction=outgoing&limit=50`} language="url" />
            <h3>Example response</h3>
            <CodeBlock code={callsResponse} />
          </section>

          <section className="docs-section docs-endpoint" id="statistics">
            <EndpointHeading path="/stats/team" scope="read:stats">Return overall totals, per-representative totals, and daily breakdowns for a date range.</EndpointHeading>
            <h3>Query parameters</h3>
            <div className="docs-table-wrap">
              <table className="docs-table parameters">
                <thead><tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><code>from</code></td><td><code>YYYY-MM-DD</code></td><td>No</td><td>First date to include. Defaults to 30 days ago.</td></tr>
                  <tr><td><code>to</code></td><td><code>YYYY-MM-DD</code></td><td>No</td><td>Last date to include. Defaults to today.</td></tr>
                  <tr><td><code>repId</code></td><td>string</td><td>No</td><td>Return statistics for one team member.</td></tr>
                </tbody>
              </table>
            </div>
            <CodeBlock code={`${apiBaseUrl}/stats/team?from=2026-07-01&to=2026-07-10`} language="url" />
            <h3>Example response</h3>
            <CodeBlock code={statisticsResponse} />
          </section>

          <section className="docs-section" id="pagination">
            <p className="docs-eyebrow">Large result sets</p>
            <h2>Pagination</h2>
            <p>The calls endpoint uses cursor pagination. When more records are available, the response contains <code>meta.nextCursor</code>.</p>
            <ol className="docs-compact-steps">
              <li>Request the first page with your preferred <code>limit</code>.</li>
              <li>Read <code>meta.nextCursor</code> from the response.</li>
              <li>Send that value as the next request's <code>cursor</code>.</li>
              <li>Stop when <code>nextCursor</code> is absent.</li>
            </ol>
            <CodeBlock code={`GET /calls?limit=50\nGET /calls?limit=50&cursor=user_4c13_1721`} language="http" />
          </section>

          <section className="docs-section" id="webhooks">
            <p className="docs-eyebrow">Event delivery</p>
            <h2>Webhooks</h2>
            <p>Webhooks notify your HTTPS endpoint without polling. Configure an endpoint from <strong>Dashboard → Integrations</strong> and store its signing secret securely.</p>
            <div className="docs-event-grid">
              <div><Webhook size={18} /><code>call.created</code><p>A new call record was synchronized.</p></div>
              <div><Webhook size={18} /><code>daily_stats.updated</code><p>A representative's daily totals changed.</p></div>
              <div><Webhook size={18} /><code>webhook.test</code><p>A manual test sent from the Integrations page. It is not a subscription event.</p></div>
            </div>

            <h3>Delivery headers</h3>
            <div className="docs-table-wrap">
              <table className="docs-table parameters">
                <thead><tr><th>Header</th><th>Purpose</th></tr></thead>
                <tbody>
                  <tr><td><code>LeadWatch-Event-Id</code></td><td>Stable identifier used to deduplicate retries.</td></tr>
                  <tr><td><code>LeadWatch-Event-Type</code></td><td>The event type sent in this request.</td></tr>
                  <tr><td><code>LeadWatch-Timestamp</code></td><td>Unix timestamp used in signature verification.</td></tr>
                  <tr><td><code>LeadWatch-Signature</code></td><td>HMAC SHA-256 signature in <code>sha256=...</code> format.</td></tr>
                </tbody>
              </table>
            </div>

            <h3>Example payload</h3>
            <CodeBlock code={webhookPayload} />

            <h3>Verify the signature</h3>
            <p>Build the signed value as <code>timestamp.rawRequestBody</code>. Verify it before parsing the JSON body and reject timestamps older than five minutes.</p>
            <CodeBlock code={verificationExample} language="javascript" />

            <div className="docs-retry-row">
              <Clock3 size={20} />
              <div><strong>Delivery and retries</strong><p>Any 2xx response is successful. Failed requests are attempted up to five times with delays of approximately 1, 5, 30, and 120 minutes. Delivery is at least once, so always deduplicate by event ID.</p></div>
            </div>
            <p className="docs-note">Webhook URLs must use HTTPS, resolve to public IP addresses, and respond within 8 seconds. Redirects are not followed.</p>
          </section>

          <section className="docs-section" id="errors">
            <p className="docs-eyebrow">Troubleshooting</p>
            <h2>Errors</h2>
            <p>All errors use a consistent JSON structure.</p>
            <CodeBlock code={errorResponse} />
            <div className="docs-table-wrap">
              <table className="docs-table parameters">
                <thead><tr><th>HTTP</th><th>Code</th><th>Meaning</th></tr></thead>
                <tbody>
                  <tr><td>400</td><td><code>VALIDATION_ERROR</code></td><td>A parameter or request value is invalid.</td></tr>
                  <tr><td>401</td><td><code>UNAUTHORIZED</code></td><td>The API key is missing, invalid, or revoked.</td></tr>
                  <tr><td>403</td><td><code>SCOPE_REQUIRED</code></td><td>The key does not include the endpoint's scope.</td></tr>
                  <tr><td>403</td><td><code>PLAN_UPGRADE_REQUIRED</code></td><td>The organization plan does not include API access.</td></tr>
                  <tr><td>403</td><td><code>FORBIDDEN</code></td><td>The organization or its access is disabled.</td></tr>
                  <tr><td>404</td><td><code>NOT_FOUND</code></td><td>The requested resource does not exist.</td></tr>
                  <tr><td>429</td><td><code>RATE_LIMIT_EXCEEDED</code></td><td>The minute or monthly request limit was reached.</td></tr>
                </tbody>
              </table>
            </div>
            <h3>Rate-limit headers</h3>
            <div className="docs-header-list">
              <code>X-RateLimit-Limit</code><span>Maximum requests for the current minute.</span>
              <code>X-RateLimit-Remaining</code><span>Requests remaining in the current minute.</span>
              <code>X-Monthly-Limit</code><span>Maximum requests for the current month.</span>
              <code>X-Monthly-Remaining</code><span>Requests remaining in the current month.</span>
            </div>
          </section>

          <section className="docs-section docs-go-live" id="go-live">
            <p className="docs-eyebrow">Production readiness</p>
            <h2>Go-live checklist</h2>
            <div className="docs-checklist">
              <p><CheckCircle2 size={18} /> Store API keys and signing secrets only on your backend.</p>
              <p><CheckCircle2 size={18} /> Give each system its own API key and only the scopes it needs.</p>
              <p><CheckCircle2 size={18} /> Use cursor pagination for call history imports.</p>
              <p><CheckCircle2 size={18} /> Verify webhook signatures against the raw request body.</p>
              <p><CheckCircle2 size={18} /> Deduplicate webhook retries using <code>LeadWatch-Event-Id</code>.</p>
              <p><CheckCircle2 size={18} /> Monitor 401, 403, and 429 responses in your integration logs.</p>
            </div>
            <Link className="docs-dashboard-link" to={user ? '/dashboard' : '/login'}>
              {user ? 'Return to LeadWatch dashboard' : 'Open LeadWatch dashboard'} <ArrowRight size={17} />
            </Link>
          </section>
        </article>
      </div>

      <footer className="docs-footer">
        <Link to="/">LeadWatch</Link>
        <span>Organizer API v1</span>
        <Link to={user ? '/dashboard' : '/login'}>{user ? 'Dashboard' : 'Sign in'}</Link>
      </footer>
    </main>
  );
};
