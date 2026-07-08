import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { AuthContext, emptyClaims } from './auth';
import type { AuthClaims } from './auth';

const parseRole = (role: unknown): AuthClaims['role'] => {
  if (role === 'platform_owner' || role === 'org_admin' || role === 'manager' || role === 'sales_member') {
    return role;
  }
  return null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<AuthClaims>(emptyClaims);
  const [loading, setLoading] = useState(true);

  const readClaims = async (currentUser: User, forceRefresh = false) => {
    const token = await currentUser.getIdTokenResult(forceRefresh);
    const nextClaims: AuthClaims = {
      orgId: typeof token.claims.orgId === 'string' ? token.claims.orgId : '',
      role: parseRole(token.claims.role),
    };
    setClaims(nextClaims);
    return nextClaims;
  };

  const refreshClaims = async () => {
    if (!auth.currentUser) {
      setClaims(emptyClaims);
      return emptyClaims;
    }
    return readClaims(auth.currentUser, true);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      try {
        if (currentUser) {
          await readClaims(currentUser);
        } else {
          setClaims(emptyClaims);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, claims, loading, refreshClaims }}>
      {loading ? <div className="app-loader">Loading LeadWatch…</div> : children}
    </AuthContext.Provider>
  );
};
