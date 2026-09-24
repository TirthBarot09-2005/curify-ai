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
  syncWithBackend: () => Promise<User | null>;
  refreshUser: () => Promise<User | null>;
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
      const demo = sessionStorage.getItem('curify_demo_user');
      if (demo) {
        const u = JSON.parse(demo);
        if (u?.role === 'lender') return u;
      }
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
    setTokenGetter(async () => {
      try {
        if (clerk.session) {
          const tok = await clerk.session.getToken();
          if (tok) return tok;
        }
        if (isSignedIn) {
          return await getToken();
        }
        return null;
      } catch {
        return null;
      }
    });
  }, [isSignedIn, getToken, clerk]);

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
  const syncWithBackend = useCallback(async (): Promise<User | null> => {
    const activeClerkUser = clerkUser || clerk.user;
    const activeSignedIn = isSignedIn || !!clerk.session;

    if (!activeSignedIn || !activeClerkUser) {
      // Check if an explicit lender demo session exists in sessionStorage for this browser tab
      try {
        const demoStored = sessionStorage.getItem('curify_demo_user');
        if (demoStored) {
          const u = JSON.parse(demoStored as string);
          if (u?.role === 'lender') {
            setUser((prev) => (prev?.id === u.id && prev?.role === 'lender' ? prev : u));
            setLoading(false);
            return u;
          }
        }
      } catch {
        // Continue to reset
      }
      setUser((prev) => (prev ? null : prev));
      localStorage.removeItem('curify_user');
      setLoading(false);
      return null;
    }

    if (isSyncingRef.current) {
      const stored = localStorage.getItem('curify_user');
      return stored ? JSON.parse(stored) : null;
    }
    isSyncingRef.current = true;

    try {
      // Backend automatically provisions or matches PostgreSQL user from Clerk JWT
      const me = await api.auth.getMe();
      const u: User = {
        id: me.id,
        clerkUserId: activeClerkUser.id,
        name: me.name || `${activeClerkUser.firstName || ''} ${activeClerkUser.lastName || ''}`.trim() || 'Patient',
        firstName: activeClerkUser.firstName || me.first_name || '',
        lastName: activeClerkUser.lastName || me.last_name || '',
        email: me.email || activeClerkUser.primaryEmailAddress?.emailAddress || '',
        role: me.role || (activeClerkUser.publicMetadata?.role as UserRole) || 'patient',
        phone: me.phone || activeClerkUser.phoneNumbers?.[0]?.phoneNumber || '',
        onboardingCompleted: me.profile?.onboarding_completed ?? (me.role === 'patient' ? false : true),
      };
      setUser(u);
      localStorage.setItem('curify_user', JSON.stringify(u));
      syncedUserIdRef.current = activeClerkUser.id;

      // Fetch the extended profile
      if (u.role === 'patient') {
        await fetchProfile();
      }
      return u;
    } catch (err) {
      console.warn('[AuthContext] Backend sync fallback:', err);
      // Fallback to Clerk identity in memory
      const role = (activeClerkUser.publicMetadata?.role as UserRole) || 'patient';
      const u: User = {
        id: activeClerkUser.id,
        clerkUserId: activeClerkUser.id,
        name: `${activeClerkUser.firstName || ''} ${activeClerkUser.lastName || ''}`.trim() || 'Patient',
        firstName: activeClerkUser.firstName || '',
        lastName: activeClerkUser.lastName || '',
        email: activeClerkUser.primaryEmailAddress?.emailAddress || '',
        role,
        onboardingCompleted: role === 'patient' ? false : true,
      };
      setUser(u);
      localStorage.setItem('curify_user', JSON.stringify(u));
      syncedUserIdRef.current = activeClerkUser.id;
      return u;
    } finally {
      setLoading(false);
      isSyncingRef.current = false;
    }
  }, [isSignedIn, clerkUser?.id, clerk, fetchProfile]);

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
              setUser((prev) => (prev?.id === u.id && prev?.role === 'lender' ? prev : u));
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

        setUser((prev) => (prev ? null : prev));
        setLoading(false);
        syncedUserIdRef.current = null;
      }
    }
  }, [clerkLoaded, isSignedIn, clerkUser?.id]);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    return await syncWithBackend();
  }, [syncWithBackend]);

  const login = useCallback(
    async (roleOrEmail: UserRole | string, password?: string) => {
      // Demo persona is strictly limited to lender underwriter review
      if (roleOrEmail === 'lender' || roleOrEmail === 'lender@curify.ai' || roleOrEmail === 'neha@curify.ai') {
        const seedEmail = typeof roleOrEmail === 'string' && roleOrEmail.includes('@') ? roleOrEmail : 'lender@curify.ai';
        const demoUser: User = {
          id: 'lender-demo-user-id',
          name: 'Neha Sharma',
          email: seedEmail,
          role: 'lender',
          onboardingCompleted: true,
        };
        // Activate preview state synchronously (0ms latency, immune to cold-starts or network drops)
        setUser(demoUser);
        sessionStorage.setItem('curify_demo_user', JSON.stringify(demoUser));
        localStorage.setItem('curify_user', JSON.stringify(demoUser));
        setLoading(false);

        // Non-blocking background sync for backend JWT token
        api.auth.login({ email: seedEmail, password: password || 'Curify@2026' })
          .then((res) => {
            if (res?.token) setToken(res.token);
            if (res?.user) {
              const updated: User = {
                id: res.user.id || demoUser.id,
                name: res.user.name || demoUser.name,
                email: res.user.email || seedEmail,
                role: 'lender',
                onboardingCompleted: true,
              };
              setUser(updated);
              sessionStorage.setItem('curify_demo_user', JSON.stringify(updated));
              localStorage.setItem('curify_user', JSON.stringify(updated));
            }
          })
          .catch((err) => {
            console.warn('[AuthContext] Backend demo token background sync notice:', err);
          });
        return;
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
        syncWithBackend,
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
