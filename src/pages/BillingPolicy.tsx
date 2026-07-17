import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicFooter, PublicHeader, Reveal, usePublicMetadata } from '../components/public';

type PolicyKind = 'terms' | 'refund' | 'cancellation';

const policyVersions: Record<PolicyKind, string> = {
  terms: '2026-07-17',
  refund: '2026-07-17',
  cancellation: '2026-07-17',
};

const content: Record<PolicyKind, { title: string; intro: string; sections: Array<{ title: string; body: string }> }> = {
  terms: {
    title: 'Terms of Service',
    intro: 'These terms describe the account, organization, billing, and acceptable-use rules for Smartly Manage.',
    sections: [
      { title: 'Acceptance and eligibility', body: 'By creating an account or using Smartly Manage — the Android app or the web dashboard — you agree to these terms. The service is a business tool for sales teams: you must be at least 18 years old and use it on behalf of a lawful business or professional activity. If you accept these terms for an organization, you confirm you are authorized to bind that organization.' },
      { title: 'Organization account', body: 'The organization administrator is responsible for authorized users, accurate billing details, and activity performed through the organization account. Account credentials must be kept confidential; the organization is responsible for actions taken under its members’ accounts.' },
      { title: 'Acceptable use and consent', body: 'Smartly Manage may be used only for lawful sales and call-tracking activity. Organizations and users must have every consent required to access, process, or synchronize call information, including informing team members that their work call activity is tracked before inviting them. Misuse — including attempting to access other organizations’ data, reselling the service, interfering with its operation, or using it to violate any law — is prohibited.' },
      { title: 'Plans, billing, and renewals', body: 'Lite has no recurring charge. Paid (Pro) access is organization-wide, billed through Razorpay, and begins only after a captured payment is verified. Paid subscriptions renew automatically for each billing period until cancelled. Failed renewals receive the grace and read-only treatment stated in the billing policy. Prices and plan limits may change; changes apply from the next billing period after notice.' },
      { title: 'Refunds and cancellation', body: 'Payments are governed by our Refund Policy and Cancellation Policy (see the tabs above). In short: payments are final and non-refundable, and cancellation stops future renewals at the end of the current paid cycle.' },
      { title: 'Privacy and data', body: 'Our Privacy Policy (smartlymanage.com/privacy) describes what we collect and how it is used. Your organization owns the business data it syncs into Smartly Manage; we process it only to provide the service.' },
      { title: 'Intellectual property', body: 'Smartly Manage owns the software, brand, and all related intellectual property. Your subscription grants a limited, non-exclusive, non-transferable right to use the service for your organization’s internal business purposes. You may not copy, modify, reverse-engineer, or create derivative works of the service.' },
      { title: 'Availability and records', body: 'The service is provided on an “as is” and “as available” basis. Smartly Manage keeps application billing records for support and reconciliation; Razorpay remains authoritative for payment movement. Scheduled maintenance or third-party outages (hosting, payments, email delivery) may temporarily affect availability, and we do not guarantee uninterrupted or error-free operation.' },
      { title: 'Limitation of liability', body: 'To the maximum extent permitted by law, Smartly Manage is not liable for indirect, incidental, special, or consequential damages, or for loss of profits, revenue, or data. Our total aggregate liability for any claim relating to the service is limited to the fees paid by your organization in the three months preceding the claim. Nothing in these terms excludes liability that cannot legally be excluded.' },
      { title: 'Suspension and termination', body: 'We may suspend or terminate access for non-payment, breach of these terms, or use that risks harm to the service or other customers, with notice where reasonably possible. You may stop using the service and delete your account at any time as described on our Delete Account page.' },
      { title: 'Governing law', body: 'These terms are governed by the laws of India, and any dispute arising from them or from use of the service is subject to the exclusive jurisdiction of the courts of India.' },
      { title: 'Changes to these terms', body: 'We may update these terms as the service evolves. Updates are posted on this page with a new version date, and material changes will be communicated through the app or by email. Continued use after an update means you accept the revised terms.' },
    ],
  },
  refund: {
    title: 'Refund Policy',
    intro: 'All paid Smartly Manage plan purchases and renewals are final and non-refundable.',
    sections: [
      { title: 'No refunds', body: 'Payments for initial purchases, renewals, plan changes, unused time, and partially used billing periods are not refundable.' },
      { title: 'Final payments', body: 'By completing checkout, the organization confirms that the selected plan, billing period, price, and applicable taxes have been reviewed and accepted.' },
      { title: 'Duplicate or failed transactions', body: 'If you were charged twice for the same billing period, or a payment was captured but paid access was never activated, report it to support. Once verified, such amounts are refunded to the original payment method through Razorpay, typically within 5–7 business days of confirmation, subject to your bank’s processing time.' },
      { title: 'Cancellation', body: 'Cancellation prevents future renewals and takes effect at the end of the current paid cycle. It does not create a refund or credit for the current cycle. See the Cancellation Policy tab for details.' },
      { title: 'How to raise a payment issue', body: 'Email info@smartlymanage.com from your organization’s registered email address with the payment reference or invoice number and a short description of the issue. We investigate and respond within 5 business days. This policy does not limit rights that cannot legally be excluded.' },
    ],
  },
  cancellation: {
    title: 'Cancellation Policy',
    intro: 'Cancellation stops future renewal without creating an automatic refund.',
    sections: [
      { title: 'How to cancel', body: 'An organization administrator can cancel from the web dashboard: sign in, open Billing, and choose to cancel the paid subscription. Alternatively, email info@smartlymanage.com from the organization’s registered admin email and we will process the cancellation for you.' },
      { title: 'Cycle-end effect', body: 'Paid-to-Lite cancellation is scheduled for the end of the current paid cycle. Paid access continues through the recorded current-period end, after which the organization moves to the Lite plan.' },
      { title: 'No refund', body: 'Payments are final. Scheduling cancellation does not create a refund or credit for the current cycle. See the Refund Policy tab for the treatment of duplicate or failed transactions.' },
      { title: 'Restarting', body: 'A scheduled Razorpay cancellation is treated as irreversible in Smartly Manage. Restarting paid service requires a new subscription and authorization.' },
      { title: 'Data after downgrade', body: 'Changing to Lite does not delete organization data. Features remain subject to the limits of the effective plan. To delete accounts or data entirely, see smartlymanage.com/delete-account.' },
    ],
  },
};

