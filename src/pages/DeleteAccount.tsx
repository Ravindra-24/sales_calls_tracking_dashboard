import { UserX } from 'lucide-react';
import { PublicFooter, PublicHeader, Reveal, usePublicMetadata } from '../components/public';

const deleteAccountVersion = '2026-07-17';

const intro = 'How to delete your Smartly Manage account and the data associated with it, whether from inside the app or by contacting us.';

const sections: Array<{ title: string; body: string }> = [
  {
    title: 'Delete from the app',
    body: 'Open the Smartly Manage Android app, go to Profile > Delete Account, and confirm. For regular (non-admin) members, deletion requests are processed within 48 hours.',
  },
  {
    title: 'Request by email',
    body: 'If you no longer have access to the app, email info@smartlymanage.com with the subject "Account Deletion Request" from the email address registered to your account. We verify the request and process it within 48 hours of confirmation.',
  },
  {
    title: 'What is deleted',
    body: 'Deleting your account removes your profile and personal details (name, email, phone number) and the call and contact records synced from your device, along with your access to the organization.',
  },
  {
    title: 'What may be retained',
    body: 'Billing and invoice records may be retained where required for legal, tax, or accounting compliance. When an individual member’s account is deleted, data owned by the organization (such as its own billing history and other members’ records) is not affected.',
  },
  {
    title: 'Organization admins and owners',
    body: 'An account that administers an organization cannot be deleted directly, because it manages that organization’s data and billing. Contact support and we will help transfer organization ownership first, then delete the account.',
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
