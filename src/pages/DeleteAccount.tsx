import { UserX } from 'lucide-react';
import { PublicFooter, PublicHeader, Reveal, usePublicMetadata } from '../components/public';

const deleteAccountVersion = '2026-07-31';

const intro = 'How to delete your Smartly Manage account and the data associated with it, whether from inside the app or by contacting us.';

const sections: Array<{ title: string; body: string }> = [
  {
    title: 'Delete from the app',
    body: 'Open the Smartly Manage Android app, go to Profile > Delete Account, enter a reason, and confirm the request. A non-admin request enters a 48-hour grace period and is normally completed by the next daily deletion sweep. You can contact support during the grace period if the request was made in error.',
  },
  {
    title: 'Request by email',
    body: 'If you no longer have access to the app, email info@smartlymanage.com with the subject "Account Deletion Request" from the email address registered to your account. We will verify your identity and explain whether the request can enter the automated grace period or requires manual review.',
  },
  {
    title: 'What happens when deletion completes',
    body: 'Your Smartly Manage profile is marked deleted and disabled, refresh tokens are revoked, and you lose access to the organization. Your shifts, visits, live location status, archived raw location points, uploaded call recordings, transcripts, derived call analyses, and lead assignments are removed. Your phone contacts were never uploaded to Smartly Manage.',
  },
  {
    title: 'What may be retained',
    body: 'Organization-owned call and lead business records may remain for continuity, reporting, and accountability after your access is removed. Consent decisions are retained for the account lifetime plus 3 years as compliance evidence, and security audit, billing, invoice, payment, and support records may remain for applicable legal, tax, accounting, fraud-prevention, and reconciliation obligations. Other members’ and organization-level records are not affected by an individual request.',
  },
  {
    title: 'Organization admins and owners',
    body: 'An organization administrator or platform owner request is placed in manual review because the account controls organization data, access, or billing. Contact support and we will help transfer ownership or resolve those responsibilities before completing deletion.',
  },
  {
    title: 'Deleting an organization',
    body: 'Deleting one member account does not delete the organization. If you are authorized to request closure of an entire organization and deletion of its data, email info@smartlymanage.com from the registered administrator address. We will verify authority, address active billing and required record retention, and confirm the scope and timing separately.',
  },
];

export const DeleteAccount = () => {
  usePublicMetadata({
    title: 'Delete Account | Smartly Manage',
    description: intro,
    path: '/delete-account',
  });

  return (
    <div className="lw-public lw-policy-page">
      <PublicHeader contextLabel="Policies" />
      <main>
        <div className="lw-policy-shell">
          <Reveal as="section" className="lw-policy-hero">
            <span className="lw-policy-icon"><UserX size={22} /></span>
            <p className="lw-eyebrow">Smartly Manage policy · version {deleteAccountVersion}</p>
            <h1>Delete Your Account</h1>
            <p>{intro}</p>
          </Reveal>

          <section className="lw-policy-sections" aria-label="Account deletion details">
            {sections.map((section, index) => (
              <Reveal as="article" className="lw-policy-card" delay={index * 55} key={section.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><h2>{section.title}</h2><p>{section.body}</p></div>
              </Reveal>
            ))}
          </section>

          <p className="lw-policy-contact">Questions about account deletion can be sent to <a href="mailto:info@smartlymanage.com">info@smartlymanage.com</a>.</p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
};
