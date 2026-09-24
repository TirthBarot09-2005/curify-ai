import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';
import type { PatientAuthTransitionState } from '../context/AuthContext';

/**
 * Dedicated full-screen authentication transition overlay for Patients.
 * Follows Curify's healthcare-fintech visual language:
 * - Subtle warm/neutral ambient gradient background
 * - Centered Curify mark with animated pulsing aura and rotating ring
 * - Calm, trustworthy typography and messaging
 * - Smooth enter and fade-out transition without exposing previous UI
 */
export default function PatientAuthOverlay() {
  const { patientAuthTransition } = useAuth();
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [activeState, setActiveState] = useState<PatientAuthTransitionState | null>(null);

  useEffect(() => {
    if (patientAuthTransition) {
      setActiveState(patientAuthTransition);
      setVisible(true);
      setFadingOut(false);
    } else if (visible && !fadingOut) {
      // Begin smooth fade-out exit
      setFadingOut(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setFadingOut(false);
        setActiveState(null);
      }, 260); // Matches CSS transition duration
      return () => clearTimeout(timer);
    }
  }, [patientAuthTransition, visible, fadingOut]);

  if (!visible || !activeState) return null;

  const isLogout = activeState.type === 'logout';
  const primaryText =
    activeState.primaryText ||
    (isLogout ? 'Signing you out securely' : 'Signing you in securely');
  const secondaryText =
    activeState.secondaryText ||
    (isLogout ? 'Your session is being safely closed' : 'Preparing your Curify workspace');

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-260 ease-out ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background:
          'linear-gradient(155deg, rgba(251, 253, 252, 0.96) 0%, rgba(244, 248, 247, 0.96) 45%, rgba(247, 250, 249, 0.97) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Ambient background glows matching Curify's design tokens */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute -top-[12%] left-[10%] w-[50vw] h-[50vw] rounded-full blur-[100px] opacity-25"
          style={{
            background: 'radial-gradient(circle, #99f6e4 0%, #ccfbf1 40%, transparent 70%)',
          }}
        />
        <div
          className="absolute -bottom-[12%] right-[10%] w-[45vw] h-[45vw] rounded-full blur-[100px] opacity-20"
          style={{
            background: 'radial-gradient(circle, #a7f3d0 0%, #e0f2fe 50%, transparent 70%)',
          }}
        />
      </div>

      {/* Centered Curify Healthcare-Fintech Card */}
      <div className="relative z-10 mx-4 max-w-sm w-full bg-white/85 border border-teal-100/90 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-teal-900/10 text-center backdrop-blur-md animate-scale-in">
        
        {/* Animated Ring & Centered Curify Mark */}
        <div className="relative mx-auto w-20 h-20 mb-6 flex items-center justify-center">
          {/* Subtle breathing aura behind icon */}
          <div className="absolute inset-0 rounded-full bg-teal-400/15 animate-pulse-soft blur-sm" />

          {/* Elegant rotating track ring */}
          <div
            className="absolute inset-0 rounded-full border-2 border-teal-500/20 border-t-teal-600 animate-spin"
            style={{ animationDuration: '1.2s' }}
          />

          {/* Inner badge containing signature Curify healthcare pulse icon */}
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200/70 shadow-xs flex items-center justify-center">
            <svg
              className="w-7 h-7 text-teal-600"
              viewBox="0 0 36 36"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 18h6l3-8 6 16 4-11 3 3h6" />
            </svg>
          </div>
        </div>

        {/* Curify Brand Header */}
        <div className="mb-3">
          <span className="text-base font-bold text-navy-900 tracking-tight">
            Curify<span className="text-teal-600">AI</span>
          </span>
          <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">
            Patient Care Portal
          </span>
        </div>

        {/* Primary Status Title */}
        <h2 className="text-lg font-bold text-navy-900 tracking-tight">
          {primaryText}
        </h2>

        {/* Secondary Subtitle */}
        <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
          {secondaryText}
        </p>

        {/* Healthcare-Fintech Trust Badge */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-teal-800">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
          <span>End-to-End Encrypted Healthcare Session</span>
        </div>
      </div>
    </div>
  );
}
