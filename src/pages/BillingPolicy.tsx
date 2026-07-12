import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

type PolicyKind = 'terms' | 'refund' | 'cancellation';

const policyVersions: Record<PolicyKind, string> = {
  terms: '2026-07-11',
  refund: '2026-07-12',
  cancellation: '2026-07-11',
};

const content: Record<PolicyKind, { title: string; intro: string; sections: Array<{ title: string; body: string }> }> = {
  terms: {
    title: 'Terms of Service',
    intro: 'These terms describe the account, organization, billing, and acceptable-use rules for LeadWatch.',
    sections: [
      { title: 'Organization account', body: 'The organization administrator is responsible for authorized users, accurate billing details, and activity performed through the organization account.' },
      { title: 'Service use', body: 'LeadWatch may be used only for lawful sales and call-tracking activity. Users must have every consent required to access, process, or synchronize call information.' },
      { title: 'Plans and access', body: 'Lite has no recurring charge. Paid access is organization-wide and begins only after a captured Razorpay payment is verified. Failed renewals receive the grace and read-only treatment stated in the billing policy.' },
      { title: 'Availability and records', body: 'LeadWatch keeps application billing records for support and reconciliation. Razorpay remains authoritative for payment movement. Service maintenance or third-party outages may temporarily affect availability.' },
    ],
  },
  refund: {
    title: 'Refund Policy',
    intro: 'All paid LeadWatch plan purchases and renewals are final and non-refundable.',
    sections: [
      { title: 'No refunds', body: 'Payments for initial purchases, renewals, plan changes, unused time, and partially used billing periods are not refundable.' },
      { title: 'Final payments', body: 'By completing checkout, the organization confirms that the selected plan, billing period, price, and applicable taxes have been reviewed and accepted.' },
      { title: 'Cancellation', body: 'Cancellation prevents future renewals and takes effect at the end of the current paid cycle. It does not create a refund or credit for the current cycle.' },
      { title: 'Payment issues', body: 'Duplicate or unauthorized transactions should be reported to LeadWatch support for investigation. This policy does not limit rights that cannot legally be excluded.' },
    ],
  },
  cancellation: {
    title: 'Cancellation Policy',
    intro: 'Cancellation stops future renewal without creating an automatic refund.',
    sections: [
      { title: 'Cycle-end effect', body: 'Paid-to-Lite cancellation is scheduled for the end of the current paid cycle. Paid access continues through the recorded current-period end.' },
      { title: 'No refund', body: 'Payments are final. Scheduling cancellation does not create a refund or credit for the current cycle.' },
      { title: 'Restarting', body: 'A scheduled Razorpay cancellation is treated as irreversible in LeadWatch. Restarting paid service requires a new subscription and authorization.' },
      { title: 'Data', body: 'Changing to Lite does not delete organization data. Features remain subject to the limits of the effective plan.' },
    ],
  },
};

export const BillingPolicy = ({ kind }: { kind: PolicyKind }) => {
  const policy = content[kind];
  return (
    <main className="policy-page">
      <div className="policy-shell">
        <Link className="onboarding-back" to="/"><ArrowLeft size={17} /> Back to LeadWatch</Link>
        <header className="policy-header glass-panel">
          <span className="billing-card-icon"><ShieldCheck size={21} /></span>
          <p className="eyebrow">LeadWatch policy · version {policyVersions[kind]}</p>
          <h1>{policy.title}</h1>
          <p>{policy.intro}</p>
        </header>
        <nav className="policy-tabs" aria-label="Billing policies">
          <Link className={kind === 'terms' ? 'active' : ''} to="/terms">Terms</Link>
          <Link className={kind === 'refund' ? 'active' : ''} to="/refund-policy">Refunds</Link>
          <Link className={kind === 'cancellation' ? 'active' : ''} to="/cancellation-policy">Cancellation</Link>
        </nav>
        <section className="policy-sections">
          {policy.sections.map((section) => (
            <article className="section-card" key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </article>
          ))}
        </section>
        <p className="policy-contact">Questions about these policies can be sent to <a href="mailto:support@leadwatch.app">support@leadwatch.app</a>.</p>
      </div>
    </main>
  );
};