export const BillingPolicy = ({ kind }: { kind: PolicyKind }) => {
  const policy = content[kind];
  const policyPath = kind === 'terms' ? '/terms' : kind === 'refund' ? '/refund-policy' : '/cancellation-policy';

  usePublicMetadata({
    title: `${policy.title} | Smartly Manage`,
    description: policy.intro,
    path: policyPath,
  });

  return (
    <div className="lw-public lw-policy-page">
      <PublicHeader contextLabel="Policies" />
      <main>
        <div className="lw-policy-shell">
          <Reveal as="section" className="lw-policy-hero">
            <span className="lw-policy-icon"><ShieldCheck size={22} /></span>
            <p className="lw-eyebrow">Smartly Manage policy · version {policyVersions[kind]}</p>
            <h1>{policy.title}</h1>
            <p>{policy.intro}</p>
          </Reveal>

          <nav className="lw-policy-tabs" aria-label="Billing policies">
            <Link className={kind === 'terms' ? 'is-active' : ''} aria-current={kind === 'terms' ? 'page' : undefined} to="/terms">Terms</Link>
            <Link className={kind === 'refund' ? 'is-active' : ''} aria-current={kind === 'refund' ? 'page' : undefined} to="/refund-policy">Refunds</Link>
            <Link className={kind === 'cancellation' ? 'is-active' : ''} aria-current={kind === 'cancellation' ? 'page' : undefined} to="/cancellation-policy">Cancellation</Link>
          </nav>

          <section className="lw-policy-sections" aria-label={`${policy.title} details`}>
            {policy.sections.map((section, index) => (
              <Reveal as="article" className="lw-policy-card" delay={index * 55} key={section.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><h2>{section.title}</h2><p>{section.body}</p></div>
              </Reveal>
            ))}
          </section>

          <p className="lw-policy-contact">Questions about these policies can be sent to <a href="mailto:info@smartlymanage.com">info@smartlymanage.com</a>.</p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
};
