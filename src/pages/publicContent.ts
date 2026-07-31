import {
  BarChart3,
  BellRing,
  Code2,
  Gauge,
  KeyRound,
  LockKeyhole,
  PhoneCall,
  Plug,
  ShieldCheck,
  Smartphone,
  UsersRound,
  Webhook,
} from 'lucide-react';
import type { BillingPlanCode } from '../types/billing';

export const productOutcomes = [
  {
    icon: PhoneCall,
    title: 'One dependable call history',
    copy: 'Eligible Android call metadata is organized into a clear timeline instead of scattered updates and spreadsheets.',
  },
  {
    icon: Gauge,
    title: 'Better coaching context',
    copy: 'Managers can review direction, duration, missed activity, and team patterns before the next conversation.',
  },
  {
    icon: BellRing,
    title: 'Follow-up signals stay visible',
    copy: 'Missed and recent calls remain easy to review, helping the team decide what needs attention next.',
  },
  {
    icon: ShieldCheck,
    title: 'Intentional access',
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
    copy: 'The sales member signs in and grants the call-log permissions required for eligible metadata sync.',
  },
  {
    icon: BarChart3,
    step: '03',
    title: 'Review the whole picture',
    copy: 'Call history, team views, and summaries give managers a consistent place to plan follow-up and coaching.',
  },
];

export const managerBenefits = [
  'Review team activity from one workspace',
  'Spot missed-call and follow-up signals sooner',
  'Use consistent call context in coaching',
];

export const representativeBenefits = [
  'Reduce repetitive manual call reporting',
  'Keep work activity tied to the right account',
  'Stay focused on customers instead of spreadsheets',
];

export const securityPoints = [
  {
    icon: PhoneCall,
    title: 'Native recording, only when enabled',
    copy: 'Smartly Manage does not capture calls directly. Eligible organizations can optionally import recordings created by a rep’s Android dialer after required approvals.',
  },
  {
    icon: LockKeyhole,
    title: 'Authenticated access',
    copy: 'The dashboard and Android app require a signed-in Smartly Manage account before organization activity is available.',
  },
  {
    icon: KeyRound,
    title: 'Role-aware controls',
    copy: 'Organization administration and team views follow the permissions assigned to every Smartly Manage role.',
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
    features: ['Call history dashboard', 'Team member access', 'Basic performance summary', 'No payment method required'],
  },
  pro: {
    accent: 'violet',
    audience: 'For growing sales organizations',
    features: ['Manager and organization admin roles', 'Quarterly organization billing', 'Team reporting and controls', 'Payment recovery grace'],
  },
  max: {
    accent: 'blue',
    audience: 'For connected sales operations',
    features: ['Smartly Manage API access', 'Signed event webhooks', 'Higher integration limits', 'Annual organization billing'],
  },
  enterprise: {
    accent: 'warm',
    audience: 'For complex or custom deployments',
    features: ['Custom commercial terms', 'Enterprise integration limits', 'Audited manual activation', 'Dedicated sales conversation'],
  },
};

export const faqGroups = [
  {
    title: 'Product and workflow',
    description: 'How Smartly Manage fits into everyday sales work.',
    items: [
      {
        question: 'Who is Smartly Manage designed for?',
        answer: 'Smartly Manage is designed for sales organizations that want managers to understand team call activity while keeping the representative workflow simple.',
      },
      {
        question: 'Do sales members need to enter every call manually?',
        answer: 'No. After the Android app is installed, the member signs in, and the required call-log permissions are granted, eligible metadata can sync from the device.',
      },
      {
        question: 'What can managers see?',
        answer: 'The available view depends on the manager’s organization role and plan. It can include team call history, call direction and duration, missed-call signals, and performance summaries.',
      },
    ],
  },
  {
    title: 'Android app and data',
    description: 'Permissions, recordings, downloads, and device behavior.',
    items: [
      {
        question: 'Does Smartly Manage record sales call audio?',
        answer: 'Smartly Manage does not capture calls directly or route calls through cloud telephony. Eligible organizations can optionally import recordings created by the phone’s native dialer for private transcription and AI summaries after organization approval and representative disclosure.',
      },
      {
        question: 'Why does the Android app request call-log access?',
        answer: 'Call-log access lets the app read eligible call metadata such as direction, duration, and timestamp so that permitted activity can sync to the correct organization workspace.',
      },
      {
        question: 'What happens when the Android download is not available?',
        answer: 'The Android page shows a clear availability status instead of sending visitors to a broken download. The web product and account creation remain available.',
      },
      {
        question: 'How can I verify an APK?',
        answer: 'When a release is available, the Android page displays its version, release date, and SHA-256 checksum. Your administrator can compare that checksum with the downloaded file.',
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
        question: 'Can an organization change plans later?',
        answer: 'Eligible organization administrators and managers can review available plan changes from billing. Enterprise changes are handled through a sales conversation.',
      },
    ],
  },
];
