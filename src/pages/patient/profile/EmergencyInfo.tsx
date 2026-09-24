import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { ShieldAlert } from 'lucide-react';

export default function EmergencyInfo() {
  const { profile, fetchProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    emergency_contact_name: '',
    emergency_contact_number: '',
    emergency_contact_relation: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_number: profile.emergency_contact_number || '',
        emergency_contact_relation: profile.emergency_contact_relation || '',
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
      alert('Failed to save emergency info');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            Emergency Information
          </h2>
          <p className="text-sm text-slate-500 mt-1">Details for critical situations. Kept private and secure.</p>
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

      {/* Emergency Contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Emergency Contact Name</label>
          <input type="text" value={formData.emergency_contact_name} onChange={e => setFormData({...formData, emergency_contact_name: e.target.value})} disabled={!isEditing} className="input-field" placeholder="Full Name" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Emergency Contact Phone</label>
          <input type="tel" value={formData.emergency_contact_number} onChange={e => setFormData({...formData, emergency_contact_number: e.target.value})} disabled={!isEditing} className="input-field" placeholder="+91 XXXXX XXXXX" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Relationship</label>
          <input type="text" value={formData.emergency_contact_relation} onChange={e => setFormData({...formData, emergency_contact_relation: e.target.value})} disabled={!isEditing} className="input-field" placeholder="e.g. Spouse, Parent" />
        </div>
      </div>

      {/* Critical Medical Summary (Read Only from Healthcare Info) */}
      <div className="pt-6 border-t border-slate-100">
        <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wider mb-4">Critical Medical Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-red-50 rounded-xl border border-red-100">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block mb-1">Blood Group</span>
            <span className="text-sm font-semibold text-slate-900">{profile?.blood_group || 'Not specified'}</span>
          </div>
          <div className="p-3 bg-red-50 rounded-xl border border-red-100">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block mb-1">Known Allergies</span>
            <span className="text-sm font-semibold text-slate-900">{profile?.known_allergies?.join(', ') || 'None reported'}</span>
          </div>
          <div className="p-3 bg-red-50 rounded-xl border border-red-100 md:col-span-2">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block mb-1">Critical Conditions & Medications</span>
            <span className="text-sm font-semibold text-slate-900 block">{profile?.existing_conditions?.join(', ') || 'No existing conditions'}</span>
            <span className="text-sm text-slate-600 block mt-1">{profile?.current_medications?.join(', ') || 'No current medications'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
