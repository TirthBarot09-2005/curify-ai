import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, resolveClinicalMapping } from '../../context/AppContext';
import { ProgressSteps, Disclaimer } from '../../components/shared';
import { ArrowRight, Sparkles, Activity, CheckCircle2, ChevronRight, Edit3, ShieldAlert } from 'lucide-react';
import type { AnalysisStep } from '../../types';

const initialSteps: AnalysisStep[] = [
  { label: 'Interpreting healthcare requirement', status: 'pending' },
  { label: 'Mapping clinical category & taxonomy codes', status: 'pending' },
  { label: 'Identifying recommended treatment pathways', status: 'pending' },
  { label: 'Benchmarking provider data & hospital accreditations', status: 'pending' },
  { label: 'Estimating componentized treatment costs', status: 'pending' },
  { label: 'Calculating confidence reliability score', status: 'pending' },
];

export default function PatientAnalysis() {
  const navigate = useNavigate();
  const { currentIntake, currentMapping, setMapping, analyzeIntake, aiQuota } = useApp();
  const [steps, setSteps] = useState<AnalysisStep[]>(initialSteps);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const analysisStarted = useRef(false);

  const runAnalysis = useCallback(async () => {
    if (!currentIntake) return;

    // Start the animated progress steps
    const stepPromise = (async () => {
      for (let i = 0; i < initialSteps.length; i++) {
        setSteps((prev) =>
          prev.map((s, idx) => ({
            ...s,
            status: idx < i ? 'complete' : idx === i ? 'active' : 'pending',
          })),
        );
        await new Promise((r) => setTimeout(r, 450 + Math.random() * 200));
      }
      setSteps((prev) => prev.map((s) => ({ ...s, status: 'complete' as const })));
    })();

    // Safety timeout: max 8 seconds for API call so UI never hangs
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 8000));

    try {
      // Concurrently call backend API (with fallback on error)
      const apiPromise = analyzeIntake(currentIntake).catch((err) => {
        console.warn('[Analysis] Intake analysis error caught in page:', err);
        return resolveClinicalMapping(currentIntake.query);
      });

      // Wait for both animation to complete AND either API response or timeout
      await Promise.all([
        stepPromise,
        Promise.race([apiPromise, timeoutPromise]),
      ]);
    } catch (err) {
      console.warn('[Analysis] runAnalysis error:', err);
    } finally {
      await new Promise((r) => setTimeout(r, 300));
      setAnalysisComplete(true);
    }
  }, [currentIntake, analyzeIntake]);

  useEffect(() => {
    if (!currentIntake) {
      navigate('/patient/intake');
      return;
    }
    if (!analysisStarted.current) {
      analysisStarted.current = true;
      runAnalysis();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!analysisComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] animate-fade-in">
        <div className="card p-8 sm:p-10 max-w-lg w-full text-center border-slate-200/80 shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto mb-5 text-teal-600">
            <Activity className="w-8 h-8 animate-pulse-soft" />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold text-navy-900 mb-1.5 tracking-tight">
            Structuring Healthcare Analysis
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">
            Interpreting "{currentIntake?.query || 'your inquiry'}" against clinical category indexes and regional cost tariffs.
          </p>

          <div className="text-left bg-slate-50/80 rounded-2xl p-5 border border-slate-200/60">
            <ProgressSteps steps={steps} />
          </div>
        </div>
      </div>
    );
  }

  // Analysis complete — display exact mapped clinical data
  const mapping = currentMapping || resolveClinicalMapping(currentIntake?.query);

  return (
    <div className="animate-fade-in-up max-w-4xl mx-auto space-y-8">
      {/* Success Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Stage 2: Clinical Pathway & Requirement Analysis
            </div>
            {aiQuota && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
                <Sparkles className="w-3 h-3 text-teal-600" />
                AI Quota: {aiQuota.used} of {aiQuota.limit} used today
              </div>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">
            We understood your request as
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review the clinical category and care pathway before viewing matched hospitals.
          </p>
        </div>

        <button
          onClick={() => navigate('/patient/intake')}
          className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-center"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Modify Inquiry
        </button>
      </div>

      {/* Structured Interpretation Grid */}
      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* Left: Query & Categories */}
        <div className="space-y-4">
          <div className="card p-5 border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Your Input Query
            </span>
            <p className="text-sm sm:text-base font-semibold text-slate-800 italic bg-slate-50 p-3 rounded-xl border border-slate-200/60">
              "{currentIntake?.query || mapping.originalQuery}"
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-700">Target Region:</span>
              <span>{currentIntake?.location || 'Ahmedabad, Gujarat'}</span>
            </div>
          </div>

          <div className="card p-5 border-slate-200/80 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Mapped Clinical Category
                </span>
                {mapping.source === 'gemini' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    AI Analysis
                  </span>
                )}
              </div>
              <p className="text-lg font-bold text-teal-800">{mapping.clinicalCategory}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Primary Target Procedure</span>
                <p className="text-sm font-semibold text-slate-900">{mapping.targetProcedure}</p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Reference Code</span>
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                  ICD-10: {mapping.icdCode}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Pathway visualization */}
        <div className="card p-5 sm:p-6 border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Potential Care Pathway
            </span>
            <span className="text-xs text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full">
              Indicative Sequence
            </span>
          </div>

          <div className="space-y-0 pt-2">
            {mapping.potentialPathway.map((step, i) => (
              <div key={i} className="flex items-start gap-3.5">
                <div className="flex flex-col items-center">
                  <div className="w-5 h-5 rounded-full bg-teal-50 border-2 border-teal-600 text-teal-800 text-[10px] font-bold flex items-center justify-center mt-0.5 flex-shrink-0">
                    {i + 1}
                  </div>
                  {i < mapping.potentialPathway.length - 1 && (
                    <div className="w-0.5 h-7 bg-teal-200 my-0.5" />
                  )}
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-700 pb-3">{step}</p>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 leading-relaxed">
            * This care pathway is an indicative outline for research and budgeting. Actual diagnostic and surgical plans are finalized by treating physicians.
          </div>
        </div>
      </div>

      {/* Non-Diagnostic Disclaimer Box */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5">Clinical Classification Notice:</strong>
          Curify AI categorizes requirements solely to aggregate relevant provider fees and accreditations. It does not provide formal medical diagnoses or clinical prescriptions.
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button
          onClick={() => navigate('/patient/hospitals')}
          className="btn-primary w-full sm:w-auto text-base py-3.5 px-8 font-semibold flex items-center justify-center gap-2 shadow-md"
        >
          View Matched Hospitals & Estimates
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => navigate('/patient/intake')}
          className="btn-secondary w-full sm:w-auto text-sm py-3.5 px-6"
        >
          Refine Details
        </button>
      </div>

      <Disclaimer />
    </div>
  );
}
