import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicFooter, PublicHeader, Reveal, usePublicMetadata } from '../components/public';

type PolicyKind = 'terms' | 'refund' | 'cancellation';

const policyVersions: Record<PolicyKind, string> = {
  terms: '2026-07-31',
  refund: '2026-07-31',
  cancellation: '2026-07-31',
};

const content: Record<PolicyKind, { title: string; intro: string; sections: Array<{ title: string; body: string }> }> = {
  terms: {
    title: 'Terms of Service',
    intro: 'These terms describe the account, organization, billing, and acceptable-use rules for Smartly Manage.',
    sections: [
      { title: 'Acceptance and eligibility', body: 'By creating an account or using Smartly Manage—the public website, Android app, web dashboard, or integrations—you agree to these terms. The service is a business tool for sales teams: you must be at least 18 years old and use it for lawful business or professional activity. If you accept these terms for an organization, you confirm you are authorized to bind that organization.' },
      { title: 'Organization account', body: 'The organization administrator is responsible for authorized users, accurate billing details, and activity performed through the organization account. Account credentials must be kept confidential; the organization is responsible for actions taken under its members’ accounts.' },
      { title: 'Acceptable use, permissions, and consent', body: 'Smartly Manage may be used only for lawful sales activity. Organizations must inform members about organization visibility before inviting them and establish a lawful basis for processing work activity. Users must not enable call tracking, field location, native-recording import, or AI processing without the notices, permissions, and participant consent required for their situation. Misuse—including surveillance outside disclosed work purposes, accessing another organization’s data, uploading unlawful content, reselling the service, bypassing limits, or interfering with operation—is prohibited.' },
      { title: 'Plans, billing, and renewals', body: 'Lite has no recurring charge. Pro is billed quarterly, Max annually, and Enterprise uses separately agreed commercial terms. Self-service paid subscriptions are organization-wide, processed through Razorpay, and begin only after a captured payment is verified. They renew automatically for the applicable billing period until cancelled. The checkout shows the base amount, applicable GST, discounts, and total before payment. Failed renewals may result in a grace period followed by read-only access. Prices and plan limits may change from a later billing period after notice.' },
      { title: 'Refunds and cancellation', body: 'Payments are governed by our Refund Policy and Cancellation Policy (see the tabs above). In short: payments are final and non-refundable, and cancellation stops future renewals at the end of the current paid cycle.' },
      { title: 'Privacy and organization data', body: 'Our Privacy Policy at smartlymanage.com/privacy describes the data we process, providers, retention, and user choices. Your organization retains its rights in the business data it provides or creates. The organization authorizes Smartly Manage and its service providers to host, process, transmit, and display that data as needed to provide, secure, support, and improve the operation of the service.' },
      { title: 'Call intelligence and automated signals', body: 'Transcripts, summaries, sentiment, suggested actions, and deal-health scores are automated decision-support outputs. They may be incomplete or inaccurate and are not a substitute for reviewing the underlying customer interaction or applying human judgment. You are responsible for sales, employment, compliance, and customer decisions made using these outputs.' },
      { title: 'Intellectual property', body: 'Smartly Manage owns the software, brand, and all related intellectual property. Your subscription grants a limited, non-exclusive, non-transferable right to use the service for your organization’s internal business purposes. You may not copy, modify, reverse-engineer, or create derivative works of the service.' },
      { title: 'Availability and records', body: 'The service is provided on an “as is” and “as available” basis. Smartly Manage keeps application billing records for support and reconciliation; Razorpay remains authoritative for payment movement. Android permissions, device restrictions, dialer behavior, connectivity, third-party AI providers, scheduled maintenance, or other provider outages may affect feature availability. We do not guarantee uninterrupted, error-free, or perfectly complete activity capture or analysis.' },
      { title: 'Limitation of liability', body: 'To the maximum extent permitted by law, Smartly Manage is not liable for indirect, incidental, special, or consequential damages, or for loss of profits, revenue, or data. Our total aggregate liability for any claim relating to the service is limited to the fees paid by your organization in the three months preceding the claim. Nothing in these terms excludes liability that cannot legally be excluded.' },
      { title: 'Suspension, termination, and deletion', body: 'We may suspend or terminate access for non-payment, breach of these terms, unlawful activity, or use that risks harm to the service or others, with notice where reasonably possible. You may stop using the service and request account deletion as described at smartlymanage.com/delete-account. Deleting one member does not automatically delete organization-owned business, billing, consent, or audit records.' },
      { title: 'Governing law', body: 'These terms are governed by the laws of India, and any dispute arising from them or from use of the service is subject to the exclusive jurisdiction of the courts of India.' },
      { title: 'Changes to these terms', body: 'We may update these terms as the service evolves. Updates are posted on this page with a new version date, and material changes will be communicated through the app or by email. Continued use after an update means you accept the revised terms.' },
    ],
  },
  refund: {
    title: 'Refund Policy',
    intro: 'All paid Smartly Manage plan purchases and renewals are final and non-refundable.',
    sections: [
      { title: 'No refunds', body: 'Payments for initial purchases, renewals, plan changes, unused time, and partially used billing periods are not refundable.' },
      { title: 'Final payments', body: 'By completing checkout, the organization confirms that the selected plan, billing period, base price, discounts, applicable GST, and final amount have been reviewed and accepted.' },
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
      { title: 'Cycle-end effect', body: 'A Pro- or Max-to-Lite cancellation is scheduled for the end of the current paid cycle. Paid access continues through the recorded current-period end, after which the organization moves to Lite and paid-only capabilities stop.' },
      { title: 'No refund', body: 'Payments are final. Scheduling cancellation does not create a refund or credit for the current cycle. See the Refund Policy tab for the treatment of duplicate or failed transactions.' },
      { title: 'Restarting', body: 'A scheduled Razorpay cancellation is treated as irreversible in Smartly Manage. Restarting paid service requires a new subscription and authorization.' },
      { title: 'Data after downgrade', body: 'Changing to Lite does not by itself delete organization data. Paid-only capabilities, including integrations and optional call intelligence, become unavailable according to the effective plan, while saved configuration and records remain subject to the Privacy Policy and applicable retention periods. For account and organization deletion options, see smartlymanage.com/delete-account.' },
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
