import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function Insurance() {
  const { profile, fetchProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [formData, setFormData] = useState({
    insurance_provider: '',
    insurance_policy_number: '',
    insurance_type: '',
    insurance_expiry_date: '',
    insurance_coverage_type: '',
    insurance_tpa: '',
    insurance_cashless: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        insurance_provider: profile.insurance_provider || '',
        insurance_policy_number: profile.insurance_policy_number || '',
        insurance_type: profile.insurance_type || '',
        insurance_expiry_date: profile.insurance_expiry_date ? new Date(profile.insurance_expiry_date).toISOString().split('T')[0] : '',
        insurance_coverage_type: profile.insurance_coverage_type || '',
        insurance_tpa: profile.insurance_tpa || '',
        insurance_cashless: profile.insurance_cashless || false,
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.patient.updateProfile(formData);
      await fetchProfile();
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save insurance info');
    } finally {
      setLoading(false);
    }
  };

  const maskPolicy = (policy: string) => {
    if (!policy || policy.length < 4) return policy;
    return '•'.repeat(policy.length - 4) + policy.slice(-4);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            Insurance & Financing
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage your health insurance and TPA details.</p>
        </div>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="btn-secondary text-sm py-1.5 px-4">Edit Info</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(false)} className="btn-secondary text-sm py-1.5 px-4 bg-white border-slate-200">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary text-sm py-1.5 px-4">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Insurance Provider</label>
          <input type="text" value={formData.insurance_provider} onChange={e => setFormData({...formData, insurance_provider: e.target.value})} disabled={!isEditing} className="input-field" placeholder="e.g. Star Health, HDFC ERGO" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Policy Number</label>
          <div className="relative">
            <input 
              type={showPolicy || isEditing ? "text" : "password"} 
              value={!isEditing && !showPolicy ? maskPolicy(formData.insurance_policy_number) : formData.insurance_policy_number} 
              onChange={e => setFormData({...formData, insurance_policy_number: e.target.value})} 
              disabled={!isEditing} 
              className="input-field pr-10" 
              placeholder="Policy ID" 
            />
            {!isEditing && formData.insurance_policy_number && (
              <button 
                type="button"
                onClick={() => setShowPolicy(!showPolicy)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPolicy ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Insurance Type</label>
          <select value={formData.insurance_type} onChange={e => setFormData({...formData, insurance_type: e.target.value})} disabled={!isEditing} className="input-field">
            <option value="">Select</option>
            <option value="Corporate/Group">Corporate / Group</option>
            <option value="Retail/Individual">Retail / Individual</option>
            <option value="Family Floater">Family Floater</option>
            <option value="Government Scheme">Government Scheme (Ayushman Bharat)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Policy Expiry Date</label>
          <input type="date" value={formData.insurance_expiry_date} onChange={e => setFormData({...formData, insurance_expiry_date: e.target.value})} disabled={!isEditing} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Coverage Type</label>
          <input type="text" value={formData.insurance_coverage_type} onChange={e => setFormData({...formData, insurance_coverage_type: e.target.value})} disabled={!isEditing} className="input-field" placeholder="e.g. Comprehensive, Co-pay 20%" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">TPA / Network</label>
          <input type="text" value={formData.insurance_tpa} onChange={e => setFormData({...formData, insurance_tpa: e.target.value})} disabled={!isEditing} className="input-field" placeholder="e.g. MediAssist, Vidal Health" />
        </div>
        <div className="md:col-span-2 pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={formData.insurance_cashless} 
              onChange={e => setFormData({...formData, insurance_cashless: e.target.checked})} 
              disabled={!isEditing}
              className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500" 
            />
            <div>
              <span className="text-sm font-semibold text-slate-900 block">Cashless Availability</span>
              <span className="text-xs text-slate-500">My policy supports cashless network hospitalization.</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
