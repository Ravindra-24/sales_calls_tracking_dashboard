import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';

export type DashboardRole = 'owner' | 'manager' | 'rep';

export interface AuthClaims {
  orgId: string;
  role: DashboardRole | null;
}

export interface AuthContextType {
  user: User | null;
  claims: AuthClaims;
  loading: boolean;
  refreshClaims: () => Promise<AuthClaims>;
}

export const emptyClaims: AuthClaims = { orgId: '', role: null };

export const AuthContext = createContext<AuthContextType>({
  user: null,
  claims: emptyClaims,
  loading: true,
  refreshClaims: async () => emptyClaims,
});

export const useAuth = () => useContext(AuthContext);
