import {
  BarChart3,
  Code2,
  KeyRound,
  LockKeyhole,
  MapPin,
  PhoneCall,
  Plug,
  ShieldCheck,
  Smartphone,
  Target,
  UsersRound,
  Webhook,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { BillingPlanCode } from '../types/billing';

export const productOutcomes: {
  icon: LucideIcon;
  title: string;
  visual: 'calls' | 'leads' | 'field' | 'access';
  copy: string;
}[] = [
  {
    icon: PhoneCall,
    title: 'A dependable call timeline',
    visual: 'calls',
    copy: 'Permitted Android call metadata is organized by representative, direction, duration, and time instead of scattered updates and spreadsheets.',
  },
  {
    icon: Target,
    title: 'Leads stay connected to activity',
    visual: 'leads',
    copy: 'Calls can be linked to lead records with stages, notes, next actions, follow-up dates, and—when enabled—explainable deal-health signals.',
  },
  {
    icon: MapPin,
    title: 'Field work has clear boundaries',
    visual: 'field',
    copy: 'Representative-started shifts can turn consented location data into live status and visit context for authorized managers.',
  },
  {
    icon: ShieldCheck,
    title: 'Intentional access',
    visual: 'access',
    copy: 'Role-aware workspaces keep organization controls, manager views, and individual activity appropriately separated.',
  },
];

export const workflow = [
  {
    icon: UsersRound,
    step: '01',
    title: 'Set up the organization',
    copy: 'Invite managers and sales members, then assign the role that matches how each person works.',
  },
  {
    icon: Smartphone,
    step: '02',
    title: 'Connect the Android app',
    copy: 'Each sales member signs in, reviews the disclosures, and chooses which eligible call and field features to enable.',
  },
  {
    icon: BarChart3,
    step: '03',
    title: 'Act on the whole picture',
    copy: 'Call history, lead follow-up, visit context, and team summaries give everyone a consistent place to plan the next action.',
  },
];

export const managerBenefits = [
  'Review calls, leads, visits, and team patterns in one workspace',
  'Spot missed-call, follow-up, and deal-risk signals sooner',
  'Use consistent activity context in coaching conversations',
];

export const representativeBenefits = [
  'Reduce repetitive manual call reporting',
  'Manage assigned leads and next actions from Android or web',
  'Start and end field tracking with an explicit shift control',
];

export const securityPoints = [
  {
    icon: PhoneCall,
    title: 'Optional recording and AI controls',
    copy: 'Smartly Manage does not record calls itself. Max and Enterprise organizations can optionally process rep-selected native-dialer recordings after organization approval and representative disclosure.',
  },
  {
    icon: LockKeyhole,
    title: 'Consent-led field tracking',
    copy: 'Location collection requires an in-app disclosure, Android permission, and a shift started by the representative. A persistent notification remains visible during collection.',
  },
  {
    icon: KeyRound,
    title: 'Role-aware controls',
    copy: 'The Android app and dashboard require authentication, and organization administration, team views, and individual activity follow assigned roles.',
  },
];

export const integrations = [
  {
    icon: Code2,
    title: 'Smartly Manage API',
    copy: 'Read organization, team, call, and performance data from your own trusted backend.',
  },
  {
    icon: Webhook,
    title: 'Signed webhooks',
    copy: 'Receive verifiable event notifications when eligible Smartly Manage activity changes.',
  },
  {
    icon: Plug,
    title: 'Scoped connections',
    copy: 'Create purpose-specific credentials and grant only the access each connected system needs.',
  },
];

export const publicPlanDetails: Record<BillingPlanCode, { accent: string; audience: string; features: string[] }> = {
  lite: {
    accent: 'cyan',
    audience: 'For small teams evaluating the workflow',
    features: ['Call history and lead workspace', 'Team member access', 'Basic activity summaries', 'No payment method required'],
  },
  pro: {
    accent: 'violet',
    audience: 'For growing sales organizations',
    features: ['Manager and organization controls', 'Field-shift and visit visibility', 'Team reporting', 'Quarterly organization billing'],
  },
  max: {
    accent: 'blue',
    audience: 'For connected sales operations',
    features: ['Optional call intelligence', 'Smartly Manage API access', 'Signed event webhooks', 'Annual organization billing'],
  },
  enterprise: {
    accent: 'warm',
    audience: 'For complex or custom deployments',
    features: ['Higher call-intelligence limits', 'Enterprise integration limits', 'Custom commercial terms', 'Dedicated sales conversation'],
  },
};

export const faqGroups = [
  {
    title: 'Product and workflow',
    description: 'How Smartly Manage fits into everyday sales work.',
    items: [
      {
        question: 'Who is Smartly Manage designed for?',
        answer: 'Smartly Manage is designed for sales organizations that want a shared view of calls, lead follow-up, and optional field visits while keeping the representative workflow simple.',
      },
      {
        question: 'Do sales members need to enter every call manually?',
        answer: 'No. After the Android app is installed, the member signs in, and the required call-log permissions are granted, eligible metadata can sync from the device.',
      },
      {
        question: 'What can managers see?',
        answer: 'The available view depends on the user’s organization role and plan. Authorized managers and admins can review team call history, lead and follow-up activity, performance summaries, and—during consented shifts—live status and visit records.',
      },
      {
        question: 'How do calls become leads?',
        answer: 'Smartly Manage matches eligible synced calls by normalized phone number. A lead can be created when no match exists, then updated with a stage, notes, assignments, next action, and follow-up date by authorized team members.',
      },
      {
        question: 'Are AI deal-health scores guaranteed predictions?',
        answer: 'No. Deal health is a decision-support signal based on available activity, recency, frequency, and analyzed call sentiment. Smartly Manage shows the contributing reasons, but your team remains responsible for every sales decision.',
      },
    ],
  },
  {
    title: 'Permissions and privacy',
    description: 'Call logs, contacts, location, recordings, and account controls.',
    items: [
      {
        question: 'Does Smartly Manage record sales call audio?',
        answer: 'Smartly Manage does not capture calls directly or route calls through cloud telephony. On Max and Enterprise, an organization can optionally allow representatives to select a native-dialer recording folder for private transcription and call intelligence after the required approval and disclosure.',
      },
      {
        question: 'Why does the Android app request call-log access?',
        answer: 'Call-log access lets the app read eligible call metadata such as direction, duration, and timestamp so that permitted activity can sync to the correct organization workspace.',
      },
      {
        question: 'Are my phone contacts uploaded?',
        answer: 'No. If you grant contacts access, contacts are read on the device only to show familiar caller names. The address book is not uploaded. A call record still includes the external phone number contained in the Android call log.',
      },
      {
        question: 'When is location collected?',
        answer: 'Only after the representative accepts the current location disclosure, grants the required Android permissions, and starts a work shift. A persistent notification is shown throughout collection. Ending the shift, withdrawing consent, or revoking permission stops collection.',
      },
      {
        question: 'How long is location data kept?',
        answer: 'Raw location points used for short-window route review are automatically deleted after 90 days. Visit summaries remain while the organization account is active, unless they are removed through the applicable deletion process.',
      },
      {
        question: 'Can I delete my account?',
        answer: 'Yes. Request deletion from Profile in the Android app or email info@smartlymanage.com. Non-admin requests receive a 48-hour grace window before the next deletion sweep. Organization administrators and platform owners require manual review so ownership and billing can be transferred safely.',
      },
    ],
  },
  {
    title: 'Android downloads',
    description: 'Release availability, installation, and verification.',
    items: [
      {
        question: 'What happens when the Android download is not available?',
        answer: 'The Android page shows a clear availability status instead of sending visitors to a broken download. The web product and account creation remain available.',
      },
      {
        question: 'How can I verify an APK?',
        answer: 'When a release is available, the Android page displays its version, release date, and SHA-256 checksum. Compare that checksum with the downloaded file and install only from the official Smartly Manage page.',
      },
    ],
  },
  {
    title: 'Plans and integrations',
    description: 'Billing, upgrades, and connecting other systems.',
    items: [
      {
        question: 'Can I start without a paid plan?',
        answer: 'Yes. Lite is the free starting point and does not require a payment method. Paid availability and current prices are shown on the Pricing page.',
      },
      {
        question: 'Can Smartly Manage connect with another business system?',
        answer: 'Max and Enterprise plans include integration capabilities such as scoped API access and signed webhooks. The public API documentation explains the available endpoints and limits.',
      },
      {
        question: 'Which plans include call intelligence?',
        answer: 'Optional native-recording import, transcription, summaries, and derived call intelligence are available on Max and Enterprise, subject to the organization’s monthly analysis allowance and required approvals.',
      },
      {
        question: 'Can an organization change plans later?',
        answer: 'Eligible organization administrators and managers can review available plan changes from billing. Enterprise changes are handled through a sales conversation.',
      },
      {
        question: 'Where can I see the current price and taxes?',
        answer: 'The Pricing page reads the current public billing catalog. Checkout shows the selected billing period, base price, applicable GST, and final amount before payment.',
      },
    ],
  },
];
