import { useAuth } from '../../../context/AuthContext';
import { useUser, useClerk } from '@clerk/clerk-react';
import { FileKey, Shield, Mail, Phone, LogOut } from 'lucide-react';

export default function Security() {
  const { user } = useAuth();
  const { user: clerkUser } = useUser();
  const { signOut, openUserProfile } = useClerk();

  const handleUpdateCredentials = () => {
    // Open Clerk's native user profile modal to securely handle email/phone changes via OTP
    openUserProfile();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
          <FileKey className="w-5 h-5 text-amber-600" />
          Account & Security
        </h2>
        <p className="text-sm text-slate-500 mt-1">Manage your login credentials securely.</p>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Primary Email</p>
              <p className="text-sm font-semibold text-navy-900 mt-0.5">{user?.email}</p>
            </div>
          </div>
          {clerkUser?.emailAddresses[0]?.verification?.status === 'verified' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider">
              <Shield className="w-3 h-3" /> Verified
            </span>
          )}
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</p>
              <p className="text-sm font-semibold text-navy-900 mt-0.5">{user?.phone || 'Not provided'}</p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleUpdateCredentials}
          className="w-full btn-secondary py-3 text-sm flex items-center justify-center gap-2"
        >
          <Shield className="w-4 h-4" /> Securely Change Email or Phone
        </button>

        <p className="text-[11px] text-center text-slate-400 max-w-md mx-auto leading-relaxed">
          For your security, changing your email or phone number requires multi-factor authentication (OTP verification) via our identity provider.
        </p>
      </div>

      <div className="pt-8 border-t border-slate-100 mt-8">
        <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-4">Danger Zone</h3>
        <button 
          onClick={() => signOut()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign out of all sessions
        </button>
      </div>
    </div>
  );
}
