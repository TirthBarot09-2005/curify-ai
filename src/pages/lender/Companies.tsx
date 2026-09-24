import { useEffect, useState } from 'react';
import { Building2, Search, Activity, Star } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR } from '../../utils';

export default function LenderCompanies() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadCompanies() {
      try {
        const data = await api.loanCompanies.getCompanies();
        const list = Array.isArray(data) ? data : (data as any)?.companies || (data as any)?.data || [];
        setCompanies(list);
      } catch (err) {
        console.error('Failed to load companies', err);
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    }
    loadCompanies();
  }, []);

  const companyList = Array.isArray(companies) ? companies : [];
  const filtered = companyList.filter(c => 
    (c?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c?.company_type || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
            Broker Marketplace
          </span>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Lending Partners & NBFCs
          </h1>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search partners by name or type..."
            className="w-full pl-9 pr-3.5 py-2 text-sm text-stone-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-12 text-center text-stone-500 animate-pulse">Loading partners...</div>
      ) : filtered.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(company => (
            <div key={company.id} className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden hover:border-stone-300 transition-colors">
              <div className="p-5 border-b border-stone-100 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">{company.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-sm border border-teal-100">
                      {company.company_type}
                    </span>
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-stone-600">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      {company.rating}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-stone-500 block mb-1">Interest Rate</span>
                    <span className="font-bold text-stone-900 tabular-nums">{company.min_interest_rate}% - {company.max_interest_rate}%</span>
                  </div>
                  <div>
                    <span className="text-xs text-stone-500 block mb-1">Avg. Processing</span>
                    <span className="font-bold text-stone-900 tabular-nums">{company.avg_processing_days} days</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-stone-500 block mb-1">Loan Limits</span>
                  <span className="font-semibold text-stone-800 tabular-nums">{formatINR(company.min_loan_amount)} to {formatINR(company.max_loan_amount)}</span>
                </div>

                {company.eligibility_rules && (
                  <div className="pt-4 border-t border-stone-100">
                    <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5 mb-2">
                      <Activity className="w-3.5 h-3.5 text-stone-400" />
                      Eligibility
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {company.eligibility_rules.min_credit_score && (
                        <span className="px-2 py-1 text-[11px] text-stone-600 bg-stone-50 rounded border border-stone-200">
                          Min Score: {company.eligibility_rules.min_credit_score}
                        </span>
                      )}
                      {company.eligibility_rules.requires_collateral && (
                        <span className="px-2 py-1 text-[11px] text-stone-600 bg-stone-50 rounded border border-stone-200">
                          Collateral Required
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-stone-500">
          No lending partners found matching your search.
        </div>
      )}
    </div>
  );
}
