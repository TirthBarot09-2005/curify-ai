import { useApp } from '../../context/AppContext';
import { formatINR, formatDate } from '../../utils';
import { DollarSign, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LenderDisbursements() {
  const { cases } = useApp();
  const navigate = useNavigate();
  
  const list = Array.isArray(cases) ? cases : [];
  const disbursedCases = list.filter(c => c.brokerStage === 'Disbursed' || c.status === 'Approved');
  const totalDisbursed = disbursedCases.reduce((sum, c) => sum + (c.disbursedAmount || c.costBreakdown?.totalMin || 0), 0);

  return (
    <div className="animate-fade-in space-y-6 max-w-7xl mx-auto">
      <div className="pb-4 border-b border-stone-200">
        <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">Broker Marketplace Console</span>
        <h1 className="text-2xl font-bold text-stone-900">Disbursements Ledger</h1>
      </div>
      
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-stone-100">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-1">Total Disbursed Funds</p>
            <p className="text-3xl font-bold text-stone-900 tracking-tight">{formatINR(totalDisbursed)}</p>
          </div>
        </div>

        {disbursedCases.length === 0 ? (
          <div className="text-center py-12 text-stone-500 text-sm">No disbursed cases found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-stone-50/80 text-[11px] text-stone-500 uppercase tracking-wider">
                  <th className="py-3 px-4 rounded-l-lg">Case ID</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Procedure</th>
                  <th className="py-3 px-4">Disbursal Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right rounded-r-lg">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {disbursedCases.map(c => (
                  <tr key={c.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-stone-800">{c.id}</td>
                    <td className="py-4 px-4 font-medium text-stone-900">{c.patient?.name || 'Applicant'}</td>
                    <td className="py-4 px-4 text-stone-600">{c.clinicalMapping?.targetProcedure || 'Procedure'}</td>
                    <td className="py-4 px-4 text-stone-500">{formatDate(c.createdAt)}</td>
                    <td className="py-4 px-4 text-right font-bold text-emerald-700 tabular-nums">
                      {formatINR(c.disbursedAmount || c.costBreakdown?.totalMin || 0)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => navigate(`/lender/cases/${c.id}`)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
