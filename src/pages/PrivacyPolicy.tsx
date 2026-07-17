import { ShieldCheck } from 'lucide-react';
import { PublicFooter, PublicHeader, Reveal, usePublicMetadata } from '../components/public';

const privacyPolicyVersion = '2026-07-17';

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
    body: 'The Smartly Manage Android app requests the call log, contacts, and phone state permissions. These permissions are used solely to provide the app’s core call-tracking feature: after the device user explicitly grants them, the app reads call metadata — call time, direction, duration, and status — along with the associated contact name and phone number, and uploads it to Smartly Manage servers so that the user and their organization’s managers can review team call activity. We never record, listen to, or store call audio, and we never read the content of messages. Call and contact data is not used for advertising and is not shared with third parties beyond the service providers listed below. Organizations are responsible for informing their team members that work calls are tracked before inviting them.',
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
    body: 'Data is used to operate core features (call history, team reporting, analytics), manage billing and access, send transactional emails (invites, password resets, billing notices), and provide support. We do not sell personal data, we do not show ads, and we do not use your data for any purpose unrelated to providing the service.',
  },
  {
    title: 'Data sharing and service providers',
    body: 'We share data only with the service providers needed to run Smartly Manage: Razorpay for payment processing, Google Cloud / Firebase for hosting, authentication, database, and storage, and a transactional email delivery provider for messages such as invites and billing notices. These providers process data under their own security and privacy commitments. We do not sell personal data or share it with advertisers or data brokers. We may disclose information if required by law or to protect the rights and safety of our users and service.',
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
