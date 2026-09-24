import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import {
  Activity,
  Shield,
  User,
  Heart,
  Wallet,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Building2,
  Sparkles,
} from 'lucide-react';
import { formatINR } from '../../utils';

const COMMON_CONDITIONS = [
  'No Pre-existing Conditions',
  'Hypertension (High BP)',
  'Type 2 Diabetes',
  'Cardiac / Heart Condition',
  'Asthma / Respiratory',
  'Thyroid Disorder',
  'Osteoarthritis',
  'Kidney Ailment',
  'Previous Surgery',
];

const CITIES = [
  'Ahmedabad',
  'Mumbai',
  'Delhi NCR',
  'Bengaluru',
  'Pune',
];

const CITY_TO_STATE: Record<string, string> = {
  'Ahmedabad': 'Gujarat',
  'Mumbai': 'Maharashtra',
  'Delhi NCR': 'Delhi',
  'Delhi': 'Delhi',
  'Bengaluru': 'Karnataka',
  'Bangalore': 'Karnataka',
  'Pune': 'Maharashtra',
};

export default function PatientOnboarding() {
  const navigate = useNavigate();
  const { user, setUser, refreshUser } = useAuth();
  const { setIntake } = useApp();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State — blank by default so new patients can input their own details
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [preferredCity, setPreferredCity] = useState('');

  // Load existing onboarding state from backend if available
  useEffect(() => {
    async function loadState() {
      setLoading(true);
      try {
        const data = await api.onboarding.getState();
        if (data) {
          if (data.age) setAge(data.age.toString());
          if (data.gender) setGender(data.gender);
          if (data.city) setCity(data.city);
          // Never prefill mobile number for fresh onboarding — patient must enter their own number
          if (data.onboarding_step && data.onboarding_step > 1 && data.phone) {
            setPhone(data.phone.replace(/\D/g, '').slice(-10));
          }
          if (data.monthly_income) setMonthlyIncome(data.monthly_income.toString());
          if (data.monthly_budget) setMonthlyBudget(data.monthly_budget.toString());
          if (data.employment_status) setEmploymentStatus(data.employment_status);
          if (data.preferred_language) setPreferredLanguage(data.preferred_language);
          if (data.preferred_city) setPreferredCity(data.preferred_city);
          if (data.existing_conditions && Array.isArray(data.existing_conditions)) {
            setConditions(data.existing_conditions);
          }
        }
      } catch {
        // Fallback if backend request is silent
      } finally {
        setLoading(false);
      }
    }
    loadState();
  }, []);

  const toggleCondition = (cond: string) => {
    if (error) setError('');
    if (cond === 'No Pre-existing Conditions') {
      setConditions(['No Pre-existing Conditions']);
      return;
    }
    const filtered = conditions.filter((c) => c !== 'No Pre-existing Conditions');
    if (filtered.includes(cond)) {
      const next = filtered.filter((c) => c !== cond);
      setConditions(next);
    } else {
      setConditions([...filtered, cond]);
    }
  };

  const saveStepData = async (nextStep: number, isFinal = false) => {
    setError('');

    // Step 1 Validations
    if (step === 1) {
      if (!age.trim()) {
        setError('Please enter your age.');
        return;
      }
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
        setError('Please enter a valid age between 18 and 100 years.');
        return;
      }
      if (!gender) {
        setError('Please select your gender.');
        return;
      }
      if (!city) {
        setError('Please select your city.');
        return;
      }
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone) {
        setError('Please enter your 10-digit mobile contact phone number.');
        return;
      }
      if (cleanPhone.length < 10) {
        setError(`Mobile number must be exactly 10 digits (currently ${cleanPhone.length} digits entered).`);
        return;
      }
      if (cleanPhone.length > 10) {
        setError('Mobile number cannot be more than 10 digits.');
        return;
      }
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        setError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
        return;
      }
    }

    // Step 2 Validations
    if (step === 2) {
      if (conditions.length === 0) {
        setError('Please select your medical conditions or choose "No Pre-existing Conditions".');
        return;
      }
    }

    // Step 3 Validations
    if (step === 3) {
      if (!monthlyBudget.trim() || isNaN(Number(monthlyBudget)) || Number(monthlyBudget) <= 0) {
        setError('Please enter your target budget for medical care.');
        return;
      }
      if (!monthlyIncome.trim() || isNaN(Number(monthlyIncome)) || Number(monthlyIncome) <= 0) {
        setError('Please enter your estimated monthly household income.');
        return;
      }
      if (!employmentStatus) {
        setError('Please select your employment status.');
        return;
      }
      if (!preferredCity) {
        setError('Please select your preferred city for medical care.');
        return;
      }
    }

    setSubmitting(true);
    const cleanPhone = phone.replace(/\D/g, '').slice(0, 10);
    const derivedState = city && CITY_TO_STATE[city] ? CITY_TO_STATE[city] : undefined;
    try {
      await api.onboarding.updateState({
        step: nextStep,
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        city: city || undefined,
        state: derivedState,
        phone: cleanPhone || undefined,
        monthly_income: monthlyIncome ? parseFloat(monthlyIncome) : undefined,
        monthly_budget: monthlyBudget ? parseFloat(monthlyBudget) : undefined,
        employment_status: employmentStatus || undefined,
        preferred_language: preferredLanguage || 'English',
        preferred_city: preferredCity || city || undefined,
        existing_conditions: conditions,
        onboarding_completed: isFinal,
      });

      // Update AppContext intake state
      setIntake({
        query: 'General Healthcare Consultation & Evaluation',
        age: age ? parseInt(age) : 48,
        gender: gender || 'Male',
        location: city ? `${city}${derivedState ? `, ${derivedState}` : ''}` : 'Ahmedabad, Gujarat',
        budget: monthlyBudget ? parseFloat(monthlyBudget) : 160000,
        comorbidities: conditions.filter((c) => c !== 'No Pre-existing Conditions').join(', '),
      });

      if (isFinal) {
        if (user && setUser) {
          setUser({ ...user, onboardingCompleted: true });
        }
        // Also directly patch localStorage as a safety measure to prevent
        // the dashboard from showing the onboarding banner on initial render
        try {
          const stored = localStorage.getItem('curify_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.onboardingCompleted = true;
            localStorage.setItem('curify_user', JSON.stringify(parsed));
          }
        } catch {
          // ignore
        }
        sessionStorage.removeItem('curify_skipped_onboarding');
        await refreshUser().catch(() => {});
        navigate('/patient', { replace: true });
      } else {
        setStep(nextStep);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save onboarding progress.');
      if (!isFinal) setStep(nextStep);
    } finally {
      setSubmitting(false);
    }
  };

  const skipToDashboard = () => {
    sessionStorage.setItem('curify_skipped_onboarding', 'true');
    navigate('/patient', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Brand Bar */}
      <header className="max-w-3xl w-full mx-auto flex items-center justify-between py-2 mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-teal-600" />
          <span className="text-lg font-bold text-navy-900 tracking-tight">
            Curify <span className="text-teal-600">AI</span>
          </span>
        </div>
        <button
          onClick={skipToDashboard}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          Skip to Dashboard →
        </button>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl w-full mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 my-auto">
        {/* Progress Tracker */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span className="text-teal-700 font-bold uppercase tracking-wider">
              Step {step} of 4
            </span>
            <span>{step === 1 ? '25%' : step === 2 ? '50%' : step === 3 ? '75%' : '100%'} Complete</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 transition-all duration-300 rounded-full"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        {/* ─── STEP 1: Personal Demographics ─── */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 text-teal-800 text-xs font-semibold rounded-full mb-2">
                <User className="w-3.5 h-3.5 text-teal-600" />
                Personal Profile
              </div>
              <h2 className="text-2xl font-bold text-navy-900 tracking-tight">
                Welcome, {user?.name || 'Patient'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Tell us a little about yourself so we can calibrate accurate hospital recommendations and cost estimates.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  value={age}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 3);
                    setAge(v);
                    if (error) setError('');
                  }}
                  className="input-field text-sm"
                  placeholder="e.g. 48"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Patient must be at least 18 years</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => {
                    setGender(e.target.value);
                    if (error) setError('');
                  }}
                  className="input-field text-sm bg-white"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <select
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    if (error) setError('');
                  }}
                  className="input-field text-sm bg-white"
                >
                  <option value="">Select city</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Mobile Contact Phone</label>
                  <span className={`text-[10px] font-semibold transition-colors ${
                    phone.length === 10
                      ? 'text-teal-600 font-bold'
                      : phone.length > 0
                      ? 'text-amber-600'
                      : 'text-slate-400'
                  }`}>
                    {phone.length === 10 ? '✓ 10 digits' : `${phone.length}/10 digits`}
                  </span>
                </div>
                <div
                  className={`flex items-center rounded-lg border bg-white overflow-hidden transition-all duration-150 focus-within:ring-2 ${
                    phone.length === 10
                      ? 'border-teal-500 focus-within:border-teal-500 focus-within:ring-teal-500/20'
                      : phone.length > 0
                      ? 'border-amber-300 focus-within:border-amber-500 focus-within:ring-amber-500/20'
                      : 'border-slate-200 focus-within:border-teal-500 focus-within:ring-teal-500/20'
                  }`}
                >
                  <div className="flex items-center self-stretch px-3.5 bg-slate-50 border-r border-slate-200 text-xs font-bold text-slate-500 select-none">
                    +91
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={phone}
                    onChange={(e) => {
                      // Strictly digits only, max 10 digits — cannot enter 11+
                      const cleanDigits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(cleanDigits);
                      if (error) setError('');
                    }}
                    className="w-full px-3.5 py-2.5 text-sm font-mono tracking-wider text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                    placeholder="9876543210"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {phone.length === 10
                    ? 'Valid 10-digit mobile number'
                    : 'Must be exactly 10 digits without country code'}
                </span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => saveStepData(2)}
                disabled={submitting}
                className="btn-primary text-sm py-2.5 px-5 flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Next: Health Background
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Medical & Health Context ─── */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 text-teal-800 text-xs font-semibold rounded-full mb-2">
                <Heart className="w-3.5 h-3.5 text-teal-600" />
                Health Profile
              </div>
              <h2 className="text-2xl font-bold text-navy-900 tracking-tight">
                Any pre-existing medical conditions?
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Comorbidities influence clinical suitability matching and post-operative care planning. Select all that apply:
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5">
              {COMMON_CONDITIONS.map((cond) => {
                const isSelected = conditions.includes(cond);
                return (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => toggleCondition(cond)}
                    className={`p-3 text-left rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-teal-50/80 border-teal-500 text-teal-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cond}</span>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                      isSelected ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300'
                    }`}>
                      {isSelected ? <CheckCircle2 className="w-3 h-3" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary text-sm py-2 px-4 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => saveStepData(3)}
                disabled={submitting}
                className="btn-primary text-sm py-2.5 px-5 flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Next: Budget & Tariffs
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Financial & Healthcare Budget ─── */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 text-teal-800 text-xs font-semibold rounded-full mb-2">
                <Wallet className="w-3.5 h-3.5 text-teal-600" />
                Financial Capacity & Planning
              </div>
              <h2 className="text-2xl font-bold text-navy-900 tracking-tight">
                Healthcare Budget Preferences
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Curify AI filters hospital packages to ensure you stay within realistic, transparent price benchmarks.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estimated Procedure Target Budget (₹)
                </label>
                <input
                  type="number"
                  step="10000"
                  min="1000"
                  value={monthlyBudget}
                  onChange={(e) => {
                    setMonthlyBudget(e.target.value);
                    if (error) setError('');
                  }}
                  className="input-field text-sm"
                  placeholder="e.g. 160000"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Current Target: <strong>{formatINR(parseFloat(monthlyBudget) || 160000)}</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Monthly Household Income (₹)
                </label>
                <input
                  type="number"
                  step="5000"
                  min="1000"
                  value={monthlyIncome}
                  onChange={(e) => {
                    setMonthlyIncome(e.target.value);
                    if (error) setError('');
                  }}
                  className="input-field text-sm"
                  placeholder="e.g. 75000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employment Status
                </label>
                <select
                  value={employmentStatus}
                  onChange={(e) => {
                    setEmploymentStatus(e.target.value);
                    if (error) setError('');
                  }}
                  className="input-field text-sm bg-white"
                >
                  <option value="">Select employment status</option>
                  <option value="Salaried">Salaried</option>
                  <option value="Self-Employed">Self-Employed</option>
                  <option value="Business Owner">Business Owner</option>
                  <option value="Retired">Retired</option>
                  <option value="Unemployed">Unemployed</option>
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Language</label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="input-field text-sm bg-white"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Gujarati">Gujarati</option>
                    <option value="Marathi">Marathi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred City for Care</label>
                  <select
                    value={preferredCity}
                    onChange={(e) => {
                      setPreferredCity(e.target.value);
                      if (error) setError('');
                    }}
                    className="input-field text-sm bg-white"
                  >
                    <option value="">Select preferred city</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-secondary text-sm py-2 px-4 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => saveStepData(4)}
                disabled={submitting}
                className="btn-primary text-sm py-2.5 px-5 flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Next: Review & Confirm
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: Review & Confirmation ─── */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-navy-900 tracking-tight">
                Profile Setup Complete
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Your medical preferences and budget targets have been saved.
              </p>
            </div>

            {/* Summary card */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Patient Name</span>
                <span className="font-bold text-slate-800">{user?.name || 'Patient'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Demographics</span>
                <span className="font-bold text-slate-800">
                  {gender || 'Not specified'}{age ? `, ${age} years` : ''}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Location</span>
                <span className="font-bold text-slate-800">
                  {city ? (CITY_TO_STATE[city] ? `${city}, ${CITY_TO_STATE[city]}` : city) : 'Not specified'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Target Procedure Budget</span>
                <span className="font-bold text-teal-800">
                  {monthlyBudget ? formatINR(parseFloat(monthlyBudget)) : 'Not specified'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Conditions Monitored</span>
                <span className="font-bold text-slate-800">
                  {conditions.length > 0 ? conditions.join(', ') : 'None specified'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-secondary text-sm py-2 px-4 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => saveStepData(5, true)}
                disabled={submitting}
                className="btn-primary text-sm py-2.5 px-6 flex items-center gap-2 bg-teal-600 hover:bg-teal-700 shadow-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Enter Patient Portal
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer disclaimer */}
      <footer className="max-w-3xl w-full mx-auto text-center py-4 text-[11px] text-slate-400">
        Curify AI is a healthcare financial decision-support tool. Patient profile information is encrypted and used solely for procedural matching.
      </footer>
    </div>
  );
}
