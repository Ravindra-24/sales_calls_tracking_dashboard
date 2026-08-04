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

export interface PlatformEmployee extends TeamMember {
  orgId: string;
  accountDisabled: boolean;
  lastSignInAt: string | null;
  lastSeenAt: string | null;
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
  recordingSource?: 'native_recorder' | 'manual' | null;
  recordingMatchStatus?: 'none' | 'matched' | 'ambiguous' | 'unmatched';
  recordingUploadStatus?: 'none' | 'pending' | 'uploaded' | 'failed';
  analysisStatus?: 'none' | 'queued' | 'transcribing' | 'summarizing' | 'ready' | 'failed' | 'deleting';
  consentNoticeStatus?: 'unknown' | 'detected' | 'missing';
  recordingDurationSeconds?: number | null;
  normalizedPhone?: string;
  leadId?: string | null;
}

export interface CallAnalysis {
  id: string;
  callId: string;
  status: 'queued' | 'transcribing' | 'summarizing' | 'ready' | 'failed' | 'deleting';
  transcript: string | null;
  summary: string | null;
  outcome: string | null;
  keyPoints: string[];
  actionItems: string[];
  nextStep: string | null;
  sentimentLabel: 'positive' | 'neutral' | 'negative' | 'mixed' | null;
  sentimentScore: number | null;
  sentimentConfidence: 'low' | 'medium' | 'high' | null;
  buyingSignals: string[];
  riskSignals: string[];
  objections: string[];
  customerConcerns: string[];
  suggestedNextAction: {
    text: string;
    rationale: string;
    dueInDays: number | null;
    dueAt: string | null;
    appliedAt: string | null;
  } | null;
  transcriptionProvider: 'google' | 'openai' | 'assemblyai';
  transcriptionModel: string | null;
  intelligenceProvider: 'google' | 'openai';
  intelligenceModel: string | null;
  fallbackUsed: boolean;
  fallbackReason: string | null;
  transcriptionFallbackReason: string | null;
  intelligenceFallbackReason: string | null;
  consentNoticeStatus: 'unknown' | 'detected' | 'missing';
  failureCode: string | null;
  failureMessage: string | null;
  attempts: number;
  durationSeconds: number;
  createdAt: string | null;
  updatedAt: string | null;
  readyAt: string | null;
}

export interface RecordingUsage {
  period: string;
  usedMinutes: number;
  limitMinutes: number;
  remainingMinutes: number;
  enabled: boolean;
  policyVersion: string | null;
}

export interface RecordingConfig {
  enabled: boolean;
  policyVersion: string | null;
  currentPolicyVersion: string;
  planEligible: boolean;
  usage: RecordingUsage | null;
}

export interface RecordingImport {
  id: string;
  callId: string | null;
  repId: string;
  fingerprint: string;
  fileName: string;
  modifiedAt: string | null;
  durationSeconds: number;
  sizeBytes: number;
  source: 'native_recorder' | 'manual';
  status: 'matched' | 'ambiguous' | 'unmatched' | 'uploaded' | 'failed';
  matchConfidence: number | null;
  candidateCallIds: string[];
  failureMessage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CallSummary {
  totalCalls: number;
  connectedCalls: number;
  notConnectedCalls: number;
  missedCalls: number;
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
  type: 'sync_health' | 'invite_reminder' | 'weekly_nudge' | 'account_issue' | 'call_analysis_ready' | 'call_analysis_failed' | 'deal_health_at_risk';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  actionUrl: string | null;
  actionType?: 'call' | 'lead' | null;
  actionId?: string | null;
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
  connectedCount: number;
  notConnectedCount: number;
}

export interface RepStats {
  repId: string;
  totalCalls: number;
  totalDurationSeconds: number;
  incomingCount: number;
  outgoingCount: number;
  missedCount: number;
  connectedCount: number;
  notConnectedCount: number;
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
    connectedCount: number;
    notConnectedCount: number;
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
    callRecordingEnabled?: boolean;
    callRecordingPolicyVersion?: string;
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

export interface PlatformOrganizationOverview {
  organization: OrganizationDetails;
  primaryAdmin: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string | null;
    status: UserStatus;
  } | null;
  users: {
    total: number;
    active: number;
    disabled: number;
    roleCounts: Record<string, number>;
  };
  activity: {
    lastCallAt: string | null;
    lastSyncAt: string | null;
  };
  syncHealth: {
    totalDevices: number;
    healthy: number;
    attention: number;
  };
  billing: {
    account: {
      effectivePlan: string;
      planSource: string;
      accessMode: string;
      currentPeriodEnd: string | null;
      currentSubscriptionId: string | null;
    } | null;
    subscription: {
      id: string;
      status: string;
      planCode: string;
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
    } | null;
  };
}

export interface ImpersonationSession {
  id: string;
  targetUid: string;
  targetEmail: string;
  targetName: string;
  targetRole: Exclude<UserRole, 'platform_owner'>;
  orgId: string;
  orgName: string | null;
  reason: string;
}

export interface ImpersonationStartResult {
  customToken: string;
  user: TeamMember;
  session: ImpersonationSession;
}

export interface PlatformSettings {
  weeklyReportsEnabled: boolean;
  updatedAt?: string | null;
}

export interface DealHealth {
  status: 'unscored' | 'scored' | 'closed';
  score: number | null;
  label: 'strong' | 'healthy' | 'watch' | 'at_risk' | null;
  trend: 'improving' | 'stable' | 'declining' | null;
  confidence: 'low' | 'medium' | 'high';
  components: { sentiment: number; recency: number; frequency: number; momentum: number };
  reasons: string[];
  analyzedCallCount: number;
  calculatedAt: string | null;
}

export interface LeadRecord {
  id: string;
  name: string;
  company: string | null;
  primaryPhone: string;
  normalizedPhone: string;
  ownerRepId: string;
  assignedRepIds: string[];
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  notes: string | null;
  nextAction: string | null;
  followUpAt: string | null;
  followUpStatus: 'none' | 'open' | 'completed';
  latestAnalysisId: string | null;
  latestSuggestion: { analysisId: string; text: string; rationale: string; dueAt: string | null; appliedAt: string | null } | null;
  lastCallAt: string | null;
  lastConnectedCallAt: string | null;
  connectedCallCount: number;
  health: DealHealth;
  createdSource: 'call' | 'manual';
  createdAt: string | null;
  updatedAt: string | null;
  archivedAt: string | null;
  archivedBy: string | null;
}

export interface LeadCallRecord {
  id: string;
  repId: string;
  direction: 'incoming' | 'outgoing' | 'missed';
  startTime: string | null;
  durationSeconds: number;
  analysisStatus: CallRecord['analysisStatus'];
  analysis: null | {
    id: string;
    status: CallAnalysis['status'];
    summary: string | null;
    sentimentLabel: CallAnalysis['sentimentLabel'];
    sentimentScore: number | null;
    suggestedNextAction: CallAnalysis['suggestedNextAction'];
  };
}

export interface AiPlatformConfiguration {
  settings: {
    transcriptionProvider: 'google' | 'openai' | 'assemblyai';
    intelligenceProvider: 'google' | 'openai';
    fallbackProvider: 'google';
    configVersion: number;
  };
  providers: Record<'google' | 'openai' | 'assemblyai', {
    configured: boolean;
    maskedKey: string | null;
    validatedAt: string | null;
    updatedAt: string | null;
  }>;
  models: Record<string, { transcription?: string; intelligence?: string }>;
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
    defaultPhoneCountry?: string;
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
