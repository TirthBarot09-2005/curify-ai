import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import type { User, UserRole } from '../types';
import { api, setTokenGetter, setToken, removeToken } from '../lib/api';

export interface PatientAuthTransitionState {
  type: 'login' | 'logout';
  primaryText?: string;
  secondaryText?: string;
}

interface AuthContextType {
  user: User | null;
  profile: any | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAuthenticated: boolean;
  loading: boolean;
  loggingOut: boolean;
  patientAuthTransition: PatientAuthTransitionState | null;
  setPatientAuthTransition: React.Dispatch<React.SetStateAction<PatientAuthTransitionState | null>>;
  login: (roleOrEmail: UserRole | string, password?: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    role: 'patient' | 'lender';
    firstName: string;
    lastName: string;
    phone?: string;
  }) => Promise<void>;
  logout: (options?: { isPatient?: boolean }) => Promise<void>;
  refreshUser: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const clerk = useClerk();
  const navigate = useNavigate();
  const { isSignedIn, isLoaded: clerkLoaded, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();

  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('curify_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(() => {
    const stored = localStorage.getItem('curify_user');
    return !stored;
  });
  const [loggingOut, setLoggingOut] = useState(false);
  const [patientAuthTransition, setPatientAuthTransition] = useState<PatientAuthTransitionState | null>(null);

  const isSyncingRef = useRef(false);
  const syncedUserIdRef = useRef<string | null>(null);

  // Synchronize Clerk token getter with API client
  useEffect(() => {
    if (isSignedIn) {
      setTokenGetter(async () => {
        try {
          return await getToken();
        } catch {
          return null;
        }
      });
    } else {
      setTokenGetter(async () => null);
    }
  }, [isSignedIn, getToken]);

  // Fetch extended patient profile from backend
  const fetchProfile = useCallback(async () => {
    try {
      const data = await api.patient.getProfile();
      setProfile(data);
    } catch {
      // Not a patient or profile not found — ignore
    }
  }, []);

  // Synchronize Curify user profile from backend when Clerk auth state resolves
  const syncWithBackend = useCallback(async () => {
    if (!isSignedIn || !clerkUser) {
      // Check if an explicit lender demo session exists in sessionStorage for this browser tab
      try {
        const demoStored = sessionStorage.getItem('curify_demo_user');
        if (demoStored) {
          const u = JSON.parse(demoStored as string);
          if (u?.role === 'lender') {
            setUser(u);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Continue to reset
      }
      setUser(null);
      localStorage.removeItem('curify_user');
      setLoading(false);
      return;
    }

    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      // Backend automatically provisions or matches PostgreSQL user from Clerk JWT
      const me = await api.auth.getMe();
      const u: User = {
        id: me.id,
        clerkUserId: clerkUser.id,
        name: me.name || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Patient',
        firstName: clerkUser.firstName || me.first_name || '',
        lastName: clerkUser.lastName || me.last_name || '',
        email: me.email || clerkUser.primaryEmailAddress?.emailAddress || '',
        role: me.role || (clerkUser.publicMetadata?.role as UserRole) || 'patient',
        phone: me.phone || clerkUser.phoneNumbers?.[0]?.phoneNumber || '',
        onboardingCompleted: me.profile?.onboarding_completed ?? (me.role === 'patient' ? false : true),
      };
      setUser(u);
      localStorage.setItem('curify_user', JSON.stringify(u));
      syncedUserIdRef.current = clerkUser.id;

      // Fetch the extended profile
      if (u.role === 'patient') {
        await fetchProfile();
      }
    } catch (err) {
      console.warn('[AuthContext] Backend sync fallback:', err);
      // Fallback to Clerk identity in memory
      const role = (clerkUser.publicMetadata?.role as UserRole) || 'patient';
      const u: User = {
        id: clerkUser.id,
        clerkUserId: clerkUser.id,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Patient',
        firstName: clerkUser.firstName || '',
        lastName: clerkUser.lastName || '',
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        role,
        onboardingCompleted: role === 'patient' ? false : true,
      };
      setUser(u);
      localStorage.setItem('curify_user', JSON.stringify(u));
      syncedUserIdRef.current = clerkUser.id;
    } finally {
      setLoading(false);
      isSyncingRef.current = false;
    }
  }, [isSignedIn, clerkUser?.id, fetchProfile]);

  useEffect(() => {
    if (clerkLoaded) {
      if (isSignedIn) {
        if (syncedUserIdRef.current !== clerkUser?.id) {
          syncWithBackend();
        }
      } else {
        // DO NOT automatically sign in to demo lender on app load
        // Only preserve lender demo persona if explicitly active in sessionStorage
        try {
          const demoStored = sessionStorage.getItem('curify_demo_user');
          if (demoStored) {
            const u = JSON.parse(demoStored as string);
            if (u?.role === 'lender') {
              setUser(u);
              setLoading(false);
              return;
            }
          }
        } catch {
          // ignore
        }

        // Clean up any stale persistent demo login from localStorage
        try {
          const stored = localStorage.getItem('curify_user');
          if (stored) {
            const u = JSON.parse(stored as string);
            if (u?.role === 'lender') {
              localStorage.removeItem('curify_user');
              localStorage.removeItem('curify_token');
            }
          }
        } catch {}

        setUser(null);
        setLoading(false);
        syncedUserIdRef.current = null;
      }
    }
  }, [clerkLoaded, isSignedIn, clerkUser?.id, syncWithBackend]);

  const refreshUser = useCallback(async () => {
    await syncWithBackend();
  }, [syncWithBackend]);

  const login = useCallback(
    async (roleOrEmail: UserRole | string, password?: string) => {
      // Demo persona is strictly limited to lender underwriter review
      if (roleOrEmail === 'lender' || roleOrEmail === 'lender@curify.ai' || roleOrEmail === 'neha@curify.ai') {
        const seedEmail = typeof roleOrEmail === 'string' && roleOrEmail.includes('@') ? roleOrEmail : 'lender@curify.ai';
        try {
          const res = await api.auth.login({ email: seedEmail, password: password || 'Curify@2026' });
          if (res.token) {
            setToken(res.token);
          }
          const u: User = {
            id: res.user?.id || 'lender-seed-id',
            name: res.user?.name || `${res.user?.firstName || ''} ${res.user?.lastName || ''}`.trim() || 'Neha Sharma',
            email: res.user?.email || seedEmail,
            role: 'lender',
            onboardingCompleted: true,
          };
          setUser(u);
          sessionStorage.setItem('curify_demo_user', JSON.stringify(u));
          localStorage.setItem('curify_user', JSON.stringify(u));
          return;
        } catch (apiErr) {
          console.warn('[AuthContext] Backend auth unavailable for demo underwriter, using robust fallback session:', apiErr);
          const fallbackUser: User = {
            id: 'lender-demo-user-id',
            name: 'Neha Sharma',
            email: seedEmail,
            role: 'lender',
            onboardingCompleted: true,
          };
          setUser(fallbackUser);
          sessionStorage.setItem('curify_demo_user', JSON.stringify(fallbackUser));
          localStorage.setItem('curify_user', JSON.stringify(fallbackUser));
          return;
        }
      }

      // Standard login delegates to Clerk or sync
      await syncWithBackend();
    },
    [syncWithBackend]
  );

  const register = useCallback(
    async (_data: {
      email: string;
      password: string;
      role: 'patient' | 'lender';
      firstName: string;
      lastName: string;
      phone?: string;
    }) => {
      // Registration is handled by Clerk custom flow in Login.tsx
      await syncWithBackend();
    },
    [syncWithBackend]
  );

  const logout = useCallback(
    async (options?: { isPatient?: boolean }) => {
      if (loggingOut) return; // Prevent duplicate logout clicks
      setLoggingOut(true);

      const isPatient = options?.isPatient ?? (user?.role === 'patient');

      if (isPatient) {
        setPatientAuthTransition({
          type: 'logout',
          primaryText: 'Signing you out securely',
          secondaryText: 'Your session is being safely closed',
        });
      }

      // Clear app state and storage immediately
      removeToken();
      sessionStorage.removeItem('curify_demo_user');
      localStorage.removeItem('curify_user');
      localStorage.removeItem('curify_cases_v2');
      sessionStorage.removeItem('curify_skipped_onboarding');
      setUser(null);
      setProfile(null);

      try {
        await clerk.signOut();
      } catch (err) {
        console.warn('[AuthContext] Clerk signOut note:', err);
      }

      if (isPatient) {
        // Navigate cleanly to /login underneath the transition overlay
        navigate('/login', { replace: true });
        // Minimal visual polish duration (~280ms) for /login DOM paint before fade-out
        setTimeout(() => {
          setPatientAuthTransition(null);
          setLoggingOut(false);
        }, 280);
      } else {
        navigate('/login', { replace: true });
        setLoggingOut(false);
      }
    },
    [clerk, loggingOut, user?.role, navigate]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        setUser,
        isAuthenticated: !!user,
        loading,
        loggingOut,
        patientAuthTransition,
        setPatientAuthTransition,
        login,
        register,
        logout,
        refreshUser,
        fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
