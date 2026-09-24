import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, EmptyState, Disclaimer, Toast } from '../../components/shared';
import { formatINR, formatDate, formatConfidence } from '../../utils';
import { api } from '../../lib/api';
import { Clock, Search, Building2, ArrowRight, FileText, Activity, Download, Loader2 } from 'lucide-react';

export default function PatientHistory() {
  const navigate = useNavigate();
  const { cases } = useApp();
  const { user } = useAuth();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleDownloadPdf = async (e: React.MouseEvent, caseId: string) => {
    e.stopPropagation();
    try {
      setDownloadingId(caseId);
      await api.reports.downloadPdf(caseId);
      setToast({ message: 'Dossier PDF downloaded successfully', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.message || 'Failed to download dossier PDF', type: 'error' });
    } finally {
      setDownloadingId(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const patientCases = cases.filter((c) => {
    if (!user || user.role !== 'patient') return false;
    return (c as any).patientId === user.id;
  });

  if (patientCases.length === 0) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
        <div className="pb-4 border-b border-slate-200">
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">Treatment Plans & Case History</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Review past clinical inquiries, benchmark estimates, and active loan cases.</p>
        </div>

        <EmptyState
          icon={Clock}
          title="No previous treatment cases recorded"
          description="Once you explore care options and finalize a treatment plan, your structured financing case will be tracked here."
          actionLabel="Explore Healthcare Options"
          onAction={() => navigate('/patient/intake')}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">
            Treatment Plans & Case History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review your finalized treatment packages and financing review statuses.
          </p>
        </div>

        <button
          onClick={() => navigate('/patient/intake')}
          className="btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5 self-start sm:self-center shadow-xs"
        >
          <Search className="w-3.5 h-3.5" />
          New Healthcare Inquiry
        </button>
      </div>

      <div className="space-y-4">
        {patientCases.map((c) => (
          <div
            key={c.id}
            onClick={() => navigate('/patient/case')}
            className="card-hover p-6 cursor-pointer border-slate-200/80 hover:shadow-md transition-all group"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0 text-teal-700">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {c.id}
                    </span>
                    <StatusBadge status={c.status} />
                    {(c as any).brokerStage && (
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        {(c as any).brokerStage}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-navy-900 group-hover:text-teal-700 transition-colors">
                    {c.clinicalMapping.targetProcedure}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {c.hospital.name} ({c.hospital.city}) · {c.clinicalMapping.clinicalCategory}
                  </p>
                </div>
              </div>

              <div className="sm:text-right flex sm:flex-col justify-between items-center sm:items-end gap-1 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Indicative Tariff</span>
                <span className="text-base font-bold text-navy-900 tabular-nums">
                  {formatINR(c.costBreakdown.totalMin)} – {formatINR(c.costBreakdown.totalMax)}
                </span>
                <span className="text-xs text-slate-400 mt-0.5">Submitted {formatDate(c.createdAt)}</span>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={(e) => handleDownloadPdf(e, c.id)}
                    disabled={downloadingId === c.id}
                    className="text-xs font-semibold text-slate-750 hover:text-teal-700 bg-slate-100 hover:bg-teal-50 px-2.5 py-1 rounded-md border border-slate-200 hover:border-teal-200 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Download Dossier PDF"
                  >
                    {downloadingId === c.id ? (
                      <Loader2 className="w-3 h-3 animate-spin text-teal-600" />
                    ) : (
                      <Download className="w-3 h-3 text-teal-600" />
                    )}
                    <span>PDF</span>
                  </button>
                  <span className="text-xs font-semibold text-teal-700 flex items-center gap-1">
                    Inspect Dossier <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Disclaimer compact />
    </div>
  );
}
