import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { getGreeting, formatINR, formatDate } from '../../utils';
import {
  MapPin, ArrowRight, Search, Building2, Clock, Shield,
  FileText, ChevronRight, Sparkles, Activity, Save
} from 'lucide-react';
import { StatusBadge } from '../../components/shared';
import type { Hospital } from '../../types';

const suggestions = [
  { label: 'Gallbladder Removal', query: 'Laparoscopic cholecystectomy with 2-day recovery stay' },
  { label: 'Knee Replacement', query: 'Total knee replacement surgery under ₹1.6L in Ahmedabad' },
  { label: 'Cardiac Angiography', query: 'Diagnostic cardiac angiography evaluation and stent pricing' },
];

export default function PatientDashboard() {
  const { user, profile } = useAuth();
  const { cases } = useApp();
  const navigate = useNavigate();
  
  const [savedHospitals, setSavedHospitals] = useState<(Hospital & { saved_at: string })[]>([]);
  
  const firstName = user?.name?.split(' ')[0] || 'Patient';
  const patientCases = cases.filter((c) => {
    if (!user || user.role !== 'patient') return false;
    return (c as any).patientId === user.id;
  });

  const completionPct = profile?.profile_completion_percentage || 20;

  useEffect(() => {
    if (user) {
      api.patient.savedHospitals.get().then(data => {
        setSavedHospitals(data || []);
      }).catch(err => console.error(err));
    }
  }, [user]);

  const handleSuggestion = (query: string) => {
    navigate('/patient/intake', { state: { query } });
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-8">
      
      {/* Profile Completion Reminder */}
      {completionPct < 100 && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-navy-900">Your profile is {completionPct}% complete</h3>
                <span className="text-xs font-bold text-teal-700">{completionPct}%</span>
              </div>
              <div className="w-full bg-teal-200/50 rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div className="bg-teal-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5">Add emergency contacts and medical history to improve hospital discovery.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/patient/profile')}
            className="btn-primary text-xs py-2 px-4 whitespace-nowrap bg-teal-600 hover:bg-teal-700 flex items-center gap-1.5 self-stretch sm:self-auto justify-center cursor-pointer flex-shrink-0"
          >
            Complete Profile <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editorial Header & Search Hero */}
      <div className="bg-[#111318] text-white rounded-2xl p-8 sm:p-12 relative overflow-hidden border border-slate-800 shadow-xl">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)`, backgroundSize: '24px 24px' }}
        />
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white leading-tight">
              {getGreeting()}, {firstName}.
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
              Research verified hospital options, understand componentized treatment costs, and prepare structured healthcare financing.
            </p>
          </div>

          <div className="pt-2">
            <div
              onClick={() => navigate('/patient/intake')}
              className="bg-white rounded-xl p-3 sm:p-4 flex items-center justify-between gap-4 cursor-pointer hover:ring-2 hover:ring-teal-500/50 transition-all shadow-md group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Search className="w-5 h-5 text-slate-400 group-hover:text-teal-600 transition-colors flex-shrink-0" />
                <span className="text-slate-500 text-xs sm:text-sm font-normal truncate">
                  Describe a procedure, symptoms, or budget...
                </span>
              </div>
              <button className="btn-primary text-xs py-2 px-4 whitespace-nowrap bg-[#1C1917] hover:bg-[#292524] text-white shadow-xs">
                Start Analysis
              </button>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                <span>Default city: <strong className="text-slate-200 font-medium">{profile?.preferred_city || profile?.city || 'Ahmedabad'}</strong></span>
              </div>
              <button onClick={() => navigate('/patient/profile')} className="hover:text-white transition-colors underline decoration-slate-600">Change Preferences</button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Recent Cases & Activity */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-900 tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" /> Recent Cost Estimates
              </h2>
              <button onClick={() => navigate('/patient/history')} className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {patientCases.length > 0 ? (
              <div className="space-y-3">
                {patientCases.slice(0, 3).map((c) => (
                  <div key={c.id} onClick={() => navigate('/patient/case')} className="bg-white rounded-xl border border-stone-200 p-5 hover:border-stone-300 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0 text-stone-700">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={c.status} />
                        </div>
                        <h3 className="text-sm sm:text-base font-semibold text-stone-900 mt-1">{c.clinicalMapping.targetProcedure}</h3>
                        <p className="text-xs text-stone-500 mt-0.5">{c.hospital.name} · {formatDate(c.createdAt)}</p>
                      </div>
                    </div>
                    <div className="sm:text-right flex sm:flex-col justify-between items-center sm:items-end gap-1 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                      <span className="text-[11px] text-stone-400 font-medium uppercase tracking-wider block">Indicative Tariff</span>
                      <span className="text-sm sm:text-base font-bold text-stone-900 tabular-nums">
                        {formatINR(c.costBreakdown.totalMin)} – {formatINR(c.costBreakdown.totalMax)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
                <Clock className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-stone-800">No active cases registered</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">Explore hospital options and finalize a treatment plan to track your underwriting file here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Profile Summary & Saved Hospitals */}
        <div className="space-y-6">
          
          <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/patient/profile')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg">
                {user?.name?.charAt(0) || 'P'}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-900">{user?.name}</h3>
                <p className="text-xs text-stone-500">View complete profile</p>
              </div>
            </div>
            {profile?.blood_group && (
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500">Blood Group</span>
                <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">{profile.blood_group}</span>
              </div>
            )}
            {profile?.insurance_provider && (
              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-stone-500">Insurance</span>
                <span className="font-semibold text-stone-900">{profile.insurance_provider}</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                <Save className="w-4 h-4 text-teal-600" /> Saved Hospitals
              </h3>
              <button onClick={() => navigate('/patient/profile')} className="text-[11px] text-teal-600 hover:underline">View All</button>
            </div>
            
            {savedHospitals.length > 0 ? (
              <div className="space-y-3">
                {savedHospitals.slice(0, 3).map(h => (
                  <div key={h.id} onClick={() => navigate(`/patient/hospitals/${h.id}`)} className="flex items-center gap-3 p-2 hover:bg-stone-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-stone-100">
                    <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-stone-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-stone-900 truncate">{h.name}</p>
                      <p className="text-[10px] text-stone-500 truncate">{h.city}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 bg-stone-50 rounded-xl border border-stone-100">
                <p className="text-xs text-stone-500">You haven't saved any hospitals yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
