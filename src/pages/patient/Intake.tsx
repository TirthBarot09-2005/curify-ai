import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { MapPin, ChevronDown, ChevronUp, Loader2, ArrowRight, Shield, Bot, FileText } from 'lucide-react';

const cityPresets = [
  'Ahmedabad, Gujarat',
  'Mumbai, Maharashtra',
  'Delhi NCR',
  'Bengaluru, Karnataka',
  'Pune, Maharashtra',
];

const promptSuggestions = [
  'Total knee replacement surgery under ₹1.6L in Ahmedabad',
  'Cataract surgery with premium multifocal lens implant',
  'Cardiac angiography and diagnostic coronary evaluation',
  'Laparoscopic gall bladder removal (cholecystectomy)',
  'Laparoscopic hernia repair with mesh',
  'Laser kidney stone removal (RIRS lithotripsy)',
];

export default function PatientIntake() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIntake, currentIntake, aiQuota, refreshQuota } = useApp();
  const [query, setQuery] = useState((location.state as any)?.query || currentIntake?.query || '');
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [manualCategory, setManualCategory] = useState('Orthopedics');
  const [manualProcedure, setManualProcedure] = useState('');

  const clinicalCategories = [
    'Orthopedics',
    'Cardiology',
    'General Surgery',
    'Gastroenterology',
    'Neurology',
    'Ophthalmology',
    'Urology',
    'General Medicine',
    'Gynecology'
  ];
  const [loc, setLoc] = useState(currentIntake?.location || 'Ahmedabad, Gujarat');
  const [showOptional, setShowOptional] = useState(false);
  const [age, setAge] = useState(currentIntake?.age ? currentIntake.age.toString() : '');
  const [gender, setGender] = useState(currentIntake?.gender || '');
  const [comorbidities, setComorbidities] = useState(currentIntake?.comorbidities || '');
  const [budget, setBudget] = useState(currentIntake?.budget ? currentIntake.budget.toString() : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [quotaLoading, setQuotaLoading] = useState(aiQuota === null);
  const quotaUsed = aiQuota?.used ?? 0;
  const quotaLimit = aiQuota?.limit ?? 3;
  const limitReached = quotaUsed >= quotaLimit;

  useEffect(() => {
    if ((location.state as any)?.query) {
      setQuery((location.state as any).query);
    }
  }, [location.state]);

  useEffect(() => {
    let mounted = true;
    refreshQuota().finally(() => {
      if (mounted) setQuotaLoading(false);
    });
    return () => { mounted = false; };
  }, [refreshQuota]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (mode === 'ai' && !query.trim()) {
      setError('Please describe what procedure or healthcare need you are planning for.');
      return;
    }
    if (mode === 'manual' && !manualProcedure.trim()) {
      setError('Please enter the target procedure.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'manual') {
        await setIntake({
          query: `Procedure: ${manualProcedure}, Category: ${manualCategory}`,
          location: loc,
          age: age ? parseInt(age) : undefined,
          gender: gender || undefined,
          comorbidities: comorbidities || undefined,
          budget: budget ? parseInt(budget) : undefined,
          isManual: true,
          manualMapping: {
            originalQuery: `Manual Entry: ${manualProcedure}`,
            primaryConcern: `Patient reported need for ${manualProcedure}`,
            clinicalCategory: manualCategory,
            icdCode: 'N/A',
            potentialPathway: [
              'Initial Specialist Consultation',
              'Pre-operative Diagnostics',
              manualProcedure,
              'Post-operative Recovery'
            ],
            targetProcedure: manualProcedure,
            source: 'manual'
          }
        });
      } else {
        await setIntake({
          query: query.trim(),
          location: loc,
          age: age ? parseInt(age) : undefined,
          gender: gender || undefined,
          comorbidities: comorbidities || undefined,
          budget: budget ? parseInt(budget) : undefined,
        });
      }
      navigate('/patient/analysis');
    } catch (err: any) {
      if (err.status === 429) {
        refreshQuota();
        setError('Daily AI analysis limit reached. Resets tomorrow at midnight.');
      } else {
        setError(err.message || 'Analysis failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2 border-b border-stone-200 pb-5">
        <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
          Stage 1 of 5 · Clinical & Financial Intake
        </span>
        <h1 className="text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight">
          Describe your healthcare requirement
        </h1>
        <p className="text-sm text-stone-500 max-w-2xl leading-relaxed">
          Specify your planned procedure, symptoms, or budget constraints. Curify will interpret clinical pathways and benchmark hospital cost tariffs in your region.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Main Intake Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 space-y-5 shadow-xs">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}

            {/* Mode Toggle */}
            <div className="flex bg-stone-100 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => { setMode('ai'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  mode === 'ai' 
                    ? 'bg-white text-teal-700 shadow-sm border border-stone-200/60' 
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                <Bot className="w-4 h-4" />
                AI Assistant
              </button>
              <button
                type="button"
                onClick={() => { setMode('manual'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  mode === 'manual' 
                    ? 'bg-white text-stone-900 shadow-sm border border-stone-200/60' 
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                Manual Selection
              </button>
            </div>

            {/* Dynamic Input Area */}
            {mode === 'ai' ? (
              <div className="animate-fade-in">
                <div className="flex justify-between items-baseline mb-1.5">
                  <label htmlFor="query" className="text-xs font-semibold text-stone-800 uppercase tracking-wider">
                    Healthcare Requirement <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-stone-400">Plain English or Medical Term</span>
                </div>
                <textarea
                  id="query"
                  rows={4}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setError(''); }}
                  placeholder="e.g. Total knee replacement under ₹1.6 lakh with 3 days hospital stay..."
                  className="w-full p-3.5 text-sm text-stone-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 leading-relaxed resize-none"
                  autoFocus
                />

                {/* Quota Bar */}
                {!quotaLoading && (
                  <div className="mt-3 p-3 rounded-lg border border-stone-200 bg-stone-50/50">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[11px] font-semibold text-stone-700 uppercase tracking-wider">Daily AI Quota</span>
                      <span className="text-[11px] font-medium text-stone-500">{quotaUsed} / {quotaLimit}</span>
                    </div>
                    <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          limitReached ? 'bg-rose-500' : (quotaLimit - quotaUsed <= 2 ? 'bg-amber-500' : 'bg-teal-500')
                        }`} 
                        style={{ width: `${Math.min(100, (quotaUsed / quotaLimit) * 100)}%` }} 
                      />
                    </div>
                    {(limitReached || quotaLimit - quotaUsed <= 2) && (
                      <div className={`mt-2 text-[10px] font-medium ${limitReached ? 'text-rose-600' : 'text-amber-600'}`}>
                        {limitReached ? '🚫 Daily limit reached — resets tomorrow at midnight.' : `⚠ ${quotaLimit - quotaUsed} analyses remaining today.`}
                      </div>
                    )}
                  </div>
                )}

                {/* Suggestions */}
                <div className="mt-3">
                  <span className="text-[11px] font-medium text-stone-400 block mb-1.5">Prompt Examples:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {promptSuggestions.map((item) => (
                      <button
                        type="button"
                        key={item}
                        onClick={() => { setQuery(item); setError(''); }}
                        className="px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs transition-colors text-left border border-stone-200"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <label htmlFor="manualCategory" className="text-xs font-semibold text-stone-800 uppercase tracking-wider mb-1.5 block">
                    Clinical Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="manualCategory"
                    value={manualCategory}
                    onChange={(e) => { setManualCategory(e.target.value); setError(''); }}
                    className="w-full p-3.5 text-sm text-stone-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  >
                    {clinicalCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="manualProcedure" className="text-xs font-semibold text-stone-800 uppercase tracking-wider mb-1.5 block">
                    Target Procedure <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="manualProcedure"
                    type="text"
                    value={manualProcedure}
                    onChange={(e) => { setManualProcedure(e.target.value); setError(''); }}
                    placeholder="e.g. Total Knee Replacement"
                    className="w-full p-3.5 text-sm text-stone-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-xs font-semibold text-stone-800 uppercase tracking-wider mb-1.5">
                Location Benchmark <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  id="location"
                  type="text"
                  value={loc}
                  onChange={(e) => setLoc(e.target.value)}
                  placeholder="Enter city or district..."
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm text-stone-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-xs text-stone-400 mr-1">Presets:</span>
                {cityPresets.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setLoc(c)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                      loc === c
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {c.split(',')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional parameters section */}
            <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50/50">
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="w-full flex items-center justify-between p-4 text-xs font-semibold text-stone-800 uppercase tracking-wider hover:bg-stone-100/60 transition-colors text-left"
              >
                <span>Optional Financial & Patient Context</span>
                {showOptional ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
              </button>

              {showOptional && (
                <div className="p-4 pt-2 border-t border-stone-200 grid sm:grid-cols-2 gap-4 animate-fade-in bg-white">
                  <div>
                    <label htmlFor="budget" className="block text-xs font-medium text-stone-700 mb-1">
                      Target Budget (₹)
                    </label>
                    <input
                      id="budget"
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="e.g. 160000"
                      className="w-full p-2.5 text-xs text-stone-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="age" className="block text-xs font-medium text-stone-700 mb-1">
                      Patient Age
                    </label>
                    <input
                      id="age"
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 58"
                      className="w-full p-2.5 text-xs text-stone-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="gender" className="block text-xs font-medium text-stone-700 mb-1">
                      Gender
                    </label>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full p-2.5 text-xs text-stone-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-600"
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="comorbidities" className="block text-xs font-medium text-stone-700 mb-1">
                      Known Health Conditions
                    </label>
                    <input
                      id="comorbidities"
                      type="text"
                      value={comorbidities}
                      onChange={(e) => setComorbidities(e.target.value)}
                      placeholder="e.g. Diabetes, Hypertension"
                      className="w-full p-2.5 text-xs text-stone-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit CTA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || (mode === 'ai' && limitReached)}
                className="w-full py-3.5 px-6 rounded-lg bg-[#1C1917] hover:bg-[#292524] active:scale-[0.985] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'ai' && limitReached 
                  ? 'Daily Limit Reached' 
                  : (loading ? 'Analyzing Healthcare Options...' : 'Analyze Care Options & Costs')}
                {!loading && !(mode === 'ai' && limitReached) && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </form>

        {/* Sidebar: Structured Transparency Notes */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              How Analysis Operates
            </h3>

            <div className="space-y-3.5 text-xs text-stone-600">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-stone-100 font-bold text-stone-800 flex items-center justify-center flex-shrink-0 text-[10px]">1</span>
                <div>
                  <strong className="text-stone-900 block font-semibold">Clinical Interpretation</strong>
                  Maps terms to ICD-10 taxonomy and hospital care pathways.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-stone-100 font-bold text-stone-800 flex items-center justify-center flex-shrink-0 text-[10px]">2</span>
                <div>
                  <strong className="text-stone-900 block font-semibold">Accreditation Match</strong>
                  Filters NABH/JCI verified facilities with specialist availability.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-stone-100 font-bold text-stone-800 flex items-center justify-center flex-shrink-0 text-[10px]">3</span>
                <div>
                  <strong className="text-stone-900 block font-semibold">Tariff Breakdown</strong>
                  Projects itemized ranges for surgical, stay, and diagnostic fees.
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-500 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-stone-700">
              <Shield className="w-3.5 h-3.5 text-teal-600" />
              Non-Diagnostic Notice
            </div>
            <p className="leading-relaxed">
              Curify AI provides decision-support and cost benchmarking. It does not provide formal medical diagnoses or prescriptions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
