import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';
import type { User, UserRole } from '../types';
import { api } from '../lib/api';
import {
  Activity,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ArrowRight,
  UserPlus,
  Mail,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Phone,
  Check,
  X,
  ShieldCheck,
  AlertCircle,
  Heart,
  Users,
  Shield,
  Leaf,
  User as UserIcon,
  ChevronDown,
} from 'lucide-react';


/* ──────────────────────────────────────────────────────────
   Password Strength & Validation Evaluator
   Standard OWASP / NIST 8-character minimum with variety check
   ────────────────────────────────────────────────────────── */
const COMMON_WEAK_PASSWORDS = [
  '12345678',
  '123456789',
  'password',
  'password1',
  'password123',
  'admin123',
  'qwerty123',
  'curify123',
  'curify@2026',
  'welcome1',
  'welcome123',
  'letmein123',
  'iloveyou',
  'abc12345',
];

function evaluatePassword(pwd: string) {
  const trimmed = pwd.trim();
  const minLength = trimmed.length >= 8;
  const hasUpper = /[A-Z]/.test(trimmed);
  const hasLower = /[a-z]/.test(trimmed);
  const hasNum = /[0-9]/.test(trimmed);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\\/~`';]/.test(trimmed);
  const notCommon = !COMMON_WEAK_PASSWORDS.includes(trimmed.toLowerCase());

  let varietyScore = 0;
  if (hasUpper) varietyScore++;
  if (hasLower) varietyScore++;
  if (hasNum) varietyScore++;
  if (hasSpecial) varietyScore++;

  let score = 0;
  if (minLength) score++;
  if (varietyScore >= 2) score++;
  if (varietyScore >= 3) score++;
  if (varietyScore >= 4) score++;

  if (!notCommon) score = 1;

  let label = 'Weak';
  let color = '#ef4444'; // Red
  if (score === 2) {
    label = 'Fair';
    color = '#f59e0b'; // Amber
  } else if (score === 3) {
    label = 'Good';
    color = '#0d9488'; // Teal
  } else if (score >= 4) {
    label = 'Strong';
    color = '#10b981'; // Emerald
  }

  // Valid if at least 8 characters, not in weak blacklist, and has adequate character variety
  const isValid = minLength && notCommon && varietyScore >= 2 && score >= 2;

  return {
    score,
    label,
    color,
    minLength,
    hasUpper,
    hasLower,
    hasNum,
    hasSpecial,
    notCommon,
    varietyScore,
    isValid,
  };
}

function PasswordStrengthMeter({ evalResult }: { evalResult: ReturnType<typeof evaluatePassword> }) {
  return (
    <div className="login-pw-strength animate-fade-in mt-2 p-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-slate-500 font-medium">Password strength:</span>
        <span className="font-bold flex items-center gap-1.5 text-[11px]" style={{ color: evalResult.color }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: evalResult.color }} />
          {evalResult.label}
        </span>
      </div>

      {/* 4-segment strength meter */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className="h-full rounded-full transition-all duration-300"
            style={{
              backgroundColor: evalResult.score >= step ? evalResult.color : '#e2e8f0',
            }}
          />
        ))}
      </div>

      {/* Security criteria checklist */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] text-slate-600 pt-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${evalResult.minLength ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
              }`}
          >
            {evalResult.minLength ? '✓' : '•'}
          </span>
          <span className={evalResult.minLength ? 'text-slate-800 font-medium' : 'text-slate-500'}>
            Min. 8 characters
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${evalResult.hasUpper && evalResult.hasLower
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-200 text-slate-400'
              }`}
          >
            {evalResult.hasUpper && evalResult.hasLower ? '✓' : '•'}
          </span>
          <span className={evalResult.hasUpper && evalResult.hasLower ? 'text-slate-800 font-medium' : 'text-slate-500'}>
            Upper & lower case
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${evalResult.hasNum ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
              }`}
          >
            {evalResult.hasNum ? '✓' : '•'}
          </span>
          <span className={evalResult.hasNum ? 'text-slate-800 font-medium' : 'text-slate-500'}>
            At least 1 number
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${evalResult.hasSpecial ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
              }`}
          >
            {evalResult.hasSpecial ? '✓' : '•'}
          </span>
          <span className={evalResult.hasSpecial ? 'text-slate-800 font-medium' : 'text-slate-500'}>
            Special symbol (!@#$)
          </span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Login / Signup Page with Clerk Authentication
   ────────────────────────────────────────────────────────── */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user, setUser, logout, refreshUser, syncWithBackend, setPatientAuthTransition } = useAuth();
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  const isSignupRoute =
    location.pathname === '/signup' || new URLSearchParams(location.search).get('mode') === 'signup';
  const [mode, setMode] = useState<
    'login' | 'signup' | 'verify-email' | 'forgot-password' | 'reset-password'
  >(isSignupRoute ? 'signup' : 'login');

  // Separate form states to strictly prevent auto-filling previous credentials
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role] = useState<'patient'>('patient');

  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [isSecondFactorSignIn, setIsSecondFactorSignIn] = useState(false);
  const [secondFactorEmailAddressId, setSecondFactorEmailAddressId] = useState<string | null>(null);
  const [secondFactorEmailDisplay, setSecondFactorEmailDisplay] = useState<string>('');
  const [demoRole] = useState<'lender'>('lender');
  const [mounted, setMounted] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const hasNavigatedRef = useRef(false);

  const switchToLogin = () => {
    setLoginEmail('');
    setLoginPassword('');
    setIsSecondFactorSignIn(false);
    setSecondFactorEmailAddressId(null);
    setSecondFactorEmailDisplay('');
    setError('');
    setMode('login');
  };

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => emailRef.current?.focus(), 600);
    return () => clearTimeout(t);
  }, []);

  // Ensure sign in inputs are clean whenever switching to login mode
  useEffect(() => {
    if (mode === 'login') {
      setLoginEmail('');
      setLoginPassword('');
    }
  }, [mode]);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Update mode if URL query param or route changes
  useEffect(() => {
    const qMode = new URLSearchParams(location.search).get('mode');
    if (qMode === 'signup' || location.pathname === '/signup') {
      setMode('signup');
    } else if (qMode === 'login') {
      switchToLogin();
    }
  }, [location.search, location.pathname]);

  // Automatically redirect authenticated users to their dashboard / onboarding.
  // Skip when `loading` is true or when the submit handler has already triggered navigation
  // after sign-in, preventing duplicate navigation or route bouncing.
  useEffect(() => {
    if (isAuthenticated && user && !loading && !hasNavigatedRef.current) {
      if (user.role === 'patient' && user.onboardingCompleted === false) {
        navigate('/patient/onboarding', { replace: true });
      } else {
        navigate(`/${user.role || 'patient'}`, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, loading]);

  const clearError = () => setError('');

  // 1. Sign In handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // If already authenticated, redirect immediately
    if (isAuthenticated && user) {
      if (user.role === 'patient' && user.onboardingCompleted === false) {
        navigate('/patient/onboarding', { replace: true });
      } else {
        navigate(`/${user.role || 'patient'}`, { replace: true });
      }
      return;
    }
    if (!loginEmail.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError('');

    const trimmedEmail = loginEmail.trim().toLowerCase();
    if (trimmedEmail === 'lender@curify.ai' || trimmedEmail === 'neha@curify.ai') {
      try {
        await login(trimmedEmail, loginPassword);
        navigate('/lender', { replace: true });
        return;
      } catch (err: any) {
        setError(err?.message || 'Incorrect password for lender demo account.');
        setLoading(false);
        return;
      }
    }

    // Immediately show patient auth transition overlay on user interaction
    setPatientAuthTransition({
      type: 'login',
      primaryText: 'Signing you in securely',
      secondaryText: 'Preparing your Curify workspace',
    });

    try {
      if (isSignInLoaded && signIn) {
        try {
          const result = await signIn.create({
            identifier: loginEmail.trim(),
            password: loginPassword,
          });

          // Temporary development logging (without sensitive data)
          console.log('[Clerk Auth] signIn.status:', result.status);
          console.log(
            '[Clerk Auth] supportedSecondFactors:',
            result.supportedSecondFactors?.map((f: any) => ({ strategy: f.strategy }))
          );

          if (result.status === 'complete') {
            setPatientAuthTransition({
              type: 'login',
              primaryText: 'Signing you in securely',
              secondaryText: 'Preparing your Curify workspace',
            });
            if (setSignInActive) {
              await setSignInActive({ session: result.createdSessionId });
            }
            // Immediately activate user state so ProtectedRoute never bounces
            const existingStored = localStorage.getItem('curify_user');
            let parsedExisting: User | null = null;
            try {
              parsedExisting = existingStored ? JSON.parse(existingStored) : null;
            } catch {}

            const activeUser: User = {
              id: (result as any).createdUserId || parsedExisting?.id || `usr_${Date.now()}`,
              clerkUserId: (result as any).createdUserId || parsedExisting?.clerkUserId || undefined,
              name: parsedExisting?.name || 'Patient',
              email: loginEmail.trim(),
              role: (parsedExisting?.role as UserRole) || 'patient',
              onboardingCompleted: parsedExisting?.onboardingCompleted ?? true,
            };
            localStorage.setItem('curify_user', JSON.stringify(activeUser));
            setUser(activeUser);
            const syncedUser = await syncWithBackend();
            const stored = localStorage.getItem('curify_user');
            const u = syncedUser || (stored ? JSON.parse(stored) : activeUser);
            hasNavigatedRef.current = true;
            if (u?.role === 'patient' && u?.onboardingCompleted === false) {
              navigate('/patient/onboarding', { replace: true });
            } else {
              navigate(`/${u?.role || 'patient'}`, { replace: true });
            }
            setPatientAuthTransition(null);
            return;
          } else if (result.status === 'needs_second_factor' || (result.status as string) === 'needs_client_trust') {
            const factors = result.supportedSecondFactors || [];
            const emailFactor = factors.find((f: any) => f.strategy === 'email_code');

            console.log('[Clerk Auth] selected factor strategy:', emailFactor ? emailFactor.strategy : 'none');

            if (!emailFactor) {
              console.warn('[Clerk Auth] No email_code second factor found among:', factors.map((f: any) => f.strategy));
              setPatientAuthTransition(null);
              setError("We couldn't send the verification code. Please try again.");
              return;
            }

            try {
              const prepRes = await signIn.prepareSecondFactor({
                strategy: 'email_code',
                emailAddressId: (emailFactor as any).emailAddressId,
              });
              console.log('[Clerk Auth] prepareSecondFactor result status:', prepRes?.status);

              setIsSecondFactorSignIn(true);
              setSecondFactorEmailAddressId((emailFactor as any).emailAddressId || null);
              setSecondFactorEmailDisplay((emailFactor as any).safeIdentifier || loginEmail.trim());
              setResendTimer(60);
              setPatientAuthTransition(null);
              setMode('verify-email');
              return;
            } catch (prepErr) {
              console.error('[Clerk Auth] Failed to prepare/send second factor email code:', prepErr);
              setPatientAuthTransition(null);
              setError("We couldn't send the verification code. Please try again.");
              return;
            }
          } else {
            console.warn('[Clerk Auth] Unexpected sign-in status:', result.status);
            setPatientAuthTransition(null);
            setError('Authentication could not be completed. Please try again.');
            return;
          }
        } catch (clerkErr: any) {
          setPatientAuthTransition(null);
          const errCode = clerkErr?.errors?.[0]?.code;
          const errMsg =
            clerkErr?.errors?.[0]?.longMessage ||
            clerkErr?.errors?.[0]?.message ||
            clerkErr?.message ||
            '';

          if (
            errCode === 'session_exists' ||
            errCode === 'identifier_already_signed_in' ||
            errMsg.toLowerCase().includes('already signed in') ||
            errMsg.toLowerCase().includes('session already exists')
          ) {
            const stored = localStorage.getItem('curify_user');
            const u = stored ? JSON.parse(stored) : user;
            if (u?.role === 'patient' && u?.onboardingCompleted === false) {
              navigate('/patient/onboarding', { replace: true });
            } else {
              navigate(`/${u?.role || 'patient'}`, { replace: true });
            }
            setPatientAuthTransition(null);
            return;
          }

          if (
            errCode === 'form_identifier_not_found' ||
            errMsg.toLowerCase().includes("couldn't find your account") ||
            errMsg.toLowerCase().includes('account not found')
          ) {
            setError("Account not found. If you are a new user, please click 'Create one' below to create your account.");
            return;
          }

          if (
            errCode === 'form_password_incorrect' ||
            errMsg.toLowerCase().includes('incorrect password') ||
            errMsg.toLowerCase().includes('password is incorrect')
          ) {
            setError("Incorrect password. Please verify your password or use 'Forgot password?'.");
            return;
          }

          throw clerkErr;
        }
      } else {
        setPatientAuthTransition(null);
        setError('Authentication service is initializing. Please try again in a moment.');
      }
    } catch (err: any) {
      setPatientAuthTransition(null);
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Sign in failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // 2. Sign Up handler
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError('Please enter your first name.');
      return;
    }
    if (!lastName.trim()) {
      setError('Please enter your last name.');
      return;
    }
    if (!signupEmail.trim()) {
      setError('Please enter your email address.');
      return;
    }

    const pwEval = evaluatePassword(signupPassword);
    if (!pwEval.minLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!pwEval.notCommon) {
      setError('This password is too common and vulnerable. Please choose a more unique password.');
      return;
    }
    if (!pwEval.isValid) {
      setError('Password is too weak. Please include at least 8 characters with a mix of uppercase letters, numbers, and symbols.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isSignUpLoaded && signUp) {
        // Register user in Clerk with metadata
        await signUp.create({
          emailAddress: signupEmail.trim(),
          password: signupPassword,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          unsafeMetadata: { role },
        });

        // Request Clerk email OTP verification code
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setMode('verify-email');
        setResendTimer(60);
        return;
      }

      setError('Authentication service is initializing. Please try again in a moment.');
    } catch (err: any) {
      const errCode = err?.errors?.[0]?.code;
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Registration failed. Please try again.';

      if (
        errCode === 'form_password_length_too_short' ||
        msg.toLowerCase().includes('passwords must be 15') ||
        msg.toLowerCase().includes('15 characters or more')
      ) {
        setError(
          'Your Clerk dashboard currently enforces a 15-character minimum password length. In dashboard.clerk.com -> User & Authentication -> Password, change "Minimum password length" to 8.'
        );
        return;
      }

      if (errCode === 'form_password_pwned') {
        setError('This password has been identified in a public security breach. For your security, please choose a different password.');
        return;
      }

      if (errCode === 'form_identifier_exists') {
        setError('An account with this email address already exists. Please switch to Sign In.');
        return;
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // 3. Email OTP Verification handler
  const handleVerifyEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = otpCode.trim().replace(/\D/g, '');
    if (!cleanCode || cleanCode.length < 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Branch 1: Second Factor / Device Trust verification during sign in
      if (isSecondFactorSignIn) {
        if (!isSignInLoaded || !signIn) {
          setError('Authentication service is initializing. Please try again.');
          return;
        }

        try {
          const attemptRes = await signIn.attemptSecondFactor({
            strategy: 'email_code',
            code: cleanCode,
          });

          console.log('[Clerk Auth] attemptSecondFactor status:', attemptRes.status);

          if (attemptRes.status === 'complete') {
            setPatientAuthTransition({
              type: 'login',
              primaryText: 'Signing you in securely',
              secondaryText: 'Preparing your Curify workspace',
            });

            if (setSignInActive) {
              await setSignInActive({ session: attemptRes.createdSessionId });
            }

            const existingStored = localStorage.getItem('curify_user');
            let parsedExisting: User | null = null;
            try {
              parsedExisting = existingStored ? JSON.parse(existingStored) : null;
            } catch {}

            const activeUser: User = {
              id: (attemptRes as any).createdUserId || parsedExisting?.id || `usr_${Date.now()}`,
              clerkUserId: (attemptRes as any).createdUserId || parsedExisting?.clerkUserId || undefined,
              name: parsedExisting?.name || 'Patient',
              email: loginEmail.trim() || secondFactorEmailDisplay,
              role: (parsedExisting?.role as UserRole) || 'patient',
              onboardingCompleted: parsedExisting?.onboardingCompleted ?? true,
            };
            localStorage.setItem('curify_user', JSON.stringify(activeUser));
            setUser(activeUser);

            const syncedUser = await syncWithBackend();
            const stored = localStorage.getItem('curify_user');
            const u = syncedUser || (stored ? JSON.parse(stored) : activeUser);
            hasNavigatedRef.current = true;
            if (u?.role === 'patient' && u?.onboardingCompleted === false) {
              navigate('/patient/onboarding', { replace: true });
            } else {
              navigate(`/${u?.role || 'patient'}`, { replace: true });
            }
            setPatientAuthTransition(null);
            return;
          } else {
            console.warn('[Clerk Auth] attemptSecondFactor non-complete status:', attemptRes.status);
            setError('Verification incomplete. Please check the code and try again.');
            return;
          }
        } catch (attemptErr: any) {
          setPatientAuthTransition(null);
          console.error('[Clerk Auth] attemptSecondFactor error:', attemptErr);
          const errCode = attemptErr?.errors?.[0]?.code;
          const errMsg = attemptErr?.errors?.[0]?.longMessage || attemptErr?.errors?.[0]?.message || attemptErr?.message || '';

          if (errCode === 'form_code_incorrect') {
            setError('Incorrect 6-digit code. Please check your inbox or request a new code.');
          } else if (errCode === 'verification_expired') {
            setError('Verification code has expired. Please click "Resend verification code" below.');
          } else {
            setError(errMsg || 'Failed to verify code. Please try again.');
          }
          return;
        }
      }

      // Branch 2: Initial registration email verification during sign up
      if (isSignUpLoaded && signUp) {
        let verifiedSessionId: string | null = null;
        let verifiedUserId: string | null = null;

        // Step 1: Attempt email OTP verification in Clerk
        try {
          const attemptRes = await signUp.attemptEmailAddressVerification({
            code: cleanCode,
          });

          if (attemptRes.status === 'complete') {
            verifiedSessionId = attemptRes.createdSessionId;
            verifiedUserId = attemptRes.createdUserId;
          } else {
            console.log('[Clerk OTP] Verification status:', attemptRes.status);
            if (
              attemptRes.verifications?.emailAddress?.status === 'verified' ||
              attemptRes.status === 'missing_requirements'
            ) {
              verifiedUserId = attemptRes.createdUserId;
            }
          }
        } catch (verifyErr: any) {
          const errCode = verifyErr?.errors?.[0]?.code;
          const errMsg = verifyErr?.errors?.[0]?.message || verifyErr?.message || '';

          if (
            errCode === 'verification_already_verified' ||
            errMsg.toLowerCase().includes('already been verified') ||
            signUp.verifications?.emailAddress?.status === 'verified'
          ) {
            console.log('[Clerk OTP] Code previously verified, completing account setup');
          } else if (errCode === 'form_code_incorrect') {
            setError('Incorrect 6-digit code. Please check your inbox or request a new code.');
            setLoading(false);
            return;
          } else if (errCode === 'verification_expired') {
            setError('Verification code has expired. Please click "Resend verification code" below.');
            setLoading(false);
            return;
          } else {
            throw verifyErr;
          }
        }

        // Step 2: Establish session
        if (verifiedSessionId && setSignUpActive) {
          await setSignUpActive({ session: verifiedSessionId });
        } else {
          // If session wasn't directly activated (e.g. status was missing_requirements due to phone number or password settings),
          // complete and provision via our backend bridge which issues a Clerk sign-in ticket token
          try {
            const completion = await api.auth.completeSignup({
              email: signupEmail.trim(),
              password: signupPassword,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              role,
              phone: phone.trim() || undefined,
            });

            if (completion?.token && isSignInLoaded && signIn && setSignInActive) {
              const ticketRes = await signIn.create({
                strategy: 'ticket',
                ticket: completion.token,
              });
              if (ticketRes.status === 'complete' && ticketRes.createdSessionId) {
                await setSignInActive({ session: ticketRes.createdSessionId });
              }
            }

            if (completion?.user) {
              verifiedUserId = completion.user.clerkUserId || completion.user.id;
            }
          } catch (bridgeErr) {
            console.warn('[Clerk Bridge] Auto-complete warning:', bridgeErr);
          }
        }

        // Step 3: Establish user state immediately
        const verifiedUser: User = {
          id: verifiedUserId || `usr_${Date.now()}`,
          clerkUserId: verifiedUserId || undefined,
          name: `${firstName.trim()} ${lastName.trim()}`.trim() || 'Patient',
          email: signupEmail.trim(),
          role: role as UserRole,
          onboardingCompleted: false,
        };

        // Persist immediately in localStorage and memory so ProtectedRoute never bounces
        localStorage.setItem('curify_user', JSON.stringify(verifiedUser));
        setUser(verifiedUser);

        // Step 4: Synchronize profile with backend PostgreSQL database
        try {
          await api.auth.sync({
            role,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim() || undefined,
          });
        } catch (syncErr) {
          console.warn('[Sync Profile] Initial sync notice:', syncErr);
        }

        // Step 5: Direct navigation to onboarding for patient (or lender dashboard)
        if (role === 'patient') {
          setPatientAuthTransition({
            type: 'login',
            primaryText: 'Signing you in securely',
            secondaryText: 'Preparing your Curify workspace',
          });
          hasNavigatedRef.current = true;
          navigate('/patient/onboarding', { replace: true });
          setPatientAuthTransition(null);
        } else {
          navigate('/lender', { replace: true });
        }
        return;
      }

      setError('Authentication service is initializing. Please try again.');
    } catch (err: any) {
      console.error('[Clerk OTP Error]:', err);
      const errMsg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Verification failed. Please check your code and try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // 4. Resend OTP code
  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    try {
      setLoading(true);
      setError('');
      setOtpCode('');
      if (isSecondFactorSignIn && signIn) {
        console.log('[Clerk Auth] Resending second factor code for strategy email_code');
        const resendRes = await signIn.prepareSecondFactor({
          strategy: 'email_code',
          ...(secondFactorEmailAddressId ? { emailAddressId: secondFactorEmailAddressId } : {}),
        });
        console.log('[Clerk Auth] Resend prepareSecondFactor result status:', resendRes.status);
        setResendTimer(60);
      } else if (signUp) {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setResendTimer(60);
      }
    } catch (err: any) {
      console.error('[Clerk Auth] Failed to resend verification code:', err);
      setError(err?.errors?.[0]?.message || err?.message || "We couldn't send the verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 5. Forgot Password initiation
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError('Please enter your account email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (signIn) {
        await signIn.create({
          strategy: 'reset_password_email_code',
          identifier: forgotEmail.trim(),
        });
        setMode('reset-password');
        setResendTimer(60);
      }
    } catch (err: any) {
      setError(
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Failed to send password reset email.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 6. Reset Password submission
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Please enter the 6-digit reset code.');
      return;
    }

    const pwEval = evaluatePassword(newPassword);
    if (!pwEval.minLength) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (!pwEval.notCommon) {
      setError('This password is too common and easily guessed. Please choose a stronger password.');
      return;
    }
    if (!pwEval.isValid) {
      setError('New password is too weak. Please use a combination of uppercase letters, numbers, and symbols.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (signIn) {
        const result = await signIn.attemptFirstFactor({
          strategy: 'reset_password_email_code',
          code: otpCode.trim(),
          password: newPassword,
        });

        if (result.status === 'complete') {
          setPatientAuthTransition({
            type: 'login',
            primaryText: 'Signing you in securely',
            secondaryText: 'Preparing your Curify workspace',
          });
          if (setSignInActive) {
            await setSignInActive({ session: result.createdSessionId });
          }
          await syncWithBackend();
          hasNavigatedRef.current = true;
          navigate('/patient', { replace: true });
          setPatientAuthTransition(null);
        }
      }
    } catch (err: any) {
      setPatientAuthTransition(null);
      setError(
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Failed to reset password. Please check the code.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 7. Demo access handler (Lender underwriter preview only)
  const handleDemo = async () => {
    setLoading(true);
    setError('');
    try {
      hasNavigatedRef.current = true;
      await login('lender');
      navigate('/lender', { replace: true });
    } catch (err: any) {
      hasNavigatedRef.current = false;
      setError(err?.message || 'Demo login failed. Is the backend server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-ambient-page">
      {/* ─── Ambient Layered Background ─── */}
      <div className="login-ambient-bg" aria-hidden="true">
        <div className="login-ambient-glow-tl" />
        <div className="login-ambient-glow-br" />
        <svg className="login-ambient-svg-wave" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="none">
          <path
            d="M-100,200 C320,100 480,420 920,290 C1280,180 1380,480 1600,390 L1600,1000 L-100,1000 Z"
            fill="url(#ambient-grad-1)"
            opacity="0.16"
          />
          <path
            d="M-60,380 C300,520 620,260 1020,440 C1320,580 1440,360 1600,470 L1600,1000 L-60,1000 Z"
            fill="url(#ambient-grad-2)"
            opacity="0.10"
          />
          <defs>
            <linearGradient id="ambient-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#99f6e4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ccfbf1" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="ambient-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.06" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ─── Top Header Bar ─── */}
      <header className="login-top-bar">
        <button
          onClick={() => navigate('/')}
          className="login-brand-logo"
          aria-label="Return to Curify AI Home"
        >
          <div className="login-pulse-icon">
            <svg
              className="w-8 h-8 text-teal-600"
              viewBox="0 0 36 36"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 18h6l3-8 6 16 4-11 3 3h6" />
            </svg>
          </div>
          <span className="login-brand-logo-text">
            Curify<span className="login-brand-logo-accent">AI</span>
          </span>
        </button>
      </header>

      {/* ─── Main Ambient Stage (Orbit Arcs + Floating Cards + Center Card) ─── */}
      <main className="login-stage-container">
        <div className="login-stage-wrapper">
          {/* ─── Left Orbit Column ─── */}
          <div className="login-orbit-col login-orbit-col-left" aria-hidden="true">
            <svg className="login-orbit-svg" viewBox="0 0 280 350" fill="none">
              <path
                d="M 230 25 C 100 80, 100 270, 230 325"
                stroke="rgba(13, 148, 136, 0.16)"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
              <circle cx="125" cy="175" r="3" fill="#0d9488" opacity="0.45" />
            </svg>

            {/* Top Left: Better Care */}
            <div className="login-float-card login-float-anim-1">
              <div className="login-float-icon-box">
                <Heart className="w-5 h-5 text-teal-600" />
              </div>
              <div className="login-float-title">Better Care</div>
              <div className="login-float-desc">Find verified hospitals.</div>
            </div>

            {/* Bottom Left: Real Support */}
            <div className="login-float-card login-float-anim-2">
              <div className="login-float-icon-box">
                <Users className="w-5 h-5 text-teal-600" />
              </div>
              <div className="login-float-title">Real Support</div>
              <div className="login-float-desc">Guidance throughout your journey.</div>
            </div>
          </div>

          {/* ─── Center Auth Card ─── */}
          <div className="login-card-container">
            <div className="login-card">

              {/* ─── MODE: EMAIL OTP VERIFICATION ─── */}
              {mode === 'verify-email' && (
                <form onSubmit={handleVerifyEmail} className="login-form-inner" noValidate>
                  <div className="login-card-header">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                      <Mail className="w-6 h-6" />
                    </div>
                    <h1 className="login-card-title">
                      {isSecondFactorSignIn ? 'Two-step verification' : 'Verify your email'}
                    </h1>
                    <p className="login-card-subtitle">
                      {isSecondFactorSignIn ? (
                        <>We've sent a 6-digit verification code to <strong>{secondFactorEmailDisplay || loginEmail.trim()}</strong>. Enter it below to complete sign in.</>
                      ) : (
                        <>We've sent a 6-digit code to <strong>{signupEmail}</strong>. Enter it below to complete registration.</>
                      )}
                    </p>
                  </div>

                  {error && (
                    <div className="login-card-alert login-card-alert-error" role="alert">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
                      <div>
                        {error}
                        {(error.toLowerCase().includes('already been verified') ||
                          error.toLowerCase().includes('already verified')) && (
                          <button
                            type="button"
                            onClick={switchToLogin}
                            className="mt-2 block px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-md text-xs"
                          >
                            Sign In with your password →
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="login-otp-box">
                    <input
                      id="otp-input"
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => {
                        setOtpCode(e.target.value.replace(/\D/g, ''));
                        clearError();
                      }}
                      placeholder="123456"
                      className="login-otp-input"
                      autoFocus
                    />
                  </div>

                  <button type="submit" disabled={loading} className="login-submit-btn">
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Verify & Continue
                      </>
                    )}
                  </button>

                  <div className="login-resend-row">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendTimer > 0 || loading}
                      className="login-resend-btn"
                    >
                      {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend verification code'}
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (isSecondFactorSignIn) {
                          switchToLogin();
                        } else {
                          setMode('signup');
                          setError('');
                        }
                      }}
                      className="text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      {isSecondFactorSignIn ? 'Back to Sign In' : 'Change email'}
                    </button>
                  </div>
                </form>
              )}

              {/* ─── MODE: FORGOT PASSWORD ─── */}
              {mode === 'forgot-password' && (
                <form onSubmit={handleForgotPassword} className="login-form-inner" noValidate>
                  <div className="login-card-header">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <h1 className="login-card-title">Reset Password</h1>
                    <p className="login-card-subtitle">
                      Enter your registered email and we'll send you a password reset code.
                    </p>
                  </div>

                  {error && (
                    <div className="login-card-alert login-card-alert-error" role="alert">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
                      <div>{error}</div>
                    </div>
                  )}

                  <div className="login-input-group">
                    <span className="login-input-icon">
                      <Mail className="w-5 h-5" />
                    </span>
                    <input
                      id="reset-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        clearError();
                      }}
                      placeholder="Email address"
                      className="login-field-input"
                      autoFocus
                    />
                  </div>

                  <button type="submit" disabled={loading} className="login-submit-btn">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Code →'}
                  </button>

                  <div className="text-center mt-2">
                    <button
                      type="button"
                      onClick={switchToLogin}
                      className="text-xs text-teal-600 hover:text-teal-700 font-semibold cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}

              {/* ─── MODE: RESET PASSWORD CODE ENTRY ─── */}
              {mode === 'reset-password' && (
                <form onSubmit={handleResetPassword} className="login-form-inner" noValidate>
                  <div className="login-card-header">
                    <h1 className="login-card-title">Set New Password</h1>
                    <p className="login-card-subtitle">
                      Enter the 6-digit code sent to <strong>{forgotEmail}</strong> and your new password.
                    </p>
                  </div>

                  {error && (
                    <div className="login-card-alert login-card-alert-error" role="alert">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
                      <div>{error}</div>
                    </div>
                  )}

                  <div className="login-otp-box">
                    <input
                      id="reset-otp"
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => {
                        setOtpCode(e.target.value.replace(/\D/g, ''));
                        clearError();
                      }}
                      placeholder="123456"
                      className="login-otp-input"
                      autoFocus
                    />
                  </div>

                  <div className="login-input-group">
                    <span className="login-input-icon">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      id="new-password"
                      type={showPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        clearError();
                      }}
                      placeholder="New password (min. 8 characters)"
                      className="login-field-input pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="login-eye-btn"
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {newPassword.length > 0 && <PasswordStrengthMeter evalResult={evaluatePassword(newPassword)} />}

                  <button type="submit" disabled={loading} className="login-submit-btn">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password & Sign In →'}
                  </button>

                  <div className="text-center mt-2">
                    <button
                      type="button"
                      onClick={switchToLogin}
                      className="text-xs text-teal-600 hover:text-teal-700 font-semibold cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}

              {/* ─── STANDARD SIGN IN & SIGN UP MODES ─── */}
              {(mode === 'login' || mode === 'signup') && (
                <>
                  {/* Switcher Pill */}
                  <div className="login-pill-bar" role="tablist" aria-label="Authentication mode">
                    <div
                      className={`login-pill-glider ${mode === 'signup' ? 'glider-signup' : 'glider-login'}`}
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'login'}
                      onClick={switchToLogin}
                      className={`login-pill-item ${mode === 'login' ? 'active' : ''}`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'signup'}
                      onClick={() => {
                        setIsSecondFactorSignIn(false);
                        setSecondFactorEmailAddressId(null);
                        setSecondFactorEmailDisplay('');
                        setMode('signup');
                        setError('');
                      }}
                      className={`login-pill-item ${mode === 'signup' ? 'active' : ''}`}
                    >
                      Create Account
                    </button>
                  </div>

                  {/* Header Title & Subtitle */}
                  <div className="login-card-header">
                    <h1 className="login-card-title">
                      {mode === 'signup' ? 'Join Curify as a patient' : 'Welcome back'}
                    </h1>
                    <p className="login-card-subtitle">
                      {mode === 'signup'
                        ? 'Explore verified healthcare, compare costs, and get financing support.'
                        : 'Sign in to access your treatments, estimates, and financing.'}
                    </p>
                  </div>

                  {/* Error Notification */}
                  {error && (
                    <div className="login-card-alert login-card-alert-error" role="alert">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
                      <div>{error}</div>
                    </div>
                  )}

                  {/* ─── Form Viewport with smooth 220ms transition ─── */}
                  <div className="login-form-viewport">
                    <div key={mode} className="login-form-animated">
                      {/* ─── SIGN IN FORM ─── */}
                      {mode === 'login' && (
                        <form onSubmit={handleLogin} className="login-form-inner" noValidate autoComplete="off">
                      {/* Email input */}
                      <div className="login-input-group">
                        <span className="login-input-icon">
                          <Mail className="w-5 h-5" />
                        </span>
                        <input
                          ref={emailRef}
                          id="login-email"
                          name="curify_login_email_no_autofill"
                          type="email"
                          autoComplete="off"
                          value={loginEmail}
                          onChange={(e) => {
                            setLoginEmail(e.target.value);
                            clearError();
                          }}
                          placeholder="Email address"
                          className="login-field-input"
                        />
                      </div>

                      {/* Password input */}
                      <div className="login-input-group">
                        <span className="login-input-icon">
                          <Lock className="w-5 h-5" />
                        </span>
                        <input
                          id="login-password"
                          name="curify_login_password_no_autofill"
                          type={showPw ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={loginPassword}
                          onChange={(e) => {
                            setLoginPassword(e.target.value);
                            clearError();
                          }}
                          placeholder="Password"
                          className="login-field-input pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="login-eye-btn"
                          aria-label={showPw ? 'Hide password' : 'Show password'}
                        >
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Forgot password */}
                      <div className="login-forgot-row">
                        <button
                          type="button"
                          onClick={() => {
                            setForgotEmail(loginEmail || '');
                            setMode('forgot-password');
                            setError('');
                          }}
                          className="login-forgot-link"
                        >
                          Forgot password?
                        </button>
                      </div>

                      {/* Submit CTA */}
                      <button type="submit" disabled={loading} className="login-submit-btn">
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            Sign In
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* ─── CREATE ACCOUNT FORM ─── */}
                  {mode === 'signup' && (
                    <form onSubmit={handleSignup} className="login-form-inner" noValidate>
                      {/* Name Fields side-by-side */}
                      <div className="login-name-row">
                        <div className="login-input-group">
                          <span className="login-input-icon">
                            <UserIcon className="w-4 h-4" />
                          </span>
                          <input
                            id="signup-first"
                            type="text"
                            autoComplete="given-name"
                            value={firstName}
                            onChange={(e) => {
                              setFirstName(e.target.value);
                              clearError();
                            }}
                            placeholder="First name"
                            className="login-field-input"
                          />
                        </div>

                        <div className="login-input-group">
                          <span className="login-input-icon">
                            <UserIcon className="w-4 h-4" />
                          </span>
                          <input
                            id="signup-last"
                            type="text"
                            autoComplete="family-name"
                            value={lastName}
                            onChange={(e) => {
                              setLastName(e.target.value);
                              clearError();
                            }}
                            placeholder="Last name"
                            className="login-field-input"
                          />
                        </div>
                      </div>

                      {/* Email Address */}
                      <div className="login-input-group">
                        <span className="login-input-icon">
                          <Mail className="w-5 h-5" />
                        </span>
                        <input
                          ref={mode === 'signup' ? emailRef : undefined}
                          id="signup-email"
                          type="email"
                          autoComplete="email"
                          value={signupEmail}
                          onChange={(e) => {
                            setSignupEmail(e.target.value);
                            clearError();
                          }}
                          placeholder="Email address"
                          className="login-field-input"
                        />
                      </div>

                      {/* Phone Number with +91 indicator */}
                      <div className="login-phone-group">
                        <div className="login-phone-prefix">
                          <Phone className="w-3.5 h-3.5" />
                          <span>+91</span>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <input
                          id="signup-phone"
                          type="tel"
                          autoComplete="tel"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            clearError();
                          }}
                          placeholder="Phone number (Optional)"
                          className="login-phone-input"
                        />
                      </div>

                      {/* Password with Eye Toggle */}
                      <div className="login-input-group">
                        <span className="login-input-icon">
                          <Lock className="w-5 h-5" />
                        </span>
                        <input
                          id="signup-password"
                          type={showPw ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={signupPassword}
                          onChange={(e) => {
                            setSignupPassword(e.target.value);
                            clearError();
                          }}
                          placeholder="Create Password"
                          className="login-field-input pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="login-eye-btn"
                          aria-label={showPw ? 'Hide password' : 'Show password'}
                        >
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {signupPassword.length > 0 && (
                        <PasswordStrengthMeter evalResult={evaluatePassword(signupPassword)} />
                      )}

                      {/* Submit CTA Button */}
                      <button type="submit" disabled={loading} className="login-submit-btn">
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            Create Account & Verify
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </button>

                      {/* Terms note */}
                      <p className="login-terms-note">
                        By creating an account, you agree to our{' '}
                        <a href="/terms" className="login-terms-link" onClick={(e) => e.preventDefault()}>
                          Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="/privacy" className="login-terms-link" onClick={(e) => e.preventDefault()}>
                          Privacy Policy
                        </a>
                        .
                      </p>
                    </form>
                  )}
                    </div>
                  </div>

                  {/* Underwriter / Lender Demo access drawer */}
                  <div className="login-demo-section">
                    <button
                      type="button"
                      onClick={() => setShowDemo(!showDemo)}
                      className="login-demo-toggle"
                    >
                      <span>Underwriter & Partner Access</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDemo ? 'rotate-180' : ''}`} />
                    </button>
                    {showDemo && (
                      <div className="login-demo-grid">
                        <button
                          type="button"
                          onClick={handleDemo}
                          disabled={loading}
                          className="login-demo-btn"
                        >
                          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Launch Underwriter Portal Preview →'}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Security Badge below card */}
            <div className="login-security-badge">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Your information is encrypted and secure.</span>
            </div>

            {/* Mobile responsive feature strip */}
            <div className="login-mobile-features" aria-label="Curify features">
              <div className="login-mobile-feature-chip">
                <Heart className="w-3.5 h-3.5 text-teal-600" />
                <div>
                  <div className="login-mobile-feature-title">Better Care</div>
                  <div className="login-mobile-feature-desc">Find verified hospitals.</div>
                </div>
              </div>
              <div className="login-mobile-feature-chip">
                <Shield className="w-3.5 h-3.5 text-teal-600" />
                <div>
                  <div className="login-mobile-feature-title">Lower Costs</div>
                  <div className="login-mobile-feature-desc">Compare treatment estimates.</div>
                </div>
              </div>
              <div className="login-mobile-feature-chip">
                <Users className="w-3.5 h-3.5 text-teal-600" />
                <div>
                  <div className="login-mobile-feature-title">Real Support</div>
                  <div className="login-mobile-feature-desc">Guidance throughout your journey.</div>
                </div>
              </div>
              <div className="login-mobile-feature-chip">
                <Leaf className="w-3.5 h-3.5 text-teal-600" />
                <div>
                  <div className="login-mobile-feature-title">Healthier Tomorrows</div>
                  <div className="login-mobile-feature-desc">Explore financing options.</div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Right Orbit Column ─── */}
          <div className="login-orbit-col login-orbit-col-right" aria-hidden="true">
            <svg className="login-orbit-svg" viewBox="0 0 280 350" fill="none">
              <path
                d="M 50 25 C 180 80, 180 270, 50 325"
                stroke="rgba(13, 148, 136, 0.16)"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
              <circle cx="155" cy="175" r="3" fill="#0d9488" opacity="0.45" />
            </svg>

            {/* Top Right: Lower Costs */}
            <div className="login-float-card login-float-anim-3">
              <div className="login-float-icon-box">
                <Shield className="w-5 h-5 text-teal-600" />
              </div>
              <div className="login-float-title">Lower Costs</div>
              <div className="login-float-desc">Compare treatment estimates.</div>
            </div>

            {/* Bottom Right: Healthier Tomorrows */}
            <div className="login-float-card login-float-anim-4">
              <div className="login-float-icon-box">
                <Leaf className="w-5 h-5 text-teal-600" />
              </div>
              <div className="login-float-title">Healthier Tomorrows</div>
              <div className="login-float-desc">Explore financing options.</div>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Bottom Footer Bar ─── */}
      <footer className="login-bottom-bar">
        <div className="login-bottom-motto">CARE &nbsp; × &nbsp; CLARITY &nbsp; × &nbsp; OPPORTUNITY</div>
        <div className="login-bottom-tagline">A healthier tomorrow, within reach.</div>
      </footer>
    </div>
  );
}
