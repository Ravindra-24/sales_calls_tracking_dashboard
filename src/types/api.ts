export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    limit?: number;
    nextCursor?: string;
  };
}

export type UserRole = 'owner' | 'manager' | 'rep';
export type UserStatus = 'active' | 'disabled';

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  phoneNumber?: string;
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
  role: 'manager' | 'rep';
  expiresAt: string;
  inviteLink?: string;
}
