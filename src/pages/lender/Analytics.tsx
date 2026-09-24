import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

export default function LenderAnalytics() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.lender.getDashboard()
      .then(setData)
      .catch((err) => {
        console.error('Failed to load analytics', err);
        setData({});
      });
  }, []);

  if (!data) return <div className="p-8 text-stone-500 animate-pulse">Loading analytics...</div>;

  // Mock data for extended analytics
  const tatData = [
    { month: 'Jan', tat: 4.2 },
    { month: 'Feb', tat: 3.8 },
    { month: 'Mar', tat: 4.0 },
    { month: 'Apr', tat: 3.5 },
    { month: 'May', tat: 3.1 },
    { month: 'Jun', tat: 2.9 },
  ];

  const approvalTrend = [
    { month: 'Jan', rate: 75 },
    { month: 'Feb', rate: 78 },
    { month: 'Mar', rate: 82 },
    { month: 'Apr', rate: 80 },
    { month: 'May', rate: 85 },
    { month: 'Jun', rate: 88 },
  ];

  return (
    <div className="animate-fade-in space-y-6 max-w-7xl mx-auto">
      <div className="pb-4 border-b border-stone-200">
        <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">Broker Marketplace Console</span>
        <h1 className="text-2xl font-bold text-stone-900">Performance Analytics</h1>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs h-[360px] flex flex-col">
          <h2 className="text-sm font-bold text-stone-900 mb-4 uppercase tracking-wider">Avg Turnaround Time (Days)</h2>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tatData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} />
                <Tooltip cursor={{fill: '#f5f5f4'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '12px' }} />
                <Bar dataKey="tat" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs h-[360px] flex flex-col">
          <h2 className="text-sm font-bold text-stone-900 mb-4 uppercase tracking-wider">Approval Rate (%)</h2>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={approvalTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '12px' }} />
                <Line type="monotone" dataKey="rate" stroke="#059669" strokeWidth={3} dot={{ r: 4, fill: '#059669' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
