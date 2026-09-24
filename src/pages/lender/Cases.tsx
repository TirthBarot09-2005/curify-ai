import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatusBadge, EmptyState } from '../../components/shared';
import { formatINR, formatDate, formatConfidence } from '../../utils';
import { FileStack, ArrowRight, Search, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

export default function LenderCases() {
  const navigate = useNavigate();
  const { cases } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    let list = [...cases];

    if (statusFilter === 'active') {
      list = list.filter((c) => ['Company Underwriting', 'Awaiting Patient Selection', 'Intake'].includes(c.brokerStage as string) || c.status === 'Pending Review');
    } else if (statusFilter === 'needs-review') {
      list = list.filter((c) => c.status === 'Needs Review');
    } else if (statusFilter === 'disbursed') {
      list = list.filter((c) => c.brokerStage === 'Disbursed' || c.status === 'Approved');
    } else if (statusFilter === 'rejected') {
      list = list.filter((c) => c.brokerStage === 'Rejected' || c.status === 'Rejected');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.id?.toLowerCase().includes(q) ||
          c.patient?.name?.toLowerCase().includes(q) ||
          c.hospital?.name?.toLowerCase().includes(q) ||
          c.clinicalMapping?.targetProcedure?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [cases, statusFilter, searchQuery]);

  const handleFilterTab = (tab: string) => {
    if (tab === 'all') {
      searchParams.delete('status');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ status: tab });
    }
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
            Broker Marketplace
          </span>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Active Case Register
          </h1>
        </div>

        <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-3 py-1.5 rounded-md self-start sm:self-center">
          {filtered.length} of {cases.length} Total Cases
        </span>
      </div>

      {/* Toolbar: Segmented Controls & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status segmented control */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg overflow-x-auto border border-stone-200">
          {[
            { id: 'all', label: 'All Files' },
            { id: 'active', label: 'Active Market' },
            { id: 'needs-review', label: 'Needs Review' },
            { id: 'disbursed', label: 'Disbursed' },
            { id: 'rejected', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleFilterTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, ID, hospital..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs text-stone-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-600"
          />
        </div>
      </div>

      {/* High Density Cases Table */}
      {filtered.length > 0 ? (
        <>
          <div className="hidden lg:block bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/80 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Case ID</th>
                  <th className="px-5 py-3">Applicant</th>
                  <th className="px-5 py-3">Clinical Procedure</th>
                  <th className="px-5 py-3 text-right">Tariff Estimate</th>
                  <th className="px-5 py-3">Broker Stage</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-stone-800">{c.id}</td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-stone-900">{c.patient.name}</p>
                      <p className="text-[11px] text-stone-400">{c.patient.age ? `${c.patient.age}y` : ''} {c.patient.gender || ''}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-stone-800">{c.clinicalMapping.targetProcedure}</p>
                      <span className="text-[10px] text-stone-400">{c.hospital.name}</span>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-stone-900 tabular-nums">
                      {c.disbursedAmount ? formatINR(c.disbursedAmount) : `${formatINR(c.costBreakdown.totalMin)} – ${formatINR(c.costBreakdown.totalMax)}`}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {c.brokerStage || 'Intake'}
                      </span>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => navigate(`/lender/cases/${c.id}`)}
                        className="py-1.5 px-3 rounded-lg bg-[#1C1917] hover:bg-[#292524] text-white text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition-all"
                      >
                        Manage
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/lender/cases/${c.id}`)}
                className="bg-white rounded-xl border border-stone-200 p-4 cursor-pointer space-y-2 hover:border-stone-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">{c.id}</span>
                  <StatusBadge status={c.status} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">{c.clinicalMapping.targetProcedure}</h3>
                  <p className="text-xs text-stone-500">{c.patient.name} · {c.hospital.name}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                  <span className="font-bold text-stone-900 tabular-nums">
                    {formatINR(c.costBreakdown.totalMin)} – {formatINR(c.costBreakdown.totalMax)}
                  </span>
                  <span className="text-emerald-700 font-semibold">{formatConfidence(c.confidence.overall)} Confidence</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={FileStack}
          title="No cases match your filter criteria"
          description="Try changing the status tab or clearing search keywords to view other medical loan files."
          actionLabel="Show All Cases"
          onAction={() => handleFilterTab('all')}
        />
      )}
    </div>
  );
}
