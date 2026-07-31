import { ShieldCheck } from 'lucide-react';
import { PublicFooter, PublicHeader, Reveal, usePublicMetadata } from '../components/public';

const privacyPolicyVersion = '2026-07-31';

const intro = 'This policy explains what Smartly Manage collects when your organization uses the Android app and web dashboard, and how that information is used, shared, retained, and deleted.';

const sections: Array<{ title: string; body: string }> = [
  {
    title: 'Who we are and what this policy covers',
    body: 'Smartly Manage provides a sales call-tracking service consisting of an Android application and a web dashboard, operated under the Smartly Manage name and reachable at info@smartlymanage.com. This policy applies to both the app and the dashboard. By creating an account or using the service, you agree to the collection and use of information as described here. If you use Smartly Manage as a member of an organization, that organization controls who can see your synced activity within it.',
  },
  {
    title: 'Account and organization data',
    body: 'We collect the information you provide when creating or joining an organization: name, email address, phone number, role, organization membership, and invite records. Organization administrators can view and manage member details within their organization.',
  },
  {
    title: 'Call and contact data (Android permissions)',
    body: 'The Smartly Manage Android app requests call log, contacts, and phone state permissions for call tracking. After the device user grants them, the app reads call metadata — time, direction, duration, status, contact name, and phone number — so the user and authorized organization members can review work activity. Smartly Manage does not directly capture call audio. On Max and Enterprise, an organization may separately enable native recording import: after one-time organization approval, one-time rep disclosure, and rep-selected folder access, the app can upload recordings already created by the phone’s dialer for transcription and AI summarization. We never read message content, use this data for advertising, or sell it.',
  },
  {
    title: 'Optional call recordings and AI analysis',
    body: 'When the optional native recording feature is enabled, we collect the selected audio recording, transcript, AI-generated summary, outcome, key points, action items, next step, processing status, and an automated indication of whether a recording notice was detected. The rep, their organization’s managers, and organization admins can view this content; platform owners cannot. Audio and transcripts are stored privately in Google Cloud, playback uses short-lived links, and access and deletion events are audited. Speech recognition may be processed in Singapore while stored call data and AI summaries are maintained in the configured India region. Recordings and derived outputs remain until an authorized user deletes them or the associated account is deleted. Organizations and reps are responsible for giving any legally required customer notice before recording.',
  },
  {
    title: 'Location data (shift-based visit tracking)',
    body: 'If your organization uses Smartly Manage’s field-visit tracking, the Android app collects the device’s precise location — including in the background while the app is closed — but only during a work shift that the signed-in rep has started themselves, and only after the rep has separately agreed to an in-app disclosure and granted the location permission on their own device. A persistent notification is shown on the device the entire time location is being collected; ending the shift, declining or withdrawing consent, or revoking the permission stops all collection. Live position, derived visit data (places visited, arrival and departure times), and the route or path traveled during a rep-started shift are visible only to the rep and their organization’s admins and managers, are never sold, and are never shared with third parties beyond the service providers listed below. Raw location points used for route review are automatically deleted after 90 days; summarized visit records are retained while the account is active and are removed through the account-deletion process described later in this policy.',
  },
  {
    title: 'Billing and payment data',
    body: 'Razorpay is our payment processor of record for paid plans. We store billing account status, plan, invoices, and payment references needed for subscription management and support. Razorpay independently processes and secures your payment method details; we do not store full card or bank details ourselves.',
  },
  {
    title: 'Device and diagnostic data',
    body: 'To keep call sync reliable, the app reports device sync health -- whether tracking is running, battery-optimization status, pending upload counts, device manufacturer, and platform -- to help diagnose sync issues.',
  },
  {
    title: 'How we use this information',
    body: 'Data is used to operate core features (call history, optional transcription and AI summaries, team reporting, analytics), manage billing and access, send transactional emails and notifications, and provide support. We do not sell personal data, show ads, or use customer recordings or transcripts to train our own models.',
  },
  {
    title: 'Data sharing and service providers',
    body: 'We share data only with service providers needed to run Smartly Manage: Razorpay for payment processing, Google Cloud / Firebase for hosting, authentication, database, storage, Speech-to-Text, and Vertex AI processing, and a transactional email provider. These providers process data under their own security and privacy commitments. We do not sell personal data or share it with advertisers or data brokers. We may disclose information if required by law or to protect users and the service.',
  },
  {
    title: 'Data storage and security',
    body: 'Your data is stored on Google Cloud infrastructure in the asia-south1 (Mumbai, India) region. All data is encrypted in transit using HTTPS/TLS, and access within an organization is restricted by role, so members see only what their role permits. We follow reasonable industry practices to protect data against unauthorized access, alteration, or loss.',
  },
  {
    title: 'Data retention and deletion',
    body: 'Account and call data are retained while your organization is active. Any user can delete their own account from the app (Profile > Delete Account) or request deletion as described on our Delete Account page at smartlymanage.com/delete-account. Non-admin requests are processed within 48 hours; requests from an organization admin or platform owner require our team to help transfer organization ownership first, since deleting the account managing an organization has broader implications for that organization’s data and billing. Billing and invoice records may be retained where required for legal, tax, or accounting compliance.',
  },
  {
    title: 'Your rights',
    body: 'You can review and update your profile information at any time from the app, and request account deletion as described above. You may also request a copy of your data or a correction of inaccurate data. For any data request, contact support using the details below and we will respond within a reasonable time.',
  },
  {
    title: 'Children',
    body: 'Smartly Manage is a business tool intended for working sales teams. It is not directed at, and may not be used by, anyone under the age of 18. We do not knowingly collect personal data from children; if we learn that we have, we will delete it.',
  },
  {
    title: 'Changes to this policy',
    body: 'We may update this policy as the service evolves. Updates are posted on this page with a new version date, and material changes will be communicated through the app or by email. Continued use of the service after an update means you accept the revised policy.',
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
