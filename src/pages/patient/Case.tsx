import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, CostBreakdownTable, Disclaimer, Toast } from '../../components/shared';
import { formatINR, formatDate, formatDateTime } from '../../utils';
import { api } from '../../lib/api';
import { useCaseSSE } from '../../lib/useCaseSSE';
import type { CaseEvent, CaseStatus } from '../../types';
import {
  ArrowLeft,
  Shield,
  Star,
  Building2,
  FileCheck,
  User,
  Activity,
  FileText,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Bell,
  Wifi,
  WifiOff,
  MessageSquare,
} from 'lucide-react';

export default function PatientCase() {
  const navigate = useNavigate();
  const { cases, refreshCases } = useApp();
  const { user } = useAuth();

  // Get the most recent case for this patient (never fall back to foreign demo cases)
  const latestCase = cases.find((c) => {
    if (!user) return false;
    if ((c as any).patientId && (c as any).patientId === user.id) return true;
    if (user.name && c.patient?.name && c.patient.name.toLowerCase() === user.name.toLowerCase()) return true;
    return false;
  });

  if (!latestCase) {
    return (
      <div className="card p-12 text-center max-w-md mx-auto">
        <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">No financing case found</h2>
        <p className="text-xs text-slate-500 mt-1">Explore options to generate a treatment plan first.</p>
        <button onClick={() => navigate('/patient/intake')} className="btn-primary mt-4 text-xs">
          Explore Care Options
        </button>
      </div>
    );
  }

  return <CaseContent latestCase={latestCase} />;
}

/**
 * Inner component that handles case-specific state (hooks must be unconditional).
 */
