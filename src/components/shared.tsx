import React from 'react';
import type { CaseStatus, Hospital } from '../types';
import { getStatusColors, formatINR, formatConfidence } from '../utils';
import { Shield, Star, CheckCircle2, AlertCircle, XCircle, Clock, Info, HelpCircle, GitCompare, X, Plus, Sparkles, Award } from 'lucide-react';

export function StatusBadge({ status }: { status: CaseStatus }) {
  const colors = getStatusColors(status);
  const Icon = status === 'Approved' ? CheckCircle2 :
               status === 'Needs Review' ? AlertCircle :
               status === 'Rejected' ? XCircle : Clock;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${colors.bg} ${colors.text} border border-current/10 shadow-xs`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      {status}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs animate-backdrop-in transition-opacity" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl ${maxWidth} w-full max-h-[90vh] overflow-y-auto animate-modal-in border border-slate-200/80 z-10`}>
        {children}
      </div>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-shimmer rounded-lg bg-slate-100 ${className}`} />;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100/60 flex items-center justify-center mb-4 text-teal-600 shadow-xs">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1.5 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary text-sm shadow-xs">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 flex items-start gap-2">
        <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Curify AI provides healthcare decision-support and financial estimates. It does not provide medical diagnoses or prescriptions.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
        <Shield className="w-4 h-4 text-teal-600" />
        Responsible Healthcare AI & Cost Notice
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">
        Estimated costs are indicative benchmark estimates and intended for financial planning purposes only.
        Actual costs may vary by hospital tier, clinical requirements, doctor fees, and patient health circumstances.
      </p>
      <p className="text-xs text-slate-500 leading-relaxed pt-1 border-t border-slate-200/60">
        Curify AI is a financial planning and decision-support platform. It does not formulate medical diagnoses,
        prescriptions, or substitute for professional medical consultations.
      </p>
    </div>
  );
}

export function ConfidenceIndicator({
  score,
  size = 'md',
  showBreakdown = false,
  breakdown,
}: {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showBreakdown?: boolean;
  breakdown?: { inputCompleteness: number; queryClarity: number; benchmarkMatch: number };
}) {
  const pct = Math.round(score * 100);
  const level = score >= 0.75 ? 'High' : score >= 0.5 ? 'Moderate' : 'Preliminary';
  const color = score >= 0.75 ? 'text-emerald-700' : score >= 0.5 ? 'text-amber-700' : 'text-slate-700';
  const bgBadge = score >= 0.75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : score >= 0.5 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200';
  const ringColor = score >= 0.75 ? 'stroke-emerald-500' : score >= 0.5 ? 'stroke-amber-500' : 'stroke-slate-500';
  
  const sizes = { sm: 60, md: 84, lg: 110 };
  const s = sizes[size];
  const r = (s - 10) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score * c);

  return (
    <div className="card p-5 sm:p-6 border-slate-200/80">
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0" style={{ width: s, height: s }}>
          <svg width={s} height={s} className="-rotate-90">
            <circle cx={s/2} cy={s/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
            <circle
              cx={s/2} cy={s/2} r={r} fill="none"
              className={ringColor}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold tabular-nums tracking-tight ${color}`}>{pct}%</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${bgBadge}`}>
              {level} Confidence
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-800 tracking-tight">Estimate Reliability Score</p>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            Derived from clinical query specificity, regional hospital tariff benchmarks, and case parameter coverage.
          </p>
        </div>
      </div>

      {showBreakdown && breakdown && (
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Score Factors</p>
          {[
            { label: 'Input Completeness', value: breakdown.inputCompleteness, desc: 'Information depth provided' },
            { label: 'Query Clarity', value: breakdown.queryClarity, desc: 'Clinical term match strength' },
            { label: 'Benchmark Match', value: breakdown.benchmarkMatch, desc: 'Regional pricing index confidence' },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 font-medium">{item.label}</span>
                <span className="font-semibold text-slate-900 tabular-nums">{Math.round(item.value * 100)}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${score >= 0.75 ? 'bg-emerald-500' : score >= 0.5 ? 'bg-amber-500' : 'bg-slate-500'}`}
                  style={{ width: `${item.value * 100}%`, transition: 'width 0.8s ease-out' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CostBreakdownTable({
  components,
  totalMin,
  totalMax,
  budget,
}: {
  components: { name: string; minCost: number; maxCost: number }[];
  totalMin: number;
  totalMax: number;
  budget?: number;
}) {
  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');
  const maxVal = Math.max(...components.map((c) => c.maxCost));
  const isWithinBudget = budget ? totalMax <= budget : null;
  const isSlightlyAbove = budget ? totalMax > budget && totalMin <= budget : null;

  return (
    <div className="card overflow-hidden border-slate-200/80 shadow-xs">
      <div className="p-5 sm:p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Comprehensive Estimate</span>
          <p className="text-2xl sm:text-3xl font-bold text-navy-900 mt-0.5 tabular-nums tracking-tight">
            {fmt(totalMin)} – {fmt(totalMax)}
          </p>
        </div>
        {budget && (
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
            isWithinBudget
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : isSlightlyAbove
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isWithinBudget ? 'Within Stated Budget' : isSlightlyAbove ? 'Marginally Over Budget' : 'Exceeds Stated Budget'}
          </div>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {components.map((comp) => {
          const pct = Math.round((comp.maxCost / totalMax) * 100);
          return (
            <div key={comp.name} className="px-5 sm:px-6 py-3.5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-800 truncate">{comp.name}</span>
                  <span className="text-xs text-slate-400 tabular-nums">{pct}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{ width: `${(comp.maxCost / maxVal) * 100}%`, transition: 'width 0.6s ease-out' }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                    {fmt(comp.minCost)} – {fmt(comp.maxCost)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
        <span className="text-sm font-semibold text-slate-800">Total Indicative Range</span>
        <span className="text-lg font-bold text-navy-900 tabular-nums">
          {fmt(totalMin)} – {fmt(totalMax)}
        </span>
      </div>

      {budget && (
        <div className="px-5 sm:px-6 py-4 bg-teal-50/70 border-t border-teal-100 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-sm">
          <div>
            <span className="text-teal-800 text-xs font-semibold uppercase tracking-wider block">Your Budget</span>
            <span className="text-base font-bold text-teal-950 tabular-nums">{fmt(budget)}</span>
          </div>
          <div className="sm:text-right">
            <span className="text-teal-800 text-xs font-semibold uppercase tracking-wider block">Projected Buffer / Margin</span>
            <span className={`text-base font-bold tabular-nums ${budget - totalMax >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {budget - totalMax >= 0 ? '+' : ''}{fmt(budget - totalMax)} to {budget - totalMin >= 0 ? '+' : ''}{fmt(budget - totalMin)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProgressSteps({
  steps,
}: {
  steps: { label: string; status: 'pending' | 'active' | 'complete' }[];
}) {
  return (
    <div className="space-y-3.5">
      {steps.map((step, i) => (
        <div key={i} className={`flex items-center gap-3.5 transition-all duration-300 ${
          step.status === 'pending' ? 'opacity-40' : 'opacity-100'
        }`}>
          {step.status === 'complete' ? (
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 text-white shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : step.status === 'active' ? (
            <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0 animate-pulse-soft text-white shadow-xs">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-slate-200 flex-shrink-0 border border-slate-300/60" />
          )}
          <span className={`text-sm font-medium tracking-tight ${
            step.status === 'complete' ? 'text-emerald-800' :
            step.status === 'active' ? 'text-teal-900 font-semibold' : 'text-slate-500'
          }`}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Toast({
  message,
  type = 'success',
  onClose,
}: {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}) {
  const colors = {
    success: 'bg-white border-emerald-200 text-slate-800 shadow-xl border-l-4 border-l-emerald-500',
    error: 'bg-white border-rose-200 text-slate-800 shadow-xl border-l-4 border-l-rose-500',
    info: 'bg-white border-sky-200 text-slate-800 shadow-xl border-l-4 border-l-sky-500',
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-600 flex-shrink-0" />,
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3.5 rounded-xl border animate-slide-in-right max-w-sm ${colors[type]}`}>
      {icons[type]}
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none p-1">&times;</button>
    </div>
  );
}

export function HospitalComparisonModal({
  open,
  onClose,
  hospitals,
  onSelectHospital,
  allHospitals,
  onAddHospital,
  onRemoveHospital,
}: {
  open: boolean;
  onClose: () => void;
  hospitals: Hospital[];
  onSelectHospital: (hospital: Hospital) => void;
  allHospitals?: Hospital[];
  onAddHospital?: (hospital: Hospital) => void;
  onRemoveHospital?: (hospitalId: string) => void;
}) {
  if (!open) return null;

  if (hospitals.length === 0) {
    return (
      <Modal open={open} onClose={onClose} maxWidth="max-w-md">
        <div className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto border border-teal-100">
            <GitCompare className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-navy-900">No Hospitals Selected</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            Click the "Compare" button on any hospital card to compare up to 3 facilities side-by-side.
          </p>
          <button onClick={onClose} className="btn-primary text-xs py-2.5 px-5 cursor-pointer">
            Explore Providers
          </button>
        </div>
      </Modal>
    );
  }

  const minCost = Math.min(...hospitals.map((h) => h.costBreakdown?.totalMin || Infinity));
  const maxRating = Math.max(...hospitals.map((h) => h.rating || 0));
  const maxMatch = Math.max(...hospitals.map((h) => h.matchScore || 0));

  const availableToAdd = allHospitals
    ? allHospitals.filter((ah) => !hospitals.some((h) => h.id === ah.id))
    : [];

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-5xl">
      <div className="p-6 sm:p-8">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-navy-900 tracking-tight">Hospital Comparison Matrix</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparing {hospitals.length} of 3 healthcare facilities side-by-side
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 text-xl font-semibold cursor-pointer transition-colors"
          >
            &times;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70">
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">
                  Provider / Criteria
                </th>
                {hospitals.map((h) => (
                  <th key={h.id} className="py-4 px-4 font-bold text-navy-900 text-base min-w-[200px] align-top">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="block text-sm font-bold text-slate-900">{h.name}</span>
                        <span className="text-xs font-normal text-slate-500 block">{h.city}</span>
                      </div>
                      {onRemoveHospital && hospitals.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveHospital(h.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                          title={`Remove ${h.name} from comparison`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                {hospitals.length < 3 && availableToAdd.length > 0 && onAddHospital && (
                  <th className="py-4 px-4 min-w-[180px] align-top">
                    <div className="p-3 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
                      <span className="text-xs font-semibold text-slate-500 block mb-2">+ Add Another</span>
                      <select
                        onChange={(e) => {
                          const found = availableToAdd.find((ah) => ah.id === e.target.value);
                          if (found) {
                            onAddHospital(found);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-1.5 text-slate-700 font-medium cursor-pointer"
                      >
                        <option value="" disabled>Select hospital...</option>
                        {availableToAdd.map((ah) => (
                          <option key={ah.id} value={ah.id}>
                            {ah.name} ({ah.city})
                          </option>
                        ))}
                      </select>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Match Score */}
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-600">Match Score</td>
                {hospitals.map((h) => {
                  const isTopMatch = h.matchScore === maxMatch && hospitals.length > 1;
                  return (
                    <td key={h.id} className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 font-bold text-xs">
                          {h.matchScore}% Match
                        </span>
                        {isTopMatch && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Best Match
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
                {hospitals.length < 3 && availableToAdd.length > 0 && <td className="py-3.5 px-4" />}
              </tr>

              {/* Indicative Cost */}
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-600">Indicative Cost Range</td>
                {hospitals.map((h) => {
                  const isLowestCost = h.costBreakdown?.totalMin === minCost && hospitals.length > 1;
                  return (
                    <td key={h.id} className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-navy-900 text-sm tabular-nums block">
                          {formatINR(h.costBreakdown.totalMin)} – {formatINR(h.costBreakdown.totalMax)}
                        </span>
                        {isLowestCost && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 mt-1">
                            <Sparkles className="w-3 h-3" />
                            Lowest Cost
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
                {hospitals.length < 3 && availableToAdd.length > 0 && <td className="py-3.5 px-4" />}
              </tr>

              {/* Star Rating */}
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-600">Patient Rating</td>
                {hospitals.map((h) => {
                  const isTopRating = h.rating === maxRating && hospitals.length > 1;
                  return (
                    <td key={h.id} className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 font-semibold text-slate-900 text-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {h.rating} / 5.0
                        </span>
                        {isTopRating && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Top Rated
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
                {hospitals.length < 3 && availableToAdd.length > 0 && <td className="py-3.5 px-4" />}
              </tr>

              {/* Accreditation */}
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-600">Accreditation Quality</td>
                {hospitals.map((h) => (
                  <td key={h.id} className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold text-xs bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <Shield className="w-3 h-3 text-emerald-600" />
                      {h.accreditation}
                    </span>
                  </td>
                ))}
                {hospitals.length < 3 && availableToAdd.length > 0 && <td className="py-3.5 px-4" />}
              </tr>

              {/* Distance & Location */}
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-600">Distance & City</td>
                {hospitals.map((h) => (
                  <td key={h.id} className="py-3.5 px-4 text-slate-700 text-xs font-medium">
                    {h.distance} km from center · {h.city}
                  </td>
                ))}
                {hospitals.length < 3 && availableToAdd.length > 0 && <td className="py-3.5 px-4" />}
              </tr>

              {/* Reliability Confidence */}
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-600">Reliability Confidence</td>
                {hospitals.map((h) => (
                  <td key={h.id} className="py-3.5 px-4 text-emerald-700 font-semibold text-xs">
                    {formatConfidence(h.confidence.overall)} High Reliability
                  </td>
                ))}
                {hospitals.length < 3 && availableToAdd.length > 0 && <td className="py-3.5 px-4" />}
              </tr>

              {/* Key Specialties */}
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-600">Clinical Focus</td>
                {hospitals.map((h) => (
                  <td key={h.id} className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {h.specialties?.slice(0, 3).map((spec) => (
                        <span key={spec} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
                {hospitals.length < 3 && availableToAdd.length > 0 && <td className="py-3.5 px-4" />}
              </tr>

              {/* Action Button */}
              <tr className="bg-slate-50/50">
                <td className="py-4 px-4 font-bold text-slate-700">Choose Provider</td>
                {hospitals.map((h) => (
                  <td key={h.id} className="py-4 px-4">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectHospital(h);
                      }}
                      className="btn-primary text-xs w-full py-2.5 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer font-semibold"
                    >
                      <span>Select & View</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                ))}
                {hospitals.length < 3 && availableToAdd.length > 0 && <td className="py-4 px-4" />}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
