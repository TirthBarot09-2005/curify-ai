import { Lock, EyeOff, ShieldCheck, Download, Trash2 } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
          <Lock className="w-5 h-5 text-teal-600" />
          Privacy & Data Controls
        </h2>
        <p className="text-sm text-slate-500 mt-1">Manage how your medical data is handled and shared.</p>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <EyeOff className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-navy-900">Medical Privacy Default</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  By default, your health information is <strong className="text-slate-700">never visible</strong> to hospitals during discovery. It is only shared securely with financing partners when you explicitly request a loan estimate.
                </p>
              </div>
            </div>
            <div className="bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-teal-100 flex-shrink-0">
              Active
            </div>
          </div>
        </div>

        <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-navy-900">HIPAA & ISO Compliant</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Your data is encrypted at rest and in transit. We strictly adhere to data protection regulations for medical records.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-navy-900">Data Management</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors">
              <Download className="w-4 h-4" /> Export My Data
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors">
              <Trash2 className="w-4 h-4" /> Request Account Deletion
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            Account deletion will permanently remove your profile, medical history, and saved hospitals. 
          </p>
        </div>
      </div>
    </div>
  );
}
