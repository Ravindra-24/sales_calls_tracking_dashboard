import { ShieldCheck } from 'lucide-react';
import { PublicFooter, PublicHeader, Reveal, usePublicMetadata } from '../components/public';

const privacyPolicyVersion = '2026-07-15';

const intro = 'This policy explains what Smartly Manage collects when your organization uses the app and web dashboard, and how that information is used, shared, retained, and deleted.';

const sections: Array<{ title: string; body: string }> = [
  {
    title: 'Account and organization data',
    body: 'We collect the information you provide when creating or joining an organization: name, email address, phone number, role, organization membership, and invite records. Organization administrators can view and manage member details within their organization.',
  },
  {
    title: 'Call and contact metadata',
    body: 'With the required Android permissions granted by the device user, Smartly Manage syncs call metadata -- call time, direction, duration, and status -- along with the associated contact name and phone number, so managers can review team call activity. We do not record call audio.',
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
    body: 'Data is used to operate core features (call history, team reporting, analytics), manage billing and access, send transactional emails (invites, password resets, billing notices), and provide support. We do not sell personal data.',
  },
  {
    title: 'Data sharing',
    body: 'We share data only with the service providers needed to run Smartly Manage: Razorpay for payments, Google Cloud/Firebase for hosting, authentication, and storage, and email delivery providers for transactional messages. These providers process data under their own security and privacy commitments.',
  },
  {
    title: 'Data retention and deletion',
    body: 'Account and call data are retained while your organization is active. Any user can request deletion of their own account from the app (Profile > Delete Account). Non-admin requests are processed within 48 hours; requests from an organization admin or platform owner require our team to help transfer organization ownership first, since deleting the account managing an organization has broader implications for that organization’s data and billing.',
  },
  {
    title: 'Your rights',
    body: 'You can review and update your profile information at any time from the app, and request account deletion as described above. For any other data request or correction, contact support using the details below.',
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