function CaseContent({ latestCase }: { latestCase: any }) {
  const navigate = useNavigate();
  const { refreshCases } = useApp();
  const c = latestCase;
  const caseDbId = (c as any)?.dbId || c.id;

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [caseEvents, setCaseEvents] = useState<CaseEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [liveStatus, setLiveStatus] = useState<CaseStatus | null>(null);
  const [offers, setOffers] = useState<any[]>([]);

  // Fetch persistent case events on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchEvents() {
      try {
        setEventsLoading(true);
        const events = await api.cases.getCaseEvents(caseDbId);
        if (!cancelled && Array.isArray(events)) {
          setCaseEvents(events);
        }
      } catch (err) {
        console.warn('[PatientCase] Failed to fetch case events:', err);
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    }
    fetchEvents();
    return () => { cancelled = true; };
  }, [caseDbId]);

  useEffect(() => {
    if (caseDbId) {
      api.loanOffers.getOffersByCaseId(caseDbId)
        .then(res => setOffers(res || []))
        .catch(err => console.error(err));
    }
  }, [caseDbId]);

  const handleSelectOffer = async (offerId: string) => {
    try {
      await api.loanOffers.updateDecision(offerId, { status: 'Selected by Patient', caseId: caseDbId });
      setToast({ message: 'Offer selected successfully! Awaiting final lender review.', type: 'success' });
      refreshCases();
      const newOffers = await api.loanOffers.getOffersByCaseId(caseDbId);
      setOffers(newOffers || []);
    } catch (e) {
      setToast({ message: 'Failed to select offer.', type: 'error' });
    }
  };

  // SSE real-time updates
  const handleSSEEvent = useCallback((event: CaseEvent) => {
    // Add new event to the top of the timeline
    setCaseEvents((prev) => [event, ...prev.filter((e) => e.id !== event.id)]);

    // Update live status if present
    if (event.newStatus) {
      setLiveStatus(event.newStatus as CaseStatus);
      // Refresh case data from API to get full updated state
      refreshCases();
    }

    // Show toast notification
    const toastType = event.eventType === 'CASE_APPROVED' ? 'success'
      : event.eventType === 'CASE_REJECTED' ? 'error'
      : 'info';
    setToast({ message: event.message, type: toastType });
    setTimeout(() => setToast(null), 6000);
  }, [refreshCases]);

  const { connected } = useCaseSSE({
    caseId: caseDbId,
    onEvent: handleSSEEvent,
    enabled: true,
  });

  // Use live status if available, otherwise use case status from API
  const displayStatus = liveStatus || c.status;

  const handleDownloadPdf = async () => {
    if (!c?.id) return;
    try {
      setDownloadingPdf(true);
      await api.reports.downloadPdf(c.id);
      setToast({ message: 'Financing dossier PDF downloaded successfully', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.message || 'Failed to download PDF dossier', type: 'error' });
    } finally {
      setDownloadingPdf(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  // Merge or fallback to c.activities / initial submission event if caseEvents is empty
  const displayEvents: CaseEvent[] = useMemo(() => {
    if (caseEvents.length > 0) return caseEvents;

    // If case has activities from AppContext / mockCases
    if (c.activities && c.activities.length > 0) {
      return c.activities.map((act: any) => {
        let eventType = 'CASE_STATUS_CHANGE';
        if (act.type === 'SUBMISSION') eventType = 'CASE_SUBMITTED';
        else if (act.type === 'STATUS_CHANGE') {
          if (act.title?.toLowerCase().includes('approved') || act.decision === 'Approved') eventType = 'CASE_APPROVED';
          else if (act.title?.toLowerCase().includes('rejected') || act.decision === 'Rejected') eventType = 'CASE_REJECTED';
          else if (act.title?.toLowerCase().includes('needs review') || act.decision === 'Needs Review') eventType = 'CASE_NEEDS_VERIFICATION';
          else eventType = 'CASE_UNDER_REVIEW';
        } else if (act.type === 'NOTE') {
          eventType = 'CASE_NOTE_ADDED';
        }

        return {
          id: act.id,
          caseId: c.id,
          eventType,
          message: act.description || act.title || 'Case activity updated.',
          createdAt: act.timestamp || c.createdAt,
        };
      });
    }

    // Default: every loan case has at least a creation / submission event
    if (c.createdAt) {
      const initialType = c.status === 'Approved' ? 'CASE_APPROVED'
        : c.status === 'Needs Review' ? 'CASE_NEEDS_VERIFICATION'
        : c.status === 'Rejected' ? 'CASE_REJECTED'
        : 'CASE_SUBMITTED';

      const initialMessage = c.status === 'Approved'
        ? 'Your financing case has been approved and verified by partner underwriting.'
        : c.status === 'Needs Review'
        ? 'Your financing case is undergoing review and verification by partner underwriting.'
        : c.status === 'Rejected'
        ? 'Your financing case review has been completed.'
        : 'Your financing case was submitted successfully and is currently under review.';

      return [
        {
          id: `initial-${c.id}`,
          caseId: c.id,
          eventType: initialType,
          newStatus: c.status,
          message: initialMessage,
          createdAt: c.createdAt,
        },
      ];
    }

    return [];
  }, [caseEvents, c]);

  /** Icon + color for event type */
  const getEventStyle = (eventType: string) => {
    switch (eventType) {
      case 'CASE_APPROVED':
        return { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' };
      case 'CASE_REJECTED':
        return { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-500' };
      case 'CASE_NEEDS_VERIFICATION':
        return { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' };
      case 'CASE_SUBMITTED':
        return { icon: FileText, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200', dot: 'bg-sky-500' };
      case 'CASE_UNDER_REVIEW':
        return { icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', dot: 'bg-indigo-500' };
      case 'CASE_NOTE_ADDED':
        return { icon: MessageSquare, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', dot: 'bg-teal-500' };
      default:
        return { icon: Activity, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-400' };
    }
  };

  /** Human-readable event title */
  const getEventTitle = (eventType: string) => {
    switch (eventType) {
      case 'CASE_APPROVED': return 'Case Approved';
      case 'CASE_REJECTED': return 'Case Rejected';
      case 'CASE_NEEDS_VERIFICATION': return 'Additional Verification Required';
      case 'CASE_SUBMITTED': return 'Case Submitted';
      case 'CASE_UNDER_REVIEW': return 'Case Under Review';
      case 'CASE_NOTE_ADDED': return 'Underwriter Note Added';
      default: return 'Status Update';
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/patient/history')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Treatment History
        </button>
      </div>

      {/* Header Bar */}
      <div className="card p-6 sm:p-7 border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {c.id}
            </span>
            <StatusBadge status={displayStatus} />
            {c.brokerStage && (
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                {c.brokerStage}
              </span>
            )}
            {/* SSE connection indicator */}
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                connected
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                  : 'bg-slate-50 text-slate-400 border border-slate-200/60'
              }`}
              title={connected ? 'Live updates active' : 'Connecting...'}
            >
              {connected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
              {connected ? 'Live' : ''}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">
            Financing Case Dossier
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Created on {formatDate(c.createdAt)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:self-center">
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="btn-primary text-xs py-2.5 px-4 flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            title="Download official PDF case dossier"
          >
            {downloadingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{downloadingPdf ? 'Exporting PDF...' : 'Download Dossier (PDF)'}</span>
          </button>

          <div className="p-2.5 bg-teal-50/80 rounded-xl border border-teal-200/60 text-xs text-teal-900 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span className="hidden sm:inline">Shared with Partner Lending Desks</span>
            <span className="sm:hidden">Shared with Lenders</span>
          </div>
        </div>
      </div>

      {/* Structured Sections */}
      <div className="space-y-6">
        {/* Case Activity / Notification Timeline */}
        <div className="card p-6 border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-teal-600" />
              Case Activity
            </h2>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {displayEvents.length} event{displayEvents.length !== 1 ? 's' : ''}
            </span>
          </div>

          {eventsLoading ? (
            <div className="flex items-center gap-2 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
              <span className="text-xs text-slate-400">Loading activity...</span>
            </div>
          ) : displayEvents.length === 0 ? (
            <div className="py-6 text-center">
              <Clock className="w-6 h-6 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No case activity recorded yet.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline connector line */}
              <div className="absolute left-[11px] top-3 bottom-3 w-px bg-slate-200/80" />

              <div className="space-y-0">
                {displayEvents.map((event, idx) => {
                  const style = getEventStyle(event.eventType);
                  const EventIcon = style.icon;
                  const isLatest = idx === 0;

                  return (
                    <div
                      key={event.id}
                      className={`relative pl-9 py-3 transition-all ${
                        isLatest ? 'animate-fade-in' : ''
                      }`}
                    >
                      {/* Timeline dot */}
                      <div
                        className={`absolute left-0 top-4 w-[23px] h-[23px] rounded-full flex items-center justify-center z-10 ${
                          isLatest ? style.bg + ' ring-2 ring-white shadow-sm' : 'bg-white border-2 border-slate-200'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${isLatest ? style.dot : 'bg-slate-300'}`} />
                      </div>

                      {/* Event content */}
                      <div className={`rounded-xl p-3 ${isLatest ? style.bg + '/60 border ' + style.border + '/60' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <EventIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isLatest ? style.color : 'text-slate-400'}`} />
                            <span className={`text-xs font-bold ${isLatest ? 'text-slate-900' : 'text-slate-600'}`}>
                              {getEventTitle(event.eventType)}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap flex-shrink-0">
                            {formatDateTime(event.createdAt)}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 leading-relaxed ${isLatest ? 'text-slate-700' : 'text-slate-500'}`}>
                          {event.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Available Financing Offers */}
        {offers.length > 0 && (
          <div className="card p-6 border-slate-200/80 space-y-4 shadow-xs border-teal-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                Financing Offers
              </h2>
              <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                {offers.length} Offers Available
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {offers.map(offer => (
                <div key={offer.id} className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col justify-between shadow-2xs hover:border-teal-300 transition-colors">
                  <div className="mb-4">
                    <p className="text-sm font-bold text-slate-900 mb-1">{offer.company_name}</p>
                    <p className="text-xs text-slate-500 mb-0.5">Interest Rate: <span className="font-bold text-slate-700">{offer.interest_rate}%</span></p>
                    <p className="text-xs text-slate-500">Offered Amount: <span className="font-bold text-slate-700 tabular-nums">{formatINR(offer.offered_amount)}</span></p>
                    <span className={`inline-block mt-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${
                      offer.status === 'Selected by Patient' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      offer.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      offer.status === 'Declined' || offer.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      'bg-sky-50 text-sky-700 border-sky-200'
                    }`}>
                      {offer.status}
                    </span>
                  </div>
                  {(offer.status === 'Pending Patient Selection' || offer.status === 'Sent' || offer.status === 'Pending Review') && (
                    <button
                      onClick={() => handleSelectOffer(offer.id)}
                      className="btn-primary text-xs py-2 w-full bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer"
                    >
                      Select this Offer
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patient Summary */}
        <div className="card p-6 border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600" />
              Patient Profile & Intake Context
            </h2>
            <span className="text-xs text-slate-400">Verified Identity</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium block mb-0.5">Full Name</span>
              <p className="font-bold text-slate-900 text-sm">{c.patient.name}</p>
            </div>
            {c.patient.age && (
              <div>
                <span className="text-slate-400 font-medium block mb-0.5">Age</span>
                <p className="font-bold text-slate-900 text-sm">{c.patient.age} yrs</p>
              </div>
            )}
            {c.patient.gender && (
              <div>
                <span className="text-slate-400 font-medium block mb-0.5">Gender</span>
                <p className="font-bold text-slate-900 text-sm">{c.patient.gender}</p>
              </div>
            )}
            {c.patient.budget && (
              <div>
                <span className="text-slate-400 font-medium block mb-0.5">Stated Budget Target</span>
                <p className="font-bold text-teal-800 text-sm tabular-nums">{formatINR(c.patient.budget)}</p>
              </div>
            )}
          </div>

          {c.patient.comorbidities && c.patient.comorbidities.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium block mb-1">Declared Health Conditions</span>
              <div className="flex flex-wrap gap-1.5">
                {c.patient.comorbidities.map((co: string) => (
                  <span key={co} className="px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-800 rounded-md border border-amber-200/60">
                    {co}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clinical Mapping */}
        <div className="card p-6 border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              Clinical Classification & Target Procedure
            </h2>
            <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
              ICD-10: {c.clinicalMapping.icdCode}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-xs text-slate-400 font-medium block mb-1">Original Patient Inquiry</span>
              <p className="text-sm font-semibold text-slate-800 italic bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                "{c.clinicalMapping.originalQuery}"
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-1">
              <div>
                <span className="text-xs text-slate-400 font-medium block mb-0.5">Clinical Category</span>
                <p className="text-sm font-bold text-teal-800">{c.clinicalMapping.clinicalCategory}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block mb-0.5">Target Procedure</span>
                <p className="text-sm font-bold text-slate-900">{c.clinicalMapping.targetProcedure}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Facility */}
        <div className="card p-6 border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              Selected Healthcare Facility
            </h2>
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              <Shield className="w-3 h-3 text-emerald-600" />
              {c.hospital.accreditation}
            </span>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-navy-900 text-teal-400 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 mt-0.5">{c.hospital.city}</p>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="flex items-center gap-0.5 font-semibold text-slate-700">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {c.hospital.rating} / 5.0 Rating
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wider">
            Itemized Financing Schedule
          </h2>
          <CostBreakdownTable
            components={c.costBreakdown.components}
            totalMin={c.costBreakdown.totalMin}
            totalMax={c.costBreakdown.totalMax}
            budget={c.patient.budget}
          />
        </div>

        {/* Underwriting Notes if present */}
        {c.reviewNote && (
          <div className="card p-5 bg-amber-50/80 border-amber-200/80 space-y-1">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
              Underwriting Review Note
            </span>
            <p className="text-xs text-amber-900 leading-relaxed">{c.reviewNote}</p>
          </div>
        )}

        {c.rejectionReason && (
          <div className="card p-5 bg-rose-50/80 border-rose-200/80 space-y-1">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
              Underwriting Rejection Notice
            </span>
            <p className="text-xs text-rose-900 leading-relaxed">{c.rejectionReason}</p>
          </div>
        )}
      </div>

      <Disclaimer />
    </div>
  );
}
