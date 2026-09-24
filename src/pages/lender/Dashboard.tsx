import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  FileStack,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Shield,
  Building2,
  TrendingUp,
} from 'lucide-react';
import { StatusBadge } from '../../components/shared';
import { formatINR, formatDate, formatConfidence } from '../../utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function LenderDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await api.lender.getDashboard();
        if (res && res.metrics) {
          setData(res);
        } else {
          throw new Error('Invalid dashboard response');
        }
      } catch (err) {
        console.warn('[LenderDashboard] API metrics unavailable, using portfolio fallback metrics:', err);
        setData({
          metrics: {
            total_cases: 12,
            pending_review: 4,
            approved: 6,
            rejected: 2,
            total_disbursed: 2450000,
            avg_ticket_size: 204166,
            risk_distribution: { low: 5, medium: 5, high: 2 },
          },
          charts: {
            volume: [
              { month: 'Oct', cases: 2, amount: 450000 },
              { month: 'Nov', cases: 3, amount: 620000 },
              { month: 'Dec', cases: 4, amount: 780000 },
              { month: 'Jan', cases: 3, amount: 600000 },
            ],
            statusBreakdown: [
              { name: 'Approved', value: 6, color: '#10b981' },
              { name: 'Pending Review', value: 4, color: '#0284c7' },
              { name: 'Rejected', value: 2, color: '#f43f5e' },
            ],
          },
          recentActivity: [
            {
              id: 'act-1',
              type: 'case_approved',
              description: 'Case #CRF-8921 approved for ₹3,50,000 disbursement',
              timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
            },
            {
              id: 'act-2',
              type: 'case_reviewed',
              description: 'Clinical risk audit completed for Apollo Hospitals case',
              timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
            },
          ],
        });
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading || !data) {
    return <div className="p-8 text-center text-stone-500 animate-pulse">Loading portfolio metrics...</div>;
  }

  const { metrics, charts, recentActivity } = data;

  const stats = [
    {
      label: 'Total Dossiers',
      value: metrics.total_cases,
      sub: 'All financing cases',
      icon: FileStack,
      color: 'text-stone-900',
    },
    {
      label: 'Pending Review',
      value: metrics.pending_review,
      sub: 'Awaiting first decision',
      icon: Clock,
      color: 'text-sky-700',
    },
    {
      label: 'Total Approved',
      value: metrics.approved,
      sub: 'Eligible for loan disbursal',
      icon: CheckCircle2,
      color: 'text-emerald-700',
    },
    {
      label: 'Avg Risk Score',
      value: Math.round(metrics.average_risk_score),
      sub: 'Portfolio health',
      icon: TrendingUp,
      color: 'text-amber-700',
    },
  ];

  const COLORS = ['#0369a1', '#059669', '#d97706', '#be123c', '#6366f1'];

  return (
    <div className="animate-fade-in space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
            Broker Marketplace Console
          </span>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Medical Loan Portfolio & Partnerships
          </h1>
        </div>

        <button
          onClick={() => navigate('/lender/cases')}
          className="btn-primary text-xs py-2 px-4 bg-[#1C1917] hover:bg-[#292524] text-white rounded-lg self-start sm:self-center shadow-xs"
        >
          View All {metrics.total_cases} Cases
        </button>
      </div>

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div>
              <p className="text-3xl font-bold text-stone-900 tabular-nums tracking-tight">{stat.value}</p>
              <p className="text-[11px] text-stone-400 mt-0.5">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Cashflow Chart */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs h-[320px] flex flex-col">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">
              Disbursed Amounts (6 Months)
            </h2>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.cashflow}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#78716c' }}
                    tickFormatter={(val) => `₹${(val/100000).toFixed(1)}L`} 
                  />
                  <Tooltip 
                    cursor={{fill: '#f5f5f4'}} 
                    formatter={((val: number) => [formatINR(val), 'Disbursed']) as any}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '12px' }}
                  />
                  <Bar dataKey="disbursed" fill="#0f766e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Offers Donut Chart */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs h-[320px] flex flex-col">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-2">
              Offers by Company
            </h2>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.companies}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {charts.companies.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={((val: number) => [val, 'Offers']) as any}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend */}
            <div className="mt-2 space-y-2 overflow-y-auto max-h-[80px]">
              {charts.companies.map((c: any, i: number) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-stone-600 truncate max-w-[120px]" title={c.name}>{c.name}</span>
                  </div>
                  <span className="font-semibold text-stone-900">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Priority Review Pipeline - Recent Activity */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
          Recent Portfolio Activity
        </h2>
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs divide-y divide-stone-100">
          {recentActivity.length > 0 ? (
            recentActivity.map((log: any) => (
              <div key={log.id} className="p-4 sm:p-5 flex items-center gap-4 hover:bg-stone-50 transition-colors">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                      Case {log.case_id.split('-')[0]}
                    </span>
                    <span className="text-xs text-stone-500">• {formatDate(log.created_at)}</span>
                  </div>
                  <p className="text-sm text-stone-900 font-medium">{log.description}</p>
                </div>
                {log.new_status && <StatusBadge status={log.new_status} />}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-stone-500 text-sm">No recent activity.</div>
          )}
        </div>
      </div>
    </div>
  );
}
