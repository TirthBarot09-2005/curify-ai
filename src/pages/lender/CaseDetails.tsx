import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatusBadge, Modal, ConfidenceIndicator, Toast, CostBreakdownTable, Disclaimer } from '../../components/shared';
import { formatINR, formatDate, formatDateTime, formatConfidence } from '../../utils';
import { api } from '../../lib/api';
import {
  ArrowLeft,
  Shield,
  Star,
  Building2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  User,
  Activity,
  Lock,
  MessageSquare,
  Search,
  Eye,
  FileText,
  RefreshCw,
  Clock,
  Plus,
  Filter,
  DollarSign,
  Check,
  ChevronDown,
  Quote,
  Download,
  ArrowRight,
} from 'lucide-react';
import type { CaseStatus, CaseActivityItem, ActivityType } from '../../types';

const UNDERWRITER_NAME = 'Neha Kapoor';
const UNDERWRITER_ROLE = 'Senior Underwriter';

const reviewReasonOptions = [
  'Cost estimate verification',
  'Patient information incomplete',
  'Hospital information verification',
  'Other',
];

const rejectionReasonOptions = [
  'Cost exceeds policy',
  'Insufficient information',
  'Requires verification',
  'Hospital provider not eligible under loan terms',
  'Other',
];

export default function LenderCaseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCaseById, updateCaseStatus, addCaseNote, fetchEligibleCompanies, sendOffers, refreshCases } = useApp();

  const [eligibleCompanies, setEligibleCompanies] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [sendingOffers, setSendingOffers] = useState(false);

  const [modal, setModal] = useState<'approve' | 'review' | 'reject' | 'note' | null>(null);
  const [reviewReason, setReviewReason] = useState(reviewReasonOptions[0]);
  const [reviewNote, setReviewNote] = useState('');
  const [rejectReason, setRejectReason] = useState(rejectionReasonOptions[0]);
  const [rejectNote, setRejectNote] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | 'status' | 'notes' | 'reviews' | 'decisions'>('all');
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleDownloadPdf = async () => {
    const targetId = caseData?.id || id;
    if (!targetId) return;
    try {
      setDownloadingPdf(true);
      await api.reports.downloadPdf(targetId);
      setToast({ message: 'Dossier PDF downloaded successfully', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.message || 'Failed to download dossier PDF', type: 'error' });
    } finally {
      setDownloadingPdf(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const caseData = getCaseById(id || '');
  useEffect(() => {
    async function loadOffers() {
      if (!caseData?.dbId) return;
      try {
        const [compRes, offRes] = await Promise.all([
          fetchEligibleCompanies(caseData.dbId),
          api.loanOffers.getOffersByCaseId(caseData.dbId)
        ]);
        const compList = Array.isArray(compRes) ? compRes : (compRes as any)?.companies || (compRes as any)?.data || [];
        const offList = Array.isArray(offRes) ? offRes : (offRes as any)?.offers || (offRes as any)?.data || [];
        setEligibleCompanies(compList);
        setOffers(offList);
      } catch (e) {
        console.error('Failed to load offers', e);
        setEligibleCompanies([]);
        setOffers([]);
      }
    }
    if (caseData) {
      loadOffers();
    }
  }, [caseData?.dbId, fetchEligibleCompanies]);

  const handleSendOffers = async () => {
    if (selectedCompanyIds.length === 0 || !caseData?.dbId) return;
    setSendingOffers(true);
    try {
      await sendOffers(caseData.dbId, selectedCompanyIds);
      const offRes = await api.loanOffers.getOffersByCaseId(caseData.dbId);
      const offList = Array.isArray(offRes) ? offRes : (offRes as any)?.offers || (offRes as any)?.data || [];
      setOffers(offList);
      setToast({ message: 'Offers sent successfully', type: 'success' });
      await refreshCases();
    } catch (e) {
      setToast({ message: 'Failed to send offers', type: 'error' });
    } finally {
      setSendingOffers(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const toggleCompany = (companyId: string) => {
    setSelectedCompanyIds(prev => prev.includes(companyId) ? prev.filter(i => i !== companyId) : [...prev, companyId]);
  };

  if (!caseData) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Case file not found</h2>
        <p className="text-xs text-slate-500 mt-1">Please return to the loan cases queue.</p>
        <button onClick={() => navigate('/lender/cases')} className="btn-primary mt-4 text-xs cursor-pointer">
          Back to Loan Cases
        </button>
      </div>
    );
  }

  const c = caseData;

  const filteredActivities = useMemo(() => {
    const list = c.activities || [];
    if (activityFilter === 'all') return list;
    if (activityFilter === 'status') return list.filter((a) => a.type === 'STATUS_CHANGE');
    if (activityFilter === 'notes') return list.filter((a) => a.type === 'NOTE');
    if (activityFilter === 'reviews') return list.filter((a) => a.type === 'REVIEW' || a.type === 'QUEUE');
    if (activityFilter === 'decisions') return list.filter((a) => a.type === 'DECISION');
    return list;
  }, [c.activities, activityFilter]);

  const handleAction = async (status: CaseStatus) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));

    if (c.selectedOfferId && (status === 'Approved' || status === 'Rejected')) {
      try {
        await api.loanOffers.updateDecision(c.selectedOfferId, { status, caseId: c.dbId! });
        setToast({ message: `Offer ${status} successfully.`, type: 'success' });
        await refreshCases();
      } catch (err) {
        setToast({ message: 'Failed to update offer decision', type: 'error' });
      }
    } else {
      if (status === 'Approved') {
        await updateCaseStatus(c.id, 'Approved');
        setToast({ message: `Case ${c.id} approved for financing`, type: 'success' });
      } else if (status === 'Needs Review') {
        await updateCaseStatus(c.id, 'Needs Review', reviewNote.trim() || undefined, reviewReason);
        setToast({ message: `Case ${c.id} marked for additional review`, type: 'info' });
        setReviewNote('');
      } else if (status === 'Rejected') {
        await updateCaseStatus(c.id, 'Rejected', rejectNote.trim() || undefined, rejectReason);
        setToast({ message: `Case ${c.id} rejected`, type: 'error' });
        setRejectNote('');
      }
    }

    setModal(null);
    setLoading(false);
    setTimeout(() => setToast(null), 4000);
  };

  // Handle Adding Review Note
  const handleSaveNote = async () => {
    if (!newNoteText.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    await addCaseNote(c.id, newNoteText.trim());
    setNewNoteText('');
    setModal(null);
    setLoading(false);
    setToast({ message: `Review note added to Case ${c.id}`, type: 'success' });
    setTimeout(() => setToast(null), 4000);
  };

  // Activity Icon Helper
  const renderActivityIcon = (item: CaseActivityItem) => {
    const isApproval = item.type === 'DECISION' && (item.decision === 'Approved' || item.title.includes('approved'));
    const isRejection = item.type === 'DECISION' && item.title.includes('rejected');
    const isNeedsReview = item.type === 'DECISION' && item.title.includes('Needs Review');

    if (isApproval) {
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
          <Check className="w-4 h-4" />
        </div>
      );
    }
    if (isRejection) {
      return (
        <div className="w-8 h-8 rounded-full bg-rose-50 border-2 border-rose-500 text-rose-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
          <XCircle className="w-4 h-4" />
        </div>
      );
    }
    if (isNeedsReview) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-50 border-2 border-amber-500 text-amber-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
          <AlertCircle className="w-4 h-4" />
        </div>
      );
    }
    if (item.type === 'NOTE') {
      return (
        <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-400 text-slate-700 flex items-center justify-center flex-shrink-0 shadow-2xs">
          <MessageSquare className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (item.type === 'REVIEW' || item.type === 'QUEUE') {
      return (
        <div className="w-8 h-8 rounded-full bg-sky-50 border-2 border-sky-500 text-sky-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
          <Eye className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (item.type === 'STATUS_CHANGE') {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-50 border-2 border-amber-500 text-amber-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
          <RefreshCw className="w-3.5 h-3.5" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-teal-50 border-2 border-teal-600 text-teal-700 flex items-center justify-center flex-shrink-0 shadow-2xs">
        <FileText className="w-3.5 h-3.5" />
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-7xl mx-auto">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/lender/cases')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Loan Case Register
        </button>
      </div>

      {/* Case Header Card */}
      <div className="card p-6 sm:p-7 border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {c.id}
            </span>
            <StatusBadge status={c.status} />
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {formatConfidence(c.confidence.overall)} Confidence Reliability
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">
            {c.clinicalMapping.targetProcedure}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Submitted by <strong className="text-slate-700">{c.patient.name}</strong> on {formatDate(c.createdAt)} · Selected Provider: <strong className="text-slate-700">{c.hospital.name}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50"
            title="Download Clinical Decision & Financing PDF Report"
          >
            {downloadingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
            ) : (
              <Download className="w-4 h-4 text-teal-600" />
            )}
            <span>{downloadingPdf ? 'Exporting PDF...' : 'Download Dossier (PDF)'}</span>
          </button>

          {/* Read-Only Verified Tariff Tag */}
          <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div>
              <span className="font-semibold text-slate-800 block">Read-Only Benchmark File</span>
              <span className="text-[10px] text-slate-400">Pricing and clinical mapping locked</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* LEFT 2-COLS: Read-only Clinical, Patient, Financial breakdown + Case Activity & Review History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Profile */}
          <div className="card p-6 border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" />
                Applicant Identity & Clinical Context
              </h2>
              <span className="text-[11px] font-semibold text-slate-500">Verified KYC Profile</span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Applicant Name</span>
                <p className="font-bold text-slate-900 text-sm">{c.patient.name}</p>
              </div>
              {c.patient.age && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Age</span>
                  <p className="font-bold text-slate-900 text-sm">{c.patient.age} yrs</p>
                </div>
              )}
              {c.patient.gender && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Gender</span>
                  <p className="font-bold text-slate-900 text-sm">{c.patient.gender}</p>
                </div>
              )}
              {c.patient.budget && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Patient Stated Budget</span>
                  <p className="font-bold text-teal-800 text-sm tabular-nums">{formatINR(c.patient.budget)}</p>
                </div>
              )}
            </div>

            {c.patient.comorbidities && c.patient.comorbidities.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium block mb-1">Declared Risk Factors / Comorbidities</span>
                <div className="flex flex-wrap gap-1.5">
                  {c.patient.comorbidities.map((co) => (
                    <span key={co} className="px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-800 rounded-md border border-amber-200">
                      {co}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clinical Classification */}
          <div className="card p-6 border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                Clinical Mapping & Taxonomy
              </h2>
              <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                ICD-10: {c.clinicalMapping.icdCode}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Original Patient Inquiry</span>
                <p className="text-xs sm:text-sm font-semibold text-slate-800 italic bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  "{c.clinicalMapping.originalQuery}"
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Clinical Category</span>
                  <p className="text-sm font-bold text-teal-800">{c.clinicalMapping.clinicalCategory}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Target Procedure</span>
                  <p className="text-sm font-bold text-slate-900">{c.clinicalMapping.targetProcedure}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Facility Details */}
          <div className="card p-6 border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                Healthcare Facility
              </h2>
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <Shield className="w-3 h-3 text-emerald-600" />
                {c.hospital.accreditation}
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-navy-900 text-teal-400 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-900">{c.hospital.name}</h3>
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

          {/* Itemized Cost Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-teal-600" />
                Itemized Cost Schedule (Read-Only)
              </h2>
              <span className="text-[11px] text-slate-400 font-semibold">Indicative Tariff</span>
            </div>
            <CostBreakdownTable
              components={c.costBreakdown.components}
              totalMin={c.costBreakdown.totalMin}
              totalMax={c.costBreakdown.totalMax}
              budget={c.patient.budget}
            />
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* LOAN COMPANY MATCHING SECTION */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div className="card p-6 sm:p-7 border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-navy-900 tracking-tight flex items-center gap-2">
                  <Building2 className="w-4.5 h-4.5 text-teal-600" />
                  Loan Company Matching
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Match patient with eligible NBFCs and Banks
                </p>
              </div>
            </div>

            {offers.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Sent Offers</h3>
                <div className="grid gap-3">
                  {offers.map(offer => (
                    <div key={offer.id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{offer.company_name}</p>
                        <p className="text-xs text-slate-500">Rate: {offer.interest_rate}% · Amount: {formatINR(offer.offered_amount)}</p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                        offer.status === 'Selected by Patient' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        offer.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        offer.status === 'Declined' || offer.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-sky-50 text-sky-700 border-sky-200'
                      }`}>
                        {offer.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Eligible Lenders</h3>
                {eligibleCompanies.length === 0 ? (
                  <p className="text-xs text-slate-500">No eligible lenders found for this amount.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {eligibleCompanies.map(company => (
                      <label key={company.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-600"
                          checked={selectedCompanyIds.includes(company.id)}
                          onChange={() => toggleCompany(company.id)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900">{company.name}</p>
                          <p className="text-xs text-slate-500">Type: {company.company_type} · Est. Rate: {company.min_interest_rate}% - {company.max_interest_rate}%</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded-md border border-teal-200">
                            {company.avg_processing_days} days avg
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSendOffers}
                    disabled={selectedCompanyIds.length === 0 || sendingOffers}
                    className="btn-primary text-xs py-2 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    {sendingOffers ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Send Offers ({selectedCompanyIds.length})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* CASE ACTIVITY & REVIEW HISTORY SECTION */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div className="card p-6 sm:p-7 border-slate-200/80 shadow-xs space-y-6">
            {/* Header with Title, Subtitle, Filter and + Add Note Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-navy-900 tracking-tight flex items-center gap-2">
                  <Clock className="w-4.5 h-4.5 text-teal-600" />
                  Case Activity
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review history and case status changes
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                {/* Small Filter */}
                <div className="relative">
                  <select
                    value={activityFilter}
                    onChange={(e) => setActivityFilter(e.target.value as any)}
                    className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-teal-600 cursor-pointer"
                  >
                    <option value="all">All activity</option>
                    <option value="status">Status changes</option>
                    <option value="notes">Notes</option>
                    <option value="reviews">Reviews</option>
                    <option value="decisions">Decisions</option>
                  </select>
                </div>

                {/* + Add Review Note Button */}
                <button
                  onClick={() => setModal('note')}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Review Note
                </button>
              </div>
            </div>

            {/* Status History Progression Bar */}
            <div className="bg-slate-50/90 rounded-xl p-4 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                Status History Flow
              </span>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-semibold text-slate-700">
                  Submitted
                </span>
                <span className="text-slate-300 font-bold">→</span>
                <span className="px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200 font-semibold text-sky-800">
                  Pending Review
                </span>
                {c.status !== 'Pending Review' && (
                  <>
                    <span className="text-slate-300 font-bold">→</span>
                    <span
                      className={`px-2.5 py-1 rounded-md font-semibold border ${
                        c.status === 'Approved'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : c.status === 'Needs Review'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      {c.status}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Vertical Activity Timeline */}
            <div className="pt-2">
              {filteredActivities.length === 0 ? (
                <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-slate-200/60">
                  <Clock className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-xs font-bold text-slate-700">No review activity yet</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Activity will appear here as this case moves through underwriting.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {filteredActivities.map((item, idx) => (
                    <div key={item.id || idx} className="relative flex items-start gap-4 group">
                      {/* Timeline Node Icon */}
                      <div className="absolute -left-6 top-0 z-10">
                        {renderActivityIcon(item)}
                      </div>

                      {/* Timeline Content Body */}
                      <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs group-hover:border-slate-300 transition-colors space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h4 className="text-xs sm:text-sm font-bold text-navy-900">
                            {item.title}
                          </h4>
                          <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                            {formatDateTime(item.timestamp)}
                          </span>
                        </div>

                        {item.description && (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        {item.reason && (
                          <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                            <span className="font-semibold text-slate-700 block mb-0.5">Reason:</span>
                            <span className="text-slate-800">{item.reason}</span>
                          </div>
                        )}

                        {item.note && (
                          <div className="text-xs bg-amber-50/60 p-3 rounded-lg border border-amber-200/60 text-amber-950 flex items-start gap-2">
                            <Quote className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="italic leading-relaxed">"{item.note}"</p>
                          </div>
                        )}

                        {/* Reviewer / Actor attribution */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            {item.actorRole === 'Patient' ? 'Submitted by' : 'Recorded by'}{' '}
                            <strong className="text-slate-700 font-semibold">{item.actor}</strong>
                            {item.actorRole && item.actorRole !== 'System' && (
                              <span className="text-slate-400"> ({item.actorRole})</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Future Pending State Indicator */}
                  {c.status === 'Pending Review' && (
                    <div className="relative flex items-center gap-4 text-slate-400 pt-1">
                      <div className="absolute -left-6 top-1/2 -translate-y-1/2 z-10">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 text-slate-400 flex items-center justify-center">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="pl-3 text-xs italic">
                        ○ Decision pending · Awaiting underwriting action
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Underwriting Action Panel */}
        <div className="lg:sticky lg:top-24 space-y-6">
          {/* Decision Panel */}
          <div className="card p-6 border-slate-200/80 shadow-md space-y-5 bg-white">
            <div className="pb-3 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Underwriting Action
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Current Status:</span>
                <StatusBadge status={c.status} />
              </div>
            </div>

            {/* Reviewer Badge */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">
                Active Reviewer
              </span>
              <p className="font-bold text-slate-800">{UNDERWRITER_NAME}</p>
              <p className="text-[11px] text-slate-500">{UNDERWRITER_ROLE}</p>
            </div>

            {c.selectedOfferId && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs">
                <span className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider block mb-0.5">
                  Patient Selected Offer
                </span>
                <p className="font-bold text-blue-900">
                  {offers.find(o => o.id === c.selectedOfferId)?.company_name || 'Selected Offer Pending'}
                </p>
                <p className="text-[11px] text-blue-700 mt-1">Awaiting Final Underwriting Decision</p>
              </div>
            )}

            <div className="space-y-2.5">
              <button
                onClick={() => setModal('approve')}
                disabled={c.status === 'Approved'}
                className="w-full btn-primary py-3 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve Medical Loan Case
              </button>

              <button
                onClick={() => setModal('review')}
                disabled={c.status === 'Needs Review'}
                className="w-full py-2.5 px-4 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <AlertCircle className="w-4 h-4" />
                Request Additional Review
              </button>

              <button
                onClick={() => setModal('reject')}
                disabled={c.status === 'Rejected'}
                className="w-full py-2.5 px-4 text-xs font-bold rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                Reject Case
              </button>
            </div>
          </div>

          {/* Reliability breakdown */}
          <ConfidenceIndicator
            score={c.confidence.overall}
            size="sm"
            showBreakdown
            breakdown={c.confidence}
          />

          {/* Underwriter notes audit */}
          {c.reviewNote && (
            <div className="card p-5 bg-amber-50/80 border-amber-200/80 space-y-1">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                Verification Reviewer Note
              </span>
              <p className="text-xs text-amber-950 leading-relaxed">{c.reviewNote}</p>
            </div>
          )}

          {c.rejectionReason && (
            <div className="card p-5 bg-rose-50/80 border-rose-200/80 space-y-1">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                Rejection Rationale
              </span>
              <p className="text-xs text-rose-950 leading-relaxed">{c.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

      {/* 1. Add Review Note Modal */}
      <Modal open={modal === 'note'} onClose={() => !loading && setModal(null)}>
        <div className="p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-navy-900 tracking-tight">Add Review Note</h2>
              <p className="text-xs text-slate-500">Case ID: {c.id}</p>
            </div>
          </div>

          <div>
            <label htmlFor="modal-note-text" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Reviewer Observation
            </label>
            <textarea
              id="modal-note-text"
              rows={4}
              maxLength={500}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Add a note about this case..."
              className="w-full text-xs text-slate-800 p-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 resize-none"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
              <span>Audited under {UNDERWRITER_NAME} ({UNDERWRITER_ROLE})</span>
              <span>{newNoteText.length}/500</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSaveNote}
              disabled={loading || !newNoteText.trim()}
              className="btn-primary flex-1 py-3 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Note
            </button>
            <button
              onClick={() => setModal(null)}
              disabled={loading}
              className="btn-secondary flex-1 py-3 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* 2. Approve Modal */}
      <Modal open={modal === 'approve'} onClose={() => !loading && setModal(null)}>
        <div className="p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-navy-900 tracking-tight">Approve Financing File</h2>
              <p className="text-xs text-slate-500">Case ID: {c.id}</p>
            </div>
          </div>

          <div className="card p-4 bg-slate-50/80 border-slate-200/80 text-xs space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Applicant</span>
              <span className="font-bold text-slate-900">{c.patient.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Procedure</span>
              <span className="font-bold text-slate-900">{c.clinicalMapping.targetProcedure}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Tariff Ceiling</span>
              <span className="font-bold text-navy-900 tabular-nums">{formatINR(c.costBreakdown.totalMax)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Approving Underwriter</span>
              <span className="font-bold text-slate-900">{UNDERWRITER_NAME} ({UNDERWRITER_ROLE})</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleAction('Approved')}
              disabled={loading}
              className="btn-primary flex-1 py-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Approval
            </button>
            <button
              onClick={() => setModal(null)}
              disabled={loading}
              className="btn-secondary flex-1 py-3 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* 3. Needs Review Modal */}
      <Modal open={modal === 'review'} onClose={() => !loading && setModal(null)}>
        <div className="p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-navy-900 tracking-tight">Request Additional Review</h2>
              <p className="text-xs text-slate-500">Case ID: {c.id}</p>
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Why does this case need further review?
            </label>
            <div className="space-y-1.5">
              {reviewReasonOptions.map((opt) => (
                <label
                  key={opt}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    reviewReason === opt
                      ? 'bg-amber-50 border-amber-300 text-amber-950 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reviewReason"
                    value={opt}
                    checked={reviewReason === opt}
                    onChange={(e) => setReviewReason(e.target.value)}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Reviewer Note */}
          <div>
            <label htmlFor="review-notes" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Reviewer Note
            </label>
            <textarea
              id="review-notes"
              rows={3}
              maxLength={500}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Add additional context for the review team..."
              className="w-full text-xs text-slate-800 p-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleAction('Needs Review')}
              disabled={loading}
              className="btn-primary flex-1 py-3 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Mark as Needs Review
            </button>
            <button
              onClick={() => setModal(null)}
              disabled={loading}
              className="btn-secondary flex-1 py-3 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* 4. Reject Modal */}
      <Modal open={modal === 'reject'} onClose={() => !loading && setModal(null)}>
        <div className="p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-navy-900 tracking-tight">Reject Financing Case?</h2>
              <p className="text-xs text-slate-500">Case ID: {c.id}</p>
            </div>
          </div>

          <div>
            <label htmlFor="reject-reason" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Required Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <select
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full text-xs text-slate-800 p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 cursor-pointer"
            >
              {rejectionReasonOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="reject-notes" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Optional Reviewer Note
            </label>
            <textarea
              id="reject-notes"
              rows={3}
              maxLength={500}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Add explanation for rejection audit records..."
              className="w-full text-xs text-slate-800 p-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleAction('Rejected')}
              disabled={loading || !rejectReason}
              className="btn-primary flex-1 py-3 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Rejection
            </button>
            <button
              onClick={() => setModal(null)}
              disabled={loading}
              className="btn-secondary flex-1 py-3 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast alert */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
