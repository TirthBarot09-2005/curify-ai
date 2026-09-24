import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { Stethoscope } from 'lucide-react';

export default function Preferences() {
  const { profile, fetchProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    preferred_hospital_type: '',
    preferred_city: '',
    preferred_language: '',
    monthly_budget: '',
    preferred_specialties: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        preferred_hospital_type: profile.preferred_hospital_type || '',
        preferred_city: profile.preferred_city || '',
        preferred_language: profile.preferred_language || '',
        monthly_budget: profile.monthly_budget?.toString() || '',
        preferred_specialties: profile.preferred_specialties?.join(', ') || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.patient.updateProfile({
        preferred_hospital_type: formData.preferred_hospital_type,
        preferred_city: formData.preferred_city,
        preferred_language: formData.preferred_language,
        monthly_budget: formData.monthly_budget ? parseFloat(formData.monthly_budget) : null,
        preferred_specialties: formData.preferred_specialties ? formData.preferred_specialties.split(',').map(s => s.trim()) : [],
      });
      await fetchProfile();
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-indigo-600" />
            Healthcare Preferences
          </h2>
          <p className="text-sm text-slate-500 mt-1">Help Curify AI personalize your hospital recommendations.</p>
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
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Preferred Treatment City</label>
          <input type="text" value={formData.preferred_city} onChange={e => setFormData({...formData, preferred_city: e.target.value})} disabled={!isEditing} className="input-field" placeholder="e.g. Ahmedabad, Mumbai" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Preferred Hospital Type</label>
          <select value={formData.preferred_hospital_type} onChange={e => setFormData({...formData, preferred_hospital_type: e.target.value})} disabled={!isEditing} className="input-field">
            <option value="">No Preference</option>
            <option value="Corporate Multispeciality">Corporate Multispeciality (e.g. Apollo, Fortis)</option>
            <option value="Trust/Charitable">Trust / Charitable Hospital</option>
            <option value="Boutique Speciality">Boutique Speciality Clinic</option>
            <option value="Government">Government / Public Hospital</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Communication Language</label>
          <input type="text" value={formData.preferred_language} onChange={e => setFormData({...formData, preferred_language: e.target.value})} disabled={!isEditing} className="input-field" placeholder="e.g. English, Hindi, Gujarati" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Treatment Budget Target (₹)</label>
          <input type="number" value={formData.monthly_budget} onChange={e => setFormData({...formData, monthly_budget: e.target.value})} disabled={!isEditing} className="input-field" placeholder="e.g. 150000" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Preferred Specialties or Doctors</label>
          <input type="text" value={formData.preferred_specialties} onChange={e => setFormData({...formData, preferred_specialties: e.target.value})} disabled={!isEditing} className="input-field" placeholder="Comma separated, e.g. Orthopedics, Cardiology" />
        </div>
      </div>
    </div>
  );
}
