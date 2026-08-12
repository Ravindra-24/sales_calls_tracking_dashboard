import { ShieldCheck } from 'lucide-react';
import { PublicFooter, PublicHeader, Reveal, usePublicMetadata } from '../components/public';

const privacyPolicyVersion = '2026-08-12';

const intro = 'This policy explains the personal data Smartly Manage handles across the Android app and web dashboard, why it is used, who can access it, how long it is kept, and the choices available to you.';

const sections: Array<{ title: string; body: string }> = [
  {
    title: 'Who we are and what this policy covers',
    body: 'Smartly Manage provides an organization-based sales activity service through an Android app and web dashboard. It is operated under the Smartly Manage name and can be reached at info@smartlymanage.com. This policy applies to the public website, accounts, app, dashboard, and support interactions. Smartly Manage determines how account, security, billing, and service-operation data is handled. Your organization decides why its team uses the service, which members are invited, which optional features are enabled, and which authorized roles can review organization activity.',
  },
  {
    title: 'Account and organization data',
    body: 'We collect the information provided when you create or join an organization, including name, email address, optional phone number, role, organization membership, invite and verification records, profile settings, and support communications. Organization administrators can view and manage member details within their organization. Authentication records are processed through Firebase Authentication.',
  },
  {
    title: 'Call logs and on-device contacts',
    body: 'Call tracking is optional. After the Android user enables it and grants call-log and phone-state permissions, the app can sync eligible call metadata: the external phone number, time, direction, duration, status, device call-log identifier, and sync status. Authorized organization members can review that activity according to role. If contacts permission is granted, the app reads contacts only on the device to display familiar caller names; the address book and contact names are not uploaded. Smartly Manage does not read message content, route calls, or directly capture call audio.',
  },
  {
    title: 'Lead and follow-up data',
    body: 'Eligible calls can be matched to a lead using a normalized phone number. Lead records can contain a name, company, phone number, owner and assignees, stage, notes, next action, follow-up date and status, linked call history, and archived status. When optional call intelligence is enabled, a lead can also contain recent analysis suggestions and an explainable deal-health score based on available call activity, recency, frequency, and analyzed sentiment. These signals support—not replace—human sales decisions.',
  },
  {
    title: 'Optional call recordings and AI analysis',
    body: 'On Max and Enterprise, an organization may optionally enable processing of recordings already created by a representative’s native Android dialer. Processing requires organization approval of the current policy, the representative’s current disclosure decision, representative-selected folder access, and an API key for a supported AI provider supplied by the organization administrator. Depending on the selected provider and its capabilities, we may send selected audio or transcript text to OpenAI, Google Gemini, or Anthropic Claude to produce a speaker-labelled transcript where supported, summary, sentiment, buying and risk signals, objections, customer concerns, suggested follow-up, and deal-health inputs. Claude does not receive recording audio because it is used only for intelligence on existing transcripts. Smartly Manage does not provide a platform AI key or fallback provider. The representative and authorized organization managers and admins can view the result; platform owners cannot manage tenant AI credentials or view tenant recording or lead content. Organizations and representatives are responsible for any notice or consent legally required from call participants.',
  },
  {
    title: 'Location data (shift-based visit tracking)',
    body: 'Field tracking is optional. The Android app collects precise location, including in the background while the app is closed, only during a work shift the signed-in representative starts after accepting the current in-app disclosure and granting the required device permission. A persistent notification is shown throughout collection. Ending the shift, recording a declined decision, or revoking permission stops collection. During an active shift, the representative and authorized organization managers and admins can see live status. Location points can be used to create visit summaries such as place, arrival, departure, and dwell time, and—only when the separately disclosed route feature is enabled—to review the path traveled during a recent shift.',
  },
  {
    title: 'Billing and payment data',
    body: 'Razorpay is our payment processor of record for paid plans. We store billing account status, plan, invoices, and payment references needed for subscription management and support. Razorpay independently processes and secures your payment method details; we do not store full card or bank details ourselves.',
  },
  {
    title: 'Device and diagnostic data',
    body: 'To operate and secure the service, we process app version, platform, device manufacturer, permission and readiness states, sync timestamps, pending-upload counts, battery-optimization status, tracking heartbeat, notification delivery state, IP-based request limits, and error information. This helps diagnose sync problems, prevent abuse, and show administrators when a device needs attention.',
  },
  {
    title: 'How we use this information',
    body: 'We use data to authenticate users; operate call history, leads, follow-up, visits, optional transcription and call intelligence, reporting, and integrations; manage roles, billing, and account recovery; deliver invitations, transactional emails, reports, and notifications; protect the service; troubleshoot; and provide support. We do not sell personal data, use it for targeted advertising, or use customer recordings or transcripts to train Smartly Manage models.',
  },
  {
    title: 'Data sharing and service providers',
    body: 'We disclose data only as needed to operate Smartly Manage: Google Cloud and Firebase for hosting, authentication, databases, storage, and analytics infrastructure; Razorpay for paid-plan checkout and payment processing; a configured transactional email provider; and, only for optional call intelligence, the organization-selected provider—OpenAI, Google Gemini, or Anthropic Claude—using the organization’s supplied API key. The selected provider may process data outside India under its own terms and security commitments. We may also disclose information when required by law, to investigate misuse, or to protect users and the service. We do not share data with advertisers or data brokers.',
  },
  {
    title: 'Data storage and security',
    body: 'Primary application data is stored on Google Cloud infrastructure configured in the asia-south1 (Mumbai, India) region. Optional processors may handle the content sent to them in other locations as described above. Data is encrypted in transit using HTTPS/TLS, stored recordings are private, playback links are short-lived, provider credentials are encrypted and write-only in the product interface, and organization access is restricted by authentication and role. Recording access and deletion, provider changes, and sensitive location views are audited. No security measure can eliminate every risk, but we use reasonable technical and organizational safeguards against unauthorized access, alteration, disclosure, or loss.',
  },
  {
    title: 'Data retention and deletion',
    body: 'Account, organization, call, lead, visit-summary, and reporting records are generally retained while the organization account is active. Raw location points used for recent route review are automatically deleted after 90 days; live position is cleared when a shift ends; device health keeps the latest state; sensitive access audit records are kept for 1 year; and consent decisions are retained for the account lifetime plus 3 years as compliance evidence. Recordings, transcripts, and derived call intelligence remain until an authorized deletion or associated account deletion. Billing and invoice records may be retained for legal, tax, accounting, fraud-prevention, and reconciliation obligations.',
  },
  {
    title: 'Account deletion',
    body: 'You can request account deletion from Profile > Delete Account in the Android app or by following smartlymanage.com/delete-account. A non-admin request enters a 48-hour grace period and is normally completed by the next daily deletion sweep. Completion disables the profile, revokes sign-in tokens, deletes the representative’s shifts, visits, live status, and archived raw location points, deletes their call recordings and derived analyses, and removes their lead assignments. Organization-owned call and lead business records may remain for continuity and accountability, and consent, security, and billing records may remain for the periods described above. Organization administrator and platform owner requests require manual review so ownership, organization data, and billing responsibilities can be handled safely.',
  },
  {
    title: 'Your choices and rights',
    body: 'You can review and update profile information, decline optional permissions, end a field shift, revoke Android permissions, record a new declined consent decision for supported features, ask an organization administrator to correct organization records, and request account deletion. You may also ask for access to or a copy of your personal data, correction of inaccurate or incomplete data, or information about processing and service providers. Email info@smartlymanage.com from your registered address. We may verify your identity and, where the request concerns organization-controlled business records, coordinate with your organization. You may also raise a grievance using the same address.',
  },
  {
    title: 'Children',
    body: 'Smartly Manage is a business tool intended for working sales teams. It is not directed at, and may not be used by, anyone under the age of 18. We do not knowingly collect personal data from children; if we learn that we have, we will delete it.',
  },
  {
    title: 'Changes to this policy',
    body: 'We may update this policy as the service, providers, or legal requirements evolve. Updates are posted on this page with a new version date. When a change affects an optional consent-based feature, the app may require the current disclosure to be reviewed again before that feature can continue. Material changes may also be communicated through the app or by email.',
  },
];

export const PrivacyPolicy = () => {
  usePublicMetadata({
    title: 'Privacy Policy | Smartly Manage',
    description: intro,
    path: '/privacy',
  });

  return (
    <div className="lw-public lw-policy-page">
      <PublicHeader contextLabel="Policies" />
      <main>
        <div className="lw-policy-shell">
          <Reveal as="section" className="lw-policy-hero">
            <span className="lw-policy-icon"><ShieldCheck size={22} /></span>
            <p className="lw-eyebrow">Smartly Manage policy · version {privacyPolicyVersion}</p>
            <h1>Privacy Policy</h1>
            <p>{intro}</p>
          </Reveal>

          <section className="lw-policy-sections" aria-label="Privacy policy details">
            {sections.map((section, index) => (
              <Reveal as="article" className="lw-policy-card" delay={index * 55} key={section.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><h2>{section.title}</h2><p>{section.body}</p></div>
              </Reveal>
            ))}
          </section>

          <p className="lw-policy-contact">Questions about this policy can be sent to <a href="mailto:info@smartlymanage.com">info@smartlymanage.com</a>.</p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
};
