export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    limit?: number;
    nextCursor?: string;
  };
}

export type UserRole = 'platform_owner' | 'org_admin' | 'manager' | 'sales_member';
export type UserStatus = 'active' | 'disabled';
export type OrgPlan = 'lite' | 'pro' | 'max' | 'enterprise';
export type IntegrationScope = 'read:org' | 'read:team' | 'read:calls' | 'read:stats';
export type IntegrationEventType = 'call.created' | 'daily_stats.updated';

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  phoneNumber?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CallRecord {
  id: string;
  repId: string;
  phoneNumber: string;
  direction: 'incoming' | 'outgoing' | 'missed';
  startTime: string;
  endTime: string | null;
  durationSeconds: number;
  notes?: string;
  tags?: string[];
  followUpAt?: string | null;
  followUpStatus?: 'none' | 'open' | 'completed';
  nextAction?: string;
  notesUpdatedAt?: string | null;
}

export interface OnboardingItem {
  id: string;
  label: string;
  status: 'done' | 'pending';
  source: 'system' | 'manual';
}

export interface OnboardingState {
  role: UserRole;
  dismissedAt: string | null;
  completedItems: Record<string, boolean>;
  items: OnboardingItem[];
  completedCount: number;
  totalCount: number;
  complete: boolean;
}

export interface SyncHealthRecord {
  id: string;
  userId: string;
  name?: string;
  email?: string;
  trackingEnabled: boolean;
  batteryOptimized: boolean;
  pendingUploadCount: number;
  hasPendingWork: boolean;
  billingReadOnly: boolean;
  billingReadOnlyMessage: string | null;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastFailureReason: string | null;
  appVersion: string | null;
  platform: 'android' | 'ios' | 'web';
  manufacturer: string | null;
  ignored?: boolean;
  updatedAt: string | null;
}

export interface AppNotification {
  id: string;
  type: 'sync_health' | 'invite_reminder' | 'weekly_nudge' | 'account_issue';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SavedCallFilter {
  id: string;
  name: string;
  filters: Record<string, string | number | undefined>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface DailyBreakdown {
  date: string;
  totalCalls: number;
  totalDurationSeconds: number;
  incomingCount: number;
  outgoingCount: number;
  missedCount: number;
}

export interface RepStats {
  repId: string;
  totalCalls: number;
  totalDurationSeconds: number;
  incomingCount: number;
  outgoingCount: number;
  missedCount: number;
  dailyBreakdown: DailyBreakdown[];
}

export interface TeamStats {
  range: { from: string; to: string };
  teamTotals: {
    totalCalls: number;
    totalDurationSeconds: number;
    incomingCount: number;
    outgoingCount: number;
    missedCount: number;
  };
  byRep: RepStats[];
}

export interface InviteResult {
  inviteId: string;
  token: string;
  email: string;
  role: 'manager' | 'sales_member' | 'org_admin';
  expiresAt: string;
  inviteLink?: string;
  emailSent?: boolean;
  emailError?: string;
  createdUser?: {
    uid: string;
    email: string;
    loginLink: string;
    temporaryPassword: string;
  };
}

export interface InviteLog {
  id: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invitedBy: string;
  createdAt: string | null;
  expiresAt: string | null;
  acceptedAt?: string | null;
  resentAt?: string | null;
  revokedAt?: string | null;
  inviteLink?: string;
}

export interface PlatformAnalytics {
  totalOrganizations: number;
  totalUsers: number;
  roleCounts: Record<string, number>;
}

export interface PlatformOrganization {
  id: string;
  name: string;
  plan: string;
  status: 'active' | 'disabled';
  ownerUserId: string;
  settings?: {
    timezone?: string;
    workingHoursStart?: string;
    workingHoursEnd?: string;
    weeklyReportsEnabled?: boolean;
    managerCanEditSalesMembers?: boolean;
  };
  createdAt: string | null;
  updatedAt: string | null;
  admin?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
  } | null;
}

export interface PlatformSettings {
  weeklyReportsEnabled: boolean;
  updatedAt?: string | null;
}

export interface OrganizationDetails {
  id: string;
  name: string;
  plan: string;
  status: 'active' | 'disabled';
  ownerUserId: string;
  settings: {
    timezone?: string;
    workingHoursStart?: string;
    workingHoursEnd?: string;
    weeklyReportsEnabled?: boolean;
    managerCanEditSalesMembers?: boolean;
  };
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TenantCreateResult {
  org: { id: string; name: string; plan: string };
  admin: { uid: string; email: string; name: string; role: 'org_admin' };
  loginLink: string;
  temporaryPassword: string;
  emailSent: boolean;
  emailError?: string;
}

export interface PlanEntitlements {
  integrationsEnabled: boolean;
  maxApiKeys: number;
  maxWebhookEndpoints: number;
  requestsPerMinute: number;
  requestsPerMonth: number;
  webhookDeliveriesPerMonth: number;
  maxQueryRangeDays: number;
}

export interface IntegrationOverview {
  organization: {
    id: string;
    name: string;
    plan: OrgPlan;
    status: 'active' | 'disabled';
  };
  entitlements: PlanEntitlements;
  usage: {
    month: string;
    requestCount: number;
    webhookDeliveryCount: number;
  };
}

export interface IntegrationApiKey {
  id: string;
  orgId: string;
  name: string;
  prefix: string;
  scopes: IntegrationScope[];
  status: 'active' | 'revoked';
  createdBy: string;
  createdAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
}

export interface CreatedIntegrationApiKey extends IntegrationApiKey {
  apiKey: string;
}

export interface IntegrationWebhookEndpoint {
  id: string;
  orgId: string;
  name: string;
  url: string;
  events: IntegrationEventType[];
  status: 'active' | 'disabled';
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
  lastDeliveryAt: string | null;
  lastDeliveryStatus: 'pending' | 'delivered' | 'failed' | 'skipped' | null;
}

export interface CreatedIntegrationWebhook extends IntegrationWebhookEndpoint {
  signingSecret: string;
}

export interface IntegrationWebhookDelivery {
  id: string;
  endpointId: string;
  eventId: string;
  eventType: IntegrationEventType | 'webhook.test';
  status: 'pending' | 'delivered' | 'failed' | 'skipped';
  attemptCount: number;
  responseStatus: number | null;
  lastError: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  deliveredAt: string | null;
}
