import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, resolveClinicalMapping, getHospitalsForMapping } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Modal, Disclaimer, CostBreakdownTable, ConfidenceIndicator } from '../../components/shared';
import { formatINR, formatConfidence, getConfidenceLevel } from '../../utils';
import { api } from '../../lib/api';
import {
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Building2,
  Shield,
  Star,
  Sparkles,
  ArrowRight,
  FileCheck,
  Info,
  Calendar,
  Layers,
  FileText,
  Clock,
  HeartPulse,
  DollarSign,
  User,
  ChevronRight,
  SlidersHorizontal,
  Download,
} from 'lucide-react';

const samplePresets = [
  { label: 'Gallbladder Removal', query: 'Laparoscopic cholecystectomy with 2-day recovery stay' },
  { label: 'Knee Replacement', query: 'Total knee replacement surgery under ₹1.6L in Ahmedabad' },
  { label: 'Cataract Surgery', query: 'Cataract surgery with premium multifocal lens implant' },
  { label: 'Cardiac Angiography', query: 'Diagnostic cardiac angiography evaluation and stent pricing' },
];

export default function TreatmentPlan() {
  const navigate = useNavigate();
  const {
    selectedHospital,
    currentMapping,
    currentIntake,
    hospitals,
    selectHospital,
    setMapping,
    setIntake,
    finalizeCase,
  } = useApp();
  const { user } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [caseId, setCaseId] = useState('');

  const handleDownloadPdf = async () => {
    if (!caseId) return;
    try {
      setDownloadingPdf(true);
      await api.reports.downloadPdf(caseId);
    } catch (err) {
      console.error('Failed to download PDF report:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // If no mapping or hospital is active yet (e.g. direct visit), initialize with a smart active default
  useEffect(() => {
    if (!currentMapping) {
      const defaultMapping = resolveClinicalMapping('Laparoscopic cholecystectomy with 2-day recovery stay');
      setMapping(defaultMapping);
      const defaultHospitals = getHospitalsForMapping(defaultMapping);
      if (defaultHospitals.length > 0 && !selectedHospital) {
        selectHospital(defaultHospitals[0]);
      }
    } else if (!selectedHospital && hospitals.length > 0) {
      selectHospital(hospitals[0]);
    }
  }, [currentMapping, selectedHospital, hospitals, setMapping, selectHospital]);

  const activeMapping = currentMapping || resolveClinicalMapping('Laparoscopic cholecystectomy with 2-day recovery stay');
  const activeHospitals = hospitals.length > 0 ? hospitals : getHospitalsForMapping(activeMapping);
  const activeHospital = selectedHospital || activeHospitals[0];

  const handleSelectPreset = (query: string) => {
    const newMapping = resolveClinicalMapping(query);
    setMapping(newMapping);
    setIntake({
      query,
      location: currentIntake?.location || 'Ahmedabad, Gujarat',
      budget: currentIntake?.budget || 160000,
    });
    const newHospitals = getHospitalsForMapping(newMapping, currentIntake?.location);
    if (newHospitals.length > 0) {
      selectHospital(newHospitals[0]);
    }
  };

  const handleFinalize = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    const newCase = await finalizeCase();
    if (newCase) {
      setCaseId(newCase.id);
      setFinalized(true);
      setShowModal(false);
    }
    setLoading(false);
  };

  const h = activeHospital;
  const m = activeMapping;

  if (finalized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] animate-fade-in-up">
        <div className="card p-8 sm:p-12 max-w-lg w-full text-center border-slate-200/80 shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
              Treatment Plan Finalized
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight pt-2">
              Financing Case Generated
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              Your structured care package has been organized for medical loan underwriting and lender review.
            </p>
          </div>

          <div className="card p-5 bg-slate-50/80 border-slate-200/80 text-left space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-xs font-semibold text-slate-500">Case Reference ID</span>
              <span className="text-sm font-mono font-bold text-navy-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {caseId}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-xs font-semibold text-slate-500">Hospital & Procedure</span>
              <span className="text-xs font-semibold text-slate-800 text-right">{h.name} · {m.targetProcedure}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-xs font-semibold text-slate-500">Estimated Total</span>
              <span className="text-sm font-bold text-navy-900 tabular-nums">
                {formatINR(h.costBreakdown.totalMin)} – {formatINR(h.costBreakdown.totalMax)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Initial Review Status</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                Pending Lender Review
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => navigate('/patient/case')}
              className="btn-primary flex-1 py-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              View Financing Case Dossier
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="btn-secondary flex-1 py-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              title="Download official PDF report"
            >
              {downloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              ) : (
                <Download className="w-4 h-4 text-teal-600" />
              )}
              <span>{downloadingPdf ? 'Exporting PDF...' : 'Download Dossier (PDF)'}</span>
            </button>
          </div>
          <div>
            <button
              onClick={() => navigate('/patient/history')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer mt-1"
            >
              Back to Treatment History
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isWithinBudget = currentIntake?.budget
    ? h.costBreakdown.totalMax <= currentIntake.budget
    : true;

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-8">
      {/* Top Breadcrumb / Stage indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-1.5">
            <FileCheck className="w-3.5 h-3.5 text-teal-600" />
            Stage 4 of 5 · Treatment Plan & Financial Structuring
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">
            Treatment Plan Blueprint
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Pre-admission clinical scope, itemized tariff breakdown, and financing package.
          </p>
        </div>

        <button
          onClick={() => navigate('/patient/hospitals')}
          className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
        >
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          Change Hospital ({activeHospitals.length} available)
        </button>
      </div>

      {/* Quick Procedure Switcher Tabs */}
      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-600">Active Procedure:</span>
          <span className="text-xs font-bold text-navy-900 truncate">{m.targetProcedure}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Switch:</span>
          {samplePresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleSelectPreset(preset.query)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                m.originalQuery === preset.query || m.targetProcedure.includes(preset.label.split(' ')[0])
                  ? 'bg-teal-600 text-white font-semibold shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Core Summary Cards Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* 1. Selected Hospital Card */}
        <div className="card p-6 border-slate-200/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Selected Hospital
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200/60">
              <Shield className="w-3 h-3 text-emerald-600" />
              {h.accreditation}
            </span>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-navy-900 text-teal-400 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-navy-900 leading-snug truncate">{h.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{h.city}, {h.state} • {h.distance} km away</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {h.rating} / 5.0
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                  {h.matchScore}% Match Score
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
            {h.specialties.map((s) => (
              <span key={s} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* 2. Clinical Classification Card */}
        <div className="card p-6 border-slate-200/80 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Clinical Classification
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono font-bold">
              ICD-10: {m.icdCode}
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-teal-800 leading-snug">{m.clinicalCategory}</h3>
            <p className="text-xs font-semibold text-slate-900 mt-1">{m.targetProcedure}</p>
            <p className="text-[11px] text-slate-500 mt-2 line-clamp-3 leading-relaxed">
              {m.primaryConcern}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Patient: <strong>{user?.name || 'Patient'}</strong> ({currentIntake?.gender || 'Male'}, {currentIntake?.age || 48}y)</span>
          </div>
        </div>

        {/* 3. Cost & Budget Gauge Card */}
        <div className="card p-6 border-slate-200/80 space-y-3 shadow-xs bg-gradient-to-br from-white to-slate-50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Estimated Total Cost
            </span>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              Benchmarked
            </span>
          </div>

          <div>
            <p className="text-2xl sm:text-3xl font-bold text-navy-900 tabular-nums tracking-tight">
              {formatINR(h.costBreakdown.totalMin)} – {formatINR(h.costBreakdown.totalMax)}
            </p>
            <div className="mt-2 text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Stated Budget:</span>
                <span className="font-semibold text-slate-800">{formatINR(currentIntake?.budget || 160000)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Budget Status:</span>
                <span className={`font-semibold ${isWithinBudget ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isWithinBudget ? '✓ Well within allocation' : 'Marginally above target'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Reliability:</span>
            <span className="font-bold text-emerald-700">{formatConfidence(h.confidence.overall)} Confidence</span>
          </div>
        </div>
      </div>

      {/* Itemized Cost Breakdown Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-bold text-navy-900 tracking-tight">
              Granular Out-of-Pocket Tariff Breakdown
            </h2>
          </div>
          <span className="text-xs text-slate-500">Pre-screened against regional hospital benchmark tariffs</span>
        </div>

        <CostBreakdownTable
          components={h.costBreakdown.components}
          totalMin={h.costBreakdown.totalMin}
          totalMax={h.costBreakdown.totalMax}
          budget={currentIntake?.budget || 160000}
        />
      </div>

      {/* 2-Column: Potential Care Pathway & Confidence Factors */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Step-by-Step Care Pathway */}
        <div className="card p-6 border-slate-200/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-navy-900">Indicative Clinical Care Pathway</h3>
            </div>
            <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
              4 Milestones
            </span>
          </div>

          <div className="space-y-0 pt-1">
            {m.potentialPathway.map((step, i) => (
              <div key={i} className="flex items-start gap-3.5">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-teal-50 border-2 border-teal-600 text-teal-800 text-[11px] font-bold flex items-center justify-center mt-0.5 flex-shrink-0">
                    {i + 1}
                  </div>
                  {i < m.potentialPathway.length - 1 && (
                    <div className="w-0.5 h-8 bg-teal-200 my-0.5" />
                  )}
                </div>
                <div className="pb-3">
                  <p className="text-xs sm:text-sm font-semibold text-slate-800">{step}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {i === 0 ? 'Initial clinical clearance & assessment' :
                     i === 1 ? 'Diagnostic imaging & pre-op fitness verification' :
                     i === 2 ? 'Hospital admission & scheduled surgical intervention' :
                     'Post-operative observation, discharge planning & recovery'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 leading-relaxed">
            * All milestones are scheduled with hospital coordinators upon loan / case approval.
          </div>
        </div>

        {/* Right: Confidence Score Reliability */}
        <div className="space-y-6">
          <ConfidenceIndicator
            score={h.confidence.overall}
            breakdown={{
              inputCompleteness: h.confidence.inputCompleteness,
              queryClarity: h.confidence.queryClarity,
              benchmarkMatch: h.confidence.benchmarkMatch,
            }}
          />

          <div className="card p-5 bg-teal-50/60 border-teal-200/70 space-y-2.5">
            <div className="flex items-center gap-2 text-teal-900 font-semibold text-xs">
              <Sparkles className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span>Underwriting Pre-Qualification Guarantee</span>
            </div>
            <p className="text-[11px] text-teal-800 leading-relaxed">
              This treatment plan contains standardized ICD-10 codes ({m.icdCode}) and tariff component lines recognized by our partner lending desks, enabling faster turnaround for healthcare financing.
            </p>
          </div>
        </div>
      </div>

      {/* Final Call to Action Bar */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0F172A] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl border border-slate-800">
        <div className="space-y-1 max-w-xl text-left">
          <h3 className="text-lg font-bold text-white tracking-tight">Ready to generate your financing dossier?</h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Finalizing packages this treatment plan with {h.name} for lender underwriting desk review.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-primary py-3.5 px-8 text-sm font-semibold whitespace-nowrap bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md w-full sm:w-auto cursor-pointer"
        >
          Finalize Treatment Plan
        </button>
      </div>

      <Disclaimer />

      {/* Confirmation Modal */}
      <Modal open={showModal} onClose={() => !loading && setShowModal(false)}>
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block mb-1">Confirmation Step</span>
            <h2 className="text-xl font-bold text-navy-900 tracking-tight">Finalize Treatment Dossier</h2>
            <p className="text-xs text-slate-500 mt-1">
              Please review the case parameters before submission.
            </p>
          </div>

          <div className="card p-4 bg-slate-50/80 border-slate-200/80 text-xs space-y-2.5">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Selected Provider</span>
              <span className="font-bold text-slate-900">{h.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Procedure</span>
              <span className="font-bold text-slate-900">{m.targetProcedure}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Clinical Code</span>
              <span className="font-bold font-mono text-slate-900">ICD-10: {m.icdCode}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Indicative Cost</span>
              <span className="font-bold text-navy-900 tabular-nums">
                {formatINR(h.costBreakdown.totalMin)} – {formatINR(h.costBreakdown.totalMax)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Confidence Score</span>
              <span className="font-bold text-emerald-700">{formatConfidence(h.confidence.overall)}</span>
            </div>
          </div>

          <div className="p-3 bg-teal-50 rounded-xl border border-teal-100 text-[11px] text-teal-900 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-teal-600 inline mr-1" />
            Upon finalizing, this case dossier will be immediately formatted with a unique reference ID and queued for Lender underwriting review.
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleFinalize}
              disabled={loading}
              className="btn-primary flex-1 py-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Generating Case Dossier...' : 'Confirm & Finalize'}
            </button>
            <button
              onClick={() => setShowModal(false)}
              disabled={loading}
              className="btn-secondary flex-1 py-3 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              Review Details
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
