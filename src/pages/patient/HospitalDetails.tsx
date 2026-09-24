import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { CostBreakdownTable, ConfidenceIndicator, Disclaimer } from '../../components/shared';
import {
  ArrowLeft,
  Star,
  MapPin,
  Shield,
  Building2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  PhoneCall,
} from 'lucide-react';
import { formatCostRange, formatINR } from '../../utils';

export default function HospitalDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hospitals, selectHospital, selectedHospital, currentIntake, currentMapping } = useApp();

  const hospital = selectedHospital?.id === id ? selectedHospital : hospitals.find((h) => h.id === id);

  if (!hospital) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto">
        <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Hospital profile not found</h2>
        <p className="text-xs text-slate-500 mt-1">Please select from the matched providers list.</p>
        <button onClick={() => navigate('/patient/hospitals')} className="btn-primary mt-4 text-xs">
          Back to Hospital Discovery
        </button>
      </div>
    );
  }

  // Ensure hospital is selected in global state
  if (selectedHospital?.id !== hospital.id) {
    selectHospital(hospital);
  }

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-8">
      {/* Back Navigation */}
      <div>
        <button
          onClick={() => navigate('/patient/hospitals')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Recommended Hospitals
        </button>
      </div>

      {/* Facility Header Card */}
      <div className="card p-6 sm:p-8 border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">
                {hospital.name}
              </h1>
              <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200/60">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                {hospital.accreditation || 'State'} Accredited
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {hospital.rating != null ? `${hospital.rating} / 5.0 Patient Satisfaction` : 'Unrated'}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-slate-400" />
                {hospital.city}, {hospital.state} {hospital.distance != null ? `(${hospital.distance} km from center)` : ''}
              </span>
              {hospital.established && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  Established {hospital.established}
                </span>
              )}
            </div>

            {/* Target treatment banner */}
            {currentMapping && (
              <div className="p-3 bg-teal-50/80 rounded-xl border border-teal-200/60 text-xs text-teal-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span>
                  Evaluated for: <strong>{currentMapping.targetProcedure}</strong> ({currentMapping.clinicalCategory})
                </span>
              </div>
            )}
          </div>

          {/* Match Score Badge */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 flex items-center lg:flex-col justify-between lg:justify-center text-center gap-3 flex-shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-xl shadow-xs">
              {hospital.matchScore}%
            </div>
            <div>
              <p className="text-xs font-bold text-navy-900 uppercase tracking-wider">Overall Match</p>
              <p className="text-[11px] text-slate-500">Weighted Provider Rank</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Breakdown */}
      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Cost & Match Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cost breakdown table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-navy-900 tracking-tight">
                  Itemized Cost Tariff Estimate
                </h2>
                {hospital.costBreakdown.isEstimate && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                    Est. Benchmark
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">Indicative Pricing Index</span>
            </div>

            <CostBreakdownTable
              components={hospital.costBreakdown.components}
              totalMin={hospital.costBreakdown.totalMin}
              totalMax={hospital.costBreakdown.totalMax}
              budget={currentIntake?.budget}
            />
          </div>

          {/* Why this match factors */}
          <div className="card p-6 border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-navy-900 tracking-tight">
                  Ranking Rationale & Scoring Weights
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  How Curify calculated the {hospital.matchScore}% match for this facility
                </p>
              </div>
              <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                Transparent Weights
              </span>
            </div>

            <div className="space-y-3.5 pt-2">
              {hospital.matchFactors.map((f) => (
                <div key={f.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">
                      {f.name}
                      <span className="text-slate-400 text-[11px] ml-1.5 font-normal">({f.weight}% weight)</span>
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums">{f.score}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        f.score >= 90 ? 'bg-emerald-500' : f.score >= 80 ? 'bg-teal-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${f.score}%`, transition: 'width 0.8s ease-out' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 leading-relaxed">
              Weights reflect clinical relevance (35%), accreditation standards (25%), institutional reputation (15%), regional affordability (15%), and geographic proximity (10%).
            </p>
          </div>
        </div>

        {/* Right Column: Confidence & Next Step Action */}
        <div className="space-y-6">
          {/* Confidence indicator with breakdown */}
          <ConfidenceIndicator
            score={hospital.confidence.overall}
            showBreakdown
            breakdown={hospital.confidence}
          />

          {/* Specialties Card */}
          <div className="card p-5 border-slate-200/80 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Departments & Clinical Strengths
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {hospital.specialties.map((s) => (
                <span key={s} className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Primary Action Card */}
          <div className="card p-6 bg-gradient-to-b from-slate-900 to-navy-900 text-white space-y-4 shadow-lg border-navy-800">
            <div>
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider block mb-1">
                Next Stage
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Package Treatment Plan
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mt-1">
                Confirm {hospital.name} to generate your formal treatment plan and prepare a structured financing case.
              </p>
            </div>

            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Indicative Range</span>
                <span className="font-bold text-white tabular-nums">
                  {formatINR(hospital.costBreakdown.totalMin)} – {formatINR(hospital.costBreakdown.totalMax)}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/patient/plan')}
              className="w-full btn-primary py-3 px-6 text-sm font-semibold flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-navy-950 shadow-md"
            >
              Continue with this Hospital
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <Disclaimer />
    </div>
  );
}
